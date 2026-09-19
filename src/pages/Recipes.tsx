import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from '../components/BottomNav';

const ACCENT = '#B7FF00';
const BG = '#FFFFFF';
const SURFACE = '#FFFFFF';
const BORDER = '#EAEAEA';

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
    subtitle: 'Une option simple avec une portion importante de protéines.',
    servings: 1,
    calories_per_serving: 515,
    protein_per_serving: 52,
    carbs_per_serving: 51,
    fat_per_serving: 11,
    tags: ['RICHE EN PROTÉINES', '20 MIN'],
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
    subtitle: 'Une option rapide avec une portion généreuse de protéines.',
    servings: 1,
    calories_per_serving: 390,
    protein_per_serving: 35,
    carbs_per_serving: 49,
    fat_per_serving: 7,
    tags: ['PETIT-DÉJ', '5 MIN'],
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
    subtitle: 'Un dîner avec protéines, glucides et lipides.',
    servings: 1,
    calories_per_serving: 560,
    protein_per_serving: 42,
    carbs_per_serving: 52,
    fat_per_serving: 20,
    tags: ['DÎNER', 'SAUMON'],
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
    subtitle: 'Pratique pour un déjeuner avec protéines, glucides et lipides.',
    servings: 1,
    calories_per_serving: 620,
    protein_per_serving: 48,
    carbs_per_serving: 61,
    fat_per_serving: 21,
    tags: ['RAPIDE', 'DÉJEUNER'],
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
    subtitle: 'Une option simple et protéinée pour les journées actives.',
    servings: 1,
    calories_per_serving: 650,
    protein_per_serving: 50,
    carbs_per_serving: 78,
    fat_per_serving: 15,
    tags: ['RICHE EN PROTÉINES', '20 MIN'],
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
    subtitle: 'Une option plus calorique avec une portion importante de protéines.',
    servings: 1,
    calories_per_serving: 720,
    protein_per_serving: 42,
    carbs_per_serving: 91,
    fat_per_serving: 22,
    tags: ['PRISE DE MUSCLE', 'PETIT-DÉJ', 'ÉNERGIE'],
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
    subtitle: 'Un repas plus calorique et protéiné, proposé pour une cible de prise de muscle.',
    servings: 1,
    calories_per_serving: 790,
    protein_per_serving: 55,
    carbs_per_serving: 96,
    fat_per_serving: 20,
    tags: ['PRISE DE MUSCLE', 'RICHE EN PROTÉINES', 'REPAS'],
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
    name: 'Smoothie banane, avoine & protéines',
    subtitle: 'Une option liquide pour varier les collations et ajuster facilement la portion.',
    servings: 1,
    calories_per_serving: 680,
    protein_per_serving: 45,
    carbs_per_serving: 78,
    fat_per_serving: 21,
    tags: ['PRISE DE MUSCLE', 'COLLATION', '5 MIN'],
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
  goal === 'cut' ? 'PERTE DE POIDS' : goal === 'bulk' ? 'PRISE DE MUSCLE' : 'MAINTIEN';

const recipeFit = (recipe: SuggestedRecipe, dailyCalories: number | null, dailyProtein: number | null) => {
  if (!dailyCalories) return 'Suggestion à adapter à ta journée';
  const kcalShare = recipe.calories_per_serving / dailyCalories;
  const proteinShare = dailyProtein ? recipe.protein_per_serving / dailyProtein : 0;
  if (proteinShare >= .25) return 'Contribue fortement à ta cible protéines';
  if (kcalShare <= .25) return 'Facile à intégrer à ta cible du jour';
  return 'À ajuster selon ta cible et le reste de ta journée';
};

