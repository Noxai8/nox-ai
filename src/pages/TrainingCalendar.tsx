import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const DAY_NAMES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export default function TrainingCalendar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [view, setView] = useState<'month' | 'week'>('month');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [stats, setStats] = useState({ total: 0, thisMonth: 0, streak: 0, avgDuration: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => { if (user) load(); }, [user]);

  const localDateKey = (value: string | Date | null | undefined) => {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const workoutDateKey = (workout: any) =>
    localDateKey(workout?.finished_at || workout?.started_at || workout?.created_at);

  const load = async () => {
    if (!user) return;

    setLoading(true);
    setLoadError('');

    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('started_at', { ascending: false });

      if (error) throw error;

      const rows = data || [];
      setWorkouts(rows);

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonthIndex = now.getMonth();

      const monthWorkouts = rows.filter((workout: any) => {
        const rawDate = workout?.finished_at || workout?.started_at || workout?.created_at;
        if (!rawDate) return false;
        const date = new Date(rawDate);
        return !Number.isNaN(date.getTime())
          && date.getFullYear() === currentYear
          && date.getMonth() === currentMonthIndex;
      });

      const durations = rows
        .map((workout: any) => Number(workout.duration_minutes))
        .filter((duration: number) => Number.isFinite(duration) && duration > 0);

      const avgDuration = durations.length
        ? Math.round(durations.reduce((sum: number, duration: number) => sum + duration, 0) / durations.length)
        : 0;

      const completedDates = new Set(
        rows.map(workoutDateKey).filter(Boolean)
      );

      let streak = 0;
      const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      while (completedDates.has(localDateKey(cursor))) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      }

      setStats({
        total: rows.length,
        thisMonth: monthWorkouts.length,
        streak,
        avgDuration,
      });
    } catch (error: any) {
      console.error('TrainingCalendar load:', error);
      setWorkouts([]);
      setStats({ total: 0, thisMonth: 0, streak: 0, avgDuration: 0 });
      setLoadError(error?.message || 'Impossible de charger les séances.');
    } finally {
      setLoading(false);
    }
  };

  const workoutDates = new Set(workouts.map(workoutDateKey).filter(Boolean));

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];
    // Padding avant (lundi = 0)
    let startDow = firstDay.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1;
    for (let i = 0; i < startDow; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  };

  const days = getDaysInMonth(currentMonth);
  const todayStr = localDateKey(new Date());

  const selectedWorkout = selectedDate
    ? workouts.find(workout => workoutDateKey(workout) === selectedDate)
    : null;

  const selectedDateLabel = selectedDate
    ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';

  const selectedDayWorkouts = selectedDate
    ? workouts.filter((w: any) => workoutDateKey(w) === selectedDate)
    : [];

  const workoutCountByDate = workouts.reduce((acc: Record<string, number>, w: any) => {
    const key = workoutDateKey(w);
    if (key) acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#fff', paddingBottom: 110 }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={() => navigate(-1)} aria-label="Retour" style={{ width: 46, height: 46, borderRadius: 15, border: '1px solid #202020', background: '#141414', color: '#fff', cursor: 'pointer', fontSize: 24 }}>←</button>
            <div>
              <div style={{ fontSize: 12, color: '#777', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 800 }}>Training</div>
              <div style={{ fontSize: 'clamp(28px, 5vw, 46px)', lineHeight: 1, fontWeight: 950, letterSpacing: '-.04em' }}>CALENDRIER</div>
            </div>
          </div>
          <div style={{ display: 'flex', background: '#101010', border: '1px solid #242424', borderRadius: 999, padding: 4 }}>
            <button onClick={() => setView('month')} style={{ border: view === 'month' ? `1px solid ${ACCENT}` : '1px solid transparent', background: 'transparent', color: '#fff', borderRadius: 999, padding: '9px 22px', fontWeight: 800, cursor: 'pointer' }}>Mois</button>
            <button onClick={() => setView('week')} style={{ border: view === 'week' ? `1px solid ${ACCENT}` : '1px solid transparent', background: 'transparent', color: view === 'week' ? '#fff' : '#888', borderRadius: 999, padding: '9px 22px', fontWeight: 800, cursor: 'pointer' }}>Semaine</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', background: '#0f0f0f', border: '1px solid #242424', borderRadius: 20, overflow: 'hidden', marginBottom: 22 }}>
          {[
            { icon: '⌁', label: 'Séances totales', value: stats.total },
            { icon: '▣', label: 'Ce mois', value: stats.thisMonth },
            { icon: '↗', label: 'Streak actuel', value: `${stats.streak}j` },
            { icon: '◷', label: 'Durée moyenne', value: `${stats.avgDuration}min` },
          ].map(({ icon, label, value }, index) => (
            <div key={label} style={{ padding: '20px 18px', display: 'flex', alignItems: 'center', gap: 13, borderRight: index < 3 ? '1px solid #202020' : 'none' }}>
              <div style={{ width: 42, height: 42, borderRadius: 13, background: '#181818', display: 'grid', placeItems: 'center', color: ACCENT, fontSize: 19 }}>{icon}</div>
              <div><div style={{ fontSize: 25, fontWeight: 950, lineHeight: 1 }}>{value}</div><div style={{ marginTop: 6, color: '#777', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>{label}</div></div>
            </div>
          ))}
        </div>

        {loadError && <div style={{ marginBottom: 18, padding: '12px 14px', borderRadius: 12, background: '#2a1111', border: '1px solid #6d2424', color: '#ff9b9b', fontSize: 12 }}>
          <strong>IMPOSSIBLE DE CHARGER LES SÉANCES</strong><div style={{ marginTop: 4 }}>{loadError}</div>
          <button onClick={() => void load()} style={{ marginTop: 10, padding: '8px 12px', borderRadius: 9, border: '1px solid #ff9b9b55', background: 'transparent', color: '#ffb0b0', fontWeight: 800, cursor: 'pointer' }}>RÉESSAYER</button>
        </div>}

        <div style={{ display: 'grid', gridTemplateColumns: selectedDate ? 'minmax(0, 1.55fr) minmax(290px, .8fr)' : '1fr', gap: 20, alignItems: 'start' }}>
          <div>
            <div style={{ background: '#0f0f0f', border: '1px solid #242424', borderRadius: 22, padding: '20px 20px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))} style={{ width: 42, height: 42, borderRadius: 14, border: '1px solid #222', background: '#171717', color: '#fff', cursor: 'pointer', fontSize: 24 }}>‹</button>
                <div style={{ fontSize: 19, fontWeight: 900 }}>{MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}</div>
                <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))} style={{ width: 42, height: 42, borderRadius: 14, border: '1px solid #222', background: '#171717', color: '#fff', cursor: 'pointer', fontSize: 24 }}>›</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 7 }}>
                {DAY_NAMES.map((d, i) => <div key={i} style={{ textAlign: 'center', color: '#777', fontSize: 11, fontWeight: 800, padding: '5px 0' }}>{d}</div>)}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
                {days.map((day, i) => {
                  if (!day) return <div key={i} />;
                  const dateStr = localDateKey(day);
                  const count = workoutCountByDate[dateStr] || 0;
                  const hasWorkout = count > 0;
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;
                  const isFuture = day > new Date();
                  return <button key={i} onClick={() => { if (!isFuture) setSelectedDate(isSelected ? null : dateStr); }} style={{
                    minHeight: 64, padding: '8px 4px', borderRadius: 13,
                    border: isToday ? `2px solid ${ACCENT}` : isSelected ? '2px solid #666' : '1px solid #252525',
                    background: hasWorkout ? '#fff' : isSelected ? '#181818' : 'transparent',
                    color: hasWorkout ? '#080808' : isToday ? ACCENT : isFuture ? '#383838' : '#aaa',
                    cursor: isFuture ? 'default' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 900,
                  }}>
                    <span style={{ fontSize: 14 }}>{day.getDate()}</span>
                    {hasWorkout && <div style={{ display: 'flex', gap: 3, height: 5 }}>{Array.from({ length: Math.min(count, 3) }).map((_, dot) => <span key={dot} style={{ width: 5, height: 5, borderRadius: '50%', background: ACCENT }} />)}</div>}
                  </button>;
                })}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 22px', marginTop: 18, paddingTop: 14, borderTop: '1px solid #1e1e1e' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#777', fontSize: 11 }}><span style={{ width: 16, height: 16, borderRadius: 5, background: '#fff', border: '1px solid #333' }} />Séance effectuée</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#777', fontSize: 11 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: ACCENT }} />Plusieurs séances</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#777', fontSize: 11 }}><span style={{ width: 16, height: 16, borderRadius: 5, border: `2px solid ${ACCENT}` }} />Aujourd'hui</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#777', fontSize: 11 }}><span style={{ width: 16, height: 16, borderRadius: 5, background: '#111', border: '1px solid #333' }} />Aucune activité</div>
              </div>
            </div>

            <div style={{ background: '#0f0f0f', border: '1px solid #242424', borderRadius: 22, padding: 18, marginTop: 18 }}>
              <div style={{ fontSize: 12, color: '#777', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Séances récentes</div>
              {workouts.slice(0, 5).map((w: any) => {
                const date = new Date(w.finished_at || w.started_at || w.created_at);
                return <div key={w.id} style={{ borderTop: '1px solid #1d1d1d', padding: '12px 4px', display: 'grid', gridTemplateColumns: '58px 1fr auto', alignItems: 'center', gap: 12 }}>
                  <div><div style={{ fontSize: 20, fontWeight: 950 }}>{date.getDate()}</div><div style={{ color: '#777', fontSize: 10 }}>{MONTH_NAMES[date.getMonth()]}.</div></div>
                  <div><div style={{ fontSize: 13, fontWeight: 850 }}>{w.name || w.program_name || 'Séance'}</div><div style={{ color: '#777', fontSize: 10, marginTop: 3 }}>{w.sets_completed ? `${w.sets_completed} séries` : 'Séance terminée'}</div></div>
                  <div style={{ color: '#aaa', fontSize: 11 }}>◷ {w.duration_minutes || '—'}min ›</div>
                </div>;
              })}
              {!loading && !loadError && workouts.length === 0 && <div style={{ textAlign: 'center', color: '#555', padding: '22px 0', fontSize: 13 }}>Pas encore de séances complétées</div>}
              {loading && <div style={{ textAlign: 'center', color: '#555', padding: '22px 0', fontSize: 13 }}>Chargement des séances...</div>}
            </div>
          </div>

          {selectedDate && <aside style={{ position: 'sticky', top: 18, background: '#0f0f0f', border: '1px solid #242424', borderRadius: 22, padding: 18 }}>
            <div style={{ fontSize: 17, fontWeight: 950, textTransform: 'capitalize' }}>{selectedDateLabel}</div>
            <div style={{ marginTop: 5, color: '#888', fontSize: 12 }}>{selectedDayWorkouts.length ? `${selectedDayWorkouts.length} séance${selectedDayWorkouts.length > 1 ? 's' : ''}` : 'Aucune séance terminée'}</div>
            {selectedDayWorkouts.length > 0 ? selectedDayWorkouts.map((workout: any) => <div key={workout.id} style={{ marginTop: 18, background: '#171717', borderRadius: 17, padding: 16, border: '1px solid #222' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><div style={{ width: 46, height: 46, borderRadius: 13, background: '#202020', display: 'grid', placeItems: 'center', color: ACCENT, fontSize: 20 }}>⌁</div><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 900 }}>{workout.name || workout.program_name || 'Séance'}</div><div style={{ color: '#888', fontSize: 11, marginTop: 4 }}>Séance terminée</div></div></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 16 }}>
                <div style={{ background: '#121212', borderRadius: 12, padding: 12, textAlign: 'center' }}><div style={{ color: ACCENT }}>◷</div><div style={{ marginTop: 5, fontWeight: 900 }}>{workout.duration_minutes || '—'}min</div><div style={{ color: '#666', fontSize: 9 }}>Durée</div></div>
                <div style={{ background: '#121212', borderRadius: 12, padding: 12, textAlign: 'center' }}><div style={{ color: ACCENT }}>▰</div><div style={{ marginTop: 5, fontWeight: 900 }}>{workout.total_volume ? `${Math.round(workout.total_volume)} kg` : '—'}</div><div style={{ color: '#666', fontSize: 9 }}>Volume</div></div>
              </div>
            </div>) : <div style={{ marginTop: 18, padding: '22px 12px', textAlign: 'center', background: '#151515', borderRadius: 16 }}>
              <div style={{ color: '#777', fontSize: 12 }}>Pas de séance terminée ce jour.</div>
              {new Date(`${selectedDate}T12:00:00`) <= new Date() && <button onClick={() => navigate('/program')} style={{ marginTop: 14, width: '100%', padding: 12, borderRadius: 12, border: 'none', background: ACCENT, color: '#080808', fontWeight: 950, cursor: 'pointer' }}>VOIR MON PROGRAMME →</button>}
            </div>}
          </aside>}
        </div>
      </div>
      <BottomNav active="training" />
    </div>
  );
}
