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

  const generatePlan = async () => {
    if (!user || generating) return;
    if (!targetCalories || !targetProtein) {
      setError("Complète d'abord ton objectif nutritionnel pour générer un plan.");
      return;
    }
    setGenerating(true);
    setError('');
    setMessage('');

    try {
      const existingDates = new Set(week.flatMap(day => day.entries.map(e => `${e.planned_date}|${e.meal_type}`)));
      const rows: any[] = [];
      const split: Record<string, number> = {
        'Petit-déjeuner': 0.24,
        'Déjeuner': 0.31,
        'Dîner': 0.31,
        'Snacks': 0.14,
      };

      week.forEach((day, dayIndex) => {
        MEALS.forEach(meal => {
          if (existingDates.has(`${day.date}|${meal}`)) return;
          const choices = TEMPLATES[goal][meal];
          const template = choices[(dayIndex + MEALS.indexOf(meal)) % choices.length];
          const desired = targetCalories * split[meal];
          const ratio = desired / template.calories;
          const desiredProtein = targetProtein * split[meal];
          const calorieScaledProtein = template.protein * Math.min(Math.max(ratio, 0.8), 1.25);
          const plannedProtein = Math.max(calorieScaledProtein, desiredProtein * 0.9);

          rows.push({
            user_id: user.id,
            planned_date: day.date,
            meal_type: meal,
            food_name: template.name,
            calories: Math.round(template.calories * ratio),
            protein: Math.round(plannedProtein),
            created_at: new Date().toISOString(),
          });
        });
      });

      if (!rows.length) {
        setMessage('Ta semaine est déjà planifiée.');
        return;
      }

      const { error } = await supabase.from('meal_plans').insert(rows);
      if (error) throw error;

      await load();
      setMessage(`Plan ${goalLabel(goal).toLowerCase()} généré pour 7 jours.`);
    } catch (e: any) {
      console.error('MEAL_PLAN_GENERATE_ERROR', e);
      setError(e?.message || 'Impossible de générer le plan repas.');
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
      carbs: 0,
      fat: 0,
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
              <button onClick={() => setMessage("Si le frigo est vide, NOX demandera ton budget et ton enseigne avant de préparer la liste.")} style={secondaryAction}>Frigo vide</button>
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
              <ChoiceCard title="Avec mon frigo" text="Priorise les ingrédients détectés et limite le gaspillage." active />
              <ChoiceCard title="Courses rapides" text="Budget + enseigne + liste adaptée à ton objectif." />
            </div>
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
                  <button key={entry.id} onClick={() => setMessage(`${entry.food_name} · ${entry.calories} kcal · ${entry.protein} g protéines. La fiche détaillée avec grammages et ingrédients sera branchée ensuite.`)}
                    style={{ width: '100%', border: 0, borderBottom: `1px solid ${BORDER}`, background: entry.logged ? '#F7F7F4' : '#fff', padding: 13, display: 'flex', gap: 12, textAlign: 'left', cursor: 'pointer' }}>
                    <div style={{ width: 72, height: 64, borderRadius: 13, flexShrink: 0, background: '#EFF1EA', display: 'grid', placeItems: 'center', color: '#8C9187', fontSize: 9, fontWeight: 900 }}>IMAGE</div>
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

function ChoiceCard({ title, text, active = false }: { title: string; text: string; active?: boolean }) {
  return (
    <div style={{ padding: 13, borderRadius: 14, background: active ? '#F3FFD1' : '#F7F7F4', border: `1px solid ${active ? '#CDEB72' : BORDER}` }}>
      <div style={{ fontSize: 11.5, fontWeight: 900 }}>{title}</div>
      <div style={{ marginTop: 5, fontSize: 9.5, color: '#777C73', lineHeight: 1.4 }}>{text}</div>
    </div>
  );
}


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
