"""
app.py - Flask AI service.

Binds to 127.0.0.1 by default. All routes require X-Internal-Token header.
Exposes /internal/* endpoints called only by the Express backend.

Routes:
  POST /internal/index       - extract, chunk, embed, build FAISS index
  POST /internal/query       - RAG question answering
  POST /internal/summarize   - document summarization
  DELETE /internal/index/:id - delete FAISS index
  POST /internal/reindex/:id - rebuild index from pages.json
  GET  /health               - liveness check (no auth required)
"""

import logging
import os
import traceback
from functools import wraps
from pathlib import Path

from flask import Flask, jsonify, request

from config import FLASK_HOST, FLASK_PORT, INTERNAL_SERVICE_TOKEN, INDEX_STORAGE_PATH

# Configure structured logging (never log document text or tokens)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("documind.ai")

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50 MB internal limit


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def ok(data: dict | list, status: int = 200):
    return jsonify({"ok": True, "data": data}), status


def err(code: str, message: str, status: int = 400):
    return jsonify({"ok": False, "error": {"code": code, "message": message}}), status


def require_internal_token(f):
    """Decorator: reject requests missing or with wrong X-Internal-Token."""

    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("X-Internal-Token", "")
        if not INTERNAL_SERVICE_TOKEN:
            logger.error("INTERNAL_SERVICE_TOKEN is not configured.")
            return err("misconfigured", "Internal service token not configured.", 500)
        if token != INTERNAL_SERVICE_TOKEN:
            return err("unauthorized", "Missing or invalid internal token.", 401)
        return f(*args, **kwargs)

    return decorated


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/health")
def health():
    return ok({"status": "ok"})


@app.post("/internal/index")
@require_internal_token
def index_document():
    """
    Accepts: multipart/form-data with fields:
      - file: the uploaded file
      - document_id: string
      - file_type: 'pdf' or 'txt'
    """
    document_id = request.form.get("document_id", "").strip()
    file_type = request.form.get("file_type", "").strip().lower()

    if not document_id:
        return err("validation", "document_id is required.", 400)
    if file_type not in ("pdf", "txt"):
        return err("validation", "file_type must be 'pdf' or 'txt'.", 400)

    if "file" not in request.files:
        return err("validation", "No file uploaded.", 400)

    file_bytes = request.files["file"].read()
    if not file_bytes:
        return err("validation", "Uploaded file is empty.", 400)

    try:
        from extractor import extract, ExtractionError
        from chunker import chunk_pages
        from embedder import embed_texts
        from indexer import build_index

        # Extract text
        pages = extract(file_bytes, file_type)

        # Chunk
        chunks = chunk_pages(pages, document_id)
        if not chunks:
            return err(
                "no_content",
                "Document produced no processable text chunks.",
                422,
            )

        # Embed
        texts = [c["text"] for c in chunks]
        embeddings = embed_texts(texts)

        # Build FAISS index
        build_index(document_id, chunks, embeddings, pages)

        logger.info(
            "Indexed document %s: %d pages, %d chunks", document_id, len(pages), len(chunks)
        )

        return ok(
            {
                "document_id": document_id,
                "page_count": len(pages),
                "chunk_count": len(chunks),
            },
            201,
        )

    except ExtractionError as exc:
        logger.warning("Extraction failed for %s: %s", document_id, str(exc))
        return err("extraction_failed", str(exc), 422)
    except Exception as exc:
        logger.error("Index error for %s: %s", document_id, traceback.format_exc())
        return err("internal", "Failed to index document.", 500)


@app.post("/internal/query")
@require_internal_token
def query_document():
    """
    JSON body:
      { "document_id": str, "question": str, "history": [{role, content}] }
    """
    body = request.get_json(silent=True) or {}
    document_id = body.get("document_id", "").strip()
    question = body.get("question", "").strip()
    history = body.get("history", [])

    if not document_id:
        return err("validation", "document_id is required.", 400)
    if not question:
        return err("validation", "question is required.", 400)
    if len(question) > 2000:
        return err("validation", "question must not exceed 2000 characters.", 400)

    try:
        from qa import answer_question
        from llm_adapter import LLMError
        from indexer import load_index
        from pathlib import Path as P

        # Check index exists
        index_dir = P(INDEX_STORAGE_PATH) / document_id
        if not (index_dir / "index.faiss").exists():
            return err("not_found", f"No index found for document {document_id}.", 404)

        result = answer_question(document_id, question, history)
        return ok(result)

    except FileNotFoundError as exc:
        return err("not_found", str(exc), 404)
    except LLMError as exc:
        logger.error("LLM error for query on %s: %s", document_id, str(exc))
        return err("llm_error", str(exc), 502)
    except Exception as exc:
        logger.error("Query error for %s: %s", document_id, traceback.format_exc())
        return err("internal", "Failed to answer question.", 500)


@app.post("/internal/summarize")
@require_internal_token
def summarize_document():
    """
    JSON body: { "document_id": str, "mode": "short"|"detailed" }
    """
    body = request.get_json(silent=True) or {}
    document_id = body.get("document_id", "").strip()
    mode = body.get("mode", "short").strip().lower()

    if not document_id:
        return err("validation", "document_id is required.", 400)
    if mode not in ("short", "detailed"):
        return err("validation", "mode must be 'short' or 'detailed'.", 400)

    try:
        from summarizer import summarize, SummarizationError
        from llm_adapter import LLMError

        summary_text = summarize(document_id, mode)
        return ok({"document_id": document_id, "mode": mode, "summary": summary_text})

    except FileNotFoundError as exc:
        return err("not_found", str(exc), 404)
    except SummarizationError as exc:
        logger.error("Summarization error for %s: %s", document_id, str(exc))
        return err("summarization_failed", str(exc), 502)
    except Exception as exc:
        logger.error("Summarize error for %s: %s", document_id, traceback.format_exc())
        return err("internal", "Failed to summarize document.", 500)


@app.delete("/internal/index/<document_id>")
@require_internal_token
def delete_document_index(document_id: str):
    try:
        from indexer import delete_index
        delete_index(document_id)
        logger.info("Deleted index for document %s", document_id)
        return ok({"document_id": document_id, "deleted": True})
    except Exception as exc:
        logger.error("Delete index error for %s: %s", document_id, traceback.format_exc())
        return err("internal", "Failed to delete index.", 500)


@app.post("/internal/reindex/<document_id>")
@require_internal_token
def reindex_document(document_id: str):
    try:
        from indexer import reindex
        page_count, chunk_count = reindex(document_id)
        logger.info("Reindexed document %s: %d pages, %d chunks", document_id, page_count, chunk_count)
        return ok({"document_id": document_id, "page_count": page_count, "chunk_count": chunk_count})
    except FileNotFoundError as exc:
        return err("not_found", str(exc), 404)
    except Exception as exc:
        logger.error("Reindex error for %s: %s", document_id, traceback.format_exc())
        return err("internal", "Failed to reindex document.", 500)


# ---------------------------------------------------------------------------
# Error handlers
# ---------------------------------------------------------------------------


@app.errorhandler(404)
def not_found(_):
    return err("not_found", "Route not found.", 404)


@app.errorhandler(405)
def method_not_allowed(_):
    return err("method_not_allowed", "Method not allowed.", 405)


@app.errorhandler(413)
def request_too_large(_):
    return err("too_large", "Request body too large.", 413)


@app.errorhandler(500)
def internal_error(_):
    return err("internal", "Internal server error.", 500)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    Path(INDEX_STORAGE_PATH).mkdir(parents=True, exist_ok=True)
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=False)
