import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';
import { ArrowLeft, Check, ChevronRight, CirclePause, Dumbbell, Moon } from 'lucide-react';

const ACCENT = '#C8FF00';
const BG = '#F7F8F4';
const WHITE = '#FFFFFF';
const BLACK = '#0B0B0B';
const MUTED = '#7A7F76';
const BORDER = '#E8EAE4';
const LIME = '#F0FFD0';

// Muscles par exercice — sans images
const MUSCLE_MAP: Record<string, string> = {
  bench: 'Pectoraux · Triceps · Epaules',
  squat: 'Quadriceps · Fessiers · Ischio',
  deadlift: 'Ischio · Lombaires · Fessiers',
  press: 'Epaules · Triceps',
  curl: 'Biceps · Avant-bras',
  row: 'Dos · Biceps · Trapèzes',
  pull: 'Dos · Biceps',
  dip: 'Triceps · Pectoraux',
  lunge: 'Quadriceps · Fessiers',
  plank: 'Abdominaux · Core',
  fly: 'Pectoraux',
  raise: 'Epaules',
  extension: 'Triceps',
  pushdown: 'Triceps',
  crunch: 'Abdominaux',
  hip: 'Fessiers · Ischio',
  calf: 'Mollets',
  leg: 'Jambes',
};

function getMuscles(name: string): string {
  const lower = (name || '').toLowerCase();

  for (const [key, val] of Object.entries(MUSCLE_MAP)) {
    if (lower.includes(key)) return val;
  }

  return 'Musculation';
}

type View = 'program' | 'session' | 'exercise';

