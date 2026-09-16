// src/lib/noxExercises.ts

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
  stabilizers?: string[];
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
  aliases: string[];

  category:
    | 'chest'
    | 'back'
    | 'shoulders'
    | 'arms'
    | 'legs'
    | 'glutes'
    | 'core'
    | 'cardio'
    | 'full_body';

  equipment: string[];

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

/* =========================================================
   NORMALISATION
   ========================================================= */

export function normalizeExerciseText(value?: string | null) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeExerciseId(value?: string | null) {
  return normalizeExerciseText(value).replace(/\s+/g, '_');
}

/* =========================================================
   FACTORY
   ========================================================= */

function exercise(
  data: Omit<NoxExercise, 'aliases' | 'visuals'> & {
    aliases?: string[];
    visuals?: NoxExerciseVisuals;
  },
): NoxExercise {
  return {
    ...data,
    aliases: data.aliases || [],
    visuals: data.visuals || {},
  };
}

/* =========================================================
   BIBLIOTHÈQUE NOX
   ========================================================= */

export const NOX_EXERCISES: NoxExercise[] = [

  /* =======================================================
     PECTORAUX
     ======================================================= */

  exercise({
    id: 'barbell_bench_press',
    name: 'Développé couché barre',
    aliases: [
      'developpe couche barre',
      'développé couché',
      'bench press',
      'barbell bench press',
    ],
    category: 'chest',
    equipment: ['Barre', 'Banc'],

    muscles: {
      primary: ['Pectoraux'],
      secondary: ['Triceps', 'Deltoïdes antérieurs'],
      stabilizers: ['Core'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Allonge-toi sur le banc, pieds ancrés au sol et omoplates serrées. Saisis la barre légèrement plus large que les épaules.',
      },
      {
        title: 'Descente',
        cue: 'Descends la barre de façon contrôlée vers le bas des pectoraux en gardant les avant-bras stables.',
      },
      {
        title: 'Position finale',
        cue: 'Pousse la barre vers le haut jusqu’à retrouver la position de départ sans perdre la tension du haut du dos.',
      },
    ],

    coachTips: [
      'Garde les pieds fermement au sol.',
      'Maintiens les omoplates serrées contre le banc.',
      'Contrôle la descente.',
      'Garde les poignets alignés avec les avant-bras.',
      'Expire pendant la poussée.',
    ],

    mistakes: [
      {
        title: 'Coudes trop écartés',
        correction:
          'Garde une trajectoire naturelle des coudes plutôt que de les ouvrir complètement sur les côtés.',
      },
      {
        title: 'Barre rebondie sur la poitrine',
        correction:
          'Ralentis la descente et garde le contrôle au changement de direction.',
      },
      {
        title: 'Épaules qui avancent',
        correction:
          'Maintiens les omoplates rétractées pendant toute la série.',
      },
    ],

    variants: [
      'Développé couché haltères',
      'Développé incliné barre',
      'Développé incliné haltères',
      'Chest press machine',
    ],
  }),

  exercise({
    id: 'dumbbell_bench_press',
    name: 'Développé couché haltères',
    aliases: [
      'developpe couche halteres',
      'dumbbell bench press',
      'db bench press',
    ],
    category: 'chest',
    equipment: ['Haltères', 'Banc'],

    muscles: {
      primary: ['Pectoraux'],
      secondary: ['Triceps', 'Deltoïdes antérieurs'],
      stabilizers: ['Core'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Allonge-toi sur le banc avec un haltère dans chaque main, pieds stables et omoplates serrées.',
      },
      {
        title: 'Descente',
        cue: 'Descends les haltères de chaque côté de la poitrine avec contrôle.',
      },
      {
        title: 'Position finale',
        cue: 'Pousse les haltères vers le haut sans cogner les poids entre eux.',
      },
    ],

    coachTips: [
      'Garde les épaules basses.',
      'Contrôle les deux haltères symétriquement.',
      'Conserve les pieds au sol.',
      'Ne relâche pas les pectoraux en haut.',
    ],

    mistakes: [
      {
        title: 'Amplitude incontrôlée',
        correction:
          'Descends uniquement aussi bas que ta mobilité d’épaule le permet.',
      },
      {
        title: 'Haltères instables',
        correction:
          'Réduis la charge et ralentis le mouvement.',
      },
    ],

    variants: [
      'Développé couché barre',
      'Développé incliné haltères',
      'Chest press machine',
    ],
  }),

  exercise({
    id: 'incline_barbell_bench_press',
    name: 'Développé incliné barre',
    aliases: [
      'developpe incline barre',
      'incline bench press',
      'incline barbell bench press',
    ],
    category: 'chest',
    equipment: ['Barre', 'Banc incliné'],

    muscles: {
      primary: ['Haut des pectoraux'],
      secondary: ['Triceps', 'Deltoïdes antérieurs'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Installe-toi sur un banc légèrement incliné, omoplates serrées et pieds stables.',
      },
      {
        title: 'Descente',
        cue: 'Descends la barre vers le haut de la poitrine avec contrôle.',
      },
      {
        title: 'Position finale',
        cue: 'Pousse la barre vers le haut en conservant le buste stable.',
      },
    ],

    coachTips: [
      'Utilise une inclinaison modérée.',
      'Garde les épaules contre le banc.',
      'Contrôle la descente.',
    ],

    mistakes: [
      {
        title: 'Banc trop vertical',
        correction:
          'Réduis l’inclinaison pour éviter de transformer le mouvement en développé épaules.',
      },
      {
        title: 'Épaules décollées',
        correction:
          'Maintiens les omoplates serrées.',
      },
    ],

    variants: [
      'Développé incliné haltères',
      'Développé couché barre',
    ],
  }),

  exercise({
    id: 'incline_dumbbell_press',
    name: 'Développé incliné haltères',
    aliases: [
      'developpe incline halteres',
      'incline dumbbell press',
      'incline dumbbell bench press',
    ],
    category: 'chest',
    equipment: ['Haltères', 'Banc incliné'],

    muscles: {
      primary: ['Haut des pectoraux'],
      secondary: ['Triceps', 'Deltoïdes antérieurs'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Place les haltères au niveau du haut de la poitrine sur un banc incliné.',
      },
      {
        title: 'Mouvement',
        cue: 'Pousse les haltères vers le haut en conservant les épaules basses.',
      },
      {
        title: 'Position finale',
        cue: 'Redescends lentement jusqu’à retrouver une position confortable.',
      },
    ],

    coachTips: [
      'Garde les omoplates serrées.',
      'Ne cogne pas les haltères en haut.',
      'Contrôle la phase descendante.',
    ],

    mistakes: [
      {
        title: 'Inclinaison excessive',
        correction: 'Utilise une inclinaison modérée.',
      },
      {
        title: 'Charge incontrôlée',
        correction:
          'Réduis le poids pour garder une trajectoire stable.',
      },
    ],

    variants: [
      'Développé incliné barre',
      'Développé couché haltères',
    ],
  }),

  exercise({
    id: 'chest_press_machine',
    name: 'Chest press machine',
    aliases: [
      'presse pectoraux machine',
      'machine chest press',
      'chest press',
    ],
    category: 'chest',
    equipment: ['Machine'],

    muscles: {
      primary: ['Pectoraux'],
      secondary: ['Triceps', 'Deltoïdes antérieurs'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Règle le siège afin que les poignées arrivent approximativement au niveau de la poitrine.',
      },
      {
        title: 'Mouvement',
        cue: 'Pousse les poignées vers l’avant sans décoller le dos du dossier.',
      },
      {
        title: 'Retour',
        cue: 'Ramène lentement les poignées en contrôlant la charge.',
      },
    ],

    coachTips: [
      'Garde le dos contre le dossier.',
      'Évite de hausser les épaules.',
      'Contrôle le retour.',
    ],

    mistakes: [
      {
        title: 'Siège mal réglé',
        correction:
          'Ajuste la hauteur avant de commencer.',
      },
      {
        title: 'Retour trop rapide',
        correction:
          'Freine la charge.',
      },
    ],

    variants: [
      'Développé couché barre',
      'Développé couché haltères',
    ],
  }),

  exercise({
    id: 'cable_fly',
    name: 'Écarté poulie',
    aliases: [
      'ecarte poulie',
      'cable fly',
      'cable chest fly',
      'cable crossover',
    ],
    category: 'chest',
    equipment: ['Poulie'],

    muscles: {
      primary: ['Pectoraux'],
      secondary: ['Deltoïdes antérieurs'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Place-toi entre les poulies, poitrine ouverte et bras légèrement fléchis.',
      },
      {
        title: 'Mouvement',
        cue: 'Ramène les mains devant toi en gardant quasiment le même angle de coude.',
      },
      {
        title: 'Retour',
        cue: 'Ouvre progressivement les bras jusqu’à sentir un étirement contrôlé des pectoraux.',
      },
    ],

    coachTips: [
      'Garde une légère flexion des coudes.',
      'Pense à rapprocher les bras avec les pectoraux.',
      'Évite de transformer le mouvement en développé.',
    ],

    mistakes: [
      {
        title: 'Coudes qui se plient',
        correction:
          'Maintiens un angle de coude presque constant.',
      },
      {
        title: 'Amplitude excessive',
        correction:
          'Arrête l’ouverture avant que l’épaule ne parte vers l’avant.',
      },
    ],

    variants: [
      'Écarté haltères',
      'Pec deck',
    ],
  }),

  exercise({
    id: 'push_up',
    name: 'Pompes',
    aliases: [
      'pompe',
      'push up',
      'push-up',
      'pushups',
    ],
    category: 'chest',
    equipment: ['Poids du corps'],

    muscles: {
      primary: ['Pectoraux'],
      secondary: ['Triceps', 'Deltoïdes antérieurs'],
      stabilizers: ['Core'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Place les mains légèrement plus larges que les épaules et forme une ligne droite de la tête aux talons.',
      },
      {
        title: 'Descente',
        cue: 'Descends le corps en bloc en pliant les coudes.',
      },
      {
        title: 'Retour',
        cue: 'Pousse le sol pour revenir en position haute sans laisser les hanches s’affaisser.',
      },
    ],

    coachTips: [
      'Gaine les abdominaux.',
      'Garde le corps aligné.',
      'Contrôle la descente.',
    ],

    mistakes: [
      {
        title: 'Bassin qui tombe',
        correction:
          'Contracte les abdominaux et les fessiers.',
      },
      {
        title: 'Tête projetée vers l’avant',
        correction:
          'Garde la nuque neutre.',
      },
    ],

    variants: [
      'Pompes inclinées',
      'Pompes genoux',
      'Pompes lestées',
    ],
  }),

  /* =======================================================
     DOS
     ======================================================= */

  exercise({
    id: 'conventional_deadlift',
    name: 'Soulevé de terre conventionnel',
    aliases: [
      'souleve de terre conventionnel',
      'souleve de terre',
      'deadlift',
      'conventional deadlift',
    ],
    category: 'back',
    equipment: ['Barre'],

    muscles: {
      primary: ['Fessiers', 'Ischio-jambiers', 'Dos'],
      secondary: ['Quadriceps', 'Trapèzes'],
      stabilizers: ['Core', 'Avant-bras'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Place la barre au-dessus du milieu du pied, saisis-la et engage le tronc avec le dos neutre.',
      },
      {
        title: 'Montée',
        cue: 'Pousse le sol avec les jambes tout en maintenant la barre proche du corps.',
      },
      {
        title: 'Position finale',
        cue: 'Termine debout avec les hanches et genoux étendus, sans exagérer l’extension lombaire.',
      },
    ],

    coachTips: [
      'Garde la barre proche du corps.',
      'Crée de la tension avant de décoller la barre.',
      'Maintiens le dos neutre.',
      'Pousse le sol plutôt que de tirer uniquement avec le dos.',
    ],

    mistakes: [
      {
        title: 'Dos arrondi',
        correction:
          'Réduis la charge et stabilise le tronc avant chaque répétition.',
      },
      {
        title: 'Barre trop loin',
        correction:
          'Maintiens la barre près des tibias et des cuisses.',
      },
      {
        title: 'Hyperextension en haut',
        correction:
          'Termine simplement debout.',
      },
    ],

    variants: [
      'Soulevé de terre roumain',
      'Soulevé de terre sumo',
      'Trap bar deadlift',
    ],
  }),

  exercise({
    id: 'romanian_deadlift',
    name: 'Soulevé de terre roumain',
    aliases: [
      'souleve de terre roumain',
      'romanian deadlift',
      'rdl',
      'barbell rdl',
    ],
    category: 'legs',
    equipment: ['Barre'],

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
        correction:
          'Garde seulement une légère flexion.',
      },
      {
        title: 'Barre éloignée',
        correction:
          'Fais glisser la barre près des jambes.',
      },
      {
        title: 'Dos arrondi',
        correction:
          'Réduis l’amplitude et garde le tronc verrouillé.',
      },
    ],

    variants: [
      'Soulevé de terre roumain haltères',
      'Soulevé de terre conventionnel',
      'Good morning',
    ],
  }),

  exercise({
    id: 'barbell_bent_over_row',
    name: 'Tirage barre pronation',
    aliases: [
      'tirage barre pronation',
      'rowing barre',
      'barbell row',
      'bent over row',
      'bent-over row',
    ],
    category: 'back',
    equipment: ['Barre'],

    muscles: {
      primary: ['Grand dorsal', 'Rhomboïdes'],
      secondary: ['Trapèzes', 'Biceps'],
      stabilizers: ['Érecteurs du rachis', 'Core'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Incline le buste en gardant le dos neutre et la barre sous les épaules.',
      },
      {
        title: 'Tirage',
        cue: 'Tire la barre vers le bas du ventre en ramenant les coudes vers l’arrière.',
      },
      {
        title: 'Retour',
        cue: 'Redescends la barre sous contrôle sans perdre la position du buste.',
      },
    ],

    coachTips: [
      'Garde le buste stable.',
      'Tire avec les coudes.',
      'Évite de hausser les épaules.',
      'Contrôle la descente.',
    ],

    mistakes: [
      {
        title: 'Buste qui se redresse',
        correction:
          'Réduis la charge et garde l’angle du torse stable.',
      },
      {
        title: 'Élan excessif',
        correction:
          'Utilise une charge contrôlable.',
      },
    ],

    variants: [
      'Rowing haltère unilatéral',
      'Rowing poulie basse',
      'Rowing machine',
    ],
  }),

  exercise({
    id: 'neutral_grip_lat_pulldown',
    name: 'Tirage poulie haute prise neutre',
    aliases: [
      'tirage poulie haute prise neutre',
      'lat pulldown neutral grip',
      'neutral grip lat pulldown',
    ],
    category: 'back',
    equipment: ['Poulie'],

    muscles: {
      primary: ['Grand dorsal'],
      secondary: ['Biceps', 'Rhomboïdes', 'Trapèzes'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Assieds-toi avec le buste haut et saisis la poignée en prise neutre.',
      },
      {
        title: 'Tirage',
        cue: 'Ramène la poignée vers le haut de la poitrine en dirigeant les coudes vers le bas.',
      },
      {
        title: 'Retour',
        cue: 'Remonte progressivement jusqu’à étendre les bras sans perdre le contrôle.',
      },
    ],

    coachTips: [
      'Garde la poitrine ouverte.',
      'Tire avec les coudes.',
      'Évite de balancer le buste.',
    ],

    mistakes: [
      {
        title: 'Trop d’élan',
        correction:
          'Réduis la charge et stabilise le torse.',
      },
      {
        title: 'Épaules remontées',
        correction:
          'Garde les épaules basses pendant le tirage.',
      },
    ],

    variants: [
      'Tirage vertical pronation',
      'Tractions prise neutre',
      'Tirage vertical supination',
    ],
  }),

  exercise({
    id: 'wide_grip_lat_pulldown',
    name: 'Tirage vertical pronation',
    aliases: [
      'tirage vertical pronation',
      'lat pulldown',
      'wide grip lat pulldown',
    ],
    category: 'back',
    equipment: ['Poulie'],

    muscles: {
      primary: ['Grand dorsal'],
      secondary: ['Biceps', 'Rhomboïdes'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Saisis la barre en pronation et garde le buste légèrement incliné.',
      },
      {
        title: 'Tirage',
        cue: 'Descends la barre vers le haut de la poitrine en dirigeant les coudes vers le sol.',
      },
      {
        title: 'Retour',
        cue: 'Laisse les bras remonter progressivement en conservant le contrôle.',
      },
    ],

    coachTips: [
      'Tire vers la poitrine, jamais derrière la nuque.',
      'Évite de balancer le torse.',
      'Contrôle la remontée.',
    ],

    mistakes: [
      {
        title: 'Tirage derrière la tête',
        correction:
          'Ramène la barre devant toi vers le haut de la poitrine.',
      },
      {
        title: 'Amplitude raccourcie',
        correction:
          'Laisse les bras s’étendre de manière contrôlée.',
      },
    ],

    variants: [
      'Tirage poulie haute prise neutre',
      'Tractions',
    ],
  }),

  exercise({
    id: 'seated_cable_row',
    name: 'Rowing poulie basse',
    aliases: [
      'rowing poulie basse',
      'tirage poulie basse',
      'seated cable row',
      'cable row',
    ],
    category: 'back',
    equipment: ['Poulie'],

    muscles: {
      primary: ['Grand dorsal', 'Rhomboïdes'],
      secondary: ['Biceps', 'Trapèzes'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Assieds-toi avec le dos neutre et les bras tendus devant toi.',
      },
      {
        title: 'Tirage',
        cue: 'Ramène la poignée vers le ventre en tirant les coudes vers l’arrière.',
      },
      {
        title: 'Retour',
        cue: 'Étends progressivement les bras sans arrondir excessivement le dos.',
      },
    ],

    coachTips: [
      'Garde le buste stable.',
      'Rapproche les omoplates.',
      'Contrôle le retour.',
    ],

    mistakes: [
      {
        title: 'Balancement du torse',
        correction:
          'Réduis la charge et garde le mouvement centré sur les bras et les omoplates.',
      },
      {
        title: 'Épaules haussées',
        correction:
          'Garde-les basses.',
      },
    ],

    variants: [
      'Tirage barre pronation',
      'Rowing machine',
      'Rowing haltère unilatéral',
    ],
  }),

  exercise({
    id: 'one_arm_dumbbell_row',
    name: 'Rowing haltère unilatéral',
    aliases: [
      'rowing haltere unilateral',
      'rowing un bras',
      'one arm dumbbell row',
      'single arm dumbbell row',
    ],
    category: 'back',
    equipment: ['Haltère', 'Banc'],

    muscles: {
      primary: ['Grand dorsal'],
      secondary: ['Rhomboïdes', 'Biceps', 'Trapèzes'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Stabilise une main sur le banc et garde le dos neutre.',
      },
      {
        title: 'Tirage',
        cue: 'Ramène l’haltère vers la hanche en tirant le coude vers l’arrière.',
      },
      {
        title: 'Retour',
        cue: 'Redescends l’haltère lentement jusqu’à étendre le bras.',
      },
    ],

    coachTips: [
      'Garde les hanches stables.',
      'Tire vers la hanche.',
      'Évite de tourner excessivement le torse.',
    ],

    mistakes: [
      {
        title: 'Rotation excessive',
        correction:
          'Stabilise le bassin et le tronc.',
      },
      {
        title: 'Épaule remontée',
        correction:
          'Éloigne l’épaule de l’oreille.',
      },
    ],

    variants: [
      'Tirage barre pronation',
      'Rowing poulie basse',
    ],
  }),

  exercise({
    id: 'pull_up',
    name: 'Tractions',
    aliases: [
      'traction',
      'tractions pronation',
      'pull up',
      'pull-up',
      'pullups',
    ],
    category: 'back',
    equipment: ['Barre de traction'],

    muscles: {
      primary: ['Grand dorsal'],
      secondary: ['Biceps', 'Rhomboïdes'],
      stabilizers: ['Core'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Suspends-toi à la barre avec le tronc gainé et les épaules contrôlées.',
      },
      {
        title: 'Montée',
        cue: 'Tire les coudes vers le bas pour élever la poitrine vers la barre.',
      },
      {
        title: 'Retour',
        cue: 'Redescends progressivement jusqu’à retrouver les bras étendus.',
      },
    ],

    coachTips: [
      'Évite de te balancer.',
      'Pense à descendre les coudes.',
      'Contrôle toute la descente.',
    ],

    mistakes: [
      {
        title: 'Élan des jambes',
        correction:
          'Gaine davantage et utilise une assistance si nécessaire.',
      },
      {
        title: 'Demi-amplitude',
        correction:
          'Adapte la difficulté pour conserver une amplitude propre.',
      },
    ],

    variants: [
      'Tractions assistées',
      'Tractions prise neutre',
      'Tirage vertical pronation',
    ],
  }),

  exercise({
    id: 'face_pull',
    name: 'Face pull poulie',
    aliases: [
      'face pull',
      'facepull',
      'face pull poulie',
      'rope face pull',
    ],
    category: 'shoulders',
    equipment: ['Poulie', 'Corde'],

    muscles: {
      primary: ['Deltoïdes postérieurs'],
      secondary: [
        'Rhomboïdes',
        'Trapèzes',
        'Rotateurs externes',
      ],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Place la corde approximativement à hauteur du visage et saisis-la avec les deux mains.',
      },
      {
        title: 'Tirage',
        cue: 'Tire la corde vers le visage en ouvrant les mains et en ramenant les coudes vers l’arrière.',
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
        correction:
          'Réduis le poids pour conserver la rotation externe.',
      },
      {
        title: 'Tirage vers la poitrine',
        correction:
          'Dirige la corde vers le visage.',
      },
    ],

    variants: [
      'Oiseau haltères',
      'Reverse pec deck',
    ],
  }),

  /* =======================================================
     ÉPAULES
     ======================================================= */

  exercise({
    id: 'dumbbell_overhead_press',
    name: 'Développé militaire haltères',
    aliases: [
      'developpe militaire halteres',
      'developpe epaule halteres',
      'dumbbell shoulder press',
      'dumbbell overhead press',
      'shoulder press',
    ],
    category: 'shoulders',
    equipment: ['Haltères'],

    muscles: {
      primary: ['Deltoïdes'],
      secondary: ['Triceps'],
      stabilizers: ['Haut du dos', 'Core'],
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
        cue: 'Bras tendus au-dessus de la tête sans exagérer le verrouillage des coudes.',
      },
    ],

    coachTips: [
      'Garde le dos bien droit.',
      'Ne cambre pas excessivement le bas du dos.',
      'Contrôle la descente.',
      'Expire en montant.',
      'Garde un mouvement fluide et contrôlé.',
    ],

    mistakes: [
      {
        title: 'Dos trop cambré',
        correction:
          'Serre les abdominaux et réduis la charge.',
      },
      {
        title: 'Haltères trop éloignés',
        correction:
          'Conserve une trajectoire verticale maîtrisée.',
      },
      {
        title: 'Épaules haussées',
        correction:
          'Contrôle la position des épaules pendant le mouvement.',
      },
    ],

    variants: [
      'Développé militaire barre',
      'Shoulder press machine',
      'Arnold press',
    ],
  }),

  exercise({
    id: 'barbell_overhead_press',
    name: 'Développé militaire barre',
    aliases: [
      'developpe militaire barre',
      'military press',
      'barbell overhead press',
      'overhead press',
      'ohp',
    ],
    category: 'shoulders',
    equipment: ['Barre'],

    muscles: {
      primary: ['Deltoïdes'],
      secondary: ['Triceps'],
      stabilizers: ['Core', 'Haut du dos'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Place la barre devant les épaules, avant-bras stables et tronc gainé.',
      },
      {
        title: 'Montée',
        cue: 'Pousse la barre verticalement au-dessus de la tête.',
      },
      {
        title: 'Retour',
        cue: 'Redescends la barre sous contrôle vers les épaules.',
      },
    ],

    coachTips: [
      'Serre les abdominaux et les fessiers.',
      'Évite de transformer le mouvement en développé incliné debout.',
      'Garde la barre proche du corps.',
    ],

    mistakes: [
      {
        title: 'Hyperextension lombaire',
        correction:
          'Gaine davantage et réduis la charge.',
      },
      {
        title: 'Trajectoire trop éloignée',
        correction:
          'Garde la barre proche du visage pendant la montée.',
      },
    ],

    variants: [
      'Développé militaire haltères',
      'Shoulder press machine',
    ],
  }),

  exercise({
    id: 'dumbbell_lateral_raise',
    name: 'Élévations latérales haltères',
    aliases: [
      'elevations laterales halteres',
      'elevation laterale halteres',
      'lateral raise',
      'dumbbell lateral raise',
    ],
    category: 'shoulders',
    equipment: ['Haltères'],

    muscles: {
      primary: ['Deltoïdes latéraux'],
      secondary: ['Trapèzes'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Tiens les haltères de chaque côté du corps avec les coudes légèrement fléchis.',
      },
      {
        title: 'Montée',
        cue: 'Élève les bras sur les côtés de manière contrôlée.',
      },
      {
        title: 'Retour',
        cue: 'Redescends lentement sans relâcher brutalement la tension.',
      },
    ],

    coachTips: [
      'Utilise une charge modérée.',
      'Mène le mouvement avec les coudes.',
      'Évite de hausser les épaules.',
      'Contrôle la descente.',
    ],

    mistakes: [
      {
        title: 'Élan du corps',
        correction:
          'Réduis la charge et stabilise le buste.',
      },
      {
        title: 'Trapèzes dominants',
        correction:
          'Garde les épaules basses et pense à éloigner les bras.',
      },
    ],

    variants: [
      'Élévation latérale poulie',
      'Élévation latérale machine',
    ],
  }),

  exercise({
    id: 'cable_lateral_raise',
    name: 'Élévation latérale poulie',
    aliases: [
      'elevation laterale poulie',
      'cable lateral raise',
    ],
    category: 'shoulders',
    equipment: ['Poulie'],

    muscles: {
      primary: ['Deltoïdes latéraux'],
      secondary: ['Trapèzes'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Place la poulie basse et saisis la poignée avec le bras opposé.',
      },
      {
        title: 'Montée',
        cue: 'Élève le bras latéralement en conservant le coude légèrement fléchi.',
      },
      {
        title: 'Retour',
        cue: 'Redescends lentement jusqu’à la position initiale.',
      },
    ],

    coachTips: [
      'Garde le torse immobile.',
      'Utilise une charge légère à modérée.',
      'Contrôle toute l’amplitude.',
    ],

    mistakes: [
      {
        title: 'Rotation du buste',
        correction:
          'Stabilise le tronc.',
      },
      {
        title: 'Épaule haussée',
        correction:
          'Garde l’épaule basse.',
      },
    ],

    variants: [
      'Élévations latérales haltères',
      'Élévation latérale machine',
    ],
  }),

  exercise({
    id: 'rear_delt_fly',
    name: 'Oiseau haltères',
    aliases: [
      'oiseau halteres',
      'reverse fly',
      'rear delt fly',
      'bent over reverse fly',
    ],
    category: 'shoulders',
    equipment: ['Haltères'],

    muscles: {
      primary: ['Deltoïdes postérieurs'],
      secondary: ['Rhomboïdes', 'Trapèzes'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Incline le buste avec le dos neutre et laisse les haltères sous les épaules.',
      },
      {
        title: 'Ouverture',
        cue: 'Écarte les bras sur les côtés en gardant une légère flexion des coudes.',
      },
      {
        title: 'Retour',
        cue: 'Redescends lentement les haltères.',
      },
    ],

    coachTips: [
      'Garde le cou détendu.',
      'Utilise une charge légère.',
      'Évite l’élan.',
    ],

    mistakes: [
      {
        title: 'Charge trop lourde',
        correction:
          'Allège pour isoler l’arrière des épaules.',
      },
      {
        title: 'Buste mobile',
        correction:
          'Stabilise le torse.',
      },
    ],

    variants: [
      'Face pull poulie',
      'Reverse pec deck',
    ],
  }),

  /* =======================================================
     BRAS
     ======================================================= */

  exercise({
    id: 'ez_bar_curl',
    name: 'Curl barre EZ',
    aliases: [
      'curl barre ez',
      'ez bar curl',
      'ez-bar curl',
      'curl ez',
    ],
    category: 'arms',
    equipment: ['Barre EZ'],

    muscles: {
      primary: ['Biceps'],
      secondary: ['Brachial', 'Avant-bras'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Tiens la barre devant les cuisses, coudes près du corps et buste droit.',
      },
      {
        title: 'Montée',
        cue: 'Fléchis les coudes pour monter la barre sans avancer les épaules.',
      },
      {
        title: 'Retour',
        cue: 'Redescends lentement jusqu’à presque tendre les bras.',
      },
    ],

    coachTips: [
      'Garde les coudes près du corps.',
      'Évite de balancer le torse.',
      'Contrôle la descente.',
    ],

    mistakes: [
      {
        title: 'Élan du dos',
        correction:
          'Réduis la charge et stabilise le buste.',
      },
      {
        title: 'Coudes qui avancent',
        correction:
          'Garde-les proches des flancs.',
      },
    ],

    variants: [
      'Curl haltères',
      'Curl marteau',
      'Curl pupitre',
    ],
  }),

  exercise({
    id: 'dumbbell_biceps_curl',
    name: 'Curl haltères',
    aliases: [
      'curl halteres',
      'dumbbell curl',
      'dumbbell biceps curl',
    ],
    category: 'arms',
    equipment: ['Haltères'],

    muscles: {
      primary: ['Biceps'],
      secondary: ['Brachial', 'Avant-bras'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Tiens les haltères bras le long du corps et garde les épaules basses.',
      },
      {
        title: 'Montée',
        cue: 'Fléchis les coudes en tournant progressivement les paumes vers le haut.',
      },
      {
        title: 'Retour',
        cue: 'Redescends les haltères lentement.',
      },
    ],

    coachTips: [
      'Garde les coudes fixes.',
      'Contrôle la phase descendante.',
      'Évite de te balancer.',
    ],

    mistakes: [
      {
        title: 'Élan',
        correction:
          'Réduis la charge.',
      },
      {
        title: 'Amplitude incomplète',
        correction:
          'Utilise une amplitude contrôlée adaptée à ton articulation.',
      },
    ],

    variants: [
      'Curl barre EZ',
      'Curl marteau',
    ],
  }),

  exercise({
    id: 'hammer_curl',
    name: 'Curl marteau',
    aliases: [
      'curl marteau',
      'hammer curl',
      'dumbbell hammer curl',
    ],
    category: 'arms',
    equipment: ['Haltères'],

    muscles: {
      primary: ['Brachial', 'Biceps'],
      secondary: ['Avant-bras'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Tiens les haltères avec les paumes face à face.',
      },
      {
        title: 'Montée',
        cue: 'Fléchis les coudes sans tourner les poignets.',
      },
      {
        title: 'Retour',
        cue: 'Redescends lentement jusqu’à la position initiale.',
      },
    ],

    coachTips: [
      'Garde les poignets neutres.',
      'Maintiens les coudes proches du corps.',
      'Évite l’élan.',
    ],

    mistakes: [
      {
        title: 'Poignets cassés',
        correction:
          'Aligne les poignets avec les avant-bras.',
      },
      {
        title: 'Buste qui balance',
        correction:
          'Allège la charge.',
      },
    ],

    variants: [
      'Curl haltères',
      'Curl barre EZ',
    ],
  }),

  exercise({
    id: 'cable_triceps_pushdown',
    name: 'Extension triceps poulie',
    aliases: [
      'extension triceps poulie',
      'triceps pushdown',
      'cable triceps pushdown',
      'pushdown triceps',
    ],
    category: 'arms',
    equipment: ['Poulie'],

    muscles: {
      primary: ['Triceps'],
      secondary: [],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Place les coudes près du corps et saisis la poignée devant toi.',
      },
      {
        title: 'Extension',
        cue: 'Tends les coudes vers le bas sans déplacer les épaules.',
      },
      {
        title: 'Retour',
        cue: 'Remonte la poignée lentement en gardant les coudes fixes.',
      },
    ],

    coachTips: [
      'Garde les coudes immobiles.',
      'Évite de te pencher sur la charge.',
      'Contrôle la remontée.',
    ],

    mistakes: [
      {
        title: 'Coudes qui bougent',
        correction:
          'Fixe les bras contre les flancs.',
      },
      {
        title: 'Élan du torse',
        correction:
          'Réduis la charge.',
      },
    ],

    variants: [
      'Extension triceps corde',
      'Extension triceps au-dessus de la tête',
      'Dips',
    ],
  }),

  exercise({
    id: 'rope_triceps_pushdown',
    name: 'Extension triceps corde',
    aliases: [
      'extension triceps corde',
      'rope pushdown',
      'rope triceps pushdown',
    ],
    category: 'arms',
    equipment: ['Poulie', 'Corde'],

    muscles: {
      primary: ['Triceps'],
      secondary: [],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Saisis la corde avec les coudes près du corps.',
      },
      {
        title: 'Extension',
        cue: 'Tends les bras vers le bas puis écarte légèrement les extrémités de la corde.',
      },
      {
        title: 'Retour',
        cue: 'Remonte progressivement sans déplacer les coudes.',
      },
    ],

    coachTips: [
      'Garde les épaules basses.',
      'Fixe les coudes.',
      'Contrôle le retour.',
    ],

    mistakes: [
      {
        title: 'Coudes écartés',
        correction:
          'Garde-les près du corps.',
      },
      {
        title: 'Charge excessive',
        correction:
          'Allège pour conserver une extension propre.',
      },
    ],

    variants: [
      'Extension triceps poulie',
      'Extension triceps au-dessus de la tête',
    ],
  }),

  exercise({
    id: 'parallel_bar_dip',
    name: 'Dips',
    aliases: [
      'dips',
      'dip',
      'parallel bar dip',
      'dips paralleles',
    ],
    category: 'arms',
    equipment: ['Barres parallèles'],

    muscles: {
      primary: ['Triceps', 'Pectoraux'],
      secondary: ['Deltoïdes antérieurs'],
      stabilizers: ['Core'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Place-toi bras tendus entre les barres et stabilise les épaules.',
      },
      {
        title: 'Descente',
        cue: 'Fléchis les coudes et descends de manière contrôlée.',
      },
      {
        title: 'Retour',
        cue: 'Pousse sur les barres pour revenir en position haute.',
      },
    ],

    coachTips: [
      'Contrôle la profondeur.',
      'Garde les épaules stables.',
      'Évite l’élan.',
    ],

    mistakes: [
      {
        title: 'Descente excessive',
        correction:
          'Limite l’amplitude à une zone confortable pour les épaules.',
      },
      {
        title: 'Épaules remontées',
        correction:
          'Garde-les contrôlées et éloignées des oreilles.',
      },
    ],

    variants: [
      'Dips assistés',
      'Extension triceps poulie',
      'Pompes serrées',
    ],
  }),

  /* =======================================================
     JAMBES
     ======================================================= */

  exercise({
    id: 'barbell_back_squat',
    name: 'Squat barre',
    aliases: [
      'squat barre',
      'back squat',
      'barbell squat',
      'barbell back squat',
    ],
    category: 'legs',
    equipment: ['Barre', 'Rack'],

    muscles: {
      primary: ['Quadriceps', 'Fessiers'],
      secondary: ['Ischio-jambiers'],
      stabilizers: ['Core', 'Érecteurs du rachis'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Place la barre de façon stable sur le haut du dos, pieds ancrés au sol et tronc gainé.',
      },
      {
        title: 'Descente',
        cue: 'Fléchis les genoux et les hanches en gardant le contrôle du bassin et du tronc.',
      },
      {
        title: 'Retour',
        cue: 'Pousse le sol pour remonter en gardant les genoux alignés avec les pieds.',
      },
    ],

    coachTips: [
      'Garde le pied entier en contact avec le sol.',
      'Gaine avant chaque répétition.',
      'Suis la direction des orteils avec les genoux.',
      'Contrôle la descente.',
    ],

    mistakes: [
      {
        title: 'Genoux qui rentrent',
        correction:
          'Maintiens les genoux dans l’axe des pieds.',
      },
      {
        title: 'Talons qui décollent',
        correction:
          'Travaille ta position et adapte l’amplitude.',
      },
      {
        title: 'Perte de gainage',
        correction:
          'Réduis la charge et verrouille le tronc avant de descendre.',
      },
    ],

    variants: [
      'Squat gobelet kettlebell',
      'Front squat',
      'Hack squat',
      'Presse à cuisses',
    ],
  }),

  exercise({
    id: 'goblet_squat_kettlebell',
    name: 'Squat gobelet kettlebell',
    aliases: [
      'squat gobelet kettlebell',
      'goblet squat kettlebell',
      'kettlebell goblet squat',
      'kettlebell_goblet_squat',
    ],
    category: 'legs',
    equipment: ['Kettlebell'],

    muscles: {
      primary: ['Quadriceps', 'Fessiers'],
      secondary: ['Ischio-jambiers'],
      stabilizers: ['Core'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Tiens la kettlebell contre la poitrine, pieds stables et buste haut.',
      },
      {
        title: 'Descente',
        cue: 'Descends entre les hanches en gardant la kettlebell proche du torse.',
      },
      {
        title: 'Retour',
        cue: 'Pousse le sol et tends les jambes pour revenir debout.',
      },
    ],

    coachTips: [
      'Garde la kettlebell contre la poitrine.',
      'Maintiens le buste haut.',
      'Garde les genoux dans l’axe des pieds.',
      'Contrôle la descente.',
      'Gaine les abdominaux.',
    ],

    mistakes: [
      {
        title: 'Kettlebell éloignée du corps',
        correction:
          'Maintiens-la proche du sternum.',
      },
      {
        title: 'Genoux qui rentrent',
        correction:
          'Pousse légèrement les genoux vers l’extérieur.',
      },
      {
        title: 'Dos arrondi',
        correction:
          'Réduis l’amplitude et garde la poitrine haute.',
      },
    ],

    variants: [
      'Squat barre',
      'Goblet squat haltère',
      'Front squat',
    ],
  }),

  exercise({
    id: 'front_squat',
    name: 'Front squat',
    aliases: [
      'front squat',
      'squat avant',
      'squat barre avant',
    ],
    category: 'legs',
    equipment: ['Barre', 'Rack'],

    muscles: {
      primary: ['Quadriceps'],
      secondary: ['Fessiers', 'Ischio-jambiers'],
      stabilizers: ['Core', 'Haut du dos'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Place la barre sur l’avant des épaules avec les coudes hauts.',
      },
      {
        title: 'Descente',
        cue: 'Descends en gardant le torse aussi vertical que possible.',
      },
      {
        title: 'Retour',
        cue: 'Pousse le sol pour remonter sans laisser tomber les coudes.',
      },
    ],

    coachTips: [
      'Garde les coudes hauts.',
      'Gaine fortement le tronc.',
      'Maintiens les pieds ancrés.',
    ],

    mistakes: [
      {
        title: 'Coudes qui tombent',
        correction:
          'Réduis la charge et garde la poitrine haute.',
      },
      {
        title: 'Talons décollés',
        correction:
          'Adapte la position des pieds et l’amplitude.',
      },
    ],

    variants: [
      'Squat barre',
      'Squat gobelet kettlebell',
    ],
  }),

  exercise({
    id: 'leg_press',
    name: 'Presse à cuisses',
    aliases: [
      'presse a cuisses',
      'leg press',
      '45 degree leg press',
    ],
    category: 'legs',
    equipment: ['Machine'],

    muscles: {
      primary: ['Quadriceps', 'Fessiers'],
      secondary: ['Ischio-jambiers'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Place les pieds sur la plateforme et garde le bassin en contact avec le dossier.',
      },
      {
        title: 'Descente',
        cue: 'Fléchis les genoux de manière contrôlée sans laisser le bassin s’enrouler.',
      },
      {
        title: 'Retour',
        cue: 'Pousse la plateforme en gardant les genoux alignés avec les pieds.',
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
        correction:
          'Réduis la profondeur.',
      },
      {
        title: 'Genoux qui rentrent',
        correction:
          'Maintiens-les dans l’axe des pieds.',
      },
    ],

    variants: [
      'Squat barre',
      'Hack squat',
      'Squat gobelet kettlebell',
    ],
  }),

  exercise({
    id: 'hack_squat',
    name: 'Hack squat',
    aliases: [
      'hack squat',
      'machine hack squat',
    ],
    category: 'legs',
    equipment: ['Machine'],

    muscles: {
      primary: ['Quadriceps'],
      secondary: ['Fessiers', 'Ischio-jambiers'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Place le dos contre le support et positionne les pieds de manière stable sur la plateforme.',
      },
      {
        title: 'Descente',
        cue: 'Fléchis les genoux en gardant le dos contre le dossier.',
      },
      {
        title: 'Retour',
        cue: 'Pousse la plateforme pour revenir en position haute.',
      },
    ],

    coachTips: [
      'Garde les genoux alignés.',
      'Contrôle la profondeur.',
      'Maintiens le dos contre le support.',
    ],

    mistakes: [
      {
        title: 'Genoux qui rentrent',
        correction:
          'Maintiens leur trajectoire dans l’axe des pieds.',
      },
      {
        title: 'Descente incontrôlée',
        correction:
          'Ralentis la phase excentrique.',
      },
    ],

    variants: [
      'Squat barre',
      'Presse à cuisses',
    ],
  }),

  exercise({
    id: 'leg_extension',
    name: 'Leg extension',
    aliases: [
      'leg extension',
      'extension quadriceps machine',
      'extension jambes machine',
    ],
    category: 'legs',
    equipment: ['Machine'],

    muscles: {
      primary: ['Quadriceps'],
      secondary: [],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Règle la machine afin que l’axe du genou corresponde à celui de la machine.',
      },
      {
        title: 'Extension',
        cue: 'Tends les genoux de façon contrôlée.',
      },
      {
        title: 'Retour',
        cue: 'Redescends progressivement la charge.',
      },
    ],

    coachTips: [
      'Règle correctement le siège.',
      'Évite l’élan.',
      'Contrôle la descente.',
    ],

    mistakes: [
      {
        title: 'Machine mal réglée',
        correction:
          'Aligne correctement l’articulation du genou.',
      },
      {
        title: 'Charge projetée',
        correction:
          'Réduis le poids et ralentis.',
      },
    ],

    variants: [
      'Presse à cuisses',
      'Squat barre',
    ],
  }),

  exercise({
    id: 'seated_leg_curl',
    name: 'Leg curl assis',
    aliases: [
      'leg curl assis',
      'seated leg curl',
      'curl ischio assis',
    ],
    category: 'legs',
    equipment: ['Machine'],

    muscles: {
      primary: ['Ischio-jambiers'],
      secondary: ['Mollets'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Règle le siège et cale correctement les jambes.',
      },
      {
        title: 'Flexion',
        cue: 'Ramène les talons vers le bas et l’arrière en contractant les ischio-jambiers.',
      },
      {
        title: 'Retour',
        cue: 'Reviens lentement à la position initiale.',
      },
    ],

    coachTips: [
      'Garde le bassin stable.',
      'Contrôle la remontée.',
      'Évite l’élan.',
    ],

    mistakes: [
      {
        title: 'Bassin qui bouge',
        correction:
          'Stabilise-toi contre le dossier.',
      },
      {
        title: 'Retour trop rapide',
        correction:
          'Freine la charge.',
      },
    ],

    variants: [
      'Leg curl allongé',
      'Soulevé de terre roumain',
    ],
  }),

  exercise({
    id: 'lying_leg_curl',
    name: 'Leg curl allongé',
    aliases: [
      'leg curl allonge',
      'lying leg curl',
      'prone leg curl',
    ],
    category: 'legs',
    equipment: ['Machine'],

    muscles: {
      primary: ['Ischio-jambiers'],
      secondary: ['Mollets'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Allonge-toi sur la machine avec les genoux alignés sur son axe.',
      },
      {
        title: 'Flexion',
        cue: 'Ramène les talons vers les fessiers sans décoller les hanches.',
      },
      {
        title: 'Retour',
        cue: 'Redescends lentement les jambes.',
      },
    ],

    coachTips: [
      'Garde les hanches contre le support.',
      'Contrôle la descente.',
      'Évite de cambrer le dos.',
    ],

    mistakes: [
      {
        title: 'Hanches décollées',
        correction:
          'Réduis la charge.',
      },
      {
        title: 'Élan',
        correction:
          'Ralentis le mouvement.',
      },
    ],

    variants: [
      'Leg curl assis',
      'Soulevé de terre roumain',
    ],
  }),

  exercise({
    id: 'barbell_hip_thrust',
    name: 'Hip thrust barre',
    aliases: [
      'hip thrust barre',
      'barbell hip thrust',
      'hip thrust',
    ],
    category: 'glutes',
    equipment: ['Barre', 'Banc'],

    muscles: {
      primary: ['Fessiers'],
      secondary: ['Ischio-jambiers'],
      stabilizers: ['Core'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Place le haut du dos contre le banc et la barre au niveau du bassin.',
      },
      {
        title: 'Montée',
        cue: 'Pousse dans les pieds pour élever les hanches.',
      },
      {
        title: 'Position finale',
        cue: 'Contracte les fessiers en haut avec le bassin contrôlé puis redescends lentement.',
      },
    ],

    coachTips: [
      'Pousse avec les talons.',
      'Garde les côtes contrôlées.',
      'Contracte les fessiers en haut.',
      'Évite l’hyperextension lombaire.',
    ],

    mistakes: [
      {
        title: 'Hyperextension du dos',
        correction:
          'Termine le mouvement avec les fessiers plutôt qu’avec les lombaires.',
      },
      {
        title: 'Pieds mal placés',
        correction:
          'Ajuste-les pour obtenir une position stable en haut.',
      },
    ],

    variants: [
      'Glute bridge',
      'Hip thrust machine',
    ],
  }),

  exercise({
    id: 'bulgarian_split_squat',
    name: 'Fentes bulgares',
    aliases: [
      'fentes bulgares',
      'bulgarian split squat',
      'bulgarian squat',
    ],
    category: 'legs',
    equipment: ['Haltères', 'Banc'],

    muscles: {
      primary: ['Quadriceps', 'Fessiers'],
      secondary: ['Ischio-jambiers'],
      stabilizers: ['Core'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Place un pied derrière toi sur le banc et stabilise le pied avant.',
      },
      {
        title: 'Descente',
        cue: 'Descends verticalement en fléchissant la jambe avant.',
      },
      {
        title: 'Retour',
        cue: 'Pousse dans le pied avant pour revenir en position haute.',
      },
    ],

    coachTips: [
      'Garde le pied avant stable.',
      'Contrôle l’équilibre.',
      'Ne pousse pas principalement avec la jambe arrière.',
    ],

    mistakes: [
      {
        title: 'Appui arrière dominant',
        correction:
          'Charge davantage la jambe avant.',
      },
      {
        title: 'Genou instable',
        correction:
          'Maintiens-le dans l’axe du pied.',
      },
    ],

    variants: [
      'Fentes marchées',
      'Split squat',
      'Step-up',
    ],
  }),

  exercise({
    id: 'walking_lunge',
    name: 'Fentes marchées',
    aliases: [
      'fentes marchees',
      'walking lunges',
      'walking lunge',
    ],
    category: 'legs',
    equipment: ['Poids du corps', 'Haltères'],

    muscles: {
      primary: ['Quadriceps', 'Fessiers'],
      secondary: ['Ischio-jambiers'],
      stabilizers: ['Core'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Tiens-toi debout avec le tronc stable.',
      },
      {
        title: 'Fente',
        cue: 'Fais un pas en avant et descends de manière contrôlée.',
      },
      {
        title: 'Transition',
        cue: 'Pousse sur la jambe avant et avance directement dans la répétition suivante.',
      },
    ],

    coachTips: [
      'Garde le buste stable.',
      'Contrôle chaque pas.',
      'Maintiens le genou dans l’axe du pied.',
    ],

    mistakes: [
      {
        title: 'Pas trop court',
        correction:
          'Allonge légèrement la foulée pour garder une position stable.',
      },
      {
        title: 'Perte d’équilibre',
        correction:
          'Réduis la charge ou utilise d’abord le poids du corps.',
      },
    ],

    variants: [
      'Fentes arrière',
      'Fentes bulgares',
    ],
  }),

  exercise({
    id: 'standing_calf_raise',
    name: 'Mollets debout',
    aliases: [
      'mollets debout',
      'standing calf raise',
      'calf raise',
    ],
    category: 'legs',
    equipment: ['Machine'],

    muscles: {
      primary: ['Mollets'],
      secondary: [],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Place l’avant des pieds sur le support et garde les jambes stables.',
      },
      {
        title: 'Montée',
        cue: 'Monte sur la pointe des pieds aussi haut que possible avec contrôle.',
      },
      {
        title: 'Retour',
        cue: 'Redescends progressivement jusqu’à sentir un étirement confortable.',
      },
    ],

    coachTips: [
      'Évite les rebonds.',
      'Marque brièvement la contraction en haut.',
      'Contrôle l’étirement.',
    ],

    mistakes: [
      {
        title: 'Rebonds',
        correction:
          'Ralentis chaque répétition.',
      },
      {
        title: 'Amplitude trop courte',
        correction:
          'Utilise une amplitude complète et contrôlée.',
      },
    ],

    variants: [
      'Mollets assis',
      'Mollets à la presse',
    ],
  }),

  /* =======================================================
     CORE
     ======================================================= */

  exercise({
    id: 'plank',
    name: 'Gainage planche',
    aliases: [
      'gainage',
      'planche',
      'plank',
      'front plank',
    ],
    category: 'core',
    equipment: ['Poids du corps'],

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
        cue: 'Maintiens la position pendant la durée prévue sans laisser le bassin s’affaisser.',
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
        correction:
          'Resserre les abdominaux et les fessiers.',
      },
      {
        title: 'Bassin trop haut',
        correction:
          'Aligne épaules, hanches et talons.',
      },
    ],

    variants: [
      'Planche latérale',
      'Dead bug',
      'Hollow hold',
    ],
  }),

  exercise({
    id: 'side_plank',
    name: 'Planche latérale',
    aliases: [
      'planche laterale',
      'side plank',
    ],
    category: 'core',
    equipment: ['Poids du corps'],

    muscles: {
      primary: ['Obliques'],
      secondary: ['Transverse'],
      stabilizers: ['Fessiers', 'Épaules'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Place le coude sous l’épaule et empile les jambes.',
      },
      {
        title: 'Montée',
        cue: 'Soulève les hanches pour aligner le corps.',
      },
      {
        title: 'Maintien',
        cue: 'Maintiens la position sans laisser les hanches descendre.',
      },
    ],

    coachTips: [
      'Garde l’épaule stable.',
      'Serre les fessiers.',
      'Maintiens le bassin aligné.',
    ],

    mistakes: [
      {
        title: 'Hanches qui tombent',
        correction:
          'Réduis la durée et maintiens une position propre.',
      },
      {
        title: 'Épaule comprimée',
        correction:
          'Pousse activement l’avant-bras dans le sol.',
      },
    ],

    variants: [
      'Gainage planche',
      'Planche latérale genoux',
    ],
  }),

  exercise({
    id: 'dead_bug',
    name: 'Dead bug',
    aliases: [
      'dead bug',
      'deadbug',
    ],
    category: 'core',
    equipment: ['Poids du corps'],

    muscles: {
      primary: ['Abdominaux', 'Transverse'],
      secondary: ['Fléchisseurs de hanche'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Allonge-toi sur le dos, bras vers le plafond et jambes relevées.',
      },
      {
        title: 'Extension',
        cue: 'Éloigne lentement un bras et la jambe opposée en maintenant le tronc stable.',
      },
      {
        title: 'Retour',
        cue: 'Reviens au centre puis alterne de côté.',
      },
    ],

    coachTips: [
      'Garde le bas du dos contrôlé.',
      'Bouge lentement.',
      'Expire pendant l’extension.',
    ],

    mistakes: [
      {
        title: 'Dos qui se creuse',
        correction:
          'Réduis l’amplitude des bras ou des jambes.',
      },
      {
        title: 'Mouvement trop rapide',
        correction:
          'Ralentis et privilégie le contrôle.',
      },
    ],

    variants: [
      'Gainage planche',
      'Bird dog',
    ],
  }),

  exercise({
    id: 'cable_crunch',
    name: 'Crunch poulie',
    aliases: [
      'crunch poulie',
      'cable crunch',
      'kneeling cable crunch',
    ],
    category: 'core',
    equipment: ['Poulie', 'Corde'],

    muscles: {
      primary: ['Grand droit de l’abdomen'],
      secondary: ['Obliques'],
    },

    steps: [
      {
        title: 'Position de départ',
        cue: 'Agenouille-toi devant la poulie et maintiens la corde près de la tête.',
      },
      {
        title: 'Flexion',
        cue: 'Enroule le tronc en rapprochant les côtes du bassin.',
      },
      {
        title: 'Retour',
        cue: 'Reviens progressivement sans laisser la charge te tirer.',
      },
    ],

    coachTips: [
      'Bouge le tronc plutôt que les hanches.',
      'Garde la charge contrôlée.',
      'Expire pendant la flexion.',
    ],

    mistakes: [
      {
        title: 'Tirage avec les bras',
        correction:
          'Garde les bras fixes et concentre le mouvement sur le tronc.',
      },
      {
        title: 'Hanches qui reculent',
        correction:
          'Stabilise le bassin.',
      },
    ],

    variants: [
      'Crunch au sol',
      'Machine abdominale',
    ],
  }),

  /* =======================================================
     CARDIO
     ======================================================= */

  exercise({
    id: 'hiit_bike',
    name: 'Cardio HIIT vélo',
    aliases: [
      'cardio hiit velo',
      'hiit velo',
      'bike hiit',
      'hiit bike',
      'cycling hiit',
    ],
    category: 'cardio',
    equipment: ['Vélo'],

    muscles: {
      primary: ['Quadriceps', 'Fessiers'],
      secondary: ['Ischio-jambiers', 'Mollets'],
      stabilizers: ['Core'],
    },

    steps: [
      {
        title: 'Préparation',
        cue: 'Règle le vélo correctement et commence par un échauffement progressif.',
      },
      {
        title: 'Intervalle',
        cue: 'Accélère fortement pendant la durée prévue en gardant une cadence maîtrisée.',
      },
      {
        title: 'Récupération',
        cue: 'Réduis l’intensité pendant la récupération puis répète les intervalles prévus.',
      },
    ],

    coachTips: [
      'Échauffe-toi avant les intervalles.',
      'Garde une résistance qui permet une cadence contrôlée.',
      'Ne pars pas à intensité maximale dès la première répétition.',
      'Récupère réellement entre les efforts.',
    ],

    mistakes: [
      {
        title: 'Résistance trop faible',
        correction:
          'Ajoute assez de résistance pour éviter de pédaler dans le vide.',
      },
      {
        title: 'Départ trop agressif',
        correction:
          'Gère l’effort pour conserver la qualité sur tous les intervalles.',
      },
    ],

    variants: [
      'Cardio HIIT rameur',
      'Cardio HIIT tapis',
      'Vélo endurance',
    ],
  }),

  exercise({
    id: 'hiit_rower',
    name: 'Cardio HIIT rameur',
    aliases: [
      'cardio hiit rameur',
      'hiit rameur',
      'rowing hiit',
      'rower hiit',
    ],
    category: 'cardio',
    equipment: ['Rameur'],

    muscles: {
      primary: ['Jambes', 'Dos'],
      secondary: ['Bras'],
      stabilizers: ['Core'],
    },

    steps: [
      {
        title: 'Préparation',
        cue: 'Échauffe-toi et installe correctement les pieds dans les sangles.',
      },
      {
        title: 'Intervalle',
        cue: 'Produis un effort intense avec une séquence jambes, tronc puis bras.',
      },
      {
        title: 'Récupération',
        cue: 'Ralentis la cadence et récupère avant l’intervalle suivant.',
      },
    ],

    coachTips: [
      'Pousse d’abord avec les jambes.',
      'Garde une technique propre même à haute intensité.',
      'Contrôle le retour.',
    ],

    mistakes: [
      {
        title: 'Tirer uniquement avec les bras',
        correction:
          'Initie chaque coup avec les jambes.',
      },
      {
        title: 'Dos arrondi',
        correction:
          'Garde le tronc contrôlé.',
      },
    ],

    variants: [
      'Cardio HIIT vélo',
      'Cardio HIIT tapis',
    ],
  }),

  exercise({
    id: 'hiit_treadmill',
    name: 'Cardio HIIT tapis',
    aliases: [
      'cardio hiit tapis',
      'hiit tapis',
      'treadmill hiit',
      'running hiit',
    ],
    category: 'cardio',
    equipment: ['Tapis de course'],

    muscles: {
      primary: ['Quadriceps', 'Fessiers'],
      secondary: ['Ischio-jambiers', 'Mollets'],
      stabilizers: ['Core'],
    },

    steps: [
      {
        title: 'Préparation',
        cue: 'Commence par plusieurs minutes d’échauffement progressif.',
      },
      {
        title: 'Intervalle',
        cue: 'Augmente la vitesse pour l’effort prévu en gardant une foulée maîtrisée.',
      },
      {
        title: 'Récupération',
        cue: 'Réduis la vitesse pour récupérer avant le prochain intervalle.',
      },
    ],

    coachTips: [
      'Augmente progressivement l’intensité.',
      'Garde une foulée naturelle.',
      'Utilise les barres uniquement pour monter ou descendre du tapis si nécessaire.',
    ],

    mistakes: [
      {
        title: 'Vitesse incontrôlable',
        correction:
          'Réduis la vitesse pour garder une foulée propre.',
      },
      {
        title: 'Pas d’échauffement',
        correction:
          'Prévois toujours une phase progressive.',
      },
    ],

    variants: [
      'Cardio HIIT vélo',
      'Cardio HIIT rameur',
    ],
  }),

  exercise({
    id: 'burpee',
    name: 'Burpees',
    aliases: [
      'burpee',
      'burpees',
    ],
    category: 'full_body',
    equipment: ['Poids du corps'],

    muscles: {
      primary: ['Jambes', 'Pectoraux'],
      secondary: ['Triceps', 'Épaules'],
      stabilizers: ['Core'],
    },

    steps: [
      {
        title: 'Position basse',
        cue: 'Place les mains au sol et ramène les jambes en position de planche.',
      },
      {
        title: 'Transition',
        cue: 'Ramène les pieds vers les mains en gardant le mouvement contrôlé.',
      },
      {
        title: 'Retour debout',
        cue: 'Redresse-toi ou effectue un saut selon la variante prévue.',
      },
    ],

    coachTips: [
      'Garde le tronc gainé en position de planche.',
      'Adapte la vitesse à ta technique.',
      'Respire régulièrement.',
    ],

    mistakes: [
      {
        title: 'Bassin qui s’effondre',
        correction:
          'Gaine davantage pendant la position de planche.',
      },
      {
        title: 'Technique sacrifiée pour la vitesse',
        correction:
          'Ralentis le rythme.',
      },
    ],

    variants: [
      'Burpee sans saut',
      'Burpee avec pompe',
    ],
  }),
];

