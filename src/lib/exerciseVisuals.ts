// NOX Exercise Library — clés canoniques → visuels
// Sources : ExerciseDB (exercisedb.io) + Wikimedia Commons (CC0/CC-BY)
// Règle : si aucun visuel fiable → image_url: null → UI affiche "Illustration bientôt disponible"

export type ExerciseVisual = {
  key: string;
  image_url: string | null;
  muscles: string;
};

// Table de normalisation : nom FR/EN → clé canonique
const NAME_TO_KEY: Record<string, string> = {
  // Pectoraux
  'développé couché barre':       'bench_press',
  'developpe couche barre':       'bench_press',
  'bench press':                  'bench_press',
  'barbell bench press':          'bench_press',
  'développé couché haltères':    'dumbbell_bench_press',
  'développé incliné barre':      'incline_bench_press',
  'incline bench press':          'incline_bench_press',
  'développé incliné haltères':   'incline_dumbbell_press',
  'écarté haltères':              'dumbbell_fly',
  'dumbbell fly':                 'dumbbell_fly',
  'pompes':                       'push_up',
  'push-up':                      'push_up',
  'push up':                      'push_up',
  'dips':                         'dips',
  'dips pectoraux':               'dips',

  // Dos
  'traction':                     'pull_up',
  'tractions':                    'pull_up',
  'pull-up':                      'pull_up',
  'pull up':                      'pull_up',
  'chin up':                      'chin_up',
  'tirage vertical':              'lat_pulldown',
  'lat pulldown':                 'lat_pulldown',
  'tirage horizontal':            'cable_row',
  'rowing barre':                 'barbell_row',
  'barbell row':                  'barbell_row',
  'rowing haltère':               'dumbbell_row',
  'dumbbell row':                 'dumbbell_row',
  'soulevé de terre':             'deadlift',
  'deadlift':                     'deadlift',
  'soulevé de terre roumain':     'romanian_deadlift',
  'romanian deadlift':            'romanian_deadlift',
  'rdl':                          'romanian_deadlift',
  'hyperextension':               'back_extension',

  // Épaules
  'développé militaire':          'overhead_press',
  'overhead press':               'overhead_press',
  'military press':               'overhead_press',
  'développé militaire haltères': 'dumbbell_shoulder_press',
  'dumbbell shoulder press':      'dumbbell_shoulder_press',
  'élévations latérales':         'lateral_raise',
  'lateral raise':                'lateral_raise',
  'élévations frontales':         'front_raise',
  'oiseau':                       'rear_delt_fly',
  'reverse fly':                  'rear_delt_fly',
  'face pull':                    'face_pull',
  'tirage menton':                'upright_row',

  // Biceps
  'curl barre':                   'barbell_curl',
  'barbell curl':                 'barbell_curl',
  'curl haltères':                'dumbbell_curl',
  'dumbbell curl':                'dumbbell_curl',
  'curl marteau':                 'hammer_curl',
  'hammer curl':                  'hammer_curl',
  'curl poulie':                  'cable_curl',
  'curl incliné':                 'incline_dumbbell_curl',

  // Triceps
  'extension triceps poulie':     'tricep_pushdown',
  'tricep pushdown':              'tricep_pushdown',
  'pushdown':                     'tricep_pushdown',
  'extension triceps':            'tricep_extension',
  'skull crusher':                'skull_crusher',
  'extensions françaises':        'skull_crusher',
  'dips triceps':                 'tricep_dips',
  'kickback':                     'tricep_kickback',

  // Jambes / Quadriceps
  'squat':                        'squat',
  'squat barre':                  'squat',
  'back squat':                   'squat',
  'squat avant':                  'front_squat',
  'front squat':                  'front_squat',
  'leg press':                    'leg_press',
  'presse à cuisses':             'leg_press',
  'fentes':                       'lunge',
  'lunge':                        'lunge',
  'fentes marchées':              'walking_lunge',
  'extension quadriceps':         'leg_extension',
  'leg extension':                'leg_extension',
  'bulgarian split squat':        'bulgarian_split_squat',
  'split squat bulgare':          'bulgarian_split_squat',

  // Ischio / Fessiers
  'leg curl':                     'leg_curl',
  'curl ischio':                  'leg_curl',
  'hip thrust':                   'hip_thrust',
  'hip thrust barre':             'hip_thrust',
  'glute bridge':                 'glute_bridge',
  'pont fessier':                 'glute_bridge',
  'good morning':                 'good_morning',

  // Mollets
  'mollets':                      'calf_raise',
  'calf raise':                   'calf_raise',
  'élévation mollets':            'calf_raise',

  // Abdominaux / Core
  'crunch':                       'crunch',
  'crunchs':                      'crunch',
  'planche':                      'plank',
  'plank':                        'plank',
  'relevé de jambes':             'leg_raise',
  'leg raise':                    'leg_raise',
  'crunch à la poulie':           'cable_crunch',
  'ab wheel':                     'ab_rollout',
  'rollout':                      'ab_rollout',
  'russian twist':                'russian_twist',
  'gainage':                      'plank',
};

// Bibliothèque visuelle — images CC0/libre de droits
// Sources : Wikimedia Commons, ExerciseDB illustrations
// ── BIBLIOTHÈQUE VISUELLE NOX ─────────────────────────────────────────────────
// Format master : 1200×800, anatomie 3D, fond noir, muscles lime, aucun texte.
// Clé = résultat de toExerciseKey(). Valeur = chemin dans public/exercises/.
// Pour ajouter un exercice : 1) générer l'asset 1200×800, 2) le placer dans
// public/exercises/, 3) ajouter une ligne ici. Ne jamais toucher à Training.tsx.

