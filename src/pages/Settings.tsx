import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';
import { ArrowLeft, ChevronRight } from 'lucide-react';

const ACCENT = '#C8FF00';
const BG     = '#F7F8F4';
const WHITE  = '#FFFFFF';
const BLACK  = '#0B0B0B';
const MUTED  = '#7A7F76';
const BORDER = '#E8EAE4';

const XP_LEVELS = [
  { level: 1, name: 'Débutant',    min: 0    },
  { level: 2, name: 'Régulier',    min: 200  },
  { level: 3, name: 'Confirmé',    min: 500  },
  { level: 4, name: 'Performant',  min: 1000 },
  { level: 5, name: 'Expert',      min: 2000 },
  { level: 6, name: 'Élite NOX',   min: 4000 },
];

function getLevel(xp: number) {
  let current = XP_LEVELS[0];
  for (const l of XP_LEVELS) { if (xp >= l.min) current = l; }
  const idx  = XP_LEVELS.indexOf(current);
  const next = XP_LEVELS[idx + 1];
  const pct  = next ? Math.round(((xp - current.min) / (next.min - current.min)) * 100) : 100;
  return { ...current, next, pct };
}

const GOAL_LABELS: Record<string, string> = {
  perdre_gras:     'Perte de gras',
  prendre_muscle:  'Prise de muscle',
  recomposition:   'Recomposition',
  force:           'Gain de force',
  performance:     'Performance',
  maintien:        'Maintien',
};

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile,     setProfile]     = useState<any>(null);
  const [stats,       setStats]       = useState({ workouts: 0, prs: 0, streak: 0 });
  const [editName,    setEditName]    = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [saving,      setSaving]      = useState(false);
  const [exporting,   setExporting]   = useState(false);
  const [showDelete,  setShowDelete]  = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    const [{ data: prof }, { data: wkts }, { data: prs }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle(),
      supabase.from('workouts').select('id').eq('user_id', user!.id).eq('status', 'completed'),
      supabase.from('personal_records').select('id').eq('user_id', user!.id),
    ]);
    setProfile(prof);
    setDisplayName(prof?.display_name || prof?.first_name || '');
    setStats({
      workouts: (wkts || []).length,
      prs:      (prs || []).length,
      streak:   prof?.streak_days || 0,
    });
  };

  const saveName = async () => {
    setSaving(true);
    await supabase.from('profiles').update({ display_name: displayName.trim() }).eq('id', user!.id);
    setSaving(false); setEditName(false);
    await load();
  };

  const exportData = async () => {
    setExporting(true);
    const [{ data: prof }, { data: wkts }, { data: food }, { data: body }, { data: prs }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle(),
      supabase.from('workouts').select('*').eq('user_id', user!.id),
      supabase.from('food_entries').select('*').eq('user_id', user!.id),
      supabase.from('body_logs').select('*').eq('user_id', user!.id),
      supabase.from('personal_records').select('*').eq('user_id', user!.id),
    ]);
    const blob = new Blob([JSON.stringify({
      exported_at: new Date().toISOString(),
      profile: prof, workouts: wkts, food_entries: food, body_logs: body, personal_records: prs,
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `nox-export-${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url); setExporting(false);
  };

  const deleteAccount = async () => {
    if (deleteInput !== 'SUPPRIMER') return;
    await Promise.all([
      supabase.from('food_entries').delete().eq('user_id', user!.id),
      supabase.from('workouts').delete().eq('user_id', user!.id),
      supabase.from('workout_sets').delete().eq('user_id', user!.id),
      supabase.from('body_logs').delete().eq('user_id', user!.id),
      supabase.from('personal_records').delete().eq('user_id', user!.id),
      supabase.from('profiles').delete().eq('id', user!.id),
    ]);
    await supabase.auth.signOut(); navigate('/');
  };

  const xp     = profile?.xp || 0;
  const level  = getLevel(xp);
  const goalLabel = GOAL_LABELS[profile?.goal_type] || profile?.goal_type || 'Transformation';

  const Row = ({ label, value, onClick, danger = false }: { label: string; value?: string; onClick?: () => void; danger?: boolean }) => (
    <button onClick={onClick} style={{
      width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '16px 0', background: 'none', border: 'none', borderBottom: `1px solid ${BORDER}`,
      cursor: onClick ? 'pointer' : 'default', textAlign: 'left',
    }}>
      <span style={{ fontSize: 15, fontWeight: 600, color: danger ? '#FF5C5C' : BLACK }}>{label}</span>
      {value
        ? <span style={{ fontSize: 13, color: MUTED, maxWidth: 180, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
        : onClick ? <ChevronRight size={16} color={MUTED} /> : null
      }
    </button>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.12em', marginBottom: 12 }}>{title}</div>
      <div style={{ background: WHITE, borderRadius: 20, padding: '0 18px', border: `1px solid ${BORDER}` }}>
        {children}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, color: BLACK, paddingBottom: 110 }}>
      <div style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
        <header style={{ padding: '22px 20px 0', marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.12em', marginBottom: 6 }}>MOI</div>
          <h1 style={{ margin: 0, fontSize: 36, fontWeight: 950, letterSpacing: '-.05em', lineHeight: .95 }}>TOI.</h1>
        </header>

        <main style={{ padding: '0 20px' }}>

          {/* PROFIL HERO */}
          <div style={{ background: BLACK, borderRadius: 24, padding: 22, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.1em', marginBottom: 6 }}>TON IDENTITE</div>
                {editName ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                      style={{ background: '#1a1a1a', border: `1px solid #333`, borderRadius: 10, padding: '8px 12px', color: WHITE, fontSize: 20, fontWeight: 950, outline: 'none', width: 160 }} />
                    <button onClick={saveName} style={{ padding: '8px 14px', background: ACCENT, border: 0, borderRadius: 10, color: BLACK, fontWeight: 900, fontSize: 12, cursor: 'pointer' }}>
                      {saving ? '...' : 'OK'}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setEditName(true)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ fontSize: 26, fontWeight: 950, color: WHITE, letterSpacing: '-.03em' }}>
                      {profile?.display_name || profile?.first_name || 'Mon profil'}
                    </div>
                  </button>
                )}
                <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>{user?.email}</div>
              </div>
              <div style={{ width: 52, height: 52, borderRadius: 18, background: ACCENT, display: 'grid', placeItems: 'center', fontWeight: 950, fontSize: 22, color: BLACK, flexShrink: 0 }}>
                {(profile?.display_name || profile?.first_name || 'N')[0].toUpperCase()}
              </div>
            </div>

            {/* Stats rapides */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
              {[
                { label: 'SÉANCES', v: stats.workouts },
                { label: 'RECORDS', v: stats.prs },
                { label: 'STREAK', v: `${stats.streak}j` },
              ].map(({ label, v }) => (
                <div key={label} style={{ background: '#1a1a1a', borderRadius: 14, padding: '12px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 950, color: WHITE }}>{v}</div>
                  <div style={{ fontSize: 8, color: MUTED, fontWeight: 700, marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* XP + niveau */}
            <div style={{ background: '#1a1a1a', borderRadius: 16, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: MUTED, fontWeight: 700 }}>NIV. {level.level} — {level.name.toUpperCase()}</div>
                  <div style={{ fontSize: 18, fontWeight: 950, color: WHITE, marginTop: 2 }}>{xp} XP</div>
                </div>
                {level.next && (
                  <div style={{ fontSize: 11, color: MUTED }}>{level.next.min - xp} XP → {level.next.name}</div>
                )}
              </div>
              <div style={{ height: 6, background: '#2a2a2a', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${level.pct}%`, background: ACCENT, borderRadius: 99, transition: 'width .4s' }} />
              </div>
            </div>
          </div>

          {/* DIRECTION */}
          <Section title="TA DIRECTION">
            <Row label="Objectif" value={goalLabel} onClick={() => navigate('/onboarding')} />
            <Row label="NOX Future" onClick={() => navigate('/future')} />
            <div style={{ borderBottom: 'none' }}>
              <Row label="Mon corps" value={profile?.weight_kg ? `${profile.weight_kg}kg` : undefined} onClick={() => navigate('/body')} />
            </div>
          </Section>

          {/* NUTRITION */}
          <Section title="NUTRITION">
            <Row label="Journal alimentaire" onClick={() => navigate('/fuel')} />
            <Row label="Mes recettes" onClick={() => navigate('/recipes')} />
            <Row label="Planifier la semaine" onClick={() => navigate('/meal-planner')} />
            <Row label="Liste de courses" onClick={() => navigate('/quick-groceries')} />
            <div style={{ borderBottom: 'none' }}>
              <Row label="Jeune intermittent" onClick={() => navigate('/fasting')} />
            </div>
          </Section>

          {/* ENTRAINEMENT */}
          <Section title="ENTRAINEMENT">
            <Row label="Mon programme" onClick={() => navigate('/program')} />
            <Row label="Calendrier" onClick={() => navigate('/training-calendar')} />
            <div style={{ borderBottom: 'none' }}>
              <Row label="Badges et progression" onClick={() => navigate('/play')} />
            </div>
          </Section>

          {/* SUIVI */}
          <Section title="SUIVI & RÉCUPÉRATION">
            <Row label="Progression" onClick={() => navigate('/progress')} />
            <Row label="Récupération" onClick={() => navigate('/recovery')} />
            <Row label="Sommeil" onClick={() => navigate('/sleep')} />
            <div style={{ borderBottom: 'none' }}>
              <Row label="Habitudes" onClick={() => navigate('/habits')} />
            </div>
          </Section>

          {/* ABONNEMENT */}
          <Section title="ABONNEMENT">
            <Row label="Plan actuel" value={profile?.subscription_plan === 'pro' ? 'NOX Pro' : 'Gratuit'} />
            <div style={{ borderBottom: 'none' }}>
              <Row label="Passer à NOX Pro" onClick={() => navigate('/subscribe')} />
            </div>
          </Section>

          {/* PREFERENCES */}
          <Section title="PREFERENCES">
            <Row label="Notifications" onClick={() => navigate('/notification-settings')} />
            <Row label="Politique de confidentialite" onClick={() => setShowPrivacy(true)} />
            <div style={{ borderBottom: 'none' }}>
              <Row label="Exporter mes donnees" value={exporting ? 'Export...' : undefined} onClick={exportData} />
            </div>
          </Section>

          {/* COMPTE */}
          <Section title="COMPTE">
            <Row label="Se deconnecter" onClick={async () => { await supabase.auth.signOut(); navigate('/'); }} />
            <div style={{ borderBottom: 'none', paddingBottom: 4 }}>
              <Row label="Supprimer mon compte" onClick={() => setShowDelete(true)} danger />
            </div>
          </Section>

          <div style={{ textAlign: 'center', fontSize: 10, color: '#C4C7C0', padding: '8px 0 20px' }}>
            NOX AI · noxai.fr
          </div>
        </main>
      </div>

      {/* MODAL CONFIDENTIALITE */}
      {showPrivacy && (
        <div onClick={() => setShowPrivacy(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, background: WHITE, borderRadius: '24px 24px 0 0', padding: '24px 24px max(32px,env(safe-area-inset-bottom))', boxSizing: 'border-box', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 22, fontWeight: 950, marginBottom: 20 }}>Confidentialite</div>
            {[
              { t: 'Donnees collectees', d: 'Uniquement les donnees que tu entres : poids, repas, seances, humeur. Aucune collecte automatique sans action explicite.' },
              { t: 'Stockage', d: 'Tes donnees sont stockees sur Supabase (AWS Europe). Jamais vendues a des tiers.' },
              { t: 'Intelligence artificielle', d: 'Tes donnees sont envoyees a Claude (Anthropic) uniquement lors des analyses. Anthropic ne conserve pas tes donnees apres le traitement.' },
              { t: 'Tes droits', d: 'Tu peux exporter ou supprimer toutes tes donnees a tout moment depuis ce menu.' },
            ].map(({ t, d }) => (
              <div key={t} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{t}</div>
                <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.6 }}>{d}</div>
              </div>
            ))}
            <button onClick={() => setShowPrivacy(false)} style={{ width: '100%', padding: 16, background: BLACK, border: 0, borderRadius: 16, color: ACCENT, fontWeight: 900, fontSize: 14, cursor: 'pointer', marginTop: 8 }}>Fermer</button>
          </div>
        </div>
      )}

      {/* MODAL SUPPRESSION */}
      {showDelete && (
        <div onClick={() => { setShowDelete(false); setDeleteInput(''); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, background: WHITE, borderRadius: '24px 24px 0 0', padding: '24px 24px max(32px,env(safe-area-inset-bottom))', boxSizing: 'border-box' }}>
            <div style={{ fontSize: 22, fontWeight: 950, color: '#FF5C5C', marginBottom: 8 }}>Supprimer mon compte</div>
            <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, marginBottom: 20 }}>
              Action irreversible. Toutes tes donnees seront definitvement supprimees : seances, repas, poids, photos, records.
            </div>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 8 }}>Tape <strong style={{ color: BLACK }}>SUPPRIMER</strong> pour confirmer :</div>
            <input value={deleteInput} onChange={e => setDeleteInput(e.target.value)} placeholder="SUPPRIMER"
              style={{ width: '100%', padding: '14px', background: BG, border: `1px solid ${BORDER}`, borderRadius: 14, color: BLACK, fontSize: 16, marginBottom: 16, outline: 'none', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowDelete(false); setDeleteInput(''); }}
                style={{ flex: 1, padding: 16, background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 14, color: BLACK, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={deleteAccount} disabled={deleteInput !== 'SUPPRIMER'}
                style={{ flex: 2, padding: 16, background: deleteInput === 'SUPPRIMER' ? '#FF5C5C' : '#eee', border: 'none', borderRadius: 14, color: deleteInput === 'SUPPRIMER' ? WHITE : MUTED, fontWeight: 900, fontSize: 14, cursor: deleteInput === 'SUPPRIMER' ? 'pointer' : 'not-allowed' }}>
                SUPPRIMER
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="moi" />
    </div>
  );
}
