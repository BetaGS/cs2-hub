"""Schemas de entrada (Pydantic) e serializadores de saída (JSON camelCase para o front)."""
from pydantic import BaseModel, Field, field_validator

from ..config.storage import public_url
from .match import Match, MatchPlayerStat
from .team import Team
from .tournament import FORMAT_LABEL, Tournament
from .trophy import Trophy
from .user import ROLES, User

# ------------------------------------------------------------------ entrada
class RegisterIn(BaseModel):
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=6, max_length=72)
    nickname: str = Field(min_length=3, max_length=32)
    steamId64: str | None = Field(default=None, pattern=r"^\d{17}$")
    role: str = "Rifler"

    @field_validator("role")
    @classmethod
    def _role(cls, v):
        if v not in ROLES:
            raise ValueError("Função inválida.")
        return v


class LoginIn(BaseModel):
    email: str
    password: str


class ProfileUpdateIn(BaseModel):
    nickname: str | None = Field(default=None, min_length=3, max_length=32)
    role: str | None = None
    lookingForTeam: bool | None = None


class TeamCreateIn(BaseModel):
    name: str = Field(min_length=2, max_length=40)
    tag: str = Field(min_length=2, max_length=5)
    description: str | None = Field(default=None, max_length=500)
    logo: str | None = None
    captainRole: str = "IGL"


class TeamUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=40)
    tag: str | None = Field(default=None, min_length=2, max_length=5)
    description: str | None = Field(default=None, max_length=500)
    logo: str | None = None
    lookingForPlayers: bool | None = None
    recruitingRoles: list[str] | None = None


class MemberUpdateIn(BaseModel):
    role: str | None = None
    isStarter: bool | None = None


class RequestIn(BaseModel):          # jogador -> time ("Pedir para Entrar")
    teamId: int
    role: str | None = None
    message: str | None = Field(default=None, max_length=255)


class InviteIn(BaseModel):           # capitão -> jogador
    userId: int
    role: str | None = None
    message: str | None = Field(default=None, max_length=255)


class RespondIn(BaseModel):
    accept: bool


class VetoIn(BaseModel):
    action: str
    map: str | None = None
    side: str | None = None


class ManualPlayer(BaseModel):
    userId: int
    kills: int = Field(ge=0, le=99)
    deaths: int = Field(ge=0, le=99)
    assists: int = Field(ge=0, le=99)
    adr: float = Field(default=0, ge=0, le=300)
    hsPercentage: float = Field(default=0, ge=0, le=100)


class ManualResultIn(BaseModel):
    mapNumber: int = Field(ge=1, le=5)
    teamARounds: int = Field(ge=0, le=60)
    teamBRounds: int = Field(ge=0, le=60)
    players: list[ManualPlayer] = []


# ------------------------------------------------------------------- saída
def date_pt(dt) -> str | None:
    if not dt:
        return None
    meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    return f"{meses[dt.month - 1]} {dt.year}"


def team_brief(team: Team | None) -> dict | None:
    if not team:
        return None
    return {"id": team.id, "name": team.name, "tag": team.tag, "logo": public_url(team.logo_url)}


def trophy_out(tr: Trophy) -> dict:
    t = tr.tournament
    return {"id": tr.id, "kind": tr.kind, "tournamentId": t.id, "tournament": t.title,
            "format": FORMAT_LABEL.get(t.format, t.format), "date": date_pt(tr.awarded_at),
            "trophyName": t.trophy_name, "icon": t.trophy_icon, "color": t.trophy_color}


def member_out(m, mvp_count: int = 0) -> dict:
    u = m.user
    return {"id": m.id, "userId": u.id, "nickname": u.nickname, "role": m.tactical_role,
            "isCaptain": m.is_captain, "isStarter": m.is_starter, "avatar": public_url(u.avatar_url),
            "level": u.level, "kdRatio": u.kd_ratio, "mvpCount": mvp_count}


def team_out(db, team: Team) -> dict:
    from sqlalchemy import func, or_, select
    trophies = db.scalars(select(Trophy).where(Trophy.team_id == team.id, Trophy.user_id.is_(None),
                                               Trophy.kind == "CHAMPION").order_by(Trophy.awarded_at.desc())).all()
    played = db.scalars(select(Match).where(Match.status == "FINISHED",
                                            or_(Match.team1_id == team.id, Match.team2_id == team.id))).all()
    wins = sum(1 for m in played if m.winner_team_id == team.id)
    mvp_rows = db.execute(select(Trophy.user_id, func.count()).where(
        Trophy.kind == "MVP", Trophy.user_id.in_([m.user_id for m in team.members] or [0]))
        .group_by(Trophy.user_id)).all()
    mvps = {uid: c for uid, c in mvp_rows}
    return {
        "id": team.id, "name": team.name, "tag": team.tag, "logo": public_url(team.logo_url),
        "description": team.description, "captainId": team.captain_id,
        "lookingForPlayers": team.looking_for_players, "openRoles": team.recruiting_roles or [],
        "stats": {"matches": len(played), "wins": wins, "titles": len(trophies),
                  "winRate": f"{100 * wins / len(played):.1f}%" if played else "0%"},
        "trophies": [trophy_out(t) for t in trophies],
        "members": [member_out(m, mvps.get(m.user_id, 0)) for m in
                    sorted(team.members, key=lambda x: (not x.is_captain, not x.is_starter, x.id))],
    }


