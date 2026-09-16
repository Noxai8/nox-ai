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
  steps: [NoxExerciseStep, NoxExerciseStep, NoxExerciseStep];
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

export function normalizeExerciseText(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/[-_/]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeExerciseId(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

/*
 * Catalogue canonique NOX.
 *
 * IMPORTANT :
 * - les IDs correspondent au catalogue utilisé par GenerateProgram ;
 * - Program et Training doivent résoudre les exercices avec exercise_id ;
 * - aucun exercice ne doit récupérer le visuel d'un autre exercice ;
 * - les visuels restent vides tant que le véritable asset NOX
 *   correspondant n'a pas été ajouté.
 */
const NOX_GENERATOR_CATALOG: CatalogExercise[] = [
  // PUSH
  { id: 'barbell_bench_press', name: 'Développé couché barre', category: 'push', equipment: 'barre' },
  { id: 'incline_barbell_bench_press', name: 'Développé incliné barre', category: 'push', equipment: 'barre' },
  { id: 'decline_barbell_bench_press', name: 'Développé décliné barre', category: 'push', equipment: 'barre' },
  { id: 'close_grip_bench_press', name: 'Développé couché prise serrée', category: 'push', equipment: 'barre' },
  { id: 'barbell_overhead_press', name: 'Développé militaire barre', category: 'push', equipment: 'barre' },
  { id: 'push_press', name: 'Push Press', category: 'push', equipment: 'barre' },

  { id: 'dumbbell_bench_press', name: 'Développé couché haltères', category: 'push', equipment: 'haltères' },
  { id: 'incline_dumbbell_bench_press', name: 'Développé incliné haltères', category: 'push', equipment: 'haltères' },
  { id: 'decline_dumbbell_bench_press', name: 'Développé décliné haltères', category: 'push', equipment: 'haltères' },
  { id: 'dumbbell_overhead_press', name: 'Développé militaire haltères', category: 'push', equipment: 'haltères' },
  { id: 'arnold_press', name: 'Arnold Press', category: 'push', equipment: 'haltères' },
  { id: 'dumbbell_lateral_raise', name: 'Élévations latérales haltères', category: 'push', equipment: 'haltères' },
  { id: 'dumbbell_front_raise', name: 'Élévations frontales haltères', category: 'push', equipment: 'haltères' },
  { id: 'dumbbell_fly', name: 'Écarté couché haltères', category: 'push', equipment: 'haltères' },
  { id: 'incline_dumbbell_fly', name: 'Écarté incliné haltères', category: 'push', equipment: 'haltères' },
  {
    id: 'dumbbell_triceps_extension',
    name: 'Extension triceps haltère au-dessus de la tête',
    category: 'push',
    equipment: 'haltères',
  },
  {
    id: 'dumbbell_skull_crusher',
    name: 'Extension triceps couché haltères',
    category: 'push',
    equipment: 'haltères',
  },
  { id: 'dumbbell_kickback', name: 'Kickback triceps haltère', category: 'push', equipment: 'haltères' },

  { id: 'cable_chest_fly', name: 'Écarté poulie vis-à-vis', category: 'push', equipment: 'poulie' },
  { id: 'high_to_low_cable_fly', name: 'Écarté poulie haute vers basse', category: 'push', equipment: 'poulie' },
  { id: 'low_to_high_cable_fly', name: 'Écarté poulie basse vers haute', category: 'push', equipment: 'poulie' },
  { id: 'cable_lateral_raise', name: 'Élévation latérale poulie', category: 'push', equipment: 'poulie' },
  { id: 'cable_front_raise', name: 'Élévation frontale poulie', category: 'push', equipment: 'poulie' },
  { id: 'rope_triceps_pushdown', name: 'Extension triceps corde', category: 'push', equipment: 'poulie' },
  { id: 'bar_triceps_pushdown', name: 'Extension triceps barre poulie', category: 'push', equipment: 'poulie' },
  {
    id: 'cable_overhead_triceps_extension',
    name: 'Extension triceps poulie au-dessus de la tête',
    category: 'push',
    equipment: 'poulie',
  },

  { id: 'machine_chest_press', name: 'Chest Press machine', category: 'push', equipment: 'machine' },
  { id: 'incline_machine_press', name: 'Développé incliné machine', category: 'push', equipment: 'machine' },
  { id: 'pec_deck', name: 'Pec Deck', category: 'push', equipment: 'machine' },
  { id: 'machine_shoulder_press', name: 'Développé épaules machine', category: 'push', equipment: 'machine' },
  { id: 'machine_lateral_raise', name: 'Élévation latérale machine', category: 'push', equipment: 'machine' },
  { id: 'assisted_dip', name: 'Dips assistés', category: 'push', equipment: 'machine' },

  { id: 'push_up', name: 'Pompes', category: 'push', equipment: 'poids du corps' },
  { id: 'incline_push_up', name: 'Pompes inclinées', category: 'push', equipment: 'poids du corps' },
  { id: 'decline_push_up', name: 'Pompes déclinées', category: 'push', equipment: 'poids du corps' },
  { id: 'diamond_push_up', name: 'Pompes diamant', category: 'push', equipment: 'poids du corps' },
  { id: 'dip', name: 'Dips', category: 'push', equipment: 'poids du corps' },

  // PULL
  { id: 'barbell_bent_over_row', name: 'Rowing barre buste penché', category: 'pull', equipment: 'barre' },
  { id: 'pendlay_row', name: 'Rowing Pendlay', category: 'pull', equipment: 'barre' },
  { id: 'underhand_barbell_row', name: 'Rowing barre supination', category: 'pull', equipment: 'barre' },
  { id: 'barbell_shrug', name: 'Shrugs barre', category: 'pull', equipment: 'barre' },
  { id: 'barbell_curl', name: 'Curl barre', category: 'pull', equipment: 'barre' },
  { id: 'ez_bar_curl', name: 'Curl barre EZ', category: 'pull', equipment: 'barre' },
  { id: 'reverse_barbell_curl', name: 'Curl inversé barre', category: 'pull', equipment: 'barre' },

  { id: 'one_arm_dumbbell_row', name: 'Rowing haltère unilatéral', category: 'pull', equipment: 'haltères' },
  {
    id: 'chest_supported_dumbbell_row',
    name: 'Rowing haltères poitrine appuyée',
    category: 'pull',
    equipment: 'haltères',
  },
  { id: 'dumbbell_shrug', name: 'Shrugs haltères', category: 'pull', equipment: 'haltères' },
  { id: 'dumbbell_pullover', name: 'Pull-over haltère', category: 'pull', equipment: 'haltères' },
  { id: 'dumbbell_curl', name: 'Curl haltères', category: 'pull', equipment: 'haltères' },
  { id: 'alternating_dumbbell_curl', name: 'Curl haltères alterné', category: 'pull', equipment: 'haltères' },
  { id: 'hammer_curl', name: 'Curl marteau', category: 'pull', equipment: 'haltères' },
  { id: 'incline_dumbbell_curl', name: 'Curl incliné haltères', category: 'pull', equipment: 'haltères' },
  { id: 'concentration_curl', name: 'Curl concentration', category: 'pull', equipment: 'haltères' },
  { id: 'reverse_fly_dumbbell', name: 'Oiseau haltères', category: 'pull', equipment: 'haltères' },

  { id: 'lat_pulldown', name: 'Tirage vertical poitrine', category: 'pull', equipment: 'poulie' },
  { id: 'close_grip_lat_pulldown', name: 'Tirage vertical prise serrée', category: 'pull', equipment: 'poulie' },
  { id: 'neutral_grip_lat_pulldown', name: 'Tirage vertical prise neutre', category: 'pull', equipment: 'poulie' },
  { id: 'straight_arm_pulldown', name: 'Pull-over poulie bras tendus', category: 'pull', equipment: 'poulie' },
  { id: 'seated_cable_row', name: 'Tirage horizontal poulie', category: 'pull', equipment: 'poulie' },
  { id: 'wide_grip_cable_row', name: 'Tirage horizontal prise large', category: 'pull', equipment: 'poulie' },
  {
    id: 'single_arm_cable_row',
    name: 'Tirage horizontal unilatéral poulie',
    category: 'pull',
    equipment: 'poulie',
  },
  { id: 'face_pull', name: 'Face Pull', category: 'pull', equipment: 'poulie' },
  { id: 'cable_reverse_fly', name: 'Oiseau poulie', category: 'pull', equipment: 'poulie' },
  { id: 'cable_curl', name: 'Curl poulie', category: 'pull', equipment: 'poulie' },
  { id: 'rope_hammer_curl', name: 'Curl marteau corde', category: 'pull', equipment: 'poulie' },
  { id: 'bayesian_curl', name: 'Curl Bayesian', category: 'pull', equipment: 'poulie' },

  { id: 'machine_row', name: 'Rowing machine', category: 'pull', equipment: 'machine' },
  {
    id: 'chest_supported_machine_row',
    name: 'Rowing machine poitrine appuyée',
    category: 'pull',
    equipment: 'machine',
  },
  { id: 'machine_high_row', name: 'High Row machine', category: 'pull', equipment: 'machine' },
  { id: 'reverse_pec_deck', name: 'Reverse Pec Deck', category: 'pull', equipment: 'machine' },
  { id: 'machine_pullover', name: 'Pull-over machine', category: 'pull', equipment: 'machine' },
  { id: 'preacher_curl_machine', name: 'Curl pupitre machine', category: 'pull', equipment: 'machine' },
  { id: 'assisted_pull_up', name: 'Tractions assistées', category: 'pull', equipment: 'machine' },

  { id: 'pull_up', name: 'Tractions pronation', category: 'pull', equipment: 'poids du corps' },
  { id: 'chin_up', name: 'Tractions supination', category: 'pull', equipment: 'poids du corps' },
  { id: 'neutral_grip_pull_up', name: 'Tractions prise neutre', category: 'pull', equipment: 'poids du corps' },
  { id: 'inverted_row', name: 'Rowing inversé', category: 'pull', equipment: 'poids du corps' },

  // LEGS
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

  { id: 'goblet_squat', name: 'Goblet Squat', category: 'legs', equipment: 'haltères' },
  { id: 'dumbbell_squat', name: 'Squat haltères', category: 'legs', equipment: 'haltères' },
  {
    id: 'dumbbell_romanian_deadlift',
    name: 'Soulevé de terre roumain haltères',
    category: 'legs',
    equipment: 'haltères',
  },
  { id: 'dumbbell_walking_lunge', name: 'Fentes marchées haltères', category: 'legs', equipment: 'haltères' },
  { id: 'dumbbell_reverse_lunge', name: 'Fentes arrière haltères', category: 'legs', equipment: 'haltères' },
  { id: 'bulgarian_split_squat', name: 'Bulgarian Split Squat', category: 'legs', equipment: 'haltères' },
  { id: 'dumbbell_step_up', name: 'Step-up haltères', category: 'legs', equipment: 'haltères' },
  { id: 'dumbbell_calf_raise', name: 'Mollets debout haltères', category: 'legs', equipment: 'haltères' },

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
  {
    id: 'standing_calf_raise_machine',
    name: 'Mollets debout machine',
    category: 'legs',
    equipment: 'machine',
  },
  {
    id: 'seated_calf_raise_machine',
    name: 'Mollets assis machine',
    category: 'legs',
    equipment: 'machine',
  },

  { id: 'cable_pull_through', name: 'Pull Through poulie', category: 'legs', equipment: 'poulie' },
  { id: 'cable_glute_kickback', name: 'Kickback fessier poulie', category: 'legs', equipment: 'poulie' },
  { id: 'cable_hip_abduction', name: 'Abduction de hanche poulie', category: 'legs', equipment: 'poulie' },
  { id: 'cable_hip_adduction', name: 'Adduction de hanche poulie', category: 'legs', equipment: 'poulie' },

  { id: 'bodyweight_squat', name: 'Squat poids du corps', category: 'legs', equipment: 'poids du corps' },
  { id: 'bodyweight_lunge', name: 'Fentes poids du corps', category: 'legs', equipment: 'poids du corps' },
  { id: 'reverse_lunge', name: 'Fentes arrière poids du corps', category: 'legs', equipment: 'poids du corps' },
  { id: 'walking_lunge', name: 'Fentes marchées poids du corps', category: 'legs', equipment: 'poids du corps' },
  { id: 'step_up', name: 'Step-up', category: 'legs', equipment: 'poids du corps' },
  {
    id: 'single_leg_glute_bridge',
    name: 'Glute Bridge une jambe',
    category: 'legs',
    equipment: 'poids du corps',
  },
  { id: 'glute_bridge', name: 'Glute Bridge', category: 'legs', equipment: 'poids du corps' },
  {
    id: 'single_leg_calf_raise',
    name: 'Mollets une jambe',
    category: 'legs',
    equipment: 'poids du corps',
  },
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
  {
    id: 'hanging_knee_raise',
    name: 'Relevé de genoux suspendu',
    category: 'core',
    equipment: 'poids du corps',
  },
  {
    id: 'hanging_leg_raise',
    name: 'Relevé de jambes suspendu',
    category: 'core',
    equipment: 'poids du corps',
  },
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
  {
    id: 'incline_treadmill_walk',
    name: 'Marche inclinée sur tapis',
    category: 'conditioning',
    equipment: 'cardio',
  },
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

const EXTRA_ALIASES: Record<string, string[]> = {
  barbell_bench_press: [
    'bench press',
    'barbell bench press',
    'développé couché',
    'developpe couche',
  ],
  incline_barbell_bench_press: [
    'incline bench press',
    'incline barbell bench press',
    'développé incliné',
  ],
  barbell_overhead_press: [
    'overhead press',
    'military press',
    'barbell overhead press',
    'développé militaire',
  ],
  dumbbell_overhead_press: [
    'dumbbell overhead press',
    'dumbbell shoulder press',
    'développé militaire haltères',
  ],
  dumbbell_lateral_raise: [
    'lateral raise',
    'dumbbell lateral raise',
    'élévations latérales',
  ],
  machine_chest_press: [
    'machine chest press',
    'chest press',
  ],
  cable_chest_fly: [
    'cable fly',
    'cable chest fly',
    'écarté poulie',
  ],
  barbell_bent_over_row: [
    'barbell row',
    'bent over row',
    'bent-over row',
    'rowing barre',
  ],
  lat_pulldown: [
    'lat pulldown',
    'tirage vertical',
  ],
  seated_cable_row: [
    'seated cable row',
    'cable row',
    'tirage horizontal',
  ],
  face_pull: ['face pull', 'facepull'],
  pull_up: [
    'pull up',
    'pull-up',
    'pullup',
    'traction pronation',
  ],
  back_squat: [
    'back squat',
    'barbell back squat',
    'squat barre',
    'squat arrière',
  ],
  goblet_squat: [
    'goblet squat',
    'kettlebell goblet squat',
  ],
  romanian_deadlift: [
    'romanian deadlift',
    'rdl',
    'soulevé de terre roumain',
  ],
  conventional_deadlift: [
    'deadlift',
    'conventional deadlift',
    'soulevé de terre',
  ],
  leg_press: [
    'leg press',
    'presse',
    'presse à cuisses',
  ],
  barbell_hip_thrust: [
    'hip thrust',
    'barbell hip thrust',
  ],
  ez_bar_curl: [
    'ez curl',
    'ez bar curl',
    'curl ez',
  ],
  dumbbell_curl: [
    'dumbbell curl',
    'curl haltère',
    'curl haltères',
  ],
  hammer_curl: [
    'hammer curl',
    'curl marteau',
  ],
  rope_triceps_pushdown: [
    'rope pushdown',
    'triceps rope pushdown',
    'triceps pushdown',
    'extension triceps corde',
  ],
  dip: ['dip', 'dips'],
  plank: [
    'plank',
    'gainage',
    'planche abdominale',
  ],
  side_plank: [
    'side plank',
    'gainage latéral',
  ],
  dead_bug: ['dead bug', 'deadbug'],
  treadmill_walk: [
    'treadmill walk',
    'marche tapis',
  ],
  incline_treadmill_walk: [
    'incline treadmill walk',
    'marche inclinée',
  ],
  treadmill_run: [
    'treadmill run',
    'course tapis',
  ],
  stationary_bike: [
    'stationary bike',
    'vélo',
    'velo stationnaire',
  ],
  rowing_ergometer: [
    'rowing machine',
    'rowing ergometer',
    'rameur',
  ],
};

type ExerciseTemplate = {
  muscles: NoxExerciseMuscles;
  steps: [NoxExerciseStep, NoxExerciseStep, NoxExerciseStep];
  coachTips: string[];
  mistakes: NoxExerciseMistake[];
  variants: string[];
};

const CATEGORY_DEFAULTS: Record<NoxExerciseCategory, ExerciseTemplate> = {
  push: {
    muscles: {
      primary: ['Pectoraux / épaules'],
      secondary: ['Triceps'],
      stabilizers: ['Ceinture abdominale'],
    },
    steps: [
      {
        title: 'Position de départ',
        cue: 'Installe-toi de façon stable et place la charge dans une position confortable.',
      },
      {
        title: 'Mouvement',
        cue: 'Pousse la charge avec contrôle en gardant le tronc stable et les articulations alignées.',
      },
      {
        title: 'Retour',
        cue: 'Reviens lentement à la position de départ sans perdre la tension.',
      },
    ],
    coachTips: [
      'Garde une trajectoire contrôlée.',
      'Évite de sacrifier la technique pour augmenter la charge.',
      'Expire pendant la phase de poussée.',
    ],
    mistakes: [
      {
        title: 'Charge trop lourde',
        correction: 'Réduis la charge et conserve une amplitude propre.',
      },
      {
        title: 'Mouvement trop rapide',
        correction: 'Contrôle particulièrement la phase de retour.',
      },
    ],
    variants: [],
  },

  pull: {
    muscles: {
      primary: ['Dos'],
      secondary: ['Biceps'],
      stabilizers: ['Arrière des épaules', 'Ceinture abdominale'],
    },
    steps: [
      {
        title: 'Position de départ',
        cue: 'Place-toi de façon stable et laisse les bras prendre leur position de départ.',
      },
      {
        title: 'Tirage',
        cue: 'Tire en guidant le mouvement avec les coudes et en gardant le buste contrôlé.',
      },
      {
        title: 'Retour',
        cue: 'Reviens lentement jusqu’à retrouver une amplitude complète et maîtrisée.',
      },
    ],
    coachTips: [
      'Pense à guider le mouvement avec les coudes.',
      'Évite les à-coups.',
      'Contrôle la phase de retour.',
    ],
    mistakes: [
      {
        title: 'Élan du buste',
        correction: 'Stabilise le tronc et diminue la charge si nécessaire.',
      },
      {
        title: 'Tirage uniquement avec les bras',
        correction: 'Initie le mouvement avec le dos et dirige les coudes.',
      },
    ],
    variants: [],
  },

  legs: {
    muscles: {
      primary: ['Jambes'],
      secondary: ['Fessiers'],
      stabilizers: ['Ceinture abdominale'],
    },
    steps: [
      {
        title: 'Position de départ',
        cue: 'Place les appuis de façon stable et prépare le tronc avant le mouvement.',
      },
      {
        title: 'Mouvement',
        cue: 'Fléchis ou déplace les hanches et les genoux en conservant un alignement stable.',
      },
      {
        title: 'Retour',
        cue: 'Pousse dans tes appuis pour revenir à la position finale sans perdre le contrôle.',
      },
    ],
    coachTips: [
      'Garde les appuis stables.',
      'Maintiens les genoux dans l’axe des pieds.',
      'Contrôle la descente avant d’accélérer la remontée.',
    ],
    mistakes: [
      {
        title: 'Genoux qui rentrent',
        correction: 'Garde les genoux alignés avec la direction des pieds.',
      },
      {
        title: 'Perte de stabilité',
        correction: 'Réduis la charge ou l’amplitude jusqu’à retrouver le contrôle.',
      },
    ],
    variants: [],
  },

  core: {
    muscles: {
      primary: ['Abdominaux'],
      secondary: ['Obliques'],
      stabilizers: ['Lombaires', 'Hanches'],
    },
    steps: [
      {
        title: 'Position de départ',
        cue: 'Place le bassin et la cage thoracique dans une position neutre et stable.',
      },
      {
        title: 'Gainage',
        cue: 'Crée une tension abdominale continue sans bloquer inutilement la respiration.',
      },
      {
        title: 'Contrôle',
        cue: 'Maintiens ou répète le mouvement sans perdre l’alignement du tronc.',
      },
    ],
    coachTips: [
      'Respire tout en gardant les abdominaux engagés.',
      'Privilégie le contrôle à la vitesse.',
      'Arrête lorsque tu ne peux plus maintenir la position.',
    ],
    mistakes: [
      {
        title: 'Perte de position',
        correction: 'Réduis la durée ou l’amplitude et replace le bassin.',
      },
      {
        title: 'Apnée',
        correction: 'Continue à respirer pendant l’effort.',
      },
    ],
    variants: [],
  },

  conditioning: {
    muscles: {
      primary: ['Système cardio-respiratoire'],
      secondary: ['Jambes'],
      stabilizers: ['Ceinture abdominale'],
    },
    steps: [
      {
        title: 'Mise en route',
        cue: 'Commence progressivement pour trouver un rythme stable.',
      },
      {
        title: 'Effort',
        cue: 'Maintiens l’intensité prévue avec une respiration régulière et une technique propre.',
      },
      {
        title: 'Fin',
        cue: 'Réduis progressivement l’intensité avant de terminer.',
      },
    ],
    coachTips: [
      'Adapte l’intensité à la durée prévue.',
      'Garde une respiration régulière.',
      'Privilégie une technique stable même lorsque la fatigue augmente.',
    ],
    mistakes: [
      {
        title: 'Départ trop rapide',
        correction: 'Monte progressivement en intensité.',
      },
      {
        title: 'Technique dégradée',
        correction: 'Ralentis avant que la fatigue n’altère le mouvement.',
      },
    ],
    variants: [],
  },
};

const EXERCISE_OVERRIDES: Partial<
  Record<string, Partial<ExerciseTemplate> & { visuals?: NoxExerciseVisuals }>
> = {
  barbell_bench_press: {
    muscles: {
      primary: ['Pectoraux'],
      secondary: ['Triceps', 'Deltoïdes antérieurs'],
      stabilizers: ['Haut du dos'],
    },
    steps: [
      {
        title: 'Position de départ',
        cue: 'Allonge-toi, pieds ancrés au sol, omoplates serrées et barre au-dessus de la poitrine.',
      },
      {
        title: 'Descente',
        cue: 'Descends la barre sous contrôle vers le bas des pectoraux en gardant les avant-bras stables.',
      },
      {
        title: 'Poussée',
        cue: 'Pousse la barre vers le haut sans perdre la position des épaules ni l’appui des pieds.',
      },
    ],
    coachTips: [
      'Garde les omoplates serrées contre le banc.',
      'Contrôle la descente.',
      'Garde les pieds fermement au sol.',
      'Évite de faire rebondir la barre sur la poitrine.',
    ],
    mistakes: [
      {
        title: 'Épaules qui avancent',
        correction: 'Garde les omoplates serrées et abaissées.',
      },
      {
        title: 'Barre qui rebondit',
        correction: 'Ralentis la descente et marque un contact contrôlé.',
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
      stabilizers: ['Haut du dos', 'Abdominaux'],
    },
    steps: [
      {
        title: 'Position de départ',
        cue: 'Haltères à hauteur des épaules, paumes vers l’avant et buste droit.',
      },
      {
        title: 'Mouvement',
        cue: 'Pousse verticalement en gardant le gainage et les abdominaux serrés.',
      },
      {
        title: 'Position finale',
        cue: 'Termine les bras au-dessus de la tête puis redescends sous contrôle.',
      },
    ],
    coachTips: [
      'Garde le dos bien droit.',
      'Ne cambre pas excessivement le bas du dos.',
      'Contrôle la descente.',
      'Expire en montant et inspire en descendant.',
      'Garde un mouvement fluide et contrôlé.',
    ],
    mistakes: [
      {
        title: 'Dos trop cambré',
        correction: 'Serre les abdominaux et les fessiers avant de pousser.',
      },
      {
        title: 'Trajectoire vers l’avant',
        correction: 'Pousse les haltères verticalement au-dessus des épaules.',
      },
    ],
    variants: [
      'Développé militaire barre',
      'Arnold Press',
      'Développé épaules machine',
    ],
  },

  back_squat: {
    muscles: {
      primary: ['Quadriceps', 'Fessiers'],
      secondary: ['Ischio-jambiers'],
      stabilizers: ['Abdominaux', 'Lombaires'],
    },
    steps: [
      {
        title: 'Position de départ',
        cue: 'Place la barre de façon stable sur le haut du dos, pieds ancrés et tronc gainé.',
      },
      {
        title: 'Descente',
        cue: 'Descends les hanches en gardant les genoux dans l’axe des pieds et le tronc contrôlé.',
      },
      {
        title: 'Remontée',
        cue: 'Pousse le sol avec les pieds et remonte sans laisser les genoux rentrer.',
      },
    ],
    coachTips: [
      'Garde le pied entier au sol.',
      'Gaine avant chaque répétition.',
      'Contrôle la profondeur.',
      'Garde les genoux dans l’axe des pieds.',
    ],
    mistakes: [
      {
        title: 'Talons qui décollent',
        correction: 'Réduis la profondeur et travaille la stabilité des appuis.',
      },
      {
        title: 'Genoux vers l’intérieur',
        correction: 'Pousse légèrement les genoux dans la direction des orteils.',
      },
    ],
    variants: [
      'Front Squat',
      'Box Squat',
      'Goblet Squat',
    ],
  },

  goblet_squat: {
    muscles: {
      primary: ['Quadriceps', 'Fessiers'],
      secondary: ['Ischio-jambiers'],
      stabilizers: ['Abdominaux', 'Haut du dos'],
    },
    steps: [
      {
        title: 'Position de départ',
        cue: 'Tiens la charge contre la poitrine, pieds stables et buste droit.',
      },
      {
        title: 'Descente',
        cue: 'Descends entre les jambes en gardant les genoux dans l’axe des pieds.',
      },
      {
        title: 'Remontée',
        cue: 'Pousse dans le sol pour revenir debout en gardant la charge proche du corps.',
      },
    ],
    coachTips: [
      'Garde la charge proche de la poitrine.',
      'Maintiens le buste droit.',
      'Garde les talons au sol.',
      'Contrôle la descente.',
    ],
    mistakes: [
      {
        title: 'Charge éloignée du corps',
        correction: 'Ramène la charge contre la poitrine.',
      },
      {
        title: 'Talons qui se lèvent',
        correction: 'Réduis l’amplitude et stabilise tes appuis.',
      },
    ],
    variants: [
      'Squat poids du corps',
      'Squat haltères',
      'Front Squat',
    ],
  },

  romanian_deadlift: {
    muscles: {
      primary: ['Ischio-jambiers'],
      secondary: ['Fessiers'],
      stabilizers: ['Lombaires', 'Haut du dos', 'Abdominaux'],
    },
    steps: [
      {
        title: 'Position de départ',
        cue: 'Tiens la barre près des cuisses, pieds stables et genoux légèrement fléchis.',
      },
      {
        title: 'Charnière de hanches',
        cue: 'Recule les hanches en gardant la barre proche des jambes et le dos neutre.',
      },
      {
        title: 'Retour',
        cue: 'Reviens debout en poussant les hanches vers l’avant et en contractant les fessiers.',
      },
    ],
    coachTips: [
      'Le mouvement vient principalement des hanches.',
      'Garde la barre proche du corps.',
      'Ne cherche pas à descendre plus bas si le dos commence à s’arrondir.',
    ],
    mistakes: [
      {
        title: 'Dos arrondi',
        correction: 'Réduis l’amplitude et maintiens le tronc gainé.',
      },
      {
        title: 'Squat au lieu de charnière',
        correction: 'Recule davantage les hanches et limite la flexion des genoux.',
      },
    ],
    variants: [
      'Soulevé de terre roumain haltères',
      'Good Morning',
      'Pull Through poulie',
    ],
  },

  conventional_deadlift: {
    muscles: {
      primary: ['Fessiers', 'Ischio-jambiers'],
      secondary: ['Quadriceps', 'Dos'],
      stabilizers: ['Abdominaux', 'Avant-bras'],
    },
    steps: [
      {
        title: 'Position de départ',
        cue: 'Place la barre au-dessus du milieu du pied, saisis-la et crée une tension dans tout le corps.',
      },
      {
        title: 'Décollage',
        cue: 'Pousse le sol tout en gardant la barre proche des jambes et le dos stable.',
      },
      {
        title: 'Verrouillage',
        cue: 'Termine debout avec les hanches et les genoux tendus sans exagérer l’extension du dos.',
      },
    ],
    coachTips: [
      'Garde la barre proche du corps.',
      'Crée de la tension avant de décoller la barre.',
      'Pousse le sol plutôt que de tirer uniquement avec le dos.',
    ],
    mistakes: [
      {
        title: 'Barre trop loin des jambes',
        correction: 'Replace la barre au-dessus du milieu du pied.',
      },
      {
        title: 'Dos qui s’arrondit',
        correction: 'Réduis la charge et prépare davantage le gainage.',
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
      secondary: ['Biceps', 'Arrière des épaules'],
      stabilizers: ['Lombaires', 'Abdominaux'],
    },
    steps: [
      {
        title: 'Position de départ',
        cue: 'Incline le buste avec le dos neutre et tiens la barre bras tendus.',
      },
      {
        title: 'Tirage',
        cue: 'Tire les coudes vers l’arrière en amenant la barre vers le bas du buste.',
      },
      {
        title: 'Retour',
        cue: 'Redescends la barre lentement sans modifier la position du tronc.',
      },
    ],
    coachTips: [
      'Garde le buste stable.',
      'Tire avec les coudes.',
      'Évite de donner de l’élan avec les hanches.',
    ],
    mistakes: [
      {
        title: 'Buste qui se relève',
        correction: 'Réduis la charge et stabilise l’angle du torse.',
      },
      {
        title: 'Élan excessif',
        correction: 'Contrôle chaque répétition sans balancement.',
      },
    ],
    variants: [
      'Rowing Pendlay',
      'Rowing barre supination',
      'Rowing haltère unilatéral',
    ],
  },

  face_pull: {
    muscles: {
      primary: ['Arrière des épaules'],
      secondary: ['Rhomboïdes', 'Trapèzes'],
      stabilizers: ['Coiffe des rotateurs'],
    },
    steps: [
      {
        title: 'Position de départ',
        cue: 'Place la corde à hauteur du visage et recule pour créer une tension constante.',
      },
      {
        title: 'Tirage',
        cue: 'Tire la corde vers le visage en ouvrant les mains et en guidant les coudes vers l’extérieur.',
      },
      {
        title: 'Retour',
        cue: 'Reviens lentement bras tendus sans laisser les épaules partir vers l’avant.',
      },
    ],
    coachTips: [
      'Utilise une charge modérée.',
      'Garde les épaules basses.',
      'Ouvre la corde vers les côtés du visage.',
    ],
    mistakes: [
      {
        title: 'Charge trop lourde',
        correction: 'Réduis la charge pour conserver la rotation externe.',
      },
      {
        title: 'Coudes trop bas',
        correction: 'Garde les coudes proches de la hauteur des épaules.',
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
      primary: ['Quadriceps'],
      secondary: ['Fessiers', 'Ischio-jambiers'],
      stabilizers: ['Abdominaux'],
    },
    steps: [
      {
        title: 'Position de départ',
        cue: 'Place les pieds de façon stable sur la plateforme et garde le bassin contre le dossier.',
      },
      {
        title: 'Descente',
        cue: 'Fléchis les genoux sous contrôle sans laisser le bassin se décoller.',
      },
      {
        title: 'Poussée',
        cue: 'Pousse la plateforme avec tout le pied sans verrouiller brutalement les genoux.',
      },
    ],
    coachTips: [
      'Garde les talons en contact avec la plateforme.',
      'Contrôle la profondeur.',
      'Ne verrouille pas brutalement les genoux.',
    ],
    mistakes: [
      {
        title: 'Bassin qui se décolle',
        correction: 'Réduis l’amplitude de descente.',
      },
      {
        title: 'Genoux vers l’intérieur',
        correction: 'Garde les genoux alignés avec les pieds.',
      },
    ],
    variants: [
      'Hack Squat',
      'Pendulum Squat',
      'Squat barre arrière',
    ],
  },

  plank: {
    muscles: {
      primary: ['Abdominaux'],
      secondary: ['Obliques'],
      stabilizers: ['Fessiers', 'Épaules', 'Lombaires'],
    },
    steps: [
      {
        title: 'Position de départ',
        cue: 'Place les coudes sous les épaules et tends les jambes derrière toi.',
      },
      {
        title: 'Gainage',
        cue: 'Serre les abdominaux et les fessiers pour aligner épaules, bassin et chevilles.',
      },
      {
        title: 'Maintien',
        cue: 'Respire normalement et conserve la position sans laisser le bassin tomber.',
      },
    ],
    coachTips: [
      'Garde une ligne droite de la tête aux talons.',
      'Serre les fessiers.',
      'Respire pendant tout le maintien.',
    ],
    mistakes: [
      {
        title: 'Bassin trop bas',
        correction: 'Contracte les abdominaux et les fessiers.',
      },
      {
        title: 'Bassin trop haut',
        correction: 'Replace le bassin dans l’alignement des épaules.',
      },
    ],
    variants: [
      'Planche latérale',
      'Dead Bug',
      'Hollow Hold',
    ],
  },
};

function buildExercise(base: CatalogExercise): NoxExercise {
  const defaults = CATEGORY_DEFAULTS[base.category];
  const override = EXERCISE_OVERRIDES[base.id] || {};

  return {
    id: base.id,
    name: base.name,
    category: base.category,
    equipment: base.equipment,

    aliases: Array.from(
      new Set([
        base.name,
        ...(EXTRA_ALIASES[base.id] || []),
      ]),
    ),

    muscles: override.muscles || defaults.muscles,

    steps: override.steps || defaults.steps,

    coachTips: override.coachTips || defaults.coachTips,

    mistakes: override.mistakes || defaults.mistakes,

    variants: override.variants || defaults.variants,

    /*
     * Asset NOX résolu directement depuis l'exercise_id canonique.
     *
     * Chaque exercice possède son fichier :
     * /public/exercises/<exercise_id>.webp
     *
     * On renseigne uniquement thumbnail + position1 pour l'instant.
     * position2/position3 restent volontairement absents afin que
     * hasCompleteNoxDemo() ne déclare pas une fausse démo 3 positions.
     *
     * Un override spécifique peut toujours remplacer ces valeurs plus tard.
     */
    visuals: {
      thumbnail: `/exercises/${base.id}.webp`,
      position1: `/exercises/${base.id}.webp`,
      ...(override.visuals || {}),
    },
  };
}

export const NOX_EXERCISES: NoxExercise[] =
  NOX_GENERATOR_CATALOG.map(buildExercise);

export const NOX_EXERCISES_BY_ID: Record<string, NoxExercise> =
  Object.fromEntries(
    NOX_EXERCISES.map(exercise => [exercise.id, exercise]),
  );

const NOX_EXERCISE_BY_NORMALIZED_NAME = new Map<string, NoxExercise>();

for (const exercise of NOX_EXERCISES) {
  const names = [
    exercise.name,
    ...exercise.aliases,
  ];

  for (const name of names) {
    const normalized = normalizeExerciseText(name);

    if (
      normalized &&
      !NOX_EXERCISE_BY_NORMALIZED_NAME.has(normalized)
    ) {
      NOX_EXERCISE_BY_NORMALIZED_NAME.set(
        normalized,
        exercise,
      );
    }
  }
}

export type NoxExerciseSource = {
  exercise_id?: string | null;
  id?: string | null;
  name?: string | null;
  exercise_name?: string | null;
};

export function getNoxExerciseById(
  id: string | null | undefined,
): NoxExercise | null {
  if (!id) return null;

  const normalized = normalizeExerciseId(id);

  return NOX_EXERCISES_BY_ID[normalized] || null;
}

export function getNoxExerciseByName(
  name: string | null | undefined,
): NoxExercise | null {
  if (!name) return null;

  /*
   * Match EXACT uniquement.
   *
   * Surtout pas de :
   * name.includes('squat')
   *
   * car Goblet Squat ne doit jamais récupérer
   * automatiquement le visuel de Back Squat.
   */
  const normalized = normalizeExerciseText(name);

  return (
    NOX_EXERCISE_BY_NORMALIZED_NAME.get(normalized) ||
    null
  );
}

export function resolveNoxExercise(
  source:
    | NoxExerciseSource
    | string
    | null
    | undefined,
): NoxExercise | null {
  if (!source) return null;

  if (typeof source === 'string') {
    return (
      getNoxExerciseById(source) ||
      getNoxExerciseByName(source)
    );
  }

  /*
   * exercise_id est volontairement prioritaire.
   */
  const byExerciseId =
    getNoxExerciseById(source.exercise_id);

  if (byExerciseId) {
    return byExerciseId;
  }

  const byId = getNoxExerciseById(source.id);

  if (byId) {
    return byId;
  }

  const name =
    source.name ||
    source.exercise_name;

  return getNoxExerciseByName(name);
}

export function getNoxExerciseThumbnail(
  source:
    | NoxExerciseSource
    | string
    | null
    | undefined,
): string | null {
  const exercise = resolveNoxExercise(source);

  if (!exercise) return null;

  return (
    exercise.visuals.thumbnail ||
    exercise.visuals.position2 ||
    exercise.visuals.position1 ||
    null
  );
}

export function getNoxExerciseMovementImages(
  source:
    | NoxExerciseSource
    | string
    | null
    | undefined,
): string[] {
  const exercise = resolveNoxExercise(source);

  if (!exercise) return [];

  return [
    exercise.visuals.position1,
    exercise.visuals.position2,
    exercise.visuals.position3,
  ].filter((value): value is string => Boolean(value));
}

export function getNoxExerciseAnatomyImage(
  source:
    | NoxExerciseSource
    | string
    | null
    | undefined,
): string | null {
  const exercise = resolveNoxExercise(source);

  return exercise?.visuals.anatomy || null;
}

export function hasCompleteNoxDemo(
  source:
    | NoxExerciseSource
    | string
    | null
    | undefined,
): boolean {
  const exercise = resolveNoxExercise(source);

  if (!exercise) return false;

  return Boolean(
    exercise.visuals.position1 &&
    exercise.visuals.position2 &&
    exercise.visuals.position3,
  );
}

export function getNoxExerciseSteps(
  source:
    | NoxExerciseSource
    | string
    | null
    | undefined,
): [NoxExerciseStep, NoxExerciseStep, NoxExerciseStep] {
  const exercise = resolveNoxExercise(source);

  if (exercise) {
    return exercise.steps;
  }

  return [
    {
      title: 'Position de départ',
      cue: 'Place-toi de façon stable avant de commencer.',
    },
    {
      title: 'Mouvement',
      cue: 'Exécute le mouvement lentement et sous contrôle.',
    },
    {
      title: 'Retour',
      cue: 'Reviens à la position de départ sans perdre la technique.',
    },
  ];
}

export function getNoxExerciseCoachTips(
  source:
    | NoxExerciseSource
    | string
    | null
    | undefined,
): string[] {
  const exercise = resolveNoxExercise(source);

  return exercise?.coachTips || [
    'Privilégie toujours la qualité d’exécution.',
    'Adapte la charge à ton niveau.',
    'Arrête la série si ta technique se dégrade.',
  ];
}

export function getNoxExerciseMistakes(
  source:
    | NoxExerciseSource
    | string
    | null
    | undefined,
): NoxExerciseMistake[] {
  const exercise = resolveNoxExercise(source);

  return exercise?.mistakes || [
    {
      title: 'Technique dégradée',
      correction:
        'Réduis la charge ou l’intensité et retrouve une exécution propre.',
    },
  ];
}

export function getNoxExerciseVariants(
  source:
    | NoxExerciseSource
    | string
    | null
    | undefined,
): string[] {
  const exercise = resolveNoxExercise(source);

  return exercise?.variants || [];
}

export function getNoxExerciseMuscles(
  source:
    | NoxExerciseSource
    | string
    | null
    | undefined,
): NoxExerciseMuscles {
  const exercise = resolveNoxExercise(source);

  return exercise?.muscles || {
    primary: ['Muscles principaux'],
    secondary: [],
    stabilizers: [],
  };
}

export function getNoxExerciseIds(): string[] {
  return NOX_EXERCISES.map(exercise => exercise.id);
}

export function getNoxExerciseGeneratorCatalog(): CatalogExercise[] {
  return NOX_GENERATOR_CATALOG.map(exercise => ({
    ...exercise,
  }));
}

export function getNoxExerciseCount(): number {
  return NOX_EXERCISES.length;
}

export function validateNoxExerciseLibrary(): {
  valid: boolean;
  count: number;
  expected: number;
  duplicateIds: string[];
  missingIds: string[];
} {
  const expected = 152;

  const ids = NOX_EXERCISES.map(
    exercise => exercise.id,
  );

  const duplicateIds = ids.filter(
    (id, index) => ids.indexOf(id) !== index,
  );

  const missingIds =
    NOX_GENERATOR_CATALOG
      .map(exercise => exercise.id)
      .filter(id => !NOX_EXERCISES_BY_ID[id]);

  return {
    valid:
      NOX_EXERCISES.length === expected &&
      duplicateIds.length === 0 &&
      missingIds.length === 0,

    count: NOX_EXERCISES.length,
    expected,
    duplicateIds: Array.from(new Set(duplicateIds)),
    missingIds,
  };
}
