from fastapi import HTTPException

from ..models.schemas import tournament_out
from ..models.tournament import Tournament
from ..services import tournament_service


def list_all(db) -> list[dict]:
    return [tournament_out(t) for t in tournament_service.list_tournaments(db)]


def get_one(db, tournament_id: int) -> dict:
    t = db.get(Tournament, tournament_id)
    if not t:
        raise HTTPException(404, "Torneio não encontrado.")
    return tournament_out(t, detail=True)


def register(db, user, tournament_id: int) -> dict:
    mem = user.membership
    if not mem or not mem.is_captain:
        raise HTTPException(403, "Apenas o capitão pode inscrever o time.")
    t = db.get(Tournament, tournament_id)
    if not t:
        raise HTTPException(404, "Torneio não encontrado.")
    try:
        tournament_service.register_team(db, t, mem.team)
    except ValueError as e:
        db.rollback()
        raise HTTPException(400, str(e))
    db.commit()
    db.refresh(t)
    return tournament_out(t, detail=True)
