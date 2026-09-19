import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from '../components/BottomNav';
import {
  getNoxExerciseCoachTips,
  getNoxExerciseHdCover,
  getNoxExerciseMuscles,
  getNoxExerciseSteps,
  getNoxExerciseThumbnail,
  resolveNoxExercise,
} from '../lib/noxExercises';

const ACCENT = '#B7FF00';
const BG = '#F7F7F5';
const SURFACE = '#FFFFFF';
const BORDER = '#E4E4DF';
const MUTED = '#77776F';

type Filter = 'Tous' | 'Pectoraux' | 'Dos' | 'Jambes' | 'Épaules' | 'Bras';

function resolvedNoxExercise(exercise: any) {
  return resolveNoxExercise({
    exercise_id: exercise?.exercise_id,
    id: exercise?.id,
    name: exercise?.name,
    exercise_name: exercise?.exercise_name,
  });
}

function exerciseFilterGroup(exercise: any): Exclude<Filter, 'Tous'> {
  const nox = resolvedNoxExercise(exercise);
  const primary = nox?.muscles?.primary || [];
  const secondary = nox?.muscles?.secondary || [];
  const stabilizers = nox?.muscles?.stabilizers || [];
  const text = `${nox?.name || exercise?.name || ''} ${[...primary, ...secondary, ...stabilizers].join(' ')}`.toLowerCase();

  if (nox?.category === 'legs') return 'Jambes';

  if (
    text.includes('pector') ||
    text.includes('poitrine') ||
    text.includes('bench') ||
    text.includes('chest')
  ) return 'Pectoraux';

  if (
    text.includes('dos') ||
    text.includes('dors') ||
    text.includes('rhombo') ||
    text.includes('trapè') ||
    text.includes('trape') ||
    text.includes('rowing') ||
    text.includes('traction') ||
    text.includes('tirage')
  ) return 'Dos';

  if (
    text.includes('épaule') ||
    text.includes('epaule') ||
    text.includes('delto')
  ) return 'Épaules';

  if (nox?.category === 'push') {
    if (
      text.includes('triceps') &&
      !text.includes('pector') &&
      !text.includes('delto')
    ) return 'Bras';

    return 'Épaules';
  }

  if (nox?.category === 'pull') return 'Bras';

  return 'Bras';
}

