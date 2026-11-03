"""
test_extractor.py - Tests for text extraction.
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from extractor import extract_txt, extract_pdf, extract, ExtractionError


class TestExtractTxt:
    def test_basic_extraction(self, known_txt_bytes):
        pages = extract_txt(known_txt_bytes)
        assert len(pages) >= 1
        assert pages[0]["page"] == 1
        assert "Acme" in pages[0]["text"]

    def test_page_numbering_sequential(self, known_txt_bytes):
        # Use a very small page size to force multiple pages
        import config
        orig = config.TXT_PAGE_SIZE
        config.TXT_PAGE_SIZE = 50
        try:
            pages = extract_txt(known_txt_bytes)
            page_nums = [p["page"] for p in pages]
            assert page_nums == list(range(1, len(pages) + 1))
        finally:
            config.TXT_PAGE_SIZE = orig

    def test_empty_file_raises(self):
        with pytest.raises(ExtractionError, match="empty"):
            extract_txt(b"")

    def test_whitespace_only_raises(self):
        with pytest.raises(ExtractionError, match="empty"):
            extract_txt(b"   \n\n\t  ")

    def test_all_pages_have_text(self, known_txt_bytes):
        pages = extract_txt(known_txt_bytes)
        for p in pages:
            assert len(p["text"].strip()) > 0


class TestExtractPdf:
    def test_known_pdf_has_pages(self, known_pdf_bytes):
        pages = extract_pdf(known_pdf_bytes)
        assert len(pages) >= 1
        assert all(p["page"] >= 1 for p in pages)

    def test_not_a_pdf_raises(self, not_a_pdf_bytes):
        with pytest.raises(ExtractionError, match="%PDF"):
            extract_pdf(not_a_pdf_bytes)


class TestExtractDispatch:
    def test_pdf_dispatch(self, known_pdf_bytes):
        pages = extract(known_pdf_bytes, "pdf")
        assert len(pages) >= 1

    def test_txt_dispatch(self, known_txt_bytes):
        pages = extract(known_txt_bytes, "txt")
        assert len(pages) >= 1

    def test_unsupported_type_raises(self, known_txt_bytes):
        with pytest.raises(ExtractionError, match="Unsupported"):
            extract(known_txt_bytes, "docx")