/* =========================================================
   INDEX PAR ID
   ========================================================= */

export const NOX_EXERCISES_BY_ID: Record<string, NoxExercise> =
  Object.fromEntries(
    NOX_EXERCISES.map((item) => [
      normalizeExerciseId(item.id),
      item,
    ]),
  );

/* =========================================================
   INDEX NOMS / ALIASES
   ========================================================= */

const NOX_EXERCISES_BY_ALIAS =
  new Map<string, NoxExercise>();

for (const item of NOX_EXERCISES) {
  const values = [
    item.name,
    item.id,
    ...item.aliases,
  ];

  for (const value of values) {
    const normalized =
      normalizeExerciseText(value);

    if (
      normalized &&
      !NOX_EXERCISES_BY_ALIAS.has(normalized)
    ) {
      NOX_EXERCISES_BY_ALIAS.set(
        normalized,
        item,
      );
    }
  }
}

/* =========================================================
   RÉSOLUTION PAR ID
   ========================================================= */

export function getNoxExerciseById(
  exerciseId?: string | null,
): NoxExercise | null {
  if (!exerciseId) return null;

  return (
    NOX_EXERCISES_BY_ID[
      normalizeExerciseId(exerciseId)
    ] || null
  );
}

/* =========================================================
   RÉSOLUTION PAR NOM
   ========================================================= */

