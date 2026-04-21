from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableParallel

from config import settings
from rag.vectorstore import VectorStoreManager

SYSTEM_PROMPT = """You are a helpful assistant that answers questions based strictly on the provided document context.

Context from documents:
{context}

Instructions:
- Answer based ONLY on the context above.
- If the context doesn't contain enough information, say "I couldn't find relevant information in the uploaded documents."
- Be concise and accurate.
- Cite which part of the document supports your answer when possible."""

PROMPT = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    ("human", "{input}"),
])


def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)


def get_llm(provider: str):
    """Return LLM instance based on selected provider."""
    if provider == "groq":
        if not settings.GROQ_API_KEY:
            raise ValueError("Groq API key not configured. Add GROQ_API_KEY in .env")
        from langchain_groq import ChatGroq
        return ChatGroq(model="llama-3.1-8b-instant", api_key=settings.GROQ_API_KEY, temperature=0.2)

    elif provider == "gemini":
        if not settings.GOOGLE_API_KEY:
            raise ValueError("Google API key not configured. Add GOOGLE_API_KEY in .env")
        import os
        os.environ["GOOGLE_API_KEY"] = settings.GOOGLE_API_KEY
        os.environ["GEMINI_API_KEY"] = settings.GOOGLE_API_KEY
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(model="gemini-2.0-flash-lite", temperature=0.2)

    elif provider == "openai":
        if not settings.OPENAI_API_KEY:
            raise ValueError("OpenAI API key not configured. Add OPENAI_API_KEY in .env")
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model="gpt-4o-mini", api_key=settings.OPENAI_API_KEY, temperature=0.2)

    elif provider == "claude":
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError("Anthropic API key not configured. Add ANTHROPIC_API_KEY in .env")
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(model="claude-3-haiku-20240307", api_key=settings.ANTHROPIC_API_KEY, temperature=0.2)

    else:
        raise ValueError(f"Unknown provider: {provider}. Choose: groq, gemini, openai, claude")


def get_available_providers() -> list[dict]:
    """Return list of providers with their availability status."""
    return [
        {"id": "groq",   "name": "Groq (Llama 3.1)",    "available": bool(settings.GROQ_API_KEY)},
        {"id": "gemini", "name": "Google Gemini",         "available": bool(settings.GOOGLE_API_KEY)},
        {"id": "openai", "name": "OpenAI GPT-4o Mini",    "available": bool(settings.OPENAI_API_KEY)},
        {"id": "claude", "name": "Anthropic Claude",      "available": bool(settings.ANTHROPIC_API_KEY)},
    ]


class RAGChain:
    def __init__(self):
        self.vs_manager = VectorStoreManager()

    def query(self, question: str, provider: str = "groq", doc_id: str | None = None) -> dict:
        all_docs = self.vs_manager.list_documents()
        if not all_docs:
            raise ValueError("No documents uploaded yet. Please upload a document first.")

        llm = get_llm(provider)
        retriever = self.vs_manager.get_retriever(doc_id=doc_id)

        rag_chain = RunnableParallel(
            context=retriever,
            input=RunnablePassthrough()
        ).assign(
            answer=(
                RunnablePassthrough.assign(
                    context=lambda x: format_docs(x["context"])
                )
                | PROMPT
                | llm
                | StrOutputParser()
            )
        )

        result = rag_chain.invoke(question)
        return {
            "answer": result["answer"],
            "source_documents": result["context"],
        }

    def compare(self, question: str, doc_id_a: str, doc_id_b: str, provider: str = "groq") -> dict:
        """Retrieve context from two documents and compare them for the given question."""
        llm = get_llm(provider)
        retriever_a = self.vs_manager.get_retriever(doc_id=doc_id_a)
        retriever_b = self.vs_manager.get_retriever(doc_id=doc_id_b)

        docs_a = retriever_a.invoke(question)
        docs_b = retriever_b.invoke(question)

        context_a = format_docs(docs_a)
        context_b = format_docs(docs_b)

        compare_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a document comparison assistant.
You are given excerpts from TWO documents and a question.
Compare them clearly and highlight similarities, differences, and key insights.

Document A:
{context_a}

Document B:
{context_b}

Instructions:
- Structure your answer with clear sections: Similarities, Differences, Summary.
- Be factual and base your answer only on the provided context.
- If one document doesn't cover the topic, say so explicitly."""),
            ("human", "{question}"),
        ])

        chain = compare_prompt | llm | StrOutputParser()
        answer = chain.invoke({"context_a": context_a, "context_b": context_b, "question": question})

        return {
            "answer": answer,
            "source_documents": docs_a + docs_b,
        }
