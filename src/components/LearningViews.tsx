import {
  ArrowRight,
  Check,
  Globe2,
  Layers3,
  Network,
  Mail,
  Search,
  ArrowUpRight,
  BookOpen,
} from 'lucide-react';
import { useState } from 'react';
import {
  categories,
  learningPaths,
  protocolById,
  protocols,
  type Protocol,
} from '../data/protocols';
import { glossary } from '../data/glossary';
import type { Progress } from '../state';
export function LearningPath({
  progress,
  onSelect,
}: {
  progress: Progress;
  onSelect: (p: Protocol) => void;
}) {
  const icons = [Globe2, Network, Layers3, Mail];
  return (
    <div className="secondary-page">
      <div className="eyebrow mint">A LITTLE CURIOSITY GOES A LONG WAY</div>
      <h1>
        Your path through
        <br />
        the internet.
      </h1>
      <p className="page-intro">
        Build understanding one connection at a time. Start at the beginning, or follow whatever
        makes you curious.
      </p>
      <div className="learning-summary panel">
        <div
          className="progress-ring"
          style={
            {
              '--progress': `${(progress.completed.length / protocols.length) * 100}%`,
            } as React.CSSProperties
          }
        >
          <strong>{progress.completed.length}</strong>
        </div>
        <div>
          <h3>
            {progress.completed.length === protocols.length
              ? 'You explored every protocol.'
              : 'Small steps. Real understanding.'}
          </h3>
          <p>
            {progress.completed.length} of {protocols.length} lessons completed ·{' '}
            {progress.quizzes.length} knowledge checks passed
          </p>
        </div>
        <span className="small muted">Saved on this device</span>
      </div>
      <div className="path-grid">
        {learningPaths.map((path, i) => {
          const Icon = icons[i];
          const completed = path.ids.filter((id) => progress.completed.includes(id)).length;
          return (
            <section className="path-card panel" key={path.title}>
              <div className="path-heading">
                <span className={`path-icon color-${['mint', 'amber', 'violet', 'rose'][i]}`}>
                  <Icon size={23} />
                </span>
                <span className="eyebrow">CHAPTER 0{i + 1}</span>
                <span className="small muted">
                  {completed}/{path.ids.length}
                </span>
              </div>
              <h2>{path.title}</h2>
              <p>{path.description}</p>
              <div className="path-lessons">
                {path.ids.map((id, j) => {
                  const p = protocolById(id),
                    done = progress.completed.includes(id);
                  return (
                    <button key={id} onClick={() => onSelect(p)}>
                      <span className={`path-number ${done ? 'passed' : ''}`}>
                        {done ? <Check size={14} /> : String(j + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <strong>{p.name}</strong>
                        <span>{p.fullName}</span>
                      </div>
                      <ArrowRight size={16} />
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
export function ReferenceView({ onSelect }: { onSelect: (p: Protocol) => void }) {
  const [tab, setTab] = useState<'glossary' | 'protocols'>('glossary'),
    [query, setQuery] = useState('');
  const terms = glossary.filter((t) =>
    `${t.term} ${t.definition} ${t.category}`.toLowerCase().includes(query.toLowerCase()),
  );
  const matches = protocols.filter((p) =>
    `${p.name} ${p.fullName} ${p.port} ${p.category}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="secondary-page">
      <div className="eyebrow mint">
        <BookOpen size={14} /> YOUR NETWORKING FIELD GUIDE
      </div>
      <h1>A little more clarity.</h1>
      <p className="page-intro">
        The terms, ports, and layers behind the packets. Keep this close while you explore.
      </p>
      <div className="reference-tools">
        <div className="segmented">
          <button className={tab === 'glossary' ? 'active' : ''} onClick={() => setTab('glossary')}>
            Glossary <span>{glossary.length}</span>
          </button>
          <button
            className={tab === 'protocols' ? 'active' : ''}
            onClick={() => setTab('protocols')}
          >
            Protocol reference <span>{protocols.length}</span>
          </button>
        </div>
        <label className="search-field">
          <Search size={16} />
          <input
            aria-label="Search reference"
            placeholder="Find a term or protocol…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      {tab === 'glossary' ? (
        <div className="glossary-grid">
          {terms.map((t) => (
            <article key={t.term} className="term-card panel">
              <span className="eyebrow">{t.category}</span>
              <h2>{t.term}</h2>
              <p>{t.definition}</p>
            </article>
          ))}
          {!terms.length && (
            <p className="empty-message">No terms match “{query}”. Try another search.</p>
          )}
        </div>
      ) : (
        <div className="reference-table-wrap panel">
          <table className="reference-table">
            <thead>
              <tr>
                <th>Protocol</th>
                <th>Purpose</th>
                <th>OSI layer</th>
                <th>Port</th>
                <th>Explore</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className={`status-dot color-${p.color}`} />
                    <strong>{p.name}</strong>
                  </td>
                  <td>{p.fullName}</td>
                  <td>{p.layer}</td>
                  <td className="mono">{p.port}</td>
                  <td>
                    <button
                      aria-label={`Explore ${p.name}`}
                      className="icon-button"
                      onClick={() => onSelect(p)}
                    >
                      <ArrowUpRight size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!matches.length && <p className="empty-message">No protocols match “{query}”.</p>}
        </div>
      )}
      <div className="reference-footnote">
        OSI layers are a teaching model. Some protocols span layers; TLS’s layer 6 placement is
        approximate. Categories group related lessons: {categories.join(', ')}.
      </div>
    </div>
  );
}
