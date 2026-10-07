import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Activity as ActivityIcon, Bike, Dumbbell, Waves, PersonStanding, CircleDot, Mountain, HeartPulse } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { localDateFromDate, todayLocalDate } from '../lib/localDate';
import {
  INTENSITIES, MAX_NOTE, movementInsert, recentActivities, searchActivities,
  sportLabel, validateNewActivity, type ActivityKind, type Intensity, type MovementLogRow,
} from '../lib/nox/activity';
import { BottomNav } from './Home';

// ── /activity/new — ajout manuel dans movement_logs ──────────────────────────
// Seuls les champs réellement enregistrés sont affichés : activité, date, durée, intensité, note.

const BG = '#090B0A';
const CARD = '#232624';
const CARD2 = '#191C1A';
const BORDER = '#4A4F4B';
const SOFT = '#343835';
const WHITE = '#FFFFFF';
const SEC = '#A5AAA6';
const MUTED = '#747A76';
const LIME = '#C8FF00';

const INTENSITY_UI: Record<Intensity, { title: string; detail: string }> = {
  light: { title: 'Légère', detail: 'Confortable, tu peux parler' },
  moderate: { title: 'Modérée', detail: 'Effort soutenu, rythmé' },
  intense: { title: 'Intense', detail: 'Difficile, essoufflé' },
};
const DURATION_PRESETS = [15, 30, 45, 60, 90];

