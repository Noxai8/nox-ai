import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from '../components/BottomNav';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#232323';

type View = 'list' | 'create' | 'detail';
type GoalKey = 'cut' | 'maintain' | 'bulk';

type Ingredient = {
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  qty: string;
};

type SuggestedRecipe = {
  id: string;
  goal: GoalKey | 'all';
  name: string;
  subtitle: string;
  servings: number;
  calories_per_serving: number;
  protein_per_serving: number;
  carbs_per_serving: number;
  fat_per_serving: number;
  ingredients: Ingredient[];
  steps: string;
  tags: string[];
};

const emptyIngredient = (): Ingredient => ({
  name: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  qty: '',
});

const SUGGESTIONS: SuggestedRecipe[] = [
  {
    id: 'cut-chicken-bowl',
    goal: 'cut',
    name: 'Bowl poulet, riz & légumes',
    subtitle: 'Rassasiant, riche en protéines et facile à préparer.',
    servings: 1,
    calories_per_serving: 515,
    protein_per_serving: 52,
    carbs_per_serving: 51,
    fat_per_serving: 11,
    tags: ['PROTÉINÉ', 'SÈCHE', '20 MIN'],
    ingredients: [
      { name: 'Blanc de poulet', calories: '110', protein: '23', carbs: '0', fat: '1.2', qty: '170' },
      { name: 'Riz basmati cuit', calories: '121', protein: '2.5', carbs: '25', fat: '0.3', qty: '150' },
      { name: 'Brocoli', calories: '34', protein: '2.8', carbs: '7', fat: '0.4', qty: '150' },
      { name: "Huile d'olive", calories: '884', protein: '0', carbs: '0', fat: '100', qty: '8' },
    ],
    steps: '1. Fais cuire le poulet avec les épices de ton choix.\n2. Réchauffe le riz et cuis le brocoli.\n3. Assemble le bowl et ajoute l’huile d’olive en finition.',
  },
  {
    id: 'cut-skyr-oats',
    goal: 'cut',
    name: 'Skyr bowl fruits rouges',
    subtitle: 'Petit-déjeuner rapide avec beaucoup de protéines.',
    servings: 1,
    calories_per_serving: 390,
    protein_per_serving: 35,
    carbs_per_serving: 49,
    fat_per_serving: 7,
    tags: ['PETIT-DÉJ', 'SÈCHE', '5 MIN'],
    ingredients: [
      { name: 'Skyr nature', calories: '65', protein: '11', carbs: '4', fat: '0.2', qty: '250' },
      { name: "Flocons d'avoine", calories: '379', protein: '13', carbs: '68', fat: '6.9', qty: '45' },
      { name: 'Myrtilles', calories: '57', protein: '0.7', carbs: '14', fat: '0.3', qty: '100' },
    ],
    steps: '1. Verse le skyr dans un bol.\n2. Ajoute les flocons d’avoine et les fruits.\n3. Mélange juste avant de manger.',
  },
  {
    id: 'cut-salmon',
    goal: 'cut',
    name: 'Saumon & pommes de terre',
    subtitle: 'Un dîner complet avec protéines et bons lipides.',
    servings: 1,
    calories_per_serving: 560,
    protein_per_serving: 42,
    carbs_per_serving: 52,
    fat_per_serving: 20,
    tags: ['DÎNER', 'OMEGA-3', 'SÈCHE'],
    ingredients: [
      { name: 'Saumon', calories: '208', protein: '20', carbs: '0', fat: '13', qty: '160' },
      { name: 'Pomme de terre cuite', calories: '87', protein: '1.9', carbs: '20', fat: '0.1', qty: '260' },
      { name: 'Haricots verts', calories: '35', protein: '1.8', carbs: '7', fat: '0.1', qty: '150' },
    ],
    steps: '1. Fais cuire le saumon au four ou à la poêle.\n2. Accompagne de pommes de terre et haricots verts.\n3. Assaisonne selon tes goûts.',
  },
  {
    id: 'maintain-wrap',
    goal: 'maintain',
    name: 'Wrap poulet avocat',
    subtitle: 'Équilibré et pratique pour un déjeuner complet.',
    servings: 1,
    calories_per_serving: 620,
    protein_per_serving: 48,
    carbs_per_serving: 61,
    fat_per_serving: 21,
    tags: ['ÉQUILIBRÉ', 'RAPIDE', 'DÉJEUNER'],
    ingredients: [
      { name: 'Tortilla blé', calories: '292', protein: '7.6', carbs: '48', fat: '7', qty: '100' },
      { name: 'Blanc de poulet', calories: '110', protein: '23', carbs: '0', fat: '1.2', qty: '150' },
      { name: 'Avocat', calories: '160', protein: '2', carbs: '9', fat: '15', qty: '70' },
      { name: 'Tomate', calories: '18', protein: '0.9', carbs: '3.9', fat: '0.2', qty: '100' },
    ],
    steps: '1. Fais cuire puis découpe le poulet.\n2. Garnis la tortilla avec le poulet, l’avocat et la tomate.\n3. Roule fermement et coupe en deux.',
  },
  {
    id: 'maintain-pasta',
    goal: 'maintain',
    name: 'Pâtes au thon protéinées',
    subtitle: 'Simple, équilibré et adapté aux journées actives.',
    servings: 1,
    calories_per_serving: 650,
    protein_per_serving: 50,
    carbs_per_serving: 78,
    fat_per_serving: 15,
    tags: ['PROTÉINÉ', 'ÉQUILIBRÉ', '20 MIN'],
    ingredients: [
      { name: 'Pâtes cuites', calories: '158', protein: '5.5', carbs: '31', fat: '0.9', qty: '220' },
      { name: 'Thon au naturel', calories: '116', protein: '26', carbs: '0', fat: '1', qty: '140' },
      { name: 'Tomate', calories: '18', protein: '0.9', carbs: '3.9', fat: '0.2', qty: '120' },
      { name: "Huile d'olive", calories: '884', protein: '0', carbs: '0', fat: '100', qty: '10' },
    ],
    steps: '1. Fais cuire les pâtes.\n2. Ajoute le thon et la tomate.\n3. Termine avec l’huile d’olive et l’assaisonnement.',
  },
  {
    id: 'bulk-oats',
    goal: 'bulk',
    name: 'Porridge prise de masse',
    subtitle: 'Dense en énergie sans sacrifier les protéines.',
    servings: 1,
    calories_per_serving: 720,
    protein_per_serving: 42,
    carbs_per_serving: 91,
    fat_per_serving: 22,
    tags: ['PRISE DE MASSE', 'PETIT-DÉJ', 'ÉNERGIE'],
    ingredients: [
      { name: "Flocons d'avoine", calories: '379', protein: '13', carbs: '68', fat: '6.9', qty: '90' },
      { name: 'Lait demi-écrémé', calories: '46', protein: '3.2', carbs: '4.7', fat: '1.6', qty: '300' },
      { name: 'Banane', calories: '89', protein: '1.1', carbs: '23', fat: '0.3', qty: '120' },
      { name: 'Beurre de cacahuète', calories: '627', protein: '27', carbs: '20', fat: '53', qty: '25' },
    ],
    steps: '1. Fais chauffer les flocons avec le lait.\n2. Ajoute la banane en morceaux.\n3. Termine avec le beurre de cacahuète.',
  },
  {
    id: 'bulk-beef-rice',
    goal: 'bulk',
    name: 'Bowl bœuf & riz',
    subtitle: 'Un repas calorique et protéiné pour soutenir la progression.',
    servings: 1,
    calories_per_serving: 790,
    protein_per_serving: 55,
    carbs_per_serving: 96,
    fat_per_serving: 20,
    tags: ['PRISE DE MASSE', 'PROTÉINÉ', 'POST-TRAIN'],
    ingredients: [
      { name: 'Steak haché 5%', calories: '137', protein: '21', carbs: '0', fat: '5', qty: '180' },
      { name: 'Riz basmati cuit', calories: '121', protein: '2.5', carbs: '25', fat: '0.3', qty: '300' },
      { name: 'Avocat', calories: '160', protein: '2', carbs: '9', fat: '15', qty: '70' },
      { name: 'Courgette', calories: '17', protein: '1.2', carbs: '3.1', fat: '0.3', qty: '150' },
    ],
    steps: '1. Fais cuire le bœuf et la courgette.\n2. Ajoute le riz chaud.\n3. Termine avec l’avocat en morceaux.',
  },
  {
    id: 'bulk-smoothie',
    goal: 'bulk',
    name: 'Smoothie protéiné calorique',
    subtitle: 'Utile quand manger davantage devient difficile.',
    servings: 1,
    calories_per_serving: 680,
    protein_per_serving: 45,
    carbs_per_serving: 78,
    fat_per_serving: 21,
    tags: ['PRISE DE MASSE', 'COLLATION', '5 MIN'],
    ingredients: [
      { name: 'Lait demi-écrémé', calories: '46', protein: '3.2', carbs: '4.7', fat: '1.6', qty: '350' },
      { name: 'Banane', calories: '89', protein: '1.1', carbs: '23', fat: '0.3', qty: '140' },
      { name: "Flocons d'avoine", calories: '379', protein: '13', carbs: '68', fat: '6.9', qty: '60' },
      { name: 'Whey protéine', calories: '383', protein: '80', carbs: '7', fat: '5', qty: '30' },
      { name: 'Beurre de cacahuète', calories: '627', protein: '27', carbs: '20', fat: '53', qty: '20' },
    ],
    steps: '1. Place tous les ingrédients dans un blender.\n2. Mixe jusqu’à obtenir une texture lisse.\n3. Ajuste avec un peu d’eau ou de lait selon la texture voulue.',
  },
];