export default function Program() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [program, setProgram] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<View>('program');
  const [selSession, setSelSession] = useState<any>(null);
  const [selEx, setSelEx] = useState<any>(null);
  const [completedWorkouts, setCompletedWorkouts] = useState<any[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(0);

  useEffect(() => {
    if (user) load();
  }, [user]);

  const load = async () => {
    if (!user) return;

    setLoading(true);

    const { data: prog, error } = await supabase
      .from('workout_programs')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Erreur chargement programme :', error);
    }

    setProgram(prog || null);

    const { data: completed } = await supabase
      .from('workouts')
      .select('id, name, status, finished_at, created_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('finished_at', { ascending: false });

    setCompletedWorkouts(completed || []);
    setLoading(false);
  };

  const sessions = program?.program_json?.sessions || [];

  const dayNames = [
    'Dimanche',
    'Lundi',
    'Mardi',
    'Mercredi',
    'Jeudi',
    'Vendredi',
    'Samedi',
  ];

  const todayName = dayNames[new Date().getDay()];

  const todaySession = sessions.find((s: any) =>
    String(s?.day || '')
      .toLowerCase()
      .includes(todayName.toLowerCase().slice(0, 3))
  );

  // ------------------------------------------------------
  // EXERCICE
  // ------------------------------------------------------

  if (view === 'exercise' && selEx) {
    const muscles = getMuscles(selEx.name);

    const tips: string[] = [
      'Garde le dos droit et les abdos contractes tout au long du mouvement.',
      'Controle la phase descendante — 2 secondes en descente minimum.',
      "Respire : expire a l'effort, inspire au retour.",
      'Si la technique se degrade, reduis la charge.',
    ];

    return (
      <div
        style={{
          minHeight: '100vh',
          background: BG,
          color: BLACK,
          paddingBottom: 110,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 560,
            margin: '0 auto',
          }}
        >
          <header
            style={{
              padding: '20px 20px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <button
              onClick={() => setView('session')}
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                border: `1px solid ${BORDER}`,
                background: WHITE,
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <ArrowLeft size={18} />
            </button>

            <div
              style={{
                fontSize: 11,
                fontWeight: 900,
                color: MUTED,
                letterSpacing: '.1em',
              }}
            >
              TECHNIQUE
            </div>
          </header>

          <main style={{ padding: '24px 20px 0' }}>
            <h1
              style={{
                margin: '0 0 6px',
                fontSize: 32,
                lineHeight: 0.95,
                fontWeight: 950,
                letterSpacing: '-.04em',
              }}
            >
              {selEx.name}
            </h1>

            <div
              style={{
                fontSize: 13,
                color: MUTED,
                marginBottom: 24,
              }}
            >
              {muscles}
            </div>

            {/* STATS RÉELLES */}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3,1fr)',
                gap: 10,
                marginBottom: 20,
              }}
            >
              {[
                {
                  label: 'SERIES',
                  v: selEx.sets || '—',
                },
                {
                  label: 'REPS',
                  v: selEx.reps || '—',
                },
                {
                  label: 'REPOS',
                  v: selEx.rest || '—',
                },
              ].map(({ label, v }) => (
                <div
                  key={label}
                  style={{
                    background: WHITE,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 16,
                    padding: '14px 0',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 950,
                      color: BLACK,
                    }}
                  >
                    {v}
                  </div>

                  <div
                    style={{
                      fontSize: 9,
                      color: MUTED,
                      fontWeight: 700,
                      marginTop: 3,
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* EXECUTION */}

            <div
              style={{
                background: BLACK,
                borderRadius: 24,
                padding: 28,
                marginBottom: 20,
                minHeight: 160,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  color: MUTED,
                  letterSpacing: '.12em',
                }}
              >
                EXECUTION
              </div>

              <div>
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 950,
                    color: WHITE,
                    lineHeight: 0.95,
                    letterSpacing: '-.04em',
                  }}
                >
                  {selEx.sets || '—'} × {selEx.reps || '—'}
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: '#888',
                    marginTop: 8,
                  }}
                >
                  {muscles}
                </div>
              </div>

              <div
                style={{
                  display: 'inline-block',
                  padding: '6px 12px',
                  background: ACCENT,
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 900,
                  color: BLACK,
                  alignSelf: 'flex-start',
                }}
              >
                Repos {selEx.rest || '—'}
              </div>
            </div>

            {/* TECHNIQUE */}

            <div
              style={{
                fontSize: 11,
                fontWeight: 900,
                color: MUTED,
                letterSpacing: '.1em',
                marginBottom: 12,
              }}
            >
              POINTS CLES
            </div>

            {tips.map((tip, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '12px 0',
                  borderBottom:
                    i < tips.length - 1
                      ? `1px solid ${BORDER}`
                      : 'none',
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 8,
                    background: LIME,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 11,
                    fontWeight: 900,
                    color: '#687600',
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: BLACK,
                    lineHeight: 1.55,
                  }}
                >
                  {tip}
                </div>
              </div>
            ))}

            {selEx.note && (
              <div
                style={{
                  marginTop: 16,
                  background: LIME,
                  border: '1px solid #DDF59C',
                  borderRadius: 16,
                  padding: '12px 16px',
                  fontSize: 13,
                  color: '#456000',
                  lineHeight: 1.55,
                }}
              >
                {selEx.note}
              </div>
            )}
          </main>
        </div>

        <BottomNav active="training" />
      </div>
    );
  }

  // ------------------------------------------------------
  // SESSION
  // ------------------------------------------------------

  if (view === 'session' && selSession) {
    const exos = selSession.exercises || [];
    const isToday = todaySession === selSession;

    const sessionDuration =
      selSession.duration ||
      program?.program_json?.session_length_min;

    return (
      <div
        style={{
          minHeight: '100vh',
          background: BG,
          color: BLACK,
          paddingBottom: 110,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 560,
            margin: '0 auto',
          }}
        >
          <header
            style={{
              padding: '20px 20px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <button
              onClick={() => setView('program')}
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                border: `1px solid ${BORDER}`,
                background: WHITE,
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <ArrowLeft size={18} />
            </button>

            <div
              style={{
                fontSize: 11,
                fontWeight: 900,
                color: MUTED,
                letterSpacing: '.1em',
              }}
            >
              SÉANCE
            </div>
          </header>

          <main style={{ padding: '24px 20px 0' }}>
            {/* HERO */}

            <div
              style={{
                background: BLACK,
                borderRadius: 28,
                padding: 22,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  color: MUTED,
                  letterSpacing: '.12em',
                  marginBottom: 8,
                }}
              >
                {isToday
                  ? "AUJOURD'HUI"
                  : (selSession.day || '').toUpperCase()}
              </div>

              <h1
                style={{
                  margin: '0 0 6px',
                  fontSize: 32,
                  lineHeight: 0.95,
                  fontWeight: 950,
                  color: WHITE,
                  letterSpacing: '-.04em',
                }}
              >
                {selSession.name}
              </h1>

              <div
                style={{
                  fontSize: 13,
                  color: '#888',
                  marginBottom: 20,
                }}
              >
                {exos.length} exercices
                {sessionDuration
                  ? ` · ${sessionDuration} min`
                  : ''}
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: MUTED,
                  marginBottom: 10,
                }}
              >
                OBJECTIF DE CETTE SÉANCE
              </div>

              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: WHITE,
                  lineHeight: 1.4,
                }}
              >
                {selSession.objective ||
                  selSession.focus ||
                  'Objectif non renseigné.'}
              </div>
            </div>

            {/* EXERCICES */}

            <div
              style={{
                fontSize: 11,
                fontWeight: 900,
                color: MUTED,
                letterSpacing: '.1em',
                marginBottom: 12,
              }}
            >
              {exos.length} EXERCICE
              {exos.length > 1 ? 'S' : ''}
            </div>

            {exos.map((ex: any, i: number) => (
              <button
                key={i}
                onClick={() => {
                  setSelEx(ex);
                  setView('exercise');
                }}
                style={{
                  width: '100%',
                  background: WHITE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 18,
                  padding: '16px 18px',
                  marginBottom: 10,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 9,
                        background: BG,
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 11,
                        fontWeight: 900,
                        color: MUTED,
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </div>

                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: BLACK,
                      }}
                    >
                      {ex.name}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      marginLeft: 38,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: MUTED,
                      }}
                    >
                      {ex.sets || '—'} × {ex.reps || '—'}
                    </span>

                    <span
                      style={{
                        fontSize: 11,
                        color: '#C4C7C0',
                      }}
                    >
                      ·
                    </span>

                    <span
                      style={{
                        fontSize: 11,
                        color: MUTED,
                      }}
                    >
                      {getMuscles(ex.name)}
                    </span>
                  </div>
                </div>

                <ChevronRight size={16} color={MUTED} />
              </button>
            ))}

            {/* COMMENCER */}

            <button
              onClick={() => {
                const idx = sessions.findIndex(
                  (s: any) => s === selSession
                );

                navigate(
                  `/training/${selSession.id || idx}`
                );
              }}
              style={{
                width: '100%',
                padding: '18px 0',
                background: ACCENT,
                border: 0,
                borderRadius: 20,
                color: BLACK,
                fontSize: 14,
                fontWeight: 950,
                cursor: 'pointer',
                marginTop: 8,
                letterSpacing: '.02em',
              }}
            >
              COMMENCER →
            </button>
          </main>
        </div>

        <BottomNav active="training" />
      </div>
    );
  }

  // ------------------------------------------------------
  // LOADING
  // Helpers semaine
  const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  const startOfWeek = (date = new Date()) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const localDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const currentWeekStart = startOfWeek();
  const visibleWeekStart = new Date(currentWeekStart);
  visibleWeekStart.setDate(currentWeekStart.getDate() + selectedWeek * 7);
  const todayKey = localDateKey(new Date());

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(visibleWeekStart);
    date.setDate(visibleWeekStart.getDate() + index);
    return { date, key: localDateKey(date), short: DAY_NAMES[date.getDay()], number: date.getDate() };
  });

  const workoutDateKey = (workout: any) => {
    const raw = workout.finished_at || workout.created_at;
    if (!raw) return null;
    return localDateKey(new Date(raw));
  };

  const isCompletedOnDate = (session: any, dateKey: string) => {
    return completedWorkouts.some(workout => {
      if (workoutDateKey(workout) !== dateKey) return false;
      if (workout.session_id && session.id && String(workout.session_id) === String(session.id)) return true;
      return Boolean(workout.name && session.name && workout.name.trim().toLowerCase() === session.name.trim().toLowerCase());
    });
  };

  // ------------------------------------------------------

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: BG,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 950,
            letterSpacing: '-.04em',
            color: BLACK,
          }}
        >
          NOX
          <span style={{ color: '#9ED100' }}>.</span>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------
  // PROGRAMME
  // ------------------------------------------------------

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF6', color: '#090909', paddingBottom: 100 }}>
      <main style={{ width: '100%', maxWidth: 600, margin: '0 auto', padding: '26px 20px 20px' }}>

        {/* HEADER */}
        <header style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 850, color: '#656A61', letterSpacing: '.03em', marginBottom: 3 }}>ENTRAÎNEMENT</div>
          <h1 style={{ margin: 0, fontSize: 40, lineHeight: .94, fontWeight: 1000, letterSpacing: '-.055em' }}>MON PROGRAMME</h1>
        </header>

        {/* SEMAINES */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 16 }}>
          {[0, 1, 2, 3].map(week => {
            const active = selectedWeek === week;
            return (
              <button key={week} onClick={() => setSelectedWeek(week)} style={{ flex: '0 0 auto', border: 0, borderRadius: 999, padding: '11px 16px', background: active ? '#E9FFC5' : 'transparent', color: active ? '#111' : '#999D94', fontSize: 13, fontWeight: active ? 950 : 750, cursor: 'pointer' }}>
                Semaine {week + 1}
              </button>
            );
          })}
        </div>

        {/* PAS DE PROGRAMME */}
        {!program && (
          <div style={{ background: '#fff', border: '1px solid #ECEDE8', borderRadius: 20, padding: 24, textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 8 }}>Pas encore de programme</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>Génère ton programme personnalisé avec NOX.</div>
            <button onClick={() => navigate('/generate-program')} style={{ padding: '12px 24px', background: '#090909', border: 0, borderRadius: 14, color: '#C8FF00', fontWeight: 900, fontSize: 13, cursor: 'pointer' }}>
              CRÉER MON PROGRAMME
            </button>
          </div>
        )}

        {/* PLANNING */}
        {program && (
          <div style={{ display: 'grid', gap: 8 }}>
            {weekDays.map((day, index) => {
              const session = sessions?.[index];
              const isToday = day.key === todayKey;
              const completed = session ? isCompletedOnDate(session, day.key) : false;
              const isRecovery = session ? /récup|recup|mobilité|mobilite/i.test(session.name || '') : false;
              const isRest = !session;

              return (
                <button
                  key={day.key}
                  onClick={() => {
                    if (!session) return;
                    const idx = sessions.findIndex((s: any) => s === session);
                    navigate(`/training/${session.id ?? idx}`);
                  }}
                  disabled={isRest}
                  style={{
                    width: '100%', display: 'grid', gridTemplateColumns: '64px 52px 1fr 38px',
                    alignItems: 'center', gap: 10, padding: '8px 10px 8px 8px',
                    border: isToday ? '1px solid #DFFF9C' : '1px solid #ECEDE8',
                    borderRadius: 20,
                    background: isToday ? '#EEFFD0' : '#FFFFFF',
                    boxShadow: isToday ? '0 4px 18px rgba(184,255,0,.08)' : '0 2px 12px rgba(0,0,0,.025)',
                    cursor: isRest ? 'default' : 'pointer',
                    textAlign: 'left', color: '#090909', boxSizing: 'border-box',
                  }}
                >
                  <div style={{ height: 66, borderRadius: 17, border: isToday ? '1px solid #D9F89C' : '1px solid #ECEDE8', background: isToday ? '#F3FFD9' : '#FFF', display: 'grid', placeItems: 'center', alignContent: 'center', gap: 2 }}>
                    <div style={{ fontSize: 11, fontWeight: 750, color: '#747970' }}>{day.short}</div>
                    <div style={{ fontSize: 16, fontWeight: 1000 }}>{day.number}</div>
                  </div>
                  <div style={{ width: 50, height: 50, borderRadius: '50%', display: 'grid', placeItems: 'center', background: completed ? '#E7FFD9' : isRecovery ? '#F1F0EA' : isRest ? '#F5F5F3' : index % 3 === 0 ? '#FFEAEA' : index % 3 === 1 ? '#FFF5DF' : '#EBFFD8' }}>
                    {isRecovery ? <Moon size={22} strokeWidth={2.3} /> : isRest ? <CirclePause size={22} strokeWidth={2.3} color="#aaa" /> : <Dumbbell size={23} strokeWidth={2.5} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 16, lineHeight: 1.1, fontWeight: 950, letterSpacing: '-.025em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {session?.name || 'Repos'}
                    </div>
                    {session && (
                      <div style={{ marginTop: 5, fontSize: 11, lineHeight: 1.2, fontWeight: 650, color: '#858A80' }}>
                        {session.duration_minutes ? `${session.duration_minutes} min` : ''}
                        {session.duration_minutes && session.exercises?.length ? ' • ' : ''}
                        {session.exercises?.length ? `${session.exercises.length} exercices` : ''}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'grid', placeItems: 'center', justifySelf: 'end' }}>
                    {completed ? (
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#B9F5A7', display: 'grid', placeItems: 'center' }}>
                        <Check size={20} strokeWidth={3} />
                      </div>
                    ) : !isRest ? (
                      <ChevronRight size={25} strokeWidth={2.5} color="#444940" />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}

      </main>
      <BottomNav active="training" />
    </div>
  );
}
