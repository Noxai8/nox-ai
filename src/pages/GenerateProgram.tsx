import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';

const STEPS = [
  'Analyse de ton profil...',
  'Définition de la stratégie...',
  'Sélection des exercices...',
  'Calcul du volume optimal...',
  'Logique de progression...',
  'Recommandations nutrition...',
  'Finalisation du programme...',
];

const DAY_LABELS: Record<number, string> = {
  1: 'LUN',
  2: 'MAR',
  3: 'MER',
  4: 'JEU',
  5: 'VEN',
  6: 'SAM',
  7: 'DIM',
};



type NoxExercise = {
  id: string;
  name: string;
  category: 'push' | 'pull' | 'legs' | 'core' | 'conditioning';
  equipment: string;
};

const NOX_EXERCISE_LIBRARY: NoxExercise[] = [
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
  { id: 'dumbbell_triceps_extension', name: 'Extension triceps haltère au-dessus de la tête', category: 'push', equipment: 'haltères' },
  { id: 'dumbbell_skull_crusher', name: 'Extension triceps couché haltères', category: 'push', equipment: 'haltères' },
  { id: 'dumbbell_kickback', name: 'Kickback triceps haltère', category: 'push', equipment: 'haltères' },
  { id: 'cable_chest_fly', name: 'Écarté poulie vis-à-vis', category: 'push', equipment: 'poulie' },
  { id: 'high_to_low_cable_fly', name: 'Écarté poulie haute vers basse', category: 'push', equipment: 'poulie' },
  { id: 'low_to_high_cable_fly', name: 'Écarté poulie basse vers haute', category: 'push', equipment: 'poulie' },
  { id: 'cable_lateral_raise', name: 'Élévation latérale poulie', category: 'push', equipment: 'poulie' },
  { id: 'cable_front_raise', name: 'Élévation frontale poulie', category: 'push', equipment: 'poulie' },
  { id: 'rope_triceps_pushdown', name: 'Extension triceps corde', category: 'push', equipment: 'poulie' },
  { id: 'bar_triceps_pushdown', name: 'Extension triceps barre poulie', category: 'push', equipment: 'poulie' },
  { id: 'cable_overhead_triceps_extension', name: 'Extension triceps poulie au-dessus de la tête', category: 'push', equipment: 'poulie' },
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
  { id: 'barbell_bent_over_row', name: 'Rowing barre buste penché', category: 'pull', equipment: 'barre' },
  { id: 'pendlay_row', name: 'Rowing Pendlay', category: 'pull', equipment: 'barre' },
  { id: 'underhand_barbell_row', name: 'Rowing barre supination', category: 'pull', equipment: 'barre' },
  { id: 'barbell_shrug', name: 'Shrugs barre', category: 'pull', equipment: 'barre' },
  { id: 'barbell_curl', name: 'Curl barre', category: 'pull', equipment: 'barre' },
  { id: 'ez_bar_curl', name: 'Curl barre EZ', category: 'pull', equipment: 'barre' },
  { id: 'reverse_barbell_curl', name: 'Curl inversé barre', category: 'pull', equipment: 'barre' },
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
  { id: 'machine_row', name: 'Rowing machine', category: 'pull', equipment: 'machine' },
  { id: 'chest_supported_machine_row', name: 'Rowing machine poitrine appuyée', category: 'pull', equipment: 'machine' },
  { id: 'machine_high_row', name: 'High Row machine', category: 'pull', equipment: 'machine' },
  { id: 'reverse_pec_deck', name: 'Reverse Pec Deck', category: 'pull', equipment: 'machine' },
  { id: 'machine_pullover', name: 'Pull-over machine', category: 'pull', equipment: 'machine' },
  { id: 'preacher_curl_machine', name: 'Curl pupitre machine', category: 'pull', equipment: 'machine' },
  { id: 'assisted_pull_up', name: 'Tractions assistées', category: 'pull', equipment: 'machine' },
  { id: 'pull_up', name: 'Tractions pronation', category: 'pull', equipment: 'poids du corps' },
  { id: 'chin_up', name: 'Tractions supination', category: 'pull', equipment: 'poids du corps' },
  { id: 'neutral_grip_pull_up', name: 'Tractions prise neutre', category: 'pull', equipment: 'poids du corps' },
  { id: 'inverted_row', name: 'Rowing inversé', category: 'pull', equipment: 'poids du corps' },
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
  { id: 'dumbbell_romanian_deadlift', name: 'Soulevé de terre roumain haltères', category: 'legs', equipment: 'haltères' },
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
  { id: 'standing_calf_raise_machine', name: 'Mollets debout machine', category: 'legs', equipment: 'machine' },
  { id: 'seated_calf_raise_machine', name: 'Mollets assis machine', category: 'legs', equipment: 'machine' },
  { id: 'cable_pull_through', name: 'Pull Through poulie', category: 'legs', equipment: 'poulie' },
  { id: 'cable_glute_kickback', name: 'Kickback fessier poulie', category: 'legs', equipment: 'poulie' },
  { id: 'cable_hip_abduction', name: 'Abduction de hanche poulie', category: 'legs', equipment: 'poulie' },
  { id: 'cable_hip_adduction', name: 'Adduction de hanche poulie', category: 'legs', equipment: 'poulie' },
  { id: 'bodyweight_squat', name: 'Squat poids du corps', category: 'legs', equipment: 'poids du corps' },
  { id: 'bodyweight_lunge', name: 'Fentes poids du corps', category: 'legs', equipment: 'poids du corps' },
  { id: 'reverse_lunge', name: 'Fentes arrière poids du corps', category: 'legs', equipment: 'poids du corps' },
  { id: 'walking_lunge', name: 'Fentes marchées poids du corps', category: 'legs', equipment: 'poids du corps' },
  { id: 'step_up', name: 'Step-up', category: 'legs', equipment: 'poids du corps' },
  { id: 'single_leg_glute_bridge', name: 'Glute Bridge une jambe', category: 'legs', equipment: 'poids du corps' },
  { id: 'glute_bridge', name: 'Glute Bridge', category: 'legs', equipment: 'poids du corps' },
  { id: 'single_leg_calf_raise', name: 'Mollets une jambe', category: 'legs', equipment: 'poids du corps' },
  { id: 'wall_sit', name: 'Chaise au mur', category: 'legs', equipment: 'poids du corps' },
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

const NOX_EXERCISE_BY_ID = new Map(NOX_EXERCISE_LIBRARY.map((exercise) => [exercise.id, exercise]));
const NOX_EXERCISE_BY_NAME = new Map(NOX_EXERCISE_LIBRARY.map((exercise) => [exercise.name.toLocaleLowerCase('fr-FR'), exercise]));

const NOX_EXERCISE_CATALOG_FOR_PROMPT = NOX_EXERCISE_LIBRARY
  .map((exercise) => `${exercise.id} | ${exercise.name} | ${exercise.category} | ${exercise.equipment}`)
  .join('\n');

function resolveNoxExercise(exercise: any): NoxExercise | null {
  const id = typeof exercise?.exercise_id === 'string' ? exercise.exercise_id.trim() : '';
  if (id && NOX_EXERCISE_BY_ID.has(id)) return NOX_EXERCISE_BY_ID.get(id)!;

  const name = typeof exercise?.name === 'string' ? exercise.name.trim().toLocaleLowerCase('fr-FR') : '';
  return name ? NOX_EXERCISE_BY_NAME.get(name) || null : null;
}

const VALID_DAY_LABELS = new Set([
  'LUN',
  'MAR',
  'MER',
  'JEU',
  'VEN',
  'SAM',
  'DIM',
]);

function getAvailableDays(profile: any): string[] {
  if (!Array.isArray(profile?.available_days)) {
    return [];
  }

  const days = profile.available_days
    .map((day: unknown) => {
      const numericDay = Number(day);

      if (
        Number.isInteger(numericDay) &&
        numericDay >= 1 &&
        numericDay <= 7
      ) {
        return DAY_LABELS[numericDay];
      }

      if (typeof day === 'string') {
        const normalized = day.trim().toUpperCase();

        if (VALID_DAY_LABELS.has(normalized)) {
          return normalized;
        }
      }

      return null;
    })
    .filter((day: string | null): day is string => Boolean(day));

  return [...new Set(days)];
}

function extractTextFromAnthropicResponse(apiData: any): string {
  const directText =
    apiData?.content?.[0]?.text ||
    apiData?.data?.content?.[0]?.text ||
    apiData?.text;

  if (typeof directText !== 'string' || !directText.trim()) {
    throw new Error('Le serveur a renvoyé une réponse vide.');
  }

  return directText.trim();
}

function extractJsonObject(text: string): any {
  const clean = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');

  if (start === -1) {
    throw new Error('JSON_START_MISSING');
  }

  if (end === -1 || end <= start) {
    throw new Error('JSON_INCOMPLETE');
  }

  const jsonText = clean.slice(start, end + 1);

  try {
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('JSON NOX invalide :', error);
    throw new Error('JSON_PARSE_ERROR');
  }
}

function normalizeAndValidateProgram(
  rawProgram: any,
  sessionCount: number,
  sessionLength: number
) {
  if (
    !rawProgram ||
    typeof rawProgram !== 'object' ||
    Array.isArray(rawProgram)
  ) {
    throw new Error('PROGRAM_INVALID');
  }

  if (!Array.isArray(rawProgram.sessions)) {
    throw new Error('SESSIONS_MISSING');
  }

  if (rawProgram.sessions.length !== sessionCount) {
    throw new Error(
      `SESSION_COUNT:${rawProgram.sessions.length}:${sessionCount}`
    );
  }

  const prog = {
    ...rawProgram,
  };

  prog.name =
    typeof prog.name === 'string' && prog.name.trim()
      ? prog.name.trim()
      : 'PROGRAMME NOX';

  prog.goal =
    typeof prog.goal === 'string' && prog.goal.trim()
      ? prog.goal.trim()
      : 'Progression personnalisée';

  prog.duration_weeks = Number.isFinite(
    Number(prog.duration_weeks)
  )
    ? Math.min(
        12,
        Math.max(4, Number(prog.duration_weeks))
      )
    : 8;

  prog.session_length_min = sessionLength;

  prog.progression_notes =
    typeof prog.progression_notes === 'string'
      ? prog.progression_notes.trim()
      : '';

  prog.nutrition_notes =
    typeof prog.nutrition_notes === 'string'
      ? prog.nutrition_notes.trim()
      : '';

  prog.sessions = prog.sessions.map(
    (session: any, sessionIndex: number) => {
      if (
        !session ||
        typeof session !== 'object' ||
        typeof session.name !== 'string' ||
        !session.name.trim()
      ) {
        throw new Error(
          `SESSION_NAME_MISSING:${sessionIndex + 1}`
        );
      }

      if (
        !Array.isArray(session.exercises) ||
        session.exercises.length < 3
      ) {
        throw new Error(
          `SESSION_EXERCISES_MISSING:${session.name}`
        );
      }

      const normalizedSession = {
        ...session,
        name: session.name.trim(),
        duration:
          Number(session.duration) > 0
            ? Number(session.duration)
            : sessionLength,
      };

      normalizedSession.exercises =
        session.exercises.map(
          (exercise: any, exerciseIndex: number) => {
            if (
              !exercise ||
              typeof exercise !== 'object' ||
              typeof exercise.name !== 'string' ||
              !exercise.name.trim()
            ) {
              throw new Error(
                `EXERCISE_INVALID:${session.name}`
              );
            }

            const sets = Number(exercise.sets);

            if (
              !Number.isFinite(sets) ||
              sets < 1 ||
              sets > 6
            ) {
              throw new Error(
                `SETS_INVALID:${exercise.name}`
              );
            }

            if (
              exercise.reps === undefined ||
              exercise.reps === null ||
              !String(exercise.reps).trim()
            ) {
              throw new Error(
                `REPS_MISSING:${exercise.name}`
              );
            }

            const catalogExercise = resolveNoxExercise(exercise);

            if (!catalogExercise) {
              throw new Error(`EXERCISE_NOT_IN_CATALOG:${exercise.name}`);
            }

            return {
              ...exercise,
              exercise_id: catalogExercise.id,
              name: catalogExercise.name,
              category: catalogExercise.category,
              equipment: catalogExercise.equipment,
              sets: String(sets),
              reps: String(exercise.reps).trim(),
              order_index: exerciseIndex + 1,
            };
          }
        );

      return normalizedSession;
    }
  );

  return prog;
}

function readableGenerationError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : String(error || '');

  if (
    message === 'JSON_INCOMPLETE' ||
    message === 'JSON_PARSE_ERROR' ||
    message === 'JSON_START_MISSING'
  ) {
    return 'La réponse IA était incomplète ou mal formatée.';
  }

  if (message === 'PROGRAM_INVALID') {
    return 'Le programme généré avait une structure invalide.';
  }

  if (message === 'SESSIONS_MISSING') {
    return 'Le programme généré ne contenait pas de séances exploitables.';
  }

  if (message.startsWith('SESSION_COUNT:')) {
    const [, received, expected] = message.split(':');

    return `Le programme contenait ${received} séances au lieu de ${expected}.`;
  }

  if (message.startsWith('SESSION_NAME_MISSING:')) {
    return 'Une séance générée était incomplète.';
  }

  if (message.startsWith('SESSION_EXERCISES_MISSING:')) {
    return 'Une séance générée ne contenait pas assez d’exercices.';
  }

  if (message.startsWith('EXERCISE_INVALID:')) {
    return 'Un exercice généré était invalide.';
  }

  if (message.startsWith('EXERCISE_NOT_IN_CATALOG:')) {
    return 'Un exercice généré ne faisait pas partie du catalogue NOX.';
  }

  if (message.startsWith('SETS_INVALID:')) {
    return 'Un exercice contenait un nombre de séries invalide.';
  }

  if (message.startsWith('REPS_MISSING:')) {
    return 'Un exercice ne contenait pas de répétitions.';
  }

  return message || 'Erreur inconnue';
}

