import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const BG = '#070707';
const SURFACE = '#111';
const BORDER = '#232323';
const MUTED = '#858585';

export default function Program() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [program, setProgram] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [tab, setTab] = useState<'plan' | 'exercises'>('plan');

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    const { data } = await supabase.from('workout_programs')
      .select('*').eq('user_id', user!.id).eq('is_active', true).maybeSingle();
    setProgram(data);
    setLoading(false);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'grid', placeItems: 'center' }}>
      <div style={{ color: ACCENT, fontWeight: 900, letterSpacing: '.16em' }}>NOX TRAINING</div>
    </div>
  );

  const sessions: any[] = program?.program_json?.sessions || [];
  const allExercises: any[] = sessions.flatMap((s: any) => s.exercises || []);
  const uniqueExercises = allExercises.filter((e, i, arr) => arr.findIndex(x => x.name === e.name) === i);
  const sessionLength = program?.program_json?.session_length_min || 60;

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#fff', paddingBottom: 100 }}>
      <main style={{ maxWidth: 560, margin: '0 auto' }}>
        <header style={{
          padding: '24px 20px 18px',
          background: 'radial-gradient(circle at 90% 0%, rgba(200,255,0,.07), transparent 30%), #090909',
          borderBottom: '1px solid rgba(255,255,255,.06)'
        }}>
          <div style={{ fontSize: 10, color: '#777', textTransform: 'uppercase', letterSpacing: '.14em', fontWeight: 800 }}>
            NOX Training
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 6 }}>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: 25, lineHeight: 1.05, fontWeight: 950, letterSpacing: '-.04em' }}>
                {program?.name || 'MON PROGRAMME'}
              </h1>
              {program && (
                <div style={{ marginTop: 8, fontSize: 12, color: MUTED }}>
                  {program.days_per_week || sessions.length}j / semaine · {sessionLength} min · {sessions.length} séances
                </div>
              )}
            </div>
            <button onClick={() => navigate('/generate-program')} style={{
              alignSelf: 'flex-start', border: '1px solid rgba(200,255,0,.22)', background: 'rgba(200,255,0,.08)',
              color: ACCENT, borderRadius: 12, padding: '9px 12px', fontSize: 11, fontWeight: 900, cursor: 'pointer'
            }}>
              NOUVEAU
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#111', padding: 4, borderRadius: 14, marginTop: 20 }}>
            {[
              { id: 'plan', label: 'PLAN' },
              { id: 'exercises', label: 'EXERCICES' },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)} style={{
                border: 'none', borderRadius: 11, padding: '10px 0', cursor: 'pointer',
                background: tab === t.id ? '#202020' : 'transparent',
                color: tab === t.id ? '#fff' : '#666', fontSize: 11, fontWeight: 900, letterSpacing: '.06em'
              }}>{t.label}</button>
            ))}
          </div>
        </header>

        {!program ? (
          <section style={{ padding: '70px 24px', textAlign: 'center' }}>
            <div style={{ width: 58, height: 58, margin: '0 auto 20px', borderRadius: 18, background: 'rgba(200,255,0,.08)', border: '1px solid rgba(200,255,0,.18)', display: 'grid', placeItems: 'center', color: ACCENT, fontSize: 24 }}>+</div>
            <div style={{ fontSize: 21, fontWeight: 950 }}>TON PLAN COMMENCE ICI</div>
            <p style={{ color: MUTED, lineHeight: 1.6, fontSize: 13, maxWidth: 330, margin: '10px auto 26px' }}>
              NOX construit un programme selon ton objectif, ton niveau, ton matériel et tes disponibilités.
            </p>
            <button onClick={() => navigate('/generate-program')} style={{
              border: 'none', background: ACCENT, color: '#050505', borderRadius: 14, padding: '15px 22px',
              fontWeight: 950, cursor: 'pointer'
            }}>CRÉER MON PROGRAMME</button>
          </section>
        ) : (
          <section style={{ padding: 20 }}>
            {tab === 'plan' && (
              <>
                <div style={{
                  borderRadius: 22, border: '1px solid rgba(200,255,0,.18)',
                  background: 'linear-gradient(135deg,#151515,#0e0e0e)', padding: 20, marginBottom: 18
                }}>
                  <div style={{ fontSize: 10, color: ACCENT, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase' }}>Plan actif</div>
                  <div style={{ fontSize: 20, fontWeight: 950, marginTop: 7 }}>{sessions.length} séances pour progresser cette semaine</div>
                  <div style={{ color: MUTED, fontSize: 12.5, lineHeight: 1.55, marginTop: 8 }}>
                    {program.program_json?.progression_notes || 'Valide tes séries, progresse régulièrement et laisse NOX suivre ta trajectoire.'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 17 }}>
                    {[
                      ['FRÉQUENCE', `${program.days_per_week || sessions.length}j`],
                      ['DURÉE', `${sessionLength}m`],
                      ['EXERCICES', `${uniqueExercises.length}`],
                    ].map(([label, value]) => (
                      <div key={label} style={{ background: '#0c0c0c', border: `1px solid ${BORDER}`, borderRadius: 13, padding: '11px 8px', textAlign: 'center' }}>
                        <div style={{ fontSize: 17, fontWeight: 950 }}>{value}</div>
                        <div style={{ fontSize: 8.5, color: '#666', marginTop: 4, fontWeight: 800 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {program.goal && (
                  <div style={{ marginBottom: 20, padding: '13px 15px', borderRadius: 14, background: '#101010', border: `1px solid ${BORDER}` }}>
                    <div style={{ fontSize: 9.5, color: '#6f6f6f', fontWeight: 900, letterSpacing: '.09em' }}>OBJECTIF</div>
                    <div style={{ marginTop: 5, fontSize: 13, color: '#d0d0d0' }}>{String(program.goal)}</div>
                  </div>
                )}

                <div style={{ fontSize: 11, color: '#777', fontWeight: 900, letterSpacing: '.09em', marginBottom: 11 }}>TES SÉANCES</div>
                {sessions.map((session: any, si: number) => {
                  const open = selectedSession?.name === session.name;
                  return (
                    <div key={si} style={{ marginBottom: 11 }}>
                      <div style={{
                        borderRadius: open ? '18px 18px 0 0' : 18, border: `1px solid ${open ? 'rgba(200,255,0,.25)' : BORDER}`,
                        background: SURFACE, padding: 16
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                          <button onClick={() => setSelectedSession(open ? null : session)} style={{ flex: 1, border: 0, background: 'transparent', color: '#fff', padding: 0, textAlign: 'left', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                              <span style={{ color: ACCENT, fontSize: 10, fontWeight: 950, background: 'rgba(200,255,0,.09)', padding: '5px 8px', borderRadius: 8 }}>
                                {session.day || `J${si + 1}`}
                              </span>
                              <span style={{ fontSize: 15, fontWeight: 900 }}>{session.name}</span>
                            </div>
                            <div style={{ marginTop: 8, fontSize: 11.5, color: MUTED }}>
                              {session.exercises?.length || 0} exercices · {session.duration || sessionLength} min
                              {session.focus ? ` · ${session.focus}` : ''}
                            </div>
                          </button>
                          <button onClick={() => navigate('/training/' + (session.id || si))} style={{
                            border: 0, borderRadius: 11, background: ACCENT, color: '#050505', padding: '10px 13px',
                            fontSize: 10.5, fontWeight: 950, cursor: 'pointer'
                          }}>START</button>
                          <button onClick={() => setSelectedSession(open ? null : session)} aria-label="Déplier" style={{ border: 0, background: 'transparent', color: '#777', cursor: 'pointer', fontSize: 17 }}>
                            {open ? '−' : '+'}
                          </button>
                        </div>
                      </div>

                      {open && (
                        <div style={{ border: '1px solid rgba(200,255,0,.18)', borderTop: 0, background: '#0c0c0c', borderRadius: '0 0 18px 18px', padding: '2px 15px 10px' }}>
                          {(session.exercises || []).map((ex: any, ei: number) => (
                            <div key={ei} style={{ padding: '14px 0', borderBottom: ei === session.exercises.length - 1 ? 'none' : `1px solid ${BORDER}`, display: 'flex', gap: 11 }}>
                              <div style={{ width: 25, height: 25, borderRadius: 8, background: '#171717', display: 'grid', placeItems: 'center', color: '#777', fontSize: 10, fontWeight: 900, flexShrink: 0 }}>{ei + 1}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13.5, fontWeight: 850 }}>{ex.name}</div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 7 }}>
                                  <span style={{ background: '#171717', borderRadius: 7, padding: '4px 8px', fontSize: 10.5, color: '#bbb' }}>{ex.sets} × {ex.reps}</span>
                                  {ex.rest && <span style={{ background: '#171717', borderRadius: 7, padding: '4px 8px', fontSize: 10.5, color: '#777' }}>Repos {ex.rest}</span>}
                                  {ex.weight_suggestion && <span style={{ background: 'rgba(200,255,0,.08)', borderRadius: 7, padding: '4px 8px', fontSize: 10.5, color: ACCENT }}>~{ex.weight_suggestion}</span>}
                                </div>
                              </div>
                              <button onClick={() => setSelectedExercise(ex)} style={{ border: `1px solid ${BORDER}`, background: '#121212', color: '#999', borderRadius: 9, padding: '6px 9px', fontSize: 9.5, cursor: 'pointer', alignSelf: 'center' }}>DÉTAILS</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {program.program_json?.nutrition_notes && (
                  <div style={{ marginTop: 18, borderRadius: 17, border: `1px solid ${BORDER}`, background: SURFACE, padding: 16 }}>
                    <div style={{ fontSize: 10, color: ACCENT, fontWeight: 900, letterSpacing: '.08em' }}>FUEL · RECOMMANDATION</div>
                    <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.6, marginTop: 7 }}>{program.program_json.nutrition_notes}</div>
                  </div>
                )}
              </>
            )}

            {tab === 'exercises' && (
              <>
                <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.55, marginBottom: 16 }}>
                  Ta bibliothèque actuelle : {uniqueExercises.length} exercices utilisés dans ton programme.
                </div>
                {uniqueExercises.map((ex: any, i: number) => {
                  const open = selectedExercise?.name === ex.name;
                  return (
                    <button key={i} onClick={() => setSelectedExercise(open ? null : ex)} style={{
                      width: '100%', border: `1px solid ${open ? 'rgba(200,255,0,.24)' : BORDER}`,
                      background: SURFACE, color: '#fff', borderRadius: 16, padding: 15, marginBottom: 9, textAlign: 'left', cursor: 'pointer'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 900 }}>{ex.name}</div>
                          {ex.muscles && <div style={{ color: '#777', fontSize: 11, marginTop: 4 }}>{ex.muscles}</div>}
                        </div>
                        <span style={{ color: open ? ACCENT : '#555' }}>{open ? '−' : '+'}</span>
                      </div>
                      {open && <ExerciseDemo exercise={ex} />}
                    </button>
                  );
                })}
              </>
            )}
          </section>
        )}
      </main>

      {selectedExercise && tab === 'plan' && (
        <ExerciseDemoModal exercise={selectedExercise} onClose={() => setSelectedExercise(null)} />
      )}
      <BottomNav active="training" />
    </div>
  );
}

// ─── EXERCISE DEMO (inline dans onglet exercices) ───────────────
function ExerciseDemo({ exercise }: { exercise: any }) {
  return (
    <div style={{ marginTop: 16, borderTop: '1px solid #1a1a1a', paddingTop: 14 }} onClick={e => e.stopPropagation()}>
      <ExerciseContent exercise={exercise} />
    </div>
  );
}

// ─── EXERCISE DEMO MODAL ────────────────────────────────────────
function ExerciseDemoModal({ exercise, onClose }: { exercise: any; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.95)', zIndex: 300, overflowY: 'auto' }}>
      <div style={{ padding: '24px 20px 100px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>{exercise.name}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', fontSize: 28, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <ExerciseContent exercise={exercise} />
      </div>
    </div>
  );
}

// ─── EXERCISE CONTENT (schéma + description) ────────────────────
function ExerciseDemo2({ exercise }: { exercise: any }) {
  return <ExerciseContent exercise={exercise} />;
}

function ExerciseContent({ exercise }: { exercise: any }) {
  const ACCENT = '#c8ff00';
  const SURFACE = '#111';
  const BORDER = '#1a1a1a';

  // Données enrichies par nom d'exercice
  const getExerciseData = (name: string) => {
    const n = name.toLowerCase();

    // Poitrine
    if (n.includes('développé couché') || n.includes('bench press') || n.includes('bench')) return {
      category: 'Poitrine · Épaules · Triceps',
      difficulty: 'Intermédiaire',
      equipment: 'Barre + Banc',
      schema: `
┌─────────────────────┐
│   DÉVELOPPÉ COUCHÉ  │
│                     │
│  ═══[BARRE]═══      │
│      ↕ ↕            │
│  ╔═══════════╗      │
│  ║  POITRINE ║      │
│  ╚═══════════╝      │
│  [____BANC___]      │
└─────────────────────┘`,
      start: 'Allongé sur le banc, pieds au sol. Prise en pronation légèrement plus large que les épaules. Barre au-dessus de la poitrine, bras tendus.',
      movement: 'Descends la barre lentement vers le bas de la poitrine (2-3 secondes). Touche légèrement ou frôle la poitrine. Pousse vers le haut en explosif en gardant les coudes à ~45°.',
      tips: ['Ne bloque pas les coudes en haut', 'Garde les omoplates serrées', 'Pieds bien ancrés au sol', 'Contrôle la descente, explose à la montée'],
      mistakes: ['Rebondir la barre sur la poitrine', 'Coudes trop évasés (90°)', 'Fesses décollées du banc'],
      muscles: { primary: ['Grand pectoral'], secondary: ['Deltoïde antérieur', 'Triceps'] },
    };

    if (n.includes('squat')) return {
      category: 'Quadriceps · Fessiers · Ischio',
      difficulty: 'Intermédiaire',
      equipment: 'Barre + Rack ou Poids du corps',
      schema: `
┌─────────────────────┐
│       SQUAT         │
│                     │
│    ╔═[BARRE]═╗      │
│    ║    👤    ║      │
│    ║   /|\\   ║      │
│    ║  / | \\  ║      │
│    ║ /  |  \\ ║      │
│    ╚════════╝       │
│    POSITION BAS     │
└─────────────────────┘`,
      start: 'Debout, pieds à largeur d\'épaules ou légèrement plus large. Pointes légèrement vers l\'extérieur. Barre sur les trapèzes (squat haut) ou bas des trapèzes (squat bas).',
      movement: 'Pousse les genoux vers l\'extérieur dans la direction des orteils. Descends les hanches vers le bas et l\'arrière. Descends jusqu\'à ce que les cuisses soient parallèles ou plus bas. Remonte en poussant le sol vers le bas.',
      tips: ['Garde le dos droit et la poitrine haute', 'Genoux dans l\'axe des pieds', 'Profondeur selon ta mobilité', 'Inspires en descendant'],
      mistakes: ['Genoux qui rentrent vers l\'intérieur', 'Talon qui se soulève', 'Dos qui s\'arrondit', 'Regard vers le bas'],
      muscles: { primary: ['Quadriceps', 'Fessiers'], secondary: ['Ischio-jambiers', 'Mollets', 'Core'] },
    };

    if (n.includes('soulevé') || n.includes('deadlift') || n.includes('romanian')) return {
      category: 'Ischio · Fessiers · Dos',
      difficulty: 'Avancé',
      equipment: 'Barre + Disques',
      schema: `
┌─────────────────────┐
│  SOULEVÉ DE TERRE   │
│                     │
│    👤               │
│    |\\               │
│    | \\              │
│    |  ●──────────   │
│  [BARRE AU SOL]     │
│  ════════════════   │
└─────────────────────┘`,
      start: 'Pieds à largeur de hanches sous la barre. Barre au-dessus du milieu du pied. Accroupis-toi, saisis la barre en pronation (ou mixte). Dos plat, hanches plus basses que les épaules.',
      movement: 'Pousse le sol vers le bas (ne tire pas avec le dos). La barre reste proche du corps tout au long du mouvement. Étends simultanément hanches et genoux. Termine debout, hanches verrouillées.',
      tips: ['Barre collée aux tibias à la montée', 'Engage le core avant de tirer', 'Hanches et épaules montent ensemble', 'Expire en haut'],
      mistakes: ['Dos arrondi', 'Barre qui s\'éloigne du corps', 'Tirer avec le dos en premier', 'Genoux qui rentrent'],
      muscles: { primary: ['Ischio-jambiers', 'Fessiers', 'Érecteurs du rachis'], secondary: ['Trapèzes', 'Avant-bras', 'Quadriceps'] },
    };

    if (n.includes('tractions') || n.includes('pull-up') || n.includes('traction')) return {
      category: 'Dos · Biceps',
      difficulty: 'Intermédiaire',
      equipment: 'Barre de tractions',
      schema: `
┌─────────────────────┐
│     TRACTIONS       │
│                     │
│  ════[BARRE]════    │
│     ╔══╧══╗         │
│     ║BRAS ║         │
│     ║  ↕  ║         │
│     ║ DOS ║         │
│     ╚═════╝         │
└─────────────────────┘`,
      start: 'Suspendu à la barre, prise en pronation, mains légèrement plus larges que les épaules. Corps tendu, abdos engagés.',
      movement: 'Tire les coudes vers le bas et vers les hanches. Monte jusqu\'à ce que la poitrine soit proche de la barre. Contrôle la descente lentement (2-3 secondes).',
      tips: ['Évite le balancement', 'Engage le dos avant les bras', 'Regarde légèrement vers le haut', 'Amplitude complète'],
      mistakes: ['Balancer le corps', 'Descente trop rapide', 'Shrug des épaules en haut', 'Chin trop loin de la barre'],
      muscles: { primary: ['Grand dorsal', 'Biceps'], secondary: ['Rhomboïdes', 'Trapèzes moyens', 'Biceps brachial'] },
    };

    if (n.includes('dips') || n.includes('barre parallèle')) return {
      category: 'Triceps · Poitrine · Épaules',
      difficulty: 'Intermédiaire',
      equipment: 'Barres parallèles',
      schema: `
┌─────────────────────┐
│        DIPS         │
│                     │
│  [BAR]       [BAR]  │
│    ╔═══════════╗    │
│    ║    👤     ║    │
│    ║   /|\\    ║    │
│    ╚═══════════╝    │
│    POSITION BAS     │
└─────────────────────┘`,
      start: 'Suspendu entre les barres, bras tendus, corps légèrement incliné vers l\'avant pour cibler la poitrine (ou droit pour les triceps).',
      movement: 'Descends lentement en fléchissant les coudes jusqu\'à ce que les épaules soient sous les coudes. Remonte en poussant.',
      tips: ['Contrôle la descente', 'Incline pour plus de poitrine', 'Reste droit pour plus de triceps', 'Évite de trop descendre si douleur épaule'],
      mistakes: ['Descente trop brusque', 'Épaules qui montent vers les oreilles', 'Balancement'],
      muscles: { primary: ['Triceps', 'Grand pectoral'], secondary: ['Deltoïde antérieur', 'Coracobrachiaux'] },
    };

    if (n.includes('curl') || n.includes('bicep') || n.includes('biceps')) return {
      category: 'Biceps · Avant-bras',
      difficulty: 'Débutant',
      equipment: 'Haltères ou Barre',
      schema: `
┌─────────────────────┐
│    CURL BICEPS      │
│                     │
│       👤            │
│      /|             │
│     / |             │
│    ●  |  ← HALTÈRE  │
│       |             │
│  POSITION BASSE     │
└─────────────────────┘`,
      start: 'Debout ou assis, haltères tenus en supination (paumes vers le haut). Coudes collés au corps.',
      movement: 'Lève les haltères en fléchissant les coudes. Monte jusqu\'à ce que les avant-bras soient presque verticaux. Squeeze en haut. Descends lentement.',
      tips: ['Coudes fixes, ne bougent pas', 'Contrôle la descente (excentrique)', 'Pas de balancement du dos', 'Supination complète'],
      mistakes: ['Balancer le dos', 'Coudes qui partent vers l\'avant', 'Descente trop rapide'],
      muscles: { primary: ['Biceps brachial', 'Brachial'], secondary: ['Brachioradial', 'Avant-bras'] },
    };

    if (n.includes('rowing') || n.includes('tirage') || n.includes('row')) return {
      category: 'Dos · Biceps · Rhomboïdes',
      difficulty: 'Intermédiaire',
      equipment: 'Haltère ou Barre',
      schema: `
┌─────────────────────┐
│   ROWING HALTÈRE    │
│                     │
│  👤──[BANC]         │
│  |\\                 │
│  | \\                │
│  ●  → HALTÈRE       │
│  TIRAGE VERTICAL    │
└─────────────────────┘`,
      start: 'Un genou et une main sur le banc. Dos plat, parallèle au sol. Haltère dans la main libre, bras tendu.',
      movement: 'Tire le coude vers le plafond, le long du corps. Monte jusqu\'à ce que le coude soit au-dessus du dos. Descends lentement.',
      tips: ['Coude collé au corps', 'Squeeze du dos en haut', 'Épaule ne monte pas', 'Dos reste plat'],
      mistakes: ['Rotation du buste trop importante', 'Tirer avec le bras plus que le dos', 'Dos qui s\'arrondit'],
      muscles: { primary: ['Grand dorsal', 'Rhomboïdes'], secondary: ['Biceps', 'Trapèzes', 'Érecteurs'] },
    };

    if (n.includes('pompe') || n.includes('push-up') || n.includes('pushup')) return {
      category: 'Poitrine · Épaules · Triceps',
      difficulty: 'Débutant',
      equipment: 'Aucun (poids du corps)',
      schema: `
┌─────────────────────┐
│     POMPES          │
│                     │
│  👤═══════════      │
│  /|            \\    │
│ ● ●             ●   │
│ MAINS        PIEDS  │
│                     │
│  Corps PLANCHE      │
└─────────────────────┘`,
      start: 'En position planche, mains à largeur d\'épaules, corps aligné des talons à la tête. Abdos engagés.',
      movement: 'Descends le corps en fléchissant les coudes jusqu\'à ce que la poitrine frôle le sol. Pousse vers le haut pour revenir.',
      tips: ['Corps reste en planche (pas les fesses en l\'air)', 'Coudes à ~45° du corps', 'Regarde légèrement vers l\'avant', 'Respire régulièrement'],
      mistakes: ['Fesses trop hautes ou trop basses', 'Coudes trop évasés', 'Descente incomplète', 'Tête qui tombe'],
      muscles: { primary: ['Grand pectoral', 'Triceps'], secondary: ['Deltoïde antérieur', 'Core', 'Sérratus'] },
    };

    if (n.includes('overhead') || n.includes('militaire') || n.includes('press épaule') || n.includes('shoulder')) return {
      category: 'Épaules · Triceps',
      difficulty: 'Intermédiaire',
      equipment: 'Haltères ou Barre',
      schema: `
┌─────────────────────┐
│  OVERHEAD PRESS     │
│                     │
│  ═══[BARRE]═══ ↑   │
│       ↕             │
│  ┌────────────┐     │
│  │  ÉPAULES  │     │
│  └────────────┘     │
│       👤            │
└─────────────────────┘`,
      start: 'Debout ou assis. Barre ou haltères au niveau des épaules, prise en pronation, coudes légèrement devant le corps.',
      movement: 'Pousse vers le haut en ligne droite. Rentre légèrement la tête pour que la barre passe devant le visage. Bras tendus en haut. Descends lentement.',
      tips: ['Core très engagé', 'Ne creuse pas le bas du dos', 'Bras tendus mais pas bloqués', 'Contrôle la descente'],
      mistakes: ['Cambrer le bas du dos', 'Pencher en arrière', 'Coudes qui s\'effondrent', 'Prise trop large'],
      muscles: { primary: ['Deltoïde médian', 'Deltoïde antérieur'], secondary: ['Triceps', 'Trapèzes', 'Core'] },
    };

    if (n.includes('leg press') || n.includes('presse')) return {
      category: 'Quadriceps · Fessiers · Ischio',
      difficulty: 'Débutant',
      equipment: 'Machine Leg Press',
      schema: `
┌─────────────────────┐
│     LEG PRESS       │
│                     │
│  [PLATEFORME]       │
│      ↕              │
│   ●─────●  ← PIEDS │
│   |     |          │
│  [SIÈGE INCLINÉ]   │
└─────────────────────┘`,
      start: 'Assis dans la machine, dos plat contre le dossier. Pieds à largeur d\'épaules sur la plateforme. Genoux fléchis à 90°.',
      movement: 'Pousse la plateforme jusqu\'à extension quasi complète (ne bloque pas les genoux). Reviens lentement, genoux à 90° minimum.',
      tips: ['Ne bloque jamais les genoux', 'Pieds à plat sur la plateforme', 'Ne laisse pas les fesses décoller', 'Contrôle le retour'],
      mistakes: ['Bloquer les genoux', 'Trop baisser la plateforme', 'Pieds trop hauts ou trop bas'],
      muscles: { primary: ['Quadriceps', 'Fessiers'], secondary: ['Ischio-jambiers', 'Mollets'] },
    };

    if (n.includes('planche') || n.includes('gainage') || n.includes('plank')) return {
      category: 'Core · Abdominaux · Stabilité',
      difficulty: 'Débutant',
      equipment: 'Aucun (poids du corps)',
      schema: `
┌─────────────────────┐
│      PLANCHE        │
│   (GAINAGE)         │
│                     │
│  👤═══════════      │
│  |\\           \\    │
│  ●  ●──────────●   │
│ AVANT-BRAS    PIEDS │
│                     │
│   CORPS DROIT       │
└─────────────────────┘`,
      start: 'Appuis sur les avant-bras et les orteils. Corps aligné, tête neutre, fessiers contractés.',
      movement: 'Position statique. Maintiens l\'alignement. Respire normalement. Engage le core tout au long.',
      tips: ['Ne laisse pas les hanches tomber', 'Regarde le sol', 'Contracte les abdos et les fessiers', 'Respire'],
      mistakes: ['Hanches qui tombent ou remontent', 'Dos qui s\'arrondit', 'Apnée (retenir la respiration)'],
      muscles: { primary: ['Transverse de l\'abdomen', 'Core profond'], secondary: ['Érecteurs', 'Fessiers', 'Épaules'] },
    };

    // Default générique
    return {
      category: exercise.muscles || 'Polyarticulaire',
      difficulty: 'Intermédiaire',
      equipment: exercise.equipment || 'Matériel varié',
      schema: `
┌─────────────────────┐
│  ${name.toUpperCase().slice(0, 19).padEnd(19)}│
│                     │
│     🎯 FOCUS        │
│   ${(exercise.muscles || 'MUSCLES CIBLES').slice(0, 17).padEnd(17)} │
│                     │
│  Séries: ${exercise.sets || '3-4'}          │
│  Reps:   ${exercise.reps || '8-12'}         │
│  Repos:  ${exercise.rest || '60-90s'}       │
└─────────────────────┘`,
      start: exercise.description || `Position de départ stable pour ${name}. Engage le core, posture droite.`,
      movement: exercise.instructions || `Effectue le mouvement de façon contrôlée. Concentrique (contraction) sur 1-2s, excentrique (retour) sur 2-3s. Amplitude complète.`,
      tips: ['Amplitude complète', 'Contrôle la phase excentrique', 'Respire régulièrement', 'Qualité > quantité'],
      mistakes: ['Momentum excessif', 'Amplitude réduite', 'Mauvaise posture'],
      muscles: { primary: [exercise.muscles || 'Muscle principal'], secondary: ['Muscles secondaires'] },
    };
  };

  const data = getExerciseData(exercise.name);

  return (
    <div style={{ fontSize: 14 }}>
      {/* Info badges */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {[
          { label: data.category, color: ACCENT },
          { label: data.difficulty, color: '#4488ff' },
          { label: data.equipment, color: '#ff6644' },
        ].map(({ label, color }) => (
          <div key={label} style={{ background: color + '22', border: '1px solid ' + color + '44', borderRadius: 8, padding: '4px 12px', fontSize: 11, fontWeight: 700, color }}>
            {label}
          </div>
        ))}
      </div>

      {/* Schéma ASCII */}
      <div style={{ background: '#050505', border: '1px solid #1a1a1a', borderRadius: 12, padding: '14px 16px', marginBottom: 16, fontFamily: 'monospace', fontSize: 12, color: ACCENT, lineHeight: 1.5, overflowX: 'auto', whiteSpace: 'pre' }}>
        {data.schema}
      </div>

      {/* Muscles */}
      <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '12px 16px', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>MUSCLES SOLLICITÉS</div>
        <div style={{ marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: '#555' }}>Principal : </span>
          {data.muscles.primary.map((m: string) => (
            <span key={m} style={{ background: ACCENT + '22', borderRadius: 6, padding: '2px 8px', fontSize: 12, color: ACCENT, fontWeight: 700, marginRight: 6 }}>{m}</span>
          ))}
        </div>
        <div>
          <span style={{ fontSize: 11, color: '#555' }}>Secondaire : </span>
          {data.muscles.secondary.map((m: string) => (
            <span key={m} style={{ background: '#1a1a1a', borderRadius: 6, padding: '2px 8px', fontSize: 12, color: '#888', marginRight: 6 }}>{m}</span>
          ))}
        </div>
      </div>

      {/* Steps */}
      {[
        { label: '1️⃣ POSITION DE DÉPART', content: data.start, color: '#4488ff' },
        { label: '2️⃣ MOUVEMENT', content: data.movement, color: ACCENT },
      ].map(({ label, content, color }) => (
        <div key={label} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '12px 16px', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.6 }}>{content}</div>
        </div>
      ))}

      {/* Tips */}
      <div style={{ background: ACCENT + '0a', border: '1px solid ' + ACCENT + '22', borderRadius: 12, padding: '12px 16px', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: ACCENT, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>✅ CONSEILS CLÉS</div>
        {data.tips.map((t: string) => (
          <div key={t} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
            <span style={{ color: ACCENT, flexShrink: 0 }}>•</span>
            <span style={{ fontSize: 13, color: '#ccc' }}>{t}</span>
          </div>
        ))}
      </div>

      {/* Mistakes */}
      <div style={{ background: '#ff444408', border: '1px solid #ff444422', borderRadius: 12, padding: '12px 16px', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#ff6666', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>❌ ERREURS À ÉVITER</div>
        {data.mistakes.map((m: string) => (
          <div key={m} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
            <span style={{ color: '#ff4444', flexShrink: 0 }}>•</span>
            <span style={{ fontSize: 13, color: '#ccc' }}>{m}</span>
          </div>
        ))}
      </div>

      {/* Volume */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { label: 'Séries', value: exercise.sets || '3-4' },
          { label: 'Reps', value: exercise.reps || '8-12' },
          { label: 'Repos', value: exercise.rest || '60-90s' },
          ...(exercise.weight_suggestion ? [{ label: 'Charge', value: exercise.weight_suggestion }] : []),
        ].map(({ label, value }) => (
          <div key={label} style={{ flex: 1, background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 10, padding: '10px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>{value}</div>
            <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
