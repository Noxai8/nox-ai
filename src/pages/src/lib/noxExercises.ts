// src/lib/noxExercises.ts

export type NoxExerciseCategory =
  | 'push'
  | 'pull'
  | 'legs'
  | 'core'
  | 'conditioning';

export type NoxExerciseStep = {
  title: string;
  cue: string;
};

export type NoxExerciseMistake = {
  title: string;
  correction: string;
};

export type NoxExerciseMuscles = {
  primary: string[];
  secondary: string[];
  stabilizers: string[];
};

export type NoxExerciseVisuals = {
  thumbnail?: string;
  position1?: string;
  position2?: string;
  position3?: string;
  anatomy?: string;
};

export type NoxExercise = {
  id: string;
  name: string;
  category: NoxExerciseCategory;
  equipment: string;

  aliases: string[];

  muscles: NoxExerciseMuscles;

  steps: [
    NoxExerciseStep,
    NoxExerciseStep,
    NoxExerciseStep
  ];

  coachTips: string[];
  mistakes: NoxExerciseMistake[];
  variants: string[];

  visuals: NoxExerciseVisuals;
};

type CatalogExercise = {
  id: string;
  name: string;
  category: NoxExerciseCategory;
  equipment: string;
};

/* =========================================================
   NORMALISATION
   ========================================================= */

export function normalizeExerciseText(
  value?: string | null,
) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeExerciseId(
  value?: string | null,
) {
  return normalizeExerciseText(value)
    .replace(/\s+/g, '_');
}

/* =========================================================
   CATALOGUE OFFICIEL NOX

   IMPORTANT :
   Ces 152 IDs correspondent EXACTEMENT au catalogue
   utilisé par GenerateProgram.tsx.
   ========================================================= */

