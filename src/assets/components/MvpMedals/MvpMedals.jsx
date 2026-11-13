import { Medal, Star } from 'lucide-react';
import './MvpMedals.css';

/**
 * Medalhões de MVP de torneios.
 * mvps: [{ id, tournament, date, rating? }]
 */
export default function MvpMedals({ mvps = [], title = 'Medalhões de MVP' }) {
  if (mvps.length === 0) return null;

  return (
    <section className="mvp-section">
      <div className="mvp-header">
        <h2>
          <Star size={20} className="mvp-title-icon" />
          {title}
        </h2>
        <span className="mvp-count">
          {mvps.length}x MVP
        </span>
      </div>

      <div className="mvp-grid">
        {mvps.map((mvp) => (
          <article key={mvp.id} className="mvp-medal-card">
            <div className="mvp-medallion">
              <Medal size={30} />
              <span>MVP</span>
            </div>
            <strong>{mvp.tournament}</strong>
            <small>{mvp.date}</small>
            {mvp.rating && <span className="mvp-rating">Rating {mvp.rating}</span>}
          </article>
        ))}
      </div>
    </section>
  );
}
