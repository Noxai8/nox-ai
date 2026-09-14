import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const Section = ({ title, children }: any) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12, padding: '0 20px' }}>{title}</div>
      <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, overflow: 'hidden', margin: '0 20px' }}>{children}</div>
    </div>
  );

  const Row = ({ icon, label, value, onClick, danger = false }: any) => (
    <button onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', background: 'none', border: 'none', borderBottom: '1px solid ' + BORDER, cursor: onClick ? 'pointer' : 'default', textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 14, color: danger ? '#ff4444' : '#fff', fontWeight: 600 }}>{label}</span>
      </div>
      {value ? <span style={{ fontSize: 13, color: '#555' }}>{value}</span> : onClick ? <span style={{ color: '#333', fontSize: 16 }}>→</span> : null}
    </button>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 80 }}>
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid ' + BORDER }}>
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em' }}>Configuration</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>PARAMÈTRES</div>
      </div>

      <div style={{ paddingTop: 24 }}>
        <Section title="Compte">
          <Row icon="👤" label="Email" value={user?.email} />
          <Row icon="🔑" label="Changer le mot de passe" onClick={() => {}} />
        </Section>

        <Section title="App">
          <Row icon="🌙" label="Thème" value="Dark" />
          <Row icon="🇫🇷" label="Langue" value="Français" />
          <Row icon="⚖️" label="Unités" value="Métriques (kg, cm)" />
        </Section>

        <Section title="Abonnement">
          <Row icon="⚡" label="Plan actuel" value="NOX Gratuit" />
          <Row icon="🚀" label="Passer à NOX PRO" onClick={() => navigate('/subscribe')} />
        </Section>

        <Section title="Données">
          <Row icon="📊" label="Mon bilan hebdo" onClick={() => navigate('/weekly-review')} />
          <Row icon="🌙" label="Recovery & Wearables" onClick={() => navigate('/recovery')} />
          <Row icon="👥" label="Mode Partenaire" onClick={() => navigate('/partner')} />
          <Row icon="🏆" label="Mes achievements" onClick={() => navigate('/play')} />
        </Section>

        <Section title="Sécurité">
          <Row icon="🚪" label="Se déconnecter" onClick={logout} danger />
          <Row icon="🗑️" label="Supprimer mon compte" onClick={() => setShowDeleteConfirm(true)} danger />
        </Section>

        <div style={{ padding: '16px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#333' }}>NOX · Version 1.0.0</div>
          <div style={{ fontSize: 11, color: '#222', marginTop: 4 }}>Ton système d'exploitation physique</div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.9)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#0d0d0d', border: '1px solid #333', borderRadius: 20, padding: 28, maxWidth: 320, width: '100%' }}>
            <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', textAlign: 'center', marginBottom: 12 }}>Supprimer le compte ?</div>
            <div style={{ fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 24, lineHeight: 1.5 }}>
              Toutes tes données seront supprimées définitivement. Cette action est irréversible.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: 14, background: 'transparent', border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>ANNULER</button>
              <button onClick={async () => { await supabase.auth.signOut(); navigate('/'); }} style={{ flex: 1, padding: 14, background: '#ff4444', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 900, cursor: 'pointer' }}>SUPPRIMER</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="settings" />
    </div>
  );
}
