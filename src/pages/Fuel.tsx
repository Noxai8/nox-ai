import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MealReview from '../components/MealReview';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';
import { usePlan } from '../lib/usePlan';
import { Camera, ChevronRight, Plus, ScanLine, X, Search, SlidersHorizontal, Droplets, Coffee, Sun, Moon, Apple, Refrigerator, ChefHat, ShoppingBasket, Sparkles } from 'lucide-react';

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
  const fridgeRef = useRef<HTMLInputElement>(null);

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
  const [weekCalories, setWeekCalories] = useState<Record<string, number>>({});

  const [showAdd, setShowAdd] = useState(false);
  const [fuelView, setFuelView] = useState<'tracking' | 'ai'>('tracking');

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
  // Vérification obligatoire d'une estimation photo avant tout enregistrement
  const [reviewingScan, setReviewingScan] = useState(false);
  const [showFridgeScan, setShowFridgeScan] = useState(false);
  const [fridgePhoto, setFridgePhoto] = useState<string | null>(null);
  const [fridgeScanning, setFridgeScanning] = useState(false);
  const [fridgeResult, setFridgeResult] = useState<any>(null);

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

  const weekBounds = () => {
    const d = dateFromKey(selectedDateKey);
    const mondayOffset = (d.getDay() + 6) % 7;
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - mondayOffset, 0, 0, 0, 0);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);
    return { start: monday.toISOString(), end: sunday.toISOString() };
  };

  const load = async () => {
    const { start, end } = selectedDayBounds();
    const week = weekBounds();

    const [{ data: ents }, { data: tgts }, { data: wlog }, { data: weekEntries }] =
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

        supabase
          .from('food_entries')
          .select('calories, created_at')
          .eq('user_id', user!.id)
          .gte('created_at', week.start)
          .lte('created_at', week.end),
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

    const weekly: Record<string, number> = {};
    (weekEntries || []).forEach((entry: any) => {
      if (!entry.created_at) return;
      const key = localDateKey(new Date(entry.created_at));
      weekly[key] = (weekly[key] || 0) + (Number(entry.calories) || 0);
    });
    setWeekCalories(weekly);
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

  const kcalLeft = targets
    ? Math.max(0, targets.kcal - Math.round(totals.kcal))
    : 0;

  const protLeft = targets
    ? Math.max(0, targets.protein - Math.round(totals.protein))
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
      'Petit-dejeuner': <Coffee size={19} />,
      Dejeuner: <Sun size={19} />,
      Diner: <Moon size={19} />,
      Snacks: <Apple size={19} />,
    } as Record<string, React.ReactNode>)[meal] || <Plus size={18} />;

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
    setReviewingScan(false);
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
    source?: 'manual' | 'photo' | 'voice';
  }) => {
    setSaving(true);

    await supabase.from('food_entries').insert({
      user_id: user!.id,
      meal_type: selMeal,
      ...data,
      source: data.source ?? 'manual',
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
          setReviewingScan(false);
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

  const handleFridgePhoto = (file: File) => {
    const reader = new FileReader();
    reader.onload = async event => {
      const result = event.target?.result as string;
      setFridgePhoto(result);
      setFridgeResult(null);
      setFridgeScanning(true);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const resp = await fetch(`${FN}/analyze-fridge`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({ image: result }),
        });
        const data = await resp.json();

        if (!resp.ok || data?.error) {
          setFridgeResult({
            error: data?.error || `Analyse du frigo indisponible (${resp.status}).`,
          });
        } else {
          setFridgeResult(data);
        }
      } catch (e: any) {
        setFridgeResult({ error: e?.message || 'Erreur réseau.' });
      } finally {
        setFridgeScanning(false);
      }
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
        source: 'voice',
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

      <div className="nox-nutrition-shell" style={{ display: fuelView === 'tracking' ? 'block' : 'none' }}>
        <header className="nox-nutrition-header">
          <div className="nox-nutrition-title-row">
            <div>
              <div className="nox-eyebrow">NUTRITION</div>
              <h1>{selectedDateLabel}</h1>
              <p>{selectedSubtitle}</p>
            </div>
            <div className="nox-nutrition-actions">
              <button type="button" aria-label="Rechercher un aliment" onClick={() => { setSelMeal(currentMeal()); setAddMode('search'); setShowAdd(true); }}><Search size={18} /></button>
              <button type="button" aria-label="Objectifs nutritionnels" onClick={() => navigate('/nutrition-goals')}><SlidersHorizontal size={18} /></button>
            </div>
          </div>

          <div className="nox-nutrition-tabs">
            <button className="active">Suivi</button>
            <button onClick={() => setFuelView('ai')}>NOX AI</button>
          </div>
        </header>

        <section className="nox-dashboard-card">
          <div className="nox-dashboard-top">
            <div className="nox-kcal-block">
              <span className="nox-card-kicker">CALORIES RESTANTES</span>
              <div className="nox-kcal-number">{targets ? kcalLeft.toLocaleString('fr-FR') : '—'}</div>
              <div className="nox-kcal-unit">kcal</div>
            </div>
            <div className="nox-kcal-context">
              <div><span>Consommées</span><strong>{displayKcal.toLocaleString('fr-FR')}</strong></div>
              <div><span>Objectif</span><strong>{targets ? targets.kcal.toLocaleString('fr-FR') : '—'}</strong></div>
            </div>
          </div>

          <div className="nox-goal-track" aria-label="Progression calorique">
            <div className="nox-goal-progress" style={{ width: `${displayKcalPct}%` }} />
          </div>
          <div className="nox-goal-caption">
            <span>{targets ? `${Math.round(displayKcalPct)} % de l’objectif` : 'Objectif non configuré'}</span>
            {targets && <span>{Math.max(0, targets.kcal - displayKcal)} kcal restantes</span>}
          </div>

          <div className="nox-week-wrap">
            <div className="nox-week-head"><span>Cette semaine</span><span>kcal consommées</span></div>
            <div className="nox-week-chart">
              {weekDays.map(day => {
                const value = Math.round(weekCalories[day.key] || 0);
                const max = targets?.kcal || Math.max(1, ...Object.values(weekCalories));
                const pct = value > 0 ? Math.max(7, Math.min(100, (value / max) * 100)) : 3;
                const selected = day.key === selectedDateKey;
                return (
                  <button key={day.key} type="button" className={`nox-week-day${selected ? ' selected' : ''}`} onClick={() => setSelectedDateKey(day.key)}>
                    <span className="nox-week-value">{value > 0 ? value : '—'}</span>
                    <span className="nox-week-bar"><i style={{ height: `${pct}%` }} /></span>
                    <span className="nox-week-letter">{day.day}</span>
                    <span className="nox-week-date">{day.date}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="nox-macro-section">
          <div className="nox-section-heading"><div><span>RÉPARTITION</span><h2>Macros</h2></div></div>
          <div className="nox-macro-grid">
            {[
              { label: 'Protéines', value: displayProtein, target: targets?.protein, className: 'protein' },
              { label: 'Glucides', value: displayCarbs, target: targets?.carbs, className: 'carbs' },
              { label: 'Lipides', value: displayFat, target: targets?.fat, className: 'fat' },
            ].map(macro => {
              const pct = macro.target && macro.target > 0 ? Math.min(100, (macro.value / macro.target) * 100) : 0;
              return (
                <div key={macro.label} className={`nox-macro-tile ${macro.className}`}>
                  <div className="nox-macro-name">{macro.label}</div>
                  <div className="nox-macro-value">{Math.round(macro.value)}<small>g</small></div>
                  <div className="nox-macro-target">sur {macro.target ?? '—'} g</div>
                  <div className="nox-macro-line"><i style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="nox-insight-card">
          <div className="nox-insight-label">NOX · MAINTENANT</div>
          <div className="nox-insight-title">{noxMessage.title}</div>
          <div className="nox-insight-body">{noxMessage.body}</div>
        </section>

        <section className="nox-meals-section">
          <div className="nox-section-heading nox-heading-row">
            <div><span>JOURNÉE</span><h2>Mes repas</h2></div>
            <button className="nox-round-add" onClick={openQuickAdd} aria-label="Ajouter un repas"><Plus size={19} strokeWidth={2.6} /></button>
          </div>
          <div className="nox-meals-list">
            {MEALS.map(meal => {
              const mealEntries = entries.filter(e => e.meal_type === meal);
              const mealKcal = mealEntries.reduce((sum, e) => sum + (e.calories || 0), 0);
              return (
                <div key={meal} className="nox-meal-card">
                  <div className="nox-meal-main">
                    <div className="nox-meal-left">
                      <div className="nox-meal-icon">{mealIcon(meal)}</div>
                      <div><div className="nox-meal-name">{mealLabel(meal)}</div><div className="nox-meal-kcal">{Math.round(mealKcal)} kcal · {mealEntries.length} {mealEntries.length > 1 ? 'éléments' : 'élément'}</div></div>
                    </div>
                    <button className="nox-meal-add" onClick={() => { setSelMeal(meal); setAddMode('choose'); setShowAdd(true); }} aria-label={`Ajouter à ${mealLabel(meal)}`}><Plus size={18} strokeWidth={2.7} /></button>
                  </div>
                  {mealEntries.length > 0 && <div className="nox-meal-entries">{mealEntries.map(entry => (
                    <div key={entry.id} className="nox-food-entry"><div><div className="nox-food-name">{entry.food_name}</div><div className="nox-food-meta">{Math.round(entry.calories)} kcal{entry.protein > 0 ? ` · ${Math.round(entry.protein)} g prot.` : ''}</div></div><button onClick={() => deleteEntry(entry.id)} aria-label="Supprimer">×</button></div>
                  ))}</div>}
                </div>
              );
            })}
          </div>
        </section>

        <section className="nox-water-section">
          <div className="nox-section-heading"><div><span>HYDRATATION</span><h2>Eau</h2></div><strong>{(water / 1000).toFixed(1)} L</strong></div>
          <div className="nox-water-card">
            <div className="nox-water-main"><div className="nox-water-icon"><Droplets size={22} /></div><div><strong>{water.toLocaleString('fr-FR')} ml</strong><span>{isSelectedToday ? "Aujourd'hui" : selectedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span></div></div>
            <div className="nox-water-buttons">{[150, 250, 330, 500].map(ml => <button key={ml} onClick={() => addWater(ml)}>+ {ml} ml</button>)}</div>
          </div>
        </section>
      </div>

      <div className="nox-ai-shell" style={{ display: fuelView === 'ai' ? 'block' : 'none' }}>
        <header className="nox-ai-top">
          <div>
            <div className="nox-eyebrow">NUTRITION INTELLIGENTE</div>
            <h1>NOX AI</h1>
            <p>Des outils intelligents pour t'aider au quotidien.</p>
          </div>
          <button className="nox-ai-back" type="button" onClick={() => setFuelView('tracking')}>Suivi</button>
        </header>

        <section className="nox-ai-hero">
          <button className="nox-ai-card" type="button" onClick={() => { setSelMeal(currentMeal()); setAddMode('photo'); setShowAdd(true); fileRef.current?.click(); }}>
            <div className="nox-ai-card-icon"><Camera size={25} /></div>
            <h3>Scanner mon repas</h3>
            <p>Prends une photo. NOX analyse le repas et estime calories et macros avant que tu confirmes l'ajout.</p>
            <ChevronRight className="nox-ai-card-arrow" size={22} />
          </button>

          <button className="nox-ai-card" type="button" onClick={() => fridgeRef.current?.click()}>
            <div className="nox-ai-card-icon"><Refrigerator size={25} /></div>
            <h3>Mon frigo AI</h3>
            <p>Prends ton frigo en photo. NOX détecte les aliments visibles avant de te laisser confirmer le résultat.</p>
            <ChevronRight className="nox-ai-card-arrow" size={22} />
          </button>
        </section>

        <section className="nox-ai-grid">
          <button className="nox-ai-card nox-ai-small" type="button" onClick={() => navigate('/recipes')}>
            <div className="nox-ai-card-icon"><ChefHat size={23} /></div>
            <h3>Recettes AI</h3>
            <p>Retrouve les recettes et crée tes repas à partir de ce que tu as réellement.</p>
            <ChevronRight className="nox-ai-card-arrow" size={20} />
          </button>

          <button className="nox-ai-card nox-ai-small" type="button" onClick={() => navigate('/quick-groceries')}>
            <div className="nox-ai-card-icon"><ShoppingBasket size={23} /></div>
            <h3>Liste de courses AI</h3>
            <p>Prépare une liste adaptée à tes besoins, ton budget et tes prochains repas.</p>
            <ChevronRight className="nox-ai-card-arrow" size={20} />
          </button>

          <button className="nox-ai-card nox-ai-small" type="button" onClick={() => { setSelMeal(currentMeal()); setAddMode('search'); setShowAdd(true); }}>
            <div className="nox-ai-card-icon"><Search size={23} /></div>
            <h3>Ajouter un aliment</h3>
            <p>Recherche rapidement un aliment et ajoute-le au bon repas.</p>
            <ChevronRight className="nox-ai-card-arrow" size={20} />
          </button>
        </section>

        <section className="nox-future-card" onClick={() => navigate('/future')}>
          <div className="nox-future-orb"><Sparkles size={26} /></div>
          <div>
            <div className="nox-insight-label">NOX FUTURE</div>
            <h3>Prépare la suite.</h3>
            <p>Accède à NOX Future pour tes prochaines recommandations et projections personnalisées.</p>
          </div>
          <ChevronRight size={22} />
        </section>

        <section className="nox-ai-history">
          <div className="nox-section-heading">
            <div><span>AUJOURD'HUI</span><h2>Historique</h2></div>
          </div>
          <div className="nox-ai-history-list">
            {entries.length > 0 ? entries.slice(0, 6).map(entry => (
              <div className="nox-ai-history-row" key={entry.id}>
                <div className="nox-ai-history-icon"><Plus size={17} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="nox-ai-history-name">{entry.food_name || 'Aliment'}</div>
                  <div className="nox-ai-history-meta">{mealLabel(entry.meal_type)} · {Math.round(Number(entry.calories || 0))} kcal</div>
                </div>
              </div>
            )) : (
              <div className="nox-ai-history-empty">Ton historique nutrition apparaîtra ici après ton premier ajout.</div>
            )}
          </div>
        </section>
      </div>
      <style>{`
        .nox-nutrition-shell{width:100%;max-width:820px;margin:0 auto;box-sizing:border-box;padding:42px 20px calc(170px + env(safe-area-inset-bottom));}
        .nox-nutrition-header{margin-bottom:18px}.nox-nutrition-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:22px}.nox-eyebrow,.nox-section-heading span,.nox-card-kicker,.nox-insight-label{font-size:10px;font-weight:950;letter-spacing:.14em;color:#777d78}.nox-nutrition-title-row h1{margin:5px 0 0;color:#fff;font-size:42px;line-height:1;font-weight:1000;letter-spacing:-.055em;text-transform:capitalize}.nox-nutrition-title-row p{margin:9px 0 0;color:#858a86;font-size:13px}.nox-nutrition-actions{display:flex;gap:8px}.nox-nutrition-actions button,.nox-round-add{width:42px;height:42px;border-radius:14px;border:1px solid #292d2a;background:#141715;color:#fff;display:grid;place-items:center;cursor:pointer}.nox-nutrition-tabs{display:grid;grid-template-columns:1fr 1fr;padding:4px;border:1px solid #202421;border-radius:15px;background:#111311}.nox-nutrition-tabs button{height:40px;border:0;border-radius:11px;background:transparent;color:#777c78;font-size:12px;font-weight:900;cursor:pointer}.nox-nutrition-tabs button.active{background:#20241f;color:#c8ff00;box-shadow:inset 0 0 0 1px #30362f}
        .nox-dashboard-card{padding:24px;background:linear-gradient(145deg,#151815,#101210);border:1px solid #272b28;border-radius:26px}.nox-dashboard-top{display:flex;align-items:flex-end;justify-content:space-between;gap:30px}.nox-kcal-number{display:inline-block;margin-top:8px;color:#fff;font-size:58px;line-height:.9;font-weight:1000;letter-spacing:-.07em}.nox-kcal-unit{display:inline-block;margin-left:9px;color:#777d78;font-size:13px;font-weight:800}.nox-kcal-context{display:flex;gap:28px;padding-bottom:3px}.nox-kcal-context div{display:grid;gap:4px;text-align:right}.nox-kcal-context span{font-size:10px;color:#737873}.nox-kcal-context strong{font-size:15px;color:#e7e9e7}.nox-goal-track{height:9px;margin-top:24px;border-radius:99px;background:#252a26;overflow:hidden}.nox-goal-progress{height:100%;border-radius:99px;background:#c8ff00;box-shadow:0 0 18px rgba(200,255,0,.16)}.nox-goal-caption{display:flex;justify-content:space-between;gap:15px;margin-top:8px;color:#747a75;font-size:10px}.nox-week-wrap{margin-top:25px;padding-top:20px;border-top:1px solid #242824}.nox-week-head{display:flex;justify-content:space-between;margin-bottom:16px;color:#777d78;font-size:10px;font-weight:800}.nox-week-chart{height:150px;display:grid;grid-template-columns:repeat(7,1fr);gap:9px;align-items:stretch}.nox-week-day{min-width:0;padding:0;border:0;background:transparent;color:#6f746f;display:grid;grid-template-rows:18px 1fr 17px 16px;gap:4px;justify-items:center;cursor:pointer}.nox-week-value{font-size:8px;font-weight:800}.nox-week-bar{width:100%;max-width:38px;height:100%;border-radius:10px;background:#1e221f;display:flex;align-items:flex-end;overflow:hidden}.nox-week-bar i{display:block;width:100%;min-height:3px;border-radius:10px;background:#3d433e;transition:height .2s}.nox-week-day.selected .nox-week-bar{box-shadow:0 0 0 1px #3d463b}.nox-week-day.selected .nox-week-bar i{background:#c8ff00}.nox-week-day.selected .nox-week-letter,.nox-week-day.selected .nox-week-date{color:#fff}.nox-week-letter{font-size:10px;font-weight:950}.nox-week-date{font-size:9px}
        .nox-macro-section,.nox-meals-section,.nox-water-section{margin-top:30px}.nox-section-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:12px}.nox-section-heading h2{margin:4px 0 0;font-size:27px;line-height:1;font-weight:1000;letter-spacing:-.045em}.nox-section-heading>strong{color:#c8ff00;font-size:14px}.nox-heading-row{align-items:center}.nox-macro-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.nox-macro-tile{padding:17px;border:1px solid #272b28;border-radius:20px;background:#121512}.nox-macro-name{color:#8a8f8b;font-size:11px;font-weight:800}.nox-macro-value{margin-top:13px;color:#fff;font-size:28px;line-height:1;font-weight:1000;letter-spacing:-.04em}.nox-macro-value small{margin-left:2px;color:#7e847f;font-size:12px}.nox-macro-target{margin-top:5px;color:#666c67;font-size:9px}.nox-macro-line{height:5px;margin-top:14px;border-radius:99px;background:#252a26;overflow:hidden}.nox-macro-line i{display:block;height:100%;border-radius:99px}.nox-macro-tile.protein i{background:#c8ff00}.nox-macro-tile.carbs i{background:#8ea5ff}.nox-macro-tile.fat i{background:#e4b96b}
        .nox-insight-card{margin-top:16px;padding:18px 20px;border:1px solid #293126;border-radius:20px;background:linear-gradient(120deg,rgba(200,255,0,.07),rgba(200,255,0,.015))}.nox-insight-label{color:#9ebc39}.nox-insight-title{margin-top:8px;color:#fff;font-size:16px;font-weight:950}.nox-insight-body{margin-top:5px;color:#8c928d;font-size:12px;line-height:1.5}
        .nox-meals-list{display:grid;gap:9px}.nox-meal-card{overflow:hidden;border:1px solid #272b28;border-radius:19px;background:#121512}.nox-meal-main{min-height:72px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:16px}.nox-meal-left{min-width:0;display:flex;align-items:center;gap:12px}.nox-meal-icon{width:42px;height:42px;flex:0 0 auto;border-radius:13px;background:#1b1f1b;color:#a9b0aa;display:grid;place-items:center}.nox-meal-name{font-size:14px;font-weight:900;color:#fff}.nox-meal-kcal{margin-top:4px;color:#747a75;font-size:10px}.nox-meal-add{width:34px;height:34px;flex:0 0 auto;border:1px solid #303531;border-radius:11px;background:#1b1f1c;color:#c8ff00;display:grid;place-items:center;cursor:pointer}.nox-meal-entries{padding:0 14px 8px 68px}.nox-food-entry{min-height:40px;padding:8px 0;border-top:1px solid #252925;display:flex;align-items:center;justify-content:space-between;gap:12px}.nox-food-name{color:#d8dbd8;font-size:11px;font-weight:750}.nox-food-meta{margin-top:2px;color:#6d736e;font-size:9px}.nox-food-entry button{border:0;background:transparent;color:#666d67;font-size:18px;cursor:pointer}
        .nox-water-card{padding:18px;border:1px solid #272b28;border-radius:21px;background:#121512}.nox-water-main{display:flex;align-items:center;gap:13px;margin-bottom:16px}.nox-water-icon{width:45px;height:45px;border-radius:14px;background:#162022;color:#72d9e3;display:grid;place-items:center}.nox-water-main strong{display:block;color:#fff;font-size:19px;font-weight:950}.nox-water-main span{display:block;margin-top:3px;color:#777d78;font-size:10px}.nox-water-buttons{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.nox-water-buttons button{min-height:40px;border:1px solid #2d322e;border-radius:12px;background:#181b19;color:#d9dcd9;font-size:10px;font-weight:850;cursor:pointer}.nox-water-buttons button:hover{border-color:#4b5549;color:#c8ff00}
        .nox-ai-shell{width:100%;max-width:920px;margin:0 auto;box-sizing:border-box;padding:42px 20px calc(170px + env(safe-area-inset-bottom))}
        .nox-ai-top{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:24px}.nox-ai-top h1{margin:5px 0 0;font-size:42px;line-height:1;font-weight:1000;letter-spacing:-.055em}.nox-ai-top p{margin:10px 0 0;color:#8b918c;font-size:13px}.nox-ai-back{height:42px;padding:0 16px;border:1px solid #292d2a;border-radius:14px;background:#141715;color:#fff;font-size:11px;font-weight:900;cursor:pointer}
        .nox-ai-hero{display:grid;grid-template-columns:1.15fr .85fr;gap:12px}.nox-ai-card{position:relative;min-height:210px;padding:22px;border:1px solid #2a2f2b;border-radius:24px;background:linear-gradient(145deg,#161a17,#101311);overflow:hidden;cursor:pointer;text-align:left;color:#fff}.nox-ai-card:before{content:'';position:absolute;width:170px;height:170px;border-radius:50%;right:-55px;top:-65px;background:radial-gradient(circle,rgba(200,255,0,.14),transparent 68%)}.nox-ai-card-icon{width:52px;height:52px;border-radius:16px;display:grid;place-items:center;color:#0a0a0a;background:#c8ff00;box-shadow:0 10px 28px rgba(200,255,0,.12)}.nox-ai-card h3{position:relative;margin:34px 0 8px;font-size:22px;font-weight:1000;letter-spacing:-.035em}.nox-ai-card p{position:relative;margin:0;max-width:300px;color:#9da39e;font-size:13px;line-height:1.5}.nox-ai-card-arrow{position:absolute;right:20px;bottom:20px;color:#c8ff00}
        .nox-ai-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px}.nox-ai-small{min-height:190px}.nox-ai-small h3{margin-top:26px;font-size:18px}.nox-ai-small .nox-ai-card-icon{width:46px;height:46px;border-radius:14px}
        .nox-future-card{margin-top:28px;padding:22px;border:1px solid rgba(200,255,0,.24);border-radius:24px;background:linear-gradient(120deg,rgba(200,255,0,.08),rgba(200,255,0,.015));display:flex;align-items:center;gap:18px;cursor:pointer}.nox-future-orb{width:58px;height:58px;flex:0 0 auto;border-radius:18px;display:grid;place-items:center;color:#c8ff00;background:#151d12;border:1px solid #34412e}.nox-future-card h3{margin:0;font-size:19px;font-weight:1000}.nox-future-card p{margin:6px 0 0;color:#939a94;font-size:12px;line-height:1.45}.nox-future-card>svg{margin-left:auto;color:#c8ff00;flex:0 0 auto}
        .nox-ai-history{margin-top:30px}.nox-ai-history-list{overflow:hidden;border:1px solid #272b28;border-radius:22px;background:#121512}.nox-ai-history-row{min-height:66px;padding:11px 15px;display:flex;align-items:center;gap:13px;border-bottom:1px solid #242824}.nox-ai-history-row:last-child{border-bottom:0}.nox-ai-history-icon{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;background:#1b1f1b;color:#c8ff00}.nox-ai-history-name{font-size:12px;font-weight:900;color:#e9ebe9}.nox-ai-history-meta{margin-top:4px;color:#747a75;font-size:10px}.nox-ai-history-empty{padding:22px;color:#777d78;font-size:12px;text-align:center}

        @media(max-width:640px){.nox-ai-shell{padding:28px 15px calc(155px + env(safe-area-inset-bottom))}.nox-ai-top h1{font-size:34px}.nox-ai-hero,.nox-ai-grid{grid-template-columns:1fr}.nox-ai-card{min-height:178px}.nox-ai-small{min-height:165px}.nox-nutrition-shell{padding:28px 15px calc(155px + env(safe-area-inset-bottom))}.nox-nutrition-title-row h1{font-size:34px}.nox-dashboard-card{padding:19px}.nox-dashboard-top{align-items:flex-start}.nox-kcal-number{font-size:48px}.nox-kcal-context{display:grid;gap:8px}.nox-kcal-context div{gap:1px}.nox-week-chart{gap:5px;height:135px}.nox-week-bar{max-width:31px}.nox-macro-grid{gap:7px}.nox-macro-tile{padding:14px 11px}.nox-macro-value{font-size:24px}.nox-water-buttons{grid-template-columns:1fr 1fr}}
      `}</style>

      {showFridgeScan && (
        <div
          onClick={() => setShowFridgeScan(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 12000,
            background: 'rgba(0,0,0,.84)',
            backdropFilter: 'blur(12px)',
            display: 'grid',
            placeItems: 'center',
            padding: 16,
            boxSizing: 'border-box',
          }}
        >
          <div
            onClick={event => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 560,
              maxHeight: 'calc(100dvh - 32px)',
              overflowY: 'auto',
              background: '#111411',
              border: '1px solid #2A302A',
              borderRadius: 28,
              padding: 20,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginBottom: 18 }}>
              <div>
                <div style={{ color: ACCENT, fontSize: 10, fontWeight: 950, letterSpacing: '.1em' }}>FRIGO AI</div>
                <div style={{ marginTop: 5, fontSize: 24, fontWeight: 1000, letterSpacing: '-.04em' }}>Analyse de ton frigo</div>
              </div>
              <button onClick={() => setShowFridgeScan(false)} style={{ width: 40, height: 40, borderRadius: '50%', border: `1px solid ${BORDER}`, background: SURFACE_ALT, color: WHITE, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {fridgePhoto && (
              <img src={fridgePhoto} alt="Frigo à analyser" style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 20, border: `1px solid ${BORDER}` }} />
            )}

            {fridgeScanning && (
              <div style={{ padding: '26px 0', textAlign: 'center', color: MUTED, fontSize: 13 }}>
                NOX analyse les aliments visibles…
              </div>
            )}

            {!fridgeScanning && fridgeResult?.error && (
              <div style={{ marginTop: 16, padding: 14, borderRadius: 16, background: '#211414', border: '1px solid #5A2B2B', color: '#FFBABA', fontSize: 12, lineHeight: 1.5 }}>
                {fridgeResult.error}
              </div>
            )}

            {!fridgeScanning && !fridgeResult?.error && Array.isArray(fridgeResult?.items) && (
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 950, marginBottom: 10 }}>ALIMENTS DÉTECTÉS</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {fridgeResult.items.map((item: any, index: number) => (
                    <div key={`${item?.name || 'aliment'}-${index}`} style={{ padding: '13px 14px', borderRadius: 15, border: `1px solid ${BORDER}`, background: SURFACE_ALT, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 850 }}>{item?.name || 'Aliment détecté'}</span>
                      {item?.quantity && <span style={{ color: MUTED, fontSize: 12 }}>{item.quantity}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
              <button onClick={() => fridgeRef.current?.click()} style={{ minHeight: 50, borderRadius: 16, border: `1px solid ${BORDER}`, background: SURFACE_ALT, color: WHITE, fontWeight: 900, cursor: 'pointer' }}>
                REPRENDRE
              </button>
              <button onClick={() => navigate('/pantry')} disabled={fridgeScanning || !Array.isArray(fridgeResult?.items)} style={{ minHeight: 50, borderRadius: 16, border: 0, background: !fridgeScanning && Array.isArray(fridgeResult?.items) ? ACCENT : '#252925', color: !fridgeScanning && Array.isArray(fridgeResult?.items) ? BLACK : '#666', fontWeight: 1000, cursor: !fridgeScanning && Array.isArray(fridgeResult?.items) ? 'pointer' : 'not-allowed' }}>
                VÉRIFIER LE FRIGO →
              </button>
            </div>
            <div style={{ marginTop: 12, color: '#727872', fontSize: 10.5, lineHeight: 1.45, textAlign: 'center' }}>
              NOX propose uniquement ce qu'il détecte sur la photo. Vérifie toujours les aliments avant de les ajouter à ton inventaire.
            </div>
          </div>
        </div>
      )}

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
            zIndex: 10000,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: '16px 16px max(16px, env(safe-area-inset-bottom))',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          <div
            onClick={event => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 560,
              background: SURFACE,
              borderRadius: 28,
              padding: '10px 20px max(28px, env(safe-area-inset-bottom))',
              boxSizing: 'border-box',
              maxHeight: 'calc(100dvh - 32px)',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
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

                    {reviewingScan ? (
                      <MealReview
                        estimate={{
                          food_name: scanRes.description || 'Repas scanné',
                          calories: Number(scanRes.total?.kcal || scanRes.total?.calories || 0),
                          protein: Number(scanRes.total?.protein || scanRes.total?.proteines || 0),
                          carbs: Number(scanRes.total?.carbs || scanRes.total?.glucides || 0),
                          fat: Number(scanRes.total?.fat || scanRes.total?.lipides || 0),
                        }}
                        busy={saving}
                        onCancel={() => setReviewingScan(false)}
                        onConfirm={async values => {
                          await addEntry({ ...values, source: 'photo' });
                          setReviewingScan(false);
                        }}
                      />
                    ) : (
                      <button
                        onClick={() => setReviewingScan(true)}
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
                        VÉRIFIER ET AJOUTER
                      </button>
                    )}
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
