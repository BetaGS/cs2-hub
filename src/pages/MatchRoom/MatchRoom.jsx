import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Ban, Check, Flag, Hand, Map as MapIcon, Upload } from 'lucide-react';
import { TeamBadge, STATUS_LABEL } from '../../components/MatchCard/MatchCard.jsx';
import { api, createSocket, getToken, useFetch } from '../../api.js';
import { MOCK_MATCH_ROOM } from '../../mockData.js';
import './MatchRoom.css';

const POOL = ['Mirage', 'Inferno', 'Nuke', 'Ancient', 'Anubis', 'Dust2', 'Vertigo'];
const MAP_COLORS = { Mirage: '#d97706', Inferno: '#dc2626', Nuke: '#0ea5e9', Ancient: '#16a34a', Anubis: '#ca8a04', Dust2: '#a16207', Vertigo: '#6366f1' };

// ---- Veto local (modo demonstração) — mesma lógica do back-end (veto_service.py)
function buildSequence(bo) {
  const s = [];
  const add = (slot, action) => s.push({ slot, action });
  if (bo === 1) for (let i = 0; i < 6; i++) add(i % 2 ? 'B' : 'A', 'BAN');
  else {
    add('A', 'BAN'); add('B', 'BAN'); add('A', 'PICK'); add('B', 'SIDE'); add('B', 'PICK'); add('A', 'SIDE');
    if (bo === 5) { add('A', 'PICK'); add('B', 'SIDE'); add('B', 'PICK'); add('A', 'SIDE'); }
    else { add('A', 'BAN'); add('B', 'BAN'); }
  }
  add(null, 'DECIDER'); add('B', 'SIDE');
  return s.map((x, i) => ({ ...x, step_order: i + 1 }));
}
const usedMaps = (h) => h.filter((r) => r.action !== 'SIDE').map((r) => r.map_name);

function localVeto(match, history) {
  const seq = buildSequence(match.bo);
  const tid = (slot) => (slot === 'A' ? match.team1.id : slot === 'B' ? match.team2.id : null);
  const step = seq[history.length];
  return {
    pool: POOL, available: POOL.filter((m) => !usedMaps(history).includes(m)),
    sequence: seq.map((x) => ({ ...x, teamId: tid(x.slot) })),
    history: history.map((r) => ({ ...r, teamId: tid(r.slot) })),
    current: step && step.action !== 'DECIDER' ? { ...step, teamId: tid(step.slot) } : null,
    finished: history.length >= seq.length,
  };
}

function localApply(match, history, slot, action, map, side) {
  const step = buildSequence(match.bo)[history.length];
  const rows = [{ step_order: step.step_order, slot, action, map_name: map, side: side || null }];
  if (action === 'SIDE') {
    const last = [...history].reverse().find((r) => r.action === 'PICK' || r.action === 'DECIDER');
    rows[0].map_name = last.map_name;
  }
  const all = [...history, ...rows];
  const nxt = buildSequence(match.bo)[all.length];
  if (nxt && nxt.action === 'DECIDER') {
    const left = POOL.filter((m) => !usedMaps(all).includes(m));
    rows.push({ step_order: nxt.step_order, slot: null, action: 'DECIDER', map_name: left[0], side: null });
  }
  return [...history, ...rows];
}

