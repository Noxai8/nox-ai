import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const BG = '#050505';
const SURFACE = '#101010';
const BORDER = '#242424';
const MUTED = '#8a8a8a';

type VisualKey = 'bench' | 'squat' | 'row' | 'overhead' | 'pullup' | 'deadlift';
type Filter = 'Tous' | 'Pectoraux' | 'Dos' | 'Jambes' | 'Épaules' | 'Bras';

function exerciseVisualKey(name: string): VisualKey {
  const n = String(name || '').toLowerCase();

  if (n.includes('développé couché') || n.includes('developpe couche') || n.includes('bench')) return 'bench';
  if (n.includes('squat') || n.includes('fente') || n.includes('leg press') || n.includes('presse')) return 'squat';
  if (n.includes('rowing') || n.includes('row') || n.includes('tirage')) return 'row';
  if (n.includes('militaire') || n.includes('overhead') || n.includes('épaule') || n.includes('epaule')) return 'overhead';
  if (n.includes('traction') || n.includes('pull-up') || n.includes('pullup')) return 'pullup';
  if (n.includes('soulevé') || n.includes('souleve') || n.includes('deadlift') || n.includes('roumain') || n.includes('romanian') || n.includes('rdl')) return 'deadlift';
  if (n.includes('pompe') || n.includes('dips') || n.includes('pec') || n.includes('chest')) return 'bench';
  if (n.includes('curl') || n.includes('biceps')) return 'row';

  return 'overhead';
}

function exerciseFilterGroup(name: string, muscles = ''): Exclude<Filter, 'Tous'> {
  const text = `${name} ${muscles}`.toLowerCase();

  if (text.includes('pector') || text.includes('poitrine') || text.includes('bench') || text.includes('développé couché')) return 'Pectoraux';
  if (text.includes('dos') || text.includes('dors') || text.includes('rowing') || text.includes('traction') || text.includes('tirage')) return 'Dos';
  if (text.includes('quad') || text.includes('ischio') || text.includes('fess') || text.includes('jambe') || text.includes('squat') || text.includes('soulevé')) return 'Jambes';
  if (text.includes('épaule') || text.includes('epaule') || text.includes('delto')) return 'Épaules';

  return 'Bras';
}

function assetForExercise(exercise: any) {
  return `/exercise-demos/${exerciseVisualKey(exercise?.name || '')}.jpg`;
}

