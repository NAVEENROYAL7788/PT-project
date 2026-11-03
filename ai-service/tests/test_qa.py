"""
test_qa.py - Tests for question answering with mocked LLM.
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
    {
        "page": 1,
        "text": (
            "The headquarters of Acme Corporation is located in Springfield, Illinois. "
            "The company was founded in 1952 by John Acme. "
            "The current CEO is Jane Smith, appointed in 2019."
        ),
    },
    {
        "page": 2,
        "text": (
            "Acme employs approximately 5000 people worldwide. "
            "Annual revenue in 2023 was 250 million dollars. "
            "Acme operates in 30 countries and has 12 regional offices."
        ),
    },
]

DOC_ID = "qa_test_doc"


@pytest.fixture(autouse=True)
def build_test_index(tmp_index_dir):
    chunks = chunk_pages(SAMPLE_PAGES, DOC_ID)
    embeddings = embed_texts([c["text"] for c in chunks])
    build_index(DOC_ID, chunks, embeddings, SAMPLE_PAGES)


def _make_llm_response(answerable: bool, answer: str, chunk_ids: list[str]) -> str:
    return json.dumps(
        {"answerable": answerable, "answer": answer, "used_chunk_ids": chunk_ids}
    )


class TestQA:
    def test_answerable_question(self, mocker, tmp_index_dir):
        """A question whose answer is in the document returns answerable=True."""
        from indexer import retrieve
        from embedder import embed_query

        q_emb = embed_query("Where is Acme headquarters?")
        retrieved = retrieve(DOC_ID, q_emb, top_k=4)
        chunk_ids = [retrieved[0]["chunk_id"]] if retrieved else []

        mock_adapter = mocker.MagicMock()
        mock_adapter.chat.return_value = _make_llm_response(
            True,
            "Acme Corporation is headquartered in Springfield, Illinois.",
            chunk_ids,
        )
        mocker.patch("qa.get_adapter", return_value=mock_adapter)

        from qa import answer_question
        result = answer_question(DOC_ID, "Where is Acme headquarters?")
        assert result["answerable"] is True
        assert len(result["answer"]) > 0

    def test_unanswerable_question_below_threshold(self, mocker, tmp_index_dir, monkeypatch):
        """When best score is below MIN_RELEVANCE, LLM is not called."""
        import config
        monkeypatch.setattr(config, "MIN_RELEVANCE", 0.99)  # impossibly high threshold

        mock_adapter = mocker.MagicMock()
        mocker.patch("qa.get_adapter", return_value=mock_adapter)

        from qa import answer_question
        result = answer_question(DOC_ID, "What is the population of Mars?")
        assert result["answerable"] is False
        mock_adapter.chat.assert_not_called()

    def test_sources_come_from_retrieved_chunks(self, mocker, tmp_index_dir):
        """Sources in the response must only reference real retrieved chunk IDs."""
        from indexer import retrieve
        from embedder import embed_query

        q_emb = embed_query("How many employees does Acme have?")
        retrieved = retrieve(DOC_ID, q_emb, top_k=4)
        valid_ids = {c["chunk_id"] for c in retrieved}
        used_ids = [retrieved[0]["chunk_id"]] if retrieved else []

        mock_adapter = mocker.MagicMock()
        mock_adapter.chat.return_value = _make_llm_response(
            True, "Acme has 5000 employees.", used_ids
        )
        mocker.patch("qa.get_adapter", return_value=mock_adapter)

        from qa import answer_question
        result = answer_question(DOC_ID, "How many employees?")
        for source in result["sources"]:
            assert source["chunk_id"] in valid_ids

    def test_model_invented_chunk_id_is_filtered(self, mocker, tmp_index_dir):
        """A chunk_id invented by the model must not appear in sources."""
        mock_adapter = mocker.MagicMock()
        mock_adapter.chat.return_value = _make_llm_response(
            True, "Some answer.", ["invented_chunk_id_9999"]
        )
        mocker.patch("qa.get_adapter", return_value=mock_adapter)

        from qa import answer_question
        result = answer_question(DOC_ID, "Something?")
        source_ids = [s["chunk_id"] for s in result["sources"]]
        assert "invented_chunk_id_9999" not in source_ids

    def test_llm_error_propagates(self, mocker, tmp_index_dir, monkeypatch):
        """LLM errors should propagate as LLMError."""
        import config
        monkeypatch.setattr(config, "MIN_RELEVANCE", 0.0)  # ensure LLM is called

        from llm_adapter import LLMError
        mock_adapter = mocker.MagicMock()
        mock_adapter.chat.side_effect = LLMError("LLM timeout")
        mocker.patch("qa.get_adapter", return_value=mock_adapter)

        from qa import answer_question
        with pytest.raises(LLMError, match="LLM timeout"):
            answer_question(DOC_ID, "Any question?")

    def test_source_page_matches_chunk_page(self, mocker, tmp_index_dir):
        """Page numbers in sources must come from chunk metadata, not from the LLM."""
        from indexer import retrieve
        from embedder import embed_query

        q_emb = embed_query("Who is the CEO of Acme?")
        retrieved = retrieve(DOC_ID, q_emb, top_k=4)

        if not retrieved:
            pytest.skip("No chunks retrieved.")

        first_chunk = retrieved[0]
        mock_adapter = mocker.MagicMock()
        mock_adapter.chat.return_value = _make_llm_response(
            True, "Jane Smith is CEO.", [first_chunk["chunk_id"]]
        )
        mocker.patch("qa.get_adapter", return_value=mock_adapter)

        from qa import answer_question
        result = answer_question(DOC_ID, "Who is the CEO?")
        if result["sources"]:
            # Page in source must equal the actual chunk's page
            source_page = result["sources"][0]["page"]
            assert source_page == first_chunk["page"]

    def test_malformed_json_retries_and_succeeds(self, mocker, tmp_index_dir):
        """Malformed JSON on first try triggers a retry that succeeds."""
        from indexer import retrieve
        from embedder import embed_query

        q_emb = embed_query("Where is Acme headquarters?")
        retrieved = retrieve(DOC_ID, q_emb, top_k=4)
        chunk_ids = [retrieved[0]["chunk_id"]] if retrieved else []

        mock_adapter = mocker.MagicMock()
        mock_adapter.chat.side_effect = [
            "This is not JSON at all!",  # First response is malformed
            _make_llm_response(True, "Springfield, Illinois.", chunk_ids),  # Second response succeeds
        ]
        mocker.patch("qa.get_adapter", return_value=mock_adapter)

        from qa import answer_question
        result = answer_question(DOC_ID, "Where is Acme headquarters?")
        assert result["answerable"] is True
        assert "Springfield" in result["answer"]
        assert mock_adapter.chat.call_count == 2

    def test_malformed_json_fails_after_retry(self, mocker, tmp_index_dir):
        """Persistent malformed JSON raises LLMError after retry."""
        mock_adapter = mocker.MagicMock()
        mock_adapter.chat.side_effect = [
            "Bad JSON 1",
            "Bad JSON 2",
        ]
        mocker.patch("qa.get_adapter", return_value=mock_adapter)

        from qa import answer_question
        from llm_adapter import LLMError
        with pytest.raises(LLMError, match="Failed to parse LLM response as valid JSON after retry"):
            answer_question(DOC_ID, "Where is Acme headquarters?")
        assert mock_adapter.chat.call_count == 2
