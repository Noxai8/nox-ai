// ── NOX — Chargement des données de « Ta journée » (utilisé par la clôture) ─
// Mêmes sources que la Home : rien n'est estimé, tout vient des enregistrements du jour.
import { supabase } from '../supabase';
import { todayLocalDate } from '../localDate';
import { HABIT_COLUMNS, type UserHabit } from './habits';
import { isMissionDone, missionMinutes, type DailyMission, type FocusSession } from './focus';
import { generateDailyPriority } from './priorityEngine';
import type { DayPlanInput } from './dayPlan';

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export async function loadDayPlanInput(userId: string, knownPriorityType?: string | null): Promise<DayPlanInput> {
  const today = todayLocalDate();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

  const [
    { data: profile }, { data: program }, { data: targets }, { data: food },
    { data: pulse }, { data: closure }, { data: workoutToday }, { data: lastWorkout },
    { count: movesToday }, { data: mission }, { data: habits }, { data: logs },
  ] = await Promise.all([
    supabase.from('profiles').select('focus_areas, goal_type').eq('id', userId).maybeSingle(),
    supabase.from('workout_programs').select('program_json').eq('user_id', userId).eq('is_active', true).maybeSingle(),
    supabase.from('nutrition_targets').select('calories').eq('user_id', userId).maybeSingle(),
    supabase.from('food_entries').select('calories').eq('user_id', userId).gte('created_at', start).lte('created_at', end),
    supabase.from('daily_pulses').select('sleep_score, energy_score, body_score').eq('user_id', userId).eq('date', today).maybeSingle(),
    supabase.from('daily_closures').select('date').eq('user_id', userId).eq('date', today).maybeSingle(),
    supabase.from('workouts').select('id').eq('user_id', userId).eq('status', 'completed')
      .gte('finished_at', start).lte('finished_at', end).limit(1).maybeSingle(),
    supabase.from('workouts').select('finished_at, session_feedback').eq('user_id', userId).eq('status', 'completed')
      .not('finished_at', 'is', null).order('finished_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('movement_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('date', today),
    supabase.from('daily_missions').select('id, date, title, kind, target_minutes, done_at').eq('user_id', userId).eq('date', today).maybeSingle(),
    supabase.from('user_habits').select(HABIT_COLUMNS).eq('user_id', userId).eq('active', true).order('created_at'),
    supabase.from('habit_logs').select('habit_id, count, source').eq('user_id', userId).eq('date', today),
  ]);

  let sessions: FocusSession[] = [];
  if (mission) {
    const { data } = await supabase.from('focus_sessions')
      .select('id, mission_id, planned_minutes, started_at, ended_at, minutes, distractions').eq('mission_id', (mission as any).id);
    sessions = (data ?? []) as FocusSession[];
  }

  const dayName = DAY_NAMES[now.getDay()].toLowerCase().slice(0, 3);
  const session = ((program as any)?.program_json?.sessions ?? [])
    .find((s: any) => String(s?.day || '').toLowerCase().includes(dayName)) ?? null;

  const m = mission as DailyMission | null;
  const minutes = m ? missionMinutes(sessions, m.id) : 0;
  const focusAreas = ((profile as any)?.focus_areas ?? null) as string[] | null;

  // Type de priorité : celui affiché sur Aujourd'hui s'il est connu, sinon recalculé avec les mêmes règles
  let priorityType = knownPriorityType ?? null;
  if (!priorityType) {
    const days = lastWorkout?.finished_at
      ? Math.max(0, Math.floor((Date.now() - new Date(lastWorkout.finished_at).getTime()) / 86400000)) : null;
    priorityType = generateDailyPriority({
      pulse: pulse ? { sleep_score: Number(pulse.sleep_score), energy_score: Number(pulse.energy_score), body_score: Number(pulse.body_score) } : null,
      profile: { goal_type: (profile as any)?.goal_type ?? null, focus_areas: focusAreas },
      recentActivity: { session_planned_today: !!session && !workoutToday, last_session_feedback: (lastWorkout?.session_feedback as any) ?? null, days_since_last_session: days },
      nutrition: null,
      context: { localDate: today, localHour: now.getHours() },
      mission: m ? { title: m.title, done: isMissionDone(m, minutes), remaining_minutes: m.kind === 'duration' ? Math.max(0, (m.target_minutes ?? 0) - minutes) : null } : null,
    }).type;
  }

  return {
    focusAreas,
    pulseDone: !!pulse,
    closureDone: !!closure,
    priorityType,
    mission: m ? { title: m.title, kind: m.kind, target_minutes: m.target_minutes, minutes, done: isMissionDone(m, minutes) } : null,
    session: session ? { name: session.name } : null,
    movedToday: !!workoutToday || (movesToday ?? 0) > 0,
    caloriesTarget: Number((targets as any)?.calories || 0),
    kcalToday: (food ?? []).reduce((s: number, f: any) => s + Number(f.calories || 0), 0),
    mealsToday: (food ?? []).length,
    habits: (habits ?? []) as UserHabit[],
    todayLogs: ((logs ?? []) as any[]).map(l => ({ habit_id: l.habit_id, count: Number(l.count), source: l.source ?? 'manual' })),
  };
}
