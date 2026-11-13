from fastapi import HTTPException

from ..models.match import Match, MatchVeto
from ..models.schemas import ManualResultIn, VetoIn, match_out
from ..services import result_service, veto_service


def _match(db, match_id: int) -> Match:
    m = db.get(Match, match_id)
    if not m:
        raise HTTPException(404, "Partida não encontrada.")
    return m


def _captain_team_id(match: Match, user) -> int:
    mem = user.membership
    if not mem or not mem.is_captain or mem.team_id not in (match.team1_id, match.team2_id):
        raise HTTPException(403, "Apenas os capitães dos dois times podem fazer isso.")
    return mem.team_id


def _rows(match: Match) -> list[dict]:
    return [{"step_order": v.step_order, "slot": match.slot_of(v.team_id) if v.team_id else None,
             "action": v.action, "map_name": v.map_name, "side": v.side} for v in match.vetoes]


def state(db, match: Match) -> dict:
    rows = _rows(match)
    step = veto_service.current_step(match.bo, rows) if match.bo in (1, 3, 5) else None
    team_of = lambda slot: (match.team1_id if slot == "A" else match.team2_id) if slot else None  # noqa: E731
    return {
        "match": match_out(match),
        "veto": {
            "pool": veto_service.MAP_POOL,
            "available": veto_service.available_maps(rows),
            "sequence": [{**s, "teamId": team_of(s["slot"])} for s in veto_service.build_sequence(match.bo)],
            "history": [{**r, "teamId": team_of(r["slot"])} for r in rows],
            "current": {**step, "teamId": team_of(step["slot"])} if step and step["action"] != "DECIDER" else None,
            "finished": veto_service.is_finished(match.bo, rows),
        },
        "captains": {str(t.id): t.captain_id for t in (match.team1, match.team2) if t},
        "rosters": {str(reg.team_id): reg.lineup for reg in match.tournament.registrations
                    if reg.team_id in (match.team1_id, match.team2_id)},
    }


def get_state(db, match_id: int) -> dict:
    return state(db, _match(db, match_id))


def do_veto(db, user, match_id: int, data: VetoIn) -> dict:
    m = _match(db, match_id)
    team_id = _captain_team_id(m, user)
    if m.status not in ("READY", "VETO"):
        raise HTTPException(409, "O veto não está disponível para esta partida.")
    rows = _rows(m)
    try:
        new_rows = veto_service.apply_action(m.bo, rows, m.slot_of(team_id), data.action.upper(),
                                             map_name=data.map, side=data.side.upper() if data.side else None)
    except PermissionError as e:
        raise HTTPException(403, str(e))
    except (ValueError, RuntimeError) as e:
        raise HTTPException(400, str(e))
    for r in new_rows:
        tid = (m.team1_id if r["slot"] == "A" else m.team2_id) if r["slot"] else None
        m.vetoes.append(MatchVeto(match_id=m.id, step_order=r["step_order"], team_id=tid, action=r["action"],
                                  map_name=r["map_name"], side=r["side"]))
    m.status = "LIVE" if veto_service.is_finished(m.bo, rows + new_rows) else "VETO"
    db.commit()
    db.refresh(m)
    return state(db, m)


def submit_result(db, user, match_id: int, map_number: int, image_path, image_url) -> dict:
    m = _match(db, match_id)
    team_id = _captain_team_id(m, user)
    try:
        pending = result_service.process_screenshot(m, str(image_path), map_number)
        result_service.submit_pending(db, m, team_id, pending, image_url)
    except ValueError as e:
        raise HTTPException(400, str(e))
    db.commit()
    db.refresh(m)
    return state(db, m)


def correct_result(db, user, match_id: int, data: ManualResultIn) -> dict:
    """O capitão que enviou o print pode corrigir o que o OCR leu (antes da confirmação)."""
    m = _match(db, match_id)
    team_id = _captain_team_id(m, user)
    if m.status != "AWAITING_CONFIRMATION" or m.submitted_by_team_id != team_id:
        raise HTTPException(409, "Só quem enviou o print pode corrigi-lo, enquanto aguarda confirmação.")
    old = m.pending_result or {}
    m.pending_result = {
        "mapNumber": data.mapNumber, "teamARounds": data.teamARounds, "teamBRounds": data.teamBRounds,
        "players": [{"user_id": p.userId, "kills": p.kills, "deaths": p.deaths, "assists": p.assists,
                     "adr": p.adr, "hs_percentage": p.hsPercentage} for p in data.players] or old.get("players", []),
        "confidence": 1.0, "source": "manual", "submittedByTeamId": team_id}
    db.commit()
    return state(db, m)


def confirm(db, user, match_id: int) -> dict:
    m = _match(db, match_id)
    team_id = _captain_team_id(m, user)
    try:
        result_service.confirm_pending(db, m, team_id)
    except PermissionError as e:
        raise HTTPException(403, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))
    db.commit()
    db.refresh(m)
    return state(db, m)


def dispute(db, user, match_id: int) -> dict:
    m = _match(db, match_id)
    team_id = _captain_team_id(m, user)
    try:
        result_service.dispute_pending(db, m, team_id)
    except PermissionError as e:
        raise HTTPException(403, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))
    db.commit()
    return state(db, m)


def list_active(db, limit: int = 8) -> list[dict]:
    """Partidas em destaque (veto/ao vivo/aguardando confirmação/prontas) para a Home."""
    from sqlalchemy import select
    rows = db.scalars(select(Match).where(Match.status.in_(["VETO", "LIVE", "AWAITING_CONFIRMATION", "READY"]))
                      .order_by(Match.id.desc()).limit(limit)).all()
    return [match_out(m) for m in rows]
