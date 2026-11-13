import { useState } from 'react';
import { X } from 'lucide-react';
import './CreateTeamModal.css';

export default function CreateTeamModal({ isOpen, onClose, onCreateTeam, currentUser }) {
  const [newTeam, setNewTeam] = useState({
    name: '',
    tag: '',
    logo: '',
    description: '',
    captainRole: 'In-Game Leader (IGL)',
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    const createdTeam = {
      id: Date.now(),
      name: newTeam.name,
      tag: newTeam.tag.toUpperCase(),
      logo:
        newTeam.logo ||
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80',
      description:
        newTeam.description || 'Equipa competitiva pronta para disputar os torneios da plataforma.',
      stats: {
        matches: 0,
        winRate: '0%',
      },
      trophies: [],
      members: [
        {
          id: 1,
          nickname: currentUser?.name || 'fallen_fan',
          role: newTeam.captainRole,
          isCaptain: true,
          avatar:
            currentUser?.avatar ||
            'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=200&q=80',
        },
      ],
    };

    setNewTeam({
      name: '',
      tag: '',
      logo: '',
      description: '',
      captainRole: 'In-Game Leader (IGL)',
    });

    onCreateTeam(createdTeam);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Criar Novo Time de CS2</h3>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-row">
            <div className="modal-field" style={{ flex: 2 }}>
              <label>Nome do Time</label>
              <input
                type="text"
                placeholder="Ex: FURIA Academy"
                value={newTeam.name}
                onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                required
              />
            </div>
            <div className="modal-field" style={{ flex: 1 }}>
              <label>Tag (até 5 letras)</label>
              <input
                type="text"
                maxLength={5}
                placeholder="Ex: FUR"
                value={newTeam.tag}
                onChange={(e) => setNewTeam({ ...newTeam, tag: e.target.value.toUpperCase() })}
                required
              />
            </div>
          </div>

          <div className="modal-field">
            <label>URL da Foto / Logo do Time</label>
            <input
              type="url"
              placeholder="https://exemplo.com/logo-time.png"
              value={newTeam.logo}
              onChange={(e) => setNewTeam({ ...newTeam, logo: e.target.value })}
            />
          </div>

          <div className="modal-field">
            <label>Sua Função no Time</label>
            <select
              value={newTeam.captainRole}
              onChange={(e) => setNewTeam({ ...newTeam, captainRole: e.target.value })}
            >
              <option value="In-Game Leader (IGL)">In-Game Leader (IGL)</option>
              <option value="AWPer">AWPer</option>
              <option value="Entry Fragger">Entry Fragger</option>
              <option value="Rifler">Rifler</option>
              <option value="Support">Support</option>
              <option value="Lurker">Lurker</option>
            </select>
          </div>

          <div className="modal-field">
            <label>Descrição do Time</label>
            <textarea
              rows="3"
              placeholder="Conte um pouco sobre a equipa, objetivos e horários de treino..."
              value={newTeam.description}
              onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
            />
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-submit-team">
              Criar Time e Abrir Perfil
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}