import { calculateRealTDEE } from '../lib/noxBrain';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from '../components/BottomNav';
import BarcodeScanner from './BarcodeScanner';

const ACCENT = '#B7FF00';
const BG = '#F7F7F7';
const SURFACE = '#FFFFFF';
const BORDER = '#EAEAEA';

const COMMON_FOODS = [
  // Protéines animales
  { name: 'Poulet grillé (100g)', kcal: 165, protein: 31, carbs: 0, fat: 4, category: 'Protéines' },
  { name: 'Blanc de poulet cru (100g)', kcal: 110, protein: 23, carbs: 0, fat: 1.2, category: 'Protéines' },
  { name: 'Blanc de dinde (100g)', kcal: 104, protein: 22, carbs: 0, fat: 1.7, category: 'Protéines' },
  { name: 'Steak haché 5% (100g)', kcal: 120, protein: 20, carbs: 0, fat: 5, category: 'Protéines' },
  { name: 'Saumon (100g)', kcal: 208, protein: 20, carbs: 0, fat: 13, category: 'Protéines' },
  { name: 'Thon en boîte (100g)', kcal: 116, protein: 26, carbs: 0, fat: 1, category: 'Protéines' },
  { name: 'Cabillaud (100g)', kcal: 82, protein: 18, carbs: 0, fat: 0.7, category: 'Protéines' },
  { name: 'Crevettes cuites (100g)', kcal: 99, protein: 21, carbs: 0.5, fat: 1, category: 'Protéines' },
  { name: 'Œuf entier (1)', kcal: 78, protein: 6, carbs: 0.6, fat: 5, category: 'Protéines' },
  { name: "Blanc d'oeuf (1)", kcal: 17, protein: 3.6, carbs: 0.2, fat: 0.1, category: 'Protéines' },
  { name: 'Jambon blanc (100g)', kcal: 107, protein: 17, carbs: 1, fat: 4, category: 'Protéines' },
  // Produits laitiers
  { name: 'Fromage blanc 0% (100g)', kcal: 57, protein: 10, carbs: 4, fat: 0.2, category: 'Laitiers' },
  { name: 'Yaourt grec 0% (100g)', kcal: 57, protein: 10, carbs: 4, fat: 0.4, category: 'Laitiers' },
  { name: 'Skyr nature (100g)', kcal: 65, protein: 11, carbs: 4, fat: 0.2, category: 'Laitiers' },
  { name: 'Lait demi-écrémé (100ml)', kcal: 46, protein: 3.2, carbs: 4.7, fat: 1.6, category: 'Laitiers' },
  { name: 'Fromage (30g)', kcal: 110, protein: 7, carbs: 0.5, fat: 9, category: 'Laitiers' },
  { name: 'Cottage cheese (100g)', kcal: 90, protein: 12, carbs: 3, fat: 3, category: 'Laitiers' },
  // Glucides
  { name: 'Riz blanc cuit (100g)', kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, category: 'Glucides' },
  { name: 'Riz basmati cuit (100g)', kcal: 121, protein: 2.5, carbs: 25, fat: 0.3, category: 'Glucides' },
  { name: "Flocons d'avoine (100g)", kcal: 379, protein: 13, carbs: 68, fat: 6.9, category: 'Glucides' },
  { name: 'Pâtes cuites (100g)', kcal: 158, protein: 5.5, carbs: 31, fat: 0.9, category: 'Glucides' },
  { name: 'Patate douce (100g)', kcal: 86, protein: 1.6, carbs: 20, fat: 0.1, category: 'Glucides' },
  { name: 'Pomme de terre cuite (100g)', kcal: 87, protein: 1.9, carbs: 20, fat: 0.1, category: 'Glucides' },
  { name: 'Quinoa cuit (100g)', kcal: 120, protein: 4.4, carbs: 21, fat: 1.9, category: 'Glucides' },
  { name: 'Pain complet (1 tranche)', kcal: 80, protein: 3.5, carbs: 15, fat: 1, category: 'Glucides' },
  { name: 'Tortilla blé (1)', kcal: 146, protein: 3.8, carbs: 24, fat: 3.5, category: 'Glucides' },
  { name: 'Banane (1 moyenne)', kcal: 89, protein: 1.1, carbs: 23, fat: 0.3, category: 'Fruits' },
  { name: 'Pomme (1)', kcal: 52, protein: 0.3, carbs: 14, fat: 0.2, category: 'Fruits' },
  { name: 'Myrtilles (100g)', kcal: 57, protein: 0.7, carbs: 14, fat: 0.3, category: 'Fruits' },
  // Légumes
  { name: 'Brocoli cuit (100g)', kcal: 34, protein: 2.8, carbs: 7, fat: 0.4, category: 'Légumes' },
  { name: 'Épinards (100g)', kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4, category: 'Légumes' },
  { name: 'Haricots verts (100g)', kcal: 35, protein: 1.8, carbs: 7, fat: 0.1, category: 'Légumes' },
  { name: 'Courgette (100g)', kcal: 17, protein: 1.2, carbs: 3.1, fat: 0.3, category: 'Légumes' },
  { name: 'Tomate (100g)', kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2, category: 'Légumes' },
  { name: 'Concombre (100g)', kcal: 15, protein: 0.7, carbs: 3.6, fat: 0.1, category: 'Légumes' },
  // Lipides & légumineuses
  { name: 'Avocat (100g)', kcal: 160, protein: 2, carbs: 9, fat: 15, category: 'Lipides' },
  { name: 'Amandes (30g)', kcal: 174, protein: 6, carbs: 5, fat: 15, category: 'Lipides' },
  { name: 'Noix (30g)', kcal: 196, protein: 4.6, carbs: 3.9, fat: 19, category: 'Lipides' },
  { name: "Huile d'olive (1 c.s)", kcal: 119, protein: 0, carbs: 0, fat: 14, category: 'Lipides' },
  { name: "Beurre de cacahuete (30g)", kcal: 188, protein: 8, carbs: 6, fat: 16, category: 'Lipides' },
  { name: 'Lentilles cuites (100g)', kcal: 116, protein: 9, carbs: 20, fat: 0.4, category: 'Légumineuses' },
  { name: 'Pois chiches cuits (100g)', kcal: 164, protein: 8.9, carbs: 27, fat: 2.6, category: 'Légumineuses' },
  { name: 'Haricots rouges cuits (100g)', kcal: 127, protein: 8.7, carbs: 22, fat: 0.5, category: 'Légumineuses' },
  // Suppléments & convenience
  { name: 'Whey protéine (30g)', kcal: 115, protein: 24, carbs: 2, fat: 1.5, category: 'Suppléments' },
  { name: 'Creatine (5g)', kcal: 0, protein: 0, carbs: 0, fat: 0, category: 'Suppléments' },
  { name: 'Barre protéinée (1)', kcal: 200, protein: 20, carbs: 22, fat: 6, category: 'Suppléments' },
];

