from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Groq
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    # ChromaDB
    chroma_persist_dir: str = "./chroma_data"
    chroma_collection_name: str = "career_docs"

    # Redis
    redis_url: str = ""
    redis_ttl_seconds: int = 86400  # 24 hours

    # Embedding
    embedding_model: str = "all-MiniLM-L6-v2"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # Retrieval
    top_k: int = 5

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
