"""Leitura do print do placar final (OCR) + parser de texto (puro e testável).

O OCR roda com pytesseract quando disponível. O resultado NUNCA é definitivo:
o capitão adversário confirma (ou contesta) e o capitão que enviou pode corrigir.
Ajuste COLUMN_ORDER conforme o layout do scoreboard dos seus prints.
"""
import re
from difflib import SequenceMatcher

COLUMN_ORDER = ("kills", "assists", "deaths", "adr", "hs")   # ordem das colunas no scoreboard
_SCORE_RE = re.compile(r"\b(\d{1,2})\s*[-:xX–—]\s*(\d{1,2})\b")
_NUM_RE = re.compile(r"\d+(?:[.,]\d+)?%?")


def run_ocr(image_path: str) -> str:
    """Extrai texto bruto da imagem. Retorna '' se o OCR não estiver disponível."""
    try:
        import pytesseract
        from PIL import Image, ImageOps
        from ..config.settings import settings
        if settings.TESSERACT_CMD:
            pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
        img = ImageOps.autocontrast(Image.open(image_path).convert("L"))
        if img.width < 1800:                      # upscale melhora muito o OCR de HUD
            ratio = 1800 / img.width
            img = img.resize((int(img.width * ratio), int(img.height * ratio)))
        return pytesseract.image_to_string(img, config="--psm 6")
    except Exception:
        return ""


def valid_score(a: int, b: int) -> bool:
    """MR12: vencedor tem >= 13 rounds e não há empate."""
    return a != b and max(a, b) >= 13


def _to_float(token: str) -> float:
    return float(token.replace("%", "").replace(",", "."))


def parse_scoreboard_text(text: str, roster: list[dict]) -> dict:
    """roster: [{"user_id", "nickname", "slot": 'A'|'B'}]. Retorna placar + stats por jogador."""
    score = None
    for m in _SCORE_RE.finditer(text):
        a, b = int(m.group(1)), int(m.group(2))
        if valid_score(a, b):
            score = (a, b)
            break

    players, used, first_slot = [], set(), None
    for line in text.splitlines():
        line = line.strip()
        if len(line) < 4:
            continue
        words = line.split()
        best, best_ratio = None, 0.0
        for r in roster:
            if r["user_id"] in used:
                continue
            n = len(r["nickname"].split())
            ratio = SequenceMatcher(None, " ".join(words[:n]).lower(), r["nickname"].lower()).ratio()
            if ratio > best_ratio:
                best, best_ratio = r, ratio
        if not best or best_ratio < 0.75:
            continue
        rest = " ".join(words[len(best["nickname"].split()):])
        nums = _NUM_RE.findall(rest)
        if len(nums) < 3:
            continue
        stats = {k: _to_float(v) for k, v in zip(COLUMN_ORDER, nums)}
        used.add(best["user_id"])
        first_slot = first_slot or best["slot"]
        players.append({
            "user_id": best["user_id"], "nickname": best["nickname"], "slot": best["slot"],
            "kills": int(stats.get("kills", 0)), "assists": int(stats.get("assists", 0)),
            "deaths": int(stats.get("deaths", 0)), "adr": round(stats.get("adr", 0.0), 1),
            "hs_percentage": round(stats.get("hs", 0.0), 1)})

    result = {"score": None, "players": players, "raw_text": text[:4000]}
    if score:
        # O 1º número do placar pertence ao time exibido no topo do scoreboard.
        a, b = score if (first_slot or "A") == "A" else (score[1], score[0])
        result["score"] = {"teamA": a, "teamB": b}
    result["confidence"] = round(min(1.0, (0.5 if score else 0) + 0.5 * len(players) / max(1, min(10, len(roster)))), 2)
    return result
