"""Motor de chaveamento automático (puro). Gera especificações de partidas
(dicts) que o controller grava no banco, e calcula classificações/pareamentos.

Formatos: GSL (grupos de 4), Pontos Corridos (grupos, todos contra todos),
Sistema Suíço (3 vitórias / 3 derrotas) e Playoffs (eliminação simples).
"""


# ------------------------------------------------------------------ playoffs
def seed_order(size: int) -> list[int]:
    """Ordem clássica de chaveamento: 8 -> [1,8,4,5,2,7,3,6]."""
    order = [1]
    while len(order) < size:
        n = len(order) * 2 + 1
        order = [x for s in order for x in (s, n - s)]
    return order


def _round_label(total_rounds: int, rnd: int) -> str:
    left = total_rounds - rnd
    return {0: "Grande Final", 1: "Semifinal", 2: "Quartas de Final", 3: "Oitavas de Final"}.get(
        left, f"Rodada {rnd}")


def _spec(key, stage, rnd, pos, label, group, bo, a=None, b=None,
          nxt=None, slot=None, lnxt=None, lslot=None) -> dict:
    return {"key": key, "stage": stage, "round_number": rnd, "position": pos, "round_label": label,
            "group_name": group, "bo": bo, "team1": a, "team2": b, "next_key": nxt, "next_slot": slot,
            "loser_next_key": lnxt, "loser_next_slot": lslot}


