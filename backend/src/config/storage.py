"""Upload de imagens (logo do time, avatar, print do placar)."""
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

from .settings import settings

ALLOWED = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}


async def save_image(file: UploadFile, subdir: str) -> tuple[Path, str]:
    """Retorna (caminho_no_disco, url_relativa). Valida tipo e tamanho."""
    ext = ALLOWED.get(file.content_type or "")
    if not ext:
        raise HTTPException(400, "Envie uma imagem PNG, JPG ou WEBP.")
    data = await file.read()
    if len(data) > settings.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(400, f"Imagem maior que {settings.MAX_UPLOAD_MB} MB.")
    folder = settings.UPLOAD_DIR / subdir
    folder.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}{ext}"
    path = folder / name
    path.write_bytes(data)
    return path, f"/uploads/{subdir}/{name}"


def public_url(url: str | None) -> str | None:
    if not url:
        return None
    return settings.PUBLIC_URL + url if url.startswith("/uploads") else url
