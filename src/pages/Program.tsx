import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

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
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: ACCENT, fontWeight: 900, letterSpacing: '.15em' }}>CHARGEMENT...</div>
    </div>
  );

  const sessions: any[] = program?.program_json?.sessions || [];
  const allExercises: any[] = sessions.flatMap((s: any) => s.exercises || []);
  const uniqueExercises = allExercises.filter((e, i, arr) => arr.findIndex(x => x.name === e.name) === i);

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ padding: '24px 20px 0', borderBottom: '1px solid ' + BORDER }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em' }}>Programme actif</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-.02em' }}>
              {program?.name || 'MON PROGRAMME'}
            </div>
            {program && (
              <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
                {program.days_per_week}j/semaine · {program.program_json?.session_length_min || 60}min · {sessions.length} séances
              </div>
            )}
          </div>
          <button onClick={() => navigate('/generate-program')}
            style={{ background: ACCENT + '22', border: '1px solid ' + ACCENT + '44', borderRadius: 12, padding: '8px 14px', color: ACCENT, fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
            ↻ Nouveau
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {[{ id: 'plan', label: '📋 Plan' }, { id: 'exercises', label: '🏋️ Exercices' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              style={{ flex: 1, padding: '10px 0', background: 'none', border: 'none', borderBottom: '2px solid ' + (tab === t.id ? ACCENT : 'transparent'), color: tab === t.id ? ACCENT : '#555', fontWeight: 800, fontSize: 13, cursor: 'pointer', transition: 'all .2s' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {!program ? (
        <div style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>📋</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 12 }}>Pas encore de programme</div>
          <div style={{ fontSize: 14, color: '#555', marginBottom: 32, lineHeight: 1.5 }}>
            NOX va créer un programme personnalisé selon ton objectif, ton niveau et ton matériel
          </div>
          <button onClick={() => navigate('/generate-program')}
            style={{ padding: '16px 32px', background: ACCENT, border: 'none', borderRadius: 14, color: '#000', fontWeight: 900, fontSize: 15, cursor: 'pointer' }}>
            CRÉER MON PROGRAMME
          </button>
        </div>
      ) : (
        <div style={{ padding: '20px 20px 0' }}>

          {/* ── TAB PLAN ── */}
          {tab === 'plan' && (
            <>
              {/* Goal card */}
              {program.goal && (
                <div style={{ background: ACCENT + '11', border: '1px solid ' + ACCENT + '33', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: ACCENT, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Objectif du programme</div>
                  <div style={{ fontSize: 14, color: '#ccc', lineHeight: 1.5 }}>{program.goal}</div>
                </div>
              )}

              {/* Progression notes */}
              {program.program_json?.progression_notes && (
                <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: '#555', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>⚡ Logique de progression</div>
                  <div style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>{program.program_json.progression_notes}</div>
                </div>
              )}

              {/* Sessions */}
              <div style={{ fontSize: 11, fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>
                SÉANCES — {sessions.length} par semaine
              </div>
              {sessions.map((session: any, si: number) => (
                <div key={si} style={{ marginBottom: 12 }}>
                  <button onClick={() => setSelectedSession(selectedSession?.name === session.name ? null : session)}
                    style={{ width: '100%', background: SURFACE, border: '1px solid ' + (selectedSession?.name === session.name ? ACCENT + '66' : BORDER), borderRadius: 16, padding: '16px 18px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <div style={{ background: ACCENT + '22', border: '1px solid ' + ACCENT + '44', borderRadius: 8, padding: '3px 10px', fontSize: 11, fontWeight: 900, color: ACCENT }}>
                          {session.day || `J${si + 1}`}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{session.name}</div>
                      </div>
                      <div style={{ fontSize: 12, color: '#555' }}>
                        {session.exercises?.length || 0} exercices · {session.duration || program.program_json?.session_length_min || 60} min
                      </div>
                      {session.focus && <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>{session.focus}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button onClick={e => { e.stopPropagation(); navigate('/training/' + (session.id || si)); }}
                        style={{ background: ACCENT, border: 'none', borderRadius: 10, padding: '8px 14px', color: '#000', fontWeight: 900, fontSize: 12, cursor: 'pointer' }}>
                        ▶ START
                      </button>
                      <span style={{ color: '#333', fontSize: 18 }}>{selectedSession?.name === session.name ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {/* Expanded session */}
                  {selectedSession?.name === session.name && (
                    <div style={{ background: '#0d0d0d', border: '1px solid ' + BORDER, borderRadius: '0 0 16px 16px', borderTop: 'none', padding: '0 16px 16px' }}>
                      {(session.exercises || []).map((ex: any, ei: number) => (
                        <div key={ei} style={{ borderTop: ei === 0 ? '1px solid ' + BORDER : 'none', padding: '14px 0', borderBottom: '1px solid ' + BORDER }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <div style={{ fontSize: 11, fontWeight: 900, color: '#333', width: 20 }}>{ei + 1}.</div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{ex.name}</div>
                              </div>
                              <div style={{ display: 'flex', gap: 8, marginLeft: 28, flexWrap: 'wrap' }}>
                                <span style={{ background: '#1a1a1a', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: '#ccc', fontWeight: 700 }}>
                                  {ex.sets} × {ex.reps}
                                </span>
                                {ex.rest && <span style={{ background: '#1a1a1a', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: '#555' }}>repos {ex.rest}</span>}
                                {ex.weight_suggestion && <span style={{ background: ACCENT + '22', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: ACCENT }}>~{ex.weight_suggestion}</span>}
                              </div>
                              {ex.muscles && <div style={{ fontSize: 11, color: '#444', marginTop: 6, marginLeft: 28 }}>🎯 {ex.muscles}</div>}
                            </div>
                            <button onClick={() => setSelectedExercise(ex)}
                              style={{ background: 'transparent', border: '1px solid #1a1a1a', borderRadius: 8, padding: '6px 12px', color: '#555', fontSize: 11, cursor: 'pointer', flexShrink: 0, marginLeft: 8 }}>
                              DEMO →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Nutrition notes */}
              {program.program_json?.nutrition_notes && (
                <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: '#555', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>🥗 Nutrition recommandée</div>
                  <div style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>{program.program_json.nutrition_notes}</div>
                </div>
              )}
            </>
          )}

          {/* ── TAB EXERCICES ── */}
          {tab === 'exercises' && (
            <div>
              <div style={{ fontSize: 13, color: '#555', marginBottom: 16, lineHeight: 1.5 }}>
                Tous les exercices de ton programme avec descriptions détaillées et schémas.
              </div>
              {uniqueExercises.map((ex: any, i: number) => (
                <button key={i} onClick={() => setSelectedExercise(selectedExercise?.name === ex.name ? null : ex)}
                  style={{ width: '100%', background: SURFACE, border: '1px solid ' + (selectedExercise?.name === ex.name ? ACCENT + '44' : BORDER), borderRadius: 14, padding: '14px 16px', marginBottom: 10, textAlign: 'left', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{ex.name}</div>
                      {ex.muscles && <div style={{ fontSize: 12, color: '#555', marginTop: 3 }}>🎯 {ex.muscles}</div>}
                    </div>
                    <span style={{ color: '#333', fontSize: 16 }}>{selectedExercise?.name === ex.name ? '▲' : '▼'}</span>
                  </div>

                  {selectedExercise?.name === ex.name && (
                    <ExerciseDemo exercise={ex} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Exercise demo modal */}
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