export default function ActivityAdd() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = todayLocalDate();
  const yesterday = useMemo(() => { const d = new Date(); return localDateFromDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)); }, []);

  const [step, setStep] = useState<'pick' | 'form'>('pick');
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<ActivityKind[]>([]);
  const [sport, setSport] = useState('');
  const [date, setDate] = useState(today);
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState<Intensity | ''>('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase.from('movement_logs').select('id, date, sport, duration_min, created_at')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => setRecent(recentActivities((data ?? []) as MovementLogRow[])));
  }, [user]);

  const results = searchActivities(query);
  const input = { sport, date, durationMin: duration, intensity, note };
  const errors = validateNewActivity(input, today, yesterday);

  const pick = (id: string) => { setSport(id); setError(''); setStep('form'); };

  const save = async () => {
    if (!user || saving || errors.length) return;
    setSaving(true); setError('');
    const { error: e } = await supabase.from('movement_logs').insert(movementInsert(user.id, input));
    setSaving(false);
    if (e) { setError('L’activité n’a pas pu être enregistrée. Réessaie.'); console.error('movement_logs:', e.message); return; }
    // Retour à Activité : la page recharge les vraies données, l'activité apparaît aussitôt
    navigate('/activity', { replace: true });
  };

  const card: React.CSSProperties = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 18, marginBottom: 14 };
  const label: React.CSSProperties = { color: MUTED, fontSize: 11, fontWeight: 900, letterSpacing: '.09em', marginBottom: 10 };
  const choice = (on: boolean): React.CSSProperties => ({
    padding: '12px 14px', borderRadius: 13, cursor: 'pointer', fontWeight: 900, fontSize: 13, textAlign: 'left',
    border: `1px solid ${on ? LIME : SOFT}`, background: on ? 'rgba(200,255,0,.08)' : CARD2, color: on ? LIME : WHITE,
  });
  const activityIcon = (id: string) => {
    if (id === 'marche' || id === 'randonnee') return <PersonStanding size={19} />;
    if (id === 'velo') return <Bike size={19} />;
    if (id === 'musculation') return <Dumbbell size={19} />;
    if (id === 'natation') return <Waves size={19} />;
    if (['football','basket','tennis','padel','badminton'].includes(id)) return <CircleDot size={19} />;
    if (id === 'yoga' || id === 'etirements') return <HeartPulse size={19} />;
    if (id === 'autre') return <Mountain size={19} />;
    return <ActivityIcon size={19} />;
  };
  const tile: React.CSSProperties = { ...choice(false), minHeight: 64, padding: '12px 14px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 12, transition: 'border-color .15s ease, transform .15s ease' };

  return (
    <div style={{ minHeight: '100dvh', background: BG, color: WHITE, paddingBottom: 'calc(220px + env(safe-area-inset-bottom))' }}>
      <main style={{ width: '100%', maxWidth: 900, margin: '0 auto', padding: '0 clamp(16px,3vw,28px)', boxSizing: 'border-box' }}>
        <header style={{ paddingTop: 44, paddingBottom: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => (step === 'form' ? setStep('pick') : navigate('/activity'))} aria-label="Retour"
            style={{ width: 42, height: 42, borderRadius: 14, border: `1px solid ${BORDER}`, background: CARD, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <ArrowLeft size={18} color={WHITE} />
          </button>
          <h1 style={{ margin: 0, fontSize: 'clamp(26px,5vw,36px)', fontWeight: 850, letterSpacing: '-.04em', lineHeight: 1 }}>
            {step === 'pick' ? 'Ajouter une activité' : 'Nouvelle activité'}
          </h1>
        </header>

        {step === 'pick' ? (
          <>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <Search size={16} color={MUTED} style={{ position: 'absolute', left: 14, top: 16 }} />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher une activité" aria-label="Rechercher une activité"
                style={{ width: '100%', boxSizing: 'border-box', height: 48, padding: '0 14px 0 40px', borderRadius: 14, border: `1px solid ${SOFT}`, background: CARD2, color: WHITE, fontSize: 15, fontWeight: 700, outline: 'none' }} />
            </div>

            {!query && recent.length > 0 && (
              <section style={card}>
                <div style={label}>ACTIVITÉS RÉCENTES</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {recent.map(r => <button key={r.id} onClick={() => pick(r.id)} style={{ ...choice(false), padding: '9px 13px', display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ color: LIME, display: 'grid' }}>{activityIcon(r.id)}</span>{r.label}</button>)}
                </div>
              </section>
            )}

            <section style={{ ...card, background: '#1D201E' }}>
              <div style={{ ...label, display:'flex', justifyContent:'space-between', alignItems:'center' }}><span>{query ? 'RÉSULTATS' : 'TOUTES LES ACTIVITÉS'}</span><span style={{color:SEC, letterSpacing:0, fontWeight:700}}>{results.length}</span></div>
              {results.length === 0 ? (
                <div style={{ color: SEC, fontSize: 13, lineHeight: 1.5 }}>
                  Aucune activité trouvée.
                  <button onClick={() => pick('autre')} style={{ display: 'block', marginTop: 8, padding: 0, border: 0, background: 'transparent', color: LIME, fontWeight: 900, fontSize: 13, cursor: 'pointer' }}>
                    Choisir « Autre activité » →
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                  {results.map(a => <button key={a.id} onClick={() => pick(a.id)} style={tile}><span style={{ width: 34, height: 34, borderRadius: 10, background: '#111513', display: 'grid', placeItems: 'center', color: LIME, flexShrink: 0 }}>{activityIcon(a.id)}</span><span>{a.label}</span></button>)}
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            <section style={card}>
              <div style={label}>ACTIVITÉ</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 18, fontWeight: 950 }}>{sportLabel(sport)}</span>
                <button onClick={() => setStep('pick')} style={{ border: 0, background: 'transparent', color: LIME, fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>Changer</button>
              </div>
            </section>

            <section style={card}>
              <div style={label}>DATE</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[[today, 'Aujourd’hui'], [yesterday, 'Hier']].map(([d, l]) => (
                  <button key={d} onClick={() => setDate(d)} style={{ ...choice(date === d), textAlign: 'center' }}>{l}</button>
                ))}
              </div>
            </section>

            <section style={card}>
              <div style={label}>DURÉE</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                {DURATION_PRESETS.map(m => (
                  <button key={m} onClick={() => setDuration(String(m))} style={{ ...choice(duration === String(m)), padding: '9px 14px' }}>{m} min</button>
                ))}
              </div>
              <input type="number" inputMode="numeric" min={1} max={600} value={duration} onChange={e => setDuration(e.target.value)} placeholder="Autre durée (minutes)"
                style={{ width: '100%', boxSizing: 'border-box', height: 46, padding: '0 14px', borderRadius: 12, border: `1px solid ${SOFT}`, background: CARD2, color: WHITE, fontSize: 15, fontWeight: 800, outline: 'none' }} />
            </section>

            <section style={card}>
              <div style={label}>INTENSITÉ</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {INTENSITIES.map(i => (
                  <button key={i} onClick={() => setIntensity(i)} style={choice(intensity === i)}>
                    <div style={{ fontSize: 14, fontWeight: 900 }}>{INTENSITY_UI[i].title}</div>
                    <div style={{ fontSize: 12, color: SEC, fontWeight: 700, marginTop: 3 }}>{INTENSITY_UI[i].detail}</div>
                  </button>
                ))}
              </div>
            </section>

            <section style={card}>
              <div style={label}>NOTE (FACULTATIVE)</div>
              <textarea value={note} onChange={e => setNote(e.target.value.slice(0, MAX_NOTE))} rows={3} placeholder="Ex : bonne séance avec des amis"
                style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 12, border: `1px solid ${SOFT}`, background: CARD2, color: WHITE, fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
              <div style={{ color: MUTED, fontSize: 11, textAlign: 'right', marginTop: 4 }}>{note.length}/{MAX_NOTE}</div>
            </section>

            {error && <div style={{ color: '#E9C2C2', fontSize: 13, marginBottom: 10 }}>{error}</div>}
            <button onClick={save} disabled={!!errors.length || saving}
              style={{ width: '100%', padding: 18, border: 0, borderRadius: 14, fontWeight: 800, fontSize: 15,
                background: errors.length ? '#2B2F2C' : LIME, color: errors.length ? MUTED : BG, cursor: errors.length ? 'not-allowed' : 'pointer' }}>
              {saving ? 'ENREGISTREMENT…' : 'ENREGISTRER'}
            </button>
            {errors.length > 0 && <div style={{ color: MUTED, fontSize: 12, marginTop: 8, textAlign: 'center' }}>{errors[0]}</div>}
            <div style={{ color: MUTED, fontSize: 11, marginTop: 12, lineHeight: 1.5, textAlign: 'center' }}>
              Activité déclarée. Elle n’ajoute aucun pas : tes pas viennent uniquement de leur propre relevé.
            </div>
          </>
        )}
      </main>
      <BottomNav active="home" />
    </div>
  );
}
