"""
llm_adapter.py - Swappable LLM provider adapter with Google Gemini as default.

Uses the official google-genai SDK.
Configuration is read exclusively from environment variables via config.py:
  GEMINI_API_KEY, LLM_MODEL, LLM_TIMEOUT_SECONDS, LLM_TEMPERATURE, LLM_MAX_OUTPUT_TOKENS.
Never hardcode API keys or model names.
"""

import json
import logging
import os
from abc import ABC, abstractmethod

import config

logger = logging.getLogger(__name__)


class LLMError(Exception):
    """Base error for LLM failures with distinct user-facing messages."""
    pass


class BaseLLMAdapter(ABC):
    @abstractmethod
    def chat(self, messages: list[dict], timeout: int = 30) -> str:
        """Send messages to the LLM and return the response text."""


class GeminiAdapter(BaseLLMAdapter):
    """
    Adapter for Google Gemini using the official google-genai SDK.
    Follows:
      from google import genai
      from google.genai import types
      client = genai.Client()
      client.models.generate_content(...)
    """

    def __init__(self):
        try:
            from google import genai
            from google.genai import types
            from google.genai.errors import APIError
        except ImportError as exc:
            logger.error("LLM initialization error: google-genai package not installed")
            raise LLMError("google-genai package is not installed. Please check requirements.") from exc

        key = config.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
        if not key:
            logger.error("LLM initialization error: missing GEMINI_API_KEY")
            raise LLMError("GEMINI_API_KEY environment variable is not set. Please configure GEMINI_API_KEY in ai-service/.env")

        try:
            self._client = genai.Client(api_key=key)
        except Exception as exc:
            logger.error("LLM client creation error: %s", type(exc).__name__)
            raise LLMError(f"Failed to initialize Gemini client: {exc}") from exc

        self._model = config.LLM_MODEL
        self._types = types
        self._APIError = APIError

    def chat(self, messages: list[dict], timeout: int | None = None) -> str:
        effective_timeout = timeout if timeout is not None else config.LLM_TIMEOUT_SECONDS
        system_instruction = None
        contents = []

        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "system":
                system_instruction = content
            elif role == "assistant":
                contents.append(
                    self._types.Content(
                        role="model",
                        parts=[self._types.Part.from_text(text=content)],
                    )
                )
            else:
                contents.append(
                    self._types.Content(
                        role="user",
                        parts=[self._types.Part.from_text(text=content)],
                    )
                )

        if not contents:
            contents = ["Please analyze the document."]

        config_kwargs = {
            "temperature": config.LLM_TEMPERATURE,
            "response_mime_type": "application/json",
            "http_options": self._types.HttpOptions(timeout=effective_timeout * 1000),
        }
        if system_instruction:
            config_kwargs["system_instruction"] = system_instruction
        if config.LLM_MAX_OUTPUT_TOKENS:
            config_kwargs["max_output_tokens"] = config.LLM_MAX_OUTPUT_TOKENS

        gen_config = self._types.GenerateContentConfig(**config_kwargs)

        try:
            response = self._client.models.generate_content(
                model=self._model,
                contents=contents,
                config=gen_config,
            )
        except self._APIError as exc:
            err_code = getattr(exc, "code", None)
            err_msg = str(exc)
            logger.error("Gemini APIError encountered: code=%s", err_code)

            if err_code == 429 or "RESOURCE_EXHAUSTED" in err_msg or "rate" in err_msg.lower():
                raise LLMError("Gemini API rate limit or quota exceeded. Please check your quota or try again later.") from exc
            elif err_code in (400, 401, 403) and any(
                k in err_msg for k in ("API_KEY_INVALID", "API key not valid", "PERMISSION_DENIED", "UNAUTHENTICATED")
            ):
                raise LLMError("Invalid or unauthorized Gemini API key. Please verify your GEMINI_API_KEY in ai-service/.env.") from exc
            elif err_code in (408, 504) or "DEADLINE_EXCEEDED" in err_msg or "timed out" in err_msg.lower():
                raise LLMError(f"Gemini API request timed out after {timeout} seconds.") from exc
            else:
                raise LLMError(f"Gemini API error (HTTP {err_code}): {err_msg}") from exc
        except (TimeoutError, Exception) as exc:
            err_name = type(exc).__name__
            logger.error("Gemini request failure: %s", err_name)
            if "Timeout" in err_name or "timed out" in str(exc).lower():
                raise LLMError(f"Gemini API request timed out after {timeout} seconds.") from exc
            raise LLMError(f"Gemini API error: {exc}") from exc

        # Check for safety filter blocks
        candidates = getattr(response, "candidates", None)
        if candidates:
            first_candidate = candidates[0]
            finish_reason = getattr(first_candidate, "finish_reason", None)
            if finish_reason and str(finish_reason).upper() in ("SAFETY", "BLOCKED", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII"):
                logger.error("Gemini response blocked by content safety filters: %s", finish_reason)
                raise LLMError("Gemini response was blocked by content safety filters.")

        # Check for empty response
        text = getattr(response, "text", None)
        if text is None or not str(text).strip():
            logger.error("Gemini returned empty response text")
            raise LLMError("Gemini returned an empty response.")

        return str(text).strip()


_ADAPTERS = {
    "gemini": GeminiAdapter,
}


def get_adapter() -> BaseLLMAdapter:
    """
    Return an instance of the configured LLM adapter (default: 'gemini').
    Raises LLMError if the provider is not recognized.
    """
    provider = config.LLM_PROVIDER.lower()
    if provider not in _ADAPTERS:
        raise LLMError(
            f"Unknown LLM provider '{provider}'. "
            f"Supported: {list(_ADAPTERS.keys())}"
        )
    return _ADAPTERS[provider]()