export function getNoxExerciseByName(
  name?: string | null,
): NoxExercise | null {
  if (!name) return null;

  const normalized =
    normalizeExerciseText(name);

  if (!normalized) return null;

  /*
   * D'abord correspondance EXACTE.
   */

  const exact =
    NOX_EXERCISES_BY_ALIAS.get(normalized);

  if (exact) {
    return exact;
  }

  /*
   * Puis fallback prudent.
   *
   * On ne renvoie un résultat que s'il n'existe
   * qu'UNE seule correspondance.
   *
   * Cela évite :
   *
   * "Squat gobelet kettlebell"
   *     ↓
   * "Squat barre"
   *
   * qui était justement l'un de nos bugs.
   */

  if (normalized.length >= 8) {
    const candidates =
      NOX_EXERCISES.filter((item) => {
        const aliases = [
          item.name,
          ...item.aliases,
        ].map(normalizeExerciseText);

        return aliases.some((alias) => {
          if (alias.length < 8) {
            return false;
          }

          return (
            alias === normalized ||
            alias.includes(normalized) ||
            normalized.includes(alias)
          );
        });
      });

    if (candidates.length === 1) {
      return candidates[0];
    }
  }

  return null;
}

/* =========================================================
   RÉSOLUTION PRINCIPALE

   ORDRE IMPORTANT :

   1. exercise_id
   2. id
   3. nom
   4. alias

   L'ID du générateur reste donc prioritaire.
   ========================================================= */

