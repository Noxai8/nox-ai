import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

type View = 'list' | 'create' | 'detail';

export default function Recipes() {
  const { user } = useAuth();
  const [view, setView] = useState<View>('list');
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selectedMeal, setSelectedMeal] = useState('Déjeuner');
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ name: '', servings: '1', steps: '', ingredients: [{ name: '', calories: '', protein: '', carbs: '', fat: '', qty: '' }] });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    const { data } = await supabase.from('recipes').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
    setRecipes(data || []);
  };

  const addIngredient = () => setForm(f => ({ ...f, ingredients: [...f.ingredients, { name: '', calories: '', protein: '', carbs: '', fat: '', qty: '' }] }));
  const removeIngredient = (i: number) => setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, idx) => idx !== i) }));
  const updateIngredient = (i: number, key: string, val: string) => setForm(f => ({ ...f, ingredients: f.ingredients.map((ing, idx) => idx === i ? { ...ing, [key]: val } : ing) }));

  const totals = (ings: any[]) => ings.reduce((acc, ing) => {
    const ratio = (parseFloat(ing.qty) || 1);
    return {
      kcal: acc.kcal + (parseFloat(ing.calories) || 0) * ratio / 100,
      protein: acc.protein + (parseFloat(ing.protein) || 0) * ratio / 100,
      carbs: acc.carbs + (parseFloat(ing.carbs) || 0) * ratio / 100,
      fat: acc.fat + (parseFloat(ing.fat) || 0) * ratio / 100,
    };
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  const save = async () => {
    if (!form.name) return;
    setSaving(true);
    const t = totals(form.ingredients);
    const servings = parseFloat(form.servings) || 1;
    await supabase.from('recipes').insert({
      user_id: user!.id,
      name: form.name,
      servings,
      steps: form.steps,
      ingredients: form.ingredients,
      calories_per_serving: Math.round(t.kcal / servings),
      protein_per_serving: Math.round(t.protein / servings * 10) / 10,
      carbs_per_serving: Math.round(t.carbs / servings * 10) / 10,
      fat_per_serving: Math.round(t.fat / servings * 10) / 10,
      created_at: new Date().toISOString(),
    });
    setSaving(false);
    setForm({ name: '', servings: '1', steps: '', ingredients: [{ name: '', calories: '', protein: '', carbs: '', fat: '', qty: '' }] });
    setView('list');
    load();
  };

  const useRecipe = async (recipe: any, portions = 1) => {
    await supabase.from('food_entries').insert({
      user_id: user!.id,
      meal_type: selectedMeal,
      food_name: recipe.name + (portions > 1 ? ` ×${portions}` : ''),
      calories: Math.round(recipe.calories_per_serving * portions),
      protein: Math.round(recipe.protein_per_serving * portions * 10) / 10,
      carbs: Math.round(recipe.carbs_per_serving * portions * 10) / 10,
      fat: Math.round(recipe.fat_per_serving * portions * 10) / 10,
      created_at: new Date().toISOString(),
    });
  };

  const deleteRecipe = async (id: string) => {
    await supabase.from('recipes').delete().eq('id', id);
    load();
    setView('list');
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 80 }}>
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid ' + BORDER }}>
        {view !== 'list' && <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14, marginBottom: 12, display: 'block' }}>← Retour</button>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em' }}>Nutrition</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>
              {view === 'list' ? 'MES RECETTES' : view === 'create' ? 'NOUVELLE RECETTE' : selected?.name}
            </div>
          </div>
          {view === 'list' && (
            <button onClick={() => setView('create')} style={{ background: ACCENT, color: '#000', border: 'none', borderRadius: 12, padding: '10px 16px', fontWeight: 800, fontSize: 13, cursor: 'pointer', touchAction: 'manipulation' }}>+ CRÉER</button>
          )}
        </div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>

        {/* LIST */}
        {view === 'list' && (
          recipes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>👨‍🍳</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Pas encore de recettes</div>
              <div style={{ fontSize: 14, color: '#555', marginBottom: 24 }}>Crée tes recettes et réutilise-les facilement</div>
              <button onClick={() => setView('create')} style={{ padding: '14px 28px', background: ACCENT, border: 'none', borderRadius: 14, color: '#000', fontWeight: 900, cursor: 'pointer', touchAction: 'manipulation' }}>CRÉER MA PREMIÈRE RECETTE</button>
            </div>
          ) : (
            <div>
              {recipes.map(r => (
                <button key={r.id} onClick={() => { setSelected(r); setView('detail'); }}
                  style={{ width: '100%', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: '14px 16px', marginBottom: 10, textAlign: 'left', cursor: 'pointer', touchAction: 'manipulation' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{r.name}</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: ACCENT }}>{r.calories_per_serving} kcal</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
                    {r.servings} portion{r.servings > 1 ? 's' : ''} · P:{r.protein_per_serving}g · G:{r.carbs_per_serving}g · L:{r.fat_per_serving}g
                  </div>
                </button>
              ))}
            </div>
          )
        )}

        {/* CREATE */}
        {view === 'create' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>Nom de la recette</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ex: Bol protéiné poulet-riz"
                style={{ width: '100%', padding: '12px 14px', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>Nombre de portions</label>
              <input value={form.servings} onChange={e => setForm(f => ({ ...f, servings: e.target.value }))} type="number" min="1"
                style={{ width: '100%', padding: '12px 14px', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontSize: 16, fontWeight: 700, textAlign: 'center', boxSizing: 'border-box', outline: 'none' }} />
            </div>

            <div style={{ fontSize: 13, fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>INGRÉDIENTS</div>
            {form.ingredients.map((ing, i) => (
              <div key={i} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <input value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)} placeholder="Nom de l'ingrédient"
                    style={{ flex: 1, padding: '8px 12px', background: '#0d0d0d', border: '1px solid ' + BORDER, borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', marginRight: 8 }} />
                  <input value={ing.qty} onChange={e => updateIngredient(i, 'qty', e.target.value)} placeholder="g" type="number"
                    style={{ width: 60, padding: '8px 10px', background: '#0d0d0d', border: '1px solid ' + BORDER, borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', textAlign: 'center' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                  {[
                    { key: 'calories', label: 'Kcal/100g' },
                    { key: 'protein', label: 'Prot/100g' },
                    { key: 'carbs', label: 'Gluc/100g' },
                    { key: 'fat', label: 'Lip/100g' },
                  ].map(({ key, label }) => (
                    <input key={key} value={(ing as any)[key]} onChange={e => updateIngredient(i, key, e.target.value)}
                      placeholder={label} type="number"
                      style={{ padding: '8px 6px', background: '#0d0d0d', border: '1px solid ' + BORDER, borderRadius: 8, color: '#ccc', fontSize: 11, outline: 'none', textAlign: 'center', boxSizing: 'border-box' }} />
                  ))}
                </div>
                {i > 0 && <button onClick={() => removeIngredient(i)} style={{ marginTop: 8, background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 12 }}>Supprimer</button>}
              </div>
            ))}

            <button onClick={addIngredient} style={{ width: '100%', padding: 12, background: 'transparent', border: '1px dashed ' + BORDER, borderRadius: 12, color: '#555', fontWeight: 700, cursor: 'pointer', marginBottom: 16, touchAction: 'manipulation' }}>
              + Ajouter un ingrédient
            </button>

            {/* Total */}
            {(() => { const t = totals(form.ingredients); return (
              <div style={{ background: '#0d0d0d', border: '1px solid ' + BORDER, borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>TOTAL PAR PORTION ({form.servings || 1} portion{parseFloat(form.servings) > 1 ? 's' : ''})</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { label: 'Kcal', val: Math.round(t.kcal / (parseFloat(form.servings) || 1)), color: ACCENT },
                    { label: 'Prot', val: Math.round(t.protein / (parseFloat(form.servings) || 1) * 10) / 10 + 'g', color: '#fff' },
                    { label: 'Gluc', val: Math.round(t.carbs / (parseFloat(form.servings) || 1) * 10) / 10 + 'g', color: '#8da0ff' },
                    { label: 'Lip', val: Math.round(t.fat / (parseFloat(form.servings) || 1) * 10) / 10 + 'g', color: '#ff806b' },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color }}>{val}</div>
                      <div style={{ fontSize: 10, color: '#555' }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ); })()}

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>Instructions (optionnel)</label>
              <textarea value={form.steps} onChange={e => setForm(f => ({ ...f, steps: e.target.value }))} placeholder="Étapes de préparation..."
                style={{ width: '100%', minHeight: 100, padding: '12px 14px', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>

            <button onTouchEnd={e => { e.preventDefault(); save(); }} onClick={save} disabled={!form.name || saving}
              style={{ width: '100%', padding: 18, background: form.name ? ACCENT : '#1a1a1a', border: 'none', borderRadius: 14, color: form.name ? '#000' : '#333', fontWeight: 900, fontSize: 15, cursor: form.name ? 'pointer' : 'not-allowed', touchAction: 'manipulation' }}>
              {saving ? 'ENREGISTREMENT...' : 'SAUVEGARDER LA RECETTE'}
            </button>
          </div>
        )}

        {/* DETAIL */}
        {view === 'detail' && selected && (
          <div>
            <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                {[
                  { label: 'Calories', val: selected.calories_per_serving, color: ACCENT },
                  { label: 'Protéines', val: selected.protein_per_serving + 'g', color: '#fff' },
                  { label: 'Glucides', val: selected.carbs_per_serving + 'g', color: '#8da0ff' },
                  { label: 'Lipides', val: selected.fat_per_serving + 'g', color: '#ff806b' },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color }}>{val}</div>
                    <div style={{ fontSize: 10, color: '#555' }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: '#555' }}>Par portion · {selected.servings} portion{selected.servings > 1 ? 's' : ''} au total</div>
            </div>

            {selected.steps && (
              <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#555', textTransform: 'uppercase', marginBottom: 8 }}>INSTRUCTIONS</div>
                <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selected.steps}</div>
              </div>
            )}

            <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>AJOUTER AU JOURNAL</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {['Petit-déjeuner', 'Déjeuner', 'Dîner', 'Snacks'].map(m => (
                <button key={m} onClick={() => setSelectedMeal(m)}
                  style={{ flex: 1, padding: '8px 0', background: selectedMeal === m ? ACCENT + '22' : 'transparent', border: '1px solid ' + (selectedMeal === m ? ACCENT : BORDER), borderRadius: 10, color: selectedMeal === m ? ACCENT : '#555', fontSize: 10, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>
                  {m}
                </button>
              ))}
            </div>

            <button onTouchEnd={e => { e.preventDefault(); useRecipe(selected); setView('list'); }}
              onClick={() => { useRecipe(selected); setView('list'); }}
              style={{ width: '100%', padding: 18, background: ACCENT, border: 'none', borderRadius: 14, color: '#000', fontWeight: 900, fontSize: 15, cursor: 'pointer', marginBottom: 12, touchAction: 'manipulation' }}>
              ✓ AJOUTER AU JOURNAL ({selected.calories_per_serving} kcal)
            </button>

            <button onClick={() => deleteRecipe(selected.id)}
              style={{ width: '100%', padding: 12, background: 'transparent', border: '1px solid #ff444433', borderRadius: 12, color: '#ff6666', fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>
              Supprimer la recette
            </button>
          </div>
        )}
      </div>

      <BottomNav active="fuel" />
    </div>
  );
}
