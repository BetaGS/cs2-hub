import { useEffect, useState } from 'react';
import { ArrowLeft, Shield, Users, Trophy, PenLine, Save, UserPlus, Crown, Trash2, Swords, Star } from 'lucide-react';
import TrophyCase from '../../components/TrophyCase/TrophyCase.jsx';
import { api, getToken, ROLES, useFetch } from '../../api.js';
import { MOCK_TEAM } from '../../mockData.js';
import './TeamProfile.css';

export default function TeamProfile({ teamData, teamId, user, onNavigate }) {
  // Prioridade: time recém-criado (teamData) > time por id > meu time > demonstração.
  const path = teamId ? `/api/teams/${teamId}` : '/api/teams/me';
  const { data, loading, offline, reload } = useFetch(path, MOCK_TEAM, !teamData && (!!teamId || !!getToken()));
  const [team, setTeam] = useState(teamData || MOCK_TEAM);
  const [isEditing, setIsEditing] = useState(false);
  const [edit, setEdit] = useState({ name: '', tag: '', logo: '', description: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (data && !teamData) setTeam(data);
  }, [data, teamData]);

  const live = !!getToken() && !offline;
  const isCaptain = live ? team.captainId === user?.id : true; // demonstração: edição liberada
  const goTo = (path2) => (onNavigate ? onNavigate(path2) : (window.location.href = path2));

  const startEdit = () => {
    setEdit({ name: team.name, tag: team.tag, logo: team.logo || '', description: team.description || '' });
    setIsEditing(true);
  };

  const handleSaveTeam = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      if (live) {
        const updated = await api(`/api/teams/${team.id}`, {
          method: 'PUT',
          body: { name: edit.name, tag: edit.tag, description: edit.description, logo: edit.logo || undefined },
        });
        setTeam(updated);
      } else {
        setTeam({ ...team, name: edit.name, tag: edit.tag.toUpperCase(), logo: edit.logo || team.logo, description: edit.description });
      }
      setIsEditing(false);
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleLogoFile = async (file) => {
    if (!file) return;
    if (!live) return setMessage('Conecte o back-end para enviar arquivos de logo.');
    const form = new FormData();
    form.append('file', file);
    try {
      setTeam(await api(`/api/teams/${team.id}/logo`, { method: 'POST', form }));
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleRemoveMember = async (member) => {
    if (live) {
      try { setTeam(await api(`/api/teams/${team.id}/members/${member.id}`, { method: 'DELETE' })); }
      catch (err) { setMessage(err.message); }
    } else {
      setTeam({ ...team, members: team.members.filter((m) => m.id !== member.id) });
    }
  };

  const handleChangeMemberRole = async (member, role) => {
    if (live) {
      try { setTeam(await api(`/api/teams/${team.id}/members/${member.id}`, { method: 'PATCH', body: { role } })); }
      catch (err) { setMessage(err.message); }
    } else {
      setTeam({ ...team, members: team.members.map((m) => (m.id === member.id ? { ...m, role } : m)) });
    }
  };

  if (loading && !teamData) {
    return (
      <div className="team-page"><main className="team-container">
        <div className="skeleton" style={{ height: 180 }} /><div className="skeleton" style={{ height: 240 }} />
      </main></div>
    );
  }
  if (live && !team) return null;

  return (
    <div className="team-page">
      <header className="team-topbar">
        <button onClick={() => goTo('/')} className="btn-back-team">
          <ArrowLeft size={18} /><span>Voltar para Torneios</span>
        </button>
        <div className="logo-container" onClick={() => goTo('/')} style={{ cursor: 'pointer' }}>
          <Shield className="logo-icon" /><span className="logo-text">CS2<span>HUB</span></span>
        </div>
      </header>

      <main className="team-container">
        {message && <div className="toast error" onClick={() => setMessage('')}>{message}</div>}

        <section className="team-header-card">
          <div className="team-identity">
            {team.logo
              ? <img src={team.logo} alt={`Logo ${team.name}`} className="team-logo-img" />
              : <div className="team-logo-img team-logo-fallback">{team.tag}</div>}

            {isEditing ? (
              <form onSubmit={handleSaveTeam} className="team-edit-form">
                <div className="team-edit-row">
                  <input type="text" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Nome do Time" required />
                  <input type="text" maxLength={5} value={edit.tag} onChange={(e) => setEdit({ ...edit, tag: e.target.value })}
                    placeholder="TAG" style={{ maxWidth: '120px', textTransform: 'uppercase' }} required />
                </div>
                <input type="url" value={edit.logo} onChange={(e) => setEdit({ ...edit, logo: e.target.value })} placeholder="URL da foto/logo do time" />
                <label className="logo-upload">
                  ou enviar arquivo: <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => handleLogoFile(e.target.files?.[0])} />
                </label>
                <textarea rows="2" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} placeholder="Descrição do time..." />
                <div className="team-edit-actions">
                  <button type="submit" className="btn-save-team"><Save size={16} /> Salvar Alterações</button>
                  <button type="button" className="btn-cancel-team" onClick={() => setIsEditing(false)}>Cancelar</button>
                </div>
              </form>
            ) : (
              <div className="team-details-box">
                <div className="team-title-row">
                  <span className="team-tag-badge">[{team.tag}]</span>
                  <h1>{team.name}</h1>
                </div>
                <p className="team-description">{team.description}</p>
                <div className="team-mini-stats">
                  <span><Trophy size={15} /> {team.trophies?.length ?? 0} Títulos</span>
                  <span><Swords size={15} /> {team.stats?.matches ?? 0} Partidas</span>
                  <span><Users size={15} /> {team.members.length} Jogadores</span>
                </div>
              </div>
            )}
          </div>

          {!isEditing && isCaptain && (
            <button className="btn-edit-team" onClick={startEdit}><PenLine size={16} /><span>Editar Time</span></button>
          )}
        </section>

        <TrophyCase trophies={team.trophies ?? []} title="Troféus do Time" />

        <section className="team-roster-section">
          <div className="roster-header">
            <div>
              <h2>Elenco e Funções (Line-up)</h2>
              <p>Titulares e reservas com a função tática de cada jogador no CS2</p>
            </div>
            {isCaptain && (
              <button className="btn-add-member" onClick={() => goTo('/recrutamento')}>
                <UserPlus size={16} /><span>Recrutar jogadores</span>
              </button>
            )}
          </div>

          <div className="roster-grid">
            {team.members.map((member) => (
              <div key={member.id} className="member-card">
                <div className="member-top">
                  <img src={member.avatar} alt={member.nickname} className="member-avatar" />
                  <div className="member-info">
                    <div className="member-name-row">
                      <strong>{member.nickname}</strong>
                      {member.mvpCount > 0 && (
                        <span className="member-mvp-badge" title="MVPs de torneios"><Star size={13} /> {member.mvpCount}x MVP</span>
                      )}
                      {member.isCaptain && (
                        <span className="captain-badge" title="Capitão do Time"><Crown size={14} /> Capitão</span>
                      )}
                    </div>
                    <span className="member-role-pill">{member.role}{!member.isStarter ? ' • Reserva' : ''}</span>
                  </div>
                </div>

                {isCaptain && (
                  <div className="member-footer">
                    <select value={member.role} onChange={(e) => handleChangeMemberRole(member, e.target.value)}
                      className="role-inline-select" title="Alterar função">
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {!member.isCaptain && (
                      <button className="btn-remove-member" onClick={() => handleRemoveMember(member)} title="Remover do time">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
