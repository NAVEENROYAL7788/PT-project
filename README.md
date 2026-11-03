# DocuMind - AI Document Intelligence & Study Studio

DocuMind is an intelligent document analysis and RAG (Retrieval-Augmented Generation) notebook assistant. It indexes documents with deterministic vector search and generates verified, grounded explanations, study guides, and interactive recall quizzes.

---

## Architecture Overview

1. **Frontend**: React + Vite + Tailwind CSS SPA (`/frontend`) running on port `5173`.
2. **Backend Gateway**: Express + Node.js (`/backend`) running on port `4000` with MongoDB user isolation and document storage.
3. **AI Microservice**: Python Flask service (`/ai-service`) running on port `5001` with `all-MiniLM-L6-v2` embeddings, FAISS vector indexing, and Google Gemini LLM generation.

---

## AI Service & Data-Flow Disclosure

Document excerpts and questions are sent to Google Gemini for answer generation and document summarization. Data handling and privacy practices are governed by Google's official policies:
- [Google Privacy Policy](https://policies.google.com/privacy)
- [Google APIs Terms of Service](https://developers.google.com/terms)

Document embeddings are computed locally using `all-MiniLM-L6-v2` (384 dimensions) and stored in dedicated FAISS vector indexes. The Gemini API key (`GEMINI_API_KEY`) is stored strictly in the `ai-service/.env` file and is never exposed to the frontend or Express gateway.

---

## Getting Started

### 1. AI Service Setup
```bash
cd ai-service
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and supply your GEMINI_API_KEY
python app.py
```

### 2. Backend Setup
```bash
cd backend
npm install
npm test
npm start
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run build
npm run dev
```

