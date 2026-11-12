import { useState } from 'react';
import { ArrowLeft, Trophy, Swords } from 'lucide-react';
import './TournamentBracket.css';

export default function TournamentBracket({ tournament, onNavigate }) {
  const currentTournament = tournament || {
    title: 'Copa GSL Pro Series #1',
    templateId: 'gsl-playoffs',
    type: 'Grupos GSL (MD3) + Mata-Mata',
    prize: 'R$ 1.500',
    status: 'Em Andamento',
  };

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'groups' | 'playoffs'

  const handleBack = (e) => {
    e.preventDefault();
    if (onNavigate) onNavigate('/');
    else window.location.href = '/';
  };

  return (
    <div className="bracket-page">
      {/* Topbar */}
      <header className="bracket-topbar">
        <button onClick={handleBack} className="btn-back">
          <ArrowLeft size={18} />
          <span>Voltar às Filas</span>
        </button>

        <div className="bracket-title-box">
          <span className="live-indicator">● {currentTournament.status}</span>
          <h1>{currentTournament.title}</h1>
          <p>{currentTournament.type} • Premiação: <strong>{currentTournament.prize}</strong></p>
        </div>

        <div className="bracket-tabs">
          <button
            className={activeTab === 'all' ? 'active' : ''}
            onClick={() => setActiveTab('all')}
          >
            Visão Geral
          </button>
          <button
            className={activeTab === 'groups' ? 'active' : ''}
            onClick={() => setActiveTab('groups')}
          >
            Fase de Grupos
          </button>
          <button
            className={activeTab === 'playoffs' ? 'active' : ''}
            onClick={() => setActiveTab('playoffs')}
          >
            Playoffs
          </button>
        </div>
      </header>

      <main className="bracket-container">
        {/* SEÇÃO 1: PLAYOFFS */}
        {(activeTab === 'all' || activeTab === 'playoffs') && (
          <section className="bracket-section">
            <div className="section-header">
              <Trophy size={20} className="accent-icon" />
              <h2>Playoffs — Single Elimination Bracket</h2>
            </div>

            <div className="playoffs-grid">
              {/* Quartas de Final */}
              <div className="bracket-column">
                <span className="round-label">Quartas de Final (MD3)</span>
                <div className="match-card">
                  <div className="match-meta"><span>05:00</span><span>BO3</span></div>
                  <div className="team-row winner"><span>Vitality</span><strong>2</strong></div>
                  <div className="team-row"><span>MOUZ</span><strong>1</strong></div>
                </div>
                <div className="match-card">
                  <div className="match-meta"><span>07:30</span><span>BO3</span></div>
                  <div className="team-row"><span>G2</span><strong>0</strong></div>
                  <div className="team-row winner"><span>Falcons</span><strong>2</strong></div>
                </div>
              </div>

              {/* Semifinais */}
              <div className="bracket-column">
                <span className="round-label">Semifinais (MD3)</span>
                <div className="match-card">
                  <div className="match-meta"><span>Sábado • 05:00</span><span>BO3</span></div>
                  <div className="team-row winner"><span>Spirit</span><strong>2</strong></div>
                  <div className="team-row"><span>Vitality</span><strong>1</strong></div>
                </div>
                <div className="match-card">
                  <div className="match-meta"><span>Sábado • 07:30</span><span>BO3</span></div>
                  <div className="team-row winner"><span>FURIA</span><strong>2</strong></div>
                  <div className="team-row"><span>Falcons</span><strong>0</strong></div>
                </div>
              </div>

              {/* Grande Final */}
              <div className="bracket-column">
                <span className="round-label">Grande Final (MD5)</span>
                <div className="match-card grand-final">
                  <div className="match-meta"><span>Domingo • 16:00</span><span>BO5</span></div>
                  <div className="team-row"><span>Spirit</span><strong>-</strong></div>
                  <div className="team-row"><span>FURIA</span><strong>-</strong></div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SEÇÃO 2: FASE DE GRUPOS */}
        {(activeTab === 'all' || activeTab === 'groups') && (
          <section className="bracket-section">
            <div className="section-header">
              <Swords size={20} className="accent-icon" />
              <h2>Fase de Grupos</h2>
            </div>

            {/* MODELO 1: GSL */}
            {currentTournament.templateId === 'gsl-playoffs' && (
              <div className="gsl-groups-wrapper">
                {['Grupo A', 'Grupo B'].map((groupName, idx) => (
                  <div key={groupName} className="gsl-group-box">
                    <h3>{groupName}</h3>
                    <div className="gsl-subgrid">
                      <div>
                        <span className="sub-label">Upper Bracket • Opening (MD3)</span>
                        <div className="match-card">
                          <div className="team-row"><span>{idx === 0 ? 'Legacy' : 'Spirit'}</span><strong>{idx === 0 ? '0' : '2'}</strong></div>
                          <div className="team-row winner"><span>{idx === 0 ? 'FURIA' : 'FUT'}</span><strong>{idx === 0 ? '2' : '1'}</strong></div>
                        </div>
                        <div className="match-card">
                          <div className="team-row winner"><span>{idx === 0 ? 'Vitality' : 'MOUZ'}</span><strong>{idx === 0 ? '2' : '1'}</strong></div>
                          <div className="team-row"><span>{idx === 0 ? 'Falcons' : 'G2'}</span><strong>{idx === 0 ? '0' : '2'}</strong></div>
                        </div>

                        <span className="sub-label" style={{ marginTop: '16px', display: 'block' }}>
                          Lower Bracket • Eliminação (MD3)
                        </span>
                        <div className="match-card">
                          <div className="team-row"><span>{idx === 0 ? 'Legacy' : 'FUT'}</span><strong>0</strong></div>
                          <div className="team-row winner"><span>{idx === 0 ? 'Falcons' : 'MOUZ'}</span><strong>2</strong></div>
                        </div>
                      </div>

                      <div>
                        <span className="sub-label">Upper Final (MD3)</span>
                        <div className="match-card">
                          <div className="team-row winner"><span>{idx === 0 ? 'FURIA' : 'Spirit'}</span><strong>2</strong></div>
                          <div className="team-row"><span>{idx === 0 ? 'Vitality' : 'G2'}</span><strong>1</strong></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* MODELO 2: SISTEMA SUÍÇO (3 VITÓRIAS) */}
            {currentTournament.templateId === 'swiss-playoffs' && (
              <div className="swiss-wrapper">
                <div className="swiss-column">
                  <span className="round-label">Rodada 1 (0:0)</span>
                  <div className="match-card"><div className="team-row"><span>FURIA</span><span>vs</span><span>Falcons</span></div></div>
                  <div className="match-card"><div className="team-row"><span>Vitality</span><span>vs</span><span>G2</span></div></div>
                  <div className="match-card"><div className="team-row"><span>Spirit</span><span>vs</span><span>MOUZ</span></div></div>
                  <div className="match-card"><div className="team-row"><span>NAVI</span><span>vs</span><span>Aurora</span></div></div>
                </div>

                <div className="swiss-column">
                  <span className="round-label">Avançam (2:0 / 2:1)</span>
                  <div className="match-card"><div className="team-row winner"><span>Vitality</span><strong>2</strong></div><div className="team-row"><span>FURIA</span><strong>1</strong></div></div>
                  <div className="match-card"><div className="team-row winner"><span>Spirit</span><strong>2</strong></div><div className="team-row"><span>NAVI</span><strong>0</strong></div></div>
                </div>

                <div className="swiss-column">
                  <span className="round-label qualified-badge">Classificados (3 Vitórias)</span>
                  <div className="status-list qualified">
                    <div><span>3-0</span> <strong>Vitality</strong></div>
                    <div><span>3-0</span> <strong>Spirit</strong></div>
                    <div><span>3-1</span> <strong>FURIA</strong></div>
                    <div><span>3-1</span> <strong>MOUZ</strong></div>
                    <div><span>3-2</span> <strong>NAVI</strong></div>
                  </div>

                  <span className="round-label eliminated-badge" style={{ marginTop: '16px' }}>Eliminados (3 Derrotas)</span>
                  <div className="status-list eliminated">
                    <div><span>0-3</span> <strong>G2</strong></div>
                    <div><span>1-3</span> <strong>Aurora</strong></div>
                  </div>
                </div>
              </div>
            )}

            {/* MODELO 3: PONTOS CORRIDOS EM GRUPOS */}
            {currentTournament.templateId === 'round-robin-playoffs' && (
              <div className="standings-grid">
                {[
                  {
                    group: 'Grupo A',
                    teams: [
                      { name: 'Evil Geniuses', m: 5, w: 4, t: 0, l: 1, rd: '+83', p: 12, qualified: true },
                      { name: 'New England', m: 5, w: 4, t: 0, l: 1, rd: '+27', p: 12, qualified: true },
                      { name: 'FURIA', m: 5, w: 4, t: 0, l: 1, rd: '+42', p: 12, qualified: true },
                      { name: 'Triumph', m: 5, w: 2, t: 0, l: 3, rd: '+6', p: 6, qualified: false },
                      { name: 'Rebirth', m: 5, w: 1, t: 0, l: 4, rd: '-50', p: 3, qualified: false },
                      { name: 'ImPerium', m: 5, w: 0, t: 0, l: 5, rd: '-108', p: 0, qualified: false },
                    ],
                  },
                  {
                    group: 'Grupo B',
                    teams: [
                      { name: '100 Thieves', m: 5, w: 4, t: 0, l: 1, rd: '+22', p: 12, qualified: true },
                      { name: 'Team Liquid', m: 5, w: 4, t: 0, l: 1, rd: '+58', p: 12, qualified: true },
                      { name: 'TeamOne', m: 5, w: 3, t: 0, l: 2, rd: '+8', p: 9, qualified: true },
                      { name: 'Chaos', m: 5, w: 3, t: 0, l: 2, rd: '+42', p: 9, qualified: false },
                      { name: 'Mythic', m: 5, w: 1, t: 0, l: 4, rd: '-54', p: 3, qualified: false },
                      { name: 'RBG', m: 5, w: 0, t: 0, l: 5, rd: '-76', p: 0, qualified: false },
                    ],
                  },
                ].map((grp) => (
                  <div key={grp.group} className="standings-card">
                    <h3>{grp.group}</h3>
                    <table className="standings-table">
                      <thead>
                        <tr>
                          <th>Equipa</th>
                          <th>J</th>
                          <th>V</th>
                          <th>E</th>
                          <th>D</th>
                          <th>RD</th>
                          <th>PTS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grp.teams.map((row, index) => (
                          <tr
                            key={row.name}
                            className={index === 2 ? 'cutoff-row' : ''}
                          >
                            <td className="team-cell">
                              <span className={`pos-dot ${row.qualified ? 'qual' : 'elim'}`} />
                              {row.name}
                            </td>
                            <td>{row.m}</td>
                            <td>{row.w}</td>
                            <td>{row.t}</td>
                            <td>{row.l}</td>
                            <td>{row.rd}</td>
                            <td><strong>{row.p}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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