export const NOX_GENERATOR_CATALOG: CatalogExercise[] = [
  // PUSH — BARRE
  { id: 'barbell_bench_press', name: 'Développé couché barre', category: 'push', equipment: 'barre' },
  { id: 'incline_barbell_bench_press', name: 'Développé incliné barre', category: 'push', equipment: 'barre' },
  { id: 'decline_barbell_bench_press', name: 'Développé décliné barre', category: 'push', equipment: 'barre' },
  { id: 'close_grip_bench_press', name: 'Développé couché prise serrée', category: 'push', equipment: 'barre' },
  { id: 'barbell_overhead_press', name: 'Développé militaire barre', category: 'push', equipment: 'barre' },
  { id: 'push_press', name: 'Push Press', category: 'push', equipment: 'barre' },

  // PUSH — HALTÈRES
  { id: 'dumbbell_bench_press', name: 'Développé couché haltères', category: 'push', equipment: 'haltères' },
  { id: 'incline_dumbbell_bench_press', name: 'Développé incliné haltères', category: 'push', equipment: 'haltères' },
  { id: 'decline_dumbbell_bench_press', name: 'Développé décliné haltères', category: 'push', equipment: 'haltères' },
  { id: 'dumbbell_overhead_press', name: 'Développé militaire haltères', category: 'push', equipment: 'haltères' },
  { id: 'arnold_press', name: 'Arnold Press', category: 'push', equipment: 'haltères' },
  { id: 'dumbbell_lateral_raise', name: 'Élévations latérales haltères', category: 'push', equipment: 'haltères' },
  { id: 'dumbbell_front_raise', name: 'Élévations frontales haltères', category: 'push', equipment: 'haltères' },
  { id: 'dumbbell_fly', name: 'Écarté couché haltères', category: 'push', equipment: 'haltères' },
  { id: 'incline_dumbbell_fly', name: 'Écarté incliné haltères', category: 'push', equipment: 'haltères' },
  { id: 'dumbbell_triceps_extension', name: 'Extension triceps haltère au-dessus de la tête', category: 'push', equipment: 'haltères' },
  { id: 'dumbbell_skull_crusher', name: 'Extension triceps couché haltères', category: 'push', equipment: 'haltères' },
  { id: 'dumbbell_kickback', name: 'Kickback triceps haltère', category: 'push', equipment: 'haltères' },

  // PUSH — POULIE
  { id: 'cable_chest_fly', name: 'Écarté poulie vis-à-vis', category: 'push', equipment: 'poulie' },
  { id: 'high_to_low_cable_fly', name: 'Écarté poulie haute vers basse', category: 'push', equipment: 'poulie' },
  { id: 'low_to_high_cable_fly', name: 'Écarté poulie basse vers haute', category: 'push', equipment: 'poulie' },
  { id: 'cable_lateral_raise', name: 'Élévation latérale poulie', category: 'push', equipment: 'poulie' },
  { id: 'cable_front_raise', name: 'Élévation frontale poulie', category: 'push', equipment: 'poulie' },
  { id: 'rope_triceps_pushdown', name: 'Extension triceps corde', category: 'push', equipment: 'poulie' },
  { id: 'bar_triceps_pushdown', name: 'Extension triceps barre poulie', category: 'push', equipment: 'poulie' },
  { id: 'cable_overhead_triceps_extension', name: 'Extension triceps poulie au-dessus de la tête', category: 'push', equipment: 'poulie' },

  // PUSH — MACHINE
  { id: 'machine_chest_press', name: 'Chest Press machine', category: 'push', equipment: 'machine' },
  { id: 'incline_machine_press', name: 'Développé incliné machine', category: 'push', equipment: 'machine' },
  { id: 'pec_deck', name: 'Pec Deck', category: 'push', equipment: 'machine' },
  { id: 'machine_shoulder_press', name: 'Développé épaules machine', category: 'push', equipment: 'machine' },
  { id: 'machine_lateral_raise', name: 'Élévation latérale machine', category: 'push', equipment: 'machine' },
  { id: 'assisted_dip', name: 'Dips assistés', category: 'push', equipment: 'machine' },

  // PUSH — POIDS DU CORPS
  { id: 'push_up', name: 'Pompes', category: 'push', equipment: 'poids du corps' },
  { id: 'incline_push_up', name: 'Pompes inclinées', category: 'push', equipment: 'poids du corps' },
  { id: 'decline_push_up', name: 'Pompes déclinées', category: 'push', equipment: 'poids du corps' },
  { id: 'diamond_push_up', name: 'Pompes diamant', category: 'push', equipment: 'poids du corps' },
  { id: 'dip', name: 'Dips', category: 'push', equipment: 'poids du corps' },

  // PULL — BARRE
  { id: 'barbell_bent_over_row', name: 'Rowing barre buste penché', category: 'pull', equipment: 'barre' },
  { id: 'pendlay_row', name: 'Rowing Pendlay', category: 'pull', equipment: 'barre' },
  { id: 'underhand_barbell_row', name: 'Rowing barre supination', category: 'pull', equipment: 'barre' },
  { id: 'barbell_shrug', name: 'Shrugs barre', category: 'pull', equipment: 'barre' },
  { id: 'barbell_curl', name: 'Curl barre', category: 'pull', equipment: 'barre' },
  { id: 'ez_bar_curl', name: 'Curl barre EZ', category: 'pull', equipment: 'barre' },
  { id: 'reverse_barbell_curl', name: 'Curl inversé barre', category: 'pull', equipment: 'barre' },

  // PULL — HALTÈRES
  { id: 'one_arm_dumbbell_row', name: 'Rowing haltère unilatéral', category: 'pull', equipment: 'haltères' },
  { id: 'chest_supported_dumbbell_row', name: 'Rowing haltères poitrine appuyée', category: 'pull', equipment: 'haltères' },
  { id: 'dumbbell_shrug', name: 'Shrugs haltères', category: 'pull', equipment: 'haltères' },
  { id: 'dumbbell_pullover', name: 'Pull-over haltère', category: 'pull', equipment: 'haltères' },
  { id: 'dumbbell_curl', name: 'Curl haltères', category: 'pull', equipment: 'haltères' },
  { id: 'alternating_dumbbell_curl', name: 'Curl haltères alterné', category: 'pull', equipment: 'haltères' },
  { id: 'hammer_curl', name: 'Curl marteau', category: 'pull', equipment: 'haltères' },
  { id: 'incline_dumbbell_curl', name: 'Curl incliné haltères', category: 'pull', equipment: 'haltères' },
  { id: 'concentration_curl', name: 'Curl concentration', category: 'pull', equipment: 'haltères' },
  { id: 'reverse_fly_dumbbell', name: 'Oiseau haltères', category: 'pull', equipment: 'haltères' },

  // PULL — POULIE
  { id: 'lat_pulldown', name: 'Tirage vertical poitrine', category: 'pull', equipment: 'poulie' },
  { id: 'close_grip_lat_pulldown', name: 'Tirage vertical prise serrée', category: 'pull', equipment: 'poulie' },
  { id: 'neutral_grip_lat_pulldown', name: 'Tirage vertical prise neutre', category: 'pull', equipment: 'poulie' },
  { id: 'straight_arm_pulldown', name: 'Pull-over poulie bras tendus', category: 'pull', equipment: 'poulie' },
  { id: 'seated_cable_row', name: 'Tirage horizontal poulie', category: 'pull', equipment: 'poulie' },
  { id: 'wide_grip_cable_row', name: 'Tirage horizontal prise large', category: 'pull', equipment: 'poulie' },
  { id: 'single_arm_cable_row', name: 'Tirage horizontal unilatéral poulie', category: 'pull', equipment: 'poulie' },
  { id: 'face_pull', name: 'Face Pull', category: 'pull', equipment: 'poulie' },
  { id: 'cable_reverse_fly', name: 'Oiseau poulie', category: 'pull', equipment: 'poulie' },
  { id: 'cable_curl', name: 'Curl poulie', category: 'pull', equipment: 'poulie' },
  { id: 'rope_hammer_curl', name: 'Curl marteau corde', category: 'pull', equipment: 'poulie' },
  { id: 'bayesian_curl', name: 'Curl Bayesian', category: 'pull', equipment: 'poulie' },

  // PULL — MACHINE
  { id: 'machine_row', name: 'Rowing machine', category: 'pull', equipment: 'machine' },
  { id: 'chest_supported_machine_row', name: 'Rowing machine poitrine appuyée', category: 'pull', equipment: 'machine' },
  { id: 'machine_high_row', name: 'High Row machine', category: 'pull', equipment: 'machine' },
  { id: 'reverse_pec_deck', name: 'Reverse Pec Deck', category: 'pull', equipment: 'machine' },
  { id: 'machine_pullover', name: 'Pull-over machine', category: 'pull', equipment: 'machine' },
  { id: 'preacher_curl_machine', name: 'Curl pupitre machine', category: 'pull', equipment: 'machine' },
  { id: 'assisted_pull_up', name: 'Tractions assistées', category: 'pull', equipment: 'machine' },

  // PULL — POIDS DU CORPS
  { id: 'pull_up', name: 'Tractions pronation', category: 'pull', equipment: 'poids du corps' },
  { id: 'chin_up', name: 'Tractions supination', category: 'pull', equipment: 'poids du corps' },
  { id: 'neutral_grip_pull_up', name: 'Tractions prise neutre', category: 'pull', equipment: 'poids du corps' },
  { id: 'inverted_row', name: 'Rowing inversé', category: 'pull', equipment: 'poids du corps' },

  // LEGS — BARRE
  { id: 'back_squat', name: 'Squat barre arrière', category: 'legs', equipment: 'barre' },
  { id: 'front_squat', name: 'Front Squat', category: 'legs', equipment: 'barre' },
  { id: 'box_squat', name: 'Box Squat', category: 'legs', equipment: 'barre' },
  { id: 'romanian_deadlift', name: 'Soulevé de terre roumain', category: 'legs', equipment: 'barre' },
  { id: 'conventional_deadlift', name: 'Soulevé de terre conventionnel', category: 'legs', equipment: 'barre' },
  { id: 'sumo_deadlift', name: 'Soulevé de terre sumo', category: 'legs', equipment: 'barre' },
  { id: 'good_morning', name: 'Good Morning', category: 'legs', equipment: 'barre' },
  { id: 'barbell_hip_thrust', name: 'Hip Thrust barre', category: 'legs', equipment: 'barre' },
  { id: 'barbell_glute_bridge', name: 'Glute Bridge barre', category: 'legs', equipment: 'barre' },
  { id: 'barbell_reverse_lunge', name: 'Fentes arrière barre', category: 'legs', equipment: 'barre' },

  // LEGS — HALTÈRES
  { id: 'goblet_squat', name: 'Goblet Squat', category: 'legs', equipment: 'haltères' },
  { id: 'dumbbell_squat', name: 'Squat haltères', category: 'legs', equipment: 'haltères' },
  { id: 'dumbbell_romanian_deadlift', name: 'Soulevé de terre roumain haltères', category: 'legs', equipment: 'haltères' },
  { id: 'dumbbell_walking_lunge', name: 'Fentes marchées haltères', category: 'legs', equipment: 'haltères' },
  { id: 'dumbbell_reverse_lunge', name: 'Fentes arrière haltères', category: 'legs', equipment: 'haltères' },
  { id: 'bulgarian_split_squat', name: 'Bulgarian Split Squat', category: 'legs', equipment: 'haltères' },
  { id: 'dumbbell_step_up', name: 'Step-up haltères', category: 'legs', equipment: 'haltères' },
  { id: 'dumbbell_calf_raise', name: 'Mollets debout haltères', category: 'legs', equipment: 'haltères' },

  // LEGS — MACHINE
  { id: 'leg_press', name: 'Presse à cuisses', category: 'legs', equipment: 'machine' },
  { id: 'hack_squat', name: 'Hack Squat', category: 'legs', equipment: 'machine' },
  { id: 'pendulum_squat', name: 'Pendulum Squat', category: 'legs', equipment: 'machine' },
  { id: 'leg_extension', name: 'Leg Extension', category: 'legs', equipment: 'machine' },
  { id: 'seated_leg_curl', name: 'Leg Curl assis', category: 'legs', equipment: 'machine' },
  { id: 'lying_leg_curl', name: 'Leg Curl allongé', category: 'legs', equipment: 'machine' },
  { id: 'standing_leg_curl', name: 'Leg Curl debout', category: 'legs', equipment: 'machine' },
  { id: 'hip_abduction_machine', name: 'Abduction de hanche machine', category: 'legs', equipment: 'machine' },
  { id: 'hip_adduction_machine', name: 'Adduction de hanche machine', category: 'legs', equipment: 'machine' },
  { id: 'glute_kickback_machine', name: 'Kickback fessier machine', category: 'legs', equipment: 'machine' },
  { id: 'standing_calf_raise_machine', name: 'Mollets debout machine', category: 'legs', equipment: 'machine' },
  { id: 'seated_calf_raise_machine', name: 'Mollets assis machine', category: 'legs', equipment: 'machine' },

  // LEGS — POULIE
  { id: 'cable_pull_through', name: 'Pull Through poulie', category: 'legs', equipment: 'poulie' },
  { id: 'cable_glute_kickback', name: 'Kickback fessier poulie', category: 'legs', equipment: 'poulie' },
  { id: 'cable_hip_abduction', name: 'Abduction de hanche poulie', category: 'legs', equipment: 'poulie' },
  { id: 'cable_hip_adduction', name: 'Adduction de hanche poulie', category: 'legs', equipment: 'poulie' },

  // LEGS — POIDS DU CORPS
  { id: 'bodyweight_squat', name: 'Squat poids du corps', category: 'legs', equipment: 'poids du corps' },
  { id: 'bodyweight_lunge', name: 'Fentes poids du corps', category: 'legs', equipment: 'poids du corps' },
  { id: 'reverse_lunge', name: 'Fentes arrière poids du corps', category: 'legs', equipment: 'poids du corps' },
  { id: 'walking_lunge', name: 'Fentes marchées poids du corps', category: 'legs', equipment: 'poids du corps' },
  { id: 'step_up', name: 'Step-up', category: 'legs', equipment: 'poids du corps' },
  { id: 'single_leg_glute_bridge', name: 'Glute Bridge une jambe', category: 'legs', equipment: 'poids du corps' },
  { id: 'glute_bridge', name: 'Glute Bridge', category: 'legs', equipment: 'poids du corps' },
  { id: 'single_leg_calf_raise', name: 'Mollets une jambe', category: 'legs', equipment: 'poids du corps' },
  { id: 'wall_sit', name: 'Chaise au mur', category: 'legs', equipment: 'poids du corps' },

  // CORE
  { id: 'plank', name: 'Planche', category: 'core', equipment: 'poids du corps' },
  { id: 'side_plank', name: 'Planche latérale', category: 'core', equipment: 'poids du corps' },
  { id: 'dead_bug', name: 'Dead Bug', category: 'core', equipment: 'poids du corps' },
  { id: 'bird_dog', name: 'Bird Dog', category: 'core', equipment: 'poids du corps' },
  { id: 'hollow_hold', name: 'Hollow Hold', category: 'core', equipment: 'poids du corps' },
  { id: 'crunch', name: 'Crunch', category: 'core', equipment: 'poids du corps' },
  { id: 'reverse_crunch', name: 'Crunch inversé', category: 'core', equipment: 'poids du corps' },
  { id: 'bicycle_crunch', name: 'Bicycle Crunch', category: 'core', equipment: 'poids du corps' },
  { id: 'mountain_climber', name: 'Mountain Climbers', category: 'core', equipment: 'poids du corps' },
  { id: 'hanging_knee_raise', name: 'Relevé de genoux suspendu', category: 'core', equipment: 'poids du corps' },
  { id: 'hanging_leg_raise', name: 'Relevé de jambes suspendu', category: 'core', equipment: 'poids du corps' },
  { id: 'lying_leg_raise', name: 'Relevé de jambes au sol', category: 'core', equipment: 'poids du corps' },
  { id: 'russian_twist', name: 'Russian Twist', category: 'core', equipment: 'poids du corps' },
  { id: 'v_up', name: 'V-Up', category: 'core', equipment: 'poids du corps' },
  { id: 'bear_crawl', name: 'Bear Crawl', category: 'core', equipment: 'poids du corps' },
  { id: 'cable_crunch', name: 'Crunch poulie', category: 'core', equipment: 'poulie' },
  { id: 'pallof_press', name: 'Pallof Press', category: 'core', equipment: 'poulie' },
  { id: 'cable_woodchop', name: 'Woodchop poulie', category: 'core', equipment: 'poulie' },
  { id: 'cable_rotation', name: 'Rotation du buste poulie', category: 'core', equipment: 'poulie' },
  { id: 'ab_wheel_rollout', name: 'Ab Wheel Rollout', category: 'core', equipment: 'roue abdominale' },

  // CONDITIONING
  { id: 'treadmill_walk', name: 'Marche sur tapis', category: 'conditioning', equipment: 'cardio' },
  { id: 'incline_treadmill_walk', name: 'Marche inclinée sur tapis', category: 'conditioning', equipment: 'cardio' },
  { id: 'treadmill_run', name: 'Course sur tapis', category: 'conditioning', equipment: 'cardio' },
  { id: 'stationary_bike', name: 'Vélo stationnaire', category: 'conditioning', equipment: 'cardio' },
  { id: 'rowing_ergometer', name: 'Rameur', category: 'conditioning', equipment: 'cardio' },
  { id: 'elliptical', name: 'Vélo elliptique', category: 'conditioning', equipment: 'cardio' },
  { id: 'stair_climber', name: 'Stair Climber', category: 'conditioning', equipment: 'cardio' },
  { id: 'jump_rope', name: 'Corde à sauter', category: 'conditioning', equipment: 'cardio' },
  { id: 'sled_push', name: 'Poussée de traîneau', category: 'conditioning', equipment: 'cardio' },
  { id: 'sled_pull', name: 'Tirage de traîneau', category: 'conditioning', equipment: 'cardio' },
  { id: 'farmers_walk', name: 'Farmer Walk', category: 'conditioning', equipment: 'cardio' },
  { id: 'battle_rope', name: 'Battle Rope', category: 'conditioning', equipment: 'cardio' },
];

