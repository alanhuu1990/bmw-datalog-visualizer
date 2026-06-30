import { Link } from 'react-router-dom';

export default function ConfigButton() {
  return (
    <Link
      to="/settings"
      title="Settings"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: '1px solid #1f2937',
        borderRadius: 6,
        color: '#6b7280',
        padding: '5px 10px',
        fontSize: 11,
        fontFamily: 'inherit',
        fontWeight: 600,
        textDecoration: 'none',
        letterSpacing: '0.06em',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#374151'; }}
      onMouseLeave={e => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.borderColor = '#1f2937'; }}
    >
      ⚙ CONFIG
    </Link>
  );
}
