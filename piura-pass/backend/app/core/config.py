import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "PIURA PASS - Sistema Inteligente de Peaje"
    VERSION: str = "1.0.0-phase1"
    API_V1_STR: str = "/api/v1"
    
    # Base paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    MODELS_DIR: Path = BASE_DIR / "models"
    MODEL_PATH: str = str(MODELS_DIR / "yolov8n.pt")
    
    # ML settings
    CONFIDENCE_THRESHOLD: float = 0.35
    DUPLICATE_IOU_THRESHOLD: float = 0.40
    DUPLICATE_COOLDOWN_SECONDS: float = 6.0
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "*",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
