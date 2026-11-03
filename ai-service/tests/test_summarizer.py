"""
test_summarizer.py - Tests for summarization with mocked LLM.
"""

import json
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from chunker import chunk_pages
from embedder import embed_texts
from indexer import build_index

SAMPLE_PAGES = [
    {"page": 1, "text": "Section one content about Acme Corporation founding in 1952."},
    {"page": 2, "text": "Section two content about revenue and employees."},
]

DOC_ID = "sum_test_doc"


@pytest.fixture(autouse=True)
def build_test_index(tmp_index_dir):
    chunks = chunk_pages(SAMPLE_PAGES, DOC_ID)
    embeddings = embed_texts([c["text"] for c in chunks])
    build_index(DOC_ID, chunks, embeddings, SAMPLE_PAGES)


def _mock_llm_response(summary: str) -> str:
    return json.dumps({"summary": summary})


class TestSummarizer:
    def test_short_summary_returned(self, mocker, tmp_index_dir):
        mock_adapter = mocker.MagicMock()
        mock_adapter.chat.return_value = _mock_llm_response(
            "Acme was founded in 1952.\n- Key fact one\n- Key fact two"
        )
        mocker.patch("summarizer.get_adapter", return_value=mock_adapter)

        from summarizer import summarize
        result = summarize(DOC_ID, "short")
        assert "Acme" in result
        assert len(result) > 10

    def test_detailed_summary_returned(self, mocker, tmp_index_dir):
        mock_adapter = mocker.MagicMock()
        mock_adapter.chat.return_value = _mock_llm_response(
            "Overview\nAcme details.\n- Point one\n- Point two"
        )
        mocker.patch("summarizer.get_adapter", return_value=mock_adapter)

        from summarizer import summarize
        result = summarize(DOC_ID, "detailed")
        assert len(result) > 10

    def test_invalid_mode_raises(self, mocker, tmp_index_dir):
        from summarizer import summarize, SummarizationError
        with pytest.raises(SummarizationError, match="Unknown mode"):
            summarize(DOC_ID, "medium")

    def test_llm_error_raises_summarization_error(self, mocker, tmp_index_dir):
        from llm_adapter import LLMError
        from summarizer import summarize, SummarizationError
        mock_adapter = mocker.MagicMock()
        mock_adapter.chat.side_effect = LLMError("API down")
        mocker.patch("summarizer.get_adapter", return_value=mock_adapter)

        with pytest.raises(SummarizationError):
            summarize(DOC_ID, "short")

    def test_empty_summary_raises(self, mocker, tmp_index_dir):
        from summarizer import summarize, SummarizationError
        mock_adapter = mocker.MagicMock()
        mock_adapter.chat.return_value = json.dumps({"summary": ""})
        mocker.patch("summarizer.get_adapter", return_value=mock_adapter)

        with pytest.raises(SummarizationError, match="empty"):
            summarize(DOC_ID, "short")

    def test_map_reduce_invoked_for_long_doc(self, mocker, tmp_index_dir, monkeypatch):
        """When page count > threshold, map-reduce should be used."""
        import summarizer as summod
        monkeypatch.setattr(summod, "SUMMARY_CHUNK_THRESHOLD", 1)
        monkeypatch.setattr(summod, "PAGES_PER_GROUP", 1)

        call_count = {"n": 0}

        def mock_chat(messages, **kwargs):
            call_count["n"] += 1
            return json.dumps({"summary": f"Partial summary {call_count['n']}"})

        mock_adapter = mocker.MagicMock()
        mock_adapter.chat.side_effect = mock_chat
        mocker.patch("summarizer.get_adapter", return_value=mock_adapter)

        from summarizer import summarize
        result = summarize(DOC_ID, "short")
        # With 2 pages and threshold=1, expect at least 2 map calls + 1 reduce call
        assert call_count["n"] >= 3
        assert len(result) > 0

    def test_summary_malformed_json_retries_and_succeeds(self, mocker, tmp_index_dir):
        """Malformed JSON on first summary attempt triggers retry that succeeds."""
        mock_adapter = mocker.MagicMock()
        mock_adapter.chat.side_effect = [
            "Not JSON output",
            _mock_llm_response("Clean summary text after retry."),
        ]
        mocker.patch("summarizer.get_adapter", return_value=mock_adapter)

        from summarizer import summarize
        result = summarize(DOC_ID, "short")
        assert "Clean summary text after retry" in result
        assert mock_adapter.chat.call_count == 2

    def test_summary_failure_after_retry(self, mocker, tmp_index_dir):
        """Persistent malformed JSON raises SummarizationError after retry."""
        from summarizer import summarize, SummarizationError
        mock_adapter = mocker.MagicMock()
        mock_adapter.chat.side_effect = [
            "Still not JSON 1",
            "Still not JSON 2",
        ]
        mocker.patch("summarizer.get_adapter", return_value=mock_adapter)

        with pytest.raises(SummarizationError, match="Failed to obtain valid summary from LLM after retry"):
            summarize(DOC_ID, "short")
