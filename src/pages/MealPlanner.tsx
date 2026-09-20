import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const BG = '#FFFFFF';
const SURFACE = '#F7F7F4';
const BORDER = '#E7E7E2';
const MEALS = ['Petit-déjeuner', 'Déjeuner', 'Dîner', 'Snacks'];

type GoalKey = 'cut' | 'maintain' | 'bulk';

type PlannedEntry = {
  id: string;
  planned_date: string;
  meal_type: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs?: number;
  fat?: number;
  ingredients?: any[];
  instructions?: string[];
  missing_ingredients?: string[];
  fridge_ingredients?: string[];
  image_url?: string | null;
  prep_time_min?: number;
  servings?: number;
  ai_generated?: boolean;
  logged?: boolean;
};

type Day = {
  date: string;
  label: string;
  entries: PlannedEntry[];
};

type Profile = {
  goal?: string | null;
  goal_type?: string | null;
  objective?: string | null;
  weight?: number | null;
  starting_weight_kg?: number | null;
  height?: number | null;
  age?: number | null;
  gender?: string | null;
  activity_level?: string | number | null;
  daily_calories?: number | null;
  calorie_target?: number | null;
  protein_target?: number | null;
};

type MealTemplate = {
  name: string;
  calories: number;
  protein: number;
};

type NutritionTarget = {
  calories: number;
  protein: number;
  carbs?: number | null;
  fat?: number | null;
};

type PlanMode = 'fridge' | 'shopping';

type ShoppingPrefs = {
  budget: string;
  store: string;
  days: number;
};

const TEMPLATES: Record<GoalKey, Record<string, MealTemplate[]>> = {
  cut: {
    'Petit-déjeuner': [
      { name: 'Skyr, fruits rouges et flocons d’avoine', calories: 380, protein: 32 },
      { name: 'Omelette légère, pain complet et fruit', calories: 410, protein: 31 },
      { name: 'Bowl fromage blanc, banane et chia', calories: 390, protein: 30 },
    ],
    'Déjeuner': [
      { name: 'Poulet, riz basmati et légumes', calories: 560, protein: 48 },
      { name: 'Bowl thon, pommes de terre et crudités', calories: 530, protein: 45 },
      { name: 'Dinde, quinoa et légumes grillés', calories: 550, protein: 46 },
    ],
    'Dîner': [
      { name: 'Saumon, légumes et pommes de terre', calories: 570, protein: 42 },
      { name: 'Steak 5%, haricots verts et riz', calories: 540, protein: 47 },
      { name: 'Cabillaud, semoule et ratatouille', calories: 510, protein: 44 },
    ],
    'Snacks': [
      { name: 'Skyr et pomme', calories: 190, protein: 18 },
      { name: 'Fromage blanc et kiwi', calories: 180, protein: 17 },
      { name: 'Shake protéiné et fruit', calories: 210, protein: 24 },
    ],
  },
  maintain: {
    'Petit-déjeuner': [
      { name: 'Porridge protéiné, banane et beurre de cacahuète', calories: 520, protein: 34 },
      { name: 'Œufs, pain complet, avocat et fruit', calories: 540, protein: 31 },
      { name: 'Skyr, granola, fruits et amandes', calories: 500, protein: 32 },
    ],
    'Déjeuner': [
      { name: 'Poulet, riz, légumes et huile d’olive', calories: 680, protein: 48 },
      { name: 'Pâtes complètes au bœuf et légumes', calories: 700, protein: 46 },
      { name: 'Bowl saumon, riz et avocat', calories: 690, protein: 43 },
    ],
    'Dîner': [
      { name: 'Dinde, patate douce et légumes', calories: 640, protein: 47 },
      { name: 'Saumon, quinoa et légumes', calories: 670, protein: 43 },
      { name: 'Chili de bœuf, riz et haricots', calories: 690, protein: 48 },
    ],
    'Snacks': [
      { name: 'Yaourt grec, fruit et noix', calories: 290, protein: 20 },
      { name: 'Shake protéiné, banane et lait', calories: 310, protein: 28 },
      { name: 'Tartines complètes et fromage blanc', calories: 300, protein: 23 },
    ],
  },
  bulk: {
    'Petit-déjeuner': [
      { name: 'Porridge mass, banane, lait et beurre de cacahuète', calories: 680, protein: 39 },
      { name: 'Œufs, pain complet, avocat, skyr et fruit', calories: 700, protein: 42 },
      { name: 'Pancakes protéinés, banane et yaourt grec', calories: 660, protein: 40 },
    ],
    'Déjeuner': [
      { name: 'Poulet, riz, avocat et légumes', calories: 850, protein: 55 },
      { name: 'Pâtes au bœuf, parmesan et légumes', calories: 880, protein: 54 },
      { name: 'Saumon, riz, avocat et huile d’olive', calories: 860, protein: 49 },
    ],
    'Dîner': [
      { name: 'Steak, pommes de terre, légumes et huile d’olive', calories: 820, protein: 53 },
      { name: 'Dinde, pâtes, pesto et légumes', calories: 840, protein: 55 },
      { name: 'Chili de bœuf, riz et fromage', calories: 850, protein: 52 },
    ],
    'Snacks': [
      { name: 'Shake protéiné, avoine, banane et beurre de cacahuète', calories: 450, protein: 32 },
      { name: 'Skyr, granola, miel et noix', calories: 430, protein: 28 },
      { name: 'Sandwich complet dinde-fromage et fruit', calories: 460, protein: 31 },
    ],
  },
};

