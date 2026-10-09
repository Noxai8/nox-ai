import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, Activity as ActivityIcon, Bike, Dumbbell, Waves, PersonStanding, CircleDot, Mountain, HeartPulse, Minus, Plus, CalendarDays, MessageSquarePlus, X } from 'lucide-react';
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
// MET indicatifs par activité et intensité. Ce calcul n'est jamais une mesure de capteur.
const MET_VALUES: Record<string, [number, number, number]> = {
  marche: [2.8, 3.8, 5], course: [6, 8.3, 11.5], velo: [4, 6.8, 10],
  football: [4, 7, 9], musculation: [3, 5, 6], natation: [4, 6, 9],
  padel: [3.5, 5.5, 7], tennis: [4, 7, 9], basket: [4.5, 6.5, 8],
  badminton: [3.5, 5.5, 7], boxe: [5, 7.8, 10], randonnee: [3.5, 5.3, 7],
  yoga: [2, 2.5, 3.5], etirements: [2, 2.3, 2.8], danse: [3, 5, 7],
};
function estimateCalories(sport: string, intensity: Intensity | '', duration: string, weight: string): number | null {
  const kg = Number(weight), minutes = Number(duration);
  const met = MET_VALUES[sport]?.[intensity === 'light' ? 0 : intensity === 'moderate' ? 1 : 2];
  if (!intensity || !met || !Number.isFinite(kg) || kg < 25 || kg > 350 || !Number.isFinite(minutes) || minutes <= 0 || minutes > 600) return null;
  return Math.round(met * 3.5 * kg / 200 * minutes);
}

