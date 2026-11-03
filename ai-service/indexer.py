"""
indexer.py - FAISS index management per document.

Each document gets its own directory under INDEX_STORAGE_PATH/{document_id}/
containing:
  - index.faiss  : FAISS flat L2 index
  - chunks.json  : list of chunk dicts (chunk_id, page, text, char_start, char_end)
  - pages.json   : list of raw page dicts (page, text) for reindexing

Operations:
  build_index(document_id, chunks, embeddings) -> None
  load_index(document_id) -> (faiss.Index, list[dict])
  delete_index(document_id) -> None
  reindex(document_id) -> (int, int)  # (page_count, chunk_count)
"""

import json
import os
import shutil
from pathlib import Path

import faiss
import numpy as np

from config import INDEX_STORAGE_PATH
from chunker import chunk_pages
from embedder import embed_texts


def _index_dir(document_id: str) -> Path:
    return Path(INDEX_STORAGE_PATH) / document_id


def build_index(
    document_id: str,
    chunks: list[dict],
    embeddings: np.ndarray,
    pages: list[dict],
) -> None:
    """
    Persist FAISS index and chunk/page metadata for document_id.
    Raises if vector count does not match chunk count (integrity check).
    """
    if len(chunks) != embeddings.shape[0]:
        raise ValueError(
            f"Chunk count ({len(chunks)}) does not match embedding count "
            f"({embeddings.shape[0]})."
        )

    index_dir = _index_dir(document_id)
    index_dir.mkdir(parents=True, exist_ok=True)

    # Build and save FAISS index
    dim = embeddings.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings)

    # Integrity check: vector count must equal chunk count
    if index.ntotal != len(chunks):
        raise ValueError(
            f"FAISS index has {index.ntotal} vectors but {len(chunks)} chunks."
        )

    faiss.write_index(index, str(index_dir / "index.faiss"))

    # Save chunk metadata
    with open(index_dir / "chunks.json", "w", encoding="utf-8") as f:
        json.dump(chunks, f, ensure_ascii=False)

    # Save pages for reindex
    with open(index_dir / "pages.json", "w", encoding="utf-8") as f:
        json.dump(pages, f, ensure_ascii=False)


def load_index(document_id: str) -> tuple[faiss.Index, list[dict]]:
    """
    Load FAISS index and chunks from disk.
    Raises FileNotFoundError if the index does not exist.
    """
    index_dir = _index_dir(document_id)
    index_path = index_dir / "index.faiss"
    chunks_path = index_dir / "chunks.json"

    if not index_path.exists() or not chunks_path.exists():
        raise FileNotFoundError(f"No index found for document {document_id}.")

    index = faiss.read_index(str(index_path))

    with open(chunks_path, "r", encoding="utf-8") as f:
        chunks = json.load(f)

    return index, chunks


def delete_index(document_id: str) -> None:
    """Remove the entire index directory for a document. Safe if missing."""
    index_dir = _index_dir(document_id)
    if index_dir.exists():
        shutil.rmtree(index_dir)


def reindex(document_id: str) -> tuple[int, int]:
    """
    Rebuild the FAISS index from pages.json.
    Returns (page_count, chunk_count).
    """
    index_dir = _index_dir(document_id)
    pages_path = index_dir / "pages.json"

    if not pages_path.exists():
        raise FileNotFoundError(f"pages.json not found for document {document_id}.")

    with open(pages_path, "r", encoding="utf-8") as f:
        pages = json.load(f)

    chunks = chunk_pages(pages, document_id)
    if not chunks:
        raise ValueError("Reindex produced zero chunks.")

    texts = [c["text"] for c in chunks]
    embeddings = embed_texts(texts)
    build_index(document_id, chunks, embeddings, pages)

    return len(pages), len(chunks)


def retrieve(
    document_id: str, query_embedding: np.ndarray, top_k: int
) -> list[dict]:
    """
    Search the FAISS index for the top_k nearest chunks.
    Returns list of chunk dicts augmented with 'distance' and 'score' fields.
    Score is a normalized relevance metric derived from L2 distance (higher = better).
    """
    index, chunks = load_index(document_id)

    # Guard: ask for no more than available
    k = min(top_k, index.ntotal)
    if k == 0:
        return []

    distances, indices = index.search(query_embedding, k)

    results = []
    for dist, idx in zip(distances[0], indices[0]):
        if idx < 0:
            continue
        chunk = dict(chunks[idx])
        chunk["distance"] = float(dist)
        # Convert L2 distance to a 0-1 relevance score.
        # All vectors are normalized so L2 distance is in [0, 2].
        chunk["score"] = float(max(0.0, 1.0 - dist / 2.0))
        results.append(chunk)

    return results