const VISUALS: Record<string, string> = {
  // ── PECTORAUX
  bench_press:            '/exercises/bench-press-barbell.webp',
  dumbbell_bench_press:   '/exercises/bench-press-dumbbells.webp',
  incline_bench_press:    '/exercises/incline-bench-press-barbell.webp',
  incline_dumbbell_press: '/exercises/incline-bench-press-dumbbells.webp',

  // ── DOS
  pull_up:                '/exercises/pronated-pull-up.webp',
  chin_up:                '/exercises/supinated-pull-up.webp',
  lat_pulldown:           '/exercises/lat-pulldown-chest.webp',
  cable_row:              '/exercises/seated-cable-row.webp',
  barbell_row:            '/exercises/bent-over-row-barbell.webp',
  dumbbell_row:           '/exercises/one-arm-dumbbell-row.webp',

  // ── ÉPAULES
  overhead_press:          '/exercises/overhead-press-barbell.webp',
  dumbbell_shoulder_press: '/exercises/overhead-press-dumbbells.webp',
  lateral_raise:           '/exercises/dumbbell-lateral-raise.webp',
  front_raise:             '/exercises/dumbbell-front-raise.webp',
  face_pull:               '/exercises/face-pull-cable.webp',

  // ── JAMBES
  squat:                  '/exercises/back-squat-barbell.webp',
};

// Muscles cibles par clé — affiché si aucun visuel disponible
const MUSCLES: Record<string, string> = {
  bench_press:             'Pectoraux · Triceps · Épaules',
  dumbbell_bench_press:    'Pectoraux · Triceps',
  incline_bench_press:     'Pectoraux haut · Triceps',
  incline_dumbbell_press:  'Pectoraux haut · Épaules',
  dumbbell_fly:            'Pectoraux',
  push_up:                 'Pectoraux · Triceps · Core',
  dips:                    'Triceps · Pectoraux',
  pull_up:                 'Dos · Biceps',
  chin_up:                 'Dos · Biceps',
  lat_pulldown:            'Dos large · Biceps',
  cable_row:               'Dos · Biceps · Trapèzes',
  barbell_row:             'Dos · Biceps',
  dumbbell_row:            'Dos · Biceps',
  deadlift:                'Ischio · Dos · Fessiers',
  romanian_deadlift:       'Ischio · Fessiers · Lombaires',
  overhead_press:          'Épaules · Triceps',
  dumbbell_shoulder_press: 'Épaules · Triceps',
  lateral_raise:           'Deltoïdes latéraux',
  front_raise:             'Deltoïdes antérieurs',
  rear_delt_fly:           'Deltoïdes postérieurs · Trapèzes',
  face_pull:               'Épaules postérieures · Trapèzes',
  barbell_curl:            'Biceps',
  dumbbell_curl:           'Biceps',
  hammer_curl:             'Biceps · Avant-bras',
  tricep_pushdown:         'Triceps',
  skull_crusher:           'Triceps',
  squat:                   'Quadriceps · Fessiers · Ischio',
  front_squat:             'Quadriceps · Core',
  leg_press:               'Quadriceps · Fessiers',
  lunge:                   'Quadriceps · Fessiers',
  bulgarian_split_squat:   'Quadriceps · Fessiers',
  leg_extension:           'Quadriceps',
  leg_curl:                'Ischio-jambiers',
  hip_thrust:              'Fessiers',
  glute_bridge:            'Fessiers',
  calf_raise:              'Mollets',
  crunch:                  'Abdominaux',
  plank:                   'Core · Abdominaux',
  leg_raise:               'Abdominaux bas',
  russian_twist:           'Obliques',
};

export { VISUALS, MUSCLES, NAME_TO_KEY };

export const UNKNOWN_EXERCISE_VISUAL_KEY = 'unknown-exercise';

export function getExerciseVisualKey(exerciseName?: string | null): string {
  if (!exerciseName) return UNKNOWN_EXERCISE_VISUAL_KEY;
  const key = toExerciseKey(exerciseName.trim());
  return VISUALS[key] ? key : UNKNOWN_EXERCISE_VISUAL_KEY;
}

/** Retourne le chemin /exercises/*.webp ou null si pas de visuel disponible */
export function getExerciseVisualPath(exerciseName?: string | null): string | null {
  if (!exerciseName) return null;
  const key = toExerciseKey(exerciseName.trim());
  const path = VISUALS[key] ?? null;
  if (process.env.NODE_ENV === 'development') {
    console.log('[NOX VISUAL]', { name: exerciseName, key, path });
  }
  return path;
}

/** Retourne les muscles ciblés pour l'affichage fallback */
export function getExerciseMuscles(exerciseName?: string | null): string {
  if (!exerciseName) return 'Illustration bientôt disponible';
  const key = toExerciseKey(exerciseName.trim());
  return MUSCLES[key] ?? 'Illustration bientôt disponible';
}

/** Rétrocompatibilité avec l'ancien getExerciseVisual() */
export function getExerciseVisual(name: string): ExerciseVisual | null {
  const key = toExerciseKey(name);
  const image_url = VISUALS[key] ?? null;
  const muscles = MUSCLES[key] ?? 'Illustration bientôt disponible';
  if (!image_url && !muscles) return null;
  return { key, image_url, muscles };
}
