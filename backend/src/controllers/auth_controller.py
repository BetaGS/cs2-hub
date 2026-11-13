from fastapi import HTTPException
from sqlalchemy import select

from ..config.security import create_token, hash_password, verify_password
from ..models.schemas import LoginIn, ProfileUpdateIn, RegisterIn, player_out
from ..models.user import ROLES, User


def register(db, data: RegisterIn) -> dict:
    if db.scalar(select(User.id).where(User.email == data.email.lower())):
        raise HTTPException(409, "E-mail já cadastrado.")
    if db.scalar(select(User.id).where(User.nickname == data.nickname)):
        raise HTTPException(409, "Nickname já está em uso.")
    if data.steamId64 and db.scalar(select(User.id).where(User.steam_id64 == data.steamId64)):
        raise HTTPException(409, "Este SteamID64 já está vinculado a outra conta.")
    user = User(email=data.email.lower(), password_hash=hash_password(data.password), nickname=data.nickname,
                steam_id64=data.steamId64, main_role=data.role)
    db.add(user)
    db.commit()
    return {"token": create_token(user.id), "user": player_out(db, user, include_history=False)}


def login(db, data: LoginIn) -> dict:
    user = db.scalar(select(User).where(User.email == data.email.lower()))
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "E-mail ou senha incorretos.")
    return {"token": create_token(user.id), "user": player_out(db, user, include_history=False)}


def get_player(db, player_id: int) -> dict:
    user = db.get(User, player_id)
    if not user:
        raise HTTPException(404, "Jogador não encontrado.")
    return player_out(db, user)


def update_profile(db, user: User, data: ProfileUpdateIn) -> dict:
    if data.nickname and data.nickname != user.nickname:
        if db.scalar(select(User.id).where(User.nickname == data.nickname)):
            raise HTTPException(409, "Nickname já está em uso.")
        user.nickname = data.nickname
    if data.role:
        if data.role not in ROLES:
            raise HTTPException(400, "Função inválida.")
        user.main_role = data.role
    if data.lookingForTeam is not None:
        user.looking_for_team = data.lookingForTeam
    db.commit()
    return player_out(db, user)
