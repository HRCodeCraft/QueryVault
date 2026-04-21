import os
import logging
from pathlib import Path
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader

from config import settings

logger = logging.getLogger(__name__)


def _ocr_pdf(file_path: str) -> list[Document]:
    """OCR fallback for scanned PDFs using pytesseract."""
    try:
        import pytesseract
        from pdf2image import convert_from_path
        from PIL import Image

        pages = convert_from_path(file_path, dpi=300)
        docs = []
        for i, page_img in enumerate(pages):
            text = pytesseract.image_to_string(page_img, lang="eng")
            if text.strip():
                docs.append(Document(
                    page_content=text,
                    metadata={"page": i, "source": file_path, "ocr": True}
                ))
        return docs
    except ImportError:
        raise ValueError(
            "OCR requires tesseract. Install with:\n"
            "  sudo apt install tesseract-ocr poppler-utils\n"
            "  pip install pytesseract pdf2image Pillow"
        )
    except Exception as e:
        raise ValueError(f"OCR failed: {e}")


def load_document(file_path: str) -> list[Document]:
    ext = Path(file_path).suffix.lower()

    if ext == ".pdf":
        loader = PyPDFLoader(file_path)
        docs = loader.load()

        # Detect scanned PDF: if extracted text is < 100 chars per page on average, use OCR
        total_text = sum(len(d.page_content.strip()) for d in docs)
        avg_text = total_text / max(len(docs), 1)

        if avg_text < 100:
            logger.info("Scanned PDF detected — falling back to OCR")
            docs = _ocr_pdf(file_path)

        return docs

    elif ext == ".txt":
        return TextLoader(file_path, encoding="utf-8").load()

    elif ext == ".docx":
        return Docx2txtLoader(file_path).load()

    elif ext in (".png", ".jpg", ".jpeg", ".tiff", ".bmp"):
        try:
            import pytesseract
            from PIL import Image
            text = pytesseract.image_to_string(Image.open(file_path)).strip()
            if not text:
                raise ValueError(
                    "No readable text found in this image. "
                    "Make sure the image contains clear, visible text (e.g. a screenshot of a document or webpage). "
                    "Images with only icons or graphics cannot be processed."
                )
            return [Document(page_content=text, metadata={"source": file_path, "ocr": True})]
        except ImportError:
            raise ValueError("Image OCR requires: sudo apt install tesseract-ocr && pip install pytesseract Pillow")

    else:
        raise ValueError(f"Unsupported file type: {ext}")


def split_documents(documents: list[Document]) -> list[Document]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    return splitter.split_documents(documents)


def process_file(file_path: str, doc_name: str) -> list[Document]:
    raw_docs = load_document(file_path)
    chunks = split_documents(raw_docs)

    for chunk in chunks:
        chunk.metadata["source"] = doc_name
        chunk.metadata["file_path"] = file_path

    return chunks
