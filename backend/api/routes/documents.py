import os
import shutil
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel

from config import settings
from rag.vectorstore import VectorStoreManager
from auth.utils import get_current_user
from auth.database import User

router = APIRouter(prefix="/documents", tags=["documents"])
vs_manager = VectorStoreManager()


class DocumentInfo(BaseModel):
    id: str
    name: str
    chunks: int


@router.post("/upload", response_model=DocumentInfo)
async def upload_document(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """Upload a PDF, TXT, or DOCX file and index it into ChromaDB."""
    allowed_extensions = {".pdf", ".txt", ".docx", ".png", ".jpg", ".jpeg", ".tiff", ".bmp"}
    ext = Path(file.filename).suffix.lower()

    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: PDF, TXT, DOCX, PNG, JPG, TIFF"
        )

    upload_path = Path(settings.UPLOAD_DIR) / file.filename
    upload_path.parent.mkdir(parents=True, exist_ok=True)

    with open(upload_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        doc_id, chunk_count = vs_manager.add_document(str(upload_path), file.filename)
    except Exception as e:
        os.remove(upload_path)
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

    return DocumentInfo(id=doc_id, name=file.filename, chunks=chunk_count)


@router.get("/", response_model=list[DocumentInfo])
async def list_documents(current_user: User = Depends(get_current_user)):
    """List all indexed documents."""
    return vs_manager.list_documents()


@router.delete("/{doc_id}")
async def delete_document(doc_id: str, current_user: User = Depends(get_current_user)):
    """Delete a document and its embeddings from the vector store."""
    deleted = vs_manager.delete_document(doc_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted successfully"}
