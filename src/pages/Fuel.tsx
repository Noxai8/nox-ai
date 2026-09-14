import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

const COMMON_FOODS = [
  { name: 'Poulet grillé (100g)', kcal: 165, protein: 31, carbs: 0, fat: 4 },
  { name: 'Riz blanc cuit (100g)', kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { name: 'Œuf entier', kcal: 78, protein: 6, carbs: 0.6, fat: 5 },
  { name: 'Blanc de dinde (100g)', kcal: 104, protein: 22, carbs: 0, fat: 1.7 },
  { name: 'Flocons d\'avoine (100g)', kcal: 379, protein: 13, carbs: 68, fat: 6.9 },
  { name: 'Thon en boîte (100g)', kcal: 116, protein: 26, carbs: 0, fat: 1 },
  { name: 'Fromage blanc 0% (100g)', kcal: 57, protein: 10, carbs: 4, fat: 0.2 },
  { name: 'Banane', kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  { name: 'Patate douce (100g)', kcal: 86, protein: 1.6, carbs: 20, fat: 0.1 },
  { name: 'Saumon (100g)', kcal: 208, protein: 20, carbs: 0, fat: 13 },
  { name: 'Lentilles cuites (100g)', kcal: 116, protein: 9, carbs: 20, fat: 0.4 },
  { name: 'Amandes (30g)', kcal: 174, protein: 6, carbs: 5, fat: 15 },
  { name: 'Yaourt grec 0% (100g)', kcal: 57, protein: 10, carbs: 4, fat: 0.4 },
  { name: 'Pain complet (1 tranche)', kcal: 80, protein: 3.5, carbs: 15, fat: 1 },
  { name: 'Whey protéine (30g)', kcal: 115, protein: 24, carbs: 2, fat: 1.5 },
];

const MEALS = ['Petit-déjeuner', 'Déjeuner', 'Dîner', 'Snacks'];

export default function Fuel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [targets, setTargets] = useState({ kcal: 2200, protein: 160, carbs: 220, fat: 70 });
  const [entries, setEntries] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState('Déjeuner');
  const [search, setSearch] = useState('');
  const [custom, setCustom] = useState({ name: '', kcal: '', protein: '', carbs: '', fat: '' });
  const [mode, setMode] = useState<'search' | 'custom'>('search');
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [qty, setQty] = useState('1');
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    const [{ data: t }, { data: e }] = await Promise.all([
      supabase.from('nutrition_targets').select('*').eq('user_id', user!.id).maybeSingle(),
      supabase.from('food_entries').select('*').eq('user_id', user!.id).gte('created_at', today + 'T00:00:00').order('created_at'),
    ]);
    if (t) setTargets({ kcal: t.calories || 2200, protein: t.protein || 160, carbs: t.carbs || 220, fat: t.fat || 70 });
    if (e) setEntries(e);
  };

  const totals = entries.reduce((acc, e) => ({
    kcal: acc.kcal + (e.calories || 0),
    protein: acc.protein + (e.protein || 0),
    carbs: acc.carbs + (e.carbs || 0),
    fat: acc.fat + (e.fat || 0),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  const addEntry = async (food: any) => {
    const q = parseFloat(qty) || 1;
    const entry = {
      user_id: user!.id,
      meal_type: selectedMeal,
      food_name: food.name,
      calories: Math.round(food.kcal * q),
      protein: Math.round(food.protein * q * 10) / 10,
      carbs: Math.round(food.carbs * q * 10) / 10,
      fat: Math.round(food.fat * q * 10) / 10,
      quantity: q,
      created_at: new Date().toISOString(),
    };
    await supabase.from('food_entries').insert(entry);
    await loadData();
    setShowAdd(false);
    setSelectedFood(null);
    setSearch('');
    setQty('1');
  };

  const addCustom = async () => {
    const entry = {
      user_id: user!.id,
      meal_type: selectedMeal,
      food_name: custom.name || 'Aliment',
      calories: parseFloat(custom.kcal) || 0,
      protein: parseFloat(custom.protein) || 0,
      carbs: parseFloat(custom.carbs) || 0,
      fat: parseFloat(custom.fat) || 0,
      quantity: 1,
      created_at: new Date().toISOString(),
    };
    await supabase.from('food_entries').insert(entry);
    await loadData();
    setShowAdd(false);
    setCustom({ name: '', kcal: '', protein: '', carbs: '', fat: '' });
  };

  const deleteEntry = async (id: string) => {
    await supabase.from('food_entries').delete().eq('id', id);
    await loadData();
  };

  const filtered = COMMON_FOODS.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
  const mealGroups = MEALS.map(m => ({ meal: m, items: entries.filter(e => e.meal_type === m) })).filter(g => g.items.length > 0);
  const pct = (val: number, max: number) => Math.min(100, Math.round((val / max) * 100));

  const MacroBar = ({ label, val, max, color }: any) => (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</span>
        <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>{Math.round(val)}g</span>
      </div>
      <div style={{ height: 4, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct(val, max) + '%', background: color, borderRadius: 2, transition: 'width .5s' }} />
      </div>
      <div style={{ fontSize: 10, color: '#333', marginTop: 2 }}>{max}g objectif</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid ' + BORDER }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em' }}>Aujourd'hui</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-.02em' }}>FUEL</div>
          </div>
          <button onClick={() => setShowAdd(true)} style={{ background: ACCENT, color: '#000', border: 'none', borderRadius: 12, padding: '10px 18px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>+ AJOUTER</button>
        </div>
      </div>

      {/* Calories ring */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ background: SURFACE, borderRadius: 16, border: '1px solid ' + BORDER, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            {/* Circle */}
            <div style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
              <svg width="90" height="90" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="45" cy="45" r="38" fill="none" stroke="#1a1a1a" strokeWidth="8" />
                <circle cx="45" cy="45" r="38" fill="none" stroke={ACCENT} strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 38}`}
                  strokeDashoffset={`${2 * Math.PI * 38 * (1 - pct(totals.kcal, targets.kcal) / 100)}`}
                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset .5s' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>{Math.round(totals.kcal)}</div>
                <div style={{ fontSize: 9, color: '#555' }}>kcal</div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: ACCENT }}>{Math.round(totals.kcal)}</span>
                <span style={{ fontSize: 14, color: '#333' }}> / {targets.kcal} kcal</span>
              </div>
              <div style={{ fontSize: 12, color: '#555' }}>{Math.max(0, targets.kcal - totals.kcal)} restantes</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <MacroBar label="Protéines" val={totals.protein} max={targets.protein} color="#c8ff00" />
            <MacroBar label="Glucides" val={totals.carbs} max={targets.carbs} color="#4488ff" />
            <MacroBar label="Lipides" val={totals.fat} max={targets.fat} color="#ff6644" />
          </div>
        </div>
      </div>

      {/* Meals */}
      <div style={{ padding: '16px 20px' }}>
        {mealGroups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#333' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🥗</div>
            <div style={{ fontWeight: 700, color: '#444' }}>Aucun repas enregistré</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>Commence à tracker ta nutrition</div>
          </div>
        ) : mealGroups.map(({ meal, items }) => (
          <div key={meal} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>{meal}</div>
            {items.map((item: any) => (
              <div key={item.id} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{item.food_name}</div>
                  <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
                    P: {item.protein}g · G: {item.carbs}g · L: {item.fat}g
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: ACCENT }}>{item.calories} kcal</div>
                  <button onClick={() => deleteEntry(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#333', fontSize: 16 }}>×</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.9)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: '#0d0d0d', borderRadius: '20px 20px 0 0', padding: 24, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>AJOUTER UN ALIMENT</div>
              <button onClick={() => { setShowAdd(false); setSelectedFood(null); }} style={{ background: 'none', border: 'none', color: '#555', fontSize: 24, cursor: 'pointer' }}>×</button>
            </div>

            {/* Meal selector */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {MEALS.map(m => (
                <button key={m} onClick={() => setSelectedMeal(m)}
                  style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid ' + (selectedMeal === m ? ACCENT : BORDER), background: selectedMeal === m ? ACCENT + '22' : 'transparent', color: selectedMeal === m ? ACCENT : '#555', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {m}
                </button>
              ))}
            </div>

            {/* Mode tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {(['search', 'custom'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1px solid ' + (mode === m ? ACCENT : BORDER), background: mode === m ? ACCENT : 'transparent', color: mode === m ? '#000' : '#555', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
                  {m === 'search' ? '🔍 Rechercher' : '✏️ Manuel'}
                </button>
              ))}
            </div>

            {mode === 'search' && !selectedFood && (
              <>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un aliment..."
                  style={{ width: '100%', padding: '12px 16px', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontSize: 14, boxSizing: 'border-box', marginBottom: 12 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filtered.map(f => (
                    <button key={f.name} onClick={() => setSelectedFood(f)}
                      style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '12px 16px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{f.name}</div>
                        <div style={{ fontSize: 12, color: '#555' }}>P:{f.protein}g · G:{f.carbs}g · L:{f.fat}g</div>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: ACCENT }}>{f.kcal} kcal</div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {mode === 'search' && selectedFood && (
              <div>
                <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 8 }}>{selectedFood.name}</div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 900, color: ACCENT }}>{Math.round(selectedFood.kcal * (parseFloat(qty) || 1))}</div><div style={{ fontSize: 11, color: '#555' }}>kcal</div></div>
                    <div style={{ textAlign: 'center' }}><div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{Math.round(selectedFood.protein * (parseFloat(qty) || 1) * 10) / 10}g</div><div style={{ fontSize: 11, color: '#555' }}>prot.</div></div>
                    <div style={{ textAlign: 'center' }}><div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{Math.round(selectedFood.carbs * (parseFloat(qty) || 1) * 10) / 10}g</div><div style={{ fontSize: 11, color: '#555' }}>glucides</div></div>
                    <div style={{ textAlign: 'center' }}><div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{Math.round(selectedFood.fat * (parseFloat(qty) || 1) * 10) / 10}g</div><div style={{ fontSize: 11, color: '#555' }}>lipides</div></div>
                  </div>
                </div>
                <label style={{ fontSize: 12, color: '#555', textTransform: 'uppercase', letterSpacing: '.05em' }}>Quantité (portions)</label>
                <input value={qty} onChange={e => setQty(e.target.value)} type="number" min="0.1" step="0.1"
                  style={{ width: '100%', padding: '12px 16px', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontSize: 16, boxSizing: 'border-box', margin: '8px 0 16px' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setSelectedFood(null)} style={{ flex: 1, padding: 14, background: 'transparent', border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>RETOUR</button>
                  <button onClick={() => addEntry(selectedFood)} style={{ flex: 2, padding: 14, background: ACCENT, border: 'none', borderRadius: 12, color: '#000', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>AJOUTER</button>
                </div>
              </div>
            )}

            {mode === 'custom' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { key: 'name', label: 'Nom de l\'aliment', type: 'text' },
                  { key: 'kcal', label: 'Calories (kcal)', type: 'number' },
                  { key: 'protein', label: 'Protéines (g)', type: 'number' },
                  { key: 'carbs', label: 'Glucides (g)', type: 'number' },
                  { key: 'fat', label: 'Lipides (g)', type: 'number' },
                ].map(({ key, label, type }) => (
                  <div key={key}>
                    <label style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</label>
                    <input value={(custom as any)[key]} onChange={e => setCustom(p => ({ ...p, [key]: e.target.value }))} type={type}
                      style={{ width: '100%', padding: '12px 16px', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontSize: 14, boxSizing: 'border-box', marginTop: 6 }} />
                  </div>
                ))}
                <button onClick={addCustom} style={{ padding: 16, background: ACCENT, border: 'none', borderRadius: 12, color: '#000', fontWeight: 900, fontSize: 14, cursor: 'pointer', marginTop: 8 }}>AJOUTER</button>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav active="fuel" />
    </div>
  );
}