export type NoxExerciseSource = {
  exercise_id?: string | null;
  id?: string | null;
  name?: string | null;
  exercise_name?: string | null;
};

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
    const byId =
      getNoxExerciseById(source);

    if (byId) {
      return byId;
    }

    return getNoxExerciseByName(source);
  }

  const exerciseId =
    source.exercise_id || source.id;

  if (exerciseId) {
    const byId =
      getNoxExerciseById(exerciseId);

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

/*
 * IMPORTANT :
 *
 * Aucun faux visuel.
 *
 * Si l'exercice n'a pas encore ses vrais assets NOX,
 * on renvoie null.
 *
 * Program.tsx et Training.tsx afficheront alors
 * le fallback NOX propre.
 */

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
      ?.visuals.anatomy || null
  );
}

export function hasCompleteNoxDemo(
  source:
    | NoxExerciseSource
    | string
    | null
    | undefined,
): boolean {
  const [one, two, three] =
    getNoxExerciseMovementImages(source);

  return Boolean(
    one &&
    two &&
    three,
  );
}

/* =========================================================
   CONTENU DÉMO NOX
   ========================================================= */

export function getNoxExerciseSteps(
  source:
    | NoxExerciseSource
    | string
    | null
    | undefined,
): NoxExerciseStep[] {
  const item =
    resolveNoxExercise(source);

  if (item) {
    return item.steps;
  }

  return [
    {
      title: 'Position de départ',
      cue: 'Installe-toi dans une position stable et prépare le mouvement.',
    },
    {
      title: 'Mouvement',
      cue: 'Effectue le mouvement avec une amplitude maîtrisée et sans élan.',
    },
    {
      title: 'Retour',
      cue: 'Reviens progressivement à la position initiale en gardant le contrôle.',
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
  const item =
    resolveNoxExercise(source);

  if (item) {
    return item.coachTips;
  }

  return [
    'Privilégie une exécution contrôlée.',
    'Adapte la charge pour conserver une technique propre.',
    'Respire régulièrement pendant le mouvement.',
  ];
}

export function getNoxExerciseMistakes(
  source:
    | NoxExerciseSource
    | string
    | null
    | undefined,
): NoxExerciseMistake[] {
  const item =
    resolveNoxExercise(source);

  if (item) {
    return item.mistakes;
  }

  return [
    {
      title: 'Mouvement trop rapide',
      correction:
        'Ralentis pour conserver le contrôle de chaque répétition.',
    },
    {
      title: 'Charge excessive',
      correction:
        'Réduis la charge si ta technique se dégrade.',
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
   HELPERS
   ========================================================= */

export function getNoxExerciseIds(): string[] {
  return NOX_EXERCISES.map(
    (item) => item.id,
  );
}

export function getNoxExerciseGeneratorCatalog() {
  return NOX_EXERCISES.map(
    (item) => ({
      exercise_id: item.id,
      name: item.name,
      category: item.category,
      equipment: item.equipment,
      primary_muscles:
        item.muscles.primary,
    }),
  );
}

/* =========================================================
   VALIDATION DE LA BIBLIOTHÈQUE
   ========================================================= */

export function validateNoxExerciseLibrary() {
  const ids =
    new Set<string>();

  const duplicateIds: string[] = [];

  for (const item of NOX_EXERCISES) {
    const id =
      normalizeExerciseId(item.id);

    if (ids.has(id)) {
      duplicateIds.push(item.id);
    }

    ids.add(id);
  }

  return {
    valid:
      duplicateIds.length === 0,

    count:
      NOX_EXERCISES.length,

    duplicateIds,
  };
}