function normalizeGoal(raw?: string | null): GoalKey {
  const goal = (raw || '').toLowerCase();
  if (goal.includes('loss') || goal.includes('lose') || goal.includes('cut') || goal.includes('sèche') || goal.includes('seche') || goal.includes('fat')) return 'cut';
  if (goal.includes('gain') || goal.includes('muscle') || goal.includes('bulk') || goal.includes('masse') || goal.includes('hypertroph')) return 'bulk';
  return 'maintain';
}

function goalLabel(goal: GoalKey) {
  return goal === 'cut' ? 'Sèche' : goal === 'bulk' ? 'Prise de masse' : 'Maintien';
}

function isoDate(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().split('T')[0];
}

function buildWeek(): Day[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return {
      date: isoDate(d),
      label: i === 0 ? "Aujourd'hui" : i === 1 ? 'Demain' : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' }),
      entries: [],
    };
  });
}


type FridgeFood = {
  nom: string;
  quantite_estimee?: string;
  categorie?: string;
  confiance?: string;
};

type FridgeAnalysis = {
  mode?: 'fridge';
  etat: 'utilisable' | 'insuffisant' | 'peu_adapte' | 'vide';
  resume?: string;
  aliments: FridgeFood[];
  manques?: string[];
  fiabilite?: string;
  note?: string;
};

async function imageFileToPayload(file: File) {
  if (file.size > 15 * 1024 * 1024) throw new Error('Image trop volumineuse (15 Mo maximum).');

  const bitmap = await createImageBitmap(file);
  const maxSide = 1400;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Impossible de préparer l'image.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', .8));
  if (!blob) throw new Error("Impossible de compresser l'image.");

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      resolve(value.includes(',') ? value.split(',')[1] : value);
    };
    reader.onerror = () => reject(new Error("Impossible de lire l'image."));
    reader.readAsDataURL(blob);
  });

  return { base64, mime: 'image/jpeg' };
}

