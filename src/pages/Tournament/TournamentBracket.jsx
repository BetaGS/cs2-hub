import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Crown, Flame, Shield, Star, Swords, Trophy, Users } from 'lucide-react';
import MatchCard, { TeamBadge } from '../../components/MatchCard/MatchCard.jsx';
import { createSocket, useFetch } from '../../api.js';
import { MOCK_TOURNAMENTS, mockTournamentDetail } from '../../mockData.js';
import './TournamentBracket.css';

const ICONS = { trophy: Trophy, crown: Crown, shield: Shield, star: Star, flame: Flame };

const groupBy = (list, keyFn) => list.reduce((acc, item) => {
  const k = keyFn(item);
  (acc[k] = acc[k] || []).push(item);
  return acc;
}, {});

/** Tabela de classificação calculada a partir das partidas finalizadas (3 pts por vitória). */
function buildStandings(teams, matches) {
  const rows = Object.fromEntries(teams.map((t) => [t.teamId, { team: t, played: 0, wins: 0, losses: 0, points: 0, diff: 0 }]));
  matches.filter((m) => m.status === 'FINISHED').forEach((m) => {
    [[m.team1, m.score1, m.score2], [m.team2, m.score2, m.score1]].forEach(([tm, pf, pa]) => {
      const r = tm && rows[tm.id];
      if (!r) return;
      r.played += 1; r.diff += pf - pa;
      if (m.winnerId === tm.id) { r.wins += 1; r.points += 3; } else r.losses += 1;
    });
  });
  return Object.values(rows).sort((a, b) => b.points - a.points || b.diff - a.diff);
}

