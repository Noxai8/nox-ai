import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Footprints, Plus, Activity as ActivityIcon, Dumbbell, Bike, Waves, PersonStanding } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { localDateFromDate, localDayStartISO, todayLocalDate } from '../lib/localDate';
import { HABIT_COLUMNS, type UserHabit } from '../lib/nox/habits';
import { stepsView } from '../lib/nox/steps';
import {
  activitiesForDay, INTENSITY_LABELS, ORIGIN_LABELS, summarize, weekSummary,
  type DatedStepsLog, type MovementLogRow, type WorkoutRow,
} from '../lib/nox/activity';
import { BottomNav } from './Home';

// ── /activity — lecture seule ────────────────────────────────────────────────
// Uniquement des données réellement enregistrées. Une donnée absente s'affiche « — ».

const BG = '#090B0A';
const CARD = '#232624';
const CARD2 = '#191C1A';
const BORDER = '#4A4F4B';
const SOFT = '#343835';
const WHITE = '#FFFFFF';
const SEC = '#A5AAA6';
const MUTED = '#747A76';
const LIME = '#C8FF00';

type Tab = 'day' | 'week';

/** Les 7 derniers jours locaux, du plus ancien à aujourd'hui */
function last7Days(): string[] {
  const now = new Date();
  return Array.from({ length: 7 }, (_, i) => localDateFromDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i))));
}

const fr = (n: number) => Math.round(n).toLocaleString('fr-FR');
const dayLabel = (key: string, today: string) => {
  if (key === today) return 'Aujourd’hui';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
};

