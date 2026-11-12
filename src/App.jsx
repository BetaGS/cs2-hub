import { useState, useEffect } from 'react';
import Home from './pages/Home/Home';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import TournamentBracket from './pages/Tournament/TournamentBracket';
import Profile from './pages/Profile/Profile';
import TeamProfile from './pages/Team/TeamProfile';
import CreateTeamModal from './components/CreateTeamModal.jsx';

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

  const navigate = (path, data = null) => {
    if (data) setPageData(data);
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo(0, 0);
  };

  const handleTeamCreated = (createdTeam) => {
    setIsCreateTeamOpen(false);
    navigate('/time', createdTeam);
  };

  return (
    <>
      {currentPath === '/login' && <Login onNavigate={navigate} />}
      {currentPath === '/register' && <Register onNavigate={navigate} />}
      {currentPath === '/torneio' && (
        <TournamentBracket tournament={pageData} onNavigate={navigate} />
      )}
      {currentPath === '/perfil' && (
        <Profile
          onNavigate={navigate}
          user={user}
          onLogout={() => setUser(null)}
          onOpenCreateTeam={() => setIsCreateTeamOpen(true)}
        />
      )}
      {currentPath === '/time' && (
        <TeamProfile
          teamData={pageData}
          onNavigate={navigate}
          user={user}
          onLogout={() => setUser(null)}
          onOpenCreateTeam={() => setIsCreateTeamOpen(true)}
        />
      )}
      {currentPath === '/' && (
        <Home
          onNavigate={navigate}
          user={user}
          onLogout={() => setUser(null)}
          onOpenCreateTeam={() => setIsCreateTeamOpen(true)}
        />
      )}

      <CreateTeamModal
        isOpen={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
        onCreateTeam={handleTeamCreated}
        currentUser={user}
      />
    </>
  );
}