function normalizeGoal(raw?: string | null): GoalKey {
  const goal = (raw || '').toLowerCase();
  if (['gras', 'poids', 'perte', 'lose', 'loss', 'cut', 'sèche', 'seche', 'fat'].some(k => goal.includes(k))) return 'cut';
  if (['muscle', 'masse', 'gain', 'bulk', 'hypertroph'].some(k => goal.includes(k))) return 'bulk';
  return 'maintain';
}

const goalLabel = (goal: GoalKey) =>
  goal === 'cut' ? 'SÈCHE / PERTE DE GRAS' : goal === 'bulk' ? 'PRISE DE MASSE' : 'MAINTIEN';

export default function Recipes() {
  const { user } = useAuth();
  const [view, setView] = useState<View>('list');
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selectedMeal, setSelectedMeal] = useState('Déjeuner');
  const [selected, setSelected] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [nutritionTarget, setNutritionTarget] = useState<any>(null);
  const [form, setForm] = useState({
    name: '',
    servings: '1',
    steps: '',
    ingredients: [emptyIngredient()],
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) load();
  }, [user]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError('');

    try {
      const [
        { data: recipeData, error: recipeError },
        { data: profileData, error: profileError },
        { data: targetData, error: targetError },
      ] = await Promise.all([
        supabase.from('recipes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('nutrition_targets').select('calories, protein, carbs, fat').eq('user_id', user.id).maybeSingle(),
      ]);

      if (recipeError) throw recipeError;
      if (profileError) throw profileError;
      if (targetError) throw targetError;

      setRecipes(recipeData || []);
      setProfile(profileData || null);
      setNutritionTarget(targetData || null);
    } catch (err: any) {
      console.error('RECIPES_LOAD_ERROR', err);
      setError(err?.message || 'Impossible de charger les recettes.');
    } finally {
      setLoading(false);
    }
  };

  const goal = normalizeGoal(profile?.goal_type || profile?.goal || profile?.objective);
  const suggestions = useMemo(
    () => SUGGESTIONS.filter(r => r.goal === goal || r.goal === 'all'),
    [goal]
  );

  const addIngredient = () =>
    setForm(f => ({ ...f, ingredients: [...f.ingredients, emptyIngredient()] }));

  const removeIngredient = (i: number) =>
    setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, idx) => idx !== i) }));

  const updateIngredient = (i: number, key: string, val: string) =>
    setForm(f => ({
      ...f,
      ingredients: f.ingredients.map((ing, idx) => idx === i ? { ...ing, [key]: val } : ing),
    }));

  const totals = (ings: Ingredient[]) =>
    ings.reduce((acc, ing) => {
      const qty = parseFloat(String(ing.qty).replace(',', '.')) || 0;
      return {
        kcal: acc.kcal + (parseFloat(String(ing.calories).replace(',', '.')) || 0) * qty / 100,
        protein: acc.protein + (parseFloat(String(ing.protein).replace(',', '.')) || 0) * qty / 100,
        carbs: acc.carbs + (parseFloat(String(ing.carbs).replace(',', '.')) || 0) * qty / 100,
        fat: acc.fat + (parseFloat(String(ing.fat).replace(',', '.')) || 0) * qty / 100,
      };
    }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  const save = async () => {
    if (!user || !form.name.trim() || saving) return;

    setSaving(true);
    setError('');
    setActionMessage('');

    try {
      const validIngredients = form.ingredients.filter(i => i.name.trim());
      if (validIngredients.length === 0) throw new Error('Ajoute au moins un ingrédient.');

      const t = totals(validIngredients);
      const servings = Math.max(1, parseFloat(form.servings.replace(',', '.')) || 1);

      const { error: insertError } = await supabase.from('recipes').insert({
        user_id: user.id,
        name: form.name.trim(),
        servings,
        steps: form.steps.trim(),
        ingredients: validIngredients,
        calories_per_serving: Math.round(t.kcal / servings),
        protein_per_serving: Math.round(t.protein / servings * 10) / 10,
        carbs_per_serving: Math.round(t.carbs / servings * 10) / 10,
        fat_per_serving: Math.round(t.fat / servings * 10) / 10,
        created_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;

      setForm({ name: '', servings: '1', steps: '', ingredients: [emptyIngredient()] });
      setView('list');
      setActionMessage('Recette enregistrée.');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Impossible d’enregistrer la recette.');
    } finally {
      setSaving(false);
    }
  };

  const saveSuggestion = async (recipe: SuggestedRecipe) => {
    if (!user || saving) return;

    setSaving(true);
    setError('');
    setActionMessage('');

    try {
      const { error: insertError } = await supabase.from('recipes').insert({
        user_id: user.id,
        name: recipe.name,
        servings: recipe.servings,
        steps: recipe.steps,
        ingredients: recipe.ingredients,
        calories_per_serving: recipe.calories_per_serving,
        protein_per_serving: recipe.protein_per_serving,
        carbs_per_serving: recipe.carbs_per_serving,
        fat_per_serving: recipe.fat_per_serving,
        created_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;

      setActionMessage(`${recipe.name} ajoutée à tes recettes.`);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Impossible d’ajouter cette recette.');
    } finally {
      setSaving(false);
    }
  };

  const useRecipe = async (recipe: any, portions = 1) => {
    if (!user) return;

    setError('');
    setActionMessage('');

    const { error: insertError } = await supabase.from('food_entries').insert({
      user_id: user.id,
      meal_type: selectedMeal,
      food_name: recipe.name + (portions > 1 ? ` ×${portions}` : ''),
      calories: Math.round((recipe.calories_per_serving || 0) * portions),
      protein: Math.round((recipe.protein_per_serving || 0) * portions * 10) / 10,
      carbs: Math.round((recipe.carbs_per_serving || 0) * portions * 10) / 10,
      fat: Math.round((recipe.fat_per_serving || 0) * portions * 10) / 10,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      setError(insertError.message);
      return false;
    }

    setActionMessage(`${recipe.name} ajouté à ${selectedMeal.toLowerCase()}.`);
    return true;
  };

  const deleteRecipe = async (id: string) => {
    setError('');
    if (!user) return;
    const { error: deleteError } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setView('list');
    setSelected(null);
    await load();
  };

  const openSuggestion = (recipe: SuggestedRecipe) => {
    setSelected({ ...recipe, suggested: true });
    setView('detail');
    setActionMessage('');
    setError('');
  };

  const dailyCalories = Number(nutritionTarget?.calories || 0) > 0
    ? Number(nutritionTarget.calories)
    : null;
  const dailyProtein = Number(nutritionTarget?.protein || 0) > 0
    ? Number(nutritionTarget.protein)
    : null;

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#fff', paddingBottom: 96 }}>
      <main style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
        <header style={{ padding: '24px 20px 18px', borderBottom: `1px solid ${BORDER}` }}>
          {view !== 'list' && (
            <button
              onClick={() => { setView('list'); setSelected(null); setError(''); }}
              style={{ background: 'none', border: 0, color: '#777', cursor: 'pointer', fontSize: 13, marginBottom: 14, padding: 0 }}
            >
              ← Retour
            </button>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
            <div>
              <div style={{ fontSize: 10, color: ACCENT, fontWeight: 900, letterSpacing: '.12em' }}>NOX FUEL</div>
              <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: '-.035em', marginTop: 4 }}>
                {view === 'list' ? 'MES RECETTES' : view === 'create' ? 'NOUVELLE RECETTE' : selected?.name}
              </div>
            </div>

            {view === 'list' && (
              <button
                onClick={() => { setView('create'); setError(''); setActionMessage(''); }}
                style={{ background: ACCENT, color: '#050505', border: 0, borderRadius: 12, padding: '11px 15px', fontWeight: 950, fontSize: 12, cursor: 'pointer' }}
              >
                + CRÉER
              </button>
            )}
          </div>
        </header>

        <section style={{ padding: 20 }}>
          {error && (
            <div style={{ marginBottom: 14, padding: 13, borderRadius: 13, background: 'rgba(255,80,70,.08)', border: '1px solid rgba(255,80,70,.25)', color: '#ff8d86', fontSize: 12, lineHeight: 1.45 }}>
              {error}
            </div>
          )}

          {actionMessage && (
            <div style={{ marginBottom: 14, padding: 13, borderRadius: 13, background: 'rgba(200,255,0,.07)', border: '1px solid rgba(200,255,0,.22)', color: ACCENT, fontSize: 12, lineHeight: 1.45 }}>
              {actionMessage}
            </div>
          )}

          {view === 'list' && (
            <>
              {loading && (
                <div style={{ marginBottom: 14, padding: 16, borderRadius: 14, background: SURFACE, border: `1px solid ${BORDER}`, color: '#777', fontSize: 11.5 }}>
                  Chargement de tes données nutritionnelles...
                </div>
              )}
              <div style={{ padding: 17, borderRadius: 18, background: 'linear-gradient(135deg,rgba(200,255,0,.12),rgba(200,255,0,.025))', border: '1px solid rgba(200,255,0,.22)', marginBottom: 22 }}>
                <div style={{ fontSize: 9.5, color: ACCENT, fontWeight: 950, letterSpacing: '.1em' }}>RECETTES POUR TON OBJECTIF</div>
                <div style={{ fontSize: 18, fontWeight: 950, marginTop: 6 }}>{goalLabel(goal)}</div>
                <div style={{ fontSize: 11.5, color: '#888', lineHeight: 1.5, marginTop: 6 }}>
                  NOX te propose des repas cohérents avec ton objectif nutritionnel.
                  {dailyCalories ? ` Même cible que Fuel : ${Math.round(dailyCalories)} kcal/jour` : ''}
                  {dailyProtein ? ` · ${Math.round(dailyProtein)} g protéines` : ''}.
                  {!dailyCalories ? ' Ouvre Fuel une première fois pour initialiser ta cible nutritionnelle centrale.' : ''}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 950 }}>Suggestions NOX</div>
                  <div style={{ fontSize: 10.5, color: '#666', marginTop: 3 }}>Adaptées à {goalLabel(goal).toLowerCase()}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 9, marginBottom: 26 }}>
                {suggestions.map(recipe => (
                  <button
                    key={recipe.id}
                    onClick={() => openSuggestion(recipe)}
                    style={{ width: '100%', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 17, padding: 15, textAlign: 'left', cursor: 'pointer', color: '#fff' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                          {recipe.tags.map(tag => (
                            <span key={tag} style={{ fontSize: 8.5, fontWeight: 900, letterSpacing: '.06em', color: ACCENT, border: '1px solid rgba(200,255,0,.18)', background: 'rgba(200,255,0,.055)', borderRadius: 999, padding: '4px 7px' }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div style={{ fontSize: 14.5, fontWeight: 900 }}>{recipe.name}</div>
                        <div style={{ fontSize: 10.5, color: '#666', marginTop: 4, lineHeight: 1.4 }}>{recipe.subtitle}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ color: ACCENT, fontSize: 15, fontWeight: 950 }}>{recipe.calories_per_serving}</div>
                        <div style={{ color: '#555', fontSize: 8.5 }}>KCAL</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: '#777', marginTop: 11 }}>
                      P {recipe.protein_per_serving}g · G {recipe.carbs_per_serving}g · L {recipe.fat_per_serving}g
                    </div>
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 950 }}>Tes recettes</div>
                <div style={{ fontSize: 10.5, color: '#666', marginTop: 3 }}>{recipes.length} recette{recipes.length > 1 ? 's' : ''} enregistrée{recipes.length > 1 ? 's' : ''}</div>
              </div>

              {recipes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '34px 20px', borderRadius: 18, background: SURFACE, border: `1px solid ${BORDER}` }}>
                  <div style={{ width: 48, height: 48, margin: '0 auto 14px', borderRadius: 15, display: 'grid', placeItems: 'center', background: 'rgba(200,255,0,.08)', border: '1px solid rgba(200,255,0,.16)', color: ACCENT, fontWeight: 950 }}>R</div>
                  <div style={{ fontSize: 16, fontWeight: 950 }}>CRÉE TA BIBLIOTHÈQUE</div>
                  <div style={{ fontSize: 11.5, color: '#777', lineHeight: 1.5, margin: '7px auto 17px', maxWidth: 300 }}>
                    Ajoute une suggestion NOX ou crée ta propre recette pour la réutiliser dans ton journal.
                  </div>
                  <button onClick={() => setView('create')} style={{ padding: '12px 18px', background: ACCENT, border: 0, borderRadius: 12, color: '#050505', fontWeight: 950, cursor: 'pointer' }}>
                    CRÉER UNE RECETTE
                  </button>
                </div>
              ) : (
                <div>
                  {recipes.map(r => (
                    <button
                      key={r.id}
                      onClick={() => { setSelected(r); setView('detail'); setActionMessage(''); setError(''); }}
                      style={{ width: '100%', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 15, padding: '14px 15px', marginBottom: 8, textAlign: 'left', cursor: 'pointer', color: '#fff' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 850, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                          <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
                            P {r.protein_per_serving || 0}g · G {r.carbs_per_serving || 0}g · L {r.fat_per_serving || 0}g
                          </div>
                        </div>
                        <div style={{ color: ACCENT, fontSize: 12, fontWeight: 900, flexShrink: 0 }}>{r.calories_per_serving || 0} kcal</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {view === 'create' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 10, color: '#666', fontWeight: 850, letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>NOM DE LA RECETTE</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex. Bowl protéiné poulet-riz"
                  style={{ width: '100%', padding: '13px 14px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, color: '#fff', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 10, color: '#666', fontWeight: 850, letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>NOMBRE DE PORTIONS</label>
                <input
                  value={form.servings}
                  onChange={e => setForm(f => ({ ...f, servings: e.target.value }))}
                  type="number"
                  min="1"
                  style={{ width: '100%', padding: '13px 14px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 800, boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              <div style={{ fontSize: 11, fontWeight: 900, color: '#777', letterSpacing: '.08em', marginBottom: 9 }}>INGRÉDIENTS</div>

              {form.ingredients.map((ing, i) => (
                <div key={i} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 13, marginBottom: 9 }}>
                  <div style={{ display: 'flex', gap: 7, marginBottom: 8 }}>
                    <input
                      value={ing.name}
                      onChange={e => updateIngredient(i, 'name', e.target.value)}
                      placeholder="Nom de l'ingrédient"
                      style={{ flex: 1, minWidth: 0, padding: '9px 10px', background: '#0b0b0b', border: `1px solid ${BORDER}`, borderRadius: 9, color: '#fff', fontSize: 12, outline: 'none' }}
                    />
                    <input
                      value={ing.qty}
                      onChange={e => updateIngredient(i, 'qty', e.target.value)}
                      placeholder="g"
                      type="number"
                      style={{ width: 64, padding: '9px 8px', background: '#0b0b0b', border: `1px solid ${BORDER}`, borderRadius: 9, color: '#fff', fontSize: 12, outline: 'none', textAlign: 'center' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 5 }}>
                    {[
                      { key: 'calories', label: 'Kcal/100g' },
                      { key: 'protein', label: 'Prot/100g' },
                      { key: 'carbs', label: 'Gluc/100g' },
                      { key: 'fat', label: 'Lip/100g' },
                    ].map(({ key, label }) => (
                      <input
                        key={key}
                        value={(ing as any)[key]}
                        onChange={e => updateIngredient(i, key, e.target.value)}
                        placeholder={label}
                        type="number"
                        style={{ width: '100%', minWidth: 0, padding: '8px 4px', background: '#0b0b0b', border: `1px solid ${BORDER}`, borderRadius: 8, color: '#ccc', fontSize: 9.5, outline: 'none', textAlign: 'center', boxSizing: 'border-box' }}
                      />
                    ))}
                  </div>

                  {i > 0 && (
                    <button onClick={() => removeIngredient(i)} style={{ marginTop: 9, padding: 0, background: 'none', border: 0, color: '#666', cursor: 'pointer', fontSize: 11 }}>
                      Supprimer cet ingrédient
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={addIngredient}
                style={{ width: '100%', padding: 12, background: 'transparent', border: `1px dashed ${BORDER}`, borderRadius: 12, color: '#777', fontWeight: 800, cursor: 'pointer', marginBottom: 16 }}
              >
                + AJOUTER UN INGRÉDIENT
              </button>

              {(() => {
                const t = totals(form.ingredients);
                const servings = Math.max(1, parseFloat(form.servings.replace(',', '.')) || 1);
                return (
                  <div style={{ background: '#0d0d0d', border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 16 }}>
                    <div style={{ fontSize: 9.5, color: '#666', fontWeight: 850, marginBottom: 10 }}>ESTIMATION PAR PORTION</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                      {[
                        ['KCAL', Math.round(t.kcal / servings), ACCENT],
                        ['PROT.', `${Math.round(t.protein / servings * 10) / 10}g`, '#fff'],
                        ['GLUC.', `${Math.round(t.carbs / servings * 10) / 10}g`, '#8da0ff'],
                        ['LIP.', `${Math.round(t.fat / servings * 10) / 10}g`, '#ff806b'],
                      ].map(([label, val, color]) => (
                        <div key={String(label)} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 16, fontWeight: 950, color: String(color) }}>{val}</div>
                          <div style={{ fontSize: 8.5, color: '#555', marginTop: 3 }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 10, color: '#666', fontWeight: 850, letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>INSTRUCTIONS</label>
                <textarea
                  value={form.steps}
                  onChange={e => setForm(f => ({ ...f, steps: e.target.value }))}
                  placeholder="Étapes de préparation..."
                  style={{ width: '100%', minHeight: 110, padding: '12px 14px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, color: '#fff', fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>

              <button
                onClick={save}
                disabled={!form.name.trim() || saving}
                style={{ width: '100%', padding: 17, background: form.name.trim() ? ACCENT : '#1a1a1a', border: 0, borderRadius: 13, color: form.name.trim() ? '#050505' : '#444', fontWeight: 950, fontSize: 14, cursor: form.name.trim() ? 'pointer' : 'not-allowed' }}
              >
                {saving ? 'ENREGISTREMENT...' : 'SAUVEGARDER LA RECETTE'}
              </button>
            </div>
          )}

          {view === 'detail' && selected && (
            <div>
              {selected.suggested && (
                <div style={{ marginBottom: 12, padding: 12, borderRadius: 12, background: 'rgba(200,255,0,.06)', border: '1px solid rgba(200,255,0,.18)', color: ACCENT, fontSize: 10.5, fontWeight: 850 }}>
                  SUGGESTION NOX · {goalLabel(goal)}
                </div>
              )}

              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 17, padding: 17, marginBottom: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                  {[
                    ['KCAL', selected.calories_per_serving || 0, ACCENT],
                    ['PROT.', `${selected.protein_per_serving || 0}g`, '#fff'],
                    ['GLUC.', `${selected.carbs_per_serving || 0}g`, '#8da0ff'],
                    ['LIP.', `${selected.fat_per_serving || 0}g`, '#ff806b'],
                  ].map(([label, val, color]) => (
                    <div key={String(label)} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 950, color: String(color) }}>{val}</div>
                      <div style={{ fontSize: 8.5, color: '#555', marginTop: 4 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {Array.isArray(selected.ingredients) && selected.ingredients.length > 0 && (
                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 17, padding: 16, marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: '#666', fontWeight: 900, letterSpacing: '.08em', marginBottom: 10 }}>INGRÉDIENTS</div>
                  {selected.ingredients.map((ing: any, i: number) => (
                    <div key={`${ing.name}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderBottom: i < selected.ingredients.length - 1 ? '1px solid #1c1c1c' : 'none' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 750 }}>{ing.name}</div>
                      <div style={{ fontSize: 11, color: '#777', flexShrink: 0 }}>{ing.qty ? `${ing.qty} g` : ''}</div>
                    </div>
                  ))}
                </div>
              )}

              {selected.steps && (
                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 17, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: '#666', fontWeight: 900, letterSpacing: '.08em', marginBottom: 9 }}>PRÉPARATION</div>
                  <div style={{ fontSize: 12.5, color: '#bbb', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{selected.steps}</div>
                </div>
              )}

              <div style={{ fontSize: 10, color: '#666', fontWeight: 850, marginBottom: 8 }}>AJOUTER AU JOURNAL</div>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 3, marginBottom: 12 }}>
                {['Petit-déjeuner', 'Déjeuner', 'Dîner', 'Snacks'].map(m => (
                  <button
                    key={m}
                    onClick={() => setSelectedMeal(m)}
                    style={{ flexShrink: 0, padding: '8px 11px', background: selectedMeal === m ? 'rgba(200,255,0,.08)' : SURFACE, border: `1px solid ${selectedMeal === m ? 'rgba(200,255,0,.35)' : BORDER}`, borderRadius: 999, color: selectedMeal === m ? ACCENT : '#777', fontSize: 10, fontWeight: 850, cursor: 'pointer' }}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <button
                onClick={async () => {
                  const ok = await useRecipe(selected);
                  if (ok) setView('list');
                }}
                style={{ width: '100%', padding: 17, background: ACCENT, border: 0, borderRadius: 13, color: '#050505', fontWeight: 950, fontSize: 14, cursor: 'pointer', marginBottom: 9 }}
              >
                AJOUTER AU JOURNAL · {selected.calories_per_serving || 0} KCAL
              </button>

              {selected.suggested ? (
                <button
                  onClick={() => saveSuggestion(selected)}
                  disabled={saving}
                  style={{ width: '100%', padding: 14, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, color: '#ddd', fontWeight: 850, cursor: 'pointer' }}
                >
                  {saving ? 'AJOUT...' : 'ENREGISTRER DANS MES RECETTES'}
                </button>
              ) : (
                <button
                  onClick={() => deleteRecipe(selected.id)}
                  style={{ width: '100%', padding: 12, background: 'transparent', border: '1px solid rgba(255,80,70,.22)', borderRadius: 12, color: '#ff7770', fontWeight: 750, cursor: 'pointer' }}
                >
                  Supprimer la recette
                </button>
              )}
            </div>
          )}
        </section>
      </main>

      <BottomNav active="fuel" />
    </div>
  );
}
