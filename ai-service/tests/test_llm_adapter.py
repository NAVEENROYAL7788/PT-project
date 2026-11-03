"""
test_llm_adapter.py - Unit tests for GeminiAdapter with mocked google-genai SDK.
Covers:
  - normal response generation
  - invalid API key error
  - rate limit / quota exceeded (HTTP 429)
  - timeout error
  - safety blocked response
  - empty response text
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from llm_adapter import GeminiAdapter, LLMError


class TestGeminiAdapter:
    def test_missing_api_key_raises(self, monkeypatch):
        import config
        monkeypatch.setattr(config, "GEMINI_API_KEY", "")
        monkeypatch.delenv("GEMINI_API_KEY", raising=False)

        with pytest.raises(LLMError, match="GEMINI_API_KEY environment variable is not set"):
            GeminiAdapter()

    def test_successful_chat_generation(self, mocker, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "test-valid-key")

        # Mock genai.Client
        mock_client = mocker.MagicMock()
        mock_response = mocker.MagicMock()
        mock_response.text = '{"answerable": true, "answer": "Success", "used_chunk_ids": ["c1"]}'
        mock_response.candidates = [mocker.MagicMock(finish_reason="STOP")]
        mock_client.models.generate_content.return_value = mock_response

        mocker.patch("google.genai.Client", return_value=mock_client)

        adapter = GeminiAdapter()
        messages = [
            {"role": "system", "content": "You are a test assistant"},
            {"role": "user", "content": "Hello"},
        ]
        res = adapter.chat(messages)
        assert "Success" in res
        assert mock_client.models.generate_content.call_count == 1

    def test_invalid_api_key_error(self, mocker, monkeypatch):
        from google.genai.errors import APIError

        monkeypatch.setenv("GEMINI_API_KEY", "invalid-key")
        mock_client = mocker.MagicMock()
        api_error = APIError(400, {"error": {"message": "API_KEY_INVALID: Key not valid. Please pass a valid API key."}})
        mock_client.models.generate_content.side_effect = api_error

        mocker.patch("google.genai.Client", return_value=mock_client)

        adapter = GeminiAdapter()
        with pytest.raises(LLMError, match="Invalid or unauthorized Gemini API key"):
            adapter.chat([{"role": "user", "content": "test"}])

    def test_rate_limit_error(self, mocker, monkeypatch):
        from google.genai.errors import APIError

        monkeypatch.setenv("GEMINI_API_KEY", "test-key")
        mock_client = mocker.MagicMock()
        api_error = APIError(429, {"error": {"message": "RESOURCE_EXHAUSTED: Rate limit exceeded quota"}})
        mock_client.models.generate_content.side_effect = api_error

        mocker.patch("google.genai.Client", return_value=mock_client)

        adapter = GeminiAdapter()
        with pytest.raises(LLMError, match="rate limit or quota exceeded"):
            adapter.chat([{"role": "user", "content": "test"}])

    def test_timeout_error(self, mocker, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "test-key")
        mock_client = mocker.MagicMock()
        mock_client.models.generate_content.side_effect = TimeoutError("Request timed out")

        mocker.patch("google.genai.Client", return_value=mock_client)

        adapter = GeminiAdapter()
        with pytest.raises(LLMError, match="timed out"):
            adapter.chat([{"role": "user", "content": "test"}])

    def test_safety_blocked_response(self, mocker, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "test-key")
        mock_client = mocker.MagicMock()
        mock_response = mocker.MagicMock()
        candidate = mocker.MagicMock()
        candidate.finish_reason = "SAFETY"
        mock_response.candidates = [candidate]
        mock_client.models.generate_content.return_value = mock_response

        mocker.patch("google.genai.Client", return_value=mock_client)

        adapter = GeminiAdapter()
        with pytest.raises(LLMError, match="blocked by content safety filters"):
            adapter.chat([{"role": "user", "content": "test"}])

    def test_empty_response(self, mocker, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "test-key")
        mock_client = mocker.MagicMock()
        mock_response = mocker.MagicMock()
        mock_response.candidates = [mocker.MagicMock(finish_reason="STOP")]
        mock_response.text = "   "
        mock_client.models.generate_content.return_value = mock_response

        mocker.patch("google.genai.Client", return_value=mock_client)

        adapter = GeminiAdapter()
        with pytest.raises(LLMError, match="empty response"):
            adapter.chat([{"role": "user", "content": "test"}])
