from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from ..config.database import get_db
from ..config.security import current_user
from ..config.storage import save_image
from ..controllers import teams_controller as ctrl
from ..models.schemas import MemberUpdateIn, TeamCreateIn, TeamUpdateIn

router = APIRouter(prefix="/api/teams", tags=["teams"])


@router.post("", status_code=201)
def create(data: TeamCreateIn, user=Depends(current_user), db: Session = Depends(get_db)):
    return ctrl.create_team(db, user, data)


@router.get("/me")
def mine(user=Depends(current_user), db: Session = Depends(get_db)):
    return ctrl.my_team(db, user)


@router.post("/leave")
def leave(user=Depends(current_user), db: Session = Depends(get_db)):
    return ctrl.leave_team(db, user)


@router.get("/tag/{tag}")
def by_tag(tag: str, db: Session = Depends(get_db)):
    return ctrl.get_team_by_tag(db, tag)


@router.get("/{team_id:int}")
def get_one(team_id: int, db: Session = Depends(get_db)):
    return ctrl.get_team(db, team_id)


@router.put("/{team_id:int}")
def update(team_id: int, data: TeamUpdateIn, user=Depends(current_user), db: Session = Depends(get_db)):
    return ctrl.update_team(db, user, team_id, data)


@router.post("/{team_id:int}/logo")
async def logo(team_id: int, file: UploadFile = File(...), user=Depends(current_user), db: Session = Depends(get_db)):
    _, url = await save_image(file, "logos")
    return ctrl.set_logo(db, user, team_id, url)


@router.patch("/{team_id:int}/members/{member_id:int}")
def member(team_id: int, member_id: int, data: MemberUpdateIn, user=Depends(current_user), db: Session = Depends(get_db)):
    return ctrl.update_member(db, user, team_id, member_id, data)


@router.delete("/{team_id:int}/members/{member_id:int}")
def kick(team_id: int, member_id: int, user=Depends(current_user), db: Session = Depends(get_db)):
    return ctrl.remove_member(db, user, team_id, member_id)


@router.post("/{team_id:int}/captain/{member_id:int}")
def captain(team_id: int, member_id: int, user=Depends(current_user), db: Session = Depends(get_db)):
    return ctrl.transfer_captain(db, user, team_id, member_id)