/* =========================================================
   ALIASES DE COMPATIBILITÉ

   Ils servent seulement de fallback pour les anciens
   programmes déjà enregistrés.

   exercise_id reste TOUJOURS prioritaire.
   ========================================================= */

const EXTRA_ALIASES: Record<string, string[]> = {
  barbell_bench_press: [
    'Développé couché',
    'Bench Press',
    'Barbell Bench Press',
  ],

  incline_barbell_bench_press: [
    'Incline Bench Press',
  ],

  dumbbell_bench_press: [
    'Dumbbell Bench Press',
  ],

  incline_dumbbell_bench_press: [
    'Incline Dumbbell Press',
    'Incline Dumbbell Bench Press',
  ],

  dumbbell_overhead_press: [
    'Shoulder Press haltères',
    'Dumbbell Shoulder Press',
    'Dumbbell Overhead Press',
  ],

  barbell_overhead_press: [
    'Military Press',
    'Overhead Press',
    'OHP',
  ],

  dumbbell_lateral_raise: [
    'Élévation latérale haltères',
    'Dumbbell Lateral Raise',
  ],

  machine_chest_press: [
    'Presse pectoraux machine',
    'Machine Chest Press',
  ],

  cable_chest_fly: [
    'Écarté poulie',
    'Cable Fly',
    'Cable Chest Fly',
  ],

  barbell_bent_over_row: [
    'Tirage barre pronation',
    'Rowing barre',
    'Barbell Row',
    'Bent Over Row',
  ],

  neutral_grip_lat_pulldown: [
    'Tirage poulie haute prise neutre',
    'Neutral Grip Lat Pulldown',
  ],

  lat_pulldown: [
    'Lat Pulldown',
  ],

  seated_cable_row: [
    'Rowing poulie basse',
    'Seated Cable Row',
  ],

  face_pull: [
    'Face pull poulie',
    'Facepull',
  ],

  pull_up: [
    'Tractions',
    'Pull Up',
    'Pull-up',
  ],

  back_squat: [
    'Squat barre',
    'Barbell Back Squat',
    'Back Squat',
  ],

  goblet_squat: [
    'Squat gobelet',
    'Squat gobelet kettlebell',
    'Goblet Squat Kettlebell',
    'Kettlebell Goblet Squat',
  ],

  romanian_deadlift: [
    'RDL',
    'Romanian Deadlift',
  ],

  conventional_deadlift: [
    'Soulevé de terre',
    'Deadlift',
    'Conventional Deadlift',
  ],

  leg_press: [
    'Leg Press',
  ],

  barbell_hip_thrust: [
    'Hip Thrust',
    'Barbell Hip Thrust',
  ],

  ez_bar_curl: [
    'EZ Bar Curl',
    'Curl EZ',
  ],

  dumbbell_curl: [
    'Dumbbell Curl',
    'Dumbbell Biceps Curl',
  ],

  hammer_curl: [
    'Hammer Curl',
  ],

  rope_triceps_pushdown: [
    'Rope Pushdown',
    'Rope Triceps Pushdown',
  ],

  dip: [
    'Parallel Bar Dip',
  ],

  plank: [
    'Gainage',
    'Gainage planche',
    'Front Plank',
  ],

  side_plank: [
    'Side Plank',
  ],

  dead_bug: [
    'Deadbug',
  ],

  stationary_bike: [
    'Cardio HIIT vélo',
    'HIIT vélo',
  ],

  rowing_ergometer: [
    'Cardio HIIT rameur',
    'HIIT rameur',
  ],

  treadmill_run: [
    'Cardio HIIT tapis',
    'HIIT tapis',
  ],
};

