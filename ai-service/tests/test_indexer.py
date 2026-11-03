"""
test_indexer.py - Tests for FAISS index: build, load, retrieve, reindex.
"""

import pytest
import sys
import os
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from chunker import chunk_pages
from embedder import embed_texts, EMBEDDING_DIM
from indexer import build_index, load_index, delete_index, reindex, retrieve


SAMPLE_PAGES = [
    {
        "page": 1,
        "text": (
            "The headquarters of Acme Corporation is located in Springfield, Illinois. "
            "The company was founded in 1952 by John Acme."
        ),
    },
    {
        "page": 2,
        "text": (
            "Acme employs approximately 5000 people worldwide. "
            "Annual revenue in 2023 was 250 million dollars."
        ),
    },
]


class TestIndexer:
    def test_build_creates_files(self, tmp_index_dir):
        doc_id = "test_doc_1"
        chunks = chunk_pages(SAMPLE_PAGES, doc_id)
        embeddings = embed_texts([c["text"] for c in chunks])
        build_index(doc_id, chunks, embeddings, SAMPLE_PAGES)

        index_dir = tmp_index_dir / doc_id
        assert (index_dir / "index.faiss").exists()
        assert (index_dir / "chunks.json").exists()
        assert (index_dir / "pages.json").exists()

    def test_index_count_equals_chunk_count(self, tmp_index_dir):
        doc_id = "test_doc_2"
        chunks = chunk_pages(SAMPLE_PAGES, doc_id)
        embeddings = embed_texts([c["text"] for c in chunks])
        build_index(doc_id, chunks, embeddings, SAMPLE_PAGES)

        import faiss
        from pathlib import Path
        import config
        index = faiss.read_index(str(tmp_index_dir / doc_id / "index.faiss"))
        assert index.ntotal == len(chunks)

    def test_load_index_returns_correct_chunk_count(self, tmp_index_dir):
        doc_id = "test_doc_3"
        chunks = chunk_pages(SAMPLE_PAGES, doc_id)
        embeddings = embed_texts([c["text"] for c in chunks])
        build_index(doc_id, chunks, embeddings, SAMPLE_PAGES)

        index, loaded_chunks = load_index(doc_id)
        assert index.ntotal == len(chunks)
        assert len(loaded_chunks) == len(chunks)

    def test_load_nonexistent_raises(self, tmp_index_dir):
        with pytest.raises(FileNotFoundError):
            load_index("nonexistent_doc_99")

    def test_delete_removes_directory(self, tmp_index_dir):
        doc_id = "test_doc_4"
        chunks = chunk_pages(SAMPLE_PAGES, doc_id)
        embeddings = embed_texts([c["text"] for c in chunks])
        build_index(doc_id, chunks, embeddings, SAMPLE_PAGES)

        delete_index(doc_id)
        assert not (tmp_index_dir / doc_id).exists()

    def test_delete_nonexistent_is_safe(self, tmp_index_dir):
        delete_index("definitely_does_not_exist")  # should not raise

    def test_reindex_rebuilds_from_pages(self, tmp_index_dir):
        doc_id = "test_doc_5"
        chunks = chunk_pages(SAMPLE_PAGES, doc_id)
        embeddings = embed_texts([c["text"] for c in chunks])
        build_index(doc_id, chunks, embeddings, SAMPLE_PAGES)

        page_count, chunk_count = reindex(doc_id)
        assert page_count == len(SAMPLE_PAGES)
        assert chunk_count == len(chunks)

    def test_retrieve_returns_results(self, tmp_index_dir):
        doc_id = "test_doc_6"
        chunks = chunk_pages(SAMPLE_PAGES, doc_id)
        embeddings = embed_texts([c["text"] for c in chunks])
        build_index(doc_id, chunks, embeddings, SAMPLE_PAGES)

        q_emb = embed_texts(["Who founded Acme and where is the headquarters?"])
        results = retrieve(doc_id, q_emb, top_k=2)
        assert len(results) >= 1
        assert "chunk_id" in results[0]
        assert "page" in results[0]
        assert "score" in results[0]

    def test_retrieve_score_in_range(self, tmp_index_dir):
        doc_id = "test_doc_7"
        chunks = chunk_pages(SAMPLE_PAGES, doc_id)
        embeddings = embed_texts([c["text"] for c in chunks])
        build_index(doc_id, chunks, embeddings, SAMPLE_PAGES)

        q_emb = embed_texts(["What is the revenue?"])
        results = retrieve(doc_id, q_emb, top_k=2)
        for r in results:
            assert 0.0 <= r["score"] <= 1.0

    def test_retrieve_page_matches_source(self, tmp_index_dir):
        """
        The page field in retrieved chunks must match the source page,
        not invented by the model.
        """
        doc_id = "test_doc_8"
        chunks = chunk_pages(SAMPLE_PAGES, doc_id)
        embeddings = embed_texts([c["text"] for c in chunks])
        build_index(doc_id, chunks, embeddings, SAMPLE_PAGES)

        q_emb = embed_texts(["employees worldwide revenue"])
        results = retrieve(doc_id, q_emb, top_k=2)
        valid_pages = {p["page"] for p in SAMPLE_PAGES}
        for r in results:
            assert r["page"] in valid_pages