const MEALS = ['Petit-déjeuner', 'Déjeuner', 'Dîner', 'Snacks'];

type AddMode = 'choose' | 'photo' | 'search' | 'custom' | 'barcode';

type NutritionTargets = { kcal: number; protein: number; carbs: number; fat: number };

function normalizeText(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function finitePositive(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function localDayBounds(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  return { start, end };
}

function goalDirection(profile: any): 'cut' | 'bulk' | 'maintain' {
  const goal = normalizeText(profile?.goal_type || profile?.goal || profile?.objective);
  if (
    goal.includes('gras') ||
    goal.includes('perte') ||
    goal.includes('maigr') ||
    goal.includes('seche') ||
    goal.includes('poids')
  ) return 'cut';

  if (
    goal.includes('muscle') ||
    goal.includes('masse') ||
    goal.includes('prise') ||
    goal.includes('bulk') ||
    goal.includes('hypertroph')
  ) return 'bulk';

  return 'maintain';
}

function calculateFormulaNutritionTargets(profile: any, currentWeight?: number | null): NutritionTargets {
  const weight =
    finitePositive(currentWeight) ||
    finitePositive(profile?.starting_weight_kg) ||
    finitePositive(profile?.weight) ||
    75;

  const height = finitePositive(profile?.height_cm) || finitePositive(profile?.height);
  let age = finitePositive(profile?.age) || 30;

  if (profile?.date_of_birth) {
    const birth = new Date(profile.date_of_birth);
    if (!Number.isNaN(birth.getTime())) {
      age = Math.max(14, Math.min(100, Math.floor((Date.now() - birth.getTime()) / (365.2425 * 86400000))));
    }
  }

  let maintenance: number;

  if (height) {
    const sex = normalizeText(profile?.sex || profile?.gender);
    const sexConstant =
      ['male', 'man', 'homme', 'm'].includes(sex) ? 5 :
      ['female', 'woman', 'femme', 'f'].includes(sex) ? -161 :
      -78;

    const bmr = 10 * weight + 6.25 * height - 5 * age + sexConstant;
    const activity = normalizeText(profile?.activity_level);
    const multiplier =
      activity.includes('sedent') ? 1.2 :
      activity.includes('leger') || activity.includes('light') ? 1.375 :
      activity.includes('tres') || activity.includes('very') ? 1.725 :
      activity.includes('extrem') ? 1.9 :
      1.55;

    maintenance = bmr * multiplier;
  } else {
    // Fallback seulement lorsque le profil ne permet pas Mifflin.
    maintenance = weight * 30;
  }

  const direction = goalDirection(profile);
  const calories =
    direction === 'cut'
      ? maintenance * 0.85
      : direction === 'bulk'
        ? maintenance * 1.08
        : maintenance;

  const kcal = Math.max(1200, Math.round(calories / 10) * 10);
  const proteinPerKg = direction === 'cut' ? 2.0 : direction === 'bulk' ? 1.8 : 1.8;
  const protein = Math.round(weight * proteinPerKg);
  const fat = Math.max(Math.round(weight * 0.8), Math.round((kcal * 0.22) / 9));
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));

  return { kcal, protein, carbs, fat };
}

function targetsFromTDEE(tdeeReal: number, profile: any, currentWeight?: number | null): NutritionTargets {
  const base = calculateFormulaNutritionTargets(profile, currentWeight);
  const direction = goalDirection(profile);

  // Ajustements modérés : le TDEE est une estimation de tendance, pas une vérité exacte.
  const kcal =
    direction === 'cut'
      ? Math.round((tdeeReal * 0.85) / 10) * 10
      : direction === 'bulk'
        ? Math.round((tdeeReal * 1.08) / 10) * 10
        : Math.round(tdeeReal / 10) * 10;

  const proteinCalories = base.protein * 4;
  const fatCalories = base.fat * 9;
  const carbs = Math.max(0, Math.round((kcal - proteinCalories - fatCalories) / 4));

  return { kcal: Math.max(1200, kcal), protein: base.protein, carbs, fat: base.fat };
}


