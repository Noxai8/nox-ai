import { calculateRealTDEE } from '../lib/noxBrain';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

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

type AddMode = 'choose' | 'photo' | 'search' | 'custom';

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
    // Utiliser la date locale (pas UTC) pour éviter le décalage de fuseau horaire
    const now = new Date();
    const localDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    // Début et fin de journée en UTC depuis la date locale
    const startOfDay = new Date(localDate + 'T00:00:00');
    const endOfDay = new Date(localDate + 'T23:59:59');

    const [{ data: t }, { data: e }, { data: profile }] = await Promise.all([
      supabase.from('nutrition_targets').select('*').eq('user_id', user!.id).maybeSingle(),
      supabase.from('food_entries').select('*').eq('user_id', user!.id)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at'),
      supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle(),
    ]);

    // Objectifs nutritionnels — créer des défauts si pas encore configurés
    if (t) {
      setTargets({ kcal: t.calories || 2200, protein: t.protein || 160, carbs: t.carbs || 220, fat: t.fat || 70 });
    } else if (profile) {
      // Calculer des objectifs par défaut selon le profil
      const weight = profile.starting_weight_kg || 75;
      const goal = profile.goal_type || '';
      const defaultProtein = Math.round(weight * 2); // 2g/kg
      const defaultKcal = goal.includes('gras') ? 2000 : goal.includes('muscle') ? 2800 : 2400;
      const defaultCarbs = Math.round((defaultKcal * 0.45) / 4);
      const defaultFat = Math.round((defaultKcal * 0.25) / 9);
      setTargets({ kcal: defaultKcal, protein: defaultProtein, carbs: defaultCarbs, fat: defaultFat });
      // Sauvegarder en DB pour la prochaine fois
      await supabase.from('nutrition_targets').insert({
        user_id: user!.id,
        calories: defaultKcal,
        protein: defaultProtein,
        carbs: defaultCarbs,
        fat: defaultFat,
        created_at: new Date().toISOString(),
      }).onConflict('user_id').ignore();
    }

    setEntries(e || []);

    // TDEE réel (en arrière-plan, ne bloque pas l'affichage)
    const [{ data: allBodyLogs }, { data: allFuel }] = await Promise.all([
      supabase.from('body_logs').select('weight, created_at').eq('user_id', user!.id).order('created_at'),
      supabase.from('food_entries').select('calories, created_at').eq('user_id', user!.id).order('created_at'),
    ]);
    if (allBodyLogs && allFuel && profile) {
      const tdeeResult = calculateRealTDEE(allBodyLogs, allFuel, profile);
      setTdee(tdeeResult);
      if (tdeeResult.tdeeReal && tdeeResult.confidence !== 'insuffisant' && !t) {
        const targetKcal = profile.goal_type?.includes('gras') || profile.goal_type?.includes('poids')
          ? tdeeResult.tdeeReal - 400
          : tdeeResult.tdeeReal + 200;
        setTargets(prev => ({ ...prev, kcal: Math.round(targetKcal) }));
      }
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
      // Appel direct à la Edge Function Supabase
      const fnResponse = await fetch(
        'https://zpxrsmnpcyzafawlweyl.supabase.co/functions/v1/analyze-meal',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpweHJzbW5wY3l6YWZhd2x3ZXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNTI1MDAsImV4cCI6MjEwNDkyODUwMH0.h76-uAn6f4qwtxIOTUt3sSzMdOSg7BzMIRFkXZW6iq4',
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
    
    // Gérer les différentes structures possibles retournées par Claude
    const total = scanResult.total || scanResult;
    const kcal = total.kcal ?? total.calories ?? total.cal ?? 0;
    const protein = total.protein ?? total.proteines ?? total.proteins ?? 0;
    const carbs = total.carbs ?? total.glucides ?? total.carbohydrates ?? 0;
    const fat = total.fat ?? total.lipides ?? total.fats ?? 0;
    
    if (!kcal && !protein) {
      // Rien à ajouter
      closeAdd();
      return;
    }
    
    const entry = {
      user_id: user!.id,
      meal_type: selectedMeal,
      food_name: scanResult.description || scanResult.nom || 'Repas scanné',
      calories: Math.round(kcal),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      quantity: 1,
      created_at: new Date().toISOString(),
    };
    
    const { error } = await supabase.from('food_entries').insert(entry);
    if (!error) {
      await loadData();
      closeAdd();
    } else {
      console.error('Insert error:', error);
    }
  };

  const addSingleFood = async (food: any) => {
    await supabase.from('food_entries').insert({
      user_id: user!.id,
      meal_type: selectedMeal,
      food_name: food.nom || food.name || 'Aliment',
      calories: Math.round(food.kcal || food.calories || 0),
      protein: Math.round(food.protein * 10) / 10,
      carbs: Math.round(food.carbs * 10) / 10,
      fat: Math.round(food.fat * 10) / 10,
      quantity: 1,
      created_at: new Date().toISOString(),
    });
    await loadData();
    closeAdd();
  };
  // ──────────────────────────────────────────────────────────────

  const addEntry = async (food: any) => {
    const q = parseFloat(qty) || 1;
    await supabase.from('food_entries').insert({
      user_id: user!.id,
      meal_type: selectedMeal,
      food_name: food.name,
      calories: Math.round(food.kcal * q),
      protein: Math.round(food.protein * q * 10) / 10,
      carbs: Math.round(food.carbs * q * 10) / 10,
      fat: Math.round(food.fat * q * 10) / 10,
      quantity: q,
      created_at: new Date().toISOString(),
    });
    await loadData();
    closeAdd();
  };

  const addCustom = async () => {
    await supabase.from('food_entries').insert({
      user_id: user!.id,
      meal_type: selectedMeal,
      food_name: custom.name || 'Aliment',
      calories: parseFloat(custom.kcal) || 0,
      protein: parseFloat(custom.protein) || 0,
      carbs: parseFloat(custom.carbs) || 0,
      fat: parseFloat(custom.fat) || 0,
      quantity: 1,
      created_at: new Date().toISOString(),
    });
    await loadData();
    setCustom({ name: '', kcal: '', protein: '', carbs: '', fat: '' });
    closeAdd();
  };

  const deleteEntry = async (id: string) => {
    await supabase.from('food_entries').delete().eq('id', id);
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
        <span style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</span>
        <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>{Math.round(val)}g</span>
      </div>
      <div style={{ height: 4, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct(val, max) + '%', background: color, borderRadius: 2, transition: 'width .5s' }} />
      </div>
      <div style={{ fontSize: 10, color: '#333', marginTop: 2 }}>{max}g obj.</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#070707', color: '#fff', paddingBottom: 100 }}>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhotoSelect} />

      <main style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
        <header style={{
          padding: '24px 20px 18px',
          background: 'radial-gradient(circle at 88% 0%, rgba(200,255,0,.06), transparent 30%), #090909',
          borderBottom: '1px solid ' + BORDER
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: '#777', textTransform: 'uppercase', letterSpacing: '.14em', fontWeight: 850 }}>Nutrition quotidienne</div>
              <div style={{ fontSize: 27, fontWeight: 950, letterSpacing: '-.04em', marginTop: 4 }}>FUEL</div>
            </div>
            <button onClick={() => setShowAdd(true)} style={{
              border: 0, borderRadius: 13, background: ACCENT, color: '#050505', padding: '11px 15px',
              fontSize: 11, fontWeight: 950, letterSpacing: '.04em', cursor: 'pointer'
            }}>+ AJOUTER</button>
          </div>
        </header>

        <section style={{ padding: 20 }}>
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
              </div>
            </div>

            <div style={{ display: 'grid', gap: 13, marginTop: 22 }}>
              <MacroBar label="Protéines" val={totals.protein} max={targets.protein} color={ACCENT} />
              <MacroBar label="Glucides" val={totals.carbs} max={targets.carbs} color="#6f8cff" />
              <MacroBar label="Lipides" val={totals.fat} max={targets.fat} color="#ff775e" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.25fr .75fr', gap: 10, marginTop: 12 }}>
            <button onClick={() => { setShowAdd(true); setAddMode('photo'); }} style={{
              minHeight: 84, borderRadius: 18, border: '1px solid rgba(200,255,0,.22)',
              background: 'linear-gradient(135deg,rgba(200,255,0,.12),rgba(200,255,0,.035))',
              color: '#fff', textAlign: 'left', padding: 15, cursor: 'pointer'
            }}>
              <div style={{ color: ACCENT, fontSize: 10, fontWeight: 950, letterSpacing: '.09em' }}>SCAN IA</div>
              <div style={{ fontSize: 14, fontWeight: 900, marginTop: 6 }}>Scanner mon repas</div>
              <div style={{ fontSize: 10.5, color: '#777', marginTop: 4 }}>Photo → calories + macros</div>
            </button>
            <button onClick={() => setShowAdd(true)} style={{
              minHeight: 84, borderRadius: 18, border: '1px solid #232323',
              background: '#111', color: '#fff', textAlign: 'left', padding: 15, cursor: 'pointer'
            }}>
              <div style={{ color: '#777', fontSize: 10, fontWeight: 900, letterSpacing: '.08em' }}>RAPIDE</div>
              <div style={{ fontSize: 14, fontWeight: 900, marginTop: 6 }}>Ajouter</div>
              <div style={{ fontSize: 10.5, color: '#666', marginTop: 4 }}>Recherche ou manuel</div>
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
                <div style={{ fontSize: 11, color: '#555', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em' }}>MÉTABOLISME RÉEL · confiance {tdee.confidence}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#c8ff00' }}>{tdee.tdeeReal} kcal</div>
              </div>
              {tdee.insight
                ? <div style={{ fontSize: 12, color: '#ffaa00', lineHeight: 1.5 }}>{tdee.insight}</div>
                : <div style={{ fontSize: 12, color: '#555' }}>Formule standard : {tdee.tdeeFormula} kcal · {tdee.weeksOfData} sem. de données</div>
              }
            </div>
          )}

          {mealGroups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '42px 22px', borderRadius: 22, background: '#111', border: '1px solid #232323' }}>
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
                <div key={item.id} style={{ background: '#111', border: '1px solid #232323', borderRadius: 16, padding: '14px 15px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: '#181818', display: 'grid', placeItems: 'center', color: ACCENT, fontSize: 12, fontWeight: 950, flexShrink: 0 }}>
                    {Math.round(item.calories || 0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 850, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.food_name}</div>
                    <div style={{ fontSize: 10.5, color: '#666', marginTop: 4 }}>P {item.protein}g · G {item.carbs}g · L {item.fat}g</div>
                  </div>
                  <button onClick={() => deleteEntry(item.id)} aria-label="Supprimer" style={{ width: 32, height: 32, borderRadius: 10, background: '#151515', border: '1px solid #232323', color: '#666', cursor: 'pointer', fontSize: 18 }}>×</button>
                </div>
              ))}
            </div>
          ))}
        </section>
      </main>

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.84)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 560, background: '#0d0d0d', border: '1px solid #242424', borderBottom: 0, borderRadius: '24px 24px 0 0', padding: '10px 20px max(24px, env(safe-area-inset-bottom))', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>
            <div style={{ width: 38, height: 4, background: '#2c2c2c', borderRadius: 999, margin: '2px auto 17px' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 9.5, color: ACCENT, fontWeight: 950, letterSpacing: '.11em' }}>NOX FUEL</div>
                <div style={{ fontSize: 18, fontWeight: 950, marginTop: 3 }}>
                  {addMode === 'choose' ? 'AJOUTER UN REPAS' : addMode === 'photo' ? 'SCAN IA' : addMode === 'search' ? 'RECHERCHER' : 'SAISIE MANUELLE'}
                </div>
              </div>
              <button onClick={closeAdd} style={{ width: 36, height: 36, borderRadius: 12, border: '1px solid #242424', background: '#151515', color: '#888', fontSize: 21, cursor: 'pointer' }}>×</button>
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
                    border: '1px solid rgba(200,255,0,.25)', color: '#fff'
                  }}>
                    <div style={{ color: ACCENT, fontSize: 10, fontWeight: 950, letterSpacing: '.09em' }}>RECOMMANDÉ</div>
                    <div style={{ fontSize: 16, fontWeight: 950, marginTop: 7 }}>Scanner avec NOX IA</div>
                    <div style={{ fontSize: 11.5, color: '#888', lineHeight: 1.45, marginTop: 4 }}>Prends une photo. NOX estime les aliments, calories et macros.</div>
                  </button>

                  <button onClick={() => setAddMode('search')} style={{ padding: 15, background: '#111', border: '1px solid #242424', borderRadius: 15, cursor: 'pointer', textAlign: 'left', color: '#fff' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 900 }}>Rechercher un aliment</div>
                    <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>Choisir dans ta base d'aliments courants</div>
                  </button>

                  <button onClick={() => setAddMode('custom')} style={{ padding: 15, background: '#111', border: '1px solid #242424', borderRadius: 15, cursor: 'pointer', textAlign: 'left', color: '#fff' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 900 }}>Saisie manuelle</div>
                    <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>Entrer directement calories et macros</div>
                  </button>
                </div>
              </div>
            )}

            {addMode === 'photo' && (
              <div>
                {photoBase64 && (
                  <div style={{ marginBottom: 15, borderRadius: 17, overflow: 'hidden', height: 230, background: '#050505', border: '1px solid #242424' }}>
                    <img src={photoBase64} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Repas à analyser" />
                  </div>
                )}

                {scanning && (
                  <div style={{ padding: '34px 18px', textAlign: 'center', borderRadius: 18, background: '#111', border: '1px solid #242424' }}>
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
                        <div key={String(label)} style={{ background: '#111', border: '1px solid #242424', borderRadius: 13, padding: '11px 5px', textAlign: 'center' }}>
                          <div style={{ color: String(color), fontSize: 16, fontWeight: 950 }}>{value}</div>
                          <div style={{ color: '#555', fontSize: 8.5, fontWeight: 850, marginTop: 4 }}>{label}</div>
                        </div>
                      ))}
                    </div>

                    {scanResult.aliments?.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 9.5, color: '#666', fontWeight: 900, letterSpacing: '.08em', marginBottom: 7 }}>ALIMENTS DÉTECTÉS</div>
                        {scanResult.aliments.map((a: any, i: number) => (
                          <div key={i} style={{ background: '#111', border: '1px solid #242424', borderRadius: 13, padding: 12, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 850 }}>{a.nom}</div>
                              <div style={{ fontSize: 10, color: '#666', marginTop: 3 }}>{a.quantite} · P {a.protein}g · G {a.carbs}g · L {a.fat}g</div>
                            </div>
                            <div style={{ color: ACCENT, fontSize: 11.5, fontWeight: 900 }}>{a.kcal} kcal</div>
                            <button onClick={() => addSingleFood(a)} style={{ border: '1px solid rgba(200,255,0,.22)', background: 'rgba(200,255,0,.07)', color: ACCENT, borderRadius: 9, padding: '6px 8px', fontSize: 9.5, fontWeight: 900, cursor: 'pointer' }}>+</button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '.8fr 1.2fr', gap: 8 }}>
                      <button onClick={() => { setPhotoBase64(null); setScanResult(null); fileRef.current?.click(); }} style={{ padding: 13, background: '#111', border: '1px solid #242424', borderRadius: 12, color: '#aaa', fontWeight: 850, cursor: 'pointer' }}>NOUVELLE PHOTO</button>
                      <button onClick={addScanResult} style={{ padding: 13, background: ACCENT, border: 0, borderRadius: 12, color: '#050505', fontWeight: 950, cursor: 'pointer' }}>AJOUTER TOUT · {Math.round(scanResult.total?.kcal ?? scanResult.total?.calories ?? 0)} KCAL</button>
                    </div>
                  </div>
                )}

                {!photoBase64 && !scanning && !scanResult && (
                  <div style={{ padding: '34px 18px', textAlign: 'center', borderRadius: 18, background: '#111', border: '1px solid #242424' }}>
                    <div style={{ width: 56, height: 56, margin: '0 auto 16px', borderRadius: 18, background: 'rgba(200,255,0,.08)', border: '1px solid rgba(200,255,0,.18)', display: 'grid', placeItems: 'center', color: ACCENT, fontSize: 11, fontWeight: 950 }}>SCAN</div>
                    <div style={{ fontSize: 16, fontWeight: 950 }}>PHOTOGRAPHIE TON REPAS</div>
                    <div style={{ fontSize: 11.5, color: '#777', lineHeight: 1.5, margin: '7px auto 18px', maxWidth: 300 }}>NOX identifiera les aliments et estimera automatiquement les calories et macros.</div>
                    <button onClick={() => fileRef.current?.click()} style={{ width: '100%', padding: 14, background: ACCENT, border: 0, borderRadius: 13, color: '#050505', fontWeight: 950, cursor: 'pointer' }}>OUVRIR L'APPAREIL PHOTO</button>
                    <button onClick={() => setAddMode('choose')} style={{ marginTop: 12, background: 'none', border: 0, color: '#666', cursor: 'pointer', fontSize: 11 }}>← Retour</button>
                  </div>
                )}
              </div>
            )}

            {addMode === 'search' && !selectedFood && (
              <>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un aliment…" autoFocus
                  style={{ width: '100%', boxSizing: 'border-box', padding: '13px 14px', background: '#111', border: '1px solid #242424', borderRadius: 13, color: '#fff', fontSize: 13, outline: 'none', marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 6 }}>
                  {categories.map(cat => (
                    <button key={cat} onClick={() => setCategory(cat)}
                      style={{ padding: '5px 12px', borderRadius: 20, border: '1px solid ' + (category === cat ? '#c8ff00' : '#1a1a1a'), background: category === cat ? '#c8ff0022' : 'transparent', color: category === cat ? '#c8ff00' : '#555', fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {cat}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'grid', gap: 7 }}>
                  {filtered.map(f => (
                    <button key={f.name} onClick={() => setSelectedFood(f)} style={{ background: '#111', border: '1px solid #242424', borderRadius: 13, padding: 13, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', gap: 10, color: '#fff' }}>
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
                <div style={{ background: '#111', border: '1px solid #242424', borderRadius: 16, padding: 16, marginBottom: 13 }}>
                  <div style={{ fontSize: 15, fontWeight: 900 }}>{selectedFood.name}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginTop: 14 }}>
                    {[
                      ['KCAL', Math.round(selectedFood.kcal * (parseFloat(qty) || 1)), ACCENT],
                      ['PROT.', Math.round(selectedFood.protein * (parseFloat(qty) || 1) * 10) / 10 + 'g', '#fff'],
                      ['GLUC.', Math.round(selectedFood.carbs * (parseFloat(qty) || 1) * 10) / 10 + 'g', '#8da0ff'],
                      ['LIP.', Math.round(selectedFood.fat * (parseFloat(qty) || 1) * 10) / 10 + 'g', '#ff806b'],
                    ].map(([label, value, color]) => (
                      <div key={String(label)} style={{ background: '#0b0b0b', borderRadius: 11, padding: '10px 4px', textAlign: 'center' }}>
                        <div style={{ color: String(color), fontSize: 15, fontWeight: 950 }}>{value}</div>
                        <div style={{ color: '#555', fontSize: 8, marginTop: 3 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <label style={{ fontSize: 9.5, color: '#666', fontWeight: 850 }}>QUANTITÉ · PORTIONS</label>
                <input value={qty} onChange={e => setQty(e.target.value)} type="number" min="0.1" step="0.1"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '13px 14px', background: '#111', border: '1px solid #242424', borderRadius: 13, color: '#fff', fontSize: 14, outline: 'none', margin: '7px 0 13px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '.8fr 1.2fr', gap: 8 }}>
                  <button onClick={() => setSelectedFood(null)} style={{ padding: 13, background: '#111', border: '1px solid #242424', borderRadius: 12, color: '#aaa', fontWeight: 850, cursor: 'pointer' }}>RETOUR</button>
                  <button onClick={() => addEntry(selectedFood)} style={{ padding: 13, background: ACCENT, border: 0, borderRadius: 12, color: '#050505', fontWeight: 950, cursor: 'pointer' }}>AJOUTER</button>
                </div>
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
                      style={{ width: '100%', boxSizing: 'border-box', padding: '13px 14px', background: '#111', border: '1px solid #242424', borderRadius: 13, color: '#fff', fontSize: 13, outline: 'none' }} />
                  </label>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '.8fr 1.2fr', gap: 8, marginTop: 4 }}>
                  <button onClick={() => setAddMode('choose')} style={{ padding: 13, background: '#111', border: '1px solid #242424', borderRadius: 12, color: '#aaa', fontWeight: 850, cursor: 'pointer' }}>RETOUR</button>
                  <button onClick={addCustom} style={{ padding: 13, background: ACCENT, border: 0, borderRadius: 12, color: '#050505', fontWeight: 950, cursor: 'pointer' }}>AJOUTER</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav active="fuel" />
    </div>
  );
}