def player_out(db, u: User, include_history: bool = True) -> dict:
    from sqlalchemy import select
    mem = u.membership
    trophies = db.scalars(select(Trophy).where(Trophy.user_id == u.id, Trophy.kind == "CHAMPION")
                          .order_by(Trophy.awarded_at.desc())).all()
    mvps = db.scalars(select(Trophy).where(Trophy.user_id == u.id, Trophy.kind == "MVP")
                      .order_by(Trophy.awarded_at.desc())).all()
    out = {
        "id": u.id, "nickname": u.nickname, "steamId64": u.steam_id64, "avatar": public_url(u.avatar_url),
        "role": u.main_role, "level": u.level, "lookingForTeam": u.looking_for_team,
        "team": team_brief(mem.team) if mem else None, "isCaptain": bool(mem and mem.is_captain),
        "stats": {"matches": u.matches_played, "winRate": f"{u.win_rate}%", "kdRatio": f"{u.kd_ratio:.2f}",
                  "hsPercentage": f"{u.hs_percentage}%"},
        "trophies": [trophy_out(t) for t in trophies],
        "mvps": [trophy_out(t) for t in mvps],
        "matchHistory": [],
    }
    if include_history:
        rows = db.execute(select(MatchPlayerStat, Match).join(Match, Match.id == MatchPlayerStat.match_id)
                          .where(MatchPlayerStat.user_id == u.id).order_by(Match.id.desc(),
                                                                          MatchPlayerStat.map_number.desc()).limit(10)).all()
        for st, m in rows:
            mr = (m.map_results or [])
            res = mr[st.map_number - 1] if len(mr) >= st.map_number else None
            mine, theirs = (None, None)
            if res:
                a, b = res["team1Rounds"], res["team2Rounds"]
                mine, theirs = (a, b) if st.team_id == m.team1_id else (b, a)
            out["matchHistory"].append({
                "id": st.id, "tournament": m.tournament.title,
                "format": FORMAT_LABEL.get(m.tournament.format, ""), "map": res["map"] if res else f"Mapa {st.map_number}",
                "score": f"{mine} - {theirs}" if res else "-",
                "result": "Vitória" if res and mine > theirs else "Derrota",
                "kda": f"{st.kills} / {st.deaths} / {st.assists}",
                "date": m.finished_at.strftime("%d/%m %H:%M") if m.finished_at else ""})
    return out


def registration_out(r) -> dict:
    return {"teamId": r.team_id, "name": r.team.name, "tag": r.team.tag, "logo": public_url(r.team.logo_url),
            "seed": r.seed, "group": r.group_name,
            "lineup": [{**p, "avatar": public_url(p.get("avatar"))} for p in r.lineup]}


def tournament_out(t: Tournament, detail: bool = False) -> dict:
    out = {
        "id": t.id, "title": t.title, "templateId": t.template_id, "roomNumber": t.room_number,
        "format": t.format, "type": FORMAT_LABEL.get(t.format, t.format),
        "status": {"REGISTRATION": "Inscrições Abertas", "RUNNING": "Em Andamento", "FINISHED": "Finalizado"}[t.status],
        "statusCode": t.status, "currentTeams": len(t.registrations), "maxTeams": t.max_teams,
        "banner": t.banner_url, "rules": t.rules,
        "startDate": "Em jogo agora" if t.status == "RUNNING" else "Encerrado" if t.status == "FINISHED" else "Inicia ao lotar",
        "trophy": {"name": t.trophy_name, "icon": t.trophy_icon, "color": t.trophy_color},
        "championTeamId": t.champion_team_id,
    }
    if detail:
        out["registrations"] = [registration_out(r) for r in t.registrations]
        out["matches"] = [match_out(m) for m in sorted(t.matches, key=lambda m: (m.stage, m.round_number, m.position))]
    return out


def match_out(m: Match) -> dict:
    from ..services.veto_service import final_maps
    rows = [{"step_order": v.step_order, "slot": m.slot_of(v.team_id) if v.team_id else None,
             "action": v.action, "map_name": v.map_name, "side": v.side} for v in m.vetoes]
    return {
        "id": m.id, "tournamentId": m.tournament_id, "stage": m.stage, "roundLabel": m.round_label,
        "roundNumber": m.round_number, "position": m.position, "groupName": m.group_name, "bo": m.bo,
        "status": m.status, "team1": team_brief(m.team1), "team2": team_brief(m.team2),
        "score1": m.team1_score, "score2": m.team2_score, "winnerId": m.winner_team_id,
        "mapResults": m.map_results or [], "maps": final_maps(rows),
        "screenshot": public_url(m.screenshot_url), "pendingResult": m.pending_result,
        "finishedAt": m.finished_at.isoformat() if m.finished_at else None,
    }
