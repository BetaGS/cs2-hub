import { useEffect, useState } from 'react';
import { Trophy, Users, Calendar, Search, Swords, X, RefreshCw, Crown, Shield, Star, Flame } from 'lucide-react';
import Navbar from '../../components/Navbar/Navbar.jsx';
import MatchCard from '../../components/MatchCard/MatchCard.jsx';
import { api, getToken, useFetch } from '../../api.js';
import { MOCK_MATCHES, MOCK_TOURNAMENTS } from '../../mockData.js';
import './Home.css';

const TROPHY_ICONS = { trophy: Trophy, crown: Crown, shield: Shield, star: Star, flame: Flame };

export default function Home({ onNavigate, user, onLogout, onOpenCreateTeam }) {
  const { data, loading, offline, reload } = useFetch('/api/tournaments', MOCK_TOURNAMENTS);
  const { data: liveMatches } = useFetch('/api/matches', MOCK_MATCHES.slice(-4));
  const [tournaments, setTournaments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('Todos');
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (data) setTournaments(data);
  }, [data]);

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const goTo = (path, payload = null) => {
    if (onNavigate) onNavigate(path, payload);
    else window.location.href = path;
  };

  // Inscrição: com back-end usa a API (só o capitão); offline simula a fila contínua.
  const handleJoinTournament = async (tournamentId) => {
    if (!offline) {
      if (!getToken()) return goTo('/login');
      try {
        await api(`/api/tournaments/${tournamentId}/register`, { method: 'POST' });
        showToast('Time inscrito com sucesso!');
        reload();
      } catch (err) {
        showToast(err.message, 'error');
      }
      setSelectedTournament(null);
      return;
    }
    setTournaments((prev) => {
      const list = [];
      for (const t of prev) {
        if (t.id === tournamentId && t.statusCode === 'REGISTRATION') {
          const next = t.currentTeams + 1;
          const full = next >= t.maxTeams;
          list.push({ ...t, currentTeams: next, status: full ? 'Em Andamento' : 'Inscrições Abertas',
            statusCode: full ? 'RUNNING' : 'REGISTRATION', startDate: full ? 'Em jogo agora' : t.startDate });
          if (full) {
            const n = t.roomNumber + 1;
            list.push({ ...t, id: Date.now(), roomNumber: n, title: `${t.title.split(' #')[0]} #${n}`,
              currentTeams: 0, status: 'Inscrições Abertas', statusCode: 'REGISTRATION', startDate: 'Inicia ao lotar' });
          }
        } else list.push(t);
      }
      return list;
    });
    setSelectedTournament(null);
  };

  const filteredTournaments = tournaments.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      selectedType === 'Todos' ||
      (selectedType === 'GSL MD3' && t.templateId === 'gsl-playoffs') ||
      (selectedType === 'Suíço 3 Vitórias' && t.templateId === 'swiss-playoffs') ||
      (selectedType === 'Pontos Corridos' && t.templateId === 'round-robin-playoffs');
    return matchesSearch && matchesType;
  });

  return (
    <div className="home-container">
      <Navbar
        currentPath="/"
        user={user}
        onLogout={onLogout}
        onNavigate={onNavigate}
        onOpenCreateTeam={onOpenCreateTeam}
      />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>DOMINE A ARENA DE <span>CS2</span></h1>
          <p>
            Monta a tua equipa, define a função de cada jogador e entra na fila contínua de campeonatos.
          </p>

          <div className="hero-stats">
            <div className="stat-card">
              <Trophy className="stat-icon" />
              <div>
                <h4>+{tournaments.length + 147}</h4>
                <p>Salas Realizadas</p>
              </div>
            </div>
            <div className="stat-card">
              <Users className="stat-icon" />
              <div>
                <h4>+2.400</h4>
                <p>Jogadores Ativos</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seção Principal de Torneios */}
      <main className="main-content" id="torneios">
        <div className="controls-bar">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar sala ou torneio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-buttons">
            {['Todos', 'GSL MD3', 'Suíço 3 Vitórias', 'Pontos Corridos'].map((type) => (
              <button
                key={type}
                className={`filter-btn ${selectedType === type ? 'active' : ''}`}
                onClick={() => setSelectedType(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <h2 className="section-title">Filas de Torneios Disponíveis</h2>

        {loading && <div className="tournaments-grid">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 320 }} />)}</div>}
        {offline && <p className="demo-note">Modo demonstração: back-end offline, exibindo dados de exemplo.</p>}

        <div className="tournaments-grid">
          {filteredTournaments.map((tournament) => (
            <div key={tournament.id} className="tournament-card">
              <div className="card-image-wrapper">
                <img src={tournament.banner} alt={tournament.title} />
                <span className={`status-badge ${tournament.status === 'Em Andamento' ? 'live' : ''}`}>
                  {tournament.status}
                </span>
                <span className="format-badge">
                  <RefreshCw size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                  Fila Contínua
                </span>
              </div>

              <div className="card-content">
                <h3>{tournament.title}</h3>

                <div className="card-details">
                  <div className="detail-item">
                    <Swords size={16} />
                    <span>{tournament.type}</span>
                  </div>
                  <div className="detail-item">
                    <Users size={16} />
                    <span>
                      <strong>{tournament.currentTeams}/{tournament.maxTeams}</strong> Equipas
                    </span>
                  </div>
                  <div className="detail-item">
                    <Calendar size={16} />
                    <span>{tournament.startDate}</span>
                  </div>
                </div>

                <div className="card-footer">
                  <div className="trophy-info-mini" style={{ '--tc': tournament.trophy?.color }}>
                    {(() => { const Icon = TROPHY_ICONS[tournament.trophy?.icon] || Trophy; return <Icon size={16} />; })()}
                    <div>
                      <small>Troféu exclusivo</small>
                      <strong>{tournament.trophy?.name}</strong>
                    </div>
                  </div>
                  <button
                    className="btn-join"
                    onClick={() => {
                      if (tournament.status === 'Em Andamento') {
                        goTo('/torneio', tournament);
                      } else if (tournament.statusCode === 'FINISHED') {
                        goTo('/torneio', tournament);
                      } else {
                        setSelectedTournament(tournament);
                      }
                    }}
                  >
                    {tournament.status === 'Inscrições Abertas' ? 'Entrar na Fila' : 'Ver Chaves'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {liveMatches?.length > 0 && (
        <section className="main-content live-section">
          <h2 className="section-title">Partidas em Destaque</h2>
          <div className="live-grid">
            {liveMatches.map((m) => (
              <MatchCard key={m.id} match={m} onOpen={(match) => goTo(`/partida/${match.id}`)} />
            ))}
          </div>
        </section>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.text}</div>}

      {/* Modal: Detalhes do Torneio */}
      {selectedTournament && (
        <div className="modal-overlay" onClick={() => setSelectedTournament(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedTournament.title}</h3>
              <button className="btn-close" onClick={() => setSelectedTournament(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-info-row">
                <span><strong>Formato:</strong> {selectedTournament.type}</span>
                <span><strong>Vagas:</strong> {selectedTournament.currentTeams}/{selectedTournament.maxTeams}</span>
              </div>
              <div className="modal-info-row">
                <span><strong>Status:</strong> {selectedTournament.status}</span>
                <span><strong>Troféu:</strong> {selectedTournament.trophy?.name} (gratuito)</span>
              </div>
              <div className="modal-rules">
                <h4>Regras da Competição</h4>
                <p>{selectedTournament.rules}</p>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn-login"
                style={{ flex: 1 }}
                onClick={() => {
                  const t = selectedTournament;
                  setSelectedTournament(null);
                  goTo('/torneio', t);
                }}
              >
                Pré-visualizar Chaves
              </button>
              <button
                className="btn-auth-submit"
                style={{ flex: 2, marginTop: 0 }}
                onClick={() => handleJoinTournament(selectedTournament.id)}
              >
                Inscrever Meu Time ({selectedTournament.currentTeams + 1}/{selectedTournament.maxTeams})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}