export default function Fuel() {
  const { user } = useAuth();
  const [targets, setTargets] = useState({ kcal: 2200, protein: 160, carbs: 220, fat: 70 });
  const [entries, setEntries] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>('choose');
  const [selectedMeal, setSelectedMeal] = useState('Déjeuner');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('Tous');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [custom, setCustom] = useState({ name: '', kcal: '', protein: '', carbs: '', fat: '' });
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [qty, setQty] = useState('1');
  const [recentFoods, setRecentFoods] = useState<any[]>([]);
  const [, setIsWeekend] = useState(false);
  const [fuelError, setFuelError] = useState('');
  const [targetSource, setTargetSource] = useState<'saved' | 'formula' | 'real'>('formula');

  // Photo scan state
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [tdee, setTdee] = useState<any>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    if (!user) return;
    setFuelError('');

    try {
      const { start: startOfDay, end: endOfDay } = localDayBounds();

      const [
        targetResult,
        entriesResult,
        profileResult,
        bodyResult,
        fuelHistoryResult,
      ] = await Promise.all([
        supabase.from('nutrition_targets').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('food_entries').select('*').eq('user_id', user.id)
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString())
          .order('created_at'),
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('body_logs').select('weight, created_at').eq('user_id', user.id).order('created_at'),
        supabase.from('food_entries').select('calories, created_at').eq('user_id', user.id).order('created_at'),
      ]);

      if (targetResult.error) throw targetResult.error;
      if (entriesResult.error) throw entriesResult.error;
      if (profileResult.error) throw profileResult.error;
      if (bodyResult.error) throw bodyResult.error;
      if (fuelHistoryResult.error) throw fuelHistoryResult.error;

      const profile = profileResult.data;
      const saved = targetResult.data;
      const allBodyLogs = bodyResult.data || [];
      const allFuel = fuelHistoryResult.data || [];

      setEntries(entriesResult.data || []);

      const latestWeight = allBodyLogs.length
        ? finitePositive(allBodyLogs[allBodyLogs.length - 1]?.weight)
        : null;

      let resolvedTargets = calculateFormulaNutritionTargets(profile || {}, latestWeight);
      let resolvedSource: 'saved' | 'formula' | 'real' = 'formula';

      if (saved) {
        const savedKcal = finitePositive(saved.calories);
        const savedProtein = finitePositive(saved.protein);
        const savedCarbs = finitePositive(saved.carbs);
        const savedFat = finitePositive(saved.fat);

        if (savedKcal && savedProtein && savedCarbs && savedFat) {
          resolvedTargets = {
            kcal: Math.round(savedKcal),
            protein: Math.round(savedProtein),
            carbs: Math.round(savedCarbs),
            fat: Math.round(savedFat),
          };
          resolvedSource = 'saved';
        }
      }

      let tdeeResult: any = null;
      if (profile && allBodyLogs.length && allFuel.length) {
        tdeeResult = calculateRealTDEE(allBodyLogs, allFuel, profile);
        setTdee(tdeeResult);

        // Le TDEE réel prend le dessus seulement avec une confiance exploitable.
        // Contrairement à l'ancienne version, un nutrition_targets approximatif
        // créé au premier lancement ne bloque donc plus la calibration future.
        if (
          tdeeResult.tdeeReal &&
          (tdeeResult.confidence === 'moyenne' || tdeeResult.confidence === 'haute')
        ) {
          resolvedTargets = targetsFromTDEE(tdeeResult.tdeeReal, profile, latestWeight);
          resolvedSource = 'real';
        }
      } else {
        setTdee(null);
      }

      setTargets(resolvedTargets);
      setTargetSource(resolvedSource);

      // On conserve une cible centrale dans nutrition_targets pour que Coach,
      // Recipes, MealPlanner et WeeklyReview puissent lire la même valeur.
      // Upsert évite le "premier objectif figé" de l'ancienne implémentation.
      if (profile && (!saved || resolvedSource === 'real')) {
        const { error: targetSaveError } = await supabase
          .from('nutrition_targets')
          .upsert({
            user_id: user.id,
            calories: resolvedTargets.kcal,
            protein: resolvedTargets.protein,
            carbs: resolvedTargets.carbs,
            fat: resolvedTargets.fat,
          }, { onConflict: 'user_id' });

        if (targetSaveError) {
          console.warn('Nutrition target sync:', targetSaveError.message);
        }
      }

      const dayOfWeek = new Date().getDay();
      setIsWeekend(dayOfWeek === 0 || dayOfWeek === 6);

      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: recent, error: recentError } = await supabase
        .from('food_entries')
        .select('food_name, calories, protein, carbs, fat')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo)
        .not('food_name', 'is', null);

      if (recentError) throw recentError;

      if (recent) {
        const freq: Record<string, any> = {};
        recent.forEach((f: any) => {
          if (!f.food_name) return;
          if (!freq[f.food_name]) freq[f.food_name] = { ...f, count: 0 };
          freq[f.food_name].count++;
        });
        setRecentFoods(
          Object.values(freq)
            .sort((x: any, y: any) => y.count - x.count)
            .slice(0, 6),
        );
      }
    } catch (err: any) {
      console.error('Fuel loadData:', err);
      setFuelError(err?.message || 'Impossible de charger les données nutritionnelles.');
    }
  };

  const totals = entries.reduce((acc, e) => ({
    kcal: acc.kcal + (e.calories || 0),
    protein: acc.protein + (e.protein || 0),
    carbs: acc.carbs + (e.carbs || 0),
    fat: acc.fat + (e.fat || 0),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  // ─── PHOTO SCAN ───────────────────────────────────────────────
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Compresser l'image avant envoi (max 800px, qualité 0.7)
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxSize = 800;
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        if (width > height) { height = Math.round(height * maxSize / width); width = maxSize; }
        else { width = Math.round(width * maxSize / height); height = maxSize; }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      const base64 = dataUrl.split(',')[1];
      setPhotoBase64(dataUrl);
      analyzePhoto(base64, 'image/jpeg');
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
    e.target.value = '';
  };

  const analyzePhoto = async (base64: string, mime = 'image/jpeg') => {
    setScanning(true);
    setScanError('');
    setScanResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Session expirée. Reconnecte-toi pour analyser ce repas.');

      const fnResponse = await fetch(
        'https://zpxrsmnpcyzafawlweyl.supabase.co/functions/v1/analyze-meal',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ base64, mime }),
        }
      );

      const fnData = await fnResponse.json();
      if (!fnResponse.ok) throw new Error(fnData?.error || 'Erreur serveur ' + fnResponse.status);
      if (!fnData?.total) throw new Error('Réponse invalide');

      setScanResult(fnData);
    } catch (err: any) {
      console.error('Scan error:', err);
      setScanError(`Analyse impossible : ${err.message || 'erreur inconnue'}. Essaie une photo plus nette ou saisis manuellement.`);
    }
    setScanning(false);
  };

  const addScanResult = async () => {
    if (!scanResult) return;
    
    const total = scanResult.total || scanResult;
    const kcal = total.kcal ?? total.calories ?? total.cal ?? 0;
    const protein = total.protein ?? total.proteines ?? total.proteins ?? 0;
    const carbs = total.carbs ?? total.glucides ?? total.carbohydrates ?? 0;
    const fat = total.fat ?? total.lipides ?? total.fats ?? 0;
    
    // NE PAS stocker photo_url — base64 trop lourd pour Supabase
    const entry = {
      user_id: user!.id,
      meal_type: selectedMeal,
      food_name: scanResult.description || 'Repas scanné',
      calories: Math.round(kcal),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      created_at: new Date().toISOString(),
    };
    
    const { error } = await supabase.from('food_entries').insert(entry);
    if (!error) {
      await loadData();
      closeAdd();
    } else {
      alert('Erreur ajout: ' + JSON.stringify(error));
    }
  };

  const addSingleFood = async (food: any) => {
    setFuelError('');
    const { error } = await supabase.from('food_entries').insert({
      user_id: user!.id,
      meal_type: selectedMeal,
      food_name: food.name || food.nom || 'Aliment scanné',
      calories: Math.round(food.kcal || food.calories || 0),
      protein: Math.round((food.protein || 0) * 10) / 10,
      carbs: Math.round((food.carbs || 0) * 10) / 10,
      fat: Math.round((food.fat || 0) * 10) / 10,
      created_at: new Date().toISOString(),
    });
    if (error) {
      setFuelError(error.message || "Impossible d'ajouter cet aliment.");
      return;
    }
    await loadData();
    closeAdd();
  };
  // ──────────────────────────────────────────────────────────────

  const addEntry = async (food: any) => {
    if (!user) return;
    const q = Number(String(qty).replace(',', '.'));

    if (!Number.isFinite(q) || q <= 0 || q > 100) {
      setFuelError('Entre une quantité valide.');
      return;
    }

    setFuelError('');
    const { error } = await supabase.from('food_entries').insert({
      user_id: user.id,
      meal_type: selectedMeal,
      food_name: food.name,
      calories: Math.round(Number(food.kcal || 0) * q),
      protein: Math.round(Number(food.protein || 0) * q * 10) / 10,
      carbs: Math.round(Number(food.carbs || 0) * q * 10) / 10,
      fat: Math.round(Number(food.fat || 0) * q * 10) / 10,
      created_at: new Date().toISOString(),
    });

    if (error) {
      setFuelError(error.message || "Impossible d'ajouter cet aliment.");
      return;
    }

    await loadData();
    closeAdd();
  };

  const addCustom = async () => {
    if (!user) return;

    const values = {
      kcal: Number(String(custom.kcal).replace(',', '.')),
      protein: Number(String(custom.protein).replace(',', '.')),
      carbs: Number(String(custom.carbs).replace(',', '.')),
      fat: Number(String(custom.fat).replace(',', '.')),
    };

    if (!custom.name.trim()) {
      setFuelError("Donne un nom à l'aliment.");
      return;
    }

    if (Object.values(values).some(value => !Number.isFinite(value) || value < 0)) {
      setFuelError('Calories et macros doivent être des nombres positifs.');
      return;
    }

    setFuelError('');
    const { error } = await supabase.from('food_entries').insert({
      user_id: user.id,
      meal_type: selectedMeal,
      food_name: custom.name.trim(),
      calories: values.kcal,
      protein: values.protein,
      carbs: values.carbs,
      fat: values.fat,
      created_at: new Date().toISOString(),
    });

    if (error) {
      setFuelError(error.message || "Impossible d'ajouter cet aliment.");
      return;
    }

    await loadData();
    setCustom({ name: '', kcal: '', protein: '', carbs: '', fat: '' });
    closeAdd();
  };

  const deleteEntry = async (id: string) => {
    if (!user) return;
    setFuelError('');

    const { error } = await supabase
      .from('food_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      setFuelError(error.message || "Impossible de supprimer cet aliment.");
      return;
    }

    await loadData();
  };

  const closeAdd = () => {
    setShowAdd(false);
    setAddMode('choose');
    setPhotoBase64(null);
    setScanResult(null);
    setScanError('');
    setSelectedFood(null);
    setSearch('');
    setQty('1');
  };

  const categories = ['Tous', 'Protéines', 'Glucides', 'Laitiers', 'Légumes', 'Fruits', 'Lipides', 'Suppléments'];
  const filtered = COMMON_FOODS.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) &&
    (category === 'Tous' || (f as any).category === category)
  ).sort((a, b) => {
    // Favoris en premier
    const aFav = favorites.includes(a.name);
    const bFav = favorites.includes(b.name);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return 0;
  });
  const mealGroups = MEALS.map(m => ({ meal: m, items: entries.filter(e => e.meal_type === m) })).filter(g => g.items.length > 0);
  const pct = (val: number, max: number) => Math.min(100, Math.round((val / max) * 100));

  const MacroBar = ({ label, val, max, color }: any) => (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#777', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</span>
        <span style={{ fontSize: 11, color: '#0A0A0A', fontWeight: 700 }}>{Math.round(val)}g</span>
      </div>
      <div style={{ height: 4, background: '#F1F1F1', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct(val, max) + '%', background: color, borderRadius: 2, transition: 'width .5s' }} />
      </div>
      <div style={{ fontSize: 10, color: '#333', marginTop: 2 }}>{max}g obj.</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#0A0A0A', paddingBottom: 100 }}>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhotoSelect} />

      <main style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
        <header style={{
          padding: '24px 20px 18px',
          background: 'radial-gradient(circle at 88% 0%, rgba(183,255,0,.14), transparent 30%), #FFFFFF',
          borderBottom: '1px solid ' + BORDER
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: '#777', textTransform: 'uppercase', letterSpacing: '.14em', fontWeight: 850 }}>Nutrition quotidienne</div>
              <div style={{ fontSize: 27, fontWeight: 950, letterSpacing: '-.04em', marginTop: 4 }}>NUTRITION</div>
            </div>
            <button onClick={() => setShowAdd(true)} style={{
              border: 0, borderRadius: 13, background: ACCENT, color: '#050505', padding: '11px 15px',
              fontSize: 11, fontWeight: 950, letterSpacing: '.04em', cursor: 'pointer'
            }}>+ AJOUTER</button>
          </div>
        </header>

        <section style={{ padding: 20 }}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
            <button onClick={()=>navigate('/recipes')} style={{border:'1px solid '+BORDER,borderRadius:14,background:'#FFFFFF',color:'#0A0A0A',padding:'12px 8px',fontSize:10,fontWeight:900,cursor:'pointer'}}>RECETTES</button>
            <button onClick={()=>navigate('/meal-planner')} style={{border:'1px solid '+BORDER,borderRadius:14,background:'#FFFFFF',color:'#0A0A0A',padding:'12px 8px',fontSize:10,fontWeight:900,cursor:'pointer'}}>PLAN REPAS</button>
            <button onClick={()=>navigate('/fasting')} style={{border:'1px solid '+BORDER,borderRadius:14,background:'#FFFFFF',color:'#0A0A0A',padding:'12px 8px',fontSize:10,fontWeight:900,cursor:'pointer'}}>JEÛNE</button>
          </div>
          {fuelError && (
            <div style={{ marginBottom: 12, background: 'rgba(255,90,80,.08)', border: '1px solid rgba(255,90,80,.28)', borderRadius: 14, padding: 13, color: '#ff8c82', fontSize: 11.5, lineHeight: 1.45 }}>
              {fuelError}
            </div>
          )}
          <div style={{
            background: 'linear-gradient(145deg,#151515,#0e0e0e)',
            border: '1px solid #232323', borderRadius: 22, padding: 20
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ position: 'relative', width: 104, height: 104, flexShrink: 0 }}>
                <svg width="104" height="104" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="52" cy="52" r="43" fill="none" stroke="#242424" strokeWidth="8" />
                  <circle cx="52" cy="52" r="43" fill="none" stroke={ACCENT} strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 43}`}
                    strokeDashoffset={`${2 * Math.PI * 43 * (1 - pct(totals.kcal, targets.kcal) / 100)}`}
                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset .5s' }} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: 22, lineHeight: 1, fontWeight: 950 }}>{Math.round(totals.kcal)}</div>
                    <div style={{ fontSize: 9, color: '#666', marginTop: 5, fontWeight: 800 }}>KCAL</div>
                  </div>
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: '#777', fontWeight: 850, letterSpacing: '.08em' }}>OBJECTIF DU JOUR</div>
                <div style={{ fontSize: 27, fontWeight: 950, letterSpacing: '-.04em', marginTop: 4 }}>{targets.kcal} <span style={{ fontSize: 12, color: '#666' }}>kcal</span></div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 7 }}>
                  {Math.max(0, targets.kcal - Math.round(totals.kcal))} kcal restantes
                </div>
                <div style={{ fontSize: 9.5, color: '#777', marginTop: 5 }}>
                  {targetSource === 'real' ? 'Cible calibrée avec tes données réelles' : targetSource === 'saved' ? 'Cible nutritionnelle enregistrée' : 'Cible initiale estimée depuis ton profil'}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 13, marginTop: 22 }}>
              <MacroBar label="Protéines" val={totals.protein} max={targets.protein} color={ACCENT} />
              <MacroBar label="Glucides" val={totals.carbs} max={targets.carbs} color="#6f8cff" />
              <MacroBar label="Lipides" val={totals.fat} max={targets.fat} color="#ff775e" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: 10, marginTop: 12 }}>
            <button onClick={() => navigate('/food-scan', { state: { scanMode: 'meal' } })} style={{
              minHeight: 84, borderRadius: 18, border: '1px solid rgba(200,255,0,.22)',
              background: 'linear-gradient(135deg,rgba(200,255,0,.12),rgba(200,255,0,.035))',
              color: '#0A0A0A', textAlign: 'left', padding: 15, cursor: 'pointer'
            }}>
              <div style={{ color: ACCENT, fontSize: 10, fontWeight: 950, letterSpacing: '.09em' }}>NOX SCAN</div>
              <div style={{ fontSize: 14, fontWeight: 900, marginTop: 6 }}>Scanner mon repas</div>
              <div style={{ fontSize: 10.5, color: '#777', marginTop: 4 }}>Photo → calories + macros</div>
            </button>
            <button onClick={() => navigate('/food-scan', { state: { scanMode: 'barcode' } })} style={{
              minHeight: 84, borderRadius: 18, border: '1px solid #232323',
              background: '#FFFFFF', color: '#0A0A0A', textAlign: 'left', padding: 15, cursor: 'pointer'
            }}>
              <div style={{ color: ACCENT, fontSize: 10, fontWeight: 900, letterSpacing: '.08em' }}>CODE-BARRES</div>
              <div style={{ fontSize: 14, fontWeight: 900, marginTop: 6 }}>Scanner un produit</div>
              <div style={{ fontSize: 10.5, color: '#666', marginTop: 4 }}>Caméra → fiche nutrition</div>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', margin: '24px 2px 11px' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 950 }}>Repas du jour</div>
              <div style={{ color: '#666', fontSize: 10.5, marginTop: 3 }}>{entries.length} élément{entries.length > 1 ? 's' : ''} enregistré{entries.length > 1 ? 's' : ''}</div>
            </div>
          </div>

          {/* TDEE réel */}
          {tdee && tdee.tdeeReal && tdee.confidence !== 'insuffisant' && (
            <div style={{ margin: '0 0 14px', background: '#131313', border: '1px solid #222', borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ fontSize: 11, color: '#777', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em' }}>MÉTABOLISME RÉEL · confiance {tdee.confidence}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: ACCENT }}>{tdee.tdeeReal} kcal</div>
              </div>
              {tdee.insight
                ? <div style={{ fontSize: 12, color: '#ffaa00', lineHeight: 1.5 }}>{tdee.insight}</div>
                : <div style={{ fontSize: 12, color: '#777' }}>Formule standard : {tdee.tdeeFormula} kcal · {tdee.weeksOfData} sem. de données</div>
              }
            </div>
          )}

          {mealGroups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '42px 22px', borderRadius: 22, background: '#FFFFFF', border: '1px solid #232323' }}>
              <div style={{ width: 52, height: 52, margin: '0 auto 16px', borderRadius: 16, background: 'rgba(200,255,0,.08)', border: '1px solid rgba(200,255,0,.16)', display: 'grid', placeItems: 'center', color: ACCENT, fontSize: 23, fontWeight: 300 }}>+</div>
              <div style={{ fontSize: 17, fontWeight: 950 }}>TON JOURNAL EST PRÊT</div>
              <div style={{ fontSize: 12.5, color: '#777', lineHeight: 1.55, margin: '8px auto 19px', maxWidth: 300 }}>
                Scanne ton repas ou ajoute un aliment pour commencer ton suivi nutrition.
              </div>
              <button onClick={() => { setShowAdd(true); setAddMode('photo'); }} style={{ border: 0, borderRadius: 12, background: ACCENT, color: '#050505', padding: '12px 17px', fontWeight: 950, cursor: 'pointer' }}>
                SCANNER UN REPAS
              </button>
            </div>
          ) : mealGroups.map(({ meal, items }) => (
            <div key={meal} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: '#777', textTransform: 'uppercase', letterSpacing: '.09em', margin: '0 2px 8px' }}>{meal}</div>
              {items.map((item: any) => (
                <div key={item.id} style={{ background: '#FFFFFF', border: '1px solid #232323', borderRadius: 16, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Thumbnail photo si scan, sinon icône */}
                  {item.photo_url ? (
                    <img src={item.photo_url} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} alt="" />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: '#181818', border: '1px solid #232323', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 900, color: ACCENT, lineHeight: 1 }}>{Math.round(item.calories || 0)}</div>
                      <div style={{ fontSize: 8, color: '#777', marginTop: 1 }}>kcal</div>
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 850, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#0A0A0A' }}>
                      {item.food_name || 'Aliment'}
                    </div>
                    <div style={{ fontSize: 10.5, color: '#666', marginTop: 3 }}>
                      {Math.round(item.calories || 0)} kcal · P {item.protein || 0}g · G {item.carbs || 0}g · L {item.fat || 0}g
                    </div>
                  </div>
                  <button onClick={() => deleteEntry(item.id)} aria-label="Supprimer" style={{ width: 32, height: 32, borderRadius: 10, background: '#151515', border: '1px solid #232323', color: '#666', cursor: 'pointer', fontSize: 18, flexShrink: 0 }}>×</button>
                </div>
              ))}
            </div>
          ))}
        </section>
      </main>

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.84)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: 560, background: '#FFFFFF', border: '1px solid #EAEAEA', borderBottom: 0, borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column', maxHeight: '88vh' }}>
          {/* Zone scrollable */}
          <div style={{ padding: '10px 20px 0', overflowY: 'auto', overflowX: 'hidden', flex: 1, WebkitOverflowScrolling: 'touch', boxSizing: 'border-box' }}>
            <div style={{ width: 38, height: 4, background: '#2c2c2c', borderRadius: 999, margin: '2px auto 17px' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 9.5, color: ACCENT, fontWeight: 950, letterSpacing: '.11em' }}>NOX NUTRITION</div>
                <div style={{ fontSize: 18, fontWeight: 950, marginTop: 3 }}>
                  {addMode === 'choose' ? 'AJOUTER UN REPAS' : addMode === 'photo' ? 'SCAN IA' : addMode === 'search' ? 'RECHERCHER' : addMode === 'barcode' ? 'CODE-BARRES' : 'SAISIE MANUELLE'}
                </div>
              </div>
              <button onClick={closeAdd} style={{ width: 36, height: 36, borderRadius: 12, border: '1px solid #EAEAEA', background: '#151515', color: '#888', fontSize: 21, cursor: 'pointer' }}>×</button>
            </div>

            {addMode !== 'choose' && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto' }}>
                {MEALS.map(m => (
                  <button key={m} onClick={() => setSelectedMeal(m)} style={{
                    flexShrink: 0, padding: '7px 11px', borderRadius: 999,
                    border: '1px solid ' + (selectedMeal === m ? 'rgba(200,255,0,.34)' : '#242424'),
                    background: selectedMeal === m ? 'rgba(200,255,0,.09)' : '#111',
                    color: selectedMeal === m ? ACCENT : '#777', fontSize: 10.5, fontWeight: 850, cursor: 'pointer'
                  }}>{m}</button>
                ))}
              </div>
            )}

            {addMode === 'choose' && (
              <div>
                <div style={{ fontSize: 10, color: '#666', fontWeight: 850, marginBottom: 8 }}>AJOUTER À</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto' }}>
                  {MEALS.map(m => (
                    <button key={m} onClick={() => setSelectedMeal(m)} style={{
                      flexShrink: 0, padding: '7px 11px', borderRadius: 999,
                      border: '1px solid ' + (selectedMeal === m ? 'rgba(200,255,0,.34)' : '#242424'),
                      background: selectedMeal === m ? 'rgba(200,255,0,.09)' : '#111',
                      color: selectedMeal === m ? ACCENT : '#777', fontSize: 10.5, fontWeight: 850, cursor: 'pointer'
                    }}>{m}</button>
                  ))}
                </div>

                <div style={{ display: 'grid', gap: 9 }}>
                  <button onClick={() => { setAddMode('photo'); fileRef.current?.click(); }} style={{
                    minHeight: 96, padding: 17, borderRadius: 17, cursor: 'pointer', textAlign: 'left',
                    background: 'linear-gradient(135deg,rgba(200,255,0,.13),rgba(200,255,0,.035))',
                    border: '1px solid rgba(200,255,0,.25)', color: '#0A0A0A'
                  }}>
                    <div style={{ color: ACCENT, fontSize: 10, fontWeight: 950, letterSpacing: '.09em' }}>RECOMMANDÉ</div>
                    <div style={{ fontSize: 16, fontWeight: 950, marginTop: 7 }}>Scanner avec NOX</div>
                    <div style={{ fontSize: 11.5, color: '#888', lineHeight: 1.45, marginTop: 4 }}>Prends une photo. NOX estime les aliments, calories et macros.</div>
                  </button>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 9 }}>
                    <button onClick={() => setAddMode('search')} style={{ minHeight: 82, padding: 14, background: '#FFFFFF', border: '1px solid #EAEAEA', borderRadius: 15, cursor: 'pointer', textAlign: 'left', color: '#0A0A0A' }}>
                      <div style={{ fontSize: 13.5, fontWeight: 900 }}>Rechercher</div>
                      <div style={{ fontSize: 10.5, color: '#666', marginTop: 4 }}>Base d'aliments</div>
                    </button>

                    <button onClick={() => setAddMode('barcode')} style={{ minHeight: 82, padding: 14, background: '#FFFFFF', border: '1px solid #EAEAEA', borderRadius: 15, cursor: 'pointer', textAlign: 'left', color: '#0A0A0A' }}>
                      <div style={{ fontSize: 13.5, fontWeight: 900 }}>Code-barres</div>
                      <div style={{ fontSize: 10.5, color: '#666', marginTop: 4 }}>Scanner un produit</div>
                    </button>
                  </div>

                  <button onClick={() => setAddMode('custom')} style={{ padding: 15, background: '#FFFFFF', border: '1px solid #EAEAEA', borderRadius: 15, cursor: 'pointer', textAlign: 'left', color: '#0A0A0A' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 900 }}>Saisie manuelle</div>
                    <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>Entrer directement calories et macros</div>
                  </button>
                </div>
              </div>
            )}

            {addMode === 'photo' && (
              <div>
                {photoBase64 && (
                  <div style={{ marginBottom: 15, borderRadius: 17, overflow: 'hidden', height: 230, background: '#050505', border: '1px solid #EAEAEA' }}>
                    <img src={photoBase64} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Repas à analyser" />
                  </div>
                )}

                {scanning && (
                  <div style={{ padding: '34px 18px', textAlign: 'center', borderRadius: 18, background: '#FFFFFF', border: '1px solid #EAEAEA' }}>
                    <div style={{ width: 42, height: 42, margin: '0 auto 15px', borderRadius: 14, border: '1px solid rgba(200,255,0,.25)', background: 'rgba(200,255,0,.08)', display: 'grid', placeItems: 'center', color: ACCENT, fontWeight: 950 }}>AI</div>
                    <div style={{ fontSize: 15, fontWeight: 950 }}>NOX ANALYSE TON REPAS</div>
                    <div style={{ fontSize: 11.5, color: '#666', marginTop: 7 }}>Détection des aliments et estimation nutritionnelle…</div>
                  </div>
                )}

                {scanError && !scanning && (
                  <div style={{ background: 'rgba(255,90,80,.08)', border: '1px solid rgba(255,90,80,.28)', borderRadius: 14, padding: 14, marginBottom: 14, fontSize: 12, lineHeight: 1.5, color: '#ff8c82' }}>
                    {scanError}
                  </div>
                )}

                {scanResult && !scanning && (
                  <div>
                    <div style={{ background: 'rgba(200,255,0,.055)', border: '1px solid rgba(200,255,0,.20)', borderRadius: 16, padding: 15, marginBottom: 11 }}>
                      <div style={{ fontSize: 9.5, color: ACCENT, fontWeight: 900, letterSpacing: '.08em' }}>REPAS DÉTECTÉ · FIABILITÉ {scanResult.fiabilite}</div>
                      <div style={{ fontSize: 15, fontWeight: 900, marginTop: 6 }}>{scanResult.description}</div>
                      {scanResult.note && <div style={{ fontSize: 11, color: '#777', lineHeight: 1.45, marginTop: 5 }}>{scanResult.note}</div>}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 14 }}>
                      {[
                        ['KCAL', Math.round(scanResult.total?.kcal ?? scanResult.total?.calories ?? 0), ACCENT],
                        ['PROT.', Math.round(scanResult.total?.protein ?? scanResult.total?.proteines ?? 0) + 'g', '#fff'],
                        ['GLUC.', Math.round(scanResult.total?.carbs ?? scanResult.total?.glucides ?? 0) + 'g', '#8da0ff'],
                        ['LIP.', Math.round(scanResult.total?.fat ?? scanResult.total?.lipides ?? 0) + 'g', '#ff806b'],
                      ].map(([label, value, color]) => (
                        <div key={String(label)} style={{ background: '#FFFFFF', border: '1px solid #EAEAEA', borderRadius: 13, padding: '11px 5px', textAlign: 'center' }}>
                          <div style={{ color: String(color), fontSize: 16, fontWeight: 950 }}>{value}</div>
                          <div style={{ color: '#777', fontSize: 8.5, fontWeight: 850, marginTop: 4 }}>{label}</div>
                        </div>
                      ))}
                    </div>

                    {scanResult.aliments?.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 9.5, color: '#666', fontWeight: 900, letterSpacing: '.08em', marginBottom: 7 }}>ALIMENTS DÉTECTÉS</div>
                        {scanResult.aliments.map((a: any, i: number) => (
                          <div key={i} style={{ background: '#FFFFFF', border: '1px solid #EAEAEA', borderRadius: 13, padding: 12, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 850 }}>{a.nom}</div>
                              <div style={{ fontSize: 10, color: '#666', marginTop: 3 }}>{a.quantite} · P {a.protein}g · G {a.carbs}g · L {a.fat}g</div>
                            </div>
                            <div style={{ color: ACCENT, fontSize: 11.5, fontWeight: 900 }}>{a.kcal} kcal</div>
                            <button 
                              onClick={e => { e.stopPropagation(); addSingleFood(a); }}
                              style={{ border: '1px solid rgba(200,255,0,.22)', background: 'rgba(200,255,0,.07)', color: ACCENT, borderRadius: 9, padding: '10px 14px', fontSize: 14, fontWeight: 900, cursor: 'pointer', touchAction: 'manipulation', minWidth: 44, minHeight: 44 }}>
                              +
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ height: 10 }} />
                  </div>
                )}

                {!photoBase64 && !scanning && !scanResult && (
                  <div style={{ padding: '34px 18px', textAlign: 'center', borderRadius: 18, background: '#FFFFFF', border: '1px solid #EAEAEA' }}>
                    <div style={{ width: 56, height: 56, margin: '0 auto 16px', borderRadius: 18, background: 'rgba(200,255,0,.08)', border: '1px solid rgba(200,255,0,.18)', display: 'grid', placeItems: 'center', color: ACCENT, fontSize: 11, fontWeight: 950 }}>SCAN</div>
                    <div style={{ fontSize: 16, fontWeight: 950 }}>PHOTOGRAPHIE TON REPAS</div>
                    <div style={{ fontSize: 11.5, color: '#777', lineHeight: 1.5, margin: '7px auto 18px', maxWidth: 300 }}>NOX identifie les aliments et estime les calories et macros. Vérifie le résultat avant de l’ajouter.</div>
                    <button onClick={() => fileRef.current?.click()} style={{ width: '100%', padding: 14, background: ACCENT, border: 0, borderRadius: 13, color: '#050505', fontWeight: 950, cursor: 'pointer' }}>OUVRIR L'APPAREIL PHOTO</button>
                    <button onClick={() => setAddMode('choose')} style={{ marginTop: 12, background: 'none', border: 0, color: '#666', cursor: 'pointer', fontSize: 11 }}>← Retour</button>
                  </div>
                )}
              </div>
            )}

            {addMode === 'search' && !selectedFood && (
              <>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un aliment…" autoFocus
                  style={{ width: '100%', boxSizing: 'border-box', padding: '13px 14px', background: '#FFFFFF', border: '1px solid #EAEAEA', borderRadius: 13, color: '#0A0A0A', fontSize: 13, outline: 'none', marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 6 }}>
                  {categories.map(cat => (
                    <button key={cat} onClick={() => setCategory(cat)}
                      style={{ padding: '5px 12px', borderRadius: 20, border: '1px solid ' + (category === cat ? ACCENT : '#1a1a1a'), background: category === cat ? 'rgba(183,255,0,.14)' : 'transparent', color: category === cat ? ACCENT : '#555', fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {cat}
                    </button>
                  ))}
                </div>
                {!search && recentFoods.length > 0 && (
                  <div style={{ margin: '4px 0 12px' }}>
                    <div style={{ fontSize: 9.5, color: '#666', fontWeight: 900, letterSpacing: '.08em', marginBottom: 7 }}>FRÉQUENTS</div>
                    <div style={{ display: 'grid', gap: 7 }}>
                      {recentFoods.map((f: any) => (
                        <button
                          key={f.food_name}
                          onClick={() => setSelectedFood({
                            name: f.food_name,
                            kcal: f.calories || 0,
                            protein: f.protein || 0,
                            carbs: f.carbs || 0,
                            fat: f.fat || 0,
                          })}
                          style={{ background: '#FFFFFF', border: '1px solid #EAEAEA', borderRadius: 13, padding: 13, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', gap: 10, color: '#0A0A0A' }}
                        >
                          <div>
                            <div style={{ fontSize: 12.5, fontWeight: 850 }}>{f.food_name}</div>
                            <div style={{ fontSize: 10, color: '#666', marginTop: 3 }}>Aliment fréquent</div>
                          </div>
                          <div style={{ color: ACCENT, fontSize: 11.5, fontWeight: 900, flexShrink: 0 }}>{Math.round(f.calories || 0)} kcal</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gap: 7 }}>
                  {filtered.map(f => (
                    <button key={f.name} onClick={() => setSelectedFood(f)} style={{ background: '#FFFFFF', border: '1px solid #EAEAEA', borderRadius: 13, padding: 13, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', gap: 10, color: '#0A0A0A' }}>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 850 }}>{f.name}</div>
                        <div style={{ fontSize: 10, color: '#666', marginTop: 3 }}>P {f.protein}g · G {f.carbs}g · L {f.fat}g</div>
                      </div>
                      <div style={{ color: ACCENT, fontSize: 11.5, fontWeight: 900, flexShrink: 0 }}>{f.kcal} kcal</div>
                    </button>
                  ))}
                </div>
                <button onClick={() => setAddMode('choose')} style={{ marginTop: 14, background: 'none', border: 0, color: '#666', cursor: 'pointer', fontSize: 11 }}>← Retour</button>
              </>
            )}

            {addMode === 'search' && selectedFood && (
              <div>
                <div style={{ background: '#FFFFFF', border: '1px solid #EAEAEA', borderRadius: 16, padding: 16, marginBottom: 13 }}>
                  <div style={{ fontSize: 15, fontWeight: 900 }}>{selectedFood.name}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginTop: 14 }}>
                    {[
                      ['KCAL', Math.round(selectedFood.kcal * (parseFloat(qty) || 1)), ACCENT],
                      ['PROT.', Math.round(selectedFood.protein * (parseFloat(qty) || 1) * 10) / 10 + 'g', '#fff'],
                      ['GLUC.', Math.round(selectedFood.carbs * (parseFloat(qty) || 1) * 10) / 10 + 'g', '#8da0ff'],
                      ['LIP.', Math.round(selectedFood.fat * (parseFloat(qty) || 1) * 10) / 10 + 'g', '#ff806b'],
                    ].map(([label, value, color]) => (
                      <div key={String(label)} style={{ background: '#F7F7F7', borderRadius: 11, padding: '10px 4px', textAlign: 'center' }}>
                        <div style={{ color: String(color), fontSize: 15, fontWeight: 950 }}>{value}</div>
                        <div style={{ color: '#777', fontSize: 8, marginTop: 3 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <label style={{ fontSize: 9.5, color: '#666', fontWeight: 850 }}>QUANTITÉ · PORTIONS</label>
                <input value={qty} onChange={e => setQty(e.target.value)} type="number" min="0.1" step="0.1"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '13px 14px', background: '#FFFFFF', border: '1px solid #EAEAEA', borderRadius: 13, color: '#0A0A0A', fontSize: 14, outline: 'none', margin: '7px 0 13px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '.8fr 1.2fr', gap: 8 }}>
                  <button onClick={() => setSelectedFood(null)} style={{ padding: 13, background: '#FFFFFF', border: '1px solid #EAEAEA', borderRadius: 12, color: '#666', fontWeight: 850, cursor: 'pointer' }}>RETOUR</button>
                  <button onClick={() => addEntry(selectedFood)} style={{ padding: 13, background: ACCENT, border: 0, borderRadius: 12, color: '#050505', fontWeight: 950, cursor: 'pointer' }}>AJOUTER</button>
                </div>
              </div>
            )}

            {addMode === 'barcode' && (
              <div>
                <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid #EAEAEA', background: '#FFFFFF' }}>
                  <BarcodeScanner
                    onResult={(food: any) => {
                      if (!food) return;
                      setSelectedFood({
                        name: food.name || food.product_name || 'Produit scanné',
                        kcal: food.kcal ?? food.calories ?? 0,
                        protein: food.protein ?? 0,
                        carbs: food.carbs ?? 0,
                        fat: food.fat ?? 0,
                      });
                      setAddMode('search');
                    }}
                    onClose={() => setAddMode('choose')}
                  />
                </div>
                <button onClick={() => setAddMode('choose')} style={{ width: '100%', marginTop: 12, padding: 12, background: '#FFFFFF', border: '1px solid #EAEAEA', borderRadius: 12, color: '#888', cursor: 'pointer', fontWeight: 800 }}>
                  RETOUR
                </button>
              </div>
            )}

            {addMode === 'custom' && (
              <div style={{ display: 'grid', gap: 10 }}>
                {[
                  { key: 'name', label: "Nom de l'aliment", type: 'text', placeholder: 'Ex. Bol de riz au poulet' },
                  { key: 'kcal', label: 'Calories (kcal)', type: 'number', placeholder: '0' },
                  { key: 'protein', label: 'Protéines (g)', type: 'number', placeholder: '0' },
                  { key: 'carbs', label: 'Glucides (g)', type: 'number', placeholder: '0' },
                  { key: 'fat', label: 'Lipides (g)', type: 'number', placeholder: '0' },
                ].map(({ key, label, type, placeholder }) => (
                  <label key={key} style={{ display: 'block' }}>
                    <div style={{ fontSize: 9.5, color: '#666', fontWeight: 850, marginBottom: 5 }}>{label.toUpperCase()}</div>
                    <input value={(custom as any)[key]} onChange={e => setCustom(p => ({ ...p, [key]: e.target.value }))} type={type} placeholder={placeholder}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '13px 14px', background: '#FFFFFF', border: '1px solid #EAEAEA', borderRadius: 13, color: '#0A0A0A', fontSize: 13, outline: 'none' }} />
                  </label>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '.8fr 1.2fr', gap: 8, marginTop: 4 }}>
                  <button onClick={() => setAddMode('choose')} style={{ padding: 13, background: '#FFFFFF', border: '1px solid #EAEAEA', borderRadius: 12, color: '#666', fontWeight: 850, cursor: 'pointer' }}>RETOUR</button>
                  <button onClick={addCustom} style={{ padding: 13, background: ACCENT, border: 0, borderRadius: 12, color: '#050505', fontWeight: 950, cursor: 'pointer' }}>AJOUTER</button>
                </div>
              </div>
            )}
          </div>{/* fin zone scrollable */}

          {/* BOUTONS SCAN FIXES EN BAS */}
          {addMode === 'photo' && scanResult && (
            <div style={{ flexShrink: 0, padding: '12px 20px 20px', background: '#FFFFFF', borderTop: '1px solid #1a1a1a' }}>
              <button
                onTouchEnd={e => { e.preventDefault(); addScanResult(); }}
                onClick={addScanResult}
                style={{ width: '100%', padding: 20, background: ACCENT, border: 'none', borderRadius: 16, color: '#000', fontWeight: 900, fontSize: 17, cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', marginBottom: 8 }}>
                ✓ AJOUTER · {Math.round(scanResult.total?.kcal ?? scanResult.total?.calories ?? 0)} KCAL
              </button>
              <button
                onTouchEnd={e => { e.preventDefault(); setPhotoBase64(null); setScanResult(null); }}
                onClick={() => { setPhotoBase64(null); setScanResult(null); }}
                style={{ width: '100%', padding: 12, background: 'transparent', border: '1px solid #EAEAEA', borderRadius: 12, color: '#888', fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>
                Nouvelle photo
              </button>
            </div>
          )}
          </div>{/* fin modal */}
        </div>
      )}

      <BottomNav active="nutrition" />
    </div>
  );
}
