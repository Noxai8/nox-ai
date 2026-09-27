// ── NOX EXERCISE VISUAL LIBRARY ───────────────────────────────────────────────
// Contrat : exerciseName → clé canonique → chemin /exercises/*.webp
// Format master : 1200×800, anatomie 3D, fond noir, muscles lime.
// Pour ajouter un exercice :
//   1. Placer l'asset dans public/exercises/<nom>.webp
//   2. Ajouter l'alias dans EXERCISE_ALIASES
//   3. Ajouter la clé dans VISUALS

// ── Normalisation ─────────────────────────────────────────────────────────────

function normalizeExerciseName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // supprimer accents
    .toLowerCase()
    .trim()
    .replace(/[''`]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Alias nom → clé canonique ─────────────────────────────────────────────────
// Tous les noms sont normalisés (sans accents, lowercase, espaces simples).

const EXERCISE_ALIASES: Record<string, string> = {
  // Pectoraux
  'developpe couche':                   'bench_press',
  'developpe couche barre':             'bench_press',
  'developpe couche barbell':           'bench_press',
  'bench press':                        'bench_press',
  'barbell bench press':                'bench_press',
  'developpe couche halteres':          'dumbbell_bench_press',
  'dumbbell bench press':               'dumbbell_bench_press',
  'developpe incline barre':            'incline_bench_press',
  'developpe incline barbell':          'incline_bench_press',
  'incline bench press':                'incline_bench_press',
  'incline barbell bench press':        'incline_bench_press',
  'developpe incline halteres':         'incline_dumbbell_press',
  'incline dumbbell press':             'incline_dumbbell_press',
  'ecarte halteres':                    'dumbbell_fly',
  'dumbbell fly':                       'dumbbell_fly',
  'pompes':                             'push_up',
  'push up':                            'push_up',
  'push-up':                            'push_up',
  'dips':                               'dips',
  'dips pectoraux':                     'dips',

  // Dos
  'traction':                           'pull_up',
  'tractions':                          'pull_up',
  'pull up':                            'pull_up',
  'pull-up':                            'pull_up',
  'pronated pull up':                   'pull_up',
  'chin up':                            'chin_up',
  'chin-up':                            'chin_up',
  'supinated pull up':                  'chin_up',
  'tirage vertical':                    'lat_pulldown',
  'tirage vertical barre':              'lat_pulldown',
  'lat pulldown':                       'lat_pulldown',
  'tirage horizontal':                  'cable_row',
  'rowing cable':                       'cable_row',
  'seated cable row':                   'cable_row',
  'rowing barre':                       'barbell_row',
  'barbell row':                        'barbell_row',
  'bent over row':                      'barbell_row',
  'bent over row barbell':              'barbell_row',
  'rowing haltere':                     'dumbbell_row',
  'dumbbell row':                       'dumbbell_row',
  'one arm dumbbell row':               'dumbbell_row',
  'soulevé de terre':                   'deadlift',
  'soulevedterre':                      'deadlift',
  'deadlift':                           'deadlift',
  'soulevé de terre roumain':           'romanian_deadlift',
  'romanian deadlift':                  'romanian_deadlift',
  'rdl':                                'romanian_deadlift',
  'hyperextension':                     'back_extension',

  // Épaules
  'developpe militaire':                'overhead_press',
  'developpe militaire barre':          'overhead_press',
  'overhead press':                     'overhead_press',
  'military press':                     'overhead_press',
  'barbell overhead press':             'overhead_press',
  'developpe militaire halteres':       'dumbbell_shoulder_press',
  'dumbbell shoulder press':            'dumbbell_shoulder_press',
  'overhead press halteres':            'dumbbell_shoulder_press',
  'elevations laterales':               'lateral_raise',
  'lateral raise':                      'lateral_raise',
  'dumbbell lateral raise':             'lateral_raise',
  'cable lateral raise':                'lateral_raise',
  'elevations frontales':               'front_raise',
  'front raise':                        'front_raise',
  'dumbbell front raise':               'front_raise',
  'oiseau':                             'rear_delt_fly',
  'reverse fly':                        'rear_delt_fly',
  'face pull':                          'face_pull',
  'face pull cable':                    'face_pull',
  'tirage menton':                      'upright_row',

  // Biceps
  'curl barre':                         'barbell_curl',
  'barbell curl':                       'barbell_curl',
  'curl halteres':                      'dumbbell_curl',
  'dumbbell curl':                      'dumbbell_curl',
  'curl marteau':                       'hammer_curl',
  'hammer curl':                        'hammer_curl',
  'curl poulie':                        'cable_curl',
  'cable curl':                         'cable_curl',
  'curl incline':                       'incline_dumbbell_curl',

  // Triceps
  'extension triceps poulie':           'tricep_pushdown',
  'tricep pushdown':                    'tricep_pushdown',
  'pushdown':                           'tricep_pushdown',
  'extension triceps':                  'tricep_extension',
  'skull crusher':                      'skull_crusher',
  'extensions francaises':              'skull_crusher',
  'dips triceps':                       'tricep_dips',
  'kickback':                           'tricep_kickback',

  // Jambes
  'squat':                              'squat',
  'squat barre':                        'squat',
  'back squat':                         'squat',
  'squat avant':                        'front_squat',
  'front squat':                        'front_squat',
  'leg press':                          'leg_press',
  'presse a cuisses':                   'leg_press',
  'fentes':                             'lunge',
  'lunge':                              'lunge',
  'fentes marchees':                    'walking_lunge',
  'walking lunge':                      'walking_lunge',
  'extension quadriceps':               'leg_extension',
  'leg extension':                      'leg_extension',
  'bulgarian split squat':              'bulgarian_split_squat',
  'split squat bulgare':                'bulgarian_split_squat',

  // Ischio / Fessiers
  'leg curl':                           'leg_curl',
  'curl ischio':                        'leg_curl',
  'hip thrust':                         'hip_thrust',
  'hip thrust barre':                   'hip_thrust',
  'glute bridge':                       'glute_bridge',
  'pont fessier':                       'glute_bridge',
  'good morning':                       'good_morning',

  // Mollets
  'mollets':                            'calf_raise',
  'calf raise':                         'calf_raise',
  'elevation mollets':                  'calf_raise',

  // Core
  'crunch':                             'crunch',
  'planche':                            'plank',
  'plank':                              'plank',
  'gainage':                            'plank',
  'releve de jambes':                   'leg_raise',
  'leg raise':                          'leg_raise',
  'ab wheel':                           'ab_rollout',
  'rollout':                            'ab_rollout',
  'russian twist':                      'russian_twist',
};

// ── Visuels disponibles : clé → chemin dans public/ ───────────────────────────
// Ajouter ici quand un nouvel asset est livré.

const VISUALS: Record<string, string> = {
  // Pectoraux
  bench_press:            '/exercises/bench-press-barbell.webp',
  dumbbell_bench_press:   '/exercises/bench-press-dumbbells.webp',
  incline_bench_press:    '/exercises/incline-bench-press-barbell.webp',
  incline_dumbbell_press: '/exercises/incline-bench-press-dumbbells.webp',

  // Dos
  pull_up:                '/exercises/pronated-pull-up.webp',
  chin_up:                '/exercises/supinated-pull-up.webp',
  lat_pulldown:           '/exercises/lat-pulldown-chest.webp',
  cable_row:              '/exercises/seated-cable-row.webp',
  barbell_row:            '/exercises/bent-over-row-barbell.webp',
  dumbbell_row:           '/exercises/one-arm-dumbbell-row.webp',

  // Épaules
  overhead_press:          '/exercises/overhead-press-barbell.webp',
  dumbbell_shoulder_press: '/exercises/overhead-press-dumbbells.webp',
  lateral_raise:           '/exercises/dumbbell-lateral-raise.webp',
  front_raise:             '/exercises/dumbbell-front-raise.webp',
  face_pull:               '/exercises/face-pull-cable.webp',

  // Jambes
  squat:                  '/exercises/back-squat-barbell.webp',
};

// ── Muscles cibles (fallback si pas de visuel) ────────────────────────────────

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
  back_extension:          'Lombaires · Fessiers',
  overhead_press:          'Épaules · Triceps',
  dumbbell_shoulder_press: 'Épaules · Triceps',
  lateral_raise:           'Deltoïdes latéraux',
  front_raise:             'Deltoïdes antérieurs',
  rear_delt_fly:           'Deltoïdes postérieurs · Trapèzes',
  face_pull:               'Épaules postérieures · Trapèzes',
  barbell_curl:            'Biceps',
  dumbbell_curl:           'Biceps',
  hammer_curl:             'Biceps · Avant-bras',
  cable_curl:              'Biceps',
  tricep_pushdown:         'Triceps',
  tricep_extension:        'Triceps',
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

// ── API publique ──────────────────────────────────────────────────────────────

/** Normalise un nom d'exercice et retourne la clé canonique, ou null si inconnue */
export function toExerciseKey(exerciseName?: string | null): string | null {
  if (!exerciseName) return null;
  const normalized = normalizeExerciseName(exerciseName);
  // Lookup exact
  if (EXERCISE_ALIASES[normalized]) return EXERCISE_ALIASES[normalized];
  // Lookup partiel — le nom contient un alias connu
  for (const [alias, key] of Object.entries(EXERCISE_ALIASES)) {
    if (normalized.includes(alias) || alias.includes(normalized)) return key;
  }
  return null;
}

/** Chemin vers le visuel — null si pas encore disponible */
export function getExerciseVisualPath(exerciseName?: string | null): string | null {
  const key = toExerciseKey(exerciseName);
  if (!key) return null;
  return VISUALS[key] ?? null;
}

/** Muscles ciblés pour le fallback UI */
export function getExerciseMuscles(exerciseName?: string | null): string {
  const key = toExerciseKey(exerciseName);
  if (!key) return 'Illustration bientôt disponible';
  return MUSCLES[key] ?? 'Illustration bientôt disponible';
}
