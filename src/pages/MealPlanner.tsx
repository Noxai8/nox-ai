import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';
const MEALS = ['Petit-déjeuner', 'Déjeuner', 'Dîner', 'Snacks'];

export default function MealPlanner() {
  const { user } = useAuth();
  const [week, setWeek] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState<{ date: string; meal: string } | null>(null);
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');

  useEffect(() => {
    if (!user) return;
    generateWeek();
    load();
  }, [user]);

  const generateWeek = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push({
        date: d.toISOString().split('T')[0],
        label: i === 0 ? "Aujourd'hui" : i === 1 ? 'Demain' : d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
        entries: [],
      });
    }
    setWeek(days);
  };

  const load = async () => {
    const start = new Date().toISOString().split('T')[0];
    const end = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const { data } = await supabase.from('meal_plans')
      .select('*').eq('user_id', user!.id)
      .gte('planned_date', start).lte('planned_date', end)
      .order('planned_date');
    if (data) {
      setWeek(prev => prev.map(day => ({
        ...day,
        entries: data.filter(e => e.planned_date === day.date),
      })));
    }
  };

  const addPlanned = async () => {
    if (!showAdd || !foodName) return;
    await supabase.from('meal_plans').insert({
      user_id: user!.id,
      planned_date: showAdd.date,
      meal_type: showAdd.meal,
      food_name: foodName,
      calories: parseFloat(calories) || 0,
      protein: parseFloat(protein) || 0,
      created_at: new Date().toISOString(),
    });
    setFoodName(''); setCalories(''); setProtein('');
    setShowAdd(null);
    load();
  };

  const logNow = async (entry: any) => {
    // Transférer vers food_entries (journal du jour)
    await supabase.from('food_entries').insert({
      user_id: user!.id,
      meal_type: entry.meal_type,
      food_name: entry.food_name,
      calories: entry.calories,
      protein: entry.protein,
      carbs: 0, fat: 0,
      created_at: new Date().toISOString(),
    });
    await supabase.from('meal_plans').update({ logged: true }).eq('id', entry.id);
    load();
  };

  const deleteEntry = async (id: string) => {
    await supabase.from('meal_plans').delete().eq('id', id);
    load();
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 80 }}>
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid ' + BORDER }}>
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em' }}>Organisation</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>PLAN DE LA SEMAINE</div>
        <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>Planifie tes repas à l'avance et vois ton total calorique</div>
      </div>

      <div style={{ padding: '16px 20px 0' }}>
        {week.map(day => {
          const total = day.entries.reduce((s: number, e: any) => s + (e.calories || 0), 0);
          return (
            <div key={day.date} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: day.label === "Aujourd'hui" ? ACCENT : '#fff' }}>{day.label}</div>
                {total > 0 && <div style={{ fontSize: 13, color: '#555' }}>{total} kcal planifiées</div>}
              </div>

              {day.entries.map((entry: any) => (
                <div key={entry.id} style={{ background: entry.logged ? '#0d0d0d' : SURFACE, border: '1px solid ' + (entry.logged ? '#1a1a1a' : BORDER), borderRadius: 12, padding: '10px 14px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10, opacity: entry.logged ? 0.5 : 1 }}>
                  <div style={{ fontSize: 10, color: '#555', fontWeight: 700, width: 70, flexShrink: 0 }}>{entry.meal_type}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.food_name}</div>
                    <div style={{ fontSize: 11, color: '#555' }}>{entry.calories} kcal · {entry.protein}g prot.</div>
                  </div>
                  {!entry.logged && day.label === "Aujourd'hui" && (
                    <button onTouchEnd={e => { e.preventDefault(); logNow(entry); }} onClick={() => logNow(entry)}
                      style={{ padding: '6px 10px', background: ACCENT + '22', border: '1px solid ' + ACCENT + '44', borderRadius: 8, color: ACCENT, fontSize: 11, fontWeight: 800, cursor: 'pointer', flexShrink: 0, touchAction: 'manipulation' }}>
                      Logger
                    </button>
                  )}
                  {entry.logged && <div style={{ fontSize: 11, color: '#555', flexShrink: 0 }}>✓</div>}
                  <button onClick={() => deleteEntry(entry.id)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>×</button>
                </div>
              ))}

              {/* Ajouter par type de repas */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {MEALS.map(meal => (
                  <button key={meal} onTouchEnd={e => { e.preventDefault(); setShowAdd({ date: day.date, meal }); }}
                    onClick={() => setShowAdd({ date: day.date, meal })}
                    style={{ padding: '5px 10px', background: 'transparent', border: '1px dashed #222', borderRadius: 8, color: '#444', fontSize: 11, cursor: 'pointer', touchAction: 'manipulation' }}>
                    + {meal}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal ajout */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.9)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: '#0d0d0d', borderRadius: '20px 20px 0 0', padding: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', marginBottom: 4 }}>Planifier un repas</div>
            <div style={{ fontSize: 13, color: '#555', marginBottom: 20 }}>{showAdd.meal} · {showAdd.date}</div>

            {[
              { label: 'Aliment / Repas', val: foodName, set: setFoodName, type: 'text', placeholder: 'ex: Bol de riz au poulet' },
              { label: 'Calories estimées', val: calories, set: setCalories, type: 'number', placeholder: '500' },
              { label: 'Protéines (g)', val: protein, set: setProtein, type: 'number', placeholder: '40' },
            ].map(({ label, val, set, type, placeholder }) => (
              <div key={label} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>{label}</label>
                <input value={val} onChange={e => set(e.target.value)} type={type} placeholder={placeholder}
                  style={{ width: '100%', padding: '12px 14px', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
              </div>
            ))}

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onTouchEnd={e => { e.preventDefault(); setShowAdd(null); }} onClick={() => setShowAdd(null)}
                style={{ flex: 1, padding: 14, background: 'transparent', border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>
                Annuler
              </button>
              <button onTouchEnd={e => { e.preventDefault(); addPlanned(); }} onClick={addPlanned}
                style={{ flex: 2, padding: 14, background: ACCENT, border: 'none', borderRadius: 12, color: '#000', fontWeight: 900, cursor: 'pointer', touchAction: 'manipulation' }}>
                PLANIFIER
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="fuel" />
    </div>
  );
}