/* =========================================================
   PROFILS TECHNIQUES PAR CATÉGORIE

   Ils servent de fallback pour les exercices dont la fiche
   technique spécifique n'a pas encore été enrichie.

   On n'invente JAMAIS un visuel.
   ========================================================= */

const CATEGORY_DEFAULTS: Record<
  NoxExerciseCategory,
  {
    muscles: NoxExerciseMuscles;
    steps: [
      NoxExerciseStep,
      NoxExerciseStep,
      NoxExerciseStep
    ];
    coachTips: string[];
    mistakes: NoxExerciseMistake[];
  }
> = {
  push: {
    muscles: {
      primary: ['Pectoraux', 'Épaules', 'Triceps'],
      secondary: [],
      stabilizers: ['Core'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Installe-toi dans une position stable et prépare la charge avec contrôle.',
      },
      {
        title: 'Mouvement',
        cue: 'Effectue la poussée avec une trajectoire maîtrisée et sans élan.',
      },
      {
        title: 'Retour',
        cue: 'Reviens progressivement à la position initiale en contrôlant la charge.',
      },
    ],

    coachTips: [
      'Garde le tronc stable.',
      'Contrôle la phase de retour.',
      'Utilise une charge qui permet une exécution propre.',
    ],

    mistakes: [
      {
        title: 'Charge excessive',
        correction: 'Réduis la charge si ta technique se dégrade.',
      },
      {
        title: 'Mouvement trop rapide',
        correction: 'Ralentis la répétition et garde le contrôle.',
      },
    ],
  },

  pull: {
    muscles: {
      primary: ['Dos', 'Biceps'],
      secondary: ['Avant-bras'],
      stabilizers: ['Core'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Place-toi de manière stable et prépare les épaules avant de tirer.',
      },
      {
        title: 'Mouvement',
        cue: 'Effectue le tirage avec contrôle en guidant le mouvement avec les coudes.',
      },
      {
        title: 'Retour',
        cue: 'Reviens lentement sans perdre la position du tronc.',
      },
    ],

    coachTips: [
      'Évite de tirer uniquement avec les mains.',
      'Garde le buste stable.',
      'Contrôle le retour.',
    ],

    mistakes: [
      {
        title: 'Élan excessif',
        correction: 'Réduis la charge et stabilise le tronc.',
      },
      {
        title: 'Épaules haussées',
        correction: 'Garde les épaules contrôlées pendant le mouvement.',
      },
    ],
  },

  legs: {
    muscles: {
      primary: ['Quadriceps', 'Fessiers'],
      secondary: ['Ischio-jambiers'],
      stabilizers: ['Core'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Place les pieds de manière stable et engage le tronc.',
      },
      {
        title: 'Mouvement',
        cue: 'Effectue le mouvement en contrôlant les genoux, les hanches et la posture.',
      },
      {
        title: 'Retour',
        cue: 'Reviens à la position de départ en poussant de manière stable.',
      },
    ],

    coachTips: [
      'Garde les pieds stables.',
      'Contrôle la descente.',
      'Maintiens les genoux dans une trajectoire naturelle.',
    ],

    mistakes: [
      {
        title: 'Perte de stabilité',
        correction: 'Réduis la charge ou l’amplitude pour garder le contrôle.',
      },
      {
        title: 'Genoux instables',
        correction: 'Maintiens-les dans l’axe des pieds.',
      },
    ],
  },

  core: {
    muscles: {
      primary: ['Abdominaux', 'Core'],
      secondary: ['Obliques'],
      stabilizers: [],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Installe-toi dans une position stable et engage les abdominaux.',
      },
      {
        title: 'Mouvement',
        cue: 'Effectue le mouvement sans perdre le contrôle du bassin et du tronc.',
      },
      {
        title: 'Retour',
        cue: 'Reviens progressivement à la position initiale.',
      },
    ],

    coachTips: [
      'Respire régulièrement.',
      'Privilégie le contrôle à la vitesse.',
      'Évite les compensations du bas du dos.',
    ],

    mistakes: [
      {
        title: 'Perte de gainage',
        correction: 'Réduis l’amplitude ou la durée.',
      },
      {
        title: 'Mouvement trop rapide',
        correction: 'Ralentis pour garder le contrôle du tronc.',
      },
    ],
  },

  conditioning: {
    muscles: {
      primary: ['Cardio', 'Jambes'],
      secondary: [],
      stabilizers: ['Core'],
    },

    steps: [
      {
        title: 'Préparation',
        cue: 'Commence progressivement et adopte une position stable.',
      },
      {
        title: 'Effort',
        cue: 'Maintiens l’intensité prévue tout en conservant une technique propre.',
      },
      {
        title: 'Récupération',
        cue: 'Réduis progressivement l’intensité et récupère avant le prochain effort.',
      },
    ],

    coachTips: [
      'Commence par un échauffement progressif.',
      'Adapte l’intensité à ton niveau.',
      'Garde une technique propre même lorsque la fatigue augmente.',
    ],

    mistakes: [
      {
        title: 'Départ trop rapide',
        correction: 'Monte progressivement en intensité.',
      },
      {
        title: 'Technique dégradée',
        correction: 'Réduis l’intensité si tu perds le contrôle.',
      },
    ],
  },
};