function muscleTags(exercise: any): string[] {
  const raw = String(exercise?.muscles || '');
  if (raw.trim()) {
    return raw
      .split(/[·,/]/)
      .map((s: string) => s.trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  const group = exerciseFilterGroup(exercise?.name || '', '');
  const fallback: Record<string, string[]> = {
    Pectoraux: ['Pectoraux', 'Triceps', 'Deltoïdes'],
    Dos: ['Dos', 'Biceps'],
    Jambes: ['Quadriceps', 'Fessiers', 'Ischios'],
    Épaules: ['Deltoïdes', 'Triceps'],
    Bras: ['Biceps', 'Triceps'],
  };

  return fallback[group] || ['Muscles ciblés'];
}

function defaultTechnique(exercise: any) {
  const key = exerciseVisualKey(exercise?.name || '');

  const map: Record<VisualKey, { description: string; steps: string[]; tip: string }> = {
    bench: {
      description: 'Mouvement de poussée horizontal. Garde les omoplates stables et contrôle la trajectoire sur toute l’amplitude.',
      steps: [
        'Allonge-toi avec les pieds bien ancrés au sol.',
        'Place les mains légèrement plus larges que les épaules.',
        'Descends la charge de façon contrôlée vers la poitrine.',
        'Pousse sans perdre la position des épaules.',
        'Garde une trajectoire régulière à chaque répétition.',
      ],
      tip: 'Contrôle la descente 2 à 3 secondes et garde une tension continue.',
    },
    squat: {
      description: 'Mouvement dominant genoux et hanches. Cherche une descente stable avec les genoux dans l’axe des pieds.',
      steps: [
        'Place les pieds de façon stable.',
        'Gainage fort avant de descendre.',
        'Descends les hanches en gardant les genoux dans l’axe.',
        'Atteins une profondeur confortable et contrôlée.',
        'Remonte en poussant le sol.',
      ],
      tip: 'Garde le pied entier au sol et évite de laisser les genoux rentrer vers l’intérieur.',
    },
    row: {
      description: 'Tirage horizontal orienté dos. Le coude se déplace vers la hanche sans rotation excessive du buste.',
      steps: [
        'Stabilise le tronc.',
        'Laisse le bras s’allonger sans perdre la posture.',
        'Tire le coude vers l’arrière.',
        'Marque une courte contraction.',
        'Reviens lentement à la position de départ.',
      ],
      tip: 'Pense à tirer avec le coude plutôt qu’avec la main.',
    },
    overhead: {
      description: 'Poussée verticale pour les épaules et les triceps. Le tronc reste gainé pendant toute la répétition.',
      steps: [
        'Place la charge au niveau des épaules.',
        'Serre les abdominaux et les fessiers.',
        'Pousse verticalement.',
        'Termine bras au-dessus de la tête.',
        'Redescends sous contrôle.',
      ],
      tip: 'Évite de compenser en cambrant fortement le bas du dos.',
    },
    pullup: {
      description: 'Tirage vertical pour le dos et les bras. Démarre chaque répétition depuis une position stable.',
      steps: [
        'Saisis la barre avec une prise confortable.',
        'Place les épaules basses et stables.',
        'Tire la poitrine vers la barre.',
        'Garde le corps sous contrôle.',
        'Redescends lentement.',
      ],
      tip: 'Évite le balancement et garde la descente aussi propre que la montée.',
    },
    deadlift: {
      description: 'Mouvement de charnière de hanches. Le dos reste neutre pendant que les hanches reculent puis reviennent.',
      steps: [
        'Place les pieds de façon stable.',
        'Recule les hanches en gardant le dos neutre.',
        'Garde la charge proche du corps.',
        'Pousse le sol et étends les hanches.',
        'Termine debout sans hyperextension.',
      ],
      tip: 'Le mouvement vient surtout des hanches, pas d’un arrondi du dos.',
    },
  };

  return map[key];
}

function searchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function Program() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [program, setProgram] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [tab, setTab] = useState<'plan' | 'exercises'>('plan');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('Tous');

  useEffect(() => {
    if (user) load();
  }, [user]);

  const load = async () => {
    const { data } = await supabase
      .from('workout_programs')
      .select('*')
      .eq('user_id', user!.id)
      .eq('is_active', true)
      .maybeSingle();

    setProgram(data);
    setLoading(false);
  };

  const sessions: any[] = program?.program_json?.sessions || [];
  const allExercises: any[] = sessions.flatMap((s: any) => s.exercises || []);
  const uniqueExercises = allExercises.filter(
    (e, i, arr) => arr.findIndex(x => x.name === e.name) === i,
  );
  const sessionLength = program?.program_json?.session_length_min || 60;

  const filteredExercises = useMemo(() => {
    return uniqueExercises.filter(ex => {
      const q = query.trim().toLowerCase();
      const matchesSearch = !q || `${ex.name} ${ex.muscles || ''}`.toLowerCase().includes(q);
      const matchesFilter = filter === 'Tous' || exerciseFilterGroup(ex.name, ex.muscles) === filter;
      return matchesSearch && matchesFilter;
    });
  }, [uniqueExercises, query, filter]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'grid', placeItems: 'center' }}>
        <div style={{ color: ACCENT, fontWeight: 950, letterSpacing: '.18em' }}>NOX TRAINING</div>
      </div>
    );
  }

  if (selectedExercise) {
    return (
      <ExerciseDetail
        exercise={selectedExercise}
        onBack={() => setSelectedExercise(null)}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#fff', paddingBottom: 112 }}>
      <main style={{ maxWidth: 560, margin: '0 auto' }}>
        <header
          style={{
            padding: '24px 20px 18px',
            background: 'radial-gradient(circle at 88% 0%, rgba(200,255,0,.08), transparent 30%), #070707',
            borderBottom: '1px solid rgba(255,255,255,.06)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 31, fontWeight: 1000, letterSpacing: '-.07em', lineHeight: .9 }}>NOX</div>
              <div style={{ fontSize: 8, letterSpacing: '.42em', marginTop: 7, color: '#bdbdbd', fontWeight: 800 }}>
                TRAINING
              </div>
            </div>

            <button
              onClick={() => navigate('/generate-program')}
              style={{
                border: `1px solid ${ACCENT}`,
                background: 'rgba(200,255,0,.04)',
                color: ACCENT,
                borderRadius: 999,
                padding: '11px 18px',
                fontSize: 11,
                fontWeight: 950,
                letterSpacing: '.04em',
                cursor: 'pointer',
              }}
            >
              NOUVEAU
            </button>
          </div>

          <div style={{ marginTop: 27 }}>
            <h1 style={{ margin: 0, fontSize: 29, lineHeight: 1, fontWeight: 1000, letterSpacing: '-.045em' }}>
              PROGRAMME
            </h1>
            <div style={{ marginTop: 7, color: '#a6a6a6', fontSize: 14 }}>
              {program?.name || 'Ton programme'} · {program?.days_per_week || sessions.length || 0} jours
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: '#111',
              padding: 4,
              borderRadius: 999,
              marginTop: 22,
              border: `1px solid ${BORDER}`,
            }}
          >
            {[
              { id: 'plan', label: 'PLAN' },
              { id: 'exercises', label: 'EXERCICES' },
            ].map(t => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id as 'plan' | 'exercises')}
                  style={{
                    border: active ? `1px solid ${ACCENT}` : '1px solid transparent',
                    borderRadius: 999,
                    padding: '11px 0',
                    cursor: 'pointer',
                    background: active ? 'rgba(200,255,0,.035)' : 'transparent',
                    color: active ? ACCENT : '#b2b2b2',
                    fontSize: 12,
                    fontWeight: 950,
                    letterSpacing: '.035em',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </header>

        {!program ? (
          <section style={{ padding: '70px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 1000 }}>TON PLAN COMMENCE ICI</div>
            <p style={{ color: MUTED, lineHeight: 1.6, fontSize: 13, maxWidth: 330, margin: '10px auto 26px' }}>
              NOX construit un programme selon ton objectif, ton niveau, ton matériel et tes disponibilités.
            </p>
            <button
              onClick={() => navigate('/generate-program')}
              style={{
                border: 'none',
                background: ACCENT,
                color: '#050505',
                borderRadius: 14,
                padding: '15px 22px',
                fontWeight: 950,
                cursor: 'pointer',
              }}
            >
              CRÉER MON PROGRAMME
            </button>
          </section>
        ) : (
          <section style={{ padding: '18px 20px 12px' }}>
            {tab === 'plan' && (
              <>
                <div
                  style={{
                    borderRadius: 20,
                    border: '1px solid rgba(200,255,0,.17)',
                    background: 'linear-gradient(135deg,#151515,#0c0c0c)',
                    padding: 18,
                    marginBottom: 18,
                  }}
                >
                  <div style={{ fontSize: 10, color: ACCENT, fontWeight: 950, letterSpacing: '.11em' }}>PLAN ACTIF</div>
                  <div style={{ fontSize: 19, fontWeight: 1000, marginTop: 7 }}>
                    {sessions.length} séances pour progresser cette semaine
                  </div>
                  <div style={{ color: MUTED, fontSize: 12.5, lineHeight: 1.55, marginTop: 8 }}>
                    {program.program_json?.progression_notes || 'Valide tes séries et laisse NOX suivre ta progression.'}
                  </div>
                </div>

                {sessions.map((session: any, si: number) => {
                  const open = selectedSession?.name === session.name;

                  return (
                    <div key={si} style={{ marginBottom: 12 }}>
                      <div
                        style={{
                          borderRadius: open ? '18px 18px 0 0' : 18,
                          border: `1px solid ${open ? 'rgba(200,255,0,.24)' : BORDER}`,
                          background: SURFACE,
                          padding: 16,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                          <button
                            onClick={() => setSelectedSession(open ? null : session)}
                            style={{
                              flex: 1,
                              border: 0,
                              background: 'transparent',
                              color: '#fff',
                              padding: 0,
                              textAlign: 'left',
                              cursor: 'pointer',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                              <span
                                style={{
                                  color: ACCENT,
                                  fontSize: 10,
                                  fontWeight: 950,
                                  background: 'rgba(200,255,0,.09)',
                                  padding: '5px 8px',
                                  borderRadius: 8,
                                }}
                              >
                                {session.day || `J${si + 1}`}
                              </span>
                              <span style={{ fontSize: 15, fontWeight: 950 }}>{session.name}</span>
                            </div>
                            <div style={{ marginTop: 8, fontSize: 11.5, color: MUTED }}>
                              {session.exercises?.length || 0} exercices · {session.duration || sessionLength} min
                            </div>
                          </button>

                          <button
                            onClick={() => navigate('/training/' + (session.id || si))}
                            style={{
                              border: 0,
                              borderRadius: 11,
                              background: ACCENT,
                              color: '#050505',
                              padding: '10px 13px',
                              fontSize: 10.5,
                              fontWeight: 950,
                              cursor: 'pointer',
                            }}
                          >
                            START
                          </button>

                          <button
                            onClick={() => setSelectedSession(open ? null : session)}
                            aria-label="Déplier"
                            style={{ border: 0, background: 'transparent', color: '#777', cursor: 'pointer', fontSize: 18 }}
                          >
                            {open ? '−' : '+'}
                          </button>
                        </div>
                      </div>

                      {open && (
                        <div
                          style={{
                            border: '1px solid rgba(200,255,0,.15)',
                            borderTop: 0,
                            background: '#0a0a0a',
                            borderRadius: '0 0 18px 18px',
                            overflow: 'hidden',
                          }}
                        >
                          {(session.exercises || []).map((ex: any, ei: number) => (
                            <ExerciseListRow
                              key={`${ex.name}-${ei}`}
                              exercise={ex}
                              onOpen={() => setSelectedExercise(ex)}
                              compact
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {tab === 'exercises' && (
              <>
                <div
                  style={{
                    height: 46,
                    borderRadius: 15,
                    border: `1px solid ${BORDER}`,
                    background: '#101010',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 14px',
                    gap: 10,
                    color: '#777',
                  }}
                >
                  {searchIcon()}
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Rechercher un exercice..."
                    style={{
                      flex: 1,
                      border: 0,
                      outline: 0,
                      background: 'transparent',
                      color: '#fff',
                      fontSize: 13,
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    overflowX: 'auto',
                    padding: '14px 0 4px',
                    scrollbarWidth: 'none',
                  }}
                >
                  {(['Tous', 'Pectoraux', 'Dos', 'Jambes', 'Épaules', 'Bras'] as Filter[]).map(item => {
                    const active = item === filter;
                    return (
                      <button
                        key={item}
                        onClick={() => setFilter(item)}
                        style={{
                          flexShrink: 0,
                          borderRadius: 999,
                          border: active ? `1px solid ${ACCENT}` : `1px solid ${BORDER}`,
                          background: active ? 'rgba(200,255,0,.06)' : '#0d0d0d',
                          color: active ? ACCENT : '#b0b0b0',
                          padding: '8px 13px',
                          fontSize: 11,
                          fontWeight: 850,
                          cursor: 'pointer',
                        }}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>

                <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.55, margin: '14px 0 12px' }}>
                  Ta bibliothèque actuelle : {uniqueExercises.length} exercices utilisés dans ton programme.
                </div>

                <div style={{ display: 'grid', gap: 9 }}>
                  {filteredExercises.map((ex: any, i: number) => (
                    <ExerciseListRow
                      key={`${ex.name}-${i}`}
                      exercise={ex}
                      onOpen={() => setSelectedExercise(ex)}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        )}
      </main>

      <BottomNav active="training" />
    </div>
  );
}

function ExerciseListRow({
  exercise,
  onOpen,
  compact = false,
}: {
  exercise: any;
  onOpen: () => void;
  compact?: boolean;
}) {
  const tags = muscleTags(exercise);

  return (
    <button
      onClick={onOpen}
      style={{
        width: '100%',
        display: 'grid',
        gridTemplateColumns: compact ? '78px 1fr auto' : '112px 1fr auto',
        gap: 12,
        alignItems: 'center',
        textAlign: 'left',
        border: compact ? 'none' : `1px solid ${BORDER}`,
        borderBottom: compact ? `1px solid ${BORDER}` : undefined,
        background: compact ? '#0a0a0a' : '#101010',
        color: '#fff',
        borderRadius: compact ? 0 : 16,
        padding: compact ? '12px 14px' : 7,
        cursor: 'pointer',
      }}
    >
      <img
        src={assetForExercise(exercise)}
        alt=""
        style={{
          width: '100%',
          height: compact ? 66 : 90,
          objectFit: 'cover',
          borderRadius: compact ? 11 : 12,
          border: '1px solid rgba(255,255,255,.07)',
          background: '#0a0a0a',
        }}
      />

      <div style={{ minWidth: 0, padding: compact ? '0 2px' : '2px 0' }}>
        <div
          style={{
            fontSize: compact ? 13 : 15,
            lineHeight: 1.12,
            fontWeight: 950,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {exercise.name}
        </div>

        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 7 }}>
          {tags.map(tag => (
            <span
              key={tag}
              style={{
                background: '#1a1a1a',
                borderRadius: 7,
                padding: '3px 7px',
                fontSize: 9.5,
                color: '#b6b6b6',
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        <div style={{ marginTop: 7, color: '#9b9b9b', fontSize: 10.5 }}>
          {exercise.sets || '3-4'} séries · {exercise.reps || '8-12'} reps · {exercise.rest || '90 sec'}
        </div>
      </div>

      <span style={{ fontSize: 27, color: '#efefef', paddingRight: 7, lineHeight: 1 }}>›</span>
    </button>
  );
}

function ExerciseDetail({
  exercise,
  onBack,
}: {
  exercise: any;
  onBack: () => void;
}) {
  const tags = muscleTags(exercise);
  const technique = defaultTechnique(exercise);
  const key = exerciseVisualKey(exercise.name || '');
  const isBench = key === 'bench';

  const description =
    exercise.description?.trim() ||
    technique.description;

  const steps =
    exercise.instructions?.trim()
      ? exercise.instructions
          .split(/\n|\. /)
          .map((s: string) => s.trim())
          .filter(Boolean)
          .slice(0, 5)
      : technique.steps;

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#fff', paddingBottom: 32 }}>
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '18px 18px 36px' }}>
        <button
          onClick={onBack}
          style={{
            border: 0,
            background: 'transparent',
            color: '#d5d5d5',
            padding: '6px 0',
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 27, lineHeight: 1 }}>‹</span>
          Retour au programme
        </button>

        <h1
          style={{
            margin: '15px 0 10px',
            fontSize: 'clamp(27px, 8vw, 38px)',
            lineHeight: .96,
            fontWeight: 1000,
            letterSpacing: '-.055em',
            textTransform: 'uppercase',
          }}
        >
          {exercise.name}
        </h1>

        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 13 }}>
          {tags.map(tag => (
            <span
              key={tag}
              style={{
                borderRadius: 999,
                padding: '6px 11px',
                background: 'rgba(200,255,0,.10)',
                color: ACCENT,
                fontSize: 10.5,
                fontWeight: 850,
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) 112px',
            gap: 10,
            alignItems: 'stretch',
          }}
        >
          <div
            style={{
              minHeight: 330,
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 17,
              border: `1px solid ${BORDER}`,
              background: '#0b0b0b',
            }}
          >
            <img
              src={isBench ? '/exercise-demos/bench-main.jpg' : assetForExercise(exercise)}
              alt={`Démonstration ${exercise.name}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />

            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to bottom, transparent 55%, rgba(0,0,0,.68))',
              }}
            />

            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%,-50%)',
                width: 58,
                height: 58,
                borderRadius: '50%',
                border: '3px solid #fff',
                background: 'rgba(0,0,0,.28)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 23,
              }}
            >
              ▶
            </div>

            <div style={{ position: 'absolute', left: 14, right: 14, bottom: 12 }}>
              <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,.35)' }}>
                <div style={{ width: '38%', height: '100%', borderRadius: 99, background: '#fff' }} />
              </div>
              <div style={{ marginTop: 7, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#fff' }}>
                <span>0:00 / 0:15</span>
                <span>◧</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 9 }}>
            <MiniVisual
              src={isBench ? '/exercise-demos/bench-high.jpg' : assetForExercise(exercise)}
              label="Position haute"
              active
            />
            <MiniVisual
              src={isBench ? '/exercise-demos/bench-low.jpg' : assetForExercise(exercise)}
              label="Position basse"
            />
            <MiniVisual
              src={isBench ? '/exercise-demos/bench-muscles.jpg' : assetForExercise(exercise)}
              label="Muscles ciblés"
              muscle
            />
          </div>
        </div>

        <section style={{ marginTop: 20 }}>
          <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 950 }}>Séries et répétitions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            <Metric value={exercise.sets || '4'} label="SÉRIES" />
            <Metric value={exercise.reps || '8-12'} label="RÉPÉTITIONS" />
            <Metric value={exercise.rest || '90 sec'} label="RÉCUPÉRATION" />
          </div>
        </section>

        <InfoCard title="Description technique">
          <div style={{ color: '#d3d3d3', fontSize: 12.5, lineHeight: 1.6 }}>
            {description}
          </div>
        </InfoCard>

        <InfoCard title="Instructions étape par étape">
          <div style={{ display: 'grid', gap: 9 }}>
            {steps.map((step: string, index: number) => (
              <div key={`${step}-${index}`} style={{ display: 'grid', gridTemplateColumns: '25px 1fr', gap: 9, alignItems: 'start' }}>
                <div
                  style={{
                    width: 25,
                    height: 25,
                    borderRadius: '50%',
                    background: ACCENT,
                    color: '#050505',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 11,
                    fontWeight: 1000,
                  }}
                >
                  {index + 1}
                </div>
                <div style={{ color: '#d7d7d7', fontSize: 12.5, lineHeight: 1.5 }}>
                  {step}
                </div>
              </div>
            ))}
          </div>
        </InfoCard>

        <div
          style={{
            marginTop: 12,
            border: `1px solid ${ACCENT}`,
            borderRadius: 15,
            padding: 15,
            display: 'grid',
            gridTemplateColumns: '32px 1fr',
            gap: 10,
            background: 'linear-gradient(135deg, rgba(200,255,0,.045), rgba(200,255,0,.01))',
          }}
        >
          <div style={{ fontSize: 24, color: ACCENT }}>💡</div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 950, color: ACCENT }}>Conseil NOX</div>
            <div style={{ marginTop: 4, color: '#d4d4d4', fontSize: 11.5, lineHeight: 1.5 }}>
              {technique.tip}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function MiniVisual({
  src,
  label,
  active = false,
  muscle = false,
}: {
  src: string;
  label: string;
  active?: boolean;
  muscle?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          height: 88,
          borderRadius: 12,
          overflow: 'hidden',
          border: active ? `2px solid ${ACCENT}` : `1px solid ${BORDER}`,
          background: '#111',
        }}
      >
        <img
          src={src}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: muscle ? 'saturate(.8) contrast(1.05)' : undefined,
          }}
        />
      </div>
      <div
        style={{
          marginTop: 5,
          fontSize: 9.5,
          textAlign: 'center',
          color: active || muscle ? ACCENT : '#b6b6b6',
          fontWeight: active || muscle ? 900 : 700,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div
      style={{
        minHeight: 76,
        borderRadius: 13,
        border: `1px solid ${BORDER}`,
        background: '#111',
        display: 'grid',
        placeItems: 'center',
        textAlign: 'center',
        padding: 8,
      }}
    >
      <div>
        <div style={{ fontSize: 21, fontWeight: 1000, lineHeight: 1.05 }}>{value}</div>
        <div style={{ marginTop: 6, fontSize: 8.5, color: '#8a8a8a', fontWeight: 850 }}>{label}</div>
      </div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: any }) {
  return (
    <section
      style={{
        marginTop: 11,
        borderRadius: 15,
        border: `1px solid ${BORDER}`,
        background: '#101010',
        padding: 15,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 950 }}>{title}</h3>
        <span style={{ color: '#fff', fontSize: 14 }}>⌃</span>
      </div>
      <div style={{ marginTop: 10 }}>{children}</div>
    </section>
  );
}
