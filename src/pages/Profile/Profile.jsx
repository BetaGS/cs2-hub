import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Shield,
  Trophy,
  Crosshair,
  Award,
  CircleCheck,
  PenLine,
  Save,
  Users,
  ExternalLink,
} from 'lucide-react';
import TrophyCase from '../../components/TrophyCase/TrophyCase.jsx';
import { TeamBadge } from '../../components/MatchCard/MatchCard.jsx';
import { api, getToken, useFetch } from '../../api.js';
import { MOCK_PLAYER } from '../../mockData.js';
import './Profile.css';

export default function Profile({ onNavigate, playerId }) {
  const path = playerId ? `/api/players/${playerId}` : '/api/auth/me';
  const { data, loading, offline } = useFetch(path, MOCK_PLAYER, !!playerId || !!getToken());
  const [player, setPlayer] = useState(MOCK_PLAYER);
  const [isEditing, setIsEditing] = useState(false);
  const [editNickname, setEditNickname] = useState(player.nickname);
  const [editRole, setEditRole] = useState(player.role);
  const [message, setMessage] = useState('');
  const isOwn = !playerId;

  useEffect(() => {
    if (data) {
      setPlayer(data);
      setEditNickname(data.nickname);
      setEditRole(data.role);
    }
  }, [data]);

  const handleBack = (e) => {
    e.preventDefault();
    if (onNavigate) onNavigate('/');
    else window.location.href = '/';
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      if (getToken() && !offline) {
        const updated = await api('/api/auth/me', { method: 'PUT', body: { nickname: editNickname, role: editRole } });
        setPlayer(updated);
      } else {
        setPlayer({ ...player, nickname: editNickname, role: editRole });
      }
      setIsEditing(false);
    } catch (err) {
      setMessage(err.message);
    }
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
        {message && <div className="toast error">{message}</div>}
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
                    <option value="IGL">IGL</option>
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
                    <CircleCheck size={14} /> Conta verificada
                  </span>
                </div>

                <div className="team-tag-box">
                  <Users size={15} />
                  <span>Equipa Atual:</span>
                  {player.team ? <TeamBadge team={player.team} size="sm" /> : <strong>Sem time</strong>}
                </div>
              </div>
            )}
          </div>

          {!isEditing && (
            <div className="profile-header-actions">
              {isOwn && (
                <button className="btn-edit-profile" onClick={() => setIsEditing(true)}>
                  <PenLine size={16} />
                  <span>Editar Perfil</span>
                </button>
              )}
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
              <h3>{player.trophies.length}</h3>
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

        {/* Troféus + medalhões de MVP */}
        <TrophyCase trophies={player.trophies} mvps={player.mvps} title="Troféus do Jogador" loading={loading} />

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