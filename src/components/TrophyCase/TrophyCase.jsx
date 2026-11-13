import { Trophy, Crown, Shield, Star, Flame, Medal } from 'lucide-react';
import './TrophyCase.css';

const ICONS = { trophy: Trophy, crown: Crown, shield: Shield, star: Star, flame: Flame };

function TrophyIcon({ icon, size = 30 }) {
  const Icon = ICONS[icon] || Trophy;
  return <Icon size={size} />;
}

/**
 * Galeria de troféus (estilo HLTV): cada torneio tem ícone + cor próprios.
 * trophies: [{ id, tournament, trophyName, icon, color, date, format }]
 * mvps (opcional, só jogadores): [{ id, tournament, date, icon, color }]
 */
export default function TrophyCase({ trophies = [], mvps = [], title = 'Troféus', loading = false }) {
  const mvpTournaments = mvps.map((m) => m.tournament);

  return (
    <section className="trophy-case">
      <div className="trophy-case-header">
        <h2>
          <Trophy size={20} className="trophy-case-title-icon" />
          {title}
        </h2>
        <span className="trophy-count">
          {trophies.length} {trophies.length === 1 ? 'título' : 'títulos'}
        </span>
      </div>

      {loading ? (
        <div className="trophy-grid">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 92 }} />)}
        </div>
      ) : trophies.length === 0 ? (
        <div className="trophy-empty">
          <Medal size={32} />
          <p>Nenhum torneio vencido ainda. O primeiro título está a caminho!</p>
        </div>
      ) : (
        <div className="trophy-grid">
          {trophies.map((tr) => (
            <article key={tr.id} className="trophy-card" style={{ '--tc': tr.color || '#de9b35' }}>
              <div className="trophy-icon-wrap"><TrophyIcon icon={tr.icon} /></div>
              <div className="trophy-info">
                <strong>{tr.tournament}</strong>
                <small>{tr.trophyName}</small>
                <div className="trophy-meta">
                  <span className="trophy-place">🥇 Campeão</span>
                  {mvpTournaments.includes(tr.tournament) && <span className="trophy-mvp-tag">⭐ MVP</span>}
                  <span className="trophy-date">{tr.date}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {mvps.length > 0 && (
        <div className="mvp-block">
          <div className="mvp-block-header">
            <h3><Star size={18} /> Medalhões de MVP</h3>
            <span className="mvp-count">{mvps.length}x MVP</span>
          </div>
          <div className="mvp-grid">
            {mvps.map((mvp) => (
              <article key={mvp.id} className="mvp-medal-card">
                <div className="mvp-medallion">
                  <Medal size={28} />
                  <span>MVP</span>
                </div>
                <strong>{mvp.tournament}</strong>
                <small>{mvp.date}</small>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
