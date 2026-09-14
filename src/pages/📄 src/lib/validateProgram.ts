
export type GeneratedExercise = {
  name: string;
  muscles: string;
  sets: string;
  reps: string;
  rest: string;
  weight_suggestion: string;
  description: string;
  instructions: string;
  order_index: number;
};

export type GeneratedSession = {
  name: string;
  day: string;
  focus: string;
  duration: number;
  exercises: GeneratedExercise[];
};

export type GeneratedProgram = {
  name: string;
  goal: string;
  duration_weeks: number;
  session_length_min: number;
  progression_notes: string;
  nutrition_notes: string;
  sessions: GeneratedSession[];
};

function asText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function extractJson(text: string): unknown {
  const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Le programme généré ne contient pas de JSON valide.');
  }

  try {
    return JSON.parse(clean.slice(start, end + 1));
  } catch {
    throw new Error('Le programme généré contient un JSON invalide.');
  }
}

export function parseAndValidateProgram(
  rawText: string,
  expectedSessions: number,
  fallbackSessionLength: number,
): GeneratedProgram {
  const raw = extractJson(rawText) as Record<string, unknown>;

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Le programme généré est invalide.');
  }

  const name = asText(raw.name);
  const goal = asText(raw.goal);
  const sessionsRaw = Array.isArray(raw.sessions) ? raw.sessions : [];

  if (!name) throw new Error('Le programme généré n’a pas de nom.');
  if (!goal) throw new Error('Le programme généré n’a pas d’objectif.');
  if (sessionsRaw.length !== expectedSessions) {
    throw new Error(`Le programme doit contenir exactement ${expectedSessions} séances.`);
  }

  const sessionLength = Math.min(
    180,
    Math.max(15, Math.round(asNumber(raw.session_length_min, fallbackSessionLength))),
  );

  const sessions = sessionsRaw.map((sessionValue, sessionIndex) => {
    if (!sessionValue || typeof sessionValue !== 'object' || Array.isArray(sessionValue)) {
      throw new Error(`La séance ${sessionIndex + 1} est invalide.`);
    }

    const session = sessionValue as Record<string, unknown>;
    const exercisesRaw = Array.isArray(session.exercises) ? session.exercises : [];

    if (!asText(session.name)) {
      throw new Error(`La séance ${sessionIndex + 1} n’a pas de nom.`);
    }

    if (exercisesRaw.length === 0) {
      throw new Error(`La séance ${sessionIndex + 1} doit contenir au moins un exercice.`);
    }

    const exercises = exercisesRaw.map((exerciseValue, exerciseIndex) => {
      if (!exerciseValue || typeof exerciseValue !== 'object' || Array.isArray(exerciseValue)) {
        throw new Error(`Un exercice de la séance ${sessionIndex + 1} est invalide.`);
      }

      const exercise = exerciseValue as Record<string, unknown>;
      const exerciseName = asText(exercise.name);

      if (!exerciseName) {
        throw new Error(`Un exercice de la séance ${sessionIndex + 1} n’a pas de nom.`);
      }

      const sets = Math.min(10, Math.max(1, Math.round(asNumber(exercise.sets, 3))));

      return {
        name: exerciseName,
        muscles: asText(exercise.muscles),
        sets: String(sets),
        reps: asText(exercise.reps, '8-12'),
        rest: asText(exercise.rest, '90 sec'),
        weight_suggestion: asText(exercise.weight_suggestion),
        description: asText(exercise.description),
        instructions: asText(exercise.instructions),
        order_index: Math.max(1, Math.round(asNumber(exercise.order_index, exerciseIndex + 1))),
      };
    });

    return {
      name: asText(session.name),
      day: asText(session.day),
      focus: asText(session.focus),
      duration: Math.min(180, Math.max(15, Math.round(asNumber(session.duration, sessionLength)))),
      exercises,
    };
  });

  return {
    name,
    goal,
    duration_weeks: Math.min(52, Math.max(1, Math.round(asNumber(raw.duration_weeks, 8)))),
    session_length_min: sessionLength,
    progression_notes: asText(raw.progression_notes),
    nutrition_notes: asText(raw.nutrition_notes),
    sessions,
  };
}
