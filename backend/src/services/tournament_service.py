"""Ciclo de vida do torneio: inscrição -> geração de chaves -> avanço automático -> troféus."""
import random
from datetime import datetime

from sqlalchemy import select

from ..models.match import Match
from ..models.team import Team
from ..models.tournament import Tournament, TournamentRegistration
from . import bracket_service as B
from .trophy_service import award_tournament

PLAYOFF_PER_GROUP = {"GSL": 2, "ROUND_ROBIN": 4}


# ----------------------------------------------------------------- criação
def create_matches(db, t: Tournament, specs: list[dict]) -> dict[str, Match]:
    by_key: dict[str, Match] = {}
    for s in specs:
        m = Match(tournament_id=t.id, stage=s["stage"], round_label=s["round_label"],
                  round_number=s["round_number"], position=s["position"], group_name=s["group_name"],
                  bo=s["bo"], team1_id=s["team1"], team2_id=s["team2"],
                  status="READY" if s["team1"] and s["team2"] else "WAITING_TEAMS", map_results=[])
        db.add(m)
        by_key[s["key"]] = m
    db.flush()
    for s in specs:
        m = by_key[s["key"]]
        if s["next_key"]:
            m.next_match_id, m.next_slot = by_key[s["next_key"]].id, s["next_slot"]
        if s["loser_next_key"]:
            m.loser_next_match_id, m.loser_next_slot = by_key[s["loser_next_key"]].id, s["loser_next_slot"]
    db.flush()
    return by_key


def _team_ids(t: Tournament) -> list[int]:
    return [r.team_id for r in sorted(t.registrations, key=lambda r: r.seed or 0)]


def register_team(db, t: Tournament, team: Team) -> Tournament | None:
    """Inscreve o time. Se lotar, inicia o torneio e abre a próxima sala (fila contínua)."""
    starters = [m for m in team.members if m.is_starter]
    if len(starters) < 5:
        raise ValueError("O time precisa de 5 titulares para se inscrever.")
    if t.status != "REGISTRATION" or len(t.registrations) >= t.max_teams:
        raise ValueError("Inscrições encerradas nesta sala.")
    if any(r.team_id == team.id for r in t.registrations):
        raise ValueError("Seu time já está inscrito.")
    lineup = [{"userId": m.user_id, "nickname": m.user.nickname, "role": m.tactical_role,
               "avatar": m.user.avatar_url} for m in starters[:5]]
    db.add(TournamentRegistration(tournament_id=t.id, team_id=team.id, lineup=lineup))
    db.flush()
    db.refresh(t)
    if len(t.registrations) >= t.max_teams:
        start_tournament(db, t)
        return open_next_room(db, t)
    return None


def open_next_room(db, t: Tournament) -> Tournament:
    n = t.room_number + 1
    base = t.title.rsplit(" #", 1)[0]
    nxt = Tournament(template_id=t.template_id, room_number=n, title=f"{base} #{n}", format=t.format,
                     max_teams=t.max_teams, bo_group=t.bo_group, bo_playoffs=t.bo_playoffs, bo_final=t.bo_final,
                     banner_url=t.banner_url, rules=t.rules, trophy_name=t.trophy_name,
                     trophy_icon=t.trophy_icon, trophy_color=t.trophy_color)
    db.add(nxt)
    db.flush()
    return nxt


def start_tournament(db, t: Tournament) -> None:
    regs = list(t.registrations)
    random.shuffle(regs)                      # sorteio de seeds
    for i, r in enumerate(regs, start=1):
        r.seed = i
    ids = [r.team_id for r in regs]
    t.status, t.started_at = "RUNNING", datetime.utcnow()

    if t.format == "GSL":
        specs = []
        for g, i in zip("AB", range(0, 8, 4)):
            for r in regs[i:i + 4]:
                r.group_name = g
            specs += B.build_gsl_group(ids[i:i + 4], g, t.bo_group)
    elif t.format == "ROUND_ROBIN":
        groups = B.split_groups(ids, 2)
        specs = []
        for g, members in groups.items():
            for r in regs:
                if r.team_id in members:
                    r.group_name = g
            specs += B.build_round_robin(members, g, t.bo_group)
    else:  # SWISS
        specs = B.swiss_next_round(ids, [], 1, bo=t.bo_group or 1, bo_decisive=3)
    create_matches(db, t, specs)
    db.flush()


