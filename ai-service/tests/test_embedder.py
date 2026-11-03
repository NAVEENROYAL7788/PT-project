"""
test_embedder.py - Tests for the embedder module.
"""

import pytest
import sys
import os
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from embedder import embed_texts, embed_query, EMBEDDING_DIM


class TestEmbedder:
    def test_embedding_dimension(self):
        vecs = embed_texts(["Hello world"])
        assert vecs.shape == (1, EMBEDDING_DIM)
        assert EMBEDDING_DIM == 384

    def test_multiple_texts_correct_shape(self):
        texts = ["First sentence.", "Second sentence.", "Third one."]
        vecs = embed_texts(texts)
        assert vecs.shape == (len(texts), EMBEDDING_DIM)

    def test_vectors_are_normalized(self):
        vecs = embed_texts(["Test sentence for normalization."])
        norms = np.linalg.norm(vecs, axis=1)
        assert np.allclose(norms, 1.0, atol=1e-5)

    def test_embed_query_shape(self):
        vec = embed_query("What is the answer?")
        assert vec.shape == (1, EMBEDDING_DIM)

    def test_embed_query_normalized(self):
        vec = embed_query("Another query.")
        norm = np.linalg.norm(vec[0])
        assert abs(norm - 1.0) < 1e-5

    def test_empty_list_returns_empty_array(self):
        vecs = embed_texts([])
        assert vecs.shape == (0, EMBEDDING_DIM)

    def test_float32_dtype(self):
        vecs = embed_texts(["dtype check"])
        assert vecs.dtype == np.float32

    def test_different_texts_produce_different_vectors(self):
        v1 = embed_texts(["The cat sat on the mat."])
        v2 = embed_texts(["Quantum mechanics explains atomic behavior."])
        cosine_sim = float(np.dot(v1[0], v2[0]))
        # Semantically different texts should not be identical
        assert cosine_sim < 0.99