export default function TournamentBracket({ tournament, onNavigate }) {
  const base = tournament || MOCK_TOURNAMENTS[0];
  const { data, loading, offline, reload } = useFetch(`/api/tournaments/${base.id}`, mockTournamentDetail(base));
  const [tab, setTab] = useState(null);

  useEffect(() => {
    if (offline) return undefined;
    const socket = createSocket();
    socket.on('connect', () => socket.emit('join_tournament', { tournamentId: base.id }));
    socket.on('bracket_update', reload);   // chaves atualizam em tempo real
    return () => socket.disconnect();
  }, [offline, base.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const t = data || base;
  const regs = t.registrations || [];
  const matches = t.matches || [];
  const open = (m) => onNavigate(`/partida/${m.id}`);
  const activeTab = tab || (t.statusCode === 'REGISTRATION' ? 'teams' : 'initial');
  const Icon = ICONS[t.trophy?.icon] || Trophy;
  const champion = regs.find((r) => r.teamId === t.championTeamId);

  const initial = matches.filter((m) => m.stage !== 'PLAYOFF');
  const playoffs = matches.filter((m) => m.stage === 'PLAYOFF');
  const playoffRounds = useMemo(() => groupBy(playoffs, (m) => m.roundNumber), [playoffs]);
  const emptySlots = Math.max(0, (t.maxTeams || 0) - regs.length);

  return (
    <div className="bracket-page">
      <header className="bracket-topbar">
        <button onClick={() => onNavigate('/')} className="btn-back"><ArrowLeft size={18} /><span>Voltar às Filas</span></button>

        <div className="bracket-title-box">
          <span className="live-indicator">● {t.status}</span>
          <h1>{t.title}</h1>
          <p>{t.type} • Torneio gratuito</p>
          <div className="trophy-ident" style={{ '--tc': t.trophy?.color }}>
            <Icon size={16} /> <span>{t.trophy?.name}</span>
          </div>
        </div>

        <div className="bracket-tabs">
          <button className={activeTab === 'teams' ? 'active' : ''} onClick={() => setTab('teams')}>Times ({regs.length}/{t.maxTeams})</button>
          <button className={activeTab === 'initial' ? 'active' : ''} onClick={() => setTab('initial')}>
            {t.format === 'SWISS' ? 'Fase Suíça' : 'Fase de Grupos'}
          </button>
          <button className={activeTab === 'playoffs' ? 'active' : ''} onClick={() => setTab('playoffs')}>Playoffs</button>
        </div>
      </header>

      <main className="bracket-container">
        {offline && <p className="demo-note">Modo demonstração: back-end offline, exibindo dados de exemplo.</p>}
        {loading && <div className="skeleton" style={{ height: 260 }} />}

        {champion && (
          <section className="champion-banner" style={{ '--tc': t.trophy?.color }}>
            <Icon size={34} />
            <div><small>Campeão</small><TeamBadge team={{ ...champion, id: champion.teamId }} size="lg" /></div>
          </section>
        )}

        {/* ===== TIMES INSCRITOS (estilo HLTV) ===== */}
        {activeTab === 'teams' && (
          <section className="bracket-section">
            <div className="section-header"><Users size={20} className="accent-icon" /><h2>Times Inscritos</h2></div>
            <div className="teams-grid">
              {regs.map((r) => (
                <article key={r.teamId} className="reg-card">
                  {r.logo ? <img src={r.logo} alt={`Logo ${r.name}`} className="reg-logo" /> : <div className="reg-logo reg-fallback">{r.tag}</div>}
                  <h3>{r.name}</h3>
                  <span className="reg-tag">[{r.tag}]{r.group ? ` • Grupo ${r.group}` : ''}</span>
                  <ul className="reg-lineup">
                    {r.lineup.map((p) => (
                      <li key={p.userId ?? p.nickname}><b>{p.nickname}</b><span>{p.role}</span></li>
                    ))}
                  </ul>
                </article>
              ))}
              {Array.from({ length: emptySlots }).map((_, i) => (
                <article key={`empty-${i}`} className="reg-card empty"><div className="reg-logo reg-fallback">?</div><h3>Vaga aberta</h3></article>
              ))}
            </div>
          </section>
        )}

        {/* ===== FASE INICIAL ===== */}
        {activeTab === 'initial' && (
          <section className="bracket-section">
            <div className="section-header"><Swords size={20} className="accent-icon" /><h2>{t.format === 'SWISS' ? 'Sistema Suíço' : 'Fase de Grupos'}</h2></div>
            {initial.length === 0 && <p className="empty-note">As partidas serão geradas automaticamente quando as {t.maxTeams} vagas forem preenchidas.</p>}

            {t.format === 'SWISS' ? (
              <div className="swiss-wrapper">
                {Object.entries(groupBy(initial, (m) => m.roundNumber)).map(([round, list]) => (
                  <div key={round} className="swiss-column">
                    <span className="round-label">Rodada {round}</span>
                    {list.map((m) => <MatchCard key={m.id} match={m} onOpen={open} />)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="groups-wrapper">
                {Object.entries(groupBy(initial, (m) => m.groupName)).map(([g, list]) => {
                  const teams = regs.filter((r) => r.group === g);
                  return (
                    <div key={g} className="gsl-group-box">
                      <h3>Grupo {g}</h3>
                      {t.format === 'ROUND_ROBIN' && (
                        <table className="standings-table">
                          <thead><tr><th>Equipe</th><th>J</th><th>V</th><th>D</th><th>SD</th><th>PTS</th></tr></thead>
                          <tbody>
                            {buildStandings(teams, list).map((row, i) => (
                              <tr key={row.team.teamId} className={i === 3 ? 'cutoff-row' : ''}>
                                <td className="team-cell"><span className={`pos-dot ${i < 4 ? 'qual' : 'elim'}`} />
                                  <TeamBadge team={{ ...row.team, id: row.team.teamId }} size="sm" /></td>
                                <td>{row.played}</td><td>{row.wins}</td><td>{row.losses}</td><td>{row.diff > 0 ? `+${row.diff}` : row.diff}</td>
                                <td><strong>{row.points}</strong></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      <div className="group-rounds">
                        {Object.entries(groupBy(list, (m) => m.roundNumber)).map(([round, ms]) => (
                          <div key={round} className="group-round">
                            <span className="sub-label">{t.format === 'GSL' ? ms[0].roundLabel : `Rodada ${round}`}</span>
                            {ms.map((m) => <MatchCard key={m.id} match={m} onOpen={open} compact />)}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ===== PLAYOFFS ===== */}
        {activeTab === 'playoffs' && (
          <section className="bracket-section">
            <div className="section-header"><Trophy size={20} className="accent-icon" /><h2>Playoffs — Eliminação Simples</h2></div>
            {playoffs.length === 0 ? (
              <p className="empty-note">Os playoffs são montados automaticamente ao fim da fase inicial, com o avanço dos classificados.</p>
            ) : (
              <div className="playoffs-grid">
                {Object.entries(playoffRounds).map(([round, list]) => (
                  <div key={round} className="bracket-column">
                    <span className="round-label">{list[0].roundLabel} (MD{list[0].bo})</span>
                    {list.map((m) => <MatchCard key={m.id} match={m} onOpen={open} />)}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
