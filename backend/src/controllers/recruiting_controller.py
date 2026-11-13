"""Mercado LFT/LFP. Regra: o jogador só entra no elenco após o capitão aprovar a solicitação
(ou o jogador aceitar o convite do capitão)."""
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import select

from ..config.storage import public_url
from ..models.schemas import InviteIn, RequestIn, RespondIn, team_brief
from ..models.team import Team, TeamInviteRequest, TeamMember
from ..models.user import ROLES, User
from .teams_controller import roster_is_full


def list_players(db, role: str | None = None) -> list[dict]:
    users = db.scalars(select(User).where(User.looking_for_team.is_(True)).order_by(User.level.desc())).all()
    return [{"id": u.id, "nickname": u.nickname, "role": u.main_role, "level": u.level,
             "kdRatio": f"{u.kd_ratio:.2f}", "avatar": public_url(u.avatar_url)}
            for u in users if not u.membership and (not role or u.main_role == role)]


def list_teams(db, role: str | None = None) -> list[dict]:
    teams = db.scalars(select(Team).where(Team.looking_for_players.is_(True))).all()
    return [{**team_brief(t), "description": t.description, "openRoles": t.recruiting_roles or [],
             "members": len(t.members), "captainId": t.captain_id}
            for t in teams if not roster_is_full(t) and (not role or role in (t.recruiting_roles or []))]


def _pending_exists(db, team_id: int, user_id: int, kind: str) -> bool:
    return db.scalar(select(TeamInviteRequest.id).where(
        TeamInviteRequest.team_id == team_id, TeamInviteRequest.user_id == user_id,
        TeamInviteRequest.kind == kind, TeamInviteRequest.status == "PENDING")) is not None


def send_request(db, user: User, data: RequestIn) -> dict:
    """Jogador -> time ('Pedir para Entrar')."""
    if user.membership:
        raise HTTPException(409, "Você já está em um time.")
    team = db.get(Team, data.teamId)
    if not team:
        raise HTTPException(404, "Time não encontrado.")
    if roster_is_full(team):
        raise HTTPException(409, "O elenco deste time está cheio.")
    if data.role and data.role not in ROLES:
        raise HTTPException(400, "Função inválida.")
    if _pending_exists(db, team.id, user.id, "REQUEST"):
        raise HTTPException(409, "Você já tem uma solicitação pendente para este time.")
    db.add(TeamInviteRequest(kind="REQUEST", team_id=team.id, user_id=user.id,
                             tactical_role=data.role or user.main_role, message=data.message))
    db.commit()
    return {"ok": True, "message": "Solicitação enviada! Aguarde a aprovação do capitão."}


def send_invite(db, user: User, data: InviteIn) -> dict:
    """Capitão -> jogador."""
    mem = user.membership
    if not mem or not mem.is_captain:
        raise HTTPException(403, "Apenas capitães podem enviar convites.")
    target = db.get(User, data.userId)
    if not target or target.id == user.id:
        raise HTTPException(404, "Jogador não encontrado.")
    if target.membership:
        raise HTTPException(409, "Este jogador já está em um time.")
    if roster_is_full(mem.team):
        raise HTTPException(409, "Seu elenco está cheio.")
    if _pending_exists(db, mem.team_id, target.id, "INVITE"):
        raise HTTPException(409, "Já existe um convite pendente para este jogador.")
    db.add(TeamInviteRequest(kind="INVITE", team_id=mem.team_id, user_id=target.id,
                             tactical_role=data.role or target.main_role, message=data.message))
    db.commit()
    return {"ok": True, "message": "Convite enviado."}


def _item(r: TeamInviteRequest) -> dict:
    return {"id": r.id, "kind": r.kind, "status": r.status, "role": r.tactical_role, "message": r.message,
            "team": team_brief(r.team),
            "player": {"id": r.user.id, "nickname": r.user.nickname, "role": r.user.main_role,
                       "level": r.user.level, "avatar": public_url(r.user.avatar_url)},
            "createdAt": r.created_at.isoformat() if r.created_at else None}


def inbox(db, user: User) -> dict:
    """Convites recebidos, solicitações enviadas e (se capitão) solicitações recebidas."""
    mine = db.scalars(select(TeamInviteRequest).where(TeamInviteRequest.user_id == user.id,
                                                      TeamInviteRequest.status == "PENDING")).all()
    out = {"invitesReceived": [_item(r) for r in mine if r.kind == "INVITE"],
           "requestsSent": [_item(r) for r in mine if r.kind == "REQUEST"],
           "requestsReceived": [], "invitesSent": []}
    if user.membership and user.membership.is_captain:
        team_rows = db.scalars(select(TeamInviteRequest).where(
            TeamInviteRequest.team_id == user.membership.team_id, TeamInviteRequest.status == "PENDING")).all()
        out["requestsReceived"] = [_item(r) for r in team_rows if r.kind == "REQUEST"]
        out["invitesSent"] = [_item(r) for r in team_rows if r.kind == "INVITE"]
    return out


def respond(db, user: User, item_id: int, data: RespondIn) -> dict:
    r = db.get(TeamInviteRequest, item_id)
    if not r or r.status != "PENDING":
        raise HTTPException(404, "Solicitação não encontrada ou já resolvida.")
    # Quem decide: INVITE -> o jogador convidado | REQUEST -> o capitão do time.
    if r.kind == "INVITE" and r.user_id != user.id:
        raise HTTPException(403, "Somente o jogador convidado pode responder.")
    if r.kind == "REQUEST" and r.team.captain_id != user.id:
        raise HTTPException(403, "Somente o capitão do time pode aprovar solicitações.")

    r.resolved_at = datetime.utcnow()
    if not data.accept:
        r.status = "REJECTED"
        db.commit()
        return {"ok": True, "status": "REJECTED"}

    player = r.user
    if player.membership:
        r.status = "CANCELLED"
        db.commit()
        raise HTTPException(409, "O jogador já entrou em outro time.")
    if roster_is_full(r.team):
        raise HTTPException(409, "O elenco está cheio.")
    starters = sum(m.is_starter for m in r.team.members)
    db.add(TeamMember(team_id=r.team_id, user_id=player.id, tactical_role=r.tactical_role or player.main_role,
                      is_starter=starters < 5))
    r.status = "ACCEPTED"
    player.looking_for_team = False
    for other in db.scalars(select(TeamInviteRequest).where(TeamInviteRequest.user_id == player.id,
                                                            TeamInviteRequest.status == "PENDING",
                                                            TeamInviteRequest.id != r.id)).all():
        other.status, other.resolved_at = "CANCELLED", datetime.utcnow()
    db.commit()
    return {"ok": True, "status": "ACCEPTED"}


def cancel(db, user: User, item_id: int) -> dict:
    r = db.get(TeamInviteRequest, item_id)
    author_ok = r and ((r.kind == "REQUEST" and r.user_id == user.id) or
                       (r.kind == "INVITE" and r.team.captain_id == user.id))
    if not r or r.status != "PENDING" or not author_ok:
        raise HTTPException(404, "Solicitação não encontrada.")
    r.status, r.resolved_at = "CANCELLED", datetime.utcnow()
    db.commit()
    return {"ok": True}