def build_single_elim(team_ids: list[int], bo: int = 3, bo_final: int = 5) -> list[dict]:
    """team_ids ordenados por seed (melhor primeiro). Byes são resolvidos na hora."""
    n = len(team_ids)
    if n < 2:
        raise ValueError("Playoffs precisam de pelo menos 2 times.")
    size = 1
    while size < n:
        size *= 2
    seeds = {i + 1: t for i, t in enumerate(team_ids)}
    total_rounds = size.bit_length() - 1

    specs: dict[str, dict] = {}
    for rnd in range(1, total_rounds + 1):
        for pos in range(1, size // (2 ** rnd) + 1):
            nxt = f"P{rnd + 1}-{(pos + 1) // 2}" if rnd < total_rounds else None
            specs[f"P{rnd}-{pos}"] = _spec(
                f"P{rnd}-{pos}", "PLAYOFF", rnd, pos, _round_label(total_rounds, rnd), None,
                bo_final if rnd == total_rounds else bo,
                nxt=nxt, slot=(1 if pos % 2 else 2) if nxt else None)
    order = seed_order(size)
    for i in range(0, size, 2):
        s = specs[f"P1-{i // 2 + 1}"]
        s["team1"], s["team2"] = seeds.get(order[i]), seeds.get(order[i + 1])

    for key in [k for k, s in specs.items() if s["round_number"] == 1]:  # byes
        s = specs[key]
        if (s["team1"] is None) != (s["team2"] is None):
            specs[s["next_key"]][f"team{s['next_slot']}"] = s["team1"] or s["team2"]
            del specs[key]
    return list(specs.values())


# ----------------------------------------------------------------------- GSL
def build_gsl_group(team_ids: list[int], group: str, bo: int = 3) -> list[dict]:
    """Grupo GSL de 4 times (1º e 2º classificam): 1x4 e 2x3 -> Vencedores / Eliminação -> Decisiva."""
    if len(team_ids) != 4:
        raise ValueError("Grupo GSL exige exatamente 4 times.")
    t1, t2, t3, t4 = team_ids
    k = lambda x: f"{group}-{x}"  # noqa: E731
    return [
        _spec(k("O1"), "GROUP", 1, 1, "Abertura", group, bo, t1, t4, k("W"), 1, k("L"), 1),
        _spec(k("O2"), "GROUP", 1, 2, "Abertura", group, bo, t2, t3, k("W"), 2, k("L"), 2),
        _spec(k("W"), "GROUP", 2, 1, "Final dos Vencedores", group, bo, lnxt=k("D"), lslot=1),
        _spec(k("L"), "GROUP", 2, 2, "Eliminação", group, bo, nxt=k("D"), slot=2),
        _spec(k("D"), "GROUP", 3, 1, "Decisiva", group, bo),
    ]


def gsl_qualifiers(w_match: dict | None, d_match: dict | None) -> list[int] | None:
    """1º = vencedor da final dos vencedores; 2º = vencedor da decisiva."""
    if not w_match or not d_match or not w_match.get("winner_team_id") or not d_match.get("winner_team_id"):
        return None
    return [w_match["winner_team_id"], d_match["winner_team_id"]]


# ------------------------------------------------------------- pontos corridos
def split_groups(team_ids: list[int], n_groups: int) -> dict[str, list[int]]:
    """Distribuição em serpente (snake) por seed."""
    names = [chr(65 + i) for i in range(n_groups)]
    groups = {n: [] for n in names}
    for i, t in enumerate(team_ids):
        row, col = divmod(i, n_groups)
        groups[names[col if row % 2 == 0 else n_groups - 1 - col]].append(t)
    return groups


def build_round_robin(team_ids: list[int], group: str, bo: int = 3) -> list[dict]:
    """Método do círculo: todos contra todos."""
    teams = list(team_ids)
    if len(teams) % 2:
        teams.append(None)
    n, specs = len(teams), []
    for rnd in range(1, n):
        for i in range(n // 2):
            a, b = teams[i], teams[n - 1 - i]
            if a is not None and b is not None:
                specs.append(_spec(f"{group}-R{rnd}-{i + 1}", "GROUP", rnd, i + 1, f"Rodada {rnd}", group, bo, a, b))
        teams = [teams[0]] + [teams[-1]] + teams[1:-1]
    return specs


def standings(team_ids: list[int], finished: list[dict]) -> list[dict]:
    """finished: dicts com team1_id, team2_id, team1_score, team2_score, winner_team_id, map_results."""
    table = {t: {"team_id": t, "played": 0, "wins": 0, "losses": 0, "points": 0, "map_diff": 0, "round_diff": 0}
             for t in team_ids}
    for m in finished:
        a, b, w = m["team1_id"], m["team2_id"], m.get("winner_team_id")
        if a not in table or b not in table or not w:
            continue
        for t, s_for, s_against in ((a, m["team1_score"], m["team2_score"]), (b, m["team2_score"], m["team1_score"])):
            row = table[t]
            row["played"] += 1
            row["map_diff"] += s_for - s_against
            row["wins" if w == t else "losses"] += 1
            row["points"] += 3 if w == t else 0
        for r in m.get("map_results") or []:
            d = r["team1Rounds"] - r["team2Rounds"]
            table[a]["round_diff"] += d
            table[b]["round_diff"] -= d
    order = {t: i for i, t in enumerate(team_ids)}
    return sorted(table.values(), key=lambda r: (-r["points"], -r["map_diff"], -r["round_diff"], order[r["team_id"]]))


# --------------------------------------------------------------------- suíço
def swiss_record(team_ids: list[int], finished: list[dict]) -> dict[int, dict]:
    rec = {t: {"wins": 0, "losses": 0} for t in team_ids}
    for m in finished:
        w = m.get("winner_team_id")
        if not w:
            continue
        loser = m["team2_id"] if w == m["team1_id"] else m["team1_id"]
        if w in rec:
            rec[w]["wins"] += 1
        if loser in rec:
            rec[loser]["losses"] += 1
    return rec


def _pair(group: list[int], played: set) -> list[tuple[int, int]] | None:
    """Maior seed x menor seed sem repetir confronto (backtracking)."""
    if not group:
        return []
    first = group[0]
    for i in range(len(group) - 1, 0, -1):
        other = group[i]
        if frozenset((first, other)) in played:
            continue
        sub = _pair(group[1:i] + group[i + 1:], played)
        if sub is not None:
            return [(first, other)] + sub
    return None


def swiss_next_round(team_ids: list[int], finished: list[dict], round_number: int,
                     bo: int = 1, bo_decisive: int = 3, wins_to_qualify: int = 3) -> list[dict]:
    """Gera a próxima rodada suíça. Retorna [] quando não restam times ativos."""
    rec = swiss_record(team_ids, finished)
    played = {frozenset((m["team1_id"], m["team2_id"])) for m in finished}
    active = [t for t in team_ids if rec[t]["wins"] < wins_to_qualify and rec[t]["losses"] < wins_to_qualify]
    if len(active) < 2:
        return []
    seed = {t: i for i, t in enumerate(team_ids)}

    if round_number == 1:
        half = len(active) // 2
        pairs = [(active[i], active[i + half]) for i in range(half)]
    else:
        buckets: dict[tuple, list[int]] = {}
        for t in active:
            buckets.setdefault((rec[t]["wins"], rec[t]["losses"]), []).append(t)
        pairs, carry = [], []
        for key in sorted(buckets, key=lambda k: (-k[0], k[1])):
            grp = sorted(carry + buckets[key], key=seed.get)
            carry = [grp.pop()] if len(grp) % 2 else []   # sobra desce para o grupo seguinte
            got = _pair(grp, played)
            if got is None:                                # sem pareamento inédito: permite repetir
                got = [(grp[i], grp[-1 - i]) for i in range(len(grp) // 2)]
            pairs += got
            played |= {frozenset(p) for p in got}
    specs = []
    for pos, (a, b) in enumerate(pairs, start=1):
        decisive = any(rec[t]["wins"] == wins_to_qualify - 1 or rec[t]["losses"] == wins_to_qualify - 1
                       for t in (a, b))
        specs.append(_spec(f"S{round_number}-{pos}", "SWISS", round_number, pos, f"Rodada {round_number}",
                           None, bo_decisive if decisive else bo, a, b))
    return specs


def swiss_qualified(team_ids: list[int], finished: list[dict], wins_to_qualify: int = 3) -> list[int]:
    rec = swiss_record(team_ids, finished)
    seed = {t: i for i, t in enumerate(team_ids)}
    q = [t for t in team_ids if rec[t]["wins"] >= wins_to_qualify]
    return sorted(q, key=lambda t: (rec[t]["losses"], seed[t]))


# --------------------------------------------------- seeds dos playoffs a partir de grupos
def playoff_seeds_from_groups(group_order: dict[str, list[int]], per_group: int) -> list[int]:
    """[A1,B1,A2,B2,...] -> no chaveamento clássico o 1º de um grupo enfrenta o último do outro."""
    seeds = []
    for pos in range(per_group):
        for g in sorted(group_order):
            if pos < len(group_order[g]):
                seeds.append(group_order[g][pos])
    return seeds
