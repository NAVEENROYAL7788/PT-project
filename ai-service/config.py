"""
config.py - Central configuration loaded from environment variables.
All configurable constants live here. Never hardcode secrets or model names
outside this module.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent / ".env"
if env_path.is_file():
    load_dotenv(dotenv_path=env_path)

# Server
FLASK_HOST = os.environ.get("FLASK_HOST", "127.0.0.1")
FLASK_PORT = int(os.environ.get("FLASK_PORT", "5001"))
INTERNAL_SERVICE_TOKEN = os.environ.get("INTERNAL_SERVICE_TOKEN", "")

# Storage
INDEX_STORAGE_PATH = os.environ.get("INDEX_STORAGE_PATH", "./indexes")
KEEP_ORIGINALS = os.environ.get("KEEP_ORIGINALS", "false").lower() == "true"

# Chunking
CHUNK_SIZE = int(os.environ.get("CHUNK_SIZE", "500"))
CHUNK_OVERLAP = int(os.environ.get("CHUNK_OVERLAP", "50"))

# Retrieval
TOP_K = int(os.environ.get("TOP_K", "4"))
MIN_RELEVANCE = float(os.environ.get("MIN_RELEVANCE", "0.25"))

# LLM (Default: Google Gemini)
LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "gemini").lower()
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
LLM_MODEL = os.environ.get("LLM_MODEL", "gemini-2.5-flash")
LLM_TIMEOUT_SECONDS = int(os.environ.get("LLM_TIMEOUT_SECONDS", os.environ.get("LLM_TIMEOUT", "30")))
LLM_TEMPERATURE = float(os.environ.get("LLM_TEMPERATURE", "0.2"))
_raw_max_tokens = os.environ.get("LLM_MAX_OUTPUT_TOKENS")
LLM_MAX_OUTPUT_TOKENS = int(_raw_max_tokens) if _raw_max_tokens else 2048

# Conversation context
MAX_CONTEXT_TURNS = int(os.environ.get("MAX_CONTEXT_TURNS", "4"))

# TXT pseudo-page split size (characters per logical page)
TXT_PAGE_SIZE = int(os.environ.get("TXT_PAGE_SIZE", "3000"))
