import traceback
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from auth.utils import get_current_user
from auth.database import User

from rag.chain import RAGChain, get_available_providers

router = APIRouter(prefix="/chat", tags=["chat"])
rag_chain = RAGChain()


class ChatRequest(BaseModel):
    question: str
    provider: str = "groq"
    doc_id: str | None = None


class CompareRequest(BaseModel):
    question: str
    doc_id_a: str
    doc_id_b: str
    provider: str = "groq"


class SourceDocument(BaseModel):
    content: str
    source: str
    page: int | None = None


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceDocument]


@router.get("/providers")
async def list_providers():
    """Return available LLM providers."""
    return get_available_providers()


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest, current_user: User = Depends(get_current_user)):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    try:
        result = rag_chain.query(request.question, provider=request.provider, doc_id=request.doc_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to process query: {str(e)}")

    return ChatResponse(
        answer=result["answer"],
        sources=[
            SourceDocument(
                content=doc.page_content[:300],
                source=doc.metadata.get("source", "Unknown"),
                page=doc.metadata.get("page")
            )
            for doc in result["source_documents"]
        ]
    )


@router.post("/compare", response_model=ChatResponse)
async def compare_documents(request: CompareRequest, current_user: User = Depends(get_current_user)):
    """Compare two documents side-by-side for a given question."""
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    try:
        result = rag_chain.compare(
            question=request.question,
            doc_id_a=request.doc_id_a,
            doc_id_b=request.doc_id_b,
            provider=request.provider,
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")

    return ChatResponse(answer=result["answer"], sources=[
        SourceDocument(
            content=doc.page_content[:300],
            source=doc.metadata.get("source", "Unknown"),
            page=doc.metadata.get("page")
        )
        for doc in result["source_documents"]
    ])
