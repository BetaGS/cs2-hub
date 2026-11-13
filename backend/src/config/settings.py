import os
from dataclasses import dataclass, field
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]  # backend/


def _load_env_file():
    env = BASE_DIR / ".env"
    if env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())


_load_env_file()


@dataclass
class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "mysql+pymysql://root:senha@localhost:3306/cs2hub")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-secret-troque-em-producao")
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))
    UPLOAD_DIR: Path = field(default_factory=lambda: BASE_DIR / os.getenv("UPLOAD_DIR", "uploads"))
    PUBLIC_URL: str = os.getenv("PUBLIC_URL", "http://localhost:8000")
    CORS_ORIGINS: list = field(default_factory=lambda: os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","))
    TESSERACT_CMD: str = os.getenv("TESSERACT_CMD", "")
    MAX_UPLOAD_MB: int = 8


settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
