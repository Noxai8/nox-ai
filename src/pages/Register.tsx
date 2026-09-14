import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!email || !password) { setError('Remplis tous les champs.'); return; }
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signUp({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    navigate('/onboarding');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '.3em', color: '#c8ff00', textTransform: 'uppercase', marginBottom: 40, textAlign: 'center' }}>NOX</div>

        <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 8, letterSpacing: '-.025em' }}>Créer ton compte</h2>
        <p style={{ fontSize: 14, color: '#666', marginBottom: 32 }}>30 jours gratuits. Sans carte bancaire.</p>

        {error && <div style={{ background: '#1a0808', border: '1px solid #ff3b30', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#ff3b30', marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email"
            style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: '16px', fontSize: 15, color: '#fff', outline: 'none', width: '100%' }} />
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Mot de passe"
            onKeyDown={e => e.key === 'Enter' && handleRegister()}
            style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: '16px', fontSize: 15, color: '#fff', outline: 'none', width: '100%' }} />
          <button onClick={handleRegister} disabled={loading}
            style={{ background: '#c8ff00', color: '#0a0a0a', border: 'none', borderRadius: 12, padding: '16px', fontSize: 15, fontWeight: 900, cursor: 'pointer', marginTop: 8 }}>
            {loading ? 'Création...' : 'CRÉER MON COMPTE'}
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#444' }}>
          Déjà un compte ?{' '}
          <Link to="/login" style={{ color: '#c8ff00', textDecoration: 'none', fontWeight: 700 }}>Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