export default function MealPlanner() {
  const { user } = useAuth();
  const [week, setWeek] = useState<Day[]>(() => buildWeek());
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nutritionTarget, setNutritionTarget] = useState<NutritionTarget | null>(null);
  const [showAdd, setShowAdd] = useState<{ date: string; meal: string } | null>(null);
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fridgeInputRef = useRef<HTMLInputElement | null>(null);
  const [fridgeAnalyzing, setFridgeAnalyzing] = useState(false);
  const [fridgeAnalysis, setFridgeAnalysis] = useState<FridgeAnalysis | null>(null);
  const [fridgeFoods, setFridgeFoods] = useState<FridgeFood[]>([]);
  const [planMode, setPlanMode] = useState<PlanMode>('fridge');
  const [showShopping, setShowShopping] = useState(false);
  const [shoppingPrefs, setShoppingPrefs] = useState<ShoppingPrefs>({ budget: '', store: '', days: 7 });
  const [selectedMeal, setSelectedMeal] = useState<PlannedEntry | null>(null);


  const goal = normalizeGoal(profile?.goal_type || profile?.goal || profile?.objective);

  useEffect(() => {
    if (!user) return;
    const initial = buildWeek();
    setWeek(initial);
    void loadProfile();
    void load(initial);
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const [profileResult, targetResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('nutrition_targets').select('calories, protein_g, carbs_g, fat_g, carbs, fat').eq('user_id', user.id).maybeSingle(),
    ]);

    if (profileResult.error) {
      console.error('MEAL_PLANNER_PROFILE_ERROR', profileResult.error);
      setError(profileResult.error.message);
      return;
    }

    if (targetResult.error) {
      console.error('MEAL_PLANNER_TARGET_ERROR', targetResult.error);
      setError(targetResult.error.message);
      return;
    }

    setProfile(profileResult.data || null);

    const target = targetResult.data;
    const kcal = Number(target?.calories || 0);
    const protein = Number(target?.protein_g || 0);

    setNutritionTarget(
      kcal > 0
        ? {
            calories: kcal,
            protein: protein > 0 ? protein : 0,
            carbs: Number(target?.carbs_g ?? target?.carbs ?? 0),
            fat: Number(target?.fat_g ?? target?.fat ?? 0),
          }
        : null,
    );
  };

  const load = async (baseWeek?: Day[]) => {
    if (!user) return;
    setLoading(true);
    const days = baseWeek || buildWeek();
    const start = days[0].date;
    const end = days[days.length - 1].date;

    const { data, error } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', user.id)
      .gte('planned_date', start)
      .lte('planned_date', end)
      .order('planned_date');

    if (error) {
      console.error('MEAL_PLANNER_LOAD_ERROR', error);
      setError(error.message);
      setLoading(false);
      return;
    }

    setWeek(days.map(day => ({
      ...day,
      entries: (data || []).filter((entry: any) => entry.planned_date === day.date),
    })));
    setLoading(false);
  };

  const targetCalories = useMemo(() => {
    const centralized = Number(nutritionTarget?.calories || 0);
    return centralized >= 1200 && centralized <= 5000 ? Math.round(centralized) : 0;
  }, [nutritionTarget]);

  const targetProtein = useMemo(() => {
    const centralized = Number(nutritionTarget?.protein || 0);
    return centralized > 0 ? Math.round(centralized) : 0;
  }, [nutritionTarget]);

  const analyzeFridge = async (file?: File) => {
    if (!file || fridgeAnalyzing) return;
    setFridgeAnalyzing(true);
    setError('');
    setMessage('');

    try {
      const payload = await imageFileToPayload(file);
      const { data, error: fnError } = await supabase.functions.invoke('analyze-meal', {
        body: { ...payload, mode: 'fridge' },
      });

      if (fnError) throw fnError;
      if (!data || !Array.isArray(data.aliments) || !data.etat) {
        throw new Error("L'analyse du frigo est incomplète.");
      }

      const result = data as FridgeAnalysis;
      setFridgeAnalysis(result);
      setFridgeFoods(result.aliments || []);

      if (result.etat === 'vide') {
        setMessage("Le frigo semble vide. NOX va te proposer un parcours courses selon ton budget et ton enseigne.");
      } else if (result.etat === 'peu_adapte') {
        setMessage("Le contenu détecté ne suffit pas pour construire un plan cohérent. NOX te proposera directement les compléments à acheter.");
      } else if (result.etat === 'insuffisant') {
        setMessage("Quelques aliments sont utilisables, mais il manque des éléments pour construire le plan complet.");
      } else {
        setMessage("Frigo analysé. Vérifie les aliments détectés avant la génération.");
      }
    } catch (e: any) {
      console.error('FRIDGE_ANALYSIS_ERROR', e);
      setError(e?.message || "Impossible d'analyser le frigo.");
    } finally {
      setFridgeAnalyzing(false);
      if (fridgeInputRef.current) fridgeInputRef.current.value = '';
    }
  };

  const removeFridgeFood = (index: number) => {
    setFridgeFoods(current => current.filter((_, i) => i !== index));
  };

  const openShopping = () => {
    setPlanMode('shopping');
    setShowShopping(true);
    setError('');
  };

  const markFridgeEmpty = () => {
    setFridgeAnalysis({
      mode: 'fridge',
      etat: 'vide',
      resume: 'Frigo déclaré vide.',
      aliments: [],
      manques: ['protéines', 'féculents', 'légumes', 'fruits', 'matières grasses'],
      fiabilite: 'haute',
      note: 'Préparer une liste de courses selon le budget et l’enseigne.',
    });
    setFridgeFoods([]);
    openShopping();
  };

  const selectPlanMode = (mode: PlanMode) => {
    setPlanMode(mode);
    setError('');
    if (mode === 'shopping') {
      setShowShopping(true);
      return;
    }
    setShowShopping(false);
    if (!fridgeFoods.length) {
      setMessage("Scanne d’abord ton frigo pour que NOX puisse utiliser ce que tu as déjà.");
    } else if (fridgeAnalysis?.etat === 'insuffisant' || fridgeAnalysis?.etat === 'peu_adapte') {
      setMessage("NOX utilisera ce qui est exploitable et devra compléter avec une liste de courses.");
    } else {
      setMessage("Mode frigo sélectionné.");
    }
  };

  const validateShopping = () => {
    const budget = Number(String(shoppingPrefs.budget).replace(',', '.'));
    if (!Number.isFinite(budget) || budget <= 0) {
      setError('Indique un budget supérieur à 0 €.');
      return;
    }
    if (!shoppingPrefs.store.trim()) {
      setError('Indique ton enseigne de courses.');
      return;
    }
    setError('');
    setShowShopping(false);
    setMessage(`Courses rapides configurées : ${Math.round(budget)} € · ${shoppingPrefs.store.trim()} · ${shoppingPrefs.days} jours.`);
  };

  const generatePlan = async () => {
    if (!user || generating) return;
    if (!targetCalories || !targetProtein) {
      setError("Complète d'abord ton objectif nutritionnel pour générer un plan.");
      return;
    }
    if (planMode === 'fridge' && !fridgeFoods.length) {
      setError("Scanne ton frigo avant de générer avec ce mode, ou choisis Courses rapides.");
      return;
    }
    if (planMode === 'fridge' && (fridgeAnalysis?.etat === 'insuffisant' || fridgeAnalysis?.etat === 'peu_adapte')) {
      setPlanMode('shopping');
      setShowShopping(true);
      setMessage("Ton frigo ne suffit pas pour une semaine cohérente. Indique ton budget et ton enseigne pour compléter les ingrédients.");
      return;
    }

    const budget = Number(String(shoppingPrefs.budget).replace(',', '.'));
    if (planMode === 'shopping' && (!Number.isFinite(budget) || budget <= 0 || !shoppingPrefs.store.trim())) {
      setShowShopping(true);
      setError('Renseigne ton budget et ton enseigne avant de continuer.');
      return;
    }

    setGenerating(true);
    setError('');
    setMessage('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-meal-plan', {
        body: {
          mode: planMode,
          goal,
          days: planMode === 'shopping' ? shoppingPrefs.days : 7,
          target: {
            calories: targetCalories,
            protein: targetProtein,
            carbs: Number(nutritionTarget?.carbs || 0),
            fat: Number(nutritionTarget?.fat || 0),
          },
          fridgeFoods,
          shopping: planMode === 'shopping'
            ? { budget, store: shoppingPrefs.store.trim() }
            : null,
        },
      });

      if (fnError) throw fnError;
      if (!data || !Array.isArray(data.days)) throw new Error('Le plan IA reçu est invalide.');

      const existingDates = new Set(
        week.flatMap(day => day.entries.map(e => `${e.planned_date}|${e.meal_type}`))
      );
      const rows: any[] = [];

      for (const day of data.days) {
        if (!day?.date || !Array.isArray(day?.meals)) continue;
        for (const meal of day.meals) {
          if (!meal?.name || !meal?.meal_type) continue;
          if (existingDates.has(`${day.date}|${meal.meal_type}`)) continue;

          rows.push({
            user_id: user.id,
            planned_date: day.date,
            meal_type: meal.meal_type,
            food_name: meal.name,
            calories: Math.max(0, Math.round(Number(meal.calories || 0))),
            protein: Math.max(0, Math.round(Number(meal.protein || 0))),
            carbs: Math.max(0, Math.round(Number(meal.carbs || 0))),
            fat: Math.max(0, Math.round(Number(meal.fat || 0))),
            ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : [],
            instructions: Array.isArray(meal.instructions) ? meal.instructions : [],
            missing_ingredients: Array.isArray(meal.missing_ingredients) ? meal.missing_ingredients : [],
            fridge_ingredients: Array.isArray(meal.fridge_ingredients) ? meal.fridge_ingredients : [],
            image_url: null,
            prep_time_min: Math.max(0, Math.round(Number(meal.prep_time_min || 0))),
            servings: Math.max(1, Math.round(Number(meal.servings || 1))),
            ai_generated: true,
            created_at: new Date().toISOString(),
          });
        }
      }

      if (!rows.length) {
        setMessage('Aucun nouveau repas à ajouter : les créneaux générés sont déjà planifiés.');
        return;
      }

      const { error: insertError } = await supabase.from('meal_plans').insert(rows);
      if (insertError) throw insertError;

      await load();

      const shoppingCount = Array.isArray(data.shopping_list) ? data.shopping_list.length : 0;
      setMessage(
        planMode === 'shopping'
          ? `Plan IA généré pour ${shoppingPrefs.days} jours. ${shoppingCount} article${shoppingCount > 1 ? 's' : ''} de courses proposé${shoppingCount > 1 ? 's' : ''}.`
          : `Plan IA généré à partir de ton frigo : petits-déjeuners, déjeuners et dîners sont prêts.`
      );
    } catch (e: any) {
      console.error('MEAL_PLAN_AI_GENERATE_ERROR', e);
      setError(e?.message || 'Impossible de générer le plan repas avec NOX AI.');
    } finally {
      setGenerating(false);
    }
  };

  const addPlanned = async () => {
    if (!user || !showAdd || !foodName.trim() || saving) return;

    const kcal = Number(String(calories).replace(',', '.'));
    const prot = Number(String(protein).replace(',', '.'));

    if (!Number.isFinite(kcal) || kcal < 0 || !Number.isFinite(prot) || prot < 0) {
      setError('Calories et protéines doivent être des nombres positifs.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { error } = await supabase.from('meal_plans').insert({
        user_id: user.id,
        planned_date: showAdd.date,
        meal_type: showAdd.meal,
        food_name: foodName.trim(),
        calories: kcal,
        protein: prot,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      setFoodName('');
      setCalories('');
      setProtein('');
      setShowAdd(null);
      await load();
    } catch (e: any) {
      console.error('MEAL_PLAN_ADD_ERROR', e);
      setError(e?.message || 'Impossible de planifier ce repas.');
    } finally {
      setSaving(false);
    }
  };

  const logNow = async (entry: PlannedEntry) => {
    if (!user || entry.logged) return;
    setError('');

    const { error: logError } = await supabase.from('food_entries').insert({
      user_id: user.id,
      meal_type: entry.meal_type,
      food_name: entry.food_name,
      calories: entry.calories,
      protein: entry.protein,
      carbs: Number(entry.carbs || 0),
      fat: Number(entry.fat || 0),
      created_at: new Date().toISOString(),
    });

    if (logError) {
      setError(logError.message);
      return;
    }

    const { error: updateError } = await supabase.from('meal_plans').update({ logged: true }).eq('id', entry.id).eq('user_id', user.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await load();
  };

  const deleteEntry = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('meal_plans').delete().eq('id', id).eq('user_id', user.id);
    if (error) {
      setError(error.message);
      return;
    }
    await load();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F6F7F2', color: '#111', paddingBottom: 92 }}>
      <main style={{ width: '100%', maxWidth: 620, margin: '0 auto' }}>
        <header style={{ padding: '24px 20px 16px' }}>
          <div style={{ fontSize: 10, color: '#777C73', fontWeight: 900, letterSpacing: '.14em' }}>NOX AI · NUTRITION</div>
          <div style={{ marginTop: 5, fontSize: 32, lineHeight: 1, fontWeight: 950, letterSpacing: '-.05em' }}>Plans repas</div>
          <div style={{ marginTop: 9, color: '#777C73', fontSize: 13, lineHeight: 1.55 }}>
            Pars de ce que tu as déjà. NOX adapte ensuite les repas à ton objectif.
          </div>

          <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            <Stat label="OBJECTIF" value={goalLabel(goal)} />
            <Stat label="CALORIES" value={targetCalories ? `${targetCalories} kcal` : 'À définir'} />
            <Stat label="PROTÉINES" value={targetProtein ? `${targetProtein} g` : 'À définir'} />
          </div>

          {message && <Notice text={message} success />}
          {error && <Notice text={error} />}
        </header>

        <section style={{ padding: '0 20px 18px' }}>
          <div style={{
            background: ACCENT, borderRadius: 24, padding: 20,
            boxShadow: '0 10px 30px rgba(80,100,0,.08)'
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: '#111', color: ACCENT, display: 'grid', placeItems: 'center', fontWeight: 950, fontSize: 11 }}>SCAN</div>
            <div style={{ marginTop: 16, fontSize: 23, fontWeight: 950, letterSpacing: '-.035em' }}>Qu’est-ce qu’il y a dans ton frigo ?</div>
            <div style={{ marginTop: 7, maxWidth: 470, fontSize: 12.5, lineHeight: 1.55, color: '#394000' }}>
              Prends une photo. NOX pourra identifier les aliments, te laisser corriger la détection puis construire des repas adaptés.
            </div>
            <button
              onClick={() => fridgeInputRef.current?.click()}
              style={{ width: '100%', marginTop: 17, padding: 15, border: 0, borderRadius: 14, background: '#111', color: '#fff', fontWeight: 950, cursor: 'pointer' }}
            >
              PRENDRE EN PHOTO MON FRIGO
            </button>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => fridgeInputRef.current?.click()} disabled={fridgeAnalyzing} style={secondaryAction}>Importer une photo</button>
              <button onClick={markFridgeEmpty} style={secondaryAction}>Frigo vide</button>
            </div>
            <input
              ref={fridgeInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={e => void analyzeFridge(e.target.files?.[0])}
              style={{ display: 'none' }}
            />

            {fridgeAnalysis && (
              <div style={{ marginTop: 14, padding: 14, borderRadius: 16, background: 'rgba(255,255,255,.72)', border: '1px solid rgba(17,17,17,.12)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 950, letterSpacing: '.08em' }}>ANALYSE DU FRIGO</div>
                    <div style={{ marginTop: 3, fontSize: 12, fontWeight: 850 }}>{fridgeAnalysis.resume || 'Contenu détecté'}</div>
                  </div>
                  <div style={{ padding: '6px 8px', borderRadius: 9, background: '#111', color: '#fff', fontSize: 8.5, fontWeight: 900 }}>
                    {fridgeAnalysis.etat.replace('_', ' ').toUpperCase()}
                  </div>
                </div>

                {fridgeFoods.length > 0 ? (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                    {fridgeFoods.map((food, index) => (
                      <button key={`${food.nom}-${index}`} onClick={() => removeFridgeFood(index)}
                        title="Retirer cet aliment"
                        style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(17,17,17,.12)', background: '#fff', color: '#111', fontSize: 9.5, fontWeight: 850, cursor: 'pointer' }}>
                        {food.nom}{food.quantite_estimee ? ` · ${food.quantite_estimee}` : ''} ×
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ marginTop: 10, fontSize: 10.5, color: '#666B63' }}>Aucun aliment exploitable détecté.</div>
                )}

                {!!fridgeAnalysis.manques?.length && (
                  <div style={{ marginTop: 10, fontSize: 10, lineHeight: 1.5, color: '#555A52' }}>
                    <strong>À compléter :</strong> {fridgeAnalysis.manques.join(', ')}
                  </div>
                )}
                <div style={{ marginTop: 9, fontSize: 9, color: '#747970' }}>
                  Vérifie la détection. Touche un aliment pour le retirer avant la génération.
                </div>
              </div>
            )}
          </div>
        </section>

        <section style={{ padding: '0 20px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: '#777C73', fontWeight: 900, letterSpacing: '.1em' }}>GÉNÉRATION</div>
              <div style={{ marginTop: 3, fontSize: 19, fontWeight: 950 }}>Construire ma semaine</div>
            </div>
            <div style={{ fontSize: 10, color: '#777C73' }}>7 jours</div>
          </div>

          <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 20, padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              <ChoiceCard title="Avec mon frigo" text="Priorise les ingrédients détectés et limite le gaspillage." active={planMode === 'fridge'} onClick={() => selectPlanMode('fridge')} />
              <ChoiceCard title="Courses rapides" text="Budget + enseigne + liste adaptée à ton objectif." active={planMode === 'shopping'} onClick={() => selectPlanMode('shopping')} />
            </div>
            {showShopping && (
              <div style={{ marginTop: 12, padding: 14, borderRadius: 16, background: '#F7F7F4', border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 10, fontWeight: 950, letterSpacing: '.08em' }}>COURSES RAPIDES</div>
                <div style={{ marginTop: 4, color: '#777C73', fontSize: 10.5, lineHeight: 1.45 }}>
                  NOX utilisera ces informations pour préparer la prochaine étape : liste de courses adaptée à ton objectif.
                </div>
                <label style={{ display: 'block', marginTop: 12 }}>
                  <span style={fieldLabel}>BUDGET MAXIMUM</span>
                  <div style={{ position: 'relative' }}>
                    <input
                      value={shoppingPrefs.budget}
                      onChange={e => setShoppingPrefs(p => ({ ...p, budget: e.target.value }))}
                      inputMode="decimal"
                      placeholder="Ex : 60"
                      style={{ ...fieldInput, paddingRight: 42 }}
                    />
                    <span style={{ position: 'absolute', right: 14, top: 13, fontSize: 12, fontWeight: 900 }}>€</span>
                  </div>
                </label>
                <label style={{ display: 'block', marginTop: 10 }}>
                  <span style={fieldLabel}>ENSEIGNE</span>
                  <input
                    value={shoppingPrefs.store}
                    onChange={e => setShoppingPrefs(p => ({ ...p, store: e.target.value }))}
                    placeholder="Ex : Auchan, Carrefour, Lidl..."
                    style={fieldInput}
                  />
                </label>
                <div style={{ marginTop: 10 }}>
                  <span style={fieldLabel}>DURÉE</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                    {[3, 5, 7].map(days => (
                      <button key={days} onClick={() => setShoppingPrefs(p => ({ ...p, days }))}
                        style={{
                          padding: 10, borderRadius: 10,
                          border: `1px solid ${shoppingPrefs.days === days ? '#111' : BORDER}`,
                          background: shoppingPrefs.days === days ? '#111' : '#fff',
                          color: shoppingPrefs.days === days ? ACCENT : '#111',
                          fontSize: 10, fontWeight: 900, cursor: 'pointer'
                        }}>
                        {days} JOURS
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={validateShopping}
                  style={{ width: '100%', marginTop: 12, padding: 12, border: 0, borderRadius: 11, background: ACCENT, color: '#111', fontWeight: 950, cursor: 'pointer' }}>
                  VALIDER MES COURSES
                </button>
              </div>
            )}

            <button
              onClick={generatePlan}
              disabled={generating || loading || !targetCalories || !targetProtein}
              style={{
                width: '100%', marginTop: 12, padding: 14, border: 0, borderRadius: 13,
                background: !targetCalories || !targetProtein ? '#E7E9E2' : '#111',
                color: !targetCalories || !targetProtein ? '#9A9E96' : ACCENT,
                fontWeight: 950, cursor: generating ? 'wait' : 'pointer'
              }}
            >
              {generating ? 'GÉNÉRATION...' : !targetCalories ? 'OBJECTIF NUTRITIONNEL REQUIS' : week.some(d => d.entries.length) ? 'COMPLÉTER MA SEMAINE' : 'GÉNÉRER MA SEMAINE'}
            </button>
          </div>
        </section>

        <section style={{ padding: '0 20px' }}>
          <div style={{ fontSize: 19, fontWeight: 950, marginBottom: 12 }}>Mon plan</div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#8A8A83', fontSize: 12 }}>Chargement du plan...</div>
          ) : week.map(day => {
            const total = day.entries.reduce((sum, entry) => sum + Number(entry.calories || 0), 0);
            const proteinTotal = day.entries.reduce((sum, entry) => sum + Number(entry.protein || 0), 0);
            return (
              <div key={day.date} style={{ marginBottom: 18, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 20, overflow: 'hidden' }}>
                <div style={{ padding: '14px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: day.entries.length ? `1px solid ${BORDER}` : 'none' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 950, textTransform: 'capitalize' }}>{day.label}</div>
                    <div style={{ marginTop: 2, color: '#96968F', fontSize: 9.5 }}>{day.date}</div>
                  </div>
                  {total > 0 && <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, fontWeight: 900 }}>{Math.round(total)}{targetCalories ? ` / ${targetCalories}` : ''} kcal</div>
                    <div style={{ color: '#8A8A83', fontSize: 9 }}>{Math.round(proteinTotal)} g protéines</div>
                  </div>}
                </div>

                {day.entries.length === 0 ? (
                  <div style={{ padding: 18, color: '#92968E', fontSize: 11.5 }}>Aucun repas planifié.</div>
                ) : day.entries.map(entry => (
                  <button key={entry.id} onClick={() => setSelectedMeal(entry)}
                    style={{ width: '100%', border: 0, borderBottom: `1px solid ${BORDER}`, background: entry.logged ? '#F7F7F4' : '#fff', padding: 13, display: 'flex', gap: 12, textAlign: 'left', cursor: 'pointer' }}>
                    {entry.image_url ? (
                      <img src={entry.image_url} alt={entry.food_name} style={{ width: 72, height: 64, borderRadius: 13, flexShrink: 0, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 72, height: 64, borderRadius: 13, flexShrink: 0, background: '#EFF1EA', display: 'grid', placeItems: 'center', color: '#8C9187', fontSize: 9, fontWeight: 900 }}>RECETTE IA</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 9, color: '#8A8A83', fontWeight: 900 }}>{entry.meal_type.toUpperCase()}</div>
                      <div style={{ marginTop: 4, fontSize: 13, fontWeight: 900 }}>{entry.food_name}</div>
                      <div style={{ marginTop: 5, color: '#777C73', fontSize: 10 }}>{entry.calories} kcal · {entry.protein} g prot.</div>
                    </div>
                    <div style={{ alignSelf: 'center', fontSize: 20, color: '#A4A89F' }}>›</div>
                  </button>
                ))}

                <div style={{ padding: 11, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {MEALS.map(meal => (
                    <button key={meal} onClick={() => setShowAdd({ date: day.date, meal })}
                      style={{ padding: '7px 9px', borderRadius: 9, border: `1px solid ${BORDER}`, background: '#F8F9F5', color: '#666B63', fontSize: 9.5, cursor: 'pointer' }}>
                      + {meal}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      </main>

      {selectedMeal && (
        <div onClick={() => setSelectedMeal(null)} style={{ position: 'fixed', inset: 0, zIndex: 320, background: 'rgba(0,0,0,.48)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: '26px 26px 0 0', padding: '22px 20px max(26px, env(safe-area-inset-bottom))' }}>
            {selectedMeal.image_url && <img src={selectedMeal.image_url} alt={selectedMeal.food_name} style={{ width: '100%', height: 210, objectFit: 'cover', borderRadius: 18, marginBottom: 16 }} />}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 9, color: '#777C73', fontWeight: 900, letterSpacing: '.08em' }}>{selectedMeal.meal_type.toUpperCase()}</div>
                <div style={{ marginTop: 4, fontSize: 23, lineHeight: 1.05, fontWeight: 950 }}>{selectedMeal.food_name}</div>
              </div>
              <button onClick={() => setSelectedMeal(null)} style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 12, border: `1px solid ${BORDER}`, background: SURFACE, fontWeight: 900 }}>×</button>
            </div>

            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
              <Stat label="KCAL" value={`${Math.round(Number(selectedMeal.calories || 0))}`} />
              <Stat label="PROT." value={`${Math.round(Number(selectedMeal.protein || 0))} g`} />
              <Stat label="GLUC." value={`${Math.round(Number(selectedMeal.carbs || 0))} g`} />
              <Stat label="LIP." value={`${Math.round(Number(selectedMeal.fat || 0))} g`} />
            </div>

            {!!selectedMeal.prep_time_min && <div style={{ marginTop: 10, color: '#777C73', fontSize: 10.5 }}>Préparation · {selectedMeal.prep_time_min} min · {selectedMeal.servings || 1} portion</div>}

            <div style={{ marginTop: 20, fontSize: 16, fontWeight: 950 }}>Ingrédients</div>
            <div style={{ marginTop: 8, display: 'grid', gap: 7 }}>
              {(selectedMeal.ingredients || []).map((ingredient: any, index: number) => (
                <div key={index} style={{ padding: '10px 12px', borderRadius: 11, background: SURFACE, display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11 }}>
                  <span style={{ fontWeight: 800 }}>{ingredient?.name || 'Ingrédient'}</span>
                  <span style={{ color: '#777C73' }}>{ingredient?.grams ? `${ingredient.grams} ${ingredient.unit || 'g'}` : ingredient?.quantity || ''}</span>
                </div>
              ))}
            </div>

            {!!selectedMeal.fridge_ingredients?.length && (
              <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: '#F4FFE0', border: '1px solid #DCF1A3', fontSize: 10.5 }}>
                <strong>Déjà dans ton frigo :</strong> {selectedMeal.fridge_ingredients.join(', ')}
              </div>
            )}
            {!!selectedMeal.missing_ingredients?.length && (
              <div style={{ marginTop: 8, padding: 12, borderRadius: 12, background: '#FFF8E7', border: '1px solid #F0DCA7', fontSize: 10.5 }}>
                <strong>À acheter :</strong> {selectedMeal.missing_ingredients.join(', ')}
              </div>
            )}

            <div style={{ marginTop: 20, fontSize: 16, fontWeight: 950 }}>Préparation</div>
            <div style={{ marginTop: 8, display: 'grid', gap: 9 }}>
              {(selectedMeal.instructions || []).map((step, index) => (
                <div key={index} style={{ display: 'flex', gap: 10, fontSize: 11.5, lineHeight: 1.5 }}>
                  <div style={{ width: 24, height: 24, flexShrink: 0, borderRadius: 8, background: '#111', color: ACCENT, display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 950 }}>{index + 1}</div>
                  <div>{step}</div>
                </div>
              ))}
            </div>

            <button onClick={() => void logNow(selectedMeal)} disabled={!!selectedMeal.logged}
              style={{ width: '100%', marginTop: 22, padding: 14, border: 0, borderRadius: 13, background: selectedMeal.logged ? '#E8EAE4' : ACCENT, color: '#111', fontWeight: 950 }}>
              {selectedMeal.logged ? 'DÉJÀ AJOUTÉ AU JOURNAL' : 'AJOUTER AU JOURNAL'}
            </button>
          </div>
        </div>
      )}

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.48)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 620, maxHeight: '88vh', overflowY: 'auto', background: '#fff', borderRadius: '24px 24px 0 0', padding: '22px 20px max(24px, env(safe-area-inset-bottom))' }}>
            <div style={{ fontSize: 10, color: '#777770', fontWeight: 900, letterSpacing: '.1em' }}>AJOUT MANUEL</div>
            <div style={{ marginTop: 4, fontSize: 22, fontWeight: 950 }}>Planifier un repas</div>
            <div style={{ marginTop: 4, marginBottom: 18, fontSize: 11.5, color: '#888881' }}>{showAdd.meal} · {showAdd.date}</div>
            {[
              { label: 'Aliment / repas', val: foodName, set: setFoodName, type: 'text', placeholder: 'Ex : Bol de riz au poulet' },
              { label: 'Calories', val: calories, set: setCalories, type: 'number', placeholder: '500' },
              { label: 'Protéines (g)', val: protein, set: setProtein, type: 'number', placeholder: '40' },
            ].map(({ label, val, set, type, placeholder }) => (
              <label key={label} style={{ display: 'block', marginBottom: 12 }}>
                <span style={{ display: 'block', marginBottom: 5, color: '#888881', fontSize: 9.5, fontWeight: 850 }}>{label.toUpperCase()}</span>
                <input value={val} onChange={e => set(e.target.value)} type={type} inputMode={type === 'number' ? 'decimal' : undefined} placeholder={placeholder}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '13px', borderRadius: 12, border: `1px solid ${BORDER}`, outline: 0, background: SURFACE, color: '#111', fontSize: 13 }} />
              </label>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 15 }}>
              <button onClick={() => setShowAdd(null)} disabled={saving} style={{ flex: 1, padding: 13, borderRadius: 12, border: `1px solid ${BORDER}`, background: '#fff', fontWeight: 850 }}>Annuler</button>
              <button onClick={() => void addPlanned()} disabled={saving || !foodName.trim()} style={{ flex: 2, padding: 13, borderRadius: 12, border: 0, background: ACCENT, fontWeight: 950 }}>
                {saving ? 'ENREGISTREMENT...' : 'PLANIFIER'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="fuel" />
    </div>
  );
}

const secondaryAction: React.CSSProperties = {
  flex: 1, padding: 11, borderRadius: 12, border: '1px solid rgba(17,17,17,.16)',
  background: 'rgba(255,255,255,.52)', color: '#111', fontSize: 10, fontWeight: 900, cursor: 'pointer'
};

function ChoiceCard({ title, text, active = false, onClick }: { title: string; text: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} type="button" style={{
      width: '100%', padding: 13, borderRadius: 14, textAlign: 'left', cursor: 'pointer',
      background: active ? '#F3FFD1' : '#F7F7F4',
      border: `1px solid ${active ? '#CDEB72' : BORDER}`,
      color: '#111'
    }}>
      <div style={{ fontSize: 11.5, fontWeight: 900 }}>{title}</div>
      <div style={{ marginTop: 5, fontSize: 9.5, color: '#777C73', lineHeight: 1.4 }}>{text}</div>
    </button>
  );
}


const fieldLabel: React.CSSProperties = {
  display: 'block', marginBottom: 5, color: '#777C73', fontSize: 8.5, fontWeight: 900, letterSpacing: '.05em'
};

const fieldInput: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '12px 13px', borderRadius: 11,
  border: `1px solid ${BORDER}`, outline: 0, background: '#fff', color: '#111', fontSize: 12
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0, padding: '10px 9px', border: `1px solid ${BORDER}`, borderRadius: 11, background: SURFACE }}>
      <div style={{ color: '#96968F', fontSize: 8, fontWeight: 850 }}>{label}</div>
      <div style={{ marginTop: 3, fontSize: 11, fontWeight: 950, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  );
}

function Notice({ text, success = false }: { text: string; success?: boolean }) {
  return (
    <div style={{
      marginTop: 9, padding: '9px 11px', borderRadius: 10,
      background: success ? '#F4FFE0' : '#FFF1F1',
      border: `1px solid ${success ? '#DCF1A3' : '#FFD0D0'}`,
      color: success ? '#4F7100' : '#A73333', fontSize: 10.5, lineHeight: 1.4
    }}>
      {text}
    </div>
  );
}
