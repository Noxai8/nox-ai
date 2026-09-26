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
const VISUALS: Record<string, Omit<ExerciseVisual, 'key'>> = {
  bench_press:            { image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Benchpress.svg/640px-Benchpress.svg.png', muscles: 'Pectoraux · Triceps · Épaules' },
  incline_bench_press:    { image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Incline-bench-press.svg/640px-Incline-bench-press.svg.png', muscles: 'Pectoraux haut · Triceps' },
  dumbbell_bench_press:   { image_url: null, muscles: 'Pectoraux · Triceps' },
  incline_dumbbell_press: { image_url: null, muscles: 'Pectoraux haut · Épaules' },
  dumbbell_fly:           { image_url: null, muscles: 'Pectoraux' },
  push_up:                { image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Push-up_-_Gifs.gif/320px-Push-up_-_Gifs.gif', muscles: 'Pectoraux · Triceps · Core' },
  dips:                   { image_url: null, muscles: 'Triceps · Pectoraux' },
  tricep_dips:            { image_url: null, muscles: 'Triceps' },

  pull_up:                { image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Pull_up.gif/320px-Pull_up.gif', muscles: 'Dos · Biceps' },
  chin_up:                { image_url: null, muscles: 'Dos · Biceps' },
  lat_pulldown:           { image_url: null, muscles: 'Dos large · Biceps' },
  cable_row:              { image_url: null, muscles: 'Dos · Biceps · Trapèzes' },
  barbell_row:            { image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Bent_over_row.svg/640px-Bent_over_row.svg.png', muscles: 'Dos · Biceps' },
  dumbbell_row:           { image_url: null, muscles: 'Dos · Biceps' },
  deadlift:               { image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Conventional_deadlift.svg/640px-Conventional_deadlift.svg.png', muscles: 'Ischio · Dos · Fessiers' },
  romanian_deadlift:      { image_url: null, muscles: 'Ischio · Fessiers · Lombaires' },
  back_extension:         { image_url: null, muscles: 'Lombaires · Fessiers' },

  overhead_press:         { image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/OHP.svg/640px-OHP.svg.png', muscles: 'Épaules · Triceps' },
  dumbbell_shoulder_press:{ image_url: null, muscles: 'Épaules · Triceps' },
  lateral_raise:          { image_url: null, muscles: 'Deltoïdes latéraux' },
  front_raise:            { image_url: null, muscles: 'Deltoïdes antérieurs' },
  rear_delt_fly:          { image_url: null, muscles: 'Deltoïdes postérieurs · Trapèzes' },
  face_pull:              { image_url: null, muscles: 'Épaules postérieures · Trapèzes' },
  upright_row:            { image_url: null, muscles: 'Trapèzes · Deltoïdes' },

  barbell_curl:           { image_url: null, muscles: 'Biceps' },
  dumbbell_curl:          { image_url: null, muscles: 'Biceps' },
  hammer_curl:            { image_url: null, muscles: 'Biceps · Avant-bras' },
  cable_curl:             { image_url: null, muscles: 'Biceps' },
  incline_dumbbell_curl:  { image_url: null, muscles: 'Biceps long' },

  tricep_pushdown:        { image_url: null, muscles: 'Triceps' },
  tricep_extension:       { image_url: null, muscles: 'Triceps' },
  skull_crusher:          { image_url: null, muscles: 'Triceps' },
  tricep_kickback:        { image_url: null, muscles: 'Triceps' },

  squat:                  { image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/SquatWithBarbell.svg/640px-SquatWithBarbell.svg.png', muscles: 'Quadriceps · Fessiers · Ischio' },
  front_squat:            { image_url: null, muscles: 'Quadriceps · Core' },
  leg_press:              { image_url: null, muscles: 'Quadriceps · Fessiers' },
  lunge:                  { image_url: null, muscles: 'Quadriceps · Fessiers' },
  walking_lunge:          { image_url: null, muscles: 'Quadriceps · Fessiers · Équilibre' },
  leg_extension:          { image_url: null, muscles: 'Quadriceps' },
  bulgarian_split_squat:  { image_url: null, muscles: 'Quadriceps · Fessiers' },

  leg_curl:               { image_url: null, muscles: 'Ischio-jambiers' },
  hip_thrust:             { image_url: null, muscles: 'Fessiers' },
  glute_bridge:           { image_url: null, muscles: 'Fessiers' },
  good_morning:           { image_url: null, muscles: 'Ischio · Lombaires' },

  calf_raise:             { image_url: null, muscles: 'Mollets' },

  crunch:                 { image_url: null, muscles: 'Abdominaux' },
  plank:                  { image_url: null, muscles: 'Core · Abdominaux' },
  leg_raise:              { image_url: null, muscles: 'Abdominaux bas' },
  cable_crunch:           { image_url: null, muscles: 'Abdominaux' },
  ab_rollout:             { image_url: null, muscles: 'Core · Abdominaux' },
  russian_twist:          { image_url: null, muscles: 'Obliques' },
};

/** Normalise un nom d'exercice en clé canonique */
export function toExerciseKey(name: string): string {
  const normalized = name
    .toLowerCase()
    .replace(/[éèêë]/g, 'e')
    .replace(/[àâä]/g, 'a')
    .replace(/[ùûü]/g, 'u')
    .replace(/[ôö]/g, 'o')
    .replace(/[îï]/g, 'i')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  // Lookup direct
  if (NAME_TO_KEY[normalized]) return NAME_TO_KEY[normalized];

  // Lookup partiel — on cherche la clé dont le nom contient les mots clés
  for (const [alias, key] of Object.entries(NAME_TO_KEY)) {
    if (normalized.includes(alias) || alias.includes(normalized)) {
      return key;
    }
  }

  // Fallback : slugify le nom
  return normalized.replace(/\s+/g, '_');
}

/** Retourne le visuel pour un exercice — null si inconnu */
export function getExerciseVisual(name: string): ExerciseVisual | null {
  const key = toExerciseKey(name);
  const visual = VISUALS[key];
  if (!visual) return null;
  return { key, ...visual };
}

export { VISUALS, NAME_TO_KEY };
