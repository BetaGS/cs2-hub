import { useState } from 'react';
import { Shield, LogIn, ArrowLeft } from 'lucide-react';
import { api, setToken } from '../../api.js';
import './Auth.css';

export default function Login({ onNavigate, onLogin }) {
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSteamLogin = () => {
    setError('Login com a Steam ainda não está disponível — entre com e-mail e senha.');
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { token, user } = await api('/api/auth/login', { method: 'POST', body: { email, password } });
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
          <h2>CS2<span>HUB</span></h2>
          <p>Entre para competir nos torneios</p>
        </div>

        {/* Botão Principal: Entrar com a Steam */}
        <button className="btn-steam-auth" onClick={handleSteamLogin}>
          <svg className="steam-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.03 4.524 4.524s-2.03 4.524-4.524 4.524h-.105l-4.076 2.911c.002.045.006.09.006.136 0 1.859-1.513 3.372-3.372 3.372-1.636 0-3.003-1.168-3.313-2.724L.438 15.625C1.87 20.47 6.478 24 11.979 24c6.627 0 12-5.373 12-12s-5.373-12-12-12z" />
          </svg>
          <span>Entrar com a Steam</span>
        </button>

        <div className="auth-divider">
          <span>ou entre com e-mail</span>
        </div>

        {/* Formulário Tradicional */}
        {error && <p className="auth-error">{error}</p>}
        <form onSubmit={handleEmailLogin} className="auth-form">
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
            <LogIn size={18} />
            <span>Entrar</span>
          </button>
        </form>

        <div className="auth-footer">
          <span>Ainda não tens conta? <a href="/register">Regista-te</a></span>
        </div>
      </div>
    </div>
  );
}