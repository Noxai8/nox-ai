import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

export default function RestDay() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [claimed, setClaimed] = useState(false);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      .then(({ data }) => {
        setProfile(data);
        // Vérifier si le repos a déjà été revendiqué aujourd'hui
        const today = new Date().toISOString().split('T')[0];
        if (data?.last_rest_claimed === today) setAlreadyClaimed(true);
      });
  }, [user]);

  const claimRestXP = async () => {
    const today = new Date().toISOString().split('T')[0];
    const restXP = 25; // Repos = 25 XP (vs 50 pour séance)
    await supabase.from('profiles').update({
      xp: (profile?.xp || 0) + restXP,
      last_rest_claimed: today,
    }).eq('id', user!.id);
    setClaimed(true);
  };

  const tips = [
    { icon: '💧', text: 'Hydrate-toi bien — vise 2-3L d\'eau' },
    { icon: '😴', text: 'Le muscle se construit pendant le repos, pas pendant l\'entraînement' },
    { icon: '🥗', text: 'Continue à tracker ta nutrition — les protéines restent importantes' },
    { icon: '🚶', text: 'Une marche légère favorise la récupération active' },
    { icon: '🧘', text: 'Étirements ou mobilité — 10 minutes suffisent' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 72, marginBottom: 24 }}>🌙</div>
      <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.15em', marginBottom: 8 }}>Plan du jour</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-.02em', marginBottom: 12 }}>
        JOUR DE RÉCUPÉRATION
      </div>
      <div style={{ fontSize: 15, color: '#555', lineHeight: 1.6, marginBottom: 32, maxWidth: 300 }}>
        Le repos fait partie du programme. Ton corps reconstruit et progresse pendant la récupération.
      </div>

      {/* XP Récupération */}
      {!alreadyClaimed && !claimed ? (
        <button onClick={claimRestXP}
          style={{ background: ACCENT + '22', border: '1px solid ' + ACCENT + '66', borderRadius: 16, padding: '16px 28px', cursor: 'pointer', marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: ACCENT }}>+25 XP — VALIDER MON REPOS</div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Le repos planifié mérite son XP</div>
        </button>
      ) : (
        <div style={{ background: ACCENT + '11', border: '1px solid ' + ACCENT + '33', borderRadius: 16, padding: '14px 24px', marginBottom: 32 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: ACCENT }}>
            {claimed ? '✓ +25 XP encaissés 💪' : '✓ Repos validé aujourd\'hui'}
          </div>
        </div>
      )}

      {/* Tips récupération */}
      <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
        {tips.map(({ icon, text }) => (
          <div key={text} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
            <span style={{ fontSize: 13, color: '#888', lineHeight: 1.4 }}>{text}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 340 }}>
        <button onClick={() => navigate('/fuel')}
          style={{ flex: 1, padding: 14, background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          🥗 FUEL
        </button>
        <button onClick={() => navigate('/body')}
          style={{ flex: 1, padding: 14, background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          📊 BODY
        </button>
        <button onClick={() => navigate('/home')}
          style={{ flex: 1, padding: 14, background: ACCENT, border: 'none', borderRadius: 12, color: '#000', fontWeight: 900, fontSize: 13, cursor: 'pointer' }}>
          HOME
        </button>
      </div>
    </div>
  );
}
