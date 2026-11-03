"""
summarizer.py - Document summarization using map-reduce for long documents.

Two modes:
  short    - one coherent overview with key points
  detailed - headed sections with key points per section

For documents with more than SUMMARY_CHUNK_THRESHOLD pages, uses map-reduce:
  1. Summarize page groups (map)
  2. Combine partial summaries into a final summary (reduce)

Never returns placeholder text. Raises SummarizationError on failure.
"""

import json
import re
from pathlib import Path

from config import INDEX_STORAGE_PATH
from llm_adapter import get_adapter, LLMError

# Number of pages above which map-reduce is used
SUMMARY_CHUNK_THRESHOLD = 10
# Pages per group in the map step
PAGES_PER_GROUP = 5


class SummarizationError(Exception):
    pass


def _load_pages(document_id: str) -> list[dict]:
    pages_path = Path(INDEX_STORAGE_PATH) / document_id / "pages.json"
    if not pages_path.exists():
        raise SummarizationError(f"pages.json not found for document {document_id}.")
    with open(pages_path, "r", encoding="utf-8") as f:
        return json.load(f)


def _call_llm_and_extract(prompt: str, system: str) -> str:
    adapter = get_adapter()
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": prompt},
    ]
    try:
        raw = adapter.chat(messages)
    except LLMError as exc:
        raise SummarizationError(str(exc)) from exc

    try:
        return _extract_summary_from_json(raw)
    except SummarizationError:
        # Retry once asking strictly for valid JSON
        retry_messages = messages + [
            {"role": "assistant", "content": raw},
            {
                "role": "user",
                "content": 'Your previous response was not valid JSON. Return ONLY valid JSON: {"summary": string}',
            },
        ]
        try:
            retry_raw = adapter.chat(retry_messages)
            return _extract_summary_from_json(retry_raw)
        except Exception as retry_err:
            raise SummarizationError(f"Failed to obtain valid summary from LLM after retry: {retry_err}") from retry_err


def _call_llm(prompt: str, system: str) -> str:
    return _call_llm_and_extract(prompt, system)


SHORT_SYSTEM = """You are a document summarizer. Summarize the provided document text concisely.
Return valid JSON: { "summary": string }
The summary must be a single paragraph followed by a bullet list of 3-6 key points.
Format key points as plain text separated by newlines, prefixed with "- ".
Do not invent facts. Do not use placeholder text."""

DETAILED_SYSTEM = """You are a document summarizer. Produce a detailed summary of the provided document text.
Return valid JSON: { "summary": string }
Organize the summary into clear sections with short plain-text headers (e.g., "Overview", "Key Findings").
Each section should contain 2-4 sentences and a bullet list of key points.
Do not invent facts. Do not use placeholder text."""

MAP_SYSTEM = """You are summarizing one section of a longer document.
Return valid JSON: { "summary": string }
Summarize the key information in this section in 2-4 sentences. Be factual and concise."""

REDUCE_SYSTEM_SHORT = """You are combining partial summaries of document sections into a final summary.
Return valid JSON: { "summary": string }
Write one coherent paragraph followed by 3-6 key bullet points.
Format key points as plain text prefixed with "- ".
Do not add information not present in the partial summaries."""

REDUCE_SYSTEM_DETAILED = """You are combining partial summaries of document sections into a final detailed summary.
Return valid JSON: { "summary": string }
Organize into sections with plain-text headers (e.g., "Overview", "Key Findings").
Each section should have 2-4 sentences and bullet points. Do not add external information."""


def _extract_summary_from_json(raw: str) -> str:
    cleaned = re.sub(r"```(?:json)?|```", "", raw).strip()
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise SummarizationError(
            f"LLM summary response is not valid JSON: {exc}\nRaw: {raw[:500]}"
        )
    if "summary" not in data or not isinstance(data["summary"], str):
        raise SummarizationError(f"LLM summary response missing 'summary' field: {data}")
    text = data["summary"].strip()
    if not text:
        raise SummarizationError("LLM returned an empty summary.")
    return text


def _pages_to_text(pages: list[dict]) -> str:
    return "\n\n---\n\n".join(
        f"[Page {p['page']}]\n{p['text']}" for p in pages
    )


def _map_reduce_summarize(pages: list[dict], mode: str) -> str:
    """Summarize long documents by grouping pages and then combining."""
    # Map: summarize groups of pages
    partial_summaries = []
    for i in range(0, len(pages), PAGES_PER_GROUP):
        group = pages[i : i + PAGES_PER_GROUP]
        group_text = _pages_to_text(group)
        part = _call_llm_and_extract(
            f"Document section (pages {group[0]['page']}-{group[-1]['page']}):\n\n{group_text}",
            MAP_SYSTEM,
        )
        partial_summaries.append(part)

    # Reduce: combine partials
    combined_text = "\n\n---\n\n".join(
        f"Section {i + 1} summary:\n{s}" for i, s in enumerate(partial_summaries)
    )
    reduce_system = REDUCE_SYSTEM_SHORT if mode == "short" else REDUCE_SYSTEM_DETAILED
    return _call_llm_and_extract(
        f"Partial summaries to combine:\n\n{combined_text}",
        reduce_system,
    )


def summarize(document_id: str, mode: str) -> str:
    """
    Generate a summary for the document.
    mode: 'short' or 'detailed'
    Returns the summary text.
    Raises SummarizationError on failure.
    """
    if mode not in ("short", "detailed"):
        raise SummarizationError(f"Unknown mode: {mode}. Use 'short' or 'detailed'.")

    pages = _load_pages(document_id)
    if not pages:
        raise SummarizationError("No pages found for this document.")

    if len(pages) > SUMMARY_CHUNK_THRESHOLD:
        return _map_reduce_summarize(pages, mode)

    # Direct summarization for short documents
    full_text = _pages_to_text(pages)
    system = SHORT_SYSTEM if mode == "short" else DETAILED_SYSTEM
    return _call_llm_and_extract(f"Document text:\n\n{full_text}", system)
