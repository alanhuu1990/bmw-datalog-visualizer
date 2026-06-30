import { Link } from 'react-router-dom';
import pkg from '../../package.json';
import { changelogData } from '../lib/changelog';

const shellFont = "'IBM Plex Mono','Fira Code','Courier New',monospace";

function ReleaseCard({ release, highlight }) {
  return (
    <section style={{
      background: '#0d1117',
      border: `1px solid ${highlight ? '#4ade8066' : '#1f2937'}`,
      borderRadius: 8,
      padding: '16px 18px',
      marginBottom: 14,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: highlight ? '#4ade80' : '#f8fafc', margin: 0 }}>
          {release.version === 'Unreleased' ? 'Unreleased' : `v${release.version}`}
        </h2>
        {release.date && (
          <span style={{ fontSize: 10, color: '#6b7280' }}>{release.date}</span>
        )}
      </div>
      {release.sections.map(section => (
        <div key={section.title} style={{ marginBottom: section === release.sections.at(-1) ? 0 : 12 }}>
          <h3 style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#94a3b8',
            margin: '0 0 6px',
            letterSpacing: '0.08em',
          }}>
            {section.title.toUpperCase()}
          </h3>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: '#cbd5e1', lineHeight: 1.6 }}>
            {section.items.map(item => (
              <li key={item} style={{ marginBottom: 4 }}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

export default function ChangelogPage() {
  const { unreleased, releases } = changelogData;

  return (
    <div style={{
      background: '#090b10',
      minHeight: '100vh',
      color: '#e2e8f0',
      fontFamily: shellFont,
      padding: '16px 14px',
      maxWidth: 960,
      margin: '0 auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.15em', color: '#4ade80', marginBottom: 2 }}>
            CSV VISUALIZER
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', margin: 0 }}>Changelog</h1>
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>Current version: v{pkg.version}</div>
        </div>
        <Link
          to="/"
          style={{
            color: '#6b7280',
            fontSize: 11,
            textDecoration: 'none',
            border: '1px solid #1f2937',
            borderRadius: 6,
            padding: '5px 10px',
          }}
        >
          ← Back
        </Link>
      </div>

      {unreleased && <ReleaseCard release={unreleased} />}
      {releases.map((release, i) => (
        <ReleaseCard key={release.version} release={release} highlight={i === 0} />
      ))}
    </div>
  );
}