export default function Activity() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('day');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [habits, setHabits] = useState<UserHabit[]>([]);
  const [stepsLogs, setStepsLogs] = useState<DatedStepsLog[]>([]);
  const [movement, setMovement] = useState<MovementLogRow[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);

  const days = useMemo(() => last7Days(), []);
  const today = todayLocalDate();

  useEffect(() => { if (user) void load(); }, [user]);

  const load = async () => {
    const first = days[0];
    const [h, l, m, w] = await Promise.all([
      supabase.from('user_habits').select(HABIT_COLUMNS).eq('user_id', user!.id).eq('active', true),
      supabase.from('habit_logs').select('habit_id, date, count, source').eq('user_id', user!.id).gte('date', first),
      supabase.from('movement_logs').select('id, date, sport, duration_min, intensity, note, created_at').eq('user_id', user!.id).gte('date', first),
      supabase.from('workouts').select('id, name, status, started_at, finished_at, duration_minutes, duration_min')
        .eq('user_id', user!.id).eq('status', 'completed').gte('finished_at', localDayStartISO(first)),
    ]);
    const firstError = h.error || l.error || m.error || w.error;
    if (firstError) setError(firstError.message);
    setHabits((h.data ?? []) as UserHabit[]);
    setStepsLogs(((l.data ?? []) as any[]).map(x => ({ habit_id: x.habit_id, date: x.date, count: Number(x.count), source: x.source ?? 'manual' })));
    setMovement((m.data ?? []) as MovementLogRow[]);
    setWorkouts((w.data ?? []) as WorkoutRow[]);
    setLoading(false);
  };

  const steps = stepsView(habits, stepsLogs.filter(l => l.date === today));
  const todayItems = activitiesForDay(today, movement, workouts);
  const todaySummary = summarize(todayItems);
  const week = weekSummary(days, habits, stepsLogs, movement, workouts);
  const weekActivities = week.reduce((s, d) => s + d.activities, 0);
  const weekKnownMinutes = week.filter(d => d.minutes != null);
  const weekMinutes = weekKnownMinutes.length ? weekKnownMinutes.reduce((s, d) => s + (d.minutes as number), 0) : null;

  const card: React.CSSProperties = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20, marginBottom: 14 };
  const label: React.CSSProperties = { color: MUTED, fontSize: 11, fontWeight: 900, letterSpacing: '.09em', marginBottom: 12 };
  const tag = (text: string, measured: boolean): React.CSSProperties => ({
    display: 'inline-flex', padding: '3px 8px', borderRadius: 999, fontSize: 9, fontWeight: 950, letterSpacing: '.07em',
    border: `1px solid ${measured ? 'rgba(200,255,0,.35)' : SOFT}`, color: measured ? LIME : SEC, whiteSpace: 'nowrap',
    ...(text ? {} : { display: 'none' }),
  });
  const metric = (title: string, value: string, hint?: string) => (
    <div style={{ background: CARD2, border: `1px solid ${SOFT}`, borderRadius: 14, padding: '14px 12px', minWidth: 0 }}>
      <div style={{ color: MUTED, fontSize: 10, fontWeight: 900, letterSpacing: '.07em' }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: '-.03em', marginTop: 6 }}>{value}</div>
      {hint && <div style={{ color: MUTED, fontSize: 10, marginTop: 4, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );

  const activityIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('musculation')) return <Dumbbell size={18} />;
    if (n.includes('vélo')) return <Bike size={18} />;
    if (n.includes('natation')) return <Waves size={18} />;
    if (n.includes('marche') || n.includes('randonnée')) return <PersonStanding size={18} />;
    return <ActivityIcon size={18} />;
  };

  return (
    <div style={{ minHeight: '100dvh', background: BG, color: WHITE, paddingBottom: 'calc(210px + env(safe-area-inset-bottom))' }}>
      <main style={{ width: '100%', maxWidth: 900, margin: '0 auto', padding: '0 clamp(16px,3vw,28px)', boxSizing: 'border-box' }}>
        <header style={{ paddingTop: 44, paddingBottom: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => navigate(-1)} aria-label="Retour"
            style={{ width: 42, height: 42, borderRadius: 14, border: `1px solid ${BORDER}`, background: CARD, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <ArrowLeft size={18} color={WHITE} />
          </button>
          <h1 style={{ margin: 0, fontSize: 'clamp(30px,5vw,40px)', fontWeight: 850, letterSpacing: '-.04em', lineHeight: 1 }}>Activité</h1>
        </header>

        <div role="tablist" style={{ display: 'inline-flex', gap: 4, padding: 4, borderRadius: 999, background: CARD2, border: `1px solid ${SOFT}`, marginBottom: 18 }}>
          {(['day', 'week'] as Tab[]).map(t => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              style={{ border: 0, borderRadius: 999, padding: '8px 18px', fontSize: 13, fontWeight: 900, cursor: 'pointer',
                background: tab === t ? LIME : 'transparent', color: tab === t ? BG : SEC }}>
              {t === 'day' ? 'Jour' : 'Semaine'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button onClick={() => navigate('/activity/new')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 15px', border: 0, borderRadius: 999, background: LIME, color: BG, fontWeight: 950, fontSize: 13, cursor: 'pointer', boxShadow: '0 8px 24px rgba(200,255,0,.12)' }}>
            <Plus size={16} strokeWidth={3} /> Ajouter une activité
          </button>
        </div>

        {error && <div style={{ ...card, borderColor: '#5A3A3A', color: '#E9C2C2', fontSize: 13 }}>{error}</div>}

        {loading ? <div style={{ color: MUTED }}>Chargement…</div> : tab === 'day' ? (
          <>
            {/* PAS — module unique steps.ts (même donnée que la Home et « Ta journée ») */}
            <section style={card}>
              <div style={label}>PAS</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                <div style={{ width: 118, height: 118, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center',
                  background: `conic-gradient(${LIME} ${steps.progress * 360}deg, #2A2E2C 0deg)` }}>
                  <div style={{ width: 98, height: 98, borderRadius: '50%', background: '#111513', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                    <div>
                      <Footprints size={16} color={LIME} />
                      <div style={{ fontSize: 24, fontWeight: 1000, letterSpacing: '-.04em', marginTop: 4 }}>{steps.count == null ? '—' : fr(steps.count)}</div>
                      <div style={{ fontSize: 11, fontWeight: 900, color: SEC }}>pas</div>
                    </div>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: 18, fontWeight: 950, color: steps.done ? LIME : WHITE }}>
                    {steps.count == null ? 'Aucun relevé aujourd’hui'
                      : steps.done ? 'Objectif atteint ✓'
                      : steps.target != null ? `${steps.percent} % de ton objectif`
                      : `${fr(steps.count)} pas aujourd’hui`}
                  </div>
                  <div style={{ color: SEC, fontSize: 13, marginTop: 6 }}>
                    {steps.target != null ? `Objectif : ${fr(steps.target)} pas` : steps.habit ? 'Aucune cible définie.' : 'Aucun objectif de pas configuré.'}
                  </div>
                  {steps.target != null && steps.count != null && (
                    <div style={{ height: 6, borderRadius: 999, background: SOFT, overflow: 'hidden', marginTop: 12 }}>
                      <div style={{ width: `${steps.percent}%`, height: '100%', background: LIME, borderRadius: 999 }} />
                    </div>
                  )}
                  {steps.sourceLabel && <div style={{ ...tag(steps.sourceLabel, steps.measured), marginTop: 12 }}>{steps.sourceLabel}</div>}
                </div>
              </div>
            </section>

            {/* ACTIVITÉ QUOTIDIENNE — aucune valeur estimée */}
            <section style={card}>
              <div style={label}>ACTIVITÉ QUOTIDIENNE</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                {metric('DISTANCE', '—', 'Non disponible')}
                {metric('MINUTES ACTIVES', todaySummary.activeMinutes == null ? '—' : `${todaySummary.activeMinutes} min`,
                  todaySummary.activeMinutes == null ? 'Aucune durée enregistrée' : todaySummary.partialMinutes ? 'Durées connues seulement' : undefined)}
                {metric('ACTIVITÉS', String(todaySummary.count))}
              </div>
            </section>

            {/* ACTIVITÉS DU JOUR */}
            <section style={card}>
              <div style={label}>ACTIVITÉS DU JOUR</div>
              {todayItems.length === 0 ? (
                <div style={{ color: SEC, fontSize: 13 }}>Aucune activité enregistrée aujourd’hui.</div>
              ) : todayItems.map((a, i) => (
                <div key={a.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderTop: i ? `1px solid ${SOFT}` : 'none' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: CARD2, border: `1px solid ${SOFT}`, display: 'grid', placeItems: 'center', color: LIME, flexShrink: 0 }}>
                    {activityIcon(a.label)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 900 }}>{a.label}</div>
                    <div style={{ color: SEC, fontSize: 12, marginTop: 3 }}>
                      {a.minutes == null ? 'Durée non disponible' : `${a.minutes} min`}
                      {a.intensity && INTENSITY_LABELS[a.intensity] ? ` · intensité ${INTENSITY_LABELS[a.intensity]}` : ''}
                    </div>
                  </div>
                  <span style={tag(ORIGIN_LABELS[a.origin], false)}>{ORIGIN_LABELS[a.origin]}</span>
                </div>
              ))}
            </section>
          </>
        ) : (
          <>
            {/* SEMAINE — uniquement des valeurs calculées à partir des données enregistrées */}
            <section style={card}>
              <div style={label}>7 DERNIERS JOURS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 16 }}>
                {metric('ACTIVITÉS', String(weekActivities))}
                {metric('DURÉE CONNUE', weekMinutes == null ? '—' : `${weekMinutes} min`, weekMinutes == null ? 'Aucune durée enregistrée' : undefined)}
              </div>
              {[...week].reverse().map((d, i) => (
                <div key={d.date} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderTop: i ? `1px solid ${SOFT}` : 'none', fontSize: 13 }}>
                  <span style={{ flex: '0 0 92px', color: SEC, textTransform: 'capitalize' }}>{dayLabel(d.date, today)}</span>
                  <span style={{ flex: 1, minWidth: 0, fontWeight: 900 }}>
                    {d.steps == null ? '— pas' : `${fr(d.steps)} pas`}
                    {d.stepsSource && <span style={{ ...tag(d.stepsSource, d.stepsSource.startsWith('MESURÉ')), marginLeft: 8 }}>{d.stepsSource}</span>}
                  </span>
                  <span style={{ color: SEC, whiteSpace: 'nowrap' }}>
                    {d.activities} activité{d.activities > 1 ? 's' : ''}{d.minutes != null ? ` · ${d.minutes} min` : ''}
                  </span>
                </div>
              ))}
              <div style={{ color: MUTED, fontSize: 11, marginTop: 10, lineHeight: 1.5 }}>
                Un jour sans relevé s’affiche « — » : il n’est jamais compté comme 0 pas.
              </div>
            </section>
          </>
        )}
      </main>
      <BottomNav active="home" />
    </div>
  );
}
