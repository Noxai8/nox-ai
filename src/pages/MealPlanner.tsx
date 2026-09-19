import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from '../components/BottomNav';

// NOX deploy refresh · 2026-09-19 · repush
const ACCENT = '#B7FF00';
const BG = '#FFFFFF';
const SURFACE = '#F7F7F4';
const BORDER = '#E7E7E2';
// NOX Nutrition · meal planning
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
  return goal === 'cut' ? 'Perte de poids' : goal === 'bulk' ? 'Prise de muscle' : 'Maintien';
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
  const [showShoppingList, setShowShoppingList] = useState(false);

  const goal = normalizeGoal(profile?.goal_type || profile?.goal || profile?.objective);
  const shoppingItems = useMemo(() => {
    const counts = new Map<string, number>();
    week.flatMap(day => day.entries).filter(entry => !entry.logged).forEach(entry => {
      const name = String(entry.food_name || '').trim();
      if (name) counts.set(name, (counts.get(name) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }, [week]);

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
      supabase.from('nutrition_targets').select('calories, protein, carbs, fat').eq('user_id', user.id).maybeSingle(),
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
    const protein = Number(target?.protein || 0);

    setNutritionTarget(
      kcal > 0
        ? {
            calories: kcal,
            protein: protein > 0 ? protein : 0,
            carbs: Number(target?.carbs || 0),
            fat: Number(target?.fat || 0),
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
    if (centralized > 0) return Math.round(centralized);

    // Filet de sécurité uniquement si nutrition_targets n'a encore jamais été créé.
    // Fuel reste la source de vérité et synchronisera ensuite cette cible.
    const stored = Number(profile?.daily_calories || profile?.calorie_target || 0);
    if (stored > 1000) return Math.round(stored);

    const weight = Number(profile?.starting_weight_kg || profile?.weight || 0);
    const height = Number(profile?.height || 0);
    const age = Number(profile?.age || 0);
    if (!weight || !height || !age) return goal === 'cut' ? 1900 : goal === 'bulk' ? 2600 : 2200;

    const gender = String(profile?.gender || '').toLowerCase();
    const sexConstant =
      gender.startsWith('m') || gender.includes('homme')
        ? 5
        : gender.startsWith('f') || gender.includes('femme')
          ? -161
          : -78;

    const bmr = 10 * weight + 6.25 * height - 5 * age + sexConstant;
    const activityRaw = String(profile?.activity_level || '').toLowerCase();
    const factor =
      activityRaw.includes('very') || activityRaw.includes('high') || activityRaw.includes('très') ? 1.725 :
      activityRaw.includes('moderate') || activityRaw.includes('modéré') ? 1.55 :
      activityRaw.includes('light') || activityRaw.includes('léger') ? 1.375 :
      activityRaw.includes('sedent') ? 1.2 : 1.45;

    const maintenance = bmr * factor;
    return Math.round(maintenance * (goal === 'cut' ? 0.85 : goal === 'bulk' ? 1.08 : 1));
  }, [nutritionTarget, profile, goal]);

  const targetProtein = useMemo(() => {
    const centralized = Number(nutritionTarget?.protein || 0);
    if (centralized > 0) return Math.round(centralized);

    const stored = Number(profile?.protein_target || 0);
    if (stored > 0) return Math.round(stored);

    const weight = Number(profile?.starting_weight_kg || profile?.weight || 0);
    if (!weight) return goal === 'bulk' ? 150 : 140;
    return Math.round(weight * (goal === 'cut' ? 2 : goal === 'bulk' ? 1.8 : 1.8));
  }, [nutritionTarget, profile, goal]);

  const generatePlan = async () => {
    if (!user || generating) return;
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
      setMessage(`Semaine suggérée pour 7 jours. Tu peux modifier chaque repas.`);
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
    <div style={{ minHeight: '100vh', background: BG, color: '#111', paddingBottom: 88 }}>
      <main style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
        <header style={{ padding: '22px 20px 18px', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 10, color: '#85857D', fontWeight: 900, letterSpacing: '.13em' }}>NUTRITION · NOX</div>
          <div style={{ marginTop: 4, fontSize: 29, lineHeight: 1, fontWeight: 1000, letterSpacing: '-.05em' }}>PLAN REPAS</div>
          <div style={{ marginTop: 7, color: '#777770', fontSize: 12.5, lineHeight: 1.5 }}>
            Planifie ta semaine autour de ta cible nutritionnelle. Les suggestions restent modifiables avant d’être enregistrées.
          </div>

          <div style={{ marginTop: 15, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7 }}>
            <Stat label="OBJECTIF" value={goalLabel(goal)} />
            <Stat label="CIBLE" value={`${targetCalories} kcal`} />
            <Stat label="PROTÉINES" value={`${targetProtein} g`} />
          </div>

          <div style={{ marginTop: 11, display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
          <button
            onClick={generatePlan}
            disabled={generating || loading}
            style={{
              width: '100%', marginTop: 11, padding: 13, border: 0, borderRadius: 12,
              background: generating ? '#ECECE8' : ACCENT, color: '#090909',
              fontWeight: 950, fontSize: 11.5, cursor: generating ? 'wait' : 'pointer'
            }}
          >
            {generating ? 'GÉNÉRATION...' : week.some(d => d.entries.length) ? 'COMPLÉTER MA SEMAINE' : 'GÉNÉRER MA SEMAINE'}
          </button>
          <button onClick={() => setShowShoppingList(v => !v)} disabled={!shoppingItems.length} style={{ padding: '0 13px', border: `1px solid ${BORDER}`, borderRadius: 12, background: '#fff', color: '#111', fontWeight: 900, fontSize: 10.5, cursor: shoppingItems.length ? 'pointer' : 'not-allowed' }}>
            LISTE · {shoppingItems.length}
          </button>
          </div>

          {showShoppingList && shoppingItems.length > 0 && (
            <div style={{ marginTop: 10, padding: 13, border: `1px solid ${BORDER}`, borderRadius: 12, background: SURFACE }}>
              <div style={{ fontSize: 9, fontWeight: 900, color: '#777770', letterSpacing: '.08em' }}>LISTE DE COURSES · REPAS PLANIFIÉS</div>
              <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                {shoppingItems.map(item => <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11.5 }}><span>{item.name}</span><strong>×{item.count}</strong></div>)}
              </div>
              <div style={{ marginTop: 8, fontSize: 9.5, color: '#8A8A83', lineHeight: 1.4 }}>Liste générée depuis les repas planifiés non encore enregistrés. Vérifie les ingrédients et quantités avant tes achats.</div>
            </div>
          )}

          <div style={{ marginTop: 8, color: '#8A8A83', fontSize: 9.5, lineHeight: 1.45 }}>
            {nutritionTarget
              ? 'Même cible nutritionnelle que Nutrition · les suggestions s’adaptent à tes données enregistrées.'
              : 'Cible provisoire estimée depuis ton profil · Nutrition devient la source de vérité dès qu’une cible est enregistrée.'}
          </div>

          {message && <Notice text={message} success />}
          {error && <Notice text={error} />}
        </header>

        <section style={{ padding: '17px 20px 0' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#8A8A83', fontSize: 12 }}>Chargement du plan...</div>
          ) : week.map(day => {
            const total = day.entries.reduce((sum, entry) => sum + Number(entry.calories || 0), 0);
            const proteinTotal = day.entries.reduce((sum, entry) => sum + Number(entry.protein || 0), 0);

            return (
              <div key={day.date} style={{ marginBottom: 22 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, marginBottom: 9 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 950, textTransform: 'capitalize' }}>{day.label}</div>
                    <div style={{ marginTop: 2, color: '#96968F', fontSize: 9.5 }}>{day.date}</div>
                  </div>
                  {total > 0 && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, fontWeight: 900 }}>{Math.round(total)} / {targetCalories} kcal</div>
                      <div style={{ color: '#8A8A83', fontSize: 9 }}>{Math.round(proteinTotal)} g protéines</div>
                    </div>
                  )}
                </div>

                {day.entries.map(entry => (
                  <div key={entry.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6,
                    padding: '11px 12px', borderRadius: 12, border: `1px solid ${BORDER}`,
                    background: entry.logged ? '#F3F3F0' : '#fff', opacity: entry.logged ? .65 : 1
                  }}>
                    <div style={{ width: 64, flexShrink: 0, color: '#8A8A83', fontSize: 9.2, fontWeight: 850 }}>{entry.meal_type}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 850, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.food_name}</div>
                      <div style={{ marginTop: 3, color: '#8A8A83', fontSize: 9.5 }}>{entry.calories} kcal · {entry.protein} g prot.</div>
                    </div>
                    {!entry.logged && day.label === "Aujourd'hui" && (
                      <button onClick={() => void logNow(entry)} style={{ padding: '6px 8px', border: 0, borderRadius: 8, background: ACCENT, fontSize: 9.5, fontWeight: 900, cursor: 'pointer' }}>LOGGER</button>
                    )}
                    {entry.logged && <span style={{ fontSize: 11, fontWeight: 900 }}>✓</span>}
                    <button onClick={() => void deleteEntry(entry.id)} aria-label="Supprimer" style={{ border: 0, background: 'transparent', color: '#A0A099', fontSize: 18, cursor: 'pointer' }}>×</button>
                  </div>
                ))}

                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 7 }}>
                  {MEALS.map(meal => (
                    <button
                      key={meal}
                      onClick={() => setShowAdd({ date: day.date, meal })}
                      style={{
                        padding: '5px 8px', borderRadius: 8, border: `1px dashed #D6D6D0`,
                        background: 'transparent', color: '#777770', fontSize: 9.5, cursor: 'pointer'
                      }}
                    >
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 560, maxHeight: '88vh', overflowY: 'auto', background: '#fff', borderRadius: '22px 22px 0 0', padding: '20px 20px max(24px, env(safe-area-inset-bottom))' }}>
            <div style={{ fontSize: 10, color: '#777770', fontWeight: 900, letterSpacing: '.1em' }}>AJOUT MANUEL</div>
            <div style={{ marginTop: 3, fontSize: 20, fontWeight: 950 }}>Planifier un repas</div>
            <div style={{ marginTop: 4, marginBottom: 18, fontSize: 11.5, color: '#888881' }}>{showAdd.meal} · {showAdd.date}</div>

            {[
              { label: 'Aliment / repas', val: foodName, set: setFoodName, type: 'text', placeholder: 'Ex : Bol de riz au poulet' },
              { label: 'Calories', val: calories, set: setCalories, type: 'number', placeholder: '500' },
              { label: 'Protéines (g)', val: protein, set: setProtein, type: 'number', placeholder: '40' },
            ].map(({ label, val, set, type, placeholder }) => (
              <label key={label} style={{ display: 'block', marginBottom: 12 }}>
                <span style={{ display: 'block', marginBottom: 5, color: '#888881', fontSize: 9.5, fontWeight: 850 }}>{label.toUpperCase()}</span>
                <input
                  value={val}
                  onChange={e => set(e.target.value)}
                  type={type}
                  inputMode={type === 'number' ? 'decimal' : undefined}
                  placeholder={placeholder}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '12px 13px', borderRadius: 11, border: `1px solid ${BORDER}`, outline: 0, background: SURFACE, color: '#111', fontSize: 13 }}
                />
              </label>
            ))}

            <div style={{ display: 'flex', gap: 8, marginTop: 15 }}>
              <button onClick={() => setShowAdd(null)} disabled={saving} style={{ flex: 1, padding: 13, borderRadius: 11, border: `1px solid ${BORDER}`, background: '#fff', color: '#111', fontWeight: 850, cursor: 'pointer' }}>Annuler</button>
              <button onClick={() => void addPlanned()} disabled={saving || !foodName.trim()} style={{ flex: 2, padding: 13, borderRadius: 11, border: 0, background: ACCENT, color: '#111', fontWeight: 950, cursor: 'pointer' }}>
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
