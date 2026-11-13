import { useState, useEffect } from 'react';
import Home from './pages/Home/Home';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import TournamentBracket from './pages/Tournament/TournamentBracket';
import Profile from './pages/Profile/Profile';
import TeamProfile from './pages/Team/TeamProfile';
import Recruiting from './pages/Recruiting/Recruiting';
import MatchRoom from './pages/MatchRoom/MatchRoom';
import CreateTeamModal from './components/CreateTeamModal/CreateTeamModal.jsx';
import { api, getToken, setToken } from './api.js';

const withName = (u) => (u ? { ...u, name: u.nickname || u.name } : null);

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [pageData, setPageData] = useState(null);
  const [user, setUser] = useState(null);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Restaura a sessão (token salvo) ao abrir o site.
  useEffect(() => {
    if (!getToken()) return;
    api('/api/auth/me')
      .then((u) => setUser(withName(u)))
      .catch((err) => { if (!err.offline) setToken(null); });
  }, []);

  const navigate = (path, data = null) => {
    setPageData(data);
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo(0, 0);
  };

  const handleLogin = (u) => {
    setUser(withName(u));
    navigate('/');
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    navigate('/');
  };

  const handleTeamCreated = (createdTeam) => {
    setIsCreateTeamOpen(false);
    if (getToken()) api('/api/auth/me').then((u) => setUser(withName(u))).catch(() => {});
    navigate('/time', createdTeam);
  };

  const common = {
    onNavigate: navigate,
    user,
    onLogout: handleLogout,
    onOpenCreateTeam: () => setIsCreateTeamOpen(true),
  };
  const matchRoute = currentPath.match(/^\/partida\/(\d+)\/?$/);

  return (
    <>
      {currentPath === '/login' && <Login onNavigate={navigate} onLogin={handleLogin} />}
      {currentPath === '/register' && <Register onNavigate={navigate} onLogin={handleLogin} />}
      {currentPath === '/torneio' && <TournamentBracket tournament={pageData} onNavigate={navigate} />}
      {currentPath === '/perfil' && <Profile {...common} playerId={pageData?.playerId} />}
      {currentPath === '/time' && <TeamProfile {...common} teamData={pageData?.members ? pageData : null} teamId={pageData?.teamId} />}
      {currentPath === '/recrutamento' && <Recruiting {...common} />}
      {matchRoute && <MatchRoom matchId={matchRoute[1]} user={user} onNavigate={navigate} />}
      {currentPath === '/' && <Home {...common} />}

      <CreateTeamModal
        isOpen={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
        onCreateTeam={handleTeamCreated}
        currentUser={user}
      />
    </>
  );
}
