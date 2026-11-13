import { Swords } from 'lucide-react';
import './MatchCard.css';

export const STATUS_LABEL = {
  WAITING_TEAMS: ['Aguardando times', ''], READY: ['Pronta', 'ready'], VETO: ['Veto ao vivo', 'live'],
  LIVE: ['Em jogo', 'live'], AWAITING_CONFIRMATION: ['Confirmar resultado', 'pending'],
  DISPUTED: ['Contestada', 'pending'], FINISHED: ['Finalizada', 'done'],
};

/** Logo + [TAG] + nome — exibido sempre que um time aparece no site. */
export function TeamBadge({ team, size = 'md', showName = true, reverse = false }) {
  if (!team) {
    return (
      <div className={`team-badge ${size}`}>
        <div className="team-logo placeholder">?</div>
        {showName && <span className="team-name tbd">A definir</span>}
      </div>
    );
  }
  return (
    <div className={`team-badge ${size} ${reverse ? 'reverse' : ''}`}>
      {team.logo
        ? <img className="team-logo" src={team.logo} alt={`Logo ${team.name}`} />
        : <div className="team-logo placeholder">{team.tag}</div>}
      <span className="team-tag">[{team.tag}]</span>
      {showName && <span className="team-name">{team.name}</span>}
    </div>
  );
}

export default function MatchCard({ match, onOpen, compact = false }) {
  const [label, tone] = STATUS_LABEL[match.status] || [match.status, ''];
  const done = match.status === 'FINISHED';
  const row = (team, score, won) => (
    <div className={`mc-row ${done && won ? 'winner' : ''} ${done && !won ? 'loser' : ''}`}>
      <TeamBadge team={team} size="sm" />
      <strong className="mc-score">{done || match.status === 'LIVE' ? score : '-'}</strong>
    </div>
  );
  const clickable = !!onOpen && match.team1 && match.team2;

  return (
    <article
      className={`match-card2 ${compact ? 'compact' : ''} ${clickable ? 'clickable' : ''}`}
      onClick={clickable ? () => onOpen(match) : undefined}
    >
      <div className="mc-meta">
        <span>{match.roundLabel}{match.groupName ? ` • Grupo ${match.groupName}` : ''}</span>
        <span className="mc-bo">MD{match.bo}</span>
      </div>
      {row(match.team1, match.score1, match.winnerId && match.winnerId === match.team1?.id)}
      {row(match.team2, match.score2, match.winnerId && match.winnerId === match.team2?.id)}
      <div className="mc-footer">
        <span className={`badge ${tone}`}>{label}</span>
        {clickable && <span className="mc-open"><Swords size={13} /> {match.status === 'FINISHED' ? 'Ver partida' : 'Sala da partida'}</span>}
      </div>
    </article>
  );
}
