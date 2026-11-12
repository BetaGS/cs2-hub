import { useState } from 'react';
import {
  ArrowLeft,
  Shield,
  Trophy,
  Crosshair,
  Award,
  CheckCircle,
  Edit3,
  Save,
  Users,
  ExternalLink,
} from 'lucide-react';
import './Profile.css';

const MOCK_PLAYER = {
  nickname: 'fallen_fan',
  steamId64: '76561198012345678',
  avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=300&q=80',
  role: 'AWPer',
  level: 18,
  vacStatus: 'Sem Banimentos (Limpo)',
  team: {
    name: 'Imperial Academy BR',
    tag: 'IMP',
  },
  stats: {
    matches: 42,
    winRate: '61.9%',
    kdRatio: '1.28',
    hsPercentage: '48.5%',
    titles: 3,
  },
  matchHistory: [
    {
      id: 101,
      tournament: 'Copa GSL Pro Series #1',
      format: 'Grupos GSL (MD3) + Mata-Mata',
      map: 'Mirage',
      score: '13 - 9',
      result: 'Vitória',
      kda: '24 / 14 / 5',
      date: 'Hoje, 17:30',
    },
    {
      id: 102,
      tournament: 'Major Swiss Qualifier #4',
      format: 'Sistema Suíço (3 Vitórias)',
      map: 'Inferno',
      score: '11 - 13',
      result: 'Derrota',
      kda: '18 / 19 / 4',
      date: 'Ontem, 21:15',
    },
    {
      id: 103,
      tournament: 'Liga Pontos Corridos #2',
      format: 'Grupos Pontos Corridos',
      map: 'Ancient',
      score: '13 - 6',
      result: 'Vitória',
      kda: '27 / 11 / 7',
      date: '10 Nov, 20:00',
    },
  ],
};

export default function Profile({ onNavigate }) {
  const [player, setPlayer] = useState(MOCK_PLAYER);
  const [isEditing, setIsEditing] = useState(false);
  const [editNickname, setEditNickname] = useState(player.nickname);
  const [editRole, setEditRole] = useState(player.role);

  const handleBack = (e) => {
    e.preventDefault();
    if (onNavigate) onNavigate('/');
    else window.location.href = '/';
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setPlayer({
      ...player,
      nickname: editNickname,
      role: editRole,
    });
    setIsEditing(false);
  };

  return (
    <div className="profile-page">
      {/* Topbar */}
      <header className="profile-topbar">
        <button onClick={handleBack} className="btn-back-profile">
          <ArrowLeft size={18} />
          <span>Voltar para Torneios</span>
        </button>

        <div className="logo-container" onClick={handleBack} style={{ cursor: 'pointer' }}>
          <Shield className="logo-icon" />
          <span className="logo-text">CS2<span>HUB</span></span>
        </div>
      </header>

      <main className="profile-container">
        {/* Cabeçalho do Jogador */}
        <section className="profile-header-card">
          <div className="profile-identity">
            <div className="avatar-wrapper">
              <img src={player.avatar} alt={player.nickname} className="profile-avatar" />
              <span className="player-level">LVL {player.level}</span>
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="profile-edit-form">
                <div className="edit-inputs">
                  <input
                    type="text"
                    value={editNickname}
                    onChange={(e) => setEditNickname(e.target.value)}
                    placeholder="Nickname"
                    required
                  />
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                  >
                    <option value="Rifler">Rifler</option>
                    <option value="AWPer">AWPer</option>
                    <option value="Entry Fragger">Entry Fragger</option>
                    <option value="In-Game Leader (IGL)">In-Game Leader (IGL)</option>
                    <option value="Support">Support</option>
                    <option value="Lurker">Lurker</option>
                  </select>
                </div>
                <div className="edit-actions">
                  <button type="submit" className="btn-save-profile">
                    <Save size={16} /> Salvar
                  </button>
                  <button
                    type="button"
                    className="btn-cancel-edit"
                    onClick={() => {
                      setEditNickname(player.nickname);
                      setEditRole(player.role);
                      setIsEditing(false);
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-info">
                <div className="name-row">
                  <h1>{player.nickname}</h1>
                  <span className="role-badge">{player.role}</span>
                </div>

                <div className="steam-meta">
                  <span>SteamID64: <code>{player.steamId64}</code></span>
                  <span className="vac-clean">
                    <CheckCircle size={14} /> {player.vacStatus}
                  </span>
                </div>

                <div className="team-tag-box">
                  <Users size={15} />
                  <span>Equipa Atual: <strong>[{player.team.tag}] {player.team.name}</strong></span>
                </div>
              </div>
            )}
          </div>

          {!isEditing && (
            <div className="profile-header-actions">
              <button className="btn-edit-profile" onClick={() => setIsEditing(true)}>
                <Edit3 size={16} />
                <span>Editar Perfil</span>
              </button>
              <a
                href={`https://steamcommunity.com/profiles/${player.steamId64}`}
                target="_blank"
                rel="noreferrer"
                className="btn-steam-link"
              >
                <span>Perfil Steam</span>
                <ExternalLink size={15} />
              </a>
            </div>
          )}
        </section>

        {/* Estatísticas Competitivas */}
        <section className="profile-stats-grid">
          <div className="p-stat-card">
            <Trophy size={22} className="p-stat-icon" />
            <div>
              <span>Torneios Vencidos</span>
              <h3>{player.stats.titles}</h3>
            </div>
          </div>

          <div className="p-stat-card">
            <Award size={22} className="p-stat-icon" />
            <div>
              <span>Taxa de Vitória</span>
              <h3>{player.stats.winRate}</h3>
            </div>
          </div>

          <div className="p-stat-card">
            <Crosshair size={22} className="p-stat-icon" />
            <div>
              <span>K/D Ratio</span>
              <h3>{player.stats.kdRatio}</h3>
            </div>
          </div>

          <div className="p-stat-card">
            <Shield size={22} className="p-stat-icon" />
            <div>
              <span>Headshot %</span>
              <h3>{player.stats.hsPercentage}</h3>
            </div>
          </div>
        </section>

        {/* Histórico de Partidas */}
        <section className="profile-history-card">
          <div className="history-header">
            <h2>Histórico Recente de Partidas ({player.stats.matches} jogos)</h2>
          </div>

          <div className="history-list">
            {player.matchHistory.map((match) => (
              <div
                key={match.id}
                className={`history-row ${match.result === 'Vitória' ? 'win' : 'loss'}`}
              >
                <div className="match-result-badge">
                  {match.result}
                </div>

                <div className="match-tournament-info">
                  <strong>{match.tournament}</strong>
                  <small>{match.format} • Mapa: {match.map}</small>
                </div>

                <div className="match-score">
                  <span>Placar</span>
                  <strong>{match.score}</strong>
                </div>

                <div className="match-kda">
                  <span>K / D / A</span>
                  <strong>{match.kda}</strong>
                </div>

                <div className="match-date">
                  {match.date}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}