import { useState } from 'react';
import { Shield, UserPlus, CircleCheck, ArrowLeft } from 'lucide-react';
import { api, setToken } from '../../api.js';
import './Auth.css';

export default function Register({ onNavigate, onLogin }) {
  const [error, setError] = useState('');
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState('Rifler');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSteamRegister = () => {
    setError('Cadastro com a Steam ainda não está disponível — use o registro manual.');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { token, user } = await api('/api/auth/register', { method: 'POST', body: { nickname, role, email, password } });
      setToken(token);
      if (onLogin) onLogin(user);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoHome = (e) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate('/');
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <a href="/" onClick={handleGoHome} className="btn-back-home">
          <ArrowLeft size={16} />
          <span>Voltar para o início</span>
        </a>

        <div className="auth-header">
          <div onClick={handleGoHome} style={{ cursor: 'pointer', display: 'inline-block' }}>
            <Shield className="auth-logo-icon" size={40} />
          </div>
          <h2>Criar Conta no CS2<span>HUB</span></h2>
          <p>Liga a tua conta Steam para validação do vac ban e nivel de conta</p>
        </div>

        {/* Botão Recomendado: Registo via Steam */}
        <button className="btn-steam-auth highlight" onClick={handleSteamRegister}>
          <svg className="steam-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.03 4.524 4.524s-2.03 4.524-4.524 4.524h-.105l-4.076 2.911c.002.045.006.09.006.136 0 1.859-1.513 3.372-3.372 3.372-1.636 0-3.003-1.168-3.313-2.724L.438 15.625C1.87 20.47 6.478 24 11.979 24c6.627 0 12-5.373 12-12s-5.373-12-12-12z" />
          </svg>
          <div className="btn-steam-text">
            <span>Criar conta com a Steam</span>
            <small>Recomendado (Importa Nickname e Avatar)</small>
          </div>
        </button>

        <div className="steam-features">
          <div className="feature-item">
            <CircleCheck size={14} /> <span>Sincronização do SteamID64</span>
          </div>
          <div className="feature-item">
            <CircleCheck size={14} /> <span>Verificação de estado VAC</span>
          </div>
        </div>

        <div className="auth-divider">
          <span>ou cria um registo manual</span>
        </div>

        {error && <p className="auth-error">{error}</p>}
        <form onSubmit={handleRegister} className="auth-form">
          <div className="form-group">
            <label>Nickname no CS2</label>
            <input
              type="text"
              placeholder="Ex: fallen_fan"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Função Principal (Role)</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="auth-select"
              required
            >
              <option value="Rifler">Rifler</option>
              <option value="AWPer">AWPer</option>
              <option value="Entry Fragger">Entry Fragger</option>
              <option value="IGL">IGL (In-Game Leader)</option>
              <option value="Support">Support</option>
              <option value="Lurker">Lurker</option>
            </select>
          </div>

          <div className="form-group">
            <label>E-mail</label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Palavra-passe</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-auth-submit">
            <UserPlus size={18} />
            <span>Registar Conta</span>
          </button>
        </form>

        <div className="auth-footer">
          <span>Já tens conta? <a href="/login">Entrar</a></span>
        </div>
      </div>
    </div>
  );
}