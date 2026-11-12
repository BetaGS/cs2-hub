import { useState } from 'react';
import { Trophy, Users, Calendar, Search, Swords, X, RefreshCw } from 'lucide-react';
import Navbar from '../../assets/components/Navbar/Navbar.jsx';
import './Home.css';

const TOURNAMENT_TEMPLATES = [
  {
    templateId: 'gsl-playoffs',
    baseTitle: 'Copa GSL Pro Series',
    roomNumber: 1,
    format: '5v5',
    type: 'Grupos GSL (MD3) + Mata-Mata',
    currentTeams: 7,
    maxTeams: 8,
    prize: 'R$ 1.500',
    startDate: 'Inicia ao lotar',
    status: 'Inscrições Abertas',
    banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
    rules: 'Fase de grupos em formato GSL (Upper e Lower Bracket) com partidas MD3. Os 3 melhores de cada grupo avançam aos Playoffs (Quartas, Semis MD3 e Grande Final MD5).',
  },
  {
    templateId: 'swiss-playoffs',
    baseTitle: 'Major Swiss Qualifier',
    roomNumber: 1,
    format: '5v5',
    type: 'Sistema Suíço (3 Vitórias) + Mata-Mata',
    currentTeams: 15,
    maxTeams: 16,
    prize: 'Skins Covert + Vaga',
    startDate: 'Inicia ao lotar',
    status: 'Inscrições Abertas',
    banner: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80',
    rules: 'Fase Suíça de 16 equipes: 3 vitórias classificam para os Playoffs (3-0, 3-1, 3-2) e 3 derrotas eliminam. Mata-mata em eliminação simples com disputa de 3º lugar.',
  },
  {
    templateId: 'round-robin-playoffs',
    baseTitle: 'Liga Pontos Corridos',
    roomNumber: 1,
    format: '5v5',
    type: 'Grupos Pontos Corridos + Mata-Mata',
    currentTeams: 10,
    maxTeams: 12,
    prize: 'R$ 2.000',
    startDate: 'Inicia ao lotar',
    status: 'Inscrições Abertas',
    banner: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&q=80',
    rules: '2 grupos de 6 equipes jogando todos contra todos (pontos corridos). Top 3 de cada grupo avança para os Playoffs com definição de 3º e 5º lugar.',
  },
];

export default function Home({ onNavigate, user, onLogout, onOpenCreateTeam }) {
  const [tournaments, setTournaments] = useState(
    TOURNAMENT_TEMPLATES.map((t) => ({
      ...t,
      id: `${t.templateId}-1`,
      title: `${t.baseTitle} #1`,
    }))
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('Todos');
  const [selectedTournament, setSelectedTournament] = useState(null);

  const goTo = (path, data = null) => {
    if (onNavigate) onNavigate(path, data);
    else window.location.href = path;
  };

  const handleJoinTournament = (tournamentId) => {
    setTournaments((prevTournaments) => {
      const updatedList = [];

      for (const t of prevTournaments) {
        if (t.id === tournamentId && t.status === 'Inscrições Abertas') {
          const nextCount = t.currentTeams + 1;
          const isFull = nextCount >= t.maxTeams;

          const updatedRoom = {
            ...t,
            currentTeams: nextCount,
            status: isFull ? 'Em Andamento' : 'Inscrições Abertas',
            startDate: isFull ? 'Em jogo agora' : t.startDate,
          };
          updatedList.push(updatedRoom);

          if (isFull) {
            const nextRoomNumber = t.roomNumber + 1;
            updatedList.push({
              ...t,
              id: `${t.templateId}-${nextRoomNumber}-${Date.now()}`,
              roomNumber: nextRoomNumber,
              title: `${t.baseTitle} #${nextRoomNumber}`,
              currentTeams: 0,
              status: 'Inscrições Abertas',
              startDate: 'Inicia ao lotar',
            });
          }
        } else {
          updatedList.push(t);
        }
      }

      return updatedList;
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
                  <div className="prize-info">
                    <small>Premiação</small>
                    <strong>{tournament.prize}</strong>
                  </div>
                  <button
                    className="btn-join"
                    onClick={() => {
                      if (tournament.status === 'Em Andamento') {
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
                <span><strong>Prêmio:</strong> {selectedTournament.prize}</span>
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