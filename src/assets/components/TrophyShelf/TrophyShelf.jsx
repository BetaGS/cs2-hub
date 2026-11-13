import { Trophy, Medal } from 'lucide-react';
import './TrophyShelf.css';

/**
 * Prateleira de troféus (torneios vencidos).
 * trophies: [{ id, tournament, format, date, prize? }]
 */
export default function TrophyShelf({ trophies = [], mvpTournaments = [], title = 'Troféus' }) {
  return (
    <section className="trophy-shelf">
      <div className="trophy-shelf-header">
        <h2>
          <Trophy size={20} className="trophy-shelf-title-icon" />
          {title}
        </h2>
        <span className="trophy-count">
          {trophies.length} {trophies.length === 1 ? 'título' : 'títulos'}
        </span>
      </div>

      {trophies.length === 0 ? (
        <div className="trophy-empty">
          <Medal size={32} />
          <p>Nenhum torneio vencido ainda. O primeiro título está a caminho!</p>
        </div>
      ) : (
        <div className="trophy-grid">
          {trophies.map((trophy) => (
            <article key={trophy.id} className="trophy-card">
              <div className="trophy-icon-wrap">
                <Trophy size={30} />
              </div>
              <div className="trophy-info">
                <strong>{trophy.tournament}</strong>
                <small>{trophy.format}</small>
                <div className="trophy-meta">
                  <span className="trophy-place">🥇 Campeão</span>
                  {mvpTournaments.includes(trophy.tournament) && (
                    <span className="trophy-mvp-tag">⭐ MVP</span>
                  )}
                  <span className="trophy-date">{trophy.date}</span>
                </div>
                {trophy.prize && <span className="trophy-prize">{trophy.prize}</span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
