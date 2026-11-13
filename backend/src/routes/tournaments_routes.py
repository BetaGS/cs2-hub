from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..config.database import get_db
from ..config.security import current_user
from ..controllers import tournaments_controller as ctrl
from ..sockets.match_socket import sio

router = APIRouter(prefix="/api/tournaments", tags=["tournaments"])


@router.get("")
def list_all(db: Session = Depends(get_db)):
    return ctrl.list_all(db)


@router.get("/{tournament_id}")
def get_one(tournament_id: int, db: Session = Depends(get_db)):
    return ctrl.get_one(db, tournament_id)


@router.post("/{tournament_id}/register")
async def register(tournament_id: int, user=Depends(current_user), db: Session = Depends(get_db)):
    data = ctrl.register(db, user, tournament_id)
    await sio.emit("bracket_update", {"tournamentId": tournament_id}, room=f"tournament:{tournament_id}")
    return data
