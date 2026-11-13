from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from ..config.database import get_db
from ..config.security import current_user
from ..config.storage import save_image
from ..controllers import auth_controller as ctrl
from ..models.schemas import LoginIn, ProfileUpdateIn, RegisterIn, player_out

router = APIRouter(prefix="/api/auth", tags=["auth"])
players = APIRouter(prefix="/api/players", tags=["players"])


@router.post("/register", status_code=201)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    return ctrl.register(db, data)


@router.post("/login")
def login(data: LoginIn, db: Session = Depends(get_db)):
    return ctrl.login(db, data)


@router.get("/me")
def me(user=Depends(current_user), db: Session = Depends(get_db)):
    return player_out(db, user)


@router.put("/me")
def update_me(data: ProfileUpdateIn, user=Depends(current_user), db: Session = Depends(get_db)):
    return ctrl.update_profile(db, user, data)


@router.post("/me/avatar")
async def avatar(file: UploadFile = File(...), user=Depends(current_user), db: Session = Depends(get_db)):
    _, url = await save_image(file, "avatars")
    user.avatar_url = url
    db.commit()
    return player_out(db, user)


@players.get("/{player_id}")
def get_player(player_id: int, db: Session = Depends(get_db)):
    return ctrl.get_player(db, player_id)
