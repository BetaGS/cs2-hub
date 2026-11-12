import { useState } from 'react';
import {
  ArrowLeft,
  Shield,
  Users,
  Trophy,
  Edit3,
  Save,
  UserPlus,
  Crown,
  Trash2,
  Swords,
} from 'lucide-react';
import './TeamProfile.css';

const DEFAULT_TEAM = {
  id: 1,
  name: 'Imperial Academy BR',
  tag: 'IMP',
  logo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80',
  description:
    'Equipa focada em campeonatos 5v5 semanais, treino tático diário e evolução competitiva no cenário amador de CS2.',
  stats: {
    titles: 2,
    matches: 28,
    winRate: '64.2%',
  },
  members: [
    {
      id: 1,
      nickname: 'fallen_fan',
      role: 'AWPer',
      isCaptain: true,
      avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=200&q=80',
    },
    {
      id: 2,
      nickname: 'kscerato_aim',
      role: 'Rifler',
      isCaptain: false,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    },
    {
      id: 3,
      nickname: 'arT_rush',
      role: 'Entry Fragger',
      isCaptain: false,
      avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=200&q=80',
    },
    {
      id: 4,
      nickname: 'boltz_sup',
      role: 'Support',
      isCaptain: false,
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80',
    },
    {
      id: 5,
      nickname: 'vini_igl',
      role: 'In-Game Leader (IGL)',
      isCaptain: false,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    },
  ],
};

export default function TeamProfile({ teamData, onNavigate }) {
  const [team, setTeam] = useState(teamData || DEFAULT_TEAM);
  const [isEditing, setIsEditing] = useState(false);

  // Estados de edição do time
  const [editName, setEditName] = useState(team.name);
  const [editTag, setEditTag] = useState(team.tag);
  const [editLogo, setEditLogo] = useState(team.logo);
  const [editDescription, setEditDescription] = useState(team.description);

  // Estado para adicionar novo jogador ao elenco
  const [newNickname, setNewNickname] = useState('');
  const [newRole, setNewRole] = useState('Rifler');

  const handleBack = (e) => {
    e.preventDefault();
    if (onNavigate) onNavigate('/');
    else window.location.href = '/';
  };

  const handleSaveTeam = (e) => {
    e.preventDefault();
    setTeam({
      ...team,
      name: editName,
      tag: editTag.toUpperCase(),
      logo: editLogo || DEFAULT_TEAM.logo,
      description: editDescription,
    });
    setIsEditing(false);
  };

  const handleAddMember = (e) => {
    e.preventDefault();
    if (!newNickname.trim()) return;

    const newPlayer = {
      id: Date.now(),
      nickname: newNickname.trim(),
      role: newRole,
      isCaptain: false,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    };

    setTeam({
      ...team,
      members: [...team.members, newPlayer],
    });
    setNewNickname('');
    setNewRole('Rifler');
  };

  const handleRemoveMember = (memberId) => {
    setTeam({
      ...team,
      members: team.members.filter((m) => m.id !== memberId),
    });
  };

  const handleChangeMemberRole = (memberId, updatedRole) => {
    setTeam({
      ...team,
      members: team.members.map((m) =>
        m.id === memberId ? { ...m, role: updatedRole } : m
      ),
    });
  };

  return (
    <div className="team-page">
      {/* Topbar */}
      <header className="team-topbar">
        <button onClick={handleBack} className="btn-back-team">
          <ArrowLeft size={18} />
          <span>Voltar para Torneios</span>
        </button>

        <div className="logo-container" onClick={handleBack} style={{ cursor: 'pointer' }}>
          <Shield className="logo-icon" />
          <span className="logo-text">CS2<span>HUB</span></span>
        </div>
      </header>

      <main className="team-container">
        {/* Card Principal do Time */}
        <section className="team-header-card">
          <div className="team-identity">
            <img src={team.logo} alt={team.name} className="team-logo-img" />

            {isEditing ? (
              <form onSubmit={handleSaveTeam} className="team-edit-form">
                <div className="team-edit-row">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Nome do Time"
                    required
                  />
                  <input
                    type="text"
                    maxLength={5}
                    value={editTag}
                    onChange={(e) => setEditTag(e.target.value)}
                    placeholder="TAG (Ex: FURIA)"
                    style={{ maxWidth: '120px', textTransform: 'uppercase' }}
                    required
                  />
                </div>
                <input
                  type="url"
                  value={editLogo}
                  onChange={(e) => setEditLogo(e.target.value)}
                  placeholder="URL da foto/logo do time"
                />
                <textarea
                  rows="2"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Descrição do time..."
                />
                <div className="team-edit-actions">
                  <button type="submit" className="btn-save-team">
                    <Save size={16} /> Salvar Alterações
                  </button>
                  <button
                    type="button"
                    className="btn-cancel-team"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancelar
                  </button>
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
                  <span><Trophy size={15} /> {team.stats?.titles ?? 0} Títulos</span>
                  <span><Swords size={15} /> {team.stats?.matches ?? 0} Partidas</span>
                  <span><Users size={15} /> {team.members.length}/5 Jogadores</span>
                </div>
              </div>
            )}
          </div>

          {!isEditing && (
            <button className="btn-edit-team" onClick={() => setIsEditing(true)}>
              <Edit3 size={16} />
              <span>Editar Time</span>
            </button>
          )}
        </section>

        {/* Seção do Elenco / Jogadores e Funções */}
        <section className="team-roster-section">
          <div className="roster-header">
            <div>
              <h2>Elenco e Funções (Line-up)</h2>
              <p>Jogadores ativos e suas posições táticas dentro do servidor</p>
            </div>

            {/* Formulário rápido para adicionar jogador */}
            <form onSubmit={handleAddMember} className="add-member-form">
              <input
                type="text"
                placeholder="Nickname do jogador..."
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                required
              />
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                <option value="Rifler">Rifler</option>
                <option value="AWPer">AWPer</option>
                <option value="Entry Fragger">Entry Fragger</option>
                <option value="In-Game Leader (IGL)">In-Game Leader (IGL)</option>
                <option value="Support">Support</option>
                <option value="Lurker">Lurker</option>
              </select>
              <button type="submit" className="btn-add-member">
                <UserPlus size={16} />
                <span>Adicionar</span>
              </button>
            </form>
          </div>

          <div className="roster-grid">
            {team.members.map((member) => (
              <div key={member.id} className="member-card">
                <div className="member-top">
                  <img src={member.avatar} alt={member.nickname} className="member-avatar" />
                  <div className="member-info">
                    <div className="member-name-row">
                      <strong>{member.nickname}</strong>
                      {member.isCaptain && (
                        <span className="captain-badge" title="Capitão do Time">
                          <Crown size={14} /> Capitão
                        </span>
                      )}
                    </div>
                    <span className="member-role-pill">{member.role}</span>
                  </div>
                </div>

                <div className="member-footer">
                  <select
                    value={member.role}
                    onChange={(e) => handleChangeMemberRole(member.id, e.target.value)}
                    className="role-inline-select"
                    title="Alterar função"
                  >
                    <option value="Rifler">Rifler</option>
                    <option value="AWPer">AWPer</option>
                    <option value="Entry Fragger">Entry Fragger</option>
                    <option value="In-Game Leader (IGL)">In-Game Leader (IGL)</option>
                    <option value="Support">Support</option>
                    <option value="Lurker">Lurker</option>
                  </select>

                  {!member.isCaptain && (
                    <button
                      className="btn-remove-member"
                      onClick={() => handleRemoveMember(member.id)}
                      title="Remover do time"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}