/* =========================================================
   FICHES TECHNIQUES SPÉCIFIQUES

   Les exercices importants peuvent écraser les defaults.
   ========================================================= */

type ExerciseOverride = Partial<
  Pick<
    NoxExercise,
    | 'muscles'
    | 'steps'
    | 'coachTips'
    | 'mistakes'
    | 'variants'
    | 'visuals'
  >
>;

const EXERCISE_OVERRIDES: Record<
  string,
  ExerciseOverride
> = {
  barbell_bench_press: {
    muscles: {
      primary: ['Pectoraux'],
      secondary: ['Triceps', 'Deltoïdes antérieurs'],
      stabilizers: ['Core'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Allonge-toi sur le banc, pieds ancrés au sol, omoplates serrées et barre au-dessus de la poitrine.',
      },
      {
        title: 'Descente',
        cue: 'Descends la barre de façon contrôlée vers le bas des pectoraux.',
      },
      {
        title: 'Position finale',
        cue: 'Pousse la barre vers le haut sans perdre la stabilité des épaules.',
      },
    ],

    coachTips: [
      'Garde les omoplates serrées.',
      'Pieds bien ancrés au sol.',
      'Contrôle la descente.',
      'Garde les poignets alignés.',
      'Expire pendant la poussée.',
    ],

    mistakes: [
      {
        title: 'Coudes trop écartés',
        correction: 'Garde une trajectoire naturelle des coudes.',
      },
      {
        title: 'Barre rebondie',
        correction: 'Contrôle la descente sans faire rebondir la barre.',
      },
      {
        title: 'Épaules qui avancent',
        correction: 'Maintiens les omoplates stables contre le banc.',
      },
    ],

    variants: [
      'Développé couché haltères',
      'Développé incliné barre',
      'Développé couché prise serrée',
    ],
  },

  dumbbell_overhead_press: {
    muscles: {
      primary: ['Deltoïdes'],
      secondary: ['Triceps'],
      stabilizers: ['Haut du dos', 'Core'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Haltères à hauteur des épaules, paumes vers l’avant, buste droit.',
      },
      {
        title: 'Mouvement',
        cue: 'Pousse verticalement en gardant le gainage et les abdos serrés.',
      },
      {
        title: 'Position finale',
        cue: 'Bras tendus au-dessus de la tête sans exagérer le verrouillage des coudes.',
      },
    ],

    coachTips: [
      'Garde le dos bien droit.',
      'Ne cambre pas le bas du dos.',
      'Contrôle la descente.',
      'Expire en montant.',
      'Garde un mouvement fluide et contrôlé.',
    ],

    mistakes: [
      {
        title: 'Dos trop cambré',
        correction: 'Serre les abdominaux et réduis la charge.',
      },
      {
        title: 'Trajectoire instable',
        correction: 'Garde les haltères sur une trajectoire verticale contrôlée.',
      },
      {
        title: 'Épaules haussées',
        correction: 'Contrôle la position des épaules.',
      },
    ],

    variants: [
      'Développé militaire barre',
      'Développé épaules machine',
      'Arnold Press',
    ],
  },

  back_squat: {
    muscles: {
      primary: ['Quadriceps', 'Fessiers'],
      secondary: ['Ischio-jambiers'],
      stabilizers: ['Core', 'Érecteurs du rachis'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Place la barre sur le haut du dos, pieds stables et tronc gainé.',
      },
      {
        title: 'Descente',
        cue: 'Fléchis les genoux et les hanches en gardant les pieds ancrés au sol.',
      },
      {
        title: 'Retour',
        cue: 'Pousse le sol pour remonter en gardant les genoux dans l’axe des pieds.',
      },
    ],

    coachTips: [
      'Garde le pied entier au sol.',
      'Gaine avant chaque répétition.',
      'Contrôle la descente.',
      'Garde les genoux dans l’axe des pieds.',
    ],

    mistakes: [
      {
        title: 'Genoux qui rentrent',
        correction: 'Maintiens-les dans l’axe des pieds.',
      },
      {
        title: 'Talons qui décollent',
        correction: 'Adapte ta position et ton amplitude.',
      },
      {
        title: 'Perte de gainage',
        correction: 'Réduis la charge et stabilise le tronc.',
      },
    ],

    variants: [
      'Front Squat',
      'Goblet Squat',
      'Hack Squat',
      'Presse à cuisses',
    ],
  },

  goblet_squat: {
    muscles: {
      primary: ['Quadriceps', 'Fessiers'],
      secondary: ['Ischio-jambiers'],
      stabilizers: ['Core'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Tiens la charge contre la poitrine, pieds stables et buste haut.',
      },
      {
        title: 'Descente',
        cue: 'Descends entre les hanches en gardant la charge proche du torse.',
      },
      {
        title: 'Retour',
        cue: 'Pousse le sol et tends les jambes pour revenir debout.',
      },
    ],

    coachTips: [
      'Garde la charge contre la poitrine.',
      'Maintiens le buste haut.',
      'Garde les genoux dans l’axe des pieds.',
      'Contrôle la descente.',
      'Gaine les abdominaux.',
    ],

    mistakes: [
      {
        title: 'Charge éloignée du corps',
        correction: 'Maintiens-la proche du sternum.',
      },
      {
        title: 'Genoux qui rentrent',
        correction: 'Maintiens les genoux dans l’axe des pieds.',
      },
      {
        title: 'Dos arrondi',
        correction: 'Réduis l’amplitude et garde le buste stable.',
      },
    ],

    variants: [
      'Squat barre arrière',
      'Front Squat',
      'Squat haltères',
    ],
  },

  romanian_deadlift: {
    muscles: {
      primary: ['Ischio-jambiers', 'Fessiers'],
      secondary: ['Érecteurs du rachis'],
      stabilizers: ['Core'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Debout, barre contre les cuisses, genoux légèrement fléchis et tronc gainé.',
      },
      {
        title: 'Descente',
        cue: 'Recule les hanches en gardant la barre proche des jambes et le dos neutre.',
      },
      {
        title: 'Retour',
        cue: 'Pousse les hanches vers l’avant en contractant les fessiers.',
      },
    ],

    coachTips: [
      'Pense à reculer les hanches.',
      'Garde la barre près du corps.',
      'Cherche la tension dans les ischio-jambiers.',
      'Ne transforme pas le mouvement en squat.',
    ],

    mistakes: [
      {
        title: 'Genoux trop fléchis',
        correction: 'Garde seulement une légère flexion.',
      },
      {
        title: 'Barre éloignée',
        correction: 'Maintiens-la près des jambes.',
      },
      {
        title: 'Dos arrondi',
        correction: 'Réduis l’amplitude et stabilise le tronc.',
      },
    ],

    variants: [
      'Soulevé de terre roumain haltères',
      'Soulevé de terre conventionnel',
      'Good Morning',
    ],
  },

  conventional_deadlift: {
    muscles: {
      primary: ['Fessiers', 'Ischio-jambiers', 'Dos'],
      secondary: ['Quadriceps', 'Trapèzes'],
      stabilizers: ['Core', 'Avant-bras'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Place la barre au-dessus du milieu du pied et crée de la tension avec le dos neutre.',
      },
      {
        title: 'Montée',
        cue: 'Pousse le sol avec les jambes en gardant la barre proche du corps.',
      },
      {
        title: 'Position finale',
        cue: 'Termine debout sans exagérer l’extension du bas du dos.',
      },
    ],

    coachTips: [
      'Garde la barre proche du corps.',
      'Crée de la tension avant de décoller.',
      'Maintiens le dos neutre.',
      'Pousse le sol.',
    ],

    mistakes: [
      {
        title: 'Dos arrondi',
        correction: 'Réduis la charge et stabilise le tronc.',
      },
      {
        title: 'Barre trop loin',
        correction: 'Maintiens-la près des jambes.',
      },
      {
        title: 'Hyperextension en haut',
        correction: 'Termine simplement debout.',
      },
    ],

    variants: [
      'Soulevé de terre sumo',
      'Soulevé de terre roumain',
    ],
  },

  barbell_bent_over_row: {
    muscles: {
      primary: ['Grand dorsal', 'Rhomboïdes'],
      secondary: ['Trapèzes', 'Biceps'],
      stabilizers: ['Core', 'Érecteurs du rachis'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Incline le buste avec le dos neutre et stabilise le tronc.',
      },
      {
        title: 'Tirage',
        cue: 'Tire la barre vers le ventre en ramenant les coudes vers l’arrière.',
      },
      {
        title: 'Retour',
        cue: 'Redescends la barre sous contrôle sans modifier la position du buste.',
      },
    ],

    coachTips: [
      'Garde le buste stable.',
      'Tire avec les coudes.',
      'Contrôle la descente.',
    ],

    mistakes: [
      {
        title: 'Buste qui se redresse',
        correction: 'Réduis la charge.',
      },
      {
        title: 'Élan excessif',
        correction: 'Garde le mouvement contrôlé.',
      },
    ],

    variants: [
      'Rowing haltère unilatéral',
      'Tirage horizontal poulie',
      'Rowing machine',
    ],
  },

  face_pull: {
    muscles: {
      primary: ['Deltoïdes postérieurs'],
      secondary: ['Rhomboïdes', 'Trapèzes'],
      stabilizers: ['Rotateurs externes'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Place la corde à hauteur du visage et garde le tronc stable.',
      },
      {
        title: 'Tirage',
        cue: 'Tire la corde vers le visage en ouvrant les mains.',
      },
      {
        title: 'Retour',
        cue: 'Étends les bras lentement sans perdre le contrôle des épaules.',
      },
    ],

    coachTips: [
      'Utilise une charge modérée.',
      'Évite de hausser les épaules.',
      'Concentre-toi sur l’arrière des épaules.',
    ],

    mistakes: [
      {
        title: 'Charge trop lourde',
        correction: 'Réduis le poids.',
      },
      {
        title: 'Tirage trop bas',
        correction: 'Dirige la corde vers le visage.',
      },
    ],

    variants: [
      'Oiseau poulie',
      'Reverse Pec Deck',
      'Oiseau haltères',
    ],
  },

  leg_press: {
    muscles: {
      primary: ['Quadriceps', 'Fessiers'],
      secondary: ['Ischio-jambiers'],
      stabilizers: [],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Place les pieds sur la plateforme et garde le bassin contre le dossier.',
      },
      {
        title: 'Descente',
        cue: 'Fléchis les genoux de manière contrôlée sans décoller le bassin.',
      },
      {
        title: 'Retour',
        cue: 'Pousse la plateforme en gardant les genoux dans l’axe des pieds.',
      },
    ],

    coachTips: [
      'Garde le bassin contre le dossier.',
      'Contrôle la profondeur.',
      'Ne verrouille pas brutalement les genoux.',
    ],

    mistakes: [
      {
        title: 'Bassin qui se décolle',
        correction: 'Réduis la profondeur.',
      },
      {
        title: 'Genoux qui rentrent',
        correction: 'Maintiens-les dans l’axe des pieds.',
      },
    ],

    variants: [
      'Squat barre arrière',
      'Hack Squat',
      'Goblet Squat',
    ],
  },

  plank: {
    muscles: {
      primary: ['Abdominaux', 'Transverse'],
      secondary: ['Obliques'],
      stabilizers: ['Fessiers', 'Épaules'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Place les avant-bras au sol avec les coudes sous les épaules.',
      },
      {
        title: 'Maintien',
        cue: 'Forme une ligne droite de la tête aux talons en contractant abdominaux et fessiers.',
      },
      {
        title: 'Position finale',
        cue: 'Maintiens la position sans laisser le bassin s’affaisser.',
      },
    ],

    coachTips: [
      'Contracte les abdominaux.',
      'Serre les fessiers.',
      'Respire normalement.',
      'Garde la nuque neutre.',
    ],

    mistakes: [
      {
        title: 'Bassin trop bas',
        correction: 'Resserre les abdominaux et les fessiers.',
      },
      {
        title: 'Bassin trop haut',
        correction: 'Aligne épaules, hanches et talons.',
      },
    ],

    variants: [
      'Planche latérale',
      'Dead Bug',
      'Hollow Hold',
    ],
  },
};

/* =========================================================
   CRÉATION DES 152 FICHES
   ========================================================= */

function buildExercise(
  base: CatalogExercise,
): NoxExercise {
  const defaults =
    CATEGORY_DEFAULTS[base.category];

  const override =
    EXERCISE_OVERRIDES[base.id] || {};

  return {
    id: base.id,
    name: base.name,
    category: base.category,
    equipment: base.equipment,

    aliases: [
      ...(EXTRA_ALIASES[base.id] || []),
    ],

    muscles:
      override.muscles ||
      defaults.muscles,

    steps:
      override.steps ||
      defaults.steps,

    coachTips:
      override.coachTips ||
      defaults.coachTips,

    mistakes:
      override.mistakes ||
      defaults.mistakes,

    variants:
      override.variants || [],

    /*
     * IMPORTANT :
     * aucun Pexels,
     * aucun Vimeo,
     * aucune image d'un autre exercice.
     *
     * Les vrais assets DÉMO NOX seront ajoutés ici.
     */
    visuals:
      override.visuals || {},
  };
}

export const NOX_EXERCISES: NoxExercise[] =
  NOX_GENERATOR_CATALOG.map(buildExercise);

/* =========================================================
   INDEX PAR ID
   ========================================================= */

export const NOX_EXERCISES_BY_ID:
  Record<string, NoxExercise> =
  Object.fromEntries(
    NOX_EXERCISES.map(item => [
      item.id,
      item,
    ]),
  );

/* =========================================================
   INDEX EXACT NOM / ALIAS
   ========================================================= */

const NOX_EXERCISES_BY_NAME =
  new Map<string, NoxExercise>();

for (const item of NOX_EXERCISES) {
  const values = [
    item.name,
    ...item.aliases,
  ];

  for (const value of values) {
    const key =
      normalizeExerciseText(value);

    if (
      key &&
      !NOX_EXERCISES_BY_NAME.has(key)
    ) {
      NOX_EXERCISES_BY_NAME.set(
        key,
        item,
      );
    }
  }
}

/* =========================================================
   RÉSOLUTION
   ========================================================= */

export type NoxExerciseSource = {
  exercise_id?: string | null;
  id?: string | null;
  name?: string | null;
  exercise_name?: string | null;
};

export function getNoxExerciseById(
  exerciseId?: string | null,
): NoxExercise | null {
  if (!exerciseId) {
    return null;
  }

  const exact =
    String(exerciseId).trim();

  if (NOX_EXERCISES_BY_ID[exact]) {
    return NOX_EXERCISES_BY_ID[exact];
  }

  const normalized =
    normalizeExerciseId(exerciseId);

  return (
    NOX_EXERCISES_BY_ID[normalized] ||
    null
  );
}

export function getNoxExerciseByName(
  name?: string | null,
): NoxExercise | null {
  if (!name) {
    return null;
  }

  const normalized =
    normalizeExerciseText(name);

  if (!normalized) {
    return null;
  }

  /*
   * IMPORTANT :
   * correspondance exacte uniquement.
   *
   * Pas de :
   * name.includes('squat')
   *
   * Donc :
   * Goblet Squat ≠ Back Squat
   * Front Squat ≠ Back Squat
   * Hack Squat ≠ Back Squat
   */

  return (
    NOX_EXERCISES_BY_NAME.get(
      normalized,
    ) || null
  );
}

