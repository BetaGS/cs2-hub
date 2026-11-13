"""Motor de Pick/Ban de mapas (puro, sem dependência de framework/banco).

Slots: 'A' = team1 (começa o veto) e 'B' = team2. A tela da partida e o socket
convertem o slot em team_id. Linhas de veto ("rows") são dicts:
    {"step_order": int, "slot": "A"|"B"|None, "action": "BAN"|"PICK"|"DECIDER"|"SIDE",
     "map_name": str, "side": "CT"|"TR"|None}
"""
MAP_POOL = ["Mirage", "Inferno", "Nuke", "Ancient", "Anubis", "Dust2", "Vertigo"]
SIDES = ("CT", "TR")


def build_sequence(bo: int) -> list[dict]:
    """Sequência de turnos do veto para MD1, MD3 ou MD5 (pool de 7 mapas)."""
    if bo not in (1, 3, 5):
        raise ValueError("Formato inválido: use MD1, MD3 ou MD5.")
    steps = []

    def add(slot, action):
        steps.append({"slot": slot, "action": action})

    if bo == 1:
        for i in range(6):
            add("A" if i % 2 == 0 else "B", "BAN")
    elif bo == 3:
        add("A", "BAN"); add("B", "BAN")
        add("A", "PICK"); add("B", "SIDE")
        add("B", "PICK"); add("A", "SIDE")
        add("A", "BAN"); add("B", "BAN")
    else:  # bo == 5
        add("A", "BAN"); add("B", "BAN")
        add("A", "PICK"); add("B", "SIDE")
        add("B", "PICK"); add("A", "SIDE")
        add("A", "PICK"); add("B", "SIDE")
        add("B", "PICK"); add("A", "SIDE")
    add(None, "DECIDER")      # mapa restante, automático
    add("B", "SIDE")          # time B escolhe o lado do decider
    for i, s in enumerate(steps, start=1):
        s["step_order"] = i
    return steps


def used_maps(rows) -> set[str]:
    return {r["map_name"] for r in rows if r["action"] in ("BAN", "PICK", "DECIDER")}


def available_maps(rows) -> list[str]:
    taken = used_maps(rows)
    return [m for m in MAP_POOL if m not in taken]


def current_step(bo: int, rows) -> dict | None:
    seq = build_sequence(bo)
    done = len(rows)
    return seq[done] if done < len(seq) else None


def is_finished(bo: int, rows) -> bool:
    return len(rows) >= len(build_sequence(bo))


def apply_action(bo: int, rows, slot: str, action: str, map_name: str | None = None,
                 side: str | None = None) -> list[dict]:
    """Valida a jogada e devolve as NOVAS linhas (a jogada + decider automático, se for o caso)."""
    step = current_step(bo, rows)
    if step is None:
        raise ValueError("O veto já foi concluído.")
    if step["slot"] != slot:
        raise PermissionError("Não é a sua vez no veto.")
    if step["action"] != action:
        raise ValueError(f"Ação esperada agora: {step['action']}.")

    new_rows = []
    if action in ("BAN", "PICK"):
        if map_name not in available_maps(rows):
            raise ValueError("Mapa indisponível ou já usado.")
        new_rows.append({"step_order": step["step_order"], "slot": slot, "action": action,
                         "map_name": map_name, "side": None})
    elif action == "SIDE":
        if side not in SIDES:
            raise ValueError("Lado inválido: escolha CT ou TR.")
        new_rows.append({"step_order": step["step_order"], "slot": slot, "action": "SIDE",
                         "map_name": _map_awaiting_side(rows), "side": side})
    else:
        raise ValueError("O mapa decider é definido automaticamente.")

    all_rows = list(rows) + new_rows
    nxt = current_step(bo, all_rows)
    if nxt and nxt["action"] == "DECIDER":
        left = available_maps(all_rows)
        if len(left) != 1:
            raise RuntimeError("Estado de veto inconsistente.")
        new_rows.append({"step_order": nxt["step_order"], "slot": None, "action": "DECIDER",
                         "map_name": left[0], "side": None})
    return new_rows


def _map_awaiting_side(rows) -> str:
    for r in reversed(rows):
        if r["action"] in ("PICK", "DECIDER"):
            return r["map_name"]
    raise ValueError("Nenhum mapa aguardando escolha de lado.")


def final_maps(rows) -> list[dict]:
    """Mapas que serão jogados, na ordem, com quem escolheu e o lado inicial."""
    result = []
    for r in rows:
        if r["action"] in ("PICK", "DECIDER"):
            result.append({"map": r["map_name"], "pickedBy": r["slot"], "sideChosenBy": None, "side": None})
        elif r["action"] == "SIDE":
            for m in result:
                if m["map"] == r["map_name"]:
                    m["sideChosenBy"], m["side"] = r["slot"], r["side"]
    return result
