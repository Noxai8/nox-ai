import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';
const DAY_NAMES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTH_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

type CalEvent = {
  date: string;
  type: 'workout' | 'meal' | 'rest' | 'pr' | 'body';
  label: string;
  color: string;
  icon: string;
};

export default function NoxCalendar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<any>(null);

  useEffect(() => { if (user) load(); }, [user, currentMonth]);

  const load = async () => {
    setLoading(true);
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const start = new Date(year, month, 1).toISOString();
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

    const [
      { data: workouts },
      { data: meals },
      { data: prs },
      { data: body },
      { data: prog },
    ] = await Promise.all([
      supabase.from('workouts').select('created_at, program_name, status').eq('user_id', user!.id).gte('created_at', start).lte('created_at', end),
      supabase.from('meal_plans').select('planned_date, meal_type, food_name, logged').eq('user_id', user!.id).gte('planned_date', start.slice(0,10)).lte('planned_date', end.slice(0,10)),
      supabase.from('personal_records').select('created_at, exercise_name, weight').eq('user_id', user!.id).gte('created_at', start).lte('created_at', end),
      supabase.from('body_logs').select('created_at, weight').eq('user_id', user!.id).gte('created_at', start).lte('created_at', end),
      supabase.from('workout_programs').select('*').eq('user_id', user!.id).eq('is_active', true).maybeSingle(),
    ]);

    setProgram(prog);

    const allEvents: CalEvent[] = [];

    // Séances complétées
    (workouts || []).filter(w => w.status === 'completed').forEach(w => {
      allEvents.push({ date: w.created_at.slice(0,10), type: 'workout', label: w.program_name || 'Séance', color: ACCENT, icon: '🏋️' });
    });

    // Repas planifiés
    const mealsByDate: Record<string, number> = {};
    (meals || []).forEach((m: any) => {
      mealsByDate[m.planned_date] = (mealsByDate[m.planned_date] || 0) + 1;
    });
    Object.entries(mealsByDate).forEach(([date, count]) => {
      allEvents.push({ date, type: 'meal', label: `${count} repas planifié${count > 1 ? 's' : ''}`, color: '#4488ff', icon: '🍽️' });
    });

    // PRs
    (prs || []).forEach(p => {
      allEvents.push({ date: p.created_at.slice(0,10), type: 'pr', label: `PR ${p.exercise_name} ${p.weight}kg`, color: '#ffaa00', icon: '🏆' });
    });

    // Pesées
    (body || []).forEach(b => {
      allEvents.push({ date: b.created_at.slice(0,10), type: 'body', label: `${b.weight}kg`, color: '#888', icon: '⚖️' });
    });

    setEvents(allEvents);
    setLoading(false);
  };

  const getDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];
    let dow = first.getDay();
    dow = dow === 0 ? 6 : dow - 1;
    for (let i = 0; i < dow; i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  };

  const days = getDays();
  const today = new Date().toISOString().slice(0,10);

  // Prochaines séances selon programme
  const plannedDays = (() => {
    if (!program?.program_json?.sessions) return new Set<string>();
    const sessions = program.program_json.sessions;
    const dayMap: Record<string, number> = { lun: 1, mar: 2, mer: 3, jeu: 4, ven: 5, sam: 6, dim: 0 };
    const planned = new Set<string>();
    sessions.forEach((s: any) => {
      const dow = Object.entries(dayMap).find(([k]) => s.day?.toLowerCase().startsWith(k));
      if (dow) {
        // Trouver le prochain jour de ce type dans le mois
        for (let d = 1; d <= 31; d++) {
          const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d);
          if (date.getMonth() !== currentMonth.getMonth()) break;
          if (date.getDay() === dow[1]) planned.add(date.toISOString().slice(0,10));
        }
      }
    });
    return planned;
  })();

  const getEventsForDate = (dateStr: string) => events.filter(e => e.date === dateStr);

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  const selectedMeals = selectedDate ? program?.program_json?.sessions?.find((s: any) => {
    const dayMap: Record<string, number> = { lun: 1, mar: 2, mer: 3, jeu: 4, ven: 5, sam: 6, dim: 0 };
    const dow = Object.entries(dayMap).find(([k]) => s.day?.toLowerCase().startsWith(k));
    if (!dow) return false;
    return new Date(selectedDate).getDay() === dow[1];
  }) : null;

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 90 }}>
      <div style={{ padding: '20px 20px 0', borderBottom: '1px solid ' + BORDER }}>
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em' }}>NOX</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 16 }}>CALENDRIER</div>

        {/* Légende */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          {[['🏋️', 'Séance', ACCENT], ['🍽️', 'Repas planifié', '#4488ff'], ['🏆', 'PR', '#ffaa00'], ['📅', 'Programme', '#333']].map(([icon, label, color]) => (
            <div key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 12 }}>{icon}</span>
              <span style={{ fontSize: 10, color: color as string, fontWeight: 700 }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Navigation mois */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth()-1))}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 22, padding: '4px 8px' }}>‹</button>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{MONTH_FR[currentMonth.getMonth()]} {currentMonth.getFullYear()}</div>
          <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth()+1))}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 22, padding: '4px 8px' }}>›</button>
        </div>

        {/* Jours de semaine */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
          {DAY_NAMES.map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 10, color: '#555', fontWeight: 700, padding: '4px 0' }}>{d}</div>
          ))}
        </div>
      </div>

      <div style={{ padding: '8px 16px 0' }}>
        {/* Grille */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 16 }}>
          {days.map((day, i) => {
            if (!day) return <div key={i} />;
            const dateStr = day.toISOString().slice(0,10);
            const dayEvents = getEventsForDate(dateStr);
            const hasWorkout = dayEvents.some(e => e.type === 'workout');
            const hasMeal = dayEvents.some(e => e.type === 'meal');
            const hasPR = dayEvents.some(e => e.type === 'pr');
            const isPlanned = plannedDays.has(dateStr) && !hasWorkout;
            const isToday = dateStr === today;
            const isSelected = dateStr === selectedDate;
            const isPast = day < new Date(new Date().setHours(0,0,0,0));

            return (
              <button key={i} onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                style={{
                  padding: '6px 2px 4px', borderRadius: 10,
                  border: '1px solid ' + (isSelected ? ACCENT : isToday ? ACCENT + '44' : 'transparent'),
                  background: hasWorkout ? ACCENT + '18' : isToday ? '#1a1a1a' : 'transparent',
                  cursor: 'pointer', touchAction: 'manipulation',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                }}>
                <span style={{ fontSize: 12, fontWeight: isToday ? 900 : 500, color: isSelected ? ACCENT : isToday ? '#fff' : isPast && !isPlanned ? '#666' : '#aaa' }}>
                  {day.getDate()}
                </span>
                {/* Dots */}
                <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  {hasWorkout && <div style={{ width: 5, height: 5, borderRadius: '50%', background: ACCENT }} />}
                  {hasMeal && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4488ff' }} />}
                  {hasPR && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ffaa00' }} />}
                  {isPlanned && !hasWorkout && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#333' }} />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Détail jour sélectionné */}
        {selectedDate && (
          <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 12 }}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>

            {selectedEvents.length === 0 && !selectedMeals && (
              <div style={{ color: '#555', fontSize: 13 }}>Aucun événement ce jour</div>
            )}

            {selectedEvents.map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid ' + BORDER }}>
                <span style={{ fontSize: 18 }}>{e.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: e.color, fontWeight: 700 }}>{e.label}</div>
                </div>
              </div>
            ))}

            {selectedMeals && (
              <div style={{ padding: '8px 0', borderBottom: '1px solid ' + BORDER }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>📋</span>
                  <div style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>Séance prévue : {selectedMeals.name}</div>
                </div>
                <button onClick={() => navigate(`/program`)}
                  style={{ marginTop: 8, padding: '6px 12px', background: ACCENT + '22', border: '1px solid ' + ACCENT + '44', borderRadius: 8, color: ACCENT, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  Voir la séance →
                </button>
              </div>
            )}

            {/* Actions rapides */}
            {selectedDate >= today && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => navigate('/program')}
                  style={{ flex: 1, padding: '8px 0', background: ACCENT + '22', border: '1px solid ' + ACCENT + '44', borderRadius: 10, color: ACCENT, fontSize: 11, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>
                  🏋️ Séance
                </button>
                <button onClick={() => navigate('/meal-planner')}
                  style={{ flex: 1, padding: '8px 0', background: '#4488ff22', border: '1px solid #4488ff44', borderRadius: 10, color: '#4488ff', fontSize: 11, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>
                  🍽️ Planifier
                </button>
                <button onClick={() => navigate('/rest-day')}
                  style={{ flex: 1, padding: '8px 0', background: '#1a1a1a', border: '1px solid ' + BORDER, borderRadius: 10, color: '#555', fontSize: 11, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>
                  🌿 Repos
                </button>
              </div>
            )}
          </div>
        )}

        {/* Vue semaine courante */}
        <div style={{ fontSize: 11, color: '#555', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>CETTE SEMAINE</div>
        {(() => {
          const now = new Date();
          const monday = new Date(now);
          monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
          const week = Array.from({length: 7}, (_, i) => {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            return d;
          });
          return (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8 }}>
              {week.map(d => {
                const dateStr = d.toISOString().slice(0,10);
                const dayEvts = getEventsForDate(dateStr);
                const isToday = dateStr === today;
                return (
                  <button key={dateStr} onClick={() => setSelectedDate(dateStr)}
                    style={{ flexShrink: 0, width: 44, background: isToday ? ACCENT + '22' : SURFACE, border: '1px solid ' + (isToday ? ACCENT + '44' : BORDER), borderRadius: 12, padding: '10px 0', textAlign: 'center', cursor: 'pointer', touchAction: 'manipulation' }}>
                    <div style={{ fontSize: 9, color: '#555', marginBottom: 4 }}>{DAY_NAMES[(d.getDay() + 6) % 7]}</div>
                    <div style={{ fontSize: 13, fontWeight: isToday ? 900 : 600, color: isToday ? ACCENT : '#fff' }}>{d.getDate()}</div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 4 }}>
                      {dayEvts.some(e => e.type === 'workout') && <div style={{ width: 4, height: 4, borderRadius: '50%', background: ACCENT }} />}
                      {dayEvts.some(e => e.type === 'meal') && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#4488ff' }} />}
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })()}
      </div>

      <BottomNav active="home" />
    </div>
  );
}
