"""Resultado por print: OCR -> pendência -> confirmação do capitão adversário -> estatísticas e avanço."""
from datetime import datetime

from sqlalchemy import delete

from ..models.match import MatchPlayerStat
from ..models.user import User
from . import ocr_service, tournament_service, veto_service


def match_roster(match) -> list[dict]:
    """Jogadores inscritos dos dois times (snapshot do lineup na inscrição)."""
    roster = []
    for reg in match.tournament.registrations:
        slot = match.slot_of(reg.team_id)
        if slot:
            roster += [{"user_id": p["userId"], "nickname": p["nickname"], "slot": slot} for p in reg.lineup]
    return roster


def process_screenshot(match, image_path: str, map_number: int) -> dict:
    parsed = ocr_service.parse_scoreboard_text(ocr_service.run_ocr(image_path), match_roster(match))
    s = parsed["score"] or {}
    return {"mapNumber": map_number, "teamARounds": s.get("teamA"), "teamBRounds": s.get("teamB"),
            "players": parsed["players"], "confidence": parsed["confidence"], "source": "ocr"}


def submit_pending(db, match, team_id: int, pending: dict, screenshot_url: str | None) -> None:
    if match.status not in ("LIVE", "AWAITING_CONFIRMATION", "DISPUTED"):
        raise ValueError("A partida ainda não está em andamento (conclua o veto primeiro).")
    pending = {**pending, "submittedByTeamId": team_id}
    match.pending_result = pending
    match.submitted_by_team_id = team_id
    if screenshot_url:
        match.screenshot_url = screenshot_url
    match.status = "AWAITING_CONFIRMATION"


def _validate(match, pending: dict) -> tuple[int, int]:
    a, b = pending.get("teamARounds"), pending.get("teamBRounds")
    if a is None or b is None or not ocr_service.valid_score(int(a), int(b)):
        raise ValueError("Placar inválido ou não identificado — corrija manualmente (vencedor precisa de 13+ rounds).")
    n = pending["mapNumber"]
    if n != len(match.map_results or []) + 1:
        raise ValueError(f"O próximo mapa a ser registrado é o {len(match.map_results or []) + 1}.")
    return int(a), int(b)


def confirm_pending(db, match, confirming_team_id: int) -> bool:
    """Capitão ADVERSÁRIO confirma. Retorna True se a série terminou."""
    p = match.pending_result
    if not p or match.status != "AWAITING_CONFIRMATION":
        raise ValueError("Não há resultado aguardando confirmação.")
    if confirming_team_id == match.submitted_by_team_id:
        raise PermissionError("A confirmação deve vir do capitão do time adversário.")
    a, b = _validate(match, p)
    winner = match.team1_id if a > b else match.team2_id
    n = p["mapNumber"]
    maps = veto_service.final_maps([{"step_order": v.step_order, "slot": match.slot_of(v.team_id) if v.team_id else None,
                                     "action": v.action, "map_name": v.map_name, "side": v.side} for v in match.vetoes])
    map_name = maps[n - 1]["map"] if len(maps) >= n else f"Mapa {n}"

    match.map_results = list(match.map_results or []) + [
        {"map": map_name, "team1Rounds": a, "team2Rounds": b, "winnerTeamId": winner}]
    match.team1_score += 1 if winner == match.team1_id else 0
    match.team2_score += 1 if winner == match.team2_id else 0

    db.execute(delete(MatchPlayerStat).where(MatchPlayerStat.match_id == match.id, MatchPlayerStat.map_number == n))
    valid = {r["user_id"]: match.team1_id if r["slot"] == "A" else match.team2_id for r in match_roster(match)}
    for pl in p.get("players", []):
        uid = pl.get("user_id", pl.get("userId"))
        if uid in valid:
            db.add(MatchPlayerStat(match_id=match.id, map_number=n, user_id=uid, team_id=valid[uid],
                                   kills=pl["kills"], deaths=pl["deaths"], assists=pl["assists"],
                                   adr=pl.get("adr", 0), hs_percentage=pl.get("hs_percentage", pl.get("hsPercentage", 0))))
    match.pending_result = None
    need = match.bo // 2 + 1
    if max(match.team1_score, match.team2_score) >= need:
        finish_match(db, match)
        return True
    match.status = "LIVE"
    return False


def dispute_pending(db, match, team_id: int) -> None:
    if match.status != "AWAITING_CONFIRMATION":
        raise ValueError("Não há resultado para contestar.")
    if team_id == match.submitted_by_team_id:
        raise PermissionError("Só o time adversário pode contestar.")
    match.status = "DISPUTED"


def finish_match(db, match) -> None:
    match.winner_team_id = match.team1_id if match.team1_score > match.team2_score else match.team2_id
    match.status, match.finished_at = "FINISHED", datetime.utcnow()
    db.flush()
    stats = db.query(MatchPlayerStat).filter(MatchPlayerStat.match_id == match.id).all()
    per_user: dict[int, dict] = {}
    for s in stats:
        u = per_user.setdefault(s.user_id, {"team": s.team_id, "k": 0, "d": 0, "a": 0, "hs": 0})
        u["k"] += s.kills; u["d"] += s.deaths; u["a"] += s.assists
        u["hs"] += round(s.kills * float(s.hs_percentage) / 100)
    for uid, u in per_user.items():
        user = db.get(User, uid)
        user.matches_played += 1
        user.matches_won += 1 if u["team"] == match.winner_team_id else 0
        user.total_kills += u["k"]; user.total_deaths += u["d"]
        user.total_assists += u["a"]; user.total_hs_kills += u["hs"]
    db.flush()
    tournament_service.after_match_finished(db, match)