# ------------------------------------------------------------------ avanço
def _set_slot(db, match_id: int | None, slot: int | None, team_id: int | None) -> None:
    if not match_id or not slot or not team_id:
        return
    nxt = db.get(Match, match_id)
    setattr(nxt, f"team{slot}_id", team_id)
    if nxt.team1_id and nxt.team2_id and nxt.status == "WAITING_TEAMS":
        nxt.status = "READY"


def _dict(m: Match) -> dict:
    return {"team1_id": m.team1_id, "team2_id": m.team2_id, "team1_score": m.team1_score,
            "team2_score": m.team2_score, "winner_team_id": m.winner_team_id, "map_results": m.map_results or []}


def after_match_finished(db, m: Match) -> None:
    """Chamado quando uma partida termina: avança vencedor/perdedor e gera a próxima fase."""
    t = m.tournament
    loser = m.team2_id if m.winner_team_id == m.team1_id else m.team1_id
    _set_slot(db, m.next_match_id, m.next_slot, m.winner_team_id)
    _set_slot(db, m.loser_next_match_id, m.loser_next_slot, loser)
    db.flush()
    db.refresh(t)

    matches = list(t.matches)
    if m.stage == "PLAYOFF":
        final_round = max(x.round_number for x in matches if x.stage == "PLAYOFF")
        if m.round_number == final_round and m.status == "FINISHED":
            finish_tournament(db, t, m.winner_team_id)
        return

    if m.stage == "SWISS":
        if any(x.stage == "SWISS" and x.round_number == m.round_number and x.status != "FINISHED" for x in matches):
            return
        done = [_dict(x) for x in matches if x.stage == "SWISS" and x.status == "FINISHED"]
        nxt = B.swiss_next_round(_team_ids(t), done, m.round_number + 1, bo=t.bo_group or 1, bo_decisive=3)
        if nxt:
            create_matches(db, t, nxt)
        else:
            _build_playoffs(db, t, B.swiss_qualified(_team_ids(t), done))
        return

    # GROUP: só avança quando todos os jogos de grupo terminarem
    group_matches = [x for x in matches if x.stage == "GROUP"]
    if any(x.status != "FINISHED" for x in group_matches) or any(x.stage == "PLAYOFF" for x in matches):
        return
    order: dict[str, list[int]] = {}
    for g in sorted({x.group_name for x in group_matches}):
        gm = [x for x in group_matches if x.group_name == g]
        if t.format == "GSL":
            w = next(x for x in gm if x.round_label == "Final dos Vencedores")
            d = next(x for x in gm if x.round_label == "Decisiva")
            order[g] = B.gsl_qualifiers(_dict(w), _dict(d))
        else:
            ids = [r.team_id for r in t.registrations if r.group_name == g]
            order[g] = [row["team_id"] for row in B.standings(ids, [_dict(x) for x in gm])]
    seeds = B.playoff_seeds_from_groups(order, PLAYOFF_PER_GROUP[t.format])
    _build_playoffs(db, t, seeds)


def _build_playoffs(db, t: Tournament, seeds: list[int]) -> None:
    create_matches(db, t, B.build_single_elim(seeds, t.bo_playoffs, t.bo_final))


def finish_tournament(db, t: Tournament, champion_team_id: int) -> None:
    t.status, t.finished_at, t.champion_team_id = "FINISHED", datetime.utcnow(), champion_team_id
    db.flush()
    award_tournament(db, t, champion_team_id)


def list_tournaments(db) -> list[Tournament]:
    return list(db.scalars(select(Tournament).order_by(Tournament.status.desc(), Tournament.id)).all())
