"""
conftest.py - Shared fixtures for AI service tests.
"""

import io
import os
import struct
import tempfile
from pathlib import Path

import pytest

# Set test environment before importing anything from the app
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ.setdefault("INTERNAL_SERVICE_TOKEN", "test-token")
os.environ.setdefault("INDEX_STORAGE_PATH", str(Path(__file__).parent / "test_indexes"))
os.environ.setdefault("LLM_PROVIDER", "gemini")
os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")
os.environ.setdefault("LLM_MODEL", "gemini-2.5-flash")
os.environ.setdefault("CHUNK_SIZE", "200")
os.environ.setdefault("CHUNK_OVERLAP", "20")


KNOWN_TXT_CONTENT = (
    "The headquarters of Acme Corporation is located in Springfield, Illinois. "
    "The company was founded in 1952 by John Acme. "
    "It employs approximately 5000 people worldwide. "
    "The main product line includes industrial anvils and rocket-powered skates. "
    "Annual revenue in 2023 was reported at 250 million dollars. "
    "The current CEO is Jane Smith, appointed in 2019. "
    "Acme operates in 30 countries and has 12 regional offices."
)

# Build a minimal real PDF in memory using basic PDF syntax
def _make_minimal_pdf(text: str) -> bytes:
    """
    Create a minimal syntactically valid PDF with one page containing text.
    The text is embedded as a simple Tj string so pypdf can extract it.
    """
    content_stream = f"BT /F1 12 Tf 50 750 Td ({text}) Tj ET".encode()
    content_len = len(content_stream)

    pdf = b"%PDF-1.4\n"
    offsets = []

    # Object 1: catalog
    offsets.append(len(pdf))
    pdf += b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"

    # Object 2: pages
    offsets.append(len(pdf))
    pdf += b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"

    # Object 3: page
    offsets.append(len(pdf))
    pdf += (
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R "
        b"/MediaBox [0 0 612 792] /Contents 4 0 R "
        b"/Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>\n"
        b"endobj\n"
    )

    # Object 4: content stream
    offsets.append(len(pdf))
    pdf += (
        f"4 0 obj\n<< /Length {content_len} >>\nstream\n".encode()
        + content_stream
        + b"\nendstream\nendobj\n"
    )

    # Cross-reference table
    xref_offset = len(pdf)
    pdf += b"xref\n"
    pdf += f"0 {len(offsets) + 1}\n".encode()
    pdf += b"0000000000 65535 f \n"
    for offset in offsets:
        pdf += f"{offset:010d} 00000 n \n".encode()

    pdf += (
        f"trailer\n<< /Size {len(offsets) + 1} /Root 1 0 R >>\n"
        f"startxref\n{xref_offset}\n%%EOF\n"
    ).encode()

    return pdf


@pytest.fixture
def known_txt_bytes():
    return KNOWN_TXT_CONTENT.encode("utf-8")


@pytest.fixture
def known_pdf_bytes():
    return _make_minimal_pdf(
        "Acme Corp founded 1952 Springfield Illinois 5000 employees"
    )


@pytest.fixture
def empty_pdf_bytes():
    # Valid PDF structure but with empty content stream
    return _make_minimal_pdf("")


@pytest.fixture
def not_a_pdf_bytes():
    return b"This is not a PDF file at all."


@pytest.fixture
def tmp_index_dir(tmp_path, monkeypatch):
    """Override INDEX_STORAGE_PATH to a temp directory for isolation."""
    monkeypatch.setenv("INDEX_STORAGE_PATH", str(tmp_path))
    import config
    config.INDEX_STORAGE_PATH = str(tmp_path)
    import indexer
    indexer.INDEX_STORAGE_PATH = str(tmp_path)  # patch module-level reference
    return tmp_path
