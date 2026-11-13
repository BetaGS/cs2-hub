from fastapi import HTTPException
from sqlalchemy import select

from ..models.schemas import MemberUpdateIn, TeamCreateIn, TeamUpdateIn, team_out
from ..models.team import MAX_ROSTER, Team, TeamMember
from ..models.user import ROLES, User


def _team_or_404(db, team_id: int) -> Team:
    team = db.get(Team, team_id)
    if not team:
        raise HTTPException(404, "Time não encontrado.")
    return team


def _captain_only(team: Team, user: User) -> None:
    if team.captain_id != user.id:
        raise HTTPException(403, "Apenas o capitão pode fazer isso.")


def create_team(db, user: User, data: TeamCreateIn) -> dict:
    if user.membership:
        raise HTTPException(409, "Você já faz parte de um time. Saia dele antes de criar outro.")
    tag = data.tag.upper()
    if db.scalar(select(Team.id).where((Team.name == data.name) | (Team.tag == tag))):
        raise HTTPException(409, "Já existe um time com esse nome ou TAG.")
    if data.captainRole not in ROLES:
        raise HTTPException(400, "Função inválida.")
    team = Team(name=data.name, tag=tag, description=data.description, logo_url=data.logo, captain_id=user.id)
    db.add(team)
    db.flush()
    db.add(TeamMember(team_id=team.id, user_id=user.id, tactical_role=data.captainRole, is_captain=True))
    user.looking_for_team = False
    db.commit()
    db.refresh(team)
    return team_out(db, team)


def get_team(db, team_id: int) -> dict:
    return team_out(db, _team_or_404(db, team_id))


def get_team_by_tag(db, tag: str) -> dict:
    team = db.scalar(select(Team).where(Team.tag == tag.upper()))
    if not team:
        raise HTTPException(404, "Time não encontrado.")
    return team_out(db, team)


def my_team(db, user: User) -> dict | None:
    return team_out(db, user.membership.team) if user.membership else None


def update_team(db, user: User, team_id: int, data: TeamUpdateIn) -> dict:
    team = _team_or_404(db, team_id)
    _captain_only(team, user)
    if data.name and data.name != team.name:
        if db.scalar(select(Team.id).where(Team.name == data.name)):
            raise HTTPException(409, "Já existe um time com esse nome.")
        team.name = data.name
    if data.tag and data.tag.upper() != team.tag:
        if db.scalar(select(Team.id).where(Team.tag == data.tag.upper())):
            raise HTTPException(409, "Já existe um time com essa TAG.")
        team.tag = data.tag.upper()
    if data.description is not None:
        team.description = data.description
    if data.logo:
        team.logo_url = data.logo
    if data.lookingForPlayers is not None:
        team.looking_for_players = data.lookingForPlayers
    if data.recruitingRoles is not None:
        team.recruiting_roles = [r for r in data.recruitingRoles if r in ROLES]
    db.commit()
    return team_out(db, team)


def set_logo(db, user: User, team_id: int, url: str) -> dict:
    team = _team_or_404(db, team_id)
    _captain_only(team, user)
    team.logo_url = url
    db.commit()
    return team_out(db, team)


def update_member(db, user: User, team_id: int, member_id: int, data: MemberUpdateIn) -> dict:
    team = _team_or_404(db, team_id)
    _captain_only(team, user)
    m = db.get(TeamMember, member_id)
    if not m or m.team_id != team.id:
        raise HTTPException(404, "Jogador não está no elenco.")
    if data.role:
        if data.role not in ROLES:
            raise HTTPException(400, "Função inválida.")
        m.tactical_role = data.role
    if data.isStarter is not None:
        if data.isStarter and not m.is_starter and sum(x.is_starter for x in team.members) >= 5:
            raise HTTPException(400, "O time já tem 5 titulares.")
        m.is_starter = data.isStarter
    db.commit()
    return team_out(db, team)


def remove_member(db, user: User, team_id: int, member_id: int) -> dict:
    team = _team_or_404(db, team_id)
    _captain_only(team, user)
    m = db.get(TeamMember, member_id)
    if not m or m.team_id != team.id:
        raise HTTPException(404, "Jogador não está no elenco.")
    if m.is_captain:
        raise HTTPException(400, "O capitão não pode ser removido. Transfira a capitania primeiro.")
    db.delete(m)
    db.commit()
    db.refresh(team)
    return team_out(db, team)


def transfer_captain(db, user: User, team_id: int, member_id: int) -> dict:
    team = _team_or_404(db, team_id)
    _captain_only(team, user)
    new = db.get(TeamMember, member_id)
    if not new or new.team_id != team.id:
        raise HTTPException(404, "Jogador não está no elenco.")
    for m in team.members:
        m.is_captain = m.id == new.id
    team.captain_id = new.user_id
    db.commit()
    return team_out(db, team)


def leave_team(db, user: User) -> dict:
    mem = user.membership
    if not mem:
        raise HTTPException(400, "Você não está em nenhum time.")
    team = mem.team
    if mem.is_captain and len(team.members) > 1:
        raise HTTPException(400, "Transfira a capitania antes de sair do time.")
    if mem.is_captain:
        db.delete(team)       # time vazio é dissolvido
    else:
        db.delete(mem)
    db.commit()
    return {"ok": True}


def roster_is_full(team: Team) -> bool:
    return len(team.members) >= MAX_ROSTER
