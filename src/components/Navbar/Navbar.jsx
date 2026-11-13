import { Shield, CirclePlus, LogOut, User } from 'lucide-react';
import './Navbar.css';

export default function Navbar({
  currentPath = '/',
  user,
  onLogout,
  onNavigate,
  onOpenCreateTeam,
}) {
  const goTo = (path) => {
    if (onNavigate) onNavigate(path);
    else window.location.href = path;
  };

  return (
    <header className="navbar">
      <div className="logo-container" onClick={() => goTo('/')} style={{ cursor: 'pointer' }}>
        <Shield className="logo-icon" />
        <span className="logo-text">CS2<span>HUB</span></span>
      </div>

      <nav className="nav-links">
        <a
          href="/"
          className={currentPath === '/' ? 'active' : ''}
          onClick={(e) => {
            e.preventDefault();
            goTo('/');
          }}
        >
          Torneios
        </a>
        <a
          href="/recrutamento"
          className={currentPath === '/recrutamento' ? 'active' : ''}
          onClick={(e) => {
            e.preventDefault();
            goTo('/recrutamento');
          }}
        >
          Recrutamento
        </a>
        <a
          href="/time"
          className={currentPath === '/time' ? 'active' : ''}
          onClick={(e) => {
            e.preventDefault();
            goTo('/time');
          }}
        >
          Meu Time
        </a>
        <a
          href="/perfil"
          className={currentPath === '/perfil' ? 'active' : ''}
          onClick={(e) => {
            e.preventDefault();
            goTo('/perfil');
          }}
        >
          Meu Perfil
        </a>
      </nav>

      <div className="nav-actions">
        {onOpenCreateTeam && (
          <button className="btn-create" onClick={onOpenCreateTeam}>
            <CirclePlus size={18} />
            <span>Criar Time</span>
          </button>
        )}

        {user ? (
          <div className="user-profile-badge">
            <div
              onClick={() => goTo('/perfil')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <img src={user.avatar} alt={user.name} className="user-avatar" />
              <span>{user.name}</span>
            </div>
            <button className="btn-logout" onClick={onLogout} title="Sair">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="auth-buttons">
            <button
              className="btn-login"
              onClick={() => goTo('/perfil')}
              title="Visualizar Perfil"
            >
              <User size={16} />
              <span>Perfil</span>
            </button>
            <button className="btn-login" onClick={() => goTo('/login')}>
              Login
            </button>
            <button className="btn-register" onClick={() => goTo('/register')}>
              Cadastro
            </button>
          </div>
        )}
      </div>
    </header>
  );
}