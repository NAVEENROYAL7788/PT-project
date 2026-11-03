"""
extractor.py - Text extraction from PDF and TXT files.

PDF: extracted page by page using pypdf.
TXT: read and split into pseudo-pages of TXT_PAGE_SIZE characters each.

Returns a list of { page: int (1-indexed), text: str } dicts.
Raises ExtractionError if the file cannot be meaningfully extracted.
"""

import io
from pathlib import Path

from pypdf import PdfReader

from config import TXT_PAGE_SIZE


class ExtractionError(Exception):
    pass


def extract_pdf(file_bytes: bytes) -> list[dict]:
    """
    Extract text page by page from PDF bytes.
    Raises ExtractionError if the PDF is unreadable, encrypted, or produces no text.
    """
    # Validate file signature
    if not file_bytes.startswith(b"%PDF"):
        raise ExtractionError("File does not start with %PDF signature.")

    try:
        reader = PdfReader(io.BytesIO(file_bytes))
    except Exception as exc:
        raise ExtractionError(f"Could not open PDF: {exc}") from exc

    if reader.is_encrypted:
        raise ExtractionError("PDF is encrypted and cannot be processed.")

    pages = []
    for page_num, page in enumerate(reader.pages, start=1):
        try:
            text = page.extract_text() or ""
        except Exception:
            text = ""
        text = text.strip()
        if text:
            pages.append({"page": page_num, "text": text})

    if not pages:
        raise ExtractionError(
            "No text could be extracted from this PDF. "
            "Scanned or image-only PDFs are not supported (OCR is not available)."
        )

    return pages


def extract_txt(file_bytes: bytes) -> list[dict]:
    """
    Decode TXT bytes and split into pseudo-pages of TXT_PAGE_SIZE characters.
    """
    try:
        text = file_bytes.decode("utf-8", errors="replace").strip()
    except Exception as exc:
        raise ExtractionError(f"Could not decode text file: {exc}") from exc

    if not text:
        raise ExtractionError("Text file is empty.")

    # Split into pseudo-pages
    pages = []
    page_num = 1
    for start in range(0, len(text), TXT_PAGE_SIZE):
        chunk_text = text[start : start + TXT_PAGE_SIZE].strip()
        if chunk_text:
            pages.append({"page": page_num, "text": chunk_text})
            page_num += 1

    return pages


def extract(file_bytes: bytes, file_type: str) -> list[dict]:
    """
    Dispatch extraction based on file_type ('pdf' or 'txt').
    """
    if file_type == "pdf":
        return extract_pdf(file_bytes)
    elif file_type == "txt":
        return extract_txt(file_bytes)
    else:
        raise ExtractionError(f"Unsupported file type: {file_type}")
