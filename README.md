# tAI — AI Research Agent

tAI is a full-stack AI research assistant that generates **concise research briefs** with **sources, tools used, and optional images**.  
It combines a **FastAPI + LangChain backend** with a **Next.js App Router frontend**, deployed on **Google Cloud Run**.

---

## ✨ Features

- 🧠 AI-powered research summaries (~150 words)
- 🔍 Uses multiple tools (search, Wikipedia, retrieval, image generation)
- 📚 Returns sources as URLs
- 🛠 Shows which tools were used
- 🖼 Optional image generation (base64 → rendered in UI)
- 💾 Logs research outputs (locally)
- ⚡ Scales to zero on Cloud Run
- 🌍 Fully deployed on Google Cloud Platform

---

## 🏗 Architecture
┌────────────────────┐        HTTP       ┌────────────────────────┐
│  Next.js Frontend  │ ───────────────▶ │  FastAPI Backend        │
│  (Cloud Run)       │                  │  (LangChain Agent)     │
│                    │ ◀─────────────── │                       |
└────────────────────┘                  └────────────────────────┘
          │                                         │
          │                                         │
          ▼                                         ▼
  Runtime config API                        OpenAI / tools
  (/api/config)                             (search, wiki, etc.)


---

## 📁 Project Structure
tAI/
├── backend/
│   ├── main.py              # FastAPI app + LangChain agent
│   ├── tools.py             # Custom tools (search, wiki, image, etc.)
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   └── research-ui/
│       ├── app/
│       │   ├── page.tsx     # Main UI (client component)
│       │   └── api/
│       │       └── config/
│       │           └── route.ts   # Runtime env config
│       ├── package.json
│       ├── Dockerfile
│       └── tailwind.config.js
│
└── README.md


---

## 🔌 Backend (FastAPI + LangChain)

### Responsibilities
- Accepts research queries
- Invokes a LangChain agent with multiple tools
- Returns structured output:
  - topic
  - summary
  - sources
  - tools used
  - optional image (base64)

### Endpoint

**Request**
```json
{
  "query": "Explain CRISPR gene editing"
}
**Response**
{
  "topic": "CRISPR Gene Editing",
  "summary": "...",
  "sources": ["https://..."],
  "tools_used": ["wikipedia", "search"],
  "image_b64": null
}
```

# Local Backend Setup
-cd backend
-python -m venv .venv
-source .venv/bin/activate   # Windows: .venv\Scripts\activate
-pip install -r requirements.txt
# Create a .env file:
-OPENAI_API_KEY=your_key_here
# Run locally:
-uvicorn main:app --reload








 


 
