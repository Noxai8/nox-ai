import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
      {/* Logo */}
      <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '.3em', color: '#c8ff00', textTransform: 'uppercase', marginBottom: 48 }}>NOX</div>

      {/* Hero */}
      <h1 style={{ fontSize: 'clamp(36px, 8vw, 72px)', fontWeight: 900, lineHeight: 1, letterSpacing: '-.04em', color: '#fff', marginBottom: 24, maxWidth: 600 }}>
        DEVIENS LA VERSION<br />
        <span style={{ color: '#c8ff00' }}>DE TOI</span><br />
        QUE TU VEUX CONSTRUIRE.
      </h1>

      <p style={{ fontSize: 15, color: '#666', maxWidth: 400, lineHeight: 1.6, marginBottom: 48 }}>
        Ton coach IA personnel. Programme, nutrition, transformation — tout s'adapte à toi.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
        <button
          onClick={() => navigate('/register')}
          style={{ background: '#c8ff00', color: '#0a0a0a', border: 'none', borderRadius: 14, padding: '18px', fontSize: 15, fontWeight: 900, cursor: 'pointer', letterSpacing: '.05em' }}>
          COMMENCER
        </button>
        <button
          onClick={() => navigate('/login')}
          style={{ background: 'transparent', color: '#fff', border: '1px solid #333', borderRadius: 14, padding: '18px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
          J'AI DÉJÀ UN COMPTE
        </button>
      </div>

      <div style={{ marginTop: 60, display: 'flex', gap: 32, fontSize: 12, color: '#444' }}>
        <span>TRAINING</span>
        <span>BODY</span>
        <span>FUEL</span>
        <span>COACH</span>
        <span>PLAY</span>
      </div>
    </div>
  );
}
