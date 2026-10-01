import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';
import { usePlan } from '../lib/usePlan';
import { Camera, ChevronRight, Plus, ScanLine, X } from 'lucide-react';

const ACCENT = '#C8FF00';
const BG = '#0A0A0A';
const WHITE = '#FFFFFF';
const BLACK = '#0A0A0A';
const SURFACE = '#111111';
const SURFACE_ALT = '#1A1A1A';
const MUTED = '#9A9A9A';
const BORDER = '#262626';
const FN = 'https://zpxrsmnpcyzafawlweyl.supabase.co/functions/v1';

const MEALS = ['Petit-dejeuner', 'Dejeuner', 'Diner', 'Snacks'];

const localDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const dateFromKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const FOOD_DB = [
  { name: 'Poulet grille', kcal: 165, protein: 31, carbs: 0, fat: 4 },
  { name: 'Riz blanc cuit', kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { name: 'Oeuf entier', kcal: 78, protein: 6, carbs: 0.6, fat: 5 },
  { name: 'Blanc de poulet', kcal: 110, protein: 23, carbs: 0, fat: 1.2 },
  { name: 'Saumon', kcal: 208, protein: 20, carbs: 0, fat: 13 },
  { name: 'Thon en boite', kcal: 116, protein: 26, carbs: 0, fat: 1 },
  { name: 'Steak hache 5%', kcal: 120, protein: 20, carbs: 0, fat: 5 },
  { name: 'Fromage blanc 0%', kcal: 57, protein: 10, carbs: 4, fat: 0.2 },
  { name: 'Yaourt grec', kcal: 57, protein: 10, carbs: 4, fat: 0.4 },
  { name: 'Flocons avoine', kcal: 379, protein: 13, carbs: 68, fat: 6.9 },
  { name: 'Pates cuites', kcal: 158, protein: 5.5, carbs: 31, fat: 0.9 },
  { name: 'Patate douce', kcal: 86, protein: 1.6, carbs: 20, fat: 0.1 },
  { name: 'Quinoa cuit', kcal: 120, protein: 4.4, carbs: 21, fat: 1.9 },
  { name: 'Avocat', kcal: 160, protein: 2, carbs: 9, fat: 15 },
  { name: 'Amandes', kcal: 580, protein: 21, carbs: 22, fat: 50 },
  { name: 'Whey proteine', kcal: 115, protein: 24, carbs: 2, fat: 1.5 },
  { name: 'Brocoli', kcal: 34, protein: 2.8, carbs: 7, fat: 0.4 },
  { name: 'Epinards', kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  { name: 'Banane', kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  { name: 'Pomme', kcal: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  { name: 'Pain complet', kcal: 240, protein: 10, carbs: 45, fat: 3 },
  { name: 'Lentilles', kcal: 116, protein: 9, carbs: 20, fat: 0.4 },
  { name: 'Pois chiches', kcal: 164, protein: 8.9, carbs: 27, fat: 2.6 },
  { name: 'Lait demi-ecreme', kcal: 46, protein: 3.2, carbs: 4.7, fat: 1.6 },
  { name: 'Cottage cheese', kcal: 90, protein: 12, carbs: 3, fat: 3 },
  { name: 'Beurre cacahuete', kcal: 628, protein: 27, carbs: 20, fat: 53 },
  { name: 'Crevettes cuites', kcal: 99, protein: 21, carbs: 0.5, fat: 1 },
  { name: 'Dinde', kcal: 104, protein: 22, carbs: 0, fat: 1.7 },
  { name: 'Skyr', kcal: 65, protein: 11, carbs: 4, fat: 0.2 },
];

export default function Fuel() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const { isPro } = usePlan();

  const [entries, setEntries] = useState<any[]>([]);
  const [selectedDateKey, setSelectedDateKey] = useState(() => localDateKey(new Date()));

  const [targets, setTargets] = useState<{
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null>(null);

  const [water, setWater] = useState(0);

  const [showAdd, setShowAdd] = useState(false);

  const [addMode, setAddMode] = useState<
    'choose' | 'photo' | 'search' | 'barcode' | 'quick' | 'voice' | 'custom'
  >('choose');

  const [selMeal, setSelMeal] = useState('Dejeuner');
  const [search, setSearch] = useState('');
  const [selFood, setSelFood] = useState<any>(null);
  const [qty, setQty] = useState('100');

  const [photoB64, setPhotoB64] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanRes, setScanRes] = useState<any>(null);

  const [voiceText, setVoiceText] = useState('');
  const [listening, setListening] = useState(false);

  const [quickKcal, setQuickKcal] = useState('');
  const [quickProt, setQuickProt] = useState('');

  const [saving, setSaving] = useState(false);

  const [customForm, setCustomForm] = useState({
    name: '',
    kcal: '',
    protein: '',
    carbs: '',
    fat: '',
  });

  useEffect(() => {
    if (user) load();
  }, [user, selectedDateKey]);

  const selectedDayBounds = () => {
    const d = dateFromKey(selectedDateKey);

    return {
      start: new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        0,
        0,
        0
      ).toISOString(),

      end: new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        23,
        59,
        59
      ).toISOString(),
    };
  };

  const load = async () => {
    const { start, end } = selectedDayBounds();

    const [{ data: ents }, { data: tgts }, { data: wlog }] =
      await Promise.all([
        supabase
          .from('food_entries')
          .select('*')
          .eq('user_id', user!.id)
          .gte('created_at', start)
          .lte('created_at', end)
          .order('created_at'),

        supabase
          .from('nutrition_targets')
          .select('calories, protein_g, carbs_g, fat_g')
          .eq('user_id', user!.id)
          .maybeSingle(),

        supabase
          .from('food_entries')
          .select('water_ml')
          .eq('user_id', user!.id)
          .gte('created_at', start)
          .lte('created_at', end),
      ]);

    setEntries(ents || []);

    if (tgts?.calories) {
      setTargets({
        kcal: Number(tgts.calories) || 0,
        protein: Number(tgts.protein_g) || 0,
        carbs: Number(tgts.carbs_g) || 0,
        fat: Number(tgts.fat_g) || 0,
      });
    } else {
      setTargets(null);
    }

    setWater(
      (wlog || []).reduce(
        (sum: number, entry: any) => sum + (entry.water_ml || 0),
        0
      )
    );
  };

  const totals = entries.reduce(
    (sum, entry) => ({
      kcal: sum.kcal + (entry.calories || 0),
      protein: sum.protein + (entry.protein || 0),
      carbs: sum.carbs + (entry.carbs || 0),
      fat: sum.fat + (entry.fat || 0),
    }),
    {
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    }
  );

  const hasTargets = !!targets;

  const kcalLeft = targets
    ? Math.max(0, targets.kcal - Math.round(totals.kcal))
    : 0;

  const protLeft = targets
    ? Math.max(0, targets.protein - Math.round(totals.protein))
    : 0;

  const kcalPct = targets?.kcal
    ? Math.min(100, Math.round((totals.kcal / targets.kcal) * 100))
    : 0;

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    const mondayOffset = (d.getDay() + 6) % 7;

    d.setDate(d.getDate() - mondayOffset + i);

    return {
      key: localDateKey(d),
      day: ['L', 'M', 'M', 'J', 'V', 'S', 'D'][i],
      date: d.getDate(),
      isToday: d.toDateString() === new Date().toDateString(),
    };
  });

  const selectedDate = dateFromKey(selectedDateKey);
  const isSelectedToday = selectedDateKey === localDateKey(new Date());

  const selectedDateLabel = isSelectedToday
    ? "AUJOURD'HUI"
    : selectedDate.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).toUpperCase();

  const selectedSubtitle = isSelectedToday
    ? "Ton alimentation aujourd'hui"
    : `Ton alimentation du ${selectedDate.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
      })}`;

  const mealIcon = (meal: string) =>
    ({
      'Petit-dejeuner': '☀️',
      Dejeuner: '☀️',
      Diner: '☾',
      Snacks: '◉',
    } as Record<string, string>)[meal] || '•';

  const mealLabel = (meal: string) =>
    (
      {
        'Petit-dejeuner': 'Petit-déjeuner',
        Dejeuner: 'Déjeuner',
        Diner: 'Dîner',
        Snacks: 'Snacks',
      } as Record<string, string>
    )[meal] || meal;

  /*
   * MODIF NOX :
   * même sans objectifs, NOX donne une direction au lieu
   * de laisser disparaître complètement l'interprétation.
   */
  const noxMessage = !targets
    ? {
        title: 'Configure ton cap.',
        body: 'Définis tes objectifs nutritionnels pour que NOX puisse interpréter précisément ta journée.',
      }
    : totals.kcal === 0
      ? {
          title: 'Ta journée commence ici.',
          body: 'Ajoute ton premier repas pour que NOX puisse interpréter ta journée.',
        }
      : totals.protein < targets.protein * 0.7
        ? {
            title: 'Priorité : protéines',
            body: `Il te reste environ ${kcalLeft} kcal et ${protLeft} g de protéines à compléter.`,
          }
        : {
            title: 'Tu es sur la bonne trajectoire.',
            body: `Il te reste environ ${kcalLeft} kcal. Continue à construire tes repas autour de ton objectif.`,
          };

  /*
   * MODIF AJOUT RAPIDE :
   * le gros + sélectionne automatiquement le repas
   * le plus logique selon l'heure.
   */
  const currentMeal = () => {
    const hour = new Date().getHours();

    if (hour < 11) return 'Petit-dejeuner';
    if (hour < 15) return 'Dejeuner';
    if (hour < 18) return 'Snacks';

    return 'Diner';
  };

  const openQuickAdd = () => {
    setSelMeal(currentMeal());
    setAddMode('choose');
    setShowAdd(true);
  };

  const closeAdd = () => {
    setShowAdd(false);
    setAddMode('choose');
    setSelFood(null);
    setQty('100');
    setSearch('');
    setPhotoB64(null);
    setScanRes(null);
    setQuickKcal('');
    setQuickProt('');
    setVoiceText('');

    setCustomForm({
      name: '',
      kcal: '',
      protein: '',
      carbs: '',
      fat: '',
    });
  };

  const entryDateForSelectedDay = () => {
    const now = new Date();
    const d = dateFromKey(selectedDateKey);
    d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    return d.toISOString();
  };

  const addEntry = async (data: {
    food_name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }) => {
    setSaving(true);

    await supabase.from('food_entries').insert({
      user_id: user!.id,
      meal_type: selMeal,
      ...data,
      created_at: entryDateForSelectedDay(),
    });

    await load();

    setSaving(false);
    closeAdd();
  };

  const deleteEntry = async (id: string) => {
    await supabase.from('food_entries').delete().eq('id', id);
    await load();
  };

  const addWater = async (ml: number) => {
    // Optimistic update — valeur immédiate
    setWater(current => current + ml);
    // Persistance réelle
    const { error } = await supabase.from('food_entries').insert({
      user_id: user!.id,
      meal_type: 'Eau',
      food_name: 'Eau',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      water_ml: ml,
      created_at: entryDateForSelectedDay(),
    });
    if (error) {
      // Rollback si erreur
      setWater(current => current - ml);
      console.error('Erreur addWater:', error.message);
    }
  };

  const handlePhoto = (file: File) => {
    const reader = new FileReader();
    reader.onload = async event => {
      const result = event.target?.result as string;
      setPhotoB64(result);
      setScanning(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const resp = await fetch(`${FN}/analyze-meal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
          body: JSON.stringify({ image: result }),
        });
        const data = await resp.json();
        if (!resp.ok || data?.error) {
          const msg = data?.error === 'PRO_REQUIRED'
            ? 'Le scan IA est réservé à NOX Pro.'
            : data?.error || `Erreur serveur (${resp.status})`;
          setScanRes({ error: msg });
          setScanning(false);
          return;
        }
        // La réponse peut être directement un objet JSON ou dans content[0].text
        if (data?.total) {
          setScanRes(data);
        } else {
          const text = data?.content?.[0]?.text || '';
          const match = text.match(/\{[\s\S]*\}/);
          if (match) setScanRes(JSON.parse(match[0]));
          else setScanRes({ error: 'Analyse impossible. Essaie avec une photo plus nette.' });
        }
      } catch (e: any) {
        setScanRes({ error: e?.message || 'Erreur réseau.' });
      }
      setScanning(false);
    };
    reader.readAsDataURL(file);
  };

  const startVoice = () => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SR) {
      setVoiceText('Non supporte sur ce navigateur.');
      return;
    }

    const rec = new SR();

    rec.lang = 'fr-FR';

    setListening(true);

    rec.onresult = (event: any) => {
      setVoiceText(event.results[0][0].transcript);
      setListening(false);
    };

    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    rec.start();
  };

  const addVoiceEntry = async () => {
    const lower = voiceText.toLowerCase();

    const food = FOOD_DB.find(item =>
      lower.includes(item.name.toLowerCase().split(' ')[0])
    );

    const match = lower.match(/(\d+)/);
    const grams = match ? parseInt(match[1]) : 100;

    if (food) {
      const ratio = grams / 100;

      await addEntry({
        food_name: `${food.name} (${grams}g)`,
        calories: Math.round(food.kcal * ratio),
        protein: Math.round(food.protein * ratio),
        carbs: Math.round(food.carbs * ratio),
        fat: Math.round(food.fat * ratio),
      });
    }
  };

  const filtered =
    search.length > 1
      ? FOOD_DB.filter(food =>
          food.name.toLowerCase().includes(search.toLowerCase())
        )
      : FOOD_DB;

  // Valeurs d'affichage — sans inventer de cibles si targets est null
  const displayKcal    = Math.round(totals.kcal);
  const displayProtein = Math.round(totals.protein);
  const displayCarbs   = Math.round(totals.carbs);
  const displayFat     = Math.round(totals.fat);
  const displayKcalPct = targets?.kcal
    ? Math.min(100, (displayKcal / targets.kcal) * 100)
    : 0;

  const card: React.CSSProperties = {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 24,
    padding: 20,
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: BG,
        color: WHITE,
        paddingBottom: 110,
      }}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={event => {
          const file = event.target.files?.[0];

          if (file) {
            setAddMode('photo');
            handlePhoto(file);
          }

          event.target.value = '';
        }}
      />

      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={event => {
          const file = event.target.files?.[0];

          if (file) {
            setAddMode('photo');
            handlePhoto(file);
          }

          event.target.value = '';
        }}
      />


      {/* =========================================================
          ÉCRAN 2 — NUTRITION
          ========================================================= */}

      <div className="nox-nutrition-shell">

        {/* HEADER */}
        <header className="nox-nutrition-header">
          <div className="nox-nutrition-title-row">
            <h1>Nutrition</h1>
            <div className="nox-nutrition-actions">
              <button type="button" aria-label="Rechercher un aliment" onClick={() => { setSelMeal(currentMeal()); setAddMode('search'); setShowAdd(true); }}>⌕</button>
              <button type="button" aria-label="Objectifs nutritionnels" onClick={() => navigate('/nutrition-goals')}>☷</button>
            </div>
          </div>
          <div className="nox-nutrition-tabs">
            <button className="active">Suivi</button>
            <button onClick={() => navigate('/recipes')}>Recettes</button>
          </div>
        </header>

        {/* RÉSUMÉ DU JOUR */}
        <section className="nox-summary-card">
          <div className="nox-card-label">Résumé du jour</div>
          <div className="nox-calorie-summary">
            <div className="nox-side-stat">
              <strong>{displayKcal.toLocaleString('fr-FR')}</strong>
              <span>Mangées</span>
              <i className="cyan-dot" />
            </div>
            <div className="nox-calorie-ring" style={{ background: targets?.kcal ? `conic-gradient(#C8FF00 ${displayKcalPct * 3.6}deg, #3A3E3B ${displayKcalPct * 3.6}deg)` : '#3A3E3B' }}>
              <div className="nox-calorie-ring-inner">
                <strong>{targets ? kcalLeft.toLocaleString('fr-FR') : '—'}</strong>
                <span>kcal restantes</span>
              </div>
            </div>
            <div className="nox-side-stat">
              <strong>—</strong>
              <span>Brûlées</span>
              <i className="orange-dot" />
            </div>
          </div>
          <div className="nox-macros">
            {[
              { label: 'Glucides',  value: displayCarbs,   target: targets?.carbs },
              { label: 'Protéines', value: displayProtein, target: targets?.protein },
              { label: 'Lipides',   value: displayFat,     target: targets?.fat },
            ].map(macro => {
              const pct = macro.target && macro.target > 0 ? Math.min(100, (macro.value / macro.target) * 100) : 0;
              return (
                <div key={macro.label} className="nox-macro">
                  <div className="nox-macro-top">
                    <span>{macro.label}</span>
                    <span>{Math.round(macro.value)} / {macro.target ?? '—'} g</span>
                  </div>
                  <div className="nox-macro-track">
                    <div className="nox-macro-progress" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* MES REPAS */}
        <section className="nox-meals-section">
          <div className="nox-section-title-row">
            <h2>Mes repas</h2>
            <button className="nox-round-add" onClick={openQuickAdd} aria-label="Ajouter un repas"><Plus size={20} strokeWidth={3} /></button>
          </div>
          <div className="nox-meals-card">
            {MEALS.map((meal, mealIndex) => {
              const mealEntries = entries.filter(e => e.meal_type === meal);
              const mealKcal = mealEntries.reduce((s, e) => s + (e.calories || 0), 0);
              const targetShare = meal === 'Petit-dejeuner' ? 0.30 : meal === 'Dejeuner' ? 0.40 : meal === 'Diner' ? 0.25 : 0.05;
              const estimatedMealTarget = targets?.kcal ? Math.round(targets.kcal * targetShare) : null;
              return (
                <div key={meal} className={`nox-meal${mealIndex < MEALS.length - 1 ? ' with-border' : ''}`}>
                  <div className="nox-meal-main">
                    <div className="nox-meal-left">
                      <div className="nox-meal-icon">{mealIcon(meal)}</div>
                      <div>
                        <div className="nox-meal-name">{mealLabel(meal)}</div>
                        <div className="nox-meal-kcal">{Math.round(mealKcal)}{estimatedMealTarget ? ` / ${estimatedMealTarget}` : ''} kcal</div>
                      </div>
                    </div>
                    <button className="nox-meal-add" onClick={() => { setSelMeal(meal); setAddMode('choose'); setShowAdd(true); }} aria-label={`Ajouter à ${mealLabel(meal)}`}>
                      <Plus size={19} strokeWidth={3} />
                    </button>
                  </div>
                  {mealEntries.length > 0 && (
                    <div className="nox-meal-entries">
                      {mealEntries.map(entry => (
                        <div key={entry.id} className="nox-food-entry">
                          <div>
                            <div className="nox-food-name">{entry.food_name}</div>
                            <div className="nox-food-meta">{Math.round(entry.calories)} kcal{entry.protein > 0 ? ` · ${Math.round(entry.protein)} g prot.` : ''}</div>
                          </div>
                          <button onClick={() => deleteEntry(entry.id)} aria-label="Supprimer">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* HYDRATATION */}
        <section className="nox-water-section">
          <div className="nox-section-title-row">
            <h2>Hydratation</h2>
            <span>{(water / 1000).toFixed(1)} L</span>
          </div>
          <div className="nox-water-card">
            <div className="nox-water-main">
              <div className="nox-water-icon">💧</div>
              <div>
                <strong>{(water / 1000).toFixed(1)} L</strong>
                <span>{isSelectedToday ? "Aujourd'hui" : selectedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
              </div>
            </div>
            <div className="nox-water-buttons">
              {[150, 250, 330, 500].map(ml => (
                <button key={ml} onClick={() => addWater(ml)}>+ {ml} ml</button>
              ))}
            </div>
          </div>
        </section>
      </div>

      <style>{`
        .nox-nutrition-shell { width:100%; max-width:760px; margin:0 auto; box-sizing:border-box; padding:42px 18px calc(170px + env(safe-area-inset-bottom)); }
        .nox-nutrition-header { margin-bottom:14px; }
        .nox-nutrition-title-row { display:flex; align-items:center; justify-content:space-between; gap:20px; margin-bottom:18px; }
        .nox-nutrition-title-row h1 { margin:0; color:#fff; font-size:40px; line-height:1; font-weight:1000; letter-spacing:-.05em; }
        .nox-nutrition-actions { display:flex; gap:8px; }
        .nox-nutrition-actions button { width:42px; height:42px; border-radius:50%; border:1px solid #303330; background:#1B1E1C; color:#fff; display:grid; place-items:center; font-size:21px; font-weight:900; cursor:pointer; }
        .nox-nutrition-tabs { display:grid; grid-template-columns:1fr 1fr; gap:7px; padding:4px; border-radius:999px; background:#171A18; margin-bottom:12px; }
        .nox-nutrition-tabs button { height:42px; border:0; border-radius:999px; background:transparent; color:#B0B4B1; font-size:13px; font-weight:900; cursor:pointer; }
        .nox-nutrition-tabs button.active { background:#C8FF00; color:#090B0A; }
        .nox-summary-card { padding:18px 20px 21px; background:#242725; border:1.5px solid #505551; border-radius:22px; box-sizing:border-box; }
        .nox-card-label { margin-bottom:15px; color:#fff; font-size:13px; font-weight:900; }
        .nox-calorie-summary { display:grid; grid-template-columns:1fr 150px 1fr; align-items:center; gap:15px; }
        .nox-side-stat { display:flex; flex-direction:column; align-items:center; }
        .nox-side-stat strong { color:#fff; font-size:20px; font-weight:950; }
        .nox-side-stat span { margin-top:3px; color:#A8ACA9; font-size:11px; }
        .nox-side-stat i { width:7px; height:7px; margin-top:7px; border-radius:50%; }
        .cyan-dot { background:#74DDD7; }
        .orange-dot { background:#FF9B43; }
        .nox-calorie-ring { width:142px; height:142px; padding:11px; border-radius:50%; box-sizing:border-box; display:grid; place-items:center; }
        .nox-calorie-ring-inner { width:100%; height:100%; border-radius:50%; background:#242725; display:flex; flex-direction:column; align-items:center; justify-content:center; }
        .nox-calorie-ring-inner strong { color:#fff; font-size:26px; line-height:1; font-weight:1000; letter-spacing:-.04em; }
        .nox-calorie-ring-inner span { margin-top:5px; color:#B0B4B1; font-size:10px; }
        .nox-macros { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-top:22px; }
        .nox-macro-top { display:flex; justify-content:space-between; gap:5px; margin-bottom:7px; color:#fff; font-size:10px; }
        .nox-macro-top span:last-child { color:#A4A8A5; }
        .nox-macro-track { height:6px; overflow:hidden; border-radius:99px; background:#494E4A; }
        .nox-macro-progress { height:100%; border-radius:99px; background:#73DDD7; }
        .nox-section-title-row { display:flex; justify-content:space-between; align-items:center; gap:16px; margin:27px 0 11px; }
        .nox-section-title-row h2 { margin:0; color:#fff; font-size:25px; font-weight:1000; letter-spacing:-.04em; }
        .nox-section-title-row > span { color:#C8FF00; font-size:13px; font-weight:900; }
        .nox-round-add { width:37px; height:37px; padding:0; border:1px solid #3F4440; border-radius:50%; background:#252825; color:#fff; display:grid; place-items:center; cursor:pointer; }
        .nox-meals-card { overflow:hidden; background:#242725; border:1.5px solid #505551; border-radius:22px; }
        .nox-meal.with-border { border-bottom:1px solid #454A46; }
        .nox-meal-main { min-height:73px; padding:11px 14px; box-sizing:border-box; display:flex; justify-content:space-between; align-items:center; }
        .nox-meal-left { min-width:0; display:flex; align-items:center; gap:12px; }
        .nox-meal-icon { width:42px; height:42px; flex:0 0 auto; border-radius:13px; background:#191C1A; display:grid; place-items:center; font-size:19px; }
        .nox-meal-name { color:#fff; font-size:14px; font-weight:900; }
        .nox-meal-kcal { margin-top:3px; color:#A6AAA7; font-size:11px; }
        .nox-meal-add { width:34px; height:34px; flex:0 0 auto; padding:0; border:1px solid #414642; border-radius:50%; background:#303431; color:#fff; display:grid; place-items:center; cursor:pointer; }
        .nox-meal-entries { padding:0 14px 8px 68px; }
        .nox-food-entry { min-height:42px; padding:8px 0; border-top:1px solid #393D3A; display:flex; justify-content:space-between; align-items:center; gap:12px; }
        .nox-food-name { color:#E7E9E7; font-size:12px; font-weight:700; }
        .nox-food-meta { margin-top:2px; color:#858A86; font-size:10px; }
        .nox-food-entry button { border:0; background:transparent; color:#858A86; font-size:18px; cursor:pointer; }
        .nox-water-card { padding:18px; background:#242725; border:1.5px solid #505551; border-radius:22px; }
        .nox-water-main { display:flex; align-items:center; gap:13px; margin-bottom:17px; }
        .nox-water-icon { width:46px; height:46px; border-radius:15px; background:#191C1A; display:grid; place-items:center; font-size:20px; }
        .nox-water-main strong { display:block; color:#fff; font-size:21px; font-weight:950; }
        .nox-water-main span { display:block; margin-top:2px; color:#999E9A; font-size:11px; }
        .nox-water-buttons { display:grid; grid-template-columns:repeat(4,1fr); gap:7px; }
        .nox-water-buttons button { min-height:39px; border:1px solid #414642; border-radius:11px; background:#191C1A; color:#fff; font-size:10px; font-weight:800; cursor:pointer; }
        @media (max-width:640px) {
          .nox-nutrition-shell { max-width:none; padding:30px 15px calc(155px + env(safe-area-inset-bottom)); }
          .nox-nutrition-title-row h1 { font-size:34px; }
          .nox-calorie-summary { grid-template-columns:1fr 124px 1fr; gap:5px; }
          .nox-calorie-ring { width:118px; height:118px; padding:9px; }
          .nox-calorie-ring-inner strong { font-size:22px; }
          .nox-macros { gap:9px; }
          .nox-macro-top { display:grid; gap:2px; }
          .nox-section-title-row h2 { font-size:23px; }
          .nox-meal-entries { padding-left:67px; }
        }
        @media (min-width:641px) and (max-width:900px) {
          .nox-nutrition-shell { max-width:680px; }
        }
      `}</style>

      
      {/* =========================================================
          MODALE AJOUT
          ========================================================= */}

      {showAdd && (
        <div
          onClick={closeAdd}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.5)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={event => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 560,
              background: SURFACE,
              borderRadius: '28px 28px 0 0',
              padding: '10px 20px max(32px, env(safe-area-inset-bottom))',
              boxSizing: 'border-box',
              maxHeight: '88vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                width: 40,
                height: 5,
                borderRadius: 99,
                background: '#3A3A3A',
                margin: '2px auto 20px',
              }}
            />

            {/* HEADER MODAL */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <div>
                {addMode !== 'choose' && (
                  <button
                    onClick={() => {
                      setAddMode('choose');
                      setSelFood(null);
                      setPhotoB64(null);
                      setScanRes(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: MUTED,
                      cursor: 'pointer',
                      fontSize: 13,
                      padding: 0,
                      display: 'block',
                      marginBottom: 4,
                    }}
                  >
                    Retour
                  </button>
                )}

                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    color: MUTED,
                    letterSpacing: '.1em',
                  }}
                >
                  {addMode === 'choose'
                    ? 'AJOUTER À ' + mealLabel(selMeal).toUpperCase()
                    : addMode === 'photo'
                      ? 'SCANNER'
                      : addMode === 'search'
                        ? 'RECHERCHER'
                        : addMode === 'barcode'
                          ? 'CODE-BARRES'
                          : addMode === 'quick'
                            ? 'AJOUT RAPIDE'
                            : addMode === 'voice'
                              ? 'VOCAL'
                              : 'SAISIE MANUELLE'}
                </div>

                {addMode === 'choose' && (
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 950,
                      letterSpacing: '-.03em',
                      color: WHITE,
                      marginTop: 2,
                    }}
                  >
                    Que veux-tu ajouter ?
                  </div>
                )}
              </div>

              <button
                onClick={closeAdd}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  border: `1px solid ${BORDER}`,
                  background: SURFACE_ALT,
                  color: WHITE,
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* SELECTEUR REPAS */}
            {addMode === 'choose' && (
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  marginBottom: 20,
                  overflowX: 'auto',
                }}
              >
                {MEALS.map(meal => (
                  <button
                    key={meal}
                    onClick={() => setSelMeal(meal)}
                    style={{
                      flexShrink: 0,
                      padding: '8px 16px',
                      borderRadius: 20,
                      border: `1px solid ${
                        selMeal === meal ? BLACK : BORDER
                      }`,
                      background: selMeal === meal ? BLACK : 'transparent',
                      color: selMeal === meal ? ACCENT : MUTED,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {mealLabel(meal)}
                  </button>
                ))}
              </div>
            )}

            {/* MENU PRINCIPAL */}
            {addMode === 'choose' && (
              <div style={{ display: 'grid', gap: 10 }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10,
                  }}
                >
                  <button
                    onClick={() =>
                      isPro
                        ? fileRef.current?.click()
                        : navigate('/subscribe')
                    }
                    style={{
                      padding: '18px 14px',
                      background: BLACK,
                      borderRadius: 18,
                      border: 0,
                      cursor: 'pointer',
                      textAlign: 'left',
                      position: 'relative',
                    }}
                  >
                    <Camera
                      size={22}
                      color={ACCENT}
                      style={{ marginBottom: 10 }}
                    />

                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 900,
                        color: WHITE,
                      }}
                    >
                      Photo
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        color: MUTED,
                        marginTop: 3,
                      }}
                    >
                      IA analyse le repas
                    </div>

                    {!isPro && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          background: ACCENT,
                          borderRadius: 8,
                          padding: '2px 6px',
                          fontSize: 8,
                          fontWeight: 900,
                          color: WHITE,
                        }}
                      >
                        PRO
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() =>
                      isPro
                        ? galleryRef.current?.click()
                        : navigate('/subscribe')
                    }
                    style={{
                      padding: '18px 14px',
                      background: SURFACE_ALT,
                      borderRadius: 18,
                      border: `1px solid ${BORDER}`,
                      cursor: 'pointer',
                      textAlign: 'left',
                      position: 'relative',
                    }}
                  >
                    <Camera
                      size={22}
                      color={BLACK}
                      style={{ marginBottom: 10 }}
                    />

                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 900,
                        color: WHITE,
                      }}
                    >
                      Galerie
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        color: MUTED,
                        marginTop: 3,
                      }}
                    >
                      Photo existante
                    </div>

                    {!isPro && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          background: BORDER,
                          borderRadius: 8,
                          padding: '2px 6px',
                          fontSize: 8,
                          fontWeight: 900,
                          color: MUTED,
                        }}
                      >
                        PRO
                      </div>
                    )}
                  </button>
                </div>

                {[
                  {
                    label: 'Rechercher',
                    sub: 'Base de 30 aliments',
                    mode: 'search' as const,
                  },
                  {
                    label: 'Code-barres',
                    sub: 'Scanner un produit',
                    mode: 'barcode' as const,
                  },
                  {
                    label: 'Ajout rapide',
                    sub: 'Calories + protéines',
                    mode: 'quick' as const,
                  },
                  {
                    label: 'Vocal',
                    sub: '"200g de poulet..."',
                    mode: 'voice' as const,
                  },
                  {
                    label: 'Manuel',
                    sub: 'Entrer les valeurs',
                    mode: 'custom' as const,
                  },
                ].map(item => (
                  <button
                    key={item.mode}
                    onClick={() => setAddMode(item.mode)}
                    style={{
                      padding: '14px 16px',
                      background: SURFACE_ALT,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 16,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: WHITE,
                        }}
                      >
                        {item.label}
                      </div>

                      <div
                        style={{
                          fontSize: 11,
                          color: MUTED,
                          marginTop: 2,
                        }}
                      >
                        {item.sub}
                      </div>
                    </div>

                    <ChevronRight size={16} color={MUTED} />
                  </button>
                ))}
              </div>
            )}

            {/* PHOTO */}
            {addMode === 'photo' && (
              <div>
                {photoB64 && (
                  <img
                    src={photoB64}
                    alt=""
                    style={{
                      width: '100%',
                      borderRadius: 16,
                      objectFit: 'cover',
                      maxHeight: 220,
                      marginBottom: 14,
                    }}
                  />
                )}

                {scanning && (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '20px 0',
                      color: MUTED,
                      fontSize: 14,
                    }}
                  >
                    NOX analyse ton repas...
                  </div>
                )}

                {!photoB64 && !scanning && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 10,
                    }}
                  >
                    <button
                      onClick={() => fileRef.current?.click()}
                      style={{
                        padding: 20,
                        background: SURFACE_ALT,
                        border: `2px dashed ${BORDER}`,
                        borderRadius: 16,
                        color: MUTED,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Prendre une photo
                    </button>

                    <button
                      onClick={() => galleryRef.current?.click()}
                      style={{
                        padding: 20,
                        background: SURFACE_ALT,
                        border: `1px solid ${BORDER}`,
                        borderRadius: 16,
                        color: MUTED,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Choisir une photo
                    </button>
                  </div>
                )}

                {scanRes?.error && !scanning && (
                  <div style={{ padding: '14px 16px', background: 'rgba(255,92,92,.08)', border: '1px solid rgba(255,92,92,.2)', borderRadius: 14, fontSize: 13, color: '#c03', textAlign: 'center' }}>
                    {scanRes.error}
                  </div>
                )}
                {scanRes && !scanRes.error && !scanning && (
                  <div>
                    <div
                      style={{
                        background: SURFACE_ALT,
                        borderRadius: 16,
                        padding: 16,
                        marginBottom: 14,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: WHITE,
                          marginBottom: 12,
                        }}
                      >
                        {scanRes.description || 'Repas détecté'}
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4,1fr)',
                          gap: 8,
                        }}
                      >
                        {[
                          [
                            'Kcal',
                            Math.round(
                              scanRes.total?.kcal ||
                                scanRes.total?.calories ||
                                0
                            ),
                          ],
                          [
                            'Prot',
                            Math.round(
                              scanRes.total?.protein ||
                                scanRes.total?.proteines ||
                                0
                            ) + 'g',
                          ],
                          [
                            'Gluc',
                            Math.round(
                              scanRes.total?.carbs ||
                                scanRes.total?.glucides ||
                                0
                            ) + 'g',
                          ],
                          [
                            'Lip',
                            Math.round(
                              scanRes.total?.fat ||
                                scanRes.total?.lipides ||
                                0
                            ) + 'g',
                          ],
                        ].map(([label, value]) => (
                          <div
                            key={label as string}
                            style={{
                              textAlign: 'center',
                              background: SURFACE,
                              borderRadius: 10,
                              padding: '10px 0',
                            }}
                          >
                            <div
                              style={{
                                fontSize: 18,
                                fontWeight: 950,
                                color: WHITE,
                              }}
                            >
                              {value}
                            </div>

                            <div
                              style={{
                                fontSize: 9,
                                color: MUTED,
                              }}
                            >
                              {label}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div
                        style={{
                          marginTop: 12,
                          fontSize: 13,
                          color: '#A7A7A7',
                          fontStyle: 'italic',
                        }}
                      >
                        {scanRes.interpretation ||
                          (targets &&
                          totals.protein < targets.protein * 0.7
                            ? 'Ce repas peut aider à couvrir tes protéines.'
                            : 'Bien adapté à ta journée.')}
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        addEntry({
                          food_name:
                            scanRes.description || 'Repas scanné',

                          calories:
                            scanRes.total?.kcal ||
                            scanRes.total?.calories ||
                            0,

                          protein:
                            scanRes.total?.protein ||
                            scanRes.total?.proteines ||
                            0,

                          carbs:
                            scanRes.total?.carbs ||
                            scanRes.total?.glucides ||
                            0,

                          fat:
                            scanRes.total?.fat ||
                            scanRes.total?.lipides ||
                            0,
                        })
                      }
                      disabled={saving}
                      style={{
                        width: '100%',
                        padding: 16,
                        background: BLACK,
                        border: 0,
                        borderRadius: 16,
                        color: ACCENT,
                        fontWeight: 900,
                        fontSize: 14,
                        cursor: 'pointer',
                      }}
                    >
                      AJOUTER CE REPAS
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* RECHERCHE */}
            {addMode === 'search' && !selFood && (
              <div>
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Chercher un aliment..."
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: SURFACE_ALT,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 14,
                    color: WHITE,
                    fontSize: 15,
                    marginBottom: 14,
                    boxSizing: 'border-box',
                    outline: 'none',
                    caretColor: ACCENT,
                  }}
                />

                <div
                  style={{
                    maxHeight: 320,
                    overflowY: 'auto',
                  }}
                >
                  {filtered.map(food => (
                    <button
                      key={food.name}
                      onClick={() => {
                        setSelFood(food);
                        setQty('100');
                      }}
                      style={{
                        width: '100%',
                        padding: '13px 4px',
                        background: 'none',
                        border: 'none',
                        borderBottom: `1px solid ${BORDER}`,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: WHITE,
                        }}
                      >
                        {food.name}
                      </div>

                      <div
                        style={{
                          fontSize: 11,
                          color: MUTED,
                        }}
                      >
                        {food.kcal} kcal · {food.protein}g prot. / 100g
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* DETAIL ALIMENT */}
            {addMode === 'search' && selFood && (
              <div>
                <div
                  style={{
                    background: SURFACE_ALT,
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: WHITE,
                      marginBottom: 4,
                    }}
                  >
                    {selFood.name}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: MUTED,
                    }}
                  >
                    {selFood.kcal} kcal · {selFood.protein}g prot. / 100g
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: MUTED,
                      marginBottom: 8,
                    }}
                  >
                    Quantité (g)
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      flexWrap: 'wrap',
                      marginBottom: 10,
                    }}
                  >
                    {[50, 100, 150, 200, 250, 300].map(grams => (
                      <button
                        key={grams}
                        onClick={() => setQty(String(grams))}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 20,
                          border: `1px solid ${
                            qty === String(grams) ? BLACK : BORDER
                          }`,
                          background:
                            qty === String(grams) ? BLACK : 'transparent',
                          color:
                            qty === String(grams) ? ACCENT : MUTED,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {grams}g
                      </button>
                    ))}
                  </div>

                  <input
                    value={qty}
                    onChange={event => setQty(event.target.value)}
                    type="number"
                    style={{
                      width: '100%',
                      padding: 14,
                      background: SURFACE_ALT,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 14,
                      color: WHITE,
                      fontSize: 28,
                      fontWeight: 950,
                      textAlign: 'center',
                      boxSizing: 'border-box',
                      outline: 'none',
                      caretColor: ACCENT,
                    }}
                  />
                </div>

                {(() => {
                  const ratio = parseFloat(qty || '0') / 100;

                  return (
                    <>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4,1fr)',
                          gap: 8,
                          marginBottom: 16,
                        }}
                      >
                        {[
                          ['Kcal', Math.round(selFood.kcal * ratio)],
                          ['Prot', `${Math.round(selFood.protein * ratio)}g`],
                          ['Gluc', `${Math.round(selFood.carbs * ratio)}g`],
                          ['Lip', `${Math.round(selFood.fat * ratio)}g`],
                        ].map(([label, value]) => (
                          <div
                            key={label as string}
                            style={{
                              background: SURFACE_ALT,
                              borderRadius: 12,
                              padding: '12px 4px',
                              textAlign: 'center',
                            }}
                          >
                            <div
                              style={{
                                fontSize: 17,
                                fontWeight: 900,
                              }}
                            >
                              {value}
                            </div>

                            <div
                              style={{
                                fontSize: 9,
                                color: MUTED,
                              }}
                            >
                              {label}
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        disabled={saving || ratio <= 0}
                        onClick={() =>
                          addEntry({
                            food_name: `${selFood.name} (${qty}g)`,
                            calories: Math.round(selFood.kcal * ratio),
                            protein: Math.round(selFood.protein * ratio),
                            carbs: Math.round(selFood.carbs * ratio),
                            fat: Math.round(selFood.fat * ratio),
                          })
                        }
                        style={{
                          width: '100%',
                          padding: 16,
                          border: 0,
                          borderRadius: 16,
                          background: BLACK,
                          color: ACCENT,
                          fontSize: 14,
                          fontWeight: 900,
                          cursor: 'pointer',
                        }}
                      >
                        AJOUTER
                      </button>
                    </>
                  );
                })()}
              </div>
            )}

            {/* AJOUT RAPIDE */}
            {addMode === 'quick' && (
              <div style={{ display: 'grid', gap: 12 }}>
                <input
                  value={quickKcal}
                  onChange={event => setQuickKcal(event.target.value)}
                  type="number"
                  placeholder="Calories"
                  style={{
                    padding: 15,
                    borderRadius: 14,
                    border: `1px solid ${BORDER}`,
                    background: SURFACE_ALT,
                    fontSize: 16,
                    outline: 'none',
                    color: WHITE,
                    caretColor: ACCENT,
                  }}
                />

                <input
                  value={quickProt}
                  onChange={event => setQuickProt(event.target.value)}
                  type="number"
                  placeholder="Protéines (g)"
                  style={{
                    padding: 15,
                    borderRadius: 14,
                    border: `1px solid ${BORDER}`,
                    background: SURFACE_ALT,
                    fontSize: 16,
                    outline: 'none',
                    color: WHITE,
                    caretColor: ACCENT,
                  }}
                />

                <button
                  disabled={saving || !quickKcal}
                  onClick={() =>
                    addEntry({
                      food_name: 'Ajout rapide',
                      calories: Number(quickKcal) || 0,
                      protein: Number(quickProt) || 0,
                      carbs: 0,
                      fat: 0,
                    })
                  }
                  style={{
                    padding: 16,
                    border: 0,
                    borderRadius: 16,
                    background: BLACK,
                    color: ACCENT,
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  AJOUTER
                </button>
              </div>
            )}

            {/* VOCAL */}
            {addMode === 'voice' && (
              <div>
                <button
                  onClick={startVoice}
                  disabled={listening}
                  style={{
                    width: '100%',
                    padding: 22,
                    borderRadius: 18,
                    border: `1px solid ${BORDER}`,
                    background: listening ? BLACK : BG,
                    color: listening ? ACCENT : BLACK,
                    fontWeight: 900,
                    cursor: 'pointer',
                    marginBottom: 14,
                  }}
                >
                  {listening ? 'J’ÉCOUTE...' : 'PARLER'}
                </button>

                {voiceText && (
                  <>
                    <div
                      style={{
                        padding: 16,
                        background: SURFACE_ALT,
                        borderRadius: 14,
                        marginBottom: 12,
                        fontSize: 14,
                      }}
                    >
                      {voiceText}
                    </div>

                    <button
                      onClick={addVoiceEntry}
                      disabled={saving}
                      style={{
                        width: '100%',
                        padding: 16,
                        border: 0,
                        borderRadius: 16,
                        background: BLACK,
                        color: ACCENT,
                        fontWeight: 900,
                        cursor: 'pointer',
                      }}
                    >
                      AJOUTER
                    </button>
                  </>
                )}
              </div>
            )}

            {/* CODE-BARRES */}
            {addMode === 'barcode' && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '26px 10px',
                }}
              >
                <ScanLine
                  size={42}
                  color={BLACK}
                  style={{ marginBottom: 12 }}
                />

                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 900,
                    marginBottom: 6,
                  }}
                >
                  Scanner un code-barres
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: MUTED,
                    lineHeight: 1.5,
                  }}
                >
                  Place le code-barres du produit face à la caméra.
                </div>
              </div>
            )}

            {/* MANUEL */}
            {addMode === 'custom' && (
              <div style={{ display: 'grid', gap: 10 }}>
                {[
                  ['name', 'Nom de l’aliment'],
                  ['kcal', 'Calories'],
                  ['protein', 'Protéines (g)'],
                  ['carbs', 'Glucides (g)'],
                  ['fat', 'Lipides (g)'],
                ].map(([field, placeholder]) => (
                  <input
                    key={field}
                    type={field === 'name' ? 'text' : 'number'}
                    placeholder={placeholder}
                    value={(customForm as any)[field]}
                    onChange={event =>
                      setCustomForm(current => ({
                        ...current,
                        [field]: event.target.value,
                      }))
                    }
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: 14,
                      background: SURFACE_ALT,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 14,
                      fontSize: 15,
                      outline: 'none',
                    color: WHITE,
                    caretColor: ACCENT,
                    }}
                  />
                ))}

                <button
                  disabled={saving || !customForm.name}
                  onClick={() =>
                    addEntry({
                      food_name: customForm.name,
                      calories: Number(customForm.kcal) || 0,
                      protein: Number(customForm.protein) || 0,
                      carbs: Number(customForm.carbs) || 0,
                      fat: Number(customForm.fat) || 0,
                    })
                  }
                  style={{
                    width: '100%',
                    padding: 16,
                    border: 0,
                    borderRadius: 16,
                    background: BLACK,
                    color: ACCENT,
                    fontWeight: 900,
                    cursor: 'pointer',
                    marginTop: 4,
                  }}
                >
                  AJOUTER
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