function shouldRetryGeneration(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : String(error || '');

  return (
    message === 'JSON_INCOMPLETE' ||
    message === 'JSON_PARSE_ERROR' ||
    message === 'JSON_START_MISSING' ||
    message === 'PROGRAM_INVALID' ||
    message === 'SESSIONS_MISSING' ||
    message.startsWith('SESSION_COUNT:') ||
    message.startsWith('SESSION_NAME_MISSING:') ||
    message.startsWith('SESSION_EXERCISES_MISSING:') ||
    message.startsWith('EXERCISE_INVALID:') ||
    message.startsWith('EXERCISE_NOT_IN_CATALOG:') ||
    message.startsWith('SETS_INVALID:') ||
    message.startsWith('REPS_MISSING:')
  );
}

export default function GenerateProgram() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<any>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [programName, setProgramName] = useState('');

  useEffect(() => {
    if (!user) return;

    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error: profileError }) => {
        if (profileError) {
          console.error(
            'Erreur chargement profil :',
            profileError
          );

          setError(
            'Impossible de charger ton profil. Réessaie.'
          );

          return;
        }

        if (!data) {
          setError(
            'Ton profil est incomplet. Termine d’abord ton onboarding.'
          );

          return;
        }

        setProfile(data);
      });
  }, [user]);

  useEffect(() => {
    if (!generating) return;

    const interval = setInterval(() => {
      setStepIdx((current) =>
        current < STEPS.length - 1
          ? current + 1
          : current
      );
    }, 1200);

    return () => clearInterval(interval);
  }, [generating]);

  const generate = async () => {
    if (!user || !profile || generating) {
      return;
    }

    const availableDays = getAvailableDays(profile);

    const sessionCount =
      availableDays.length > 0
        ? availableDays.length
        : 4;

    const sessionLength =
      Number(profile?.session_length_min) > 0
        ? Number(profile.session_length_min)
        : 60;

    setGenerating(true);
    setStepIdx(0);
    setError('');

    try {
      let goalType = 'transformation physique';

      try {
        const { data: goalData, error: goalError } =
          await supabase
            .from('goals')
            .select('goal_type')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle();

        if (goalError) {
          console.warn(
            'Objectif NOX non chargé :',
            goalError
          );
        } else if (
          typeof goalData?.goal_type === 'string' &&
          goalData.goal_type.trim()
        ) {
          goalType = goalData.goal_type.trim();
        }
      } catch (goalLoadError) {
        console.warn(
          'Objectif NOX indisponible :',
          goalLoadError
        );
      }

      const basePrompt = `Tu es NOX, un coach IA expert en programmation sportive.

Ta mission est de créer un programme d'entraînement personnalisé, cohérent, progressif et directement exploitable par l'application NOX.

PROFIL UTILISATEUR :
- Objectif : ${goalType}
- Niveau : ${profile?.experience_level || 'débutant'}
- Séances par semaine : ${sessionCount}
- Durée d'une séance : ${sessionLength} minutes
- Jours disponibles : ${
        availableDays.length > 0
          ? availableDays.join(', ')
          : 'LUN, MER, VEN, SAM'
      }
- Équipement : ${profile?.equipment || 'salle complète'}
- Blessures / contraintes : ${profile?.injuries || 'aucune'}
- Poids actuel : ${profile?.starting_weight_kg || '?'} kg
- Activité quotidienne : ${profile?.activity_level || 'modérée'}
- Motivation : ${profile?.motivation || 'améliorer mon physique'}

FORMAT OBLIGATOIRE :

Réponds UNIQUEMENT avec un objet JSON valide.

N'ajoute :
- aucun markdown
- aucune balise \`\`\`
- aucune introduction
- aucune conclusion
- aucun commentaire avant ou après le JSON

Le premier caractère de ta réponse doit être {
Le dernier caractère de ta réponse doit être }

STRUCTURE JSON OBLIGATOIRE :

{
  "name": "Nom du programme",
  "goal": "Description concise de l'objectif et de la stratégie",
  "duration_weeks": 8,
  "session_length_min": ${sessionLength},
  "progression_notes": "Logique de progression claire et exploitable",
  "nutrition_notes": "Recommandations nutrition générales adaptées à l'objectif",
  "sessions": [
    {
      "name": "Nom de la séance",
      "day": "LUN",
      "focus": "Focus principal de la séance",
      "duration": ${sessionLength},
      "exercises": [
        {
          "exercise_id": "ID exact du catalogue NOX",
          "name": "Nom exact du catalogue NOX",
          "muscles": "Muscles ciblés",
          "sets": "3",
          "reps": "8-12",
          "rest": "2 min",
          "weight_suggestion": "Conseil de calibration de charge",
          "description": "Description technique courte",
          "instructions": "Consignes d'exécution précises",
          "order_index": 1
        }
      ]
    }
  ]
}

CATALOGUE NOX OBLIGATOIRE :
Chaque ligne suit le format : exercise_id | nom exact | catégorie | équipement.
Tu dois choisir EXCLUSIVEMENT dans ce catalogue.
Pour chaque exercice, recopie exactement exercise_id et name.
N'invente jamais, ne traduis jamais et ne modifie jamais un nom.
Si le matériel ou une contrainte rend un exercice inadapté, choisis un autre exercice compatible du catalogue.

${NOX_EXERCISE_CATALOG_FOR_PROMPT}

RÈGLES DE PROGRAMMATION :

- Génère exactement ${sessionCount} séances.
- Utilise en priorité les jours disponibles fournis.
- Chaque séance doit contenir entre 3 et 6 exercices.
- Ne répète pas deux fois le même exercise_id dans une même séance.
- Tous les exercise_id et name doivent correspondre exactement au catalogue NOX ci-dessus.
- Adapte la structure au nombre réel de séances.
- Ne force pas automatiquement un split push/pull/legs.
- Choisis la structure la plus pertinente selon l'objectif, le niveau et la fréquence.
- Adapte tous les exercices au matériel disponible.
- Respecte les blessures et contraintes déclarées.
- Place généralement les mouvements les plus techniques et exigeants avant les exercices d'isolation.
- Le volume doit rester récupérable.
- Débutant : privilégie généralement 2 à 3 séries de travail par exercice.
- Intermédiaire : généralement 3 à 4 séries lorsque pertinent.
- Avancé : adapte le volume au besoin réel sans volume inutile.
- Le nombre de séries d'un exercice doit toujours être compris entre 1 et 6.
- Adapte les plages de répétitions à l'exercice et à l'objectif.
- Pour l'hypertrophie, ne limite pas tous les exercices à 8-12 répétitions.
- Pour la force, utilise surtout des répétitions plus basses sur les mouvements principaux et des plages modérées sur les accessoires.
- Pour une perte de gras, la musculation reste prioritaire.
- Ajoute seulement un cardio raisonnable et compatible avec la récupération lorsque pertinent.
- N'impose pas l'échec musculaire sur toutes les séries.
- Si les charges réelles sont inconnues, n'invente jamais de charge arbitraire en kilogrammes.
- Dans ce cas, weight_suggestion doit proposer une calibration permettant de terminer les séries avec environ 2 à 3 répétitions en réserve.
- La première semaine peut servir de calibration.
- progression_notes doit expliquer une double progression.
- Lorsque l'utilisateur atteint le haut de la plage de répétitions sur toutes les séries avec une technique propre et environ 1 à 2 répétitions en réserve, il peut augmenter légèrement la charge.
- Une seule mauvaise séance ne signifie pas stagnation.
- En cas de baisse répétée, vérifier récupération, sommeil, technique et adhérence avant de modifier le programme.
- Explique quand réduire temporairement volume ou intensité en cas de fatigue persistante.
- Les descriptions techniques doivent être courtes, concrètes et sûres.
- Ne garantis aucun résultat physique ni délai.
- nutrition_notes doit rester général.
- N'invente pas une cible calorique précise lorsqu'elle n'est pas connue.

IMPORTANT :
La réponse doit rester suffisamment concise pour que l'objet JSON soit toujours terminé intégralement.`;

      const requestProgram = async (
        attempt: number
      ) => {
        const retryInstruction =
          attempt === 1
            ? ''
            : `

ATTENTION — NOUVELLE TENTATIVE :
La réponse précédente n'était pas exploitable.
Produis à nouveau l'intégralité du programme.
Réponds uniquement en JSON strictement valide.
Réduis la longueur des descriptions si nécessaire.
Ne coupe jamais le JSON.
Vérifie que toutes les accolades et tous les tableaux sont fermés.
Génère exactement ${sessionCount} séances.`;

        const prompt =
          basePrompt + retryInstruction;

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(
            'Impossible de vérifier ta session.'
          );
        }

        if (!session?.access_token) {
          throw new Error(
            'Ta session a expiré. Reconnecte-toi.'
          );
        }

        const response = await fetch(
          'https://zpxrsmnpcyzafawlweyl.supabase.co/functions/v1/generate-program',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              prompt,
            }),
          }
        );

        let apiData: any;

        try {
          apiData = await response.json();
        } catch {
          throw new Error(
            `Réponse serveur illisible (${response.status})`
          );
        }

        if (!response.ok) {
          const serverMessage =
            apiData?.error?.message ||
            (typeof apiData?.error === 'string'
              ? apiData.error
              : '') ||
            `Erreur serveur (${response.status})`;

          throw new Error(serverMessage);
        }

        if (
          apiData?.stop_reason === 'max_tokens'
        ) {
          throw new Error('JSON_INCOMPLETE');
        }

        const text =
          extractTextFromAnthropicResponse(apiData);

        const rawProgram =
          extractJsonObject(text);

        return normalizeAndValidateProgram(
          rawProgram,
          sessionCount,
          sessionLength
        );
      };

      let prog: any = null;
      let generationError: unknown = null;

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          prog = await requestProgram(attempt);
          generationError = null;
          break;
        } catch (attemptError) {
          generationError = attemptError;

          console.warn(
            `Tentative NOX ${attempt}/2 échouée :`,
            attemptError
          );

          if (
            attempt >= 2 ||
            !shouldRetryGeneration(attemptError)
          ) {
            break;
          }

          setStepIdx(1);

          await new Promise((resolve) =>
            setTimeout(resolve, 700)
          );
        }
      }

      if (!prog) {
        throw generationError instanceof Error
          ? generationError
          : new Error(
              'Programme généré non exploitable'
            );
      }

      // Le nouveau programme est sauvegardé AVANT
      // de désactiver l'ancien programme.
      const {
        data: insertedProgram,
        error: insertError,
      } = await supabase
        .from('workout_programs')
        .insert({
          user_id: user.id,
          name: prog.name,
          description: prog.goal,
          goal: prog.goal,
          days_per_week: sessionCount,
          duration_weeks: prog.duration_weeks,
          is_active: true,
          program_json: prog,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (
        insertError ||
        !insertedProgram?.id
      ) {
        throw new Error(
          insertError?.message ||
            'Impossible de sauvegarder le nouveau programme.'
        );
      }

      // Le nouveau programme existe réellement.
      // On peut maintenant désactiver les anciens.
      const { error: deactivateError } =
        await supabase
          .from('workout_programs')
          .update({
            is_active: false,
          })
          .eq('user_id', user.id)
          .neq('id', insertedProgram.id)
          .eq('is_active', true);

      if (deactivateError) {
        console.error(
          'Programme créé mais anciens programmes non désactivés :',
          deactivateError
        );
      }

      setProgramName(prog.name);
      setDone(true);
    } catch (err: any) {
      console.error(
        'Erreur génération NOX :',
        err
      );

      const readable =
        readableGenerationError(err);

      setError(
        `Impossible de générer un programme exploitable : ${readable} Réessaie.`
      );
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (
      !profile ||
      generating ||
      done ||
      error
    ) {
      return;
    }

    const timer = setTimeout(() => {
      void generate();
    }, 800);

    return () => clearTimeout(timer);
  }, [profile, generating, done, error]);

  if (done) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: BG,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 72,
            marginBottom: 24,
          }}
        >
          ⚡
        </div>

        <div
          style={{
            fontSize: 11,
            color: '#555',
            textTransform: 'uppercase',
            letterSpacing: '.15em',
            marginBottom: 12,
          }}
        >
          Prêt
        </div>

        <div
          style={{
            fontSize: 26,
            fontWeight: 900,
            color: '#fff',
            letterSpacing: '-.02em',
            marginBottom: 8,
          }}
        >
          TON PLAN EST PRÊT
        </div>

        <div
          style={{
            fontSize: 15,
            color: ACCENT,
            fontWeight: 700,
            marginBottom: 32,
          }}
        >
          {programName}
        </div>

        <div
          style={{
            fontSize: 14,
            color: '#555',
            marginBottom: 40,
            lineHeight: 1.6,
            maxWidth: 300,
          }}
        >
          Programme structuré avec progression,
          volume et consignes adaptés à ton profil.
        </div>

        <button
          onClick={() => navigate('/program')}
          style={{
            width: '100%',
            maxWidth: 320,
            padding: 18,
            background: ACCENT,
            border: 'none',
            borderRadius: 16,
            color: '#000',
            fontWeight: 900,
            fontSize: 16,
            cursor: 'pointer',
            marginBottom: 12,
          }}
        >
          VOIR MON PROGRAMME →
        </button>

        <button
          onClick={() => navigate('/home')}
          style={{
            background: 'none',
            border: 'none',
            color: '#555',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: BG,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 56,
          marginBottom: 32,
          animation:
            'pulse 1.5s ease-in-out infinite',
        }}
      >
        🧠
      </div>

      <div
        style={{
          fontSize: 11,
          color: '#555',
          textTransform: 'uppercase',
          letterSpacing: '.15em',
          marginBottom: 12,
        }}
      >
        NOX Intelligence
      </div>

      <div
        style={{
          fontSize: 24,
          fontWeight: 900,
          color: '#fff',
          letterSpacing: '-.02em',
          marginBottom: 40,
        }}
      >
        CONSTRUCTION DU PROGRAMME...
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: 320,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginBottom: 48,
        }}
      >
        {STEPS.map((step, i) => (
          <div
            key={step}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              opacity:
                i <= stepIdx ? 1 : 0.2,
              transition: 'opacity .4s',
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background:
                  i < stepIdx
                    ? ACCENT
                    : i === stepIdx
                      ? ACCENT + '44'
                      : '#1a1a1a',
                border:
                  '2px solid ' +
                  (i <= stepIdx
                    ? ACCENT
                    : '#1a1a1a'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all .4s',
              }}
            >
              {i < stepIdx ? (
                <span
                  style={{
                    fontSize: 12,
                  }}
                >
                  ✓
                </span>
              ) : i === stepIdx ? (
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: ACCENT,
                    animation:
                      'pulse 1s infinite',
                  }}
                />
              ) : null}
            </div>

            <div
              style={{
                fontSize: 13,
                color:
                  i === stepIdx
                    ? '#fff'
                    : i < stepIdx
                      ? ACCENT
                      : '#333',
                fontWeight:
                  i === stepIdx
                    ? 700
                    : 400,
                textAlign: 'left',
              }}
            >
              {step}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div
          style={{
            background: '#ff444422',
            border: '1px solid #ff4444',
            borderRadius: 14,
            padding: 16,
            color: '#ff8888',
            fontSize: 13,
            marginBottom: 16,
            maxWidth: 320,
          }}
        >
          {error}

          <button
            onClick={() => void generate()}
            disabled={generating}
            style={{
              display: 'block',
              margin: '12px auto 0',
              padding: '8px 20px',
              background: '#ff4444',
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              fontWeight: 800,
              cursor: generating
                ? 'default'
                : 'pointer',
              opacity: generating
                ? 0.6
                : 1,
            }}
          >
            {generating
              ? 'GÉNÉRATION...'
              : 'RÉESSAYER'}
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }

          50% {
            opacity: .6;
            transform: scale(.95);
          }
        }
      `}</style>
    </div>
  );
}
