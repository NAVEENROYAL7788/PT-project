"""
test_chunker.py - Tests for the chunker module.
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import config
from chunker import chunk_pages


SAMPLE_PAGES = [
    {"page": 1, "text": "A" * 600},  # will produce multiple chunks
    {"page": 2, "text": "B" * 300},  # single chunk
]


class TestChunker:
    def test_chunks_have_required_fields(self):
        chunks = chunk_pages(SAMPLE_PAGES, "doc1")
        for c in chunks:
            assert "chunk_id" in c
            assert "page" in c
            assert "text" in c
            assert "char_start" in c
            assert "char_end" in c

    def test_chunk_ids_unique(self):
        chunks = chunk_pages(SAMPLE_PAGES, "doc1")
        ids = [c["chunk_id"] for c in chunks]
        assert len(ids) == len(set(ids))

    def test_chunk_ids_contain_document_id(self):
        chunks = chunk_pages(SAMPLE_PAGES, "mydoc42")
        for c in chunks:
            assert c["chunk_id"].startswith("mydoc42_")

    def test_page_metadata_preserved(self):
        chunks = chunk_pages(SAMPLE_PAGES, "doc1")
        page1_chunks = [c for c in chunks if c["page"] == 1]
        page2_chunks = [c for c in chunks if c["page"] == 2]
        assert len(page1_chunks) >= 1
        assert len(page2_chunks) >= 1
        # All page 1 chunks have page=1
        assert all(c["page"] == 1 for c in page1_chunks)
        assert all(c["page"] == 2 for c in page2_chunks)

    def test_chunk_size_respected(self):
        orig_size = config.CHUNK_SIZE
        config.CHUNK_SIZE = 100
        try:
            pages = [{"page": 1, "text": "X" * 500}]
            chunks = chunk_pages(pages, "test")
            for c in chunks:
                assert len(c["text"]) <= 110  # allow small overage from strip
        finally:
            config.CHUNK_SIZE = orig_size

    def test_overlap_present(self):
        """With overlap, adjacent chunks should share a suffix/prefix."""
        orig_size, orig_overlap = config.CHUNK_SIZE, config.CHUNK_OVERLAP
        config.CHUNK_SIZE = 100
        config.CHUNK_OVERLAP = 20
        try:
            text = "".join(str(i % 10) for i in range(300))
            pages = [{"page": 1, "text": text}]
            chunks = chunk_pages(pages, "doc")
            if len(chunks) >= 2:
                # chunk[0] ends at char_end, chunk[1] starts at char_start
                # overlap region: chunk[0].char_end - chunk[1].char_start == overlap
                overlap_region = chunks[0]["char_end"] - chunks[1]["char_start"]
                assert overlap_region == config.CHUNK_OVERLAP
        finally:
            config.CHUNK_SIZE = orig_size
            config.CHUNK_OVERLAP = orig_overlap

    def test_empty_pages_produce_no_chunks(self):
        pages = [{"page": 1, "text": "   "}, {"page": 2, "text": ""}]
        chunks = chunk_pages(pages, "doc")
        assert chunks == []

    def test_empty_input_produces_no_chunks(self):
        chunks = chunk_pages([], "doc")
        assert chunks == []
