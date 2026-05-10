# DocuMind — RAG Document Intelligence System

A production-grade Retrieval-Augmented Generation (RAG) system that lets you upload documents and chat with them using Groq's LLaMA 3.3 70B model.

## Features

- **Upload** PDF, DOCX, TXT, and Markdown files (up to 20MB)
- **RAG Pipeline** — documents are chunked and indexed; relevant chunks are retrieved per query using TF-IDF cosine similarity
- **Multi-document** support — select specific docs or query across all
- **Chat with history** — multi-turn conversation with context
- **Source citations** — every answer shows which chunks were used and match scores
- **Document summarization** — one-click structured summary of any document
- **Dark UI** built with React + CSS Modules

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, React Markdown, React Dropzone |
| Backend | Node.js, Express |
| LLM | Groq API (llama-3.3-70b-versatile) |
| RAG | Custom TF-IDF chunker (no external vector DB needed) |
| PDF parsing | pdf-parse |
| DOCX parsing | mammoth |

## Quick Start

### Prerequisites
- Node.js 18+ installed
- Free Groq API key from [console.groq.com/keys](https://console.groq.com/keys)

### Mac / Linux

```bash
chmod +x start.sh
./start.sh
```

### Windows

```
Double-click start.bat
```

### Manual Setup

```bash
# 1. Setup environment
cp backend/.env.example backend/.env
# Edit backend/.env and add your GROQ_API_KEY

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Start backend (Terminal 1)
cd backend && npm run dev

# 4. Start frontend (Terminal 2)
cd frontend && npm start
```

Open **http://localhost:3000** in your browser.

## Project Structure

```
documind/
├── backend/
│   ├── server.js        # Express API (upload, query, summarize)
│   ├── rag.js           # Text chunker + TF-IDF retrieval
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main layout
│   │   ├── components/
│   │   │   ├── DocumentUploader.jsx  # Drag & drop upload
│   │   │   ├── DocumentList.jsx      # Doc management
│   │   │   ├── ChatInterface.jsx     # Q&A chat with sources
│   │   │   └── SummaryModal.jsx      # Summary overlay
│   │   └── utils/api.js         # Axios API client
│   └── package.json
├── start.sh             # One-command startup (Mac/Linux)
├── start.bat            # One-command startup (Windows)
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload` | Upload & index a document |
| GET | `/documents` | List all indexed documents |
| DELETE | `/documents/:id` | Remove a document |
| POST | `/query` | Ask a question (RAG) |
| POST | `/summarize` | Summarize a document |
| GET | `/health` | Health check |

## How the RAG Pipeline Works

1. **Ingest** — uploaded file is parsed (pdf-parse / mammoth / fs)
2. **Chunk** — text split into ~600-char overlapping chunks (120-char overlap)
3. **Index** — chunks stored in memory with the document
4. **Retrieve** — at query time, TF-IDF cosine similarity ranks chunks against the question; top 6 retrieved
5. **Generate** — retrieved chunks sent as context to Groq LLaMA 3.3 70B with source attribution instructions
6. **Respond** — answer returned with source excerpts and match scores

## Resume Talking Point

> "Built a full-stack RAG system from scratch without any vector database — implemented custom TF-IDF chunk retrieval in Node.js, integrated Groq's LLaMA 3.3 70B for generation, and shipped a React frontend with multi-document support, source citations, and multi-turn chat history."
# DocuMind
