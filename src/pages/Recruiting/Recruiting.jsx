import { useEffect, useState } from 'react';
import { Check, Crosshair, Mail, Send, UserPlus, Users, X } from 'lucide-react';
import Navbar from '../../components/Navbar/Navbar.jsx';
import { TeamBadge } from '../../components/MatchCard/MatchCard.jsx';
import { api, getToken, ROLES, useFetch } from '../../api.js';
import { MOCK_LFP, MOCK_LFT, MOCK_TEAM, mockAvatar } from '../../mockData.js';
import './Recruiting.css';

const EMPTY_INBOX = { invitesReceived: [], requestsSent: [], requestsReceived: [], invitesSent: [] };
const MOCK_INBOX = {
  ...EMPTY_INBOX,
  requestsReceived: [{ id: 901, kind: 'REQUEST', role: 'Support', message: 'Jogo 4 anos, tenho disponibilidade à noite.',
    team: MOCK_TEAM, player: { id: 77, nickname: 'novato_sup', role: 'Support', level: 11, avatar: mockAvatar('novato_sup') } }],
};

export default function Recruiting({ user, onNavigate, onLogout, onOpenCreateTeam }) {
  const logged = !!getToken();
  const [tab, setTab] = useState('lft');
  const [role, setRole] = useState('');
  const [toast, setToast] = useState(null);
  const q = role ? `?role=${encodeURIComponent(role)}` : '';

  const players = useFetch(`/api/recruiting/players${q}`, MOCK_LFT.filter((p) => !role || p.role === role));
  const teams = useFetch(`/api/recruiting/teams${q}`, MOCK_LFP.filter((t) => !role || t.openRoles.includes(role)));
  const inboxQ = useFetch('/api/recruiting/inbox', MOCK_INBOX, logged);
  const offline = players.offline;
  const [inbox, setInbox] = useState(EMPTY_INBOX);
  useEffect(() => { if (inboxQ.data) setInbox(inboxQ.data); }, [inboxQ.data]);

  const isCaptain = offline ? true : !!user?.isCaptain;
  const hasTeam = offline ? false : !!user?.team;

  const notify = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const call = async (fn, okMsg) => {
    try {
      await fn();
      notify(okMsg);
      inboxQ.reload();
      players.reload();
      teams.reload();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const ask = (team) => {
    if (offline) return notify('Solicitação enviada! Aguarde a aprovação do capitão. (demonstração)');
    if (!logged) return onNavigate('/login');
    call(() => api('/api/recruiting/requests', { method: 'POST', body: { teamId: team.id, role: role || undefined } }),
      'Solicitação enviada! Aguarde a aprovação do capitão.');
  };

  const invite = (player) => {
    if (offline) return notify(`Convite enviado para ${player.nickname}. (demonstração)`);
    call(() => api('/api/recruiting/invites', { method: 'POST', body: { userId: player.id, role: player.role } }),
      `Convite enviado para ${player.nickname}.`);
  };

  const respond = (item, accept) => {
    if (offline) {
      setInbox((cur) => ({ ...cur, invitesReceived: cur.invitesReceived.filter((i) => i.id !== item.id),
        requestsReceived: cur.requestsReceived.filter((i) => i.id !== item.id) }));
      return notify(accept ? 'Jogador aprovado e adicionado ao elenco! (demonstração)' : 'Solicitação recusada.');
    }
    call(() => api(`/api/recruiting/${item.id}/respond`, { method: 'POST', body: { accept } }),
      accept ? 'Aprovado! O jogador entrou no elenco.' : 'Solicitação recusada.');
  };

  const cancel = (item) => call(() => api(`/api/recruiting/${item.id}`, { method: 'DELETE' }), 'Cancelado.');

  const toggleLft = () => call(() => api('/api/auth/me', { method: 'PUT', body: { lookingForTeam: !user?.lookingForTeam } }),
    'Anúncio atualizado. Atualize a página para ver o novo estado.');

  const total = inbox.invitesReceived.length + inbox.requestsReceived.length;

  return (
    <div className="recruiting-page">
      <Navbar currentPath="/recrutamento" user={user} onLogout={onLogout} onNavigate={onNavigate} onOpenCreateTeam={onOpenCreateTeam} />

      <main className="recruiting-container">
        <header className="recruiting-head">
          <div>
            <h1>Mercado de <span>Recrutamento</span></h1>
            <p>Jogadores procurando time (LFT) e times procurando jogadores (LFP). O jogador só entra no elenco após a aprovação do capitão.</p>
          </div>
          {!offline && logged && !hasTeam && (
            <button className="btn-lft-toggle" onClick={toggleLft}>
              {user?.lookingForTeam ? 'Sair da lista LFT' : 'Anunciar-me como LFT'}
            </button>
          )}
        </header>
        {offline && <p className="demo-note">Modo demonstração: back-end offline, exibindo dados de exemplo.</p>}

        <div className="recruiting-layout">
          <section className="recruiting-main">
            <div className="recruiting-tabs">
              <button className={tab === 'lft' ? 'active' : ''} onClick={() => setTab('lft')}><Crosshair size={16} /> Jogadores (LFT)</button>
              <button className={tab === 'lfp' ? 'active' : ''} onClick={() => setTab('lfp')}><Users size={16} /> Times (LFP)</button>
              <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filtrar por função">
                <option value="">Todas as funções</option>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {tab === 'lft' && (
              <div className="rec-grid">
                {players.loading && [0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 150 }} />)}
                {!players.loading && (players.data || []).length === 0 && <p className="rec-empty">Nenhum jogador procurando time com esse filtro.</p>}
                {(players.data || []).map((p) => (
                  <article key={p.id} className="rec-card">
                    <div className="rec-card-top">
                      <img src={p.avatar || mockAvatar(p.nickname)} alt={p.nickname} className="rec-avatar" />
                      <div>
                        <strong>{p.nickname}</strong>
                        <span className="role-pill">{p.role}</span>
                      </div>
                    </div>
                    <div className="rec-stats"><span>Nível <b>{p.level}</b></span><span>K/D <b>{p.kdRatio}</b></span></div>
                    {isCaptain && (
                      <button className="btn-rec" onClick={() => invite(p)}><Send size={15} /> Convidar</button>
                    )}
                  </article>
                ))}
              </div>
            )}

            {tab === 'lfp' && (
              <div className="rec-grid">
                {teams.loading && [0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 170 }} />)}
                {!teams.loading && (teams.data || []).length === 0 && <p className="rec-empty">Nenhum time com vagas para essa função.</p>}
                {(teams.data || []).map((t) => (
                  <article key={t.id} className="rec-card">
                    <TeamBadge team={t} size="lg" />
                    <p className="rec-desc">{t.description}</p>
                    <div className="rec-roles">
                      {(t.openRoles || []).map((r) => <span key={r} className="role-pill open">{r}</span>)}
                    </div>
                    <div className="rec-stats"><span><Users size={13} /> {t.members} jogadores</span></div>
                    {!hasTeam && (
                      <button className="btn-rec" onClick={() => ask(t)}><UserPlus size={15} /> Pedir para Entrar</button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <aside className="recruiting-inbox">
            <h2><Mail size={18} /> Caixa de entrada {total > 0 && <span className="inbox-count">{total}</span>}</h2>
            {!logged && !offline && <p className="rec-empty">Faça login para ver convites e solicitações.</p>}

            <InboxGroup title="Convites recebidos" items={inbox.invitesReceived} onAccept={(i) => respond(i, true)}
              onReject={(i) => respond(i, false)} who="team" />
            <InboxGroup title="Solicitações ao meu time" items={inbox.requestsReceived} onAccept={(i) => respond(i, true)}
              onReject={(i) => respond(i, false)} who="player" approveLabel="Aprovar" />
            <InboxGroup title="Minhas solicitações" items={inbox.requestsSent} onCancel={cancel} who="team" />
            <InboxGroup title="Convites enviados" items={inbox.invitesSent} onCancel={cancel} who="player" />
          </aside>
        </div>
      </main>
      {toast && <div className={`toast ${toast.type}`}>{toast.text}</div>}
    </div>
  );
}

function InboxGroup({ title, items, onAccept, onReject, onCancel, who, approveLabel = 'Aceitar' }) {
  if (!items?.length) return null;
  return (
    <div className="inbox-group">
      <h3>{title}</h3>
      {items.map((it) => (
        <div key={it.id} className="inbox-item">
          {who === 'team'
            ? <TeamBadge team={it.team} size="sm" />
            : <div className="inbox-player"><img src={it.player.avatar || mockAvatar(it.player.nickname)} alt="" /><strong>{it.player.nickname}</strong><span className="role-pill">{it.role || it.player.role}</span></div>}
          {it.message && <p className="inbox-msg">“{it.message}”</p>}
          <div className="inbox-actions">
            {onAccept && <button className="btn-ok" onClick={() => onAccept(it)}><Check size={14} /> {approveLabel}</button>}
            {onReject && <button className="btn-no" onClick={() => onReject(it)}><X size={14} /> Recusar</button>}
            {onCancel && <button className="btn-no" onClick={() => onCancel(it)}>Cancelar</button>}
          </div>
        </div>
      ))}
    </div>
  );
}
