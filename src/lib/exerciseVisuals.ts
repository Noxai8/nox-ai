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


  // ── Alias exacts issus de Supabase ──────────────────────────────────────────

  // PECTORAUX
  'ecarte couche halteres':                           'dumbbell_fly',
  'ecarte poulie haute':                              'cable_fly',
  'ecarte poulie vis a vis':                          'cable_fly',
  'pec deck':                                         'pec_deck',
  'pompes prise large':                               'wide_push_up',
  'dips lestes':                                      'weighted_dips',
  'dips sur banc':                                    'bench_dips',

  // ÉPAULES
  'arnold press':                                     'arnold_press',
  'developpe epaules machine':                        'machine_shoulder_press',
  'elevation laterale poulie':                        'cable_lateral_raise',
  'elevations laterales halteres':                    'lateral_raise',
  'elevations frontales halteres':                    'front_raise',
  'oiseau halteres':                                  'rear_delt_fly',
  'reverse pec deck':                                 'reverse_pec_deck',
  'push press':                                       'push_press',

  // BICEPS
  'curl alterne halteres':                            'alternating_dumbbell_curl',
  'curl barre ez':                                    'ez_bar_curl',
  'curl halteres incline':                            'incline_dumbbell_curl',

  // TRICEPS
  'extension triceps corde':                          'rope_pushdown',
  'extension triceps couche halteres':                'dumbbell_skull_crusher',
  'extension triceps poulie au dessus de la tete':   'overhead_cable_tricep_extension',
  'triceps poulie haute corde':                       'rope_pushdown',

  // DOS
  'face pull poulie':                                 'face_pull',
  'rowing barre buste penche':                        'barbell_row',
  'rowing elastique':                                 'band_row',
  'rowing haltere unilaterale':                       'dumbbell_row',
  'rowing haltere unilateral':                        'dumbbell_row',
  'rowing machine poitrine appuyee':                  'chest_supported_machine_row',
  'rowing pendlay':                                   'pendlay_row',
  'shrugs barre':                                     'barbell_shrug',
  'tirage barre pronation':                           'barbell_row',
  'tirage horizontal poulie':                         'cable_row',
  'tirage poulie haute prise neutre':                 'neutral_grip_lat_pulldown',
  'tirage vertical poitrine':                         'lat_pulldown',
  'tirage vertical prise neutre':                     'neutral_grip_lat_pulldown',
  'tirage vertical prise serree':                     'close_grip_lat_pulldown',
  'tractions assistees':                              'assisted_pull_up',
  'tractions prise large':                            'wide_grip_pull_up',
  'tractions pronation':                              'pull_up',

  // DEADLIFT / CHAÎNE POSTÉRIEURE
  'romanian deadlift barre':                          'romanian_deadlift',
  'souleve de terre conventionnel':                   'deadlift',
  'souleve de terre roumain':                         'romanian_deadlift',
  'souleve de terre roumain halteres':                'dumbbell_romanian_deadlift',
  'souleve de terre sumo':                            'sumo_deadlift',
  'good morning barre':                               'good_morning',

  // QUADRICEPS / JAMBES
  'extension de jambes':                              'leg_extension',
  'extension quadriceps machine':                     'leg_extension',
  'fentes arriere halteres':                          'reverse_dumbbell_lunge',
  'fentes marchees halteres':                         'walking_lunge',
  'goblet squat':                                     'goblet_squat',
  'leg extension':                                    'leg_extension',
  'squat barre arriere':                              'squat',
  'squat gobelet kettlebell':                         'goblet_squat',
  'swing kettlebell':                                 'kettlebell_swing',

  // ISCHIOS / FESSIERS
  'abduction de hanches machine':                     'hip_abduction_machine',
  'glute bridge barre':                               'barbell_glute_bridge',
  'hip thrust machine':                               'machine_hip_thrust',
  'kickback fessier machine':                         'machine_glute_kickback',
  'leg curl allonge':                                 'lying_leg_curl',
  'leg curl assis':                                   'seated_leg_curl',
  'leg curl couche machine':                          'lying_leg_curl',

  // MOLLETS
  'mollets assis machine':                            'seated_calf_raise',
  'mollets debout halteres':                          'dumbbell_calf_raise',
  'mollets debout machine':                           'standing_calf_raise',

  // CORE
  'gainage planche':                                  'plank',
  'pallof press':                                     'pallof_press',
  'releve de jambes suspendu':                        'hanging_leg_raise',

  // CARDIO
  'cardio hiit velo':                                 'bike_hiit',
  'cardio tapis roulant incline':                     'incline_treadmill',
  'cardio velo ou rameur':                            'bike_or_rower',
  'marche inclinee':                                  'incline_walk',
  'marche inclinee sur tapis':                        'incline_walk',
  'rameur':                                           'rowing_machine',
  'velo elliptique':                                  'elliptical',
  'velo stationnaire':                                'stationary_bike',

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
  dumbbell_fly:           '/exercises/dumbbell-fly.webp',
  cable_fly:              '/exercises/cable-fly.webp',
  pec_deck:               '/exercises/pec-deck.webp',
  dips:                   '/exercises/dips.webp',
  weighted_dips:          '/exercises/weighted-dips.webp',
  wide_push_up:           '/exercises/wide-push-up.webp',

  // Dos
  pull_up:                        '/exercises/pull-up.webp',
  chin_up:                        '/exercises/supinated-pull-up.webp',
  lat_pulldown:                   '/exercises/lat-pulldown.webp',
  wide_grip_pull_up:              '/exercises/wide-grip-lat-pulldown.webp',
  neutral_grip_lat_pulldown:      '/exercises/lat-pulldown.webp',
  close_grip_lat_pulldown:        '/exercises/lat-pulldown.webp',
  cable_row:                      '/exercises/seated-cable-row.webp',
  barbell_row:                    '/exercises/barbell-row.webp',
  pendlay_row:                    '/exercises/barbell-row.webp',
  dumbbell_row:                   '/exercises/one-arm-dumbbell-row.webp',
  chest_supported_machine_row:    '/exercises/chest-supported-row.webp',
  machine_row:                    '/exercises/machine-row.webp',
  deadlift:                       '/exercises/deadlift.webp',
  reverse_cable_fly:              '/exercises/reverse-cable-fly.webp',
  band_row:                       '/exercises/machine-row.webp',

  // Épaules
  overhead_press:          '/exercises/overhead-press-barbell.webp',
  dumbbell_shoulder_press: '/exercises/overhead-press-dumbbells.webp',
  lateral_raise:           '/exercises/dumbbell-lateral-raise.webp',
  front_raise:             '/exercises/dumbbell-front-raise.webp',
  face_pull:               '/exercises/face-pull.webp',
  arnold_press:            '/exercises/arnold-press.webp',
  rear_delt_fly:           '/exercises/rear-delt-fly.webp',
  cable_lateral_raise:     '/exercises/machine-lateral-raise.webp',
  reverse_pec_deck:        '/exercises/reverse-pec-deck.webp',
  upright_row:             '/exercises/upright-row.webp',
  cable_rear_delt_fly:     '/exercises/cable-rear-delt-fly.webp',
  chest_supported_rear_delt_fly: '/exercises/chest-supported-rear-delt-fly.webp',
  wide_upright_row:        '/exercises/wide-upright-row.webp',

  // Biceps
  barbell_curl:               '/exercises/ez-bar-curl.webp',
  dumbbell_curl:              '/exercises/alternating-dumbbell-curl.webp',
  hammer_curl:                '/exercises/hammer-curl.webp',
  cable_curl:                 '/exercises/cable-curl.webp',
  incline_dumbbell_curl:      '/exercises/incline-dumbbell-curl.webp',
  alternating_dumbbell_curl:  '/exercises/alternating-dumbbell-curl.webp',
  ez_bar_curl:                '/exercises/ez-bar-curl.webp',
  concentration_curl:         '/exercises/concentration-curl.webp',
  preacher_curl:              '/exercises/preacher-curl.webp',
  reverse_barbell_curl:       '/exercises/reverse-barbell-curl.webp',

  // Triceps
  tricep_pushdown:                    '/exercises/rope-triceps-pushdown.webp',
  rope_pushdown:                      '/exercises/rope-triceps-pushdown.webp',
  tricep_extension:                   '/exercises/dumbbell-overhead-triceps-extension.webp',
  skull_crusher:                      '/exercises/close-grip-bench-press.webp',
  dumbbell_skull_crusher:             '/exercises/dumbbell-overhead-triceps-extension.webp',
  overhead_cable_tricep_extension:    '/exercises/cable-overhead-triceps-extension.webp',
  close_grip_bench_press:             '/exercises/close-grip-bench-press.webp',

  // Jambes / Quadriceps
  squat:                   '/exercises/back-squat.webp',
  front_squat:             '/exercises/front-squat.webp',
  hack_squat:              '/exercises/hack-squat.webp',
  leg_press:               '/exercises/leg-press.webp',
  leg_extension:           '/exercises/leg-extension.webp',
  lunge:                   '/exercises/walking-lunge.webp',
  walking_lunge:           '/exercises/walking-lunge.webp',
  reverse_dumbbell_lunge:  '/exercises/walking-lunge.webp',
  bulgarian_split_squat:   '/exercises/bulgarian-split-squat.webp',
  goblet_squat:            '/exercises/front-squat.webp',
  sissy_squat:             '/exercises/sissy-squat.webp',

  // Fessiers / Chaîne postérieure
  hip_thrust:                    '/exercises/barbell-hip-thrust.webp',
  barbell_glute_bridge:          '/exercises/barbell-hip-thrust.webp',
  machine_hip_thrust:            '/exercises/machine-hip-thrust.webp',
  glute_bridge:                  '/exercises/barbell-hip-thrust.webp',
  cable_glute_kickback:          '/exercises/cable-glute-kickback.webp',
  machine_glute_kickback:        '/exercises/cable-glute-kickback.webp',
  back_extension:                '/exercises/back-extension-glutes.webp',
  cable_pull_through:            '/exercises/cable-pull-through.webp',
  kettlebell_swing:              '/exercises/cable-pull-through.webp',
  single_leg_romanian_deadlift:  '/exercises/single-leg-romanian-deadlift.webp',
  reverse_dumbbell_lunge:        '/exercises/reverse-dumbbell-lunge.webp',

  // Ischio / Mollets
  romanian_deadlift:              '/exercises/romanian-deadlift-barbell.webp',
  dumbbell_romanian_deadlift:     '/exercises/dumbbell-romanian-deadlift.webp',
  leg_curl:                       '/exercises/lying-leg-curl.webp',
  lying_leg_curl:                 '/exercises/lying-leg-curl.webp',
  seated_leg_curl:                '/exercises/lying-leg-curl.webp',
  calf_raise:                     '/exercises/standing-calf-raise.webp',
  standing_calf_raise:            '/exercises/standing-calf-raise.webp',
  seated_calf_raise:              '/exercises/seated-calf-raise.webp',
  dumbbell_calf_raise:            '/exercises/standing-calf-raise.webp',

  // Core / Abdos
  crunch:                  '/exercises/crunch.webp',
  plank:                   '/exercises/plank.webp',
  side_plank:              '/exercises/side-plank.webp',
  leg_raise:               '/exercises/lying-leg-raise.webp',
  hanging_leg_raise:       '/exercises/hanging-leg-raise.webp',
  hanging_leg_raise_knee:  '/exercises/hanging-knee-raise.webp',
  ab_rollout:              '/exercises/ab-wheel-rollout.webp',
  cable_crunch:            '/exercises/cable-crunch.webp',
  russian_twist:           '/exercises/russian-twist.webp',
  pallof_press:            '/exercises/pallof-press.webp',
  cable_woodchop:          '/exercises/cable-woodchop.webp',
  swiss_ball_crunch:       '/exercises/swiss-ball-crunch.webp',

  // Cardio
  elliptical:              '/exercises/elliptical.webp',
  rowing_machine:          '/exercises/rowing-machine.webp',
  stationary_bike:         '/exercises/stationary-bike-hiit.webp',
  bike_hiit:               '/exercises/stationary-bike-hiit.webp',
  bike_or_rower:           '/exercises/rowing-machine.webp',
  incline_treadmill:       '/exercises/treadmill-run.webp',
  incline_walk:            '/exercises/treadmill-run.webp',
  treadmill:               '/exercises/treadmill-run.webp',
  jump_rope:               '/exercises/jump-rope.webp',
  box_jump:                '/exercises/box-jump.webp',
  battle_rope:             '/exercises/battle-rope.webp',
  sled_push:               '/exercises/sled-push.webp',
  stair_climber:           '/exercises/stair-climber.webp',
  mountain_climber:        '/exercises/mountain-climber.webp',
  high_knees:              '/exercises/high-knees.webp',
  bodyweight_squat:        '/exercises/bodyweight-squat-cardio.webp',
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
  return EXERCISE_ALIASES[normalized] ?? null;
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

export function debugExerciseVisual(exerciseName: string) {
  const key = toExerciseKey(exerciseName);
  const visual = getExerciseVisualPath(exerciseName);

  return {
    name: exerciseName,
    key,
    recognized: key !== null,
    visual,
    hasVisual: visual !== null,
  };
}
