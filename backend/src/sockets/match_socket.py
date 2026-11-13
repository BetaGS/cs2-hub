"""Tempo real: Pick/Ban de mapas e atualização de chaves (Socket.IO).

Eventos cliente -> servidor:  join_match {matchId} | veto_action {matchId, action, map?, side?} | join_tournament {tournamentId}
Eventos servidor -> cliente:  match_state (estado completo) | veto_error {message} | bracket_update {tournamentId}
Conexão: io(URL, { auth: { token } }). Sem token o usuário entra como espectador (só leitura).
"""
import socketio
from fastapi import HTTPException
from starlette.concurrency import run_in_threadpool

from ..config.database import SessionLocal
from ..config.security import decode_token
from ..config.settings import settings
from ..controllers import matches_controller
from ..models.schemas import VetoIn
from ..models.user import User

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins=settings.CORS_ORIGINS)


async def broadcast(state: dict) -> None:
    """Envia o estado atualizado da partida a todos na sala e avisa a página do torneio."""
    m = state["match"]
    await sio.emit("match_state", state, room=f"match:{m['id']}")
    await sio.emit("bracket_update", {"tournamentId": m["tournamentId"]}, room=f"tournament:{m['tournamentId']}")


def _load_state(match_id: int) -> dict:
    with SessionLocal() as db:
        return matches_controller.get_state(db, match_id)


def _do_veto(user_id: int, data: dict) -> dict:
    with SessionLocal() as db:
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(401, "Faça login para participar do veto.")
        payload = VetoIn(action=data.get("action", ""), map=data.get("map"), side=data.get("side"))
        return matches_controller.do_veto(db, user, int(data["matchId"]), payload)


@sio.event
async def connect(sid, environ, auth):
    token = (auth or {}).get("token")
    await sio.save_session(sid, {"user_id": decode_token(token) if token else None})


@sio.event
async def join_match(sid, data):
    await sio.enter_room(sid, f"match:{data['matchId']}")
    try:
        await sio.emit("match_state", await run_in_threadpool(_load_state, int(data["matchId"])), to=sid)
    except HTTPException as e:
        await sio.emit("veto_error", {"message": e.detail}, to=sid)


@sio.event
async def join_tournament(sid, data):
    await sio.enter_room(sid, f"tournament:{data['tournamentId']}")


@sio.event
async def veto_action(sid, data):
    session = await sio.get_session(sid)
    try:
        state = await run_in_threadpool(_do_veto, session.get("user_id"), data)
        await broadcast(state)
    except HTTPException as e:
        await sio.emit("veto_error", {"message": e.detail}, to=sid)
    except Exception as e:  # noqa: BLE001
        await sio.emit("veto_error", {"message": str(e)}, to=sid)
