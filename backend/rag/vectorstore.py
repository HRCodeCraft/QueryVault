import uuid
from pathlib import Path
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

from config import settings
from utils.document_processor import process_file


class VectorStoreManager:
    def __init__(self):
        Path(settings.CHROMA_DB_PATH).mkdir(parents=True, exist_ok=True)
        self.embeddings = HuggingFaceEmbeddings(
            model_name="all-MiniLM-L6-v2",
            model_kwargs={"device": "cpu"},
        )
        self.db = Chroma(
            persist_directory=settings.CHROMA_DB_PATH,
            embedding_function=self.embeddings,
            collection_name="queryvault_docs",
        )

    def add_document(self, file_path: str, doc_name: str) -> tuple[str, int]:
        """Process file, embed chunks, store in ChromaDB. Returns (doc_id, chunk_count)."""
        doc_id = str(uuid.uuid4())
        chunks = process_file(file_path, doc_name)

        if not chunks:
            raise ValueError(
                "No text could be extracted from this file. "
                "If it's an image or scanned PDF, make sure it contains readable text."
            )

        for chunk in chunks:
            chunk.metadata["doc_id"] = doc_id

        self.db.add_documents(chunks)
        return doc_id, len(chunks)

    def list_documents(self) -> list[dict]:
        """Return list of unique documents stored in ChromaDB."""
        results = self.db.get(include=["metadatas"])
        seen = {}
        for meta in results["metadatas"]:
            doc_id = meta.get("doc_id")
            source = meta.get("source", "Unknown")
            if doc_id and doc_id not in seen:
                seen[doc_id] = {"id": doc_id, "name": source, "chunks": 0}
            if doc_id:
                seen[doc_id]["chunks"] += 1
        return list(seen.values())

    def delete_document(self, doc_id: str) -> bool:
        """Delete all chunks belonging to a document."""
        results = self.db.get(where={"doc_id": doc_id})
        if not results["ids"]:
            return False
        self.db.delete(ids=results["ids"])
        return True

    def get_retriever(self, doc_id: str | None = None):
        """Return a LangChain retriever, optionally filtered by doc_id."""
        search_kwargs = {"k": settings.RETRIEVER_K}
        if doc_id:
            search_kwargs["filter"] = {"doc_id": doc_id}
        return self.db.as_retriever(search_type="similarity", search_kwargs=search_kwargs)
