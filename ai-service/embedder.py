"""
embedder.py - Sentence embedding using all-MiniLM-L6-v2 (384 dimensions).

Loads the model once at module import time and exposes:
  - embed_texts(texts: list[str]) -> np.ndarray  (shape: N x 384, L2-normalized)
  - embed_query(text: str) -> np.ndarray          (shape: 1 x 384, L2-normalized)
"""

import numpy as np
from sentence_transformers import SentenceTransformer

MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_DIM = 384

# Load once; shared across requests within the same worker process.
_model = SentenceTransformer(MODEL_NAME)


def _normalize(vectors: np.ndarray) -> np.ndarray:
    """L2-normalize each row."""
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1, norms)
    return vectors / norms


def embed_texts(texts: list[str]) -> np.ndarray:
    """
    Embed a list of strings and return L2-normalized float32 vectors.
    Shape: (len(texts), 384)
    """
    if not texts:
        return np.zeros((0, EMBEDDING_DIM), dtype=np.float32)
    vectors = _model.encode(texts, batch_size=32, show_progress_bar=False)
    vectors = np.array(vectors, dtype=np.float32)
    return _normalize(vectors)


def embed_query(text: str) -> np.ndarray:
    """
    Embed a single query string and return a normalized (1, 384) array.
    """
    return embed_texts([text])
