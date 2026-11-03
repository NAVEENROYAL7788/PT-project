"""
chunker.py - Split extracted pages into overlapping text chunks.

Each chunk carries:
  - chunk_id: unique string "{document_id}_{index}"
  - page: 1-indexed page number from the source page
  - text: the chunk text
  - char_start: character offset within the original page text
  - char_end: character offset within the original page text

Chunks smaller than a minimum length after stripping are skipped.
"""

import config

MIN_CHUNK_LENGTH = 20  # skip very short scraps


def chunk_pages(pages: list[dict], document_id: str) -> list[dict]:
    """
    Given a list of {page, text} dicts, produce overlapping chunks.
    Each page is chunked independently so page number metadata is preserved.
    """
    chunks = []
    global_index = 0

    for page_dict in pages:
        page_num = page_dict["page"]
        text = page_dict["text"]

        start = 0
        while start < len(text):
            end = min(start + config.CHUNK_SIZE, len(text))
            chunk_text = text[start:end].strip()

            if len(chunk_text) >= MIN_CHUNK_LENGTH:
                chunks.append(
                    {
                        "chunk_id": f"{document_id}_{global_index}",
                        "page": page_num,
                        "text": chunk_text,
                        "char_start": start,
                        "char_end": end,
                    }
                )
                global_index += 1

            if end == len(text):
                break
            start = end - config.CHUNK_OVERLAP

    return chunks
