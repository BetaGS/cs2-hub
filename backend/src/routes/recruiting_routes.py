from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..config.database import get_db
from ..config.security import current_user
from ..controllers import recruiting_controller as ctrl
from ..models.schemas import InviteIn, RequestIn, RespondIn

router = APIRouter(prefix="/api/recruiting", tags=["recruiting"])


@router.get("/players")
def lft(role: str | None = None, db: Session = Depends(get_db)):
    return ctrl.list_players(db, role)


@router.get("/teams")
def lfp(role: str | None = None, db: Session = Depends(get_db)):
    return ctrl.list_teams(db, role)


@router.get("/inbox")
def inbox(user=Depends(current_user), db: Session = Depends(get_db)):
    return ctrl.inbox(db, user)


@router.post("/requests", status_code=201)
def request_join(data: RequestIn, user=Depends(current_user), db: Session = Depends(get_db)):
    return ctrl.send_request(db, user, data)


@router.post("/invites", status_code=201)
def invite(data: InviteIn, user=Depends(current_user), db: Session = Depends(get_db)):
    return ctrl.send_invite(db, user, data)


@router.post("/{item_id}/respond")
def respond(item_id: int, data: RespondIn, user=Depends(current_user), db: Session = Depends(get_db)):
    return ctrl.respond(db, user, item_id, data)


@router.delete("/{item_id}")
def cancel(item_id: int, user=Depends(current_user), db: Session = Depends(get_db)):
    return ctrl.cancel(db, user, item_id)
