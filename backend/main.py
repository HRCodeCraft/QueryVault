import os
import logging
import warnings

# Suppress HuggingFace / Transformers noise
os.environ.setdefault("TRANSFORMERS_VERBOSITY", "error")
os.environ.setdefault("HF_HUB_VERBOSITY", "error")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

warnings.filterwarnings("ignore")
logging.getLogger("transformers").setLevel(logging.ERROR)
logging.getLogger("huggingface_hub").setLevel(logging.ERROR)
logging.getLogger("sentence_transformers").setLevel(logging.ERROR)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import documents, chat, user, apikeys, teams
from auth.routes import router as auth_router
from auth.database import create_tables

app = FastAPI(
    title="QueryVault API",
    description="RAG-based Document QA System",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create DB tables on startup
@app.on_event("startup")
async def startup():
    create_tables()

app.include_router(auth_router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(user.router, prefix="/api")
app.include_router(apikeys.router, prefix="/api")
app.include_router(teams.router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "QueryVault API is running", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "ok"}
