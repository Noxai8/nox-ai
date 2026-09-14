import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

export default function Partner() {
  const { user } = useAuth();
  const [myProfile, setMyProfile] = useState<any>(null);
  const [partnerCode, setPartnerCode] = useState('');
  const [partner, setPartner] = useState<any>(null);
  const [partnerStats, setPartnerStats] = useState<any>(null);
  const [myStats, setMyStats] = useState<any>(null);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle();
    setMyProfile(profile);

    // Générer un code partenaire unique basé sur l'ID
    const code = user!.id.slice(0, 8).toUpperCase();
    setPartnerCode(code);

    // Charger mes stats
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: workouts }, { data: prs }] = await Promise.all([
      supabase.from('workouts').select('id').eq('user_id', user!.id).eq('status', 'completed').gte('created_at', weekStart),
      supabase.from('personal_records').select('id').eq('user_id', user!.id),
    ]);
    setMyStats({
      weekWorkouts: workouts?.length || 0,
      totalPRs: prs?.length || 0,
      streak: profile?.streak_days || 0,
      xp: profile?.xp || 0,
    });

    // Charger le partenaire si déjà connecté
    if (profile?.partner_id) {
      loadPartner(profile.partner_id);
    }
  };

  const loadPartner = async (partnerId: string) => {
    const { data: p } = await supabase.from('profiles').select('*').eq('id', partnerId).maybeSingle();
    if (!p) return;
    setPartner(p);

    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: workouts }, { data: prs }] = await Promise.all([
      supabase.from('workouts').select('id').eq('user_id', partnerId).eq('status', 'completed').gte('created_at', weekStart),
      supabase.from('personal_records').select('id').eq('user_id', partnerId),
    ]);
    setPartnerStats({
      weekWorkouts: workouts?.length || 0,
      totalPRs: prs?.length || 0,
      streak: p?.streak_days || 0,
      xp: p?.xp || 0,
    });
  };

  const connectPartner = async () => {
    setError('');
    if (!input.trim()) return;
    const code = input.trim().toUpperCase();

    // Trouver le partenaire par son code (les 8 premiers chars de l'ID)
    const { data: allProfiles } = await supabase.from('profiles').select('id, display_name, xp, streak_days');
    const found = allProfiles?.find((p: any) => p.id.slice(0, 8).toUpperCase() === code && p.id !== user!.id);

    if (!found) {
      setError('Code invalide. Vérifie avec ton partenaire.');
      return;
    }

    // Connecter mutuellement
    await Promise.all([
      supabase.from('profiles').update({ partner_id: found.id }).eq('id', user!.id),
      supabase.from('profiles').update({ partner_id: user!.id }).eq('id', found.id),
    ]);

    setInput('');
    loadPartner(found.id);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(partnerCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const StatRow = ({ label, mine, theirs }: { label: string; mine: number; theirs: number }) => {
    const iWin = mine >= theirs;
    return (
      <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: iWin ? ACCENT : '#fff' }}>{mine}</div>
            <div style={{ fontSize: 11, color: '#555' }}>Toi</div>
          </div>
          <div style={{ fontSize: 18, color: '#333', fontWeight: 900 }}>VS</div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: !iWin ? ACCENT : '#fff' }}>{theirs}</div>
            <div style={{ fontSize: 11, color: '#555' }}>{partner?.display_name?.split(' ')[0] || 'Partenaire'}</div>
          </div>
        </div>
        {/* Barre comparative */}
        <div style={{ marginTop: 10, height: 4, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: Math.round((mine / Math.max(mine + theirs, 1)) * 100) + '%', background: ACCENT, borderRadius: 2, transition: 'width .5s' }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 80 }}>
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid ' + BORDER }}>
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em' }}>Transformation à deux</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>MODE PARTENAIRE</div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>

        {/* Mon code */}
        <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>TON CODE</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: ACCENT, letterSpacing: '.1em', flex: 1 }}>{partnerCode}</div>
            <button onClick={copyCode}
              style={{ padding: '10px 16px', background: copied ? ACCENT : 'transparent', border: '1px solid ' + (copied ? ACCENT : BORDER), borderRadius: 10, color: copied ? '#000' : '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
              {copied ? '✓ COPIÉ' : 'COPIER'}
            </button>
          </div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 8 }}>Partage ce code à ton partenaire d'entraînement</div>
        </div>

        {/* Connecter un partenaire */}
        {!partner && (
          <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 12 }}>CONNECTER UN PARTENAIRE</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                value={input} onChange={e => setInput(e.target.value.toUpperCase())}
                placeholder="CODE DE TON PARTENAIRE"
                maxLength={8}
                style={{ flex: 1, padding: '12px 14px', background: '#0d0d0d', border: '1px solid ' + BORDER, borderRadius: 10, color: '#fff', fontSize: 14, fontFamily: 'monospace', letterSpacing: '.1em', outline: 'none' }}
              />
              <button onClick={connectPartner}
                style={{ padding: '12px 16px', background: ACCENT, border: 'none', borderRadius: 10, color: '#000', fontWeight: 900, fontSize: 13, cursor: 'pointer' }}>
                LIER
              </button>
            </div>
            {error && <div style={{ fontSize: 12, color: '#ff4444', marginTop: 8 }}>{error}</div>}
          </div>
        )}

        {/* Stats comparaison */}
        {partner && partnerStats && myStats && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, textAlign: 'center', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '12px 8px' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{myProfile?.display_name?.split(' ')[0] || 'Toi'}</div>
                <div style={{ fontSize: 11, color: ACCENT, marginTop: 2 }}>{myStats.xp} XP</div>
              </div>
              <div style={{ fontSize: 20, color: '#333', fontWeight: 900 }}>⚡</div>
              <div style={{ flex: 1, textAlign: 'center', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '12px 8px' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{partner?.display_name?.split(' ')[0] || 'Partenaire'}</div>
                <div style={{ fontSize: 11, color: ACCENT, marginTop: 2 }}>{partnerStats.xp} XP</div>
              </div>
            </div>

            <StatRow label="Séances cette semaine" mine={myStats.weekWorkouts} theirs={partnerStats.weekWorkouts} />
            <StatRow label="Records totaux (PR)" mine={myStats.totalPRs} theirs={partnerStats.totalPRs} />
            <StatRow label="Streak actuel (jours)" mine={myStats.streak} theirs={partnerStats.streak} />
            <StatRow label="XP total" mine={myStats.xp} theirs={partnerStats.xp} />

            {/* Qui mène ? */}
            <div style={{ marginTop: 16, background: ACCENT + '11', border: '1px solid ' + ACCENT + '33', borderRadius: 14, padding: 16, textAlign: 'center' }}>
              {myStats.xp >= partnerStats.xp ? (
                <>
                  <div style={{ fontSize: 22 }}>🏆</div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: ACCENT, marginTop: 8 }}>TU MÈNES LA COURSE</div>
                  <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>+{myStats.xp - partnerStats.xp} XP d'avance — garde le rythme</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 22 }}>🔥</div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: '#ff6644', marginTop: 8 }}>
                    {partner?.display_name?.split(' ')[0]} MÈNE
                  </div>
                  <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
                    {partnerStats.xp - myStats.xp} XP de retard — rattrape-toi
                  </div>
                </>
              )}
            </div>

            <button onClick={async () => {
              await supabase.from('profiles').update({ partner_id: null }).eq('id', user!.id);
              setPartner(null); setPartnerStats(null);
            }} style={{ width: '100%', marginTop: 16, padding: 12, background: 'transparent', border: '1px solid #333', borderRadius: 12, color: '#555', fontSize: 12, cursor: 'pointer' }}>
              Déconnecter ce partenaire
            </button>
          </>
        )}
      </div>

      <BottomNav active="play" />
    </div>
  );
}
