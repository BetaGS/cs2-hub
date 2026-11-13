"""Entrega automática de troféus ao fim da Grande Final (time + cada jogador + MVP)."""
from sqlalchemy import select

from ..models.match import Match, MatchPlayerStat
from ..models.trophy import Trophy


def _exists(db, **kw) -> bool:
    q = select(Trophy.id).where(Trophy.tournament_id == kw["tournament_id"], Trophy.kind == kw["kind"],
                                Trophy.team_id == kw.get("team_id"),
                                Trophy.user_id.is_(None) if kw.get("user_id") is None else Trophy.user_id == kw["user_id"])
    return db.scalar(q) is not None


def pick_mvp(db, tournament, champion_team_id: int) -> int | None:
    """MVP = jogador do campeão com melhor desempenho no torneio (K/D + ADR/100 + HS%/500)."""
    rows = db.scalars(select(MatchPlayerStat).join(Match, Match.id == MatchPlayerStat.match_id)
                      .where(Match.tournament_id == tournament.id,
                             MatchPlayerStat.team_id == champion_team_id)).all()
    agg: dict[int, dict] = {}
    for r in rows:
        a = agg.setdefault(r.user_id, {"k": 0, "d": 0, "adr": 0.0, "hs": 0.0, "n": 0})
        a["k"] += r.kills; a["d"] += r.deaths; a["adr"] += float(r.adr); a["hs"] += float(r.hs_percentage); a["n"] += 1
    if not agg:
        return None
    score = lambda a: (a["k"] / max(1, a["d"])) + (a["adr"] / a["n"]) / 100 + (a["hs"] / a["n"]) / 500  # noqa: E731
    return max(agg, key=lambda uid: score(agg[uid]))


def award_tournament(db, tournament, champion_team_id: int) -> None:
    reg = next((r for r in tournament.registrations if r.team_id == champion_team_id), None)
    if not _exists(db, tournament_id=tournament.id, kind="CHAMPION", team_id=champion_team_id):
        db.add(Trophy(tournament_id=tournament.id, kind="CHAMPION", team_id=champion_team_id))
    for p in (reg.lineup if reg else []):
        if not _exists(db, tournament_id=tournament.id, kind="CHAMPION", team_id=champion_team_id, user_id=p["userId"]):
            db.add(Trophy(tournament_id=tournament.id, kind="CHAMPION", team_id=champion_team_id, user_id=p["userId"]))
    mvp = pick_mvp(db, tournament, champion_team_id)
    if mvp:
        tournament.mvp_user_id = mvp
        if not _exists(db, tournament_id=tournament.id, kind="MVP", team_id=champion_team_id, user_id=mvp):
            db.add(Trophy(tournament_id=tournament.id, kind="MVP", team_id=champion_team_id, user_id=mvp))