export function resolveNoxExercise(
  source:
    | NoxExerciseSource
    | string
    | null
    | undefined,
): NoxExercise | null {
  if (!source) {
    return null;
  }

  if (typeof source === 'string') {
    return (
      getNoxExerciseById(source) ||
      getNoxExerciseByName(source)
    );
  }

  /*
   * PRIORITÉ ABSOLUE :
   * exercise_id généré par NOX.
   */

  if (source.exercise_id) {
    const byExerciseId =
      getNoxExerciseById(
        source.exercise_id,
      );

    if (byExerciseId) {
      return byExerciseId;
    }
  }

  if (source.id) {
    const byId =
      getNoxExerciseById(source.id);

    if (byId) {
      return byId;
    }
  }

  return getNoxExerciseByName(
    source.name ||
    source.exercise_name,
  );
}

/* =========================================================
   VISUELS
   ========================================================= */

export function getNoxExerciseThumbnail(
  source:
    | NoxExerciseSource
    | string
    | null
    | undefined,
): string | null {
  const item =
    resolveNoxExercise(source);

  if (!item) {
    return null;
  }

  return (
    item.visuals.thumbnail ||
    item.visuals.position1 ||
    null
  );
}

export function getNoxExerciseMovementImages(
  source:
    | NoxExerciseSource
    | string
    | null
    | undefined,
): [
  string | null,
  string | null,
  string | null
] {
  const item =
    resolveNoxExercise(source);

  if (!item) {
    return [
      null,
      null,
      null,
    ];
  }

  return [
    item.visuals.position1 || null,
    item.visuals.position2 || null,
    item.visuals.position3 || null,
  ];
}

export function getNoxExerciseAnatomyImage(
  source:
    | NoxExerciseSource
    | string
    | null
    | undefined,
): string | null {
  return (
    resolveNoxExercise(source)
      ?.visuals.anatomy ||
    null
  );
}

export function hasCompleteNoxDemo(
  source:
    | NoxExerciseSource
    | string
    | null
    | undefined,
): boolean {
  const [
    position1,
    position2,
    position3,
  ] =
    getNoxExerciseMovementImages(
      source,
    );

  return Boolean(
    position1 &&
    position2 &&
    position3,
  );
}

/* =========================================================
   CONTENU DÉMO
   ========================================================= */

export function getNoxExerciseSteps(
  source:
    | NoxExerciseSource
    | string
    | null
    | undefined,
): NoxExerciseStep[] {
  return (
    resolveNoxExercise(source)
      ?.steps || []
  );
}

export function getNoxExerciseCoachTips(
  source:
    | NoxExerciseSource
    | string
    | null
    | undefined,
): string[] {
  return (
    resolveNoxExercise(source)
      ?.coachTips || []
  );
}

export function getNoxExerciseMistakes(
  source:
    | NoxExerciseSource
    | string
    | null
    | undefined,
): NoxExerciseMistake[] {
  return (
    resolveNoxExercise(source)
      ?.mistakes || []
  );
}

export function getNoxExerciseVariants(
  source:
    | NoxExerciseSource
    | string
    | null
    | undefined,
): string[] {
  return (
    resolveNoxExercise(source)
      ?.variants || []
  );
}

export function getNoxExerciseMuscles(
  source:
    | NoxExerciseSource
    | string
    | null
    | undefined,
): NoxExerciseMuscles {
  return (
    resolveNoxExercise(source)
      ?.muscles || {
      primary: [],
      secondary: [],
      stabilizers: [],
    }
  );
}

/* =========================================================
   HELPERS PROGRAM / TRAINING / GENERATOR
   ========================================================= */

export function getNoxExerciseIds() {
  return NOX_EXERCISES.map(
    item => item.id,
  );
}

export function getNoxExerciseGeneratorCatalog() {
  return NOX_GENERATOR_CATALOG.map(
    item => ({
      exercise_id: item.id,
      name: item.name,
      category: item.category,
      equipment: item.equipment,
    }),
  );
}

export function getNoxExerciseCount() {
  return NOX_EXERCISES.length;
}

/* =========================================================
   VALIDATION
   ========================================================= */

export function validateNoxExerciseLibrary() {
  const ids =
    new Set<string>();

  const names =
    new Set<string>();

  const duplicateIds: string[] = [];
  const duplicateNames: string[] = [];
  const invalidExercises: string[] = [];

  for (const item of NOX_EXERCISES) {
    if (
      !item.id ||
      !item.name ||
      !item.category ||
      !item.equipment
    ) {
      invalidExercises.push(
        item.id || item.name || 'unknown',
      );
    }

    if (ids.has(item.id)) {
      duplicateIds.push(item.id);
    }

    ids.add(item.id);

    const normalizedName =
      normalizeExerciseText(item.name);

    if (names.has(normalizedName)) {
      duplicateNames.push(item.name);
    }

    names.add(normalizedName);
  }

  return {
    valid:
      NOX_EXERCISES.length === 152 &&
      duplicateIds.length === 0 &&
      duplicateNames.length === 0 &&
      invalidExercises.length === 0,

    expectedCount: 152,
    count: NOX_EXERCISES.length,

    duplicateIds,
    duplicateNames,
    invalidExercises,
  };
}