export default function ActivityAdd() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const today = todayLocalDate();
  const yesterday = useMemo(() => { const d = new Date(); return localDateFromDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)); }, []);

  const initialSport = searchParams.get('sport') || '';
  const validInitialSport = searchActivities('').some(a => a.id === initialSport) ? initialSport : '';
  const [step, setStep] = useState<'pick' | 'form'>(validInitialSport ? 'form' : 'pick');
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<ActivityKind[]>([]);
  const [sport, setSport] = useState(validInitialSport);
  const [date, setDate] = useState(today);
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState<Intensity | ''>('');
  const [weightKg, setWeightKg] = useState('');
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
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
  const estimatedKcal = estimateCalories(sport, intensity, duration, weightKg);

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
            <section style={{ marginBottom: 30, padding: '6px 2px 0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:54, height:54, borderRadius:17, background:'rgba(200,255,0,.08)', border:'1px solid rgba(200,255,0,.18)', display:'grid', placeItems:'center', color:LIME }}>
                  {activityIcon(sport)}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:24, fontWeight:950, letterSpacing:'-.035em' }}>{sportLabel(sport)}</div>
                  <button onClick={() => setDate(date === today ? yesterday : today)} style={{ marginTop:5, padding:0, border:0, background:'transparent', color:SEC, display:'inline-flex', alignItems:'center', gap:6, fontSize:12, fontWeight:800, cursor:'pointer' }}>
                    <CalendarDays size={13}/>{date === today ? 'Aujourd’hui' : 'Hier'}
                  </button>
                </div>
                <button onClick={() => setStep('pick')} style={{ border:0, background:'transparent', color:LIME, fontSize:12, fontWeight:900, cursor:'pointer' }}>Changer</button>
              </div>
            </section>

            <section style={{ ...card, padding:'22px 18px 18px' }}>
              <div style={{ ...label, textAlign:'center', marginBottom:16 }}>DURÉE</div>
              <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'clamp(18px,5vw,42px)', marginBottom:18 }}>
                <button aria-label="Retirer 5 minutes" onClick={() => setDuration(String(Math.max(1, (Number(duration) || 30) - 5)))} style={{ width:46,height:46,borderRadius:15,border:`1px solid ${SOFT}`,background:CARD2,color:WHITE,display:'grid',placeItems:'center',cursor:'pointer' }}><Minus size={19}/></button>
                <div style={{ minWidth:150, textAlign:'center' }}>
                  <input aria-label="Durée en minutes" type="number" inputMode="numeric" min={1} max={600} value={duration} onChange={e=>setDuration(e.target.value)} placeholder="30"
                    style={{ width:100, padding:0, border:0, outline:'none', background:'transparent', color:WHITE, textAlign:'right', fontSize:46, lineHeight:1, fontWeight:950, letterSpacing:'-.06em' }} />
                  <span style={{ marginLeft:7, color:SEC, fontSize:15, fontWeight:850 }}>min</span>
                </div>
                <button aria-label="Ajouter 5 minutes" onClick={() => setDuration(String(Math.min(600, (Number(duration) || 25) + 5)))} style={{ width:46,height:46,borderRadius:15,border:`1px solid ${SOFT}`,background:CARD2,color:WHITE,display:'grid',placeItems:'center',cursor:'pointer' }}><Plus size={19}/></button>
              </div>
              <div style={{ display:'flex', justifyContent:'center', flexWrap:'wrap', gap:7 }}>
                {DURATION_PRESETS.slice(0,4).map(m => <button key={m} onClick={()=>setDuration(String(m))} style={{ ...choice(duration===String(m)), padding:'8px 13px', textAlign:'center' }}>{m}</button>)}
              </div>
            </section>

            <section style={{ margin:'28px 0' }}>
              <div style={{ ...label, marginLeft:2, marginBottom:10 }}>INTENSITÉ</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', padding:4, borderRadius:16, background:CARD2, border:`1px solid ${SOFT}`, gap:4 }}>
                {INTENSITIES.map(i => <button key={i} onClick={()=>setIntensity(i)} style={{ minHeight:48, border: intensity===i ? `1px solid ${LIME}`:'1px solid transparent', borderRadius:12, background:intensity===i?'rgba(200,255,0,.10)':'transparent', color:intensity===i?LIME:SEC, fontWeight:900, fontSize:12, cursor:'pointer' }}>{INTENSITY_UI[i].title}</button>)}
              </div>
              <div style={{ minHeight:18, marginTop:9, color:MUTED, fontSize:11, textAlign:'center', fontWeight:700 }}>{intensity ? INTENSITY_UI[intensity].detail : 'Choisis ton niveau d’effort'}</div>
            </section>

            <section style={{ ...card, background: '#131B15', borderColor: 'rgba(200,255,0,.24)' }}>
              <div style={{ ...label, color: LIME }}>CALORIES DÉPENSÉES · ESTIMATION</div>
              <p style={{ color: SEC, fontSize: 12, lineHeight: 1.5, margin: '0 0 12px' }}>Estimation basée sur l'activité, l'intensité, la durée et ton poids. Elle ne provient pas d'un capteur et peut varier sensiblement.</p>
              {MET_VALUES[sport] ? (
                <>
                  <label htmlFor="activity-weight" style={{ display: 'block', fontSize: 12, fontWeight: 850, marginBottom: 7 }}>Ton poids pour ce calcul (kg)</label>
                  <input id="activity-weight" type="number" inputMode="decimal" min={25} max={350} step="0.1" value={weightKg} onChange={e => setWeightKg(e.target.value)} placeholder="Ex. 75" style={{ width: '100%', boxSizing: 'border-box', height: 44, padding: '0 13px', borderRadius: 12, border: `1px solid ${SOFT}`, background: CARD2, color: WHITE, fontSize: 15, outline: 'none' }} />
                  <div aria-live="polite" style={{ fontSize: 26, fontWeight: 950, marginTop: 14, color: estimatedKcal == null ? SEC : LIME }}>{estimatedKcal == null ? '—' : `≈ ${estimatedKcal} kcal`}</div>
                  <div style={{ fontSize: 11, color: SEC, marginTop: 5 }}>{estimatedKcal == null ? 'Renseigne poids, durée et intensité pour afficher une estimation.' : 'ESTIMÉ · indicatif, non enregistré comme mesure'}</div>
                </>
              ) : <p style={{ color: SEC, fontSize: 12, margin: 0 }}>Pas d'estimation fiable disponible pour cette catégorie. NOX n'invente pas de calories.</p>}
            </section>

            {!noteOpen ? <button onClick={()=>setNoteOpen(true)} style={{ width:'100%', border:0, borderTop:`1px solid ${SOFT}`, borderBottom:`1px solid ${SOFT}`, background:'transparent', color:SEC, padding:'15px 2px', display:'flex', alignItems:'center', gap:9, fontSize:12, fontWeight:850, cursor:'pointer' }}><MessageSquarePlus size={16} color={LIME}/> Ajouter une note <span style={{marginLeft:'auto',color:MUTED}}>Facultatif</span></button> :
              <section style={{ ...card, position:'relative' }}>
                <button aria-label="Fermer la note" onClick={()=>{setNoteOpen(false);setNote('')}} style={{position:'absolute',right:12,top:12,border:0,background:'transparent',color:MUTED,cursor:'pointer'}}><X size={16}/></button>
                <div style={label}>NOTE</div>
                <textarea autoFocus value={note} onChange={e=>setNote(e.target.value.slice(0,MAX_NOTE))} rows={3} placeholder="Un détail à retenir…"
                  style={{width:'100%',boxSizing:'border-box',padding:12,borderRadius:12,border:`1px solid ${SOFT}`,background:CARD2,color:WHITE,fontSize:14,outline:'none',resize:'vertical',fontFamily:'inherit'}}/>
                <div style={{color:MUTED,fontSize:10,textAlign:'right',marginTop:4}}>{note.length}/{MAX_NOTE}</div>
              </section>}

            {error && <div style={{ color:'#E9C2C2', fontSize:12, marginTop:14 }}>{error}</div>}
            <div style={{ height:110 }} />
            <div style={{ position:'sticky', bottom:'calc(86px + env(safe-area-inset-bottom))', zIndex:15, padding:'12px 0', background:'linear-gradient(180deg, rgba(9,11,10,0), #090B0A 28%)' }}>
              <button onClick={save} disabled={!!errors.length || saving} style={{ width:'100%', padding:17, border:0, borderRadius:15, fontWeight:950, fontSize:13, letterSpacing:'.035em', background:errors.length?'#242825':LIME, color:errors.length?MUTED:BG, cursor:errors.length?'not-allowed':'pointer', boxShadow:errors.length?'none':'0 12px 32px rgba(200,255,0,.12)' }}>
                {saving ? 'ENREGISTREMENT…' : 'ENREGISTRER L’ACTIVITÉ'}
              </button>
              {errors.length > 0 && <div style={{ color:MUTED, fontSize:10, marginTop:7, textAlign:'center' }}>{errors[0]}</div>}
            </div>
          </>
        )}
      </main>
      <BottomNav active="home" />
    </div>
  );
}
