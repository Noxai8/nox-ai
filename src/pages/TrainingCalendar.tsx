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

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    const { data } = await supabase.from('workouts').select('*')
      .eq('user_id', user!.id).eq('status', 'completed')
      .order('created_at', { ascending: false });
    setWorkouts(data || []);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthWorkouts = (data || []).filter(w => w.created_at >= monthStart);
    const avgDur = (data || []).reduce((s: number, w: any) => s + (w.duration_minutes || 0), 0) / Math.max((data || []).length, 1);

    // Calculer streak
    const dates = new Set((data || []).map((w: any) => w.created_at?.slice(0, 10)));
    let streak = 0;
    const cursor = new Date();
    while (dates.has(cursor.toISOString().slice(0, 10))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    setStats({ total: (data || []).length, thisMonth: monthWorkouts.length, streak, avgDuration: Math.round(avgDur) });
  };

  const getWorkoutDates = () => new Set(workouts.map(w => w.created_at?.slice(0, 10)));
  const workoutDates = getWorkoutDates();

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
  const todayStr = new Date().toISOString().slice(0, 10);

  const selectedWorkout = selectedDate ? workouts.find(w => w.created_at?.slice(0, 10) === selectedDate) : null;

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 90 }}>
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid ' + BORDER }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 22, marginBottom: 12, display: 'block' }}>←</button>
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em' }}>Training</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>CALENDRIER</div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, borderBottom: '1px solid ' + BORDER }}>
        {[
          { label: 'Total', value: stats.total },
          { label: 'Ce mois', value: stats.thisMonth },
          { label: 'Streak', value: stats.streak + 'j' },
          { label: 'Moy.', value: stats.avgDuration + 'min' },
        ].map(({ label, value }) => (
          <div key={label} style={{ padding: '14px 0', textAlign: 'center', borderRight: '1px solid ' + BORDER }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: ACCENT }}>{value}</div>
            <div style={{ fontSize: 10, color: '#555', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '16px 20px 0' }}>
        {/* Navigation mois */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 20, padding: '4px 8px' }}>‹</button>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>
            {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </div>
          <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 20, padding: '4px 8px' }}>›</button>
        </div>

        {/* Jours de semaine */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
          {DAY_NAMES.map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 10, color: '#555', fontWeight: 700, padding: '4px 0' }}>{d}</div>
          ))}
        </div>

        {/* Grille calendrier */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {days.map((day, i) => {
            if (!day) return <div key={i} />;
            const dateStr = day.toISOString().slice(0, 10);
            const hasWorkout = workoutDates.has(dateStr);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const isFuture = day > new Date();
            return (
              <button key={i} onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                style={{
                  padding: '8px 0', borderRadius: 10, border: '1px solid ' + (isSelected ? ACCENT : isToday ? ACCENT + '44' : BORDER),
                  background: hasWorkout ? ACCENT + '22' : isToday ? '#1a1a1a' : 'transparent',
                  cursor: isFuture ? 'default' : 'pointer', touchAction: 'manipulation',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                }}>
                <span style={{ fontSize: 13, fontWeight: isToday ? 900 : 600, color: isSelected ? ACCENT : isToday ? '#fff' : isFuture ? '#333' : '#888' }}>
                  {day.getDate()}
                </span>
                {hasWorkout && <div style={{ width: 5, height: 5, borderRadius: '50%', background: ACCENT }} />}
              </button>
            );
          })}
        </div>

        {/* Détail séance sélectionnée */}
        {selectedDate && (
          <div style={{ marginTop: 20, background: SURFACE, border: '1px solid ' + (selectedWorkout ? ACCENT + '33' : BORDER), borderRadius: 16, padding: 18 }}>
            {selectedWorkout ? (
              <>
                <div style={{ fontSize: 11, color: ACCENT, fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>SÉANCE DU {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 8 }}>{selectedWorkout.program_name || 'Séance'}</div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {selectedWorkout.duration_minutes && <span style={{ fontSize: 12, color: '#555' }}>⏱ {selectedWorkout.duration_minutes} min</span>}
                  {selectedWorkout.total_volume && <span style={{ fontSize: 12, color: '#555' }}>📦 {Math.round(selectedWorkout.total_volume)}kg total</span>}
                  {selectedWorkout.sets_completed && <span style={{ fontSize: 12, color: '#555' }}>✓ {selectedWorkout.sets_completed} séries</span>}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', color: '#333', fontSize: 13 }}>
                Pas de séance ce jour
                {new Date(selectedDate) <= new Date() && (
                  <div style={{ marginTop: 10 }}>
                    <button onClick={() => navigate('/program')}
                      style={{ padding: '8px 16px', background: ACCENT + '22', border: '1px solid ' + ACCENT + '44', borderRadius: 10, color: ACCENT, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      Voir le programme
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Historique récent */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 11, color: '#555', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>SÉANCES RÉCENTES</div>
          {workouts.slice(0, 5).map((w: any) => (
            <div key={w.id} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '12px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{w.program_name || 'Séance'}</div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                  {new Date(w.created_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  {w.duration_minutes ? ` · ${w.duration_minutes}min` : ''}
                </div>
              </div>
              <div style={{ fontSize: 12, color: ACCENT, fontWeight: 700 }}>✓</div>
            </div>
          ))}
          {workouts.length === 0 && (
            <div style={{ textAlign: 'center', color: '#333', padding: '20px 0', fontSize: 13 }}>
              Pas encore de séances complétées
            </div>
          )}
        </div>
      </div>

      <BottomNav active="training" />
    </div>
  );
}