export default function Recipes() {
  const { user } = useAuth();
  const [view, setView] = useState<View>('list');
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selectedMeal, setSelectedMeal] = useState('Déjeuner');
  const [portions, setPortions] = useState(1);
  const [selected, setSelected] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [nutritionTarget, setNutritionTarget] = useState<any>(null);
  const [recentFoods, setRecentFoods] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
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
    if (!user) return;
    const saved = localStorage.getItem('nox_recipe_favorites_' + user.id);
    if (saved) { try { setFavorites(JSON.parse(saved)); } catch { setFavorites([]); } }
    load();
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
        { data: recentFoodData, error: recentFoodError },
      ] = await Promise.all([
        supabase.from('recipes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('nutrition_targets').select('calories, protein, carbs, fat').eq('user_id', user.id).maybeSingle(),
        supabase.from('food_entries').select('food_name, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(40),
      ]);

      if (recipeError) throw recipeError;
      if (profileError) throw profileError;
      if (targetError) throw targetError;
      if (recentFoodError) throw recentFoodError;

      setRecipes(recipeData || []);
      setProfile(profileData || null);
      setNutritionTarget(targetData || null);
      setRecentFoods(recentFoodData || []);
    } catch (err: any) {
      console.error('RECIPES_LOAD_ERROR', err);
      setError(err?.message || 'Impossible de charger les recettes.');
    } finally {
      setLoading(false);
    }
  };

  const goal = normalizeGoal(profile?.goal_type || profile?.goal || profile?.objective);
  const suggestions = useMemo(() => {
    const recentNames = recentFoods.map(f => String(f.food_name || '').toLowerCase()).filter(Boolean);
    const scored = SUGGESTIONS.filter(r => r.goal === goal || r.goal === 'all').map(recipe => {
      const haystack = [recipe.name, ...recipe.ingredients.map(i => i.name)].join(' ').toLowerCase();
      const familiarity = recentNames.reduce((score, name) => score + (haystack.includes(name) ? 1 : 0), 0);
      return { recipe, familiarity };
    });
    return scored.sort((a,b) => b.familiarity - a.familiarity).map(x => x.recipe);
  }, [goal, recentFoods]);

  const filteredSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = showFavoritesOnly ? suggestions.filter(recipe => favorites.includes(recipe.id)) : suggestions;
    if (!q) return base;
    return base.filter(recipe =>
      [recipe.name, recipe.subtitle, ...recipe.tags, ...recipe.ingredients.map(i => i.name)]
        .join(' ').toLowerCase().includes(q)
    );
  }, [suggestions, search, showFavoritesOnly, favorites]);

  const filteredRecipes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter(recipe => String(recipe.name || '').toLowerCase().includes(q));
  }, [recipes, search]);

  const toggleFavorite = (id: string) => {
    if (!user) return;
    setFavorites(current => {
      const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
      localStorage.setItem('nox_recipe_favorites_' + user.id, JSON.stringify(next));
      return next;
    });
  };

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
    setPortions(1);
  };

  const dailyCalories = Number(nutritionTarget?.calories || 0) > 0
    ? Number(nutritionTarget.calories)
    : null;
  const dailyProtein = Number(nutritionTarget?.protein || 0) > 0
    ? Number(nutritionTarget.protein)
    : null;

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#0A0A0A', paddingBottom: 96 }}>
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
              <div style={{ fontSize: 10, color: '#555', fontWeight: 900, letterSpacing: '.12em' }}>NUTRITION · NOX</div>
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
            <div style={{ marginBottom: 14, padding: 13, borderRadius: 13, background: 'rgba(255,80,70,.08)', border: '1px solid rgba(255,80,70,.25)', color: '#B42318', fontSize: 12, lineHeight: 1.45 }}>
              {error}
            </div>
          )}

          {actionMessage && (
            <div style={{ marginBottom: 14, padding: 13, borderRadius: 13, background: '#F4FFE0', border: '1px solid #D8F29B', color: '#3F5F00', fontSize: 12, lineHeight: 1.45 }}>
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
              <div style={{ padding: 17, borderRadius: 18, background: '#0A0A0A', border: '1px solid #0A0A0A', marginBottom: 22 }}>
                <div style={{ fontSize: 9.5, color: ACCENT, fontWeight: 950, letterSpacing: '.1em' }}>RECETTES · SUGGESTIONS</div>
                <div style={{ fontSize: 18, fontWeight: 950, marginTop: 6, color: '#fff' }}>{goalLabel(goal)}</div>
                <div style={{ fontSize: 11.5, color: '#AAA', lineHeight: 1.5, marginTop: 6 }}>
                  Idées de repas filtrées selon ton objectif et rapprochées des aliments déjà présents dans ton journal quand une correspondance existe. Aucune recette n’est classée « bonne » ou « mauvaise » : les valeurs sont indicatives et restent modifiables avant ajout.
                  {dailyCalories ? ` Même cible que Nutrition : ${Math.round(dailyCalories)} kcal/jour` : ''}
                  {dailyProtein ? ` · ${Math.round(dailyProtein)} g protéines` : ''}.
                  {!dailyCalories ? ' Enregistre une cible dans Nutrition pour personnaliser davantage ces suggestions.' : ''}
                </div>
              </div>

              <div style={{marginBottom:14}}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher une recette ou un ingrédient" style={{width:'100%',boxSizing:'border-box',padding:'12px 13px',border:'1px solid '+BORDER,borderRadius:12,background:'#F7F7F7',color:'#0A0A0A',fontSize:12,outline:'none'}}/></div>

              <div style={{display:'flex',gap:7,marginBottom:12}}>
                <button onClick={()=>setShowFavoritesOnly(false)} style={{border:'1px solid '+(!showFavoritesOnly?ACCENT:BORDER),background:!showFavoritesOnly?ACCENT:'#fff',borderRadius:999,padding:'7px 11px',fontSize:9.5,fontWeight:900,cursor:'pointer'}}>POUR TOI</button>
                <button onClick={()=>setShowFavoritesOnly(true)} style={{border:'1px solid '+(showFavoritesOnly?ACCENT:BORDER),background:showFavoritesOnly?ACCENT:'#fff',borderRadius:999,padding:'7px 11px',fontSize:9.5,fontWeight:900,cursor:'pointer'}}>★ FAVORIS</button>
              </div>

              <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 950 }}>Idées pour toi</div>
                  <div style={{ fontSize: 10.5, color: '#666', marginTop: 3 }}>Suggestions basées sur ton objectif, ta cible nutritionnelle et tes aliments récents · à ajuster selon ta journée</div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 9, marginBottom: 26 }}>
                {filteredSuggestions.map(recipe => (
                  <button
                    key={recipe.id}
                    onClick={() => openSuggestion(recipe)}
                    style={{ width: '100%', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 17, padding: 15, textAlign: 'left', cursor: 'pointer', color: '#0A0A0A' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                          {recipe.tags.map(tag => (
                            <span key={tag} style={{ fontSize: 8.5, fontWeight: 900, letterSpacing: '.06em', color: '#3F5F00', border: '1px solid #D8F29B', background: '#F4FFE0', borderRadius: 999, padding: '4px 7px' }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div style={{ fontSize: 14.5, fontWeight: 900 }}>{favorites.includes(recipe.id) ? '★ ' : ''}{recipe.name}</div>
                        <div style={{ fontSize: 10.5, color: '#666', marginTop: 4, lineHeight: 1.4 }}>{recipe.subtitle}</div>
                        <div style={{fontSize:9.5,color:'#5A7200',fontWeight:800,marginTop:6}}>{recipeFit(recipe,dailyCalories,dailyProtein)}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ color: '#0A0A0A', fontSize: 15, fontWeight: 950 }}>{recipe.calories_per_serving}</div>
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
                  <div style={{ width: 48, height: 48, margin: '0 auto 14px', borderRadius: 15, display: 'grid', placeItems: 'center', background: 'rgba(183,255,0,.08)', border: '1px solid rgba(183,255,0,.16)', color: ACCENT, fontWeight: 950 }}>R</div>
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
                  {filteredRecipes.map(r => (
                    <button
                      key={r.id}
                      onClick={() => { setSelected(r); setView('detail'); setActionMessage(''); setError(''); setPortions(1); }}
                      style={{ width: '100%', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 15, padding: '14px 15px', marginBottom: 8, textAlign: 'left', cursor: 'pointer', color: '#0A0A0A' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 850, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                          <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
                            P {r.protein_per_serving || 0}g · G {r.carbs_per_serving || 0}g · L {r.fat_per_serving || 0}g
                          </div>
                        </div>
                        <div style={{ color: '#0A0A0A', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>{r.calories_per_serving || 0} kcal</div>
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
                  style={{ width: '100%', padding: '13px 14px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, color: '#0A0A0A', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 10, color: '#666', fontWeight: 850, letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>NOMBRE DE PORTIONS</label>
                <input
                  value={form.servings}
                  onChange={e => setForm(f => ({ ...f, servings: e.target.value }))}
                  type="number"
                  min="1"
                  style={{ width: '100%', padding: '13px 14px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, color: '#0A0A0A', fontSize: 15, fontWeight: 800, boxSizing: 'border-box', outline: 'none' }}
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
                      style={{ flex: 1, minWidth: 0, padding: '9px 10px', background: '#F7F7F7', border: `1px solid ${BORDER}`, borderRadius: 9, color: '#0A0A0A', fontSize: 12, outline: 'none' }}
                    />
                    <input
                      value={ing.qty}
                      onChange={e => updateIngredient(i, 'qty', e.target.value)}
                      placeholder="g"
                      type="number"
                      style={{ width: 64, padding: '9px 8px', background: '#F7F7F7', border: `1px solid ${BORDER}`, borderRadius: 9, color: '#0A0A0A', fontSize: 12, outline: 'none', textAlign: 'center' }}
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
                        style={{ width: '100%', minWidth: 0, padding: '8px 4px', background: '#F7F7F7', border: `1px solid ${BORDER}`, borderRadius: 8, color: '#0A0A0A', fontSize: 9.5, outline: 'none', textAlign: 'center', boxSizing: 'border-box' }}
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
                  <div style={{ background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 16 }}>
                    <div style={{ fontSize: 9.5, color: '#666', fontWeight: 850, marginBottom: 10 }}>ESTIMATION PAR PORTION</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                      {[
                        ['KCAL', Math.round(t.kcal / servings), '#0A0A0A'],
                        ['PROT.', `${Math.round(t.protein / servings * 10) / 10}g`, '#0A0A0A'],
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
                  style={{ width: '100%', minHeight: 110, padding: '12px 14px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, color: '#0A0A0A', fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>

              <button
                onClick={save}
                disabled={!form.name.trim() || saving}
                style={{ width: '100%', padding: 17, background: form.name.trim() ? ACCENT : '#E5E5E5', border: 0, borderRadius: 13, color: form.name.trim() ? '#050505' : '#888', fontWeight: 950, fontSize: 14, cursor: form.name.trim() ? 'pointer' : 'not-allowed' }}
              >
                {saving ? 'ENREGISTREMENT...' : 'SAUVEGARDER LA RECETTE'}
              </button>
            </div>
          )}

          {view === 'detail' && selected && (
            <div>
              {selected.suggested && (
                <div style={{ marginBottom: 12, padding: 12, borderRadius: 12, background: '#F4FFE0', border: '1px solid #D8F29B', color: '#3F5F00', fontSize: 10.5, fontWeight: 850 }}>
                  SUGGESTION NOX · MODIFIABLE · {goalLabel(goal)}
                </div>
              )}

              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 17, padding: 17, marginBottom: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                  {[
                    ['KCAL', selected.calories_per_serving || 0, '#0A0A0A'],
                    ['PROT.', `${selected.protein_per_serving || 0}g`, '#0A0A0A'],
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
                    <div key={`${ing.name}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderBottom: i < selected.ingredients.length - 1 ? '1px solid #EAEAEA' : 'none' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 750 }}>{ing.name}</div>
                      <div style={{ fontSize: 11, color: '#777', flexShrink: 0 }}>{ing.qty ? `${ing.qty} g` : ''}</div>
                    </div>
                  ))}
                </div>
              )}

              {selected.steps && (
                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 17, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: '#666', fontWeight: 900, letterSpacing: '.08em', marginBottom: 9 }}>PRÉPARATION</div>
                  <div style={{ fontSize: 12.5, color: '#444', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{selected.steps}</div>
                </div>
              )}

              <div style={{ fontSize: 10, color: '#666', fontWeight: 850, marginBottom: 8 }}>AJOUTER AU JOURNAL</div>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 3, marginBottom: 12 }}>
                {['Petit-déjeuner', 'Déjeuner', 'Dîner', 'Snacks'].map(m => (
                  <button
                    key={m}
                    onClick={() => setSelectedMeal(m)}
                    style={{ flexShrink: 0, padding: '8px 11px', background: selectedMeal === m ? ACCENT : SURFACE, border: `1px solid ${selectedMeal === m ? ACCENT : BORDER}`, borderRadius: 999, color: selectedMeal === m ? '#0A0A0A' : '#777', fontSize: 10, fontWeight: 850, cursor: 'pointer' }}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 12px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, marginBottom: 9 }}>
                <div><div style={{ fontSize: 9, color: '#777', fontWeight: 900 }}>PORTIONS</div><div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Ajuste avant l’ajout</div></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button onClick={() => setPortions(p => Math.max(.5, p - .5))} style={{ width: 32, height: 32, borderRadius: 10, border: `1px solid ${BORDER}`, background: '#fff', fontWeight: 950, cursor: 'pointer' }}>−</button>
                  <strong style={{ minWidth: 30, textAlign: 'center' }}>{portions}</strong>
                  <button onClick={() => setPortions(p => Math.min(10, p + .5))} style={{ width: 32, height: 32, borderRadius: 10, border: `1px solid ${BORDER}`, background: '#fff', fontWeight: 950, cursor: 'pointer' }}>+</button>
                </div>
              </div>
              <button
                onClick={async () => {
                  const ok = await useRecipe(selected, portions);
                  if (ok) setView('list');
                }}
                style={{ width: '100%', padding: 17, background: ACCENT, border: 0, borderRadius: 13, color: '#050505', fontWeight: 950, fontSize: 14, cursor: 'pointer', marginBottom: 9 }}
              >
                AJOUTER AU JOURNAL · {Math.round((selected.calories_per_serving || 0) * portions)} KCAL
              </button>

              {selected.suggested && <button onClick={() => toggleFavorite(selected.id)} style={{ width: '100%', padding: 14, marginBottom: 9, background: favorites.includes(selected.id) ? '#F4FFE0' : SURFACE, border: `1px solid ${favorites.includes(selected.id) ? '#D8F29B' : BORDER}`, borderRadius: 12, color: '#333', fontWeight: 850, cursor: 'pointer' }}>{favorites.includes(selected.id) ? '★ RETIRER DES FAVORIS' : '☆ AJOUTER AUX FAVORIS'}</button>}

              {selected.suggested ? (
                <button
                  onClick={() => saveSuggestion(selected)}
                  disabled={saving}
                  style={{ width: '100%', padding: 14, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, color: '#333', fontWeight: 850, cursor: 'pointer' }}
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