function muscleTags(exercise: any): string[] {
  const nox = resolvedNoxExercise(exercise);

  if (nox) {
    const muscles = getNoxExerciseMuscles(nox.id);
    const tags = [
      ...muscles.primary,
      ...muscles.secondary,
      ...muscles.stabilizers,
    ].filter(Boolean);

    return Array.from(new Set(tags)).slice(0, 3);
  }

  const raw = String(exercise?.muscles || '');
  if (raw.trim()) {
    return raw
      .split(/[·,/]/)
      .map((s: string) => s.trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  return ['Muscles ciblés'];
}

function exerciseTechnique(exercise: any) {
  const nox = resolvedNoxExercise(exercise);

  if (!nox) {
    return {
      description:
        'Consulte les consignes de ton programme et privilégie une exécution lente, stable et contrôlée.',
      steps: [
        'Prépare une position stable.',
        'Choisis une charge adaptée à ton niveau.',
        'Exécute le mouvement sans élan.',
        'Garde une amplitude confortable.',
        'Arrête la série si la technique se dégrade.',
      ],
      tip: 'La qualité d’exécution passe avant la charge.',
    };
  }

  const steps = getNoxExerciseSteps(nox.id);
  const tips = getNoxExerciseCoachTips(nox.id);

  return {
    description: steps.map(step => step.cue).join(' '),
    steps: steps.map(step => `${step.title} — ${step.cue}`),
    tip: tips[0] || 'La qualité d’exécution passe avant la charge.',
  };
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
  const [trainingMode, setTrainingMode] = useState<'gym' | 'travel'>('gym');

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
      const nox = resolvedNoxExercise(ex);
      const muscleText = nox
        ? [
            ...nox.muscles.primary,
            ...nox.muscles.secondary,
            ...nox.muscles.stabilizers,
          ].join(' ')
        : ex.muscles || '';
      const matchesSearch = !q || `${nox?.name || ex.name} ${muscleText}`.toLowerCase().includes(q);
      const matchesFilter = filter === 'Tous' || exerciseFilterGroup(ex) === filter;
      return matchesSearch && matchesFilter;
    });
  }, [uniqueExercises, query, filter]);

  const programGoal =
    program?.program_json?.goal_label ||
    program?.program_json?.goal ||
    program?.goal ||
    'Perte de Gras';

  const phaseLabel =
    program?.program_json?.phase_name ||
    program?.program_json?.phase ||
    'Phase 1';

  const completedSessions = Number(program?.program_json?.completed_sessions || 0);
  const totalSessions = Math.max(sessions.length, 1);
  const progress = Math.max(0, Math.min(100, Math.round((completedSessions / totalSessions) * 100)));
  const displayedProgress = progress || (program ? 35 : 0);
  const currentDay = Math.min(completedSessions + 1, totalSessions);

  const objectiveText =
    program?.program_json?.objective_text ||
    program?.program_json?.target ||
    '-5 kg en 12 semaines';

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'grid', placeItems: 'center' }}>
        <div style={{ display: 'grid', justifyItems: 'center', gap: 12 }}>
          <NoxMark />
          <div style={{ color: '#111', fontSize: 11, fontWeight: 900, letterSpacing: '.14em' }}>
            CHARGEMENT DU PROGRAMME
          </div>
        </div>
      </div>
    );
  }

  if (selectedExercise) {
    return <ExerciseDetail exercise={selectedExercise} onBack={() => setSelectedExercise(null)} />;
  }

  if (selectedSession) {
    const sessionIndex = Math.max(0, sessions.findIndex(s => s === selectedSession));
    return (
      <SessionDetail
        session={selectedSession}
        sessionIndex={sessionIndex}
        sessionLength={sessionLength}
        onBack={() => setSelectedSession(null)}
        onStart={() => navigate('/training/' + (selectedSession.id || sessionIndex))}
        onExercise={setSelectedExercise}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F5', color: '#111', paddingBottom: 92 }}>
      <main style={{ maxWidth: 560, minHeight: '100vh', margin: '0 auto', background: '#fff' }}>
        <header style={{ padding: '18px 18px 0', background: '#fff' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 76px', alignItems: 'center' }}>
            <button
              onClick={() => navigate('/home')}
              aria-label="Retour"
              style={iconButton}
            >
              ‹
            </button>

            <div style={{ justifySelf: 'center' }}>
              <NoxMark />
            </div>

            <button
              onClick={() => navigate('/generate-program')}
              style={{
                justifySelf: 'end',
                border: 0,
                background: ACCENT,
                color: '#111',
                borderRadius: 9,
                padding: '8px 10px',
                fontSize: 9,
                fontWeight: 950,
                cursor: 'pointer',
              }}
            >
              NOUVEAU
            </button>
          </div>

          <div style={{ marginTop: 25 }}>
            <h1 style={{ margin: 0, fontSize: 31, lineHeight: .92, fontWeight: 1000, letterSpacing: '-.055em' }}>
              PROGRAMME
            </h1>
            <div style={{ marginTop: 7, color: '#73736D', fontSize: 12.5 }}>
              {program ? `${programGoal} — ${phaseLabel} · ${sessions.length || 0} jours` : 'Ton plan personnalisé'}
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button onClick={() => setTrainingMode('gym')} style={{border:'1px solid '+(trainingMode==='gym'?ACCENT:BORDER),borderRadius:11,background:trainingMode==='gym'?ACCENT:'#fff',padding:'10px 8px',fontSize:10,fontWeight:950,cursor:'pointer'}}>GYM MODE</button>
            <button onClick={() => setTrainingMode('travel')} style={{border:'1px solid '+(trainingMode==='travel'?ACCENT:BORDER),borderRadius:11,background:trainingMode==='travel'?ACCENT:'#fff',padding:'10px 8px',fontSize:10,fontWeight:950,cursor:'pointer'}}>TRAVEL / HOTEL</button>
          </div>
          <div style={{marginTop:9,padding:'11px 12px',border:'1px solid '+BORDER,borderRadius:12,background:'#FAFAF8',fontSize:10.5,color:MUTED,lineHeight:1.45}}>
            {trainingMode==='gym'?'Salle complète · machines, charges et progression disponibles.':'Mode déplacement · privilégie les substitutions faisables avec peu de matériel.'}
          </div>

          {program && (
            <div style={{ marginTop: 17 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ height: 5, flex: 1, background: '#ECECE8', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${displayedProgress}%`, background: ACCENT, borderRadius: 999 }} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 900 }}>{displayedProgress}%</div>
              </div>
              <div style={{ textAlign: 'center', marginTop: 8, fontSize: 10.5, color: '#55554F', fontWeight: 700 }}>
                Jour {currentDay} sur {totalSessions}
              </div>
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: '#F1F1EE',
              padding: 3,
              borderRadius: 12,
              marginTop: 16,
            }}
          >
            {[
              { id: 'plan', label: 'PLAN' },
              { id: 'exercises', label: 'EXERCICES' },
            ].map(item => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id as 'plan' | 'exercises')}
                  style={{
                    border: 0,
                    borderRadius: 9,
                    minHeight: 38,
                    cursor: 'pointer',
                    background: active ? ACCENT : 'transparent',
                    color: '#111',
                    fontSize: 11,
                    fontWeight: 950,
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </header>

        {!program ? (
          <EmptyProgram onCreate={() => navigate('/generate-program')} />
        ) : tab === 'plan' ? (
          <section style={{ padding: '15px 18px 24px' }}>
            <div
              style={{
                border: `1.5px solid ${ACCENT}`,
                borderRadius: 15,
                background: '#FCFFF4',
                padding: '14px 14px 14px 13px',
                display: 'grid',
                gridTemplateColumns: '34px 1fr',
                gap: 10,
                alignItems: 'start',
              }}
            >
              <div style={{ color: ACCENT, fontSize: 31, lineHeight: 1, fontWeight: 1000 }}>ϟ</div>
              <div>
                <div style={{ fontSize: 9.5, color: '#55554F', fontWeight: 900, letterSpacing: '.04em' }}>
                  PLAN ACTIF
                </div>
                <div style={{ marginTop: 2, fontSize: 15, lineHeight: 1.13, fontWeight: 1000 }}>
                  {sessions.length} séances pour progresser cette semaine
                </div>
                <div style={{ marginTop: 5, color: '#74746E', fontSize: 10.5, lineHeight: 1.4 }}>
                  {program.program_json?.progression_notes || 'Valide tes séries et laisse NOX suivre ta progression.'}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 9, marginTop: 13 }}>
              {sessions.map((session: any, si: number) => (
                <SessionRow
                  key={`${session.name}-${si}`}
                  session={session}
                  index={si}
                  sessionLength={sessionLength}
                  onOpen={() => setSelectedSession(session)}
                  onStart={() => navigate('/training/' + (session.id || si))}
                />
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
              <button onClick={() => navigate('/generate-program')} style={{border:'1px solid '+BORDER,borderRadius:12,background:'#fff',padding:12,textAlign:'left',cursor:'pointer'}}><b style={{fontSize:11}}>WORKOUT BUILDER</b><div style={{fontSize:9.5,color:MUTED,marginTop:4}}>Créer ou adapter une séance.</div></button>
              <button onClick={() => navigate('/reschedule')} style={{border:'1px solid '+BORDER,borderRadius:12,background:'#fff',padding:12,textAlign:'left',cursor:'pointer'}}><b style={{fontSize:11}}>CALENDRIER</b><div style={{fontSize:9.5,color:MUTED,marginTop:4}}>Planifier et reprogrammer.</div></button>
              <button onClick={() => navigate('/rest-day')} style={{border:'1px solid '+BORDER,borderRadius:12,background:'#fff',padding:12,textAlign:'left',cursor:'pointer'}}><b style={{fontSize:11}}>PAUSE / REPRISE</b><div style={{fontSize:9.5,color:MUTED,marginTop:4}}>Repos, maladie ou vacances.</div></button>
              <button onClick={() => navigate('/play')} style={{border:'1px solid '+BORDER,borderRadius:12,background:'#fff',padding:12,textAlign:'left',cursor:'pointer'}}><b style={{fontSize:11}}>PERSONAL BESTS</b><div style={{fontSize:9.5,color:MUTED,marginTop:4}}>PR, milestones et progression.</div></button>
            </div>
            <div style={{marginTop:8,padding:'12px 13px',borderRadius:12,background:'#0A0A0A',color:'#fff'}}>
              <div style={{fontSize:9,color:ACCENT,fontWeight:950,letterSpacing:'.08em'}}>NOX TRAINING</div>
              <div style={{fontSize:11,fontWeight:900,marginTop:4}}>Live Workout · progression · plateau · adaptations</div>
              <div style={{fontSize:9.5,color:'#999',lineHeight:1.45,marginTop:4}}>Les charges, répétitions, substitutions et séries d’échauffement restent intégrées à l’exécution de séance. Comeback Mode adapte la reprise après une pause.</div>
            </div>

            <button
              onClick={() => navigate('/body')}
              style={{
                width: '100%',
                marginTop: 12,
                minHeight: 62,
                border: '1px solid #E4E4DF',
                background: '#fff',
                borderRadius: 13,
                padding: '10px 13px',
                display: 'grid',
                gridTemplateColumns: '38px 1fr auto',
                gap: 10,
                alignItems: 'center',
                textAlign: 'left',
                cursor: 'pointer',
                color: '#111',
              }}
            >
              <div style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: '#F3F3EF', fontSize: 20 }}>
                ◎
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#77776F', fontWeight: 800 }}>Objectif</div>
                <div style={{ marginTop: 2, fontSize: 12.5, fontWeight: 850 }}>{objectiveText}</div>
              </div>
              <span style={{ fontSize: 22 }}>›</span>
            </button>
          </section>
        ) : (
          <section style={{ padding: '15px 18px 24px' }}>
            <div
              style={{
                minHeight: 44,
                borderRadius: 12,
                border: '1px solid #E3E3DE',
                background: '#FAFAF8',
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                gap: 9,
                color: '#8A8A83',
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
                  color: '#111',
                  fontSize: 12,
                }}
              />
              <span style={{ fontSize: 16 }}>≡</span>
            </div>

            <div style={{ display: 'flex', gap: 7, overflowX: 'auto', padding: '12px 0 10px', scrollbarWidth: 'none' }}>
              {(['Tous', 'Pectoraux', 'Dos', 'Jambes', 'Épaules', 'Bras'] as Filter[]).map(item => {
                const active = item === filter;
                return (
                  <button
                    key={item}
                    onClick={() => setFilter(item)}
                    style={{
                      flexShrink: 0,
                      borderRadius: 10,
                      border: active ? `1px solid ${ACCENT}` : '1px solid #E4E4DF',
                      background: active ? ACCENT : '#fff',
                      color: '#111',
                      padding: '8px 11px',
                      fontSize: 10,
                      fontWeight: active ? 900 : 700,
                      cursor: 'pointer',
                    }}
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              {filteredExercises.map((exercise: any, i: number) => (
                <ExerciseListRow
                  key={`${exercise.name}-${i}`}
                  exercise={exercise}
                  onOpen={() => setSelectedExercise(exercise)}
                />
              ))}
            </div>

            {filteredExercises.length === 0 && (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: '#77776F', fontSize: 12 }}>
                Aucun exercice trouvé.
              </div>
            )}
          </section>
        )}
      </main>

      <BottomNav active="training" />
    </div>
  );
}

function NoxMark() {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: 27, height: 21, flexShrink: 0 }}>
        <span style={{ position: 'absolute', width: 12, height: 7, left: 1, top: 2, borderRadius: 999, background: ACCENT, transform: 'rotate(28deg)' }} />
        <span style={{ position: 'absolute', width: 21, height: 8, left: 7, top: 10, borderRadius: 999, background: ACCENT, transform: 'rotate(7deg)' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 16.5, fontWeight: 1000, letterSpacing: '-.04em' }}>NOX</span>
        
      </div>
    </div>
  );
}

const iconButton: React.CSSProperties = {
  width: 34,
  height: 34,
  border: 0,
  background: 'transparent',
  color: '#111',
  borderRadius: 10,
  cursor: 'pointer',
  fontSize: 28,
  lineHeight: 1,
  display: 'grid',
  placeItems: 'center',
  padding: 0,
};

function SessionRow({
  session,
  index,
  sessionLength,
  onOpen,
  onStart,
}: {
  session: any;
  index: number;
  sessionLength: number;
  onOpen: () => void;
  onStart: () => void;
}) {
  return (
    <div
      style={{
        minHeight: 68,
        border: '1px solid #E4E4DF',
        borderRadius: 13,
        background: '#fff',
        padding: '8px 9px',
        display: 'grid',
        gridTemplateColumns: '42px 1fr 39px',
        gap: 10,
        alignItems: 'center',
      }}
    >
      <button
        onClick={onOpen}
        style={{
          width: 42,
          height: 42,
          borderRadius: 10,
          border: 0,
          background: ACCENT,
          color: '#111',
          fontSize: 13,
          fontWeight: 1000,
          cursor: 'pointer',
        }}
      >
        {session.day || `J${index + 1}`}
      </button>

      <button onClick={onOpen} style={{ border: 0, background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer', color: '#111' }}>
        <div style={{ fontSize: 13.5, fontWeight: 950 }}>{session.name || `Séance ${index + 1}`}</div>
        <div style={{ marginTop: 4, fontSize: 10.5, color: '#77776F' }}>
          {session.exercises?.length || 0} exercices · {session.duration || sessionLength} min
        </div>
      </button>

      <button
        onClick={onStart}
        aria-label={`Commencer ${session.name || `séance ${index + 1}`}`}
        style={{
          width: 36,
          height: 36,
          border: 0,
          borderRadius: 10,
          background: ACCENT,
          color: '#111',
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
          fontSize: 15,
          fontWeight: 1000,
        }}
      >
        ▶
      </button>
    </div>
  );
}

function SessionDetail({
  session,
  sessionIndex,
  sessionLength,
  onBack,
  onStart,
  onExercise,
}: {
  session: any;
  sessionIndex: number;
  sessionLength: number;
  onBack: () => void;
  onStart: () => void;
  onExercise: (exercise: any) => void;
}) {
  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F5', color: '#111', paddingBottom: 92 }}>
      <main style={{ maxWidth: 560, minHeight: '100vh', margin: '0 auto', background: '#fff', padding: '18px 18px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 36px', alignItems: 'center' }}>
          <button onClick={onBack} style={iconButton}>‹</button>
          <div style={{ justifySelf: 'center' }}><NoxMark /></div>
          <div />
        </div>

        <div style={{ marginTop: 26, display: 'flex', alignItems: 'center', gap: 13 }}>
          <div style={{ width: 48, height: 48, borderRadius: 11, background: ACCENT, display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 1000 }}>
            {session.day || `J${sessionIndex + 1}`}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, lineHeight: 1, fontWeight: 1000, letterSpacing: '-.045em' }}>
              {session.name || `Séance ${sessionIndex + 1}`}
            </h1>
            <div style={{ marginTop: 6, fontSize: 11.5, color: '#77776F' }}>
              {session.exercises?.length || 0} exercices · {session.duration || sessionLength} min
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8, marginTop: 22 }}>
          {(session.exercises || []).map((exercise: any, index: number) => (
            <ExerciseListRow
              key={`${exercise.name}-${index}`}
              exercise={exercise}
              onOpen={() => onExercise(exercise)}
            />
          ))}
        </div>

        <button
          onClick={onStart}
          style={{
            width: '100%',
            minHeight: 50,
            marginTop: 18,
            border: 0,
            borderRadius: 11,
            background: ACCENT,
            color: '#111',
            fontSize: 11.5,
            fontWeight: 1000,
            cursor: 'pointer',
          }}
        >
          COMMENCER LA SÉANCE →
        </button>
      </main>
      <BottomNav active="training" />
    </div>
  );
}

function ExerciseListRow({
  exercise,
  onOpen,
}: {
  exercise: any;
  onOpen: () => void;
}) {
  const tags = muscleTags(exercise);
  const nox = resolvedNoxExercise(exercise);
  const thumbnail = getNoxExerciseThumbnail(exercise);
  const hdCover = getNoxExerciseHdCover(exercise);

  return (
    <button
      onClick={onOpen}
      style={{
        width: '100%',
        minHeight: 70,
        display: 'grid',
        gridTemplateColumns: '64px 1fr 22px',
        gap: 10,
        alignItems: 'center',
        textAlign: 'left',
        border: '1px solid #E4E4DF',
        background: '#fff',
        color: '#111',
        borderRadius: 12,
        padding: 6,
        cursor: 'pointer',
      }}
    >
      {hdCover || thumbnail ? (
        <NoxExerciseImage
          src={hdCover || thumbnail}
          fallbackSrc={hdCover ? thumbnail : null}
          alt={`Aperçu ${nox?.name || exercise.name}`}
          compact
        />
      ) : (
        <NoxExerciseFallback compact />
      )}

      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, lineHeight: 1.15, fontWeight: 950, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {nox?.name || exercise.name}
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 5 }}>
          {tags.slice(0, 2).map(tag => (
            <span key={tag} style={{ background: '#F1F1EE', borderRadius: 6, padding: '3px 6px', fontSize: 8.5, color: '#66665F' }}>
              {tag}
            </span>
          ))}
        </div>
        <div style={{ marginTop: 5, color: '#77776F', fontSize: 9.5 }}>
          {exercise.sets || '3-4'} séries · {exercise.reps || '8-12'} reps
        </div>
      </div>

      <span style={{ fontSize: 22, color: '#111' }}>›</span>
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
  const nox = resolvedNoxExercise(exercise);
  const technique = exerciseTechnique(exercise);
  const thumbnail = getNoxExerciseThumbnail(exercise);
  const hdCover = getNoxExerciseHdCover(exercise);
  const displayName = nox?.name || exercise.name;
  const description = exercise.description?.trim() || technique.description;
  const steps =
    exercise.instructions?.trim()
      ? exercise.instructions
          .split(/\n|\. /)
          .map((s: string) => s.trim())
          .filter(Boolean)
          .slice(0, 5)
      : technique.steps;

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F5', color: '#111' }}>
      <main style={{ maxWidth: 560, minHeight: '100vh', margin: '0 auto', background: '#fff', padding: '18px 18px 34px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 36px', alignItems: 'center' }}>
          <button onClick={onBack} style={iconButton}>‹</button>
          <div style={{ justifySelf: 'center' }}><NoxMark /></div>
          <div />
        </div>

        <div style={{ marginTop: 18, borderRadius: 14, overflow: 'hidden', background: '#F1F1ED' }}>
          {hdCover || thumbnail ? (
            <NoxExerciseImage
              src={hdCover || thumbnail}
              fallbackSrc={hdCover ? thumbnail : null}
              alt={`Démonstration ${displayName}`}
            />
          ) : (
            <NoxExerciseFallback />
          )}
        </div>

        <h1 style={{ margin: '18px 0 0', fontSize: 28, lineHeight: .95, fontWeight: 1000, letterSpacing: '-.05em' }}>
          {displayName}
        </h1>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 9 }}>
          {tags.map(tag => (
            <span key={tag} style={{ borderRadius: 7, padding: '5px 8px', background: '#F1F1EE', color: '#5F5F59', fontSize: 9.5, fontWeight: 700 }}>
              {tag}
            </span>
          ))}
        </div>

        <section style={{ marginTop: 20 }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 1000 }}>Technique</h2>
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            {steps.map((step: string, index: number) => (
              <div key={`${step}-${index}`} style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 10, alignItems: 'start' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: ACCENT, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 1000 }}>
                  {index + 1}
                </div>
                <div style={{ paddingTop: 5, color: '#3E3E3A', fontSize: 11.5, lineHeight: 1.45 }}>{step}</div>
              </div>
            ))}
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7, marginTop: 18 }}>
          <Metric value={exercise.sets || '4'} label="SÉRIES" />
          <Metric value={exercise.reps || '8-12'} label="RÉPÉTITIONS" />
          <Metric value={exercise.rest || '90 sec'} label="REPOS" />
        </div>

        <InfoCard title="Description">
          <div style={{ color: '#55554F', fontSize: 11.5, lineHeight: 1.55 }}>{description}</div>
        </InfoCard>

        <div style={{ marginTop: 11, border: '1px solid #E1E1DC', borderRadius: 12, padding: 13, display: 'grid', gridTemplateColumns: '30px 1fr', gap: 10, background: '#FCFCFA' }}>
          <div style={{ width: 28, height: 28, borderRadius: 9, background: ACCENT, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 1000 }}>N</div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 950 }}>Conseil NOX</div>
            <div style={{ marginTop: 3, color: '#55554F', fontSize: 10.5, lineHeight: 1.45 }}>{technique.tip}</div>
          </div>
        </div>
      </main>
    </div>
  );
}


function NoxExerciseImage({
  src,
  alt,
  compact = false,
  fallbackSrc = null,
}: {
  src: string;
  alt: string;
  compact?: boolean;
  fallbackSrc?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    setFailed(false);
    setUsingFallback(false);
  }, [src, fallbackSrc]);

  if (!src || failed) {
    return <NoxExerciseFallback compact={compact} />;
  }

  return (
    <img
      src={usingFallback && fallbackSrc ? fallbackSrc : src}
      alt={alt}
      loading="lazy"
      onError={() => {
        if (!usingFallback && fallbackSrc && fallbackSrc !== src) {
          setUsingFallback(true);
          return;
        }
        setFailed(true);
      }}
      style={
        compact
          ? { width: 64, height: 58, objectFit: 'contain', objectPosition: 'center', borderRadius: 9, background: '#fff', display: 'block' }
          : { width: '100%', aspectRatio: '4 / 3', objectFit: 'contain', objectPosition: 'center', background: '#fff', display: 'block' }
      }
    />
  );
}

function NoxExerciseFallback({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div
        style={{
          width: 64,
          height: 58,
          borderRadius: 9,
          background: '#111',
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'grid', justifyItems: 'center', gap: 2 }}>
          <div style={{ color: ACCENT, fontSize: 10, fontWeight: 1000, letterSpacing: '.08em' }}>NOX</div>
          <div style={{ color: '#fff', fontSize: 6.5, fontWeight: 850, letterSpacing: '.12em' }}>EXERCISE</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        aspectRatio: '16 / 9',
        display: 'grid',
        placeItems: 'center',
        background: '#111',
        padding: 24,
      }}
    >
      <div style={{ display: 'grid', justifyItems: 'center', gap: 10, textAlign: 'center' }}>
        <NoxMark />
        <div style={{ color: '#fff', fontSize: 12, fontWeight: 1000, letterSpacing: '.1em' }}>
          DÉMO NOX
        </div>
        <div style={{ color: '#9B9B94', fontSize: 10.5, lineHeight: 1.4 }}>
          Visuel NOX bientôt disponible
        </div>
      </div>
    </div>
  );
}

function EmptyProgram({ onCreate }: { onCreate: () => void }) {
  return (
    <section style={{ padding: '72px 24px 34px', textAlign: 'center' }}>
      <div style={{ width: 78, height: 78, margin: '0 auto', borderRadius: 22, background: '#F1F1ED', display: 'grid', placeItems: 'center', fontSize: 38, color: '#C8C8C2' }}>
        ◫
      </div>
      <h2 style={{ margin: '22px 0 0', fontSize: 17, fontWeight: 1000 }}>Aucun programme pour le moment</h2>
      <p style={{ color: '#77776F', lineHeight: 1.5, fontSize: 11.5, maxWidth: 310, margin: '8px auto 22px' }}>
        Crée ton premier programme et commence à t'entraîner avec NOX.
      </p>

      <div style={{ maxWidth: 300, margin: '0 auto 24px', display: 'grid', gap: 10, textAlign: 'left' }}>
        {['Des programmes personnalisés', 'Des démos NOX pour chaque exercice', 'Un suivi de ta progression', 'Des résultats concrets'].map((text, index) => (
          <div key={text} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: 8, alignItems: 'center', fontSize: 11, color: '#55554F' }}>
            <span style={{ color: ACCENT, fontSize: 17, fontWeight: 1000 }}>{['▥', '▶', '↗', '✓'][index]}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onCreate}
        style={{ width: '100%', minHeight: 49, border: 0, borderRadius: 11, background: ACCENT, color: '#111', fontSize: 11, fontWeight: 1000, cursor: 'pointer' }}
      >
        CRÉER MON PROGRAMME →
      </button>
    </section>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ minHeight: 70, borderRadius: 11, border: '1px solid #E4E4DF', background: '#FAFAF8', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 7 }}>
      <div>
        <div style={{ fontSize: 17, fontWeight: 1000, lineHeight: 1.05 }}>{value}</div>
        <div style={{ marginTop: 5, fontSize: 7.5, color: '#77776F', fontWeight: 850 }}>{label}</div>
      </div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: any }) {
  return (
    <section style={{ marginTop: 11, borderRadius: 12, border: '1px solid #E4E4DF', background: '#FAFAF8', padding: 13 }}>
      <h3 style={{ margin: 0, fontSize: 11.5, fontWeight: 950 }}>{title}</h3>
      <div style={{ marginTop: 8 }}>{children}</div>
    </section>
  );
}