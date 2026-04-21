from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # LLM Provider API Keys
    GROQ_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    # Email Settings (Gmail)
    EMAIL_FROM: str = ""
    EMAIL_PASSWORD: str = ""

    # Vector Store & Files
    CHROMA_DB_PATH: str = "./db/chroma"
    UPLOAD_DIR: str = "./uploads"
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    RETRIEVER_K: int = 4

    class Config:
        env_file = ".env"


settings = Settings()
