<div align="center">

# QueryVault

### Chat with your documents. Privately. Powerfully.

**Upload any document — PDF, Word, image, or text — and ask it anything.**  
QueryVault uses RAG (Retrieval-Augmented Generation) to find the exact answer, with sources cited.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![LangChain](https://img.shields.io/badge/RAG-LangChain-1C3C3C?style=flat-square)](https://langchain.com)
[![ChromaDB](https://img.shields.io/badge/VectorDB-ChromaDB-orange?style=flat-square)](https://www.trychroma.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

![QueryVault Demo](https://raw.githubusercontent.com/HRCodeCraft/QueryVault/main/preview.png)

</div>

---

## Why QueryVault?

Most document AI tools send your files to the cloud. QueryVault keeps **everything local** — your documents, your embeddings, your data. No subscriptions. No data leaks.

> Think of it as your own private Copilot — but open-source, free, and under your control.

---

## Features

### Core
- **Multi-format upload** — PDF, DOCX, TXT, PNG, JPG, TIFF (drag & drop supported)
- **OCR support** — Scanned PDFs and images are auto-processed with Tesseract
- **Source citations** — Every answer shows exactly which chunk of text it came from
- **Local embeddings** — `all-MiniLM-L6-v2` runs on your CPU, no API needed for indexing

### AI & Models
- **4 AI providers** — Switch between Groq (free), Gemini, OpenAI GPT-4o Mini, and Claude
- **Document Comparison** — Ask one question across two documents and get a structured diff

### User Experience
- **Multi-language UI** — English, Hindi, Spanish, German
- **Dark / Light / High-contrast themes**
- **PDF export** — Download any chat session as a formatted report
- **Chat history** — Sessions saved per user to backend database

### Teams & API
- **Team Vaults** — Create shared document collections, invite teammates via code
- **API Keys** — Generate keys to query your vault programmatically (REST API)

### Security
- **JWT authentication** with email verification
- **Parental controls** — PIN-lock sensitive features
- **Per-user data isolation** — Each user sees only their own documents and sessions

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Backend | FastAPI + Python 3.11 |
| RAG Framework | LangChain LCEL |
| Vector Store | ChromaDB (fully local) |
| Embeddings | HuggingFace `all-MiniLM-L6-v2` (free, runs on CPU) |
| OCR | Tesseract + pdf2image |
| Database | SQLite + SQLAlchemy |
| Auth | JWT (python-jose) + bcrypt |
| LLMs | Groq / Gemini / OpenAI / Anthropic Claude |

---

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- Tesseract OCR — `sudo apt install tesseract-ocr` (Linux) or [install guide](https://github.com/tesseract-ocr/tesseract)

### 1. Clone

```bash
git clone https://github.com/HRCodeCraft/QueryVault.git
cd QueryVault
```

### 2. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Open `.env` and add at least a free Groq key:

```env
GROQ_API_KEY=your_groq_api_key_here
```

> Get a **free** Groq API key at [console.groq.com](https://console.groq.com) — no credit card needed.

### 3. Frontend

```bash
cd ../frontend
npm install
```

### 4. Start

```bash
cd ..
bash start.sh
```

Open **http://localhost:5173** — register an account and start chatting with your documents.

---

## How It Works

```
User uploads PDF / DOCX / Image
          ↓
Text extracted (with OCR fallback for scans)
          ↓
Document split into overlapping chunks
          ↓
Each chunk embedded → stored in ChromaDB (local)
          ↓
User asks a question
          ↓
Top-k similar chunks retrieved by vector similarity
          ↓
Chunks + question sent to selected LLM (Groq / Gemini / etc.)
          ↓
Answer returned with source citations
```

---

## Supported AI Models

| Model | Provider | Free? |
|---|---|---|
| Llama 3.1 8B Instant | Groq | ✅ Free |
| Gemini 2.0 Flash | Google | ✅ Free (rate-limited) |
| GPT-4o Mini | OpenAI | 💳 Pay-per-use |
| Claude 3 Haiku | Anthropic | 💳 Pay-per-use |

Start with Groq — it's free, fast, and works out of the box.

---

## API Access

QueryVault exposes a REST API so you can query your vault from any app or script.

```bash
# Generate an API key from Account → API Keys in the UI, then:
curl -X POST http://localhost:8000/api/chat/ \
  -H "X-API-Key: qv_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the refund policy?", "provider": "groq"}'
```

---

## Project Structure

```
QueryVault/
├── backend/
│   ├── main.py                      # FastAPI app entry point
│   ├── config.py                    # Settings & env vars
│   ├── auth/
│   │   ├── database.py              # SQLAlchemy models (User, Team, APIKey…)
│   │   └── utils.py                 # JWT + bcrypt + API key auth
│   ├── api/routes/
│   │   ├── documents.py             # Upload / list / delete
│   │   ├── chat.py                  # Chat + document comparison
│   │   ├── user.py                  # Profile, settings, sessions
│   │   ├── apikeys.py               # API key management
│   │   └── teams.py                 # Team Vaults
│   ├── rag/
│   │   ├── chain.py                 # LangChain LCEL pipeline
│   │   └── vectorstore.py           # ChromaDB manager
│   └── utils/
│       └── document_processor.py   # Chunking + OCR
├── frontend/
│   └── src/
│       ├── pages/
│       │   └── AuthPage.jsx         # Animated login / register
│       ├── components/
│       │   ├── Sidebar.jsx          # Upload, doc list, account
│       │   ├── ChatPanel.jsx        # Chat UI + PDF export
│       │   ├── AccountPanel.jsx     # Settings, profile, API keys
│       │   └── TeamVault.jsx        # Team management
│       ├── api.js                   # Axios client
│       ├── auth.js                  # Token management
│       └── i18n.js                  # EN / HI / ES / DE translations
├── start.sh                         # Start both servers in one command
└── README.md
```

---

## Contributing

Pull requests are welcome. If you want to add a new LLM provider, language, or feature — open an issue first to discuss.

---

## License

MIT — free to use, modify, and distribute.

---

<div align="center">

Built with LangChain · FastAPI · React · ChromaDB · HuggingFace

**Star the repo if you found it useful ⭐**

</div>