export default function MatchRoom({ matchId, user, onNavigate }) {
  const { data, loading, offline } = useFetch(`/api/matches/${matchId}`, MOCK_MATCH_ROOM(matchId));
  const [live, setLive] = useState(null);
  const [localHistory, setLocalHistory] = useState([]);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [mapNumber, setMapNumber] = useState(1);
  const [fix, setFix] = useState(null);
  const socketRef = useRef(null);

  const base = live || data;
  const match = base?.match;
  const notify = (text, type = 'error') => { setToast({ text, type }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    if (offline || !match || !getToken()) return undefined;
    const socket = createSocket();
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('join_match', { matchId: Number(matchId) }));
    socket.on('match_state', (st) => setLive(st));
    socket.on('veto_error', (e) => notify(e.message));
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [offline, match?.id, matchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const veto = useMemo(() => {
    if (!match) return null;
    return offline ? localVeto(match, localHistory) : base.veto;
  }, [match, offline, localHistory, base]);

  if (loading || !match || !veto) {
    return <div className="matchroom-page"><div className="matchroom-wrap"><div className="skeleton" style={{ height: 220 }} /><div className="skeleton" style={{ height: 320 }} /></div></div>;
  }

  const mySlots = offline ? ['A', 'B']
    : [base.captains?.[match.team1?.id] === user?.id && 'A', base.captains?.[match.team2?.id] === user?.id && 'B'].filter(Boolean);
  const myTeamIds = mySlots.map((s) => (s === 'A' ? match.team1.id : match.team2.id));
  const cur = veto.current;
  const myTurn = cur && mySlots.includes(cur.slot);
  const teamOf = (id) => (id === match.team1?.id ? match.team1 : id === match.team2?.id ? match.team2 : null);
  const status = STATUS_LABEL[match.status] || [match.status, ''];

  const act = (action, map, side) => {
    if (!myTurn) return;
    if (offline) { setLocalHistory((h) => localApply(match, h, cur.slot, action, map, side)); return; }
    socketRef.current?.emit('veto_action', { matchId: match.id, action, map, side });
  };

  const rowFor = (m) => veto.history.find((r) => r.map_name === m && r.action !== 'SIDE');
  const sideFor = (m) => veto.history.find((r) => r.map_name === m && r.action === 'SIDE');

  // ---- resultado por print (só com back-end)
  const post = async (path, opts) => {
    setBusy(true);
    try { setLive(await api(`/api/matches/${match.id}${path}`, opts)); }
    catch (err) { notify(err.message); }
    finally { setBusy(false); }
  };
  const upload = (file) => {
    if (!file) return;
    const form = new FormData();
    form.append('screenshot', file);
    form.append('mapNumber', String(mapNumber));
    post('/result', { method: 'POST', form });
  };
  const pending = match.pendingResult;
  const submittedByMe = pending && myTeamIds.includes(pending.submittedByTeamId);
  const nextMap = (match.mapResults?.length || 0) + 1;
  const canSubmit = !offline && myTeamIds.length > 0 && ['LIVE', 'DISPUTED'].includes(match.status);
  const playersOf = (slot) => (pending?.players || []).filter((p) => p.slot === slot);

  return (
    <div className="matchroom-page">
      <div className="matchroom-wrap">
        <button className="btn-back-room" onClick={() => onNavigate('/')}><ArrowLeft size={16} /> Voltar</button>

        <section className="room-header">
          <TeamBadge team={match.team1} size="xl" />
          <div className="room-center">
            <span className="room-round">{match.roundLabel}{match.groupName ? ` • Grupo ${match.groupName}` : ''}</span>
            <div className="room-score">{match.score1} <span>x</span> {match.score2}</div>
            <div className="room-badges"><span className="badge ready">MD{match.bo}</span><span className={`badge ${status[1]}`}>{status[0]}</span></div>
          </div>
          <TeamBadge team={match.team2} size="xl" reverse />
        </section>
        {offline && <p className="demo-note">Modo demonstração: você controla os dois capitães. Conecte o back-end para o veto em tempo real.</p>}

        {/* ===== VETO ===== */}
        <section className="room-card">
          <div className="room-card-head">
            <h2><MapIcon size={18} /> Pick/Ban de Mapas</h2>
            {veto.finished
              ? <span className="badge done">Veto concluído</span>
              : <span className={`turn-banner ${myTurn ? 'mine' : ''}`}>
                  Vez de <b>[{teamOf(cur?.teamId)?.tag}]</b> — {cur?.action === 'BAN' ? 'banir um mapa' : cur?.action === 'PICK' ? 'escolher um mapa' : 'escolher o lado inicial'}
                  {myTurn && ' (sua vez!)'}
                </span>}
          </div>

          {cur?.action === 'SIDE' && myTurn && (
            <div className="side-choice">
              <Hand size={18} /> Escolha o lado inicial:
              <button className="side-ct" onClick={() => act('SIDE', null, 'CT')}>Counter-Terrorist (CT)</button>
              <button className="side-tr" onClick={() => act('SIDE', null, 'TR')}>Terrorist (TR)</button>
            </div>
          )}

          <div className="map-grid">
            {POOL.map((m) => {
              const r = rowFor(m);
              const side = sideFor(m);
              const who = r?.teamId ? teamOf(r.teamId) : null;
              const clickable = myTurn && !r && ['BAN', 'PICK'].includes(cur.action);
              return (
                <button key={m} disabled={!clickable} onClick={() => act(cur.action, m)}
                  className={`map-card ${r ? r.action.toLowerCase() : ''} ${clickable ? 'selectable' : ''}`}
                  style={{ '--mc': MAP_COLORS[m] }}>
                  <span className="map-name">{m}</span>
                  {r && (
                    <span className="map-tag">
                      {r.action === 'BAN' && <><Ban size={14} /> Banido por [{who?.tag}]</>}
                      {r.action === 'PICK' && <><Check size={14} /> Pick de [{who?.tag}]</>}
                      {r.action === 'DECIDER' && <>Decider</>}
                      {side && <small>{teamOf(side.teamId)?.tag} começa {side.side}</small>}
                    </span>
                  )}
                  {!r && clickable && <span className="map-tag hint">{cur.action === 'BAN' ? 'Clique para banir' : 'Clique para escolher'}</span>}
                </button>
              );
            })}
          </div>

          <ol className="veto-timeline">
            {veto.history.map((r) => (
              <li key={r.step_order} className={r.action.toLowerCase()}>
                <b>{r.teamId ? `[${teamOf(r.teamId)?.tag}]` : 'Sistema'}</b>{' '}
                {r.action === 'BAN' && `baniu ${r.map_name}`}
                {r.action === 'PICK' && `escolheu ${r.map_name}`}
                {r.action === 'DECIDER' && `${r.map_name} é o mapa decider`}
                {r.action === 'SIDE' && `escolheu ${r.side} em ${r.map_name}`}
              </li>
            ))}
            {veto.history.length === 0 && <li className="empty">O veto começa com [{match.team1?.tag}].</li>}
          </ol>
        </section>

        {/* ===== RESULTADO ===== */}
        {!offline && veto.finished && (
          <section className="room-card">
            <div className="room-card-head"><h2><Upload size={18} /> Resultado por Print</h2></div>

            {(match.mapResults || []).map((r, i) => (
              <div key={i} className="map-result">
                <b>Mapa {i + 1} — {r.map}</b> <span>{r.team1Rounds} x {r.team2Rounds}</span>
              </div>
            ))}

            {canSubmit && !pending && (
              <div className="upload-box">
                <p>Envie o print do <b>placar final do mapa {nextMap}</b>. O sistema lê o placar e as estatísticas (K/D/A, ADR, HS%) automaticamente.</p>
                <input type="number" min="1" max={match.bo} value={mapNumber} onChange={(e) => setMapNumber(Number(e.target.value))} aria-label="Número do mapa" />
                <label className="btn-upload">
                  <Upload size={16} /> {busy ? 'Processando…' : 'Enviar print'}
                  <input type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={busy} onChange={(e) => upload(e.target.files?.[0])} />
                </label>
              </div>
            )}

            {pending && (
              <div className="pending-box">
                <div className="pending-head">
                  <b>Mapa {pending.mapNumber}:</b>
                  <span className="pending-score">{match.team1?.tag} {pending.teamARounds ?? '?'} x {pending.teamBRounds ?? '?'} {match.team2?.tag}</span>
                  <span className="badge pending">Leitura {Math.round((pending.confidence || 0) * 100)}% • {pending.source === 'manual' ? 'manual' : 'OCR'}</span>
                </div>
                {match.screenshot && <a href={match.screenshot} target="_blank" rel="noreferrer" className="shot-link">Ver print enviado</a>}

                <div className="stats-grid">
                  {['A', 'B'].map((slot) => (
                    <table key={slot} className="stats-table">
                      <thead><tr><th>{(slot === 'A' ? match.team1 : match.team2)?.tag}</th><th>K</th><th>D</th><th>A</th><th>ADR</th><th>HS%</th></tr></thead>
                      <tbody>
                        {playersOf(slot).map((p) => (
                          <tr key={p.user_id}><td>{p.nickname}</td><td>{p.kills}</td><td>{p.deaths}</td><td>{p.assists}</td><td>{p.adr}</td><td>{p.hs_percentage}</td></tr>
                        ))}
                        {playersOf(slot).length === 0 && <tr><td colSpan="6" className="rec-empty">Nenhum jogador identificado.</td></tr>}
                      </tbody>
                    </table>
                  ))}
                </div>

                {match.status === 'AWAITING_CONFIRMATION' && !submittedByMe && myTeamIds.length > 0 && (
                  <div className="pending-actions">
                    <button className="btn-ok" disabled={busy} onClick={() => post('/result/confirm', { method: 'POST' })}><Check size={14} /> Confirmar resultado</button>
                    <button className="btn-no" disabled={busy} onClick={() => post('/result/dispute', { method: 'POST' })}><Flag size={14} /> Contestar</button>
                  </div>
                )}
                {match.status === 'AWAITING_CONFIRMATION' && submittedByMe && (
                  <div className="pending-actions">
                    <span className="hint-text">Aguardando o capitão adversário confirmar.</span>
                    <button className="btn-no" onClick={() => setFix({ mapNumber: pending.mapNumber, a: pending.teamARounds ?? '', b: pending.teamBRounds ?? '' })}>Corrigir placar</button>
                  </div>
                )}
                {fix && (
                  <form className="fix-form" onSubmit={(e) => {
                    e.preventDefault();
                    post('/result', { method: 'PUT', body: { mapNumber: fix.mapNumber, teamARounds: Number(fix.a), teamBRounds: Number(fix.b), players: [] } });
                    setFix(null);
                  }}>
                    <input type="number" value={fix.a} onChange={(e) => setFix({ ...fix, a: e.target.value })} required aria-label={`Rounds ${match.team1?.tag}`} />
                    <span>x</span>
                    <input type="number" value={fix.b} onChange={(e) => setFix({ ...fix, b: e.target.value })} required aria-label={`Rounds ${match.team2?.tag}`} />
                    <button type="submit" className="btn-ok">Salvar</button>
                  </form>
                )}
              </div>
            )}
            {match.status === 'DISPUTED' && <p className="hint-text">Resultado contestado — aguarde a análise da organização ou reenvie o print.</p>}
            {match.status === 'FINISHED' && <p className="hint-text">Partida finalizada. Estatísticas e chaveamento já foram atualizados automaticamente.</p>}
          </section>
        )}
      </div>
      {toast && <div className={`toast ${toast.type}`}>{toast.text}</div>}
    </div>
  );
}
