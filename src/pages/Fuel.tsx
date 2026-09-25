import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';
import { usePlan } from '../lib/usePlan';
import { Camera, ChevronRight, Plus, ScanLine, X } from 'lucide-react';

const ACCENT = '#C8FF00';
const BG = '#F7F8F4';
const WHITE = '#FFFFFF';
const BLACK = '#0B0B0B';
const MUTED = '#7A7F76';
const BORDER = '#E8EAE4';
const LIME = '#F0FFD0';
const FN = 'https://zpxrsmnpcyzafawlweyl.supabase.co/functions/v1';

const MEALS = ['Petit-dejeuner', 'Dejeuner', 'Diner', 'Snacks'];

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

  const [targets, setTargets] = useState<{
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null>(null);

  const [water, setWater] = useState(0);
  const [ideas, setIdeas] = useState<string | null>(null);
  const [loadIdeas, setLoadIdeas] = useState(false);

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
  }, [user]);

  const todayBounds = () => {
    const d = new Date();

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
    const { start, end } = todayBounds();

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
          .select('*')
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
        kcal: tgts.calories,
        protein: tgts.protein ?? 0,
        carbs: tgts.carbs ?? 0,
        fat: tgts.fat ?? 0,
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
      key: d.toISOString().slice(0, 10),
      day: ['L', 'M', 'M', 'J', 'V', 'S', 'D'][i],
      date: d.getDate(),
      isToday: d.toDateString() === new Date().toDateString(),
    };
  });

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
      created_at: new Date().toISOString(),
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
    await supabase.from('food_entries').insert({
      user_id: user!.id,
      meal_type: 'Eau',
      food_name: 'Eau',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      water_ml: ml,
      created_at: new Date().toISOString(),
    });

    setWater(current => current + ml);
  };

  const handlePhoto = (file: File) => {
    const reader = new FileReader();

    reader.onload = async event => {
      const result = event.target?.result as string;
      const b64 = result.split(',')[1];

      setPhotoB64(result);
      setScanning(true);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const response = await fetch(`${FN}/analyze-meal`, {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
          },

          body: JSON.stringify({
            image: b64,
          }),
        });

        const data = await response.json();

        const text =
          data?.content?.[0]?.text ||
          data?.data?.content?.[0]?.text ||
          '';

        const match = text.match(/\{[\s\S]*\}/);

        if (match) {
          setScanRes(JSON.parse(match[0]));
        }
      } catch {}

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

  const fetchIdeas = async () => {
    setLoadIdeas(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(`${FN}/generate-program`, {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },

        body: JSON.stringify({
          prompt: `Nutritionniste. Il reste ${kcalLeft} kcal et ${protLeft}g proteines. Propose 3 idees de repas simples, sans markdown, une par ligne avec calories entre parentheses.`,
        }),
      });

      const data = await response.json();

      const text =
        data?.content?.[0]?.text ||
        data?.data?.content?.[0]?.text ||
        '';

      if (text) {
        setIdeas(text.trim());
      }
    } catch {}

    setLoadIdeas(false);
  };

  const filtered =
    search.length > 1
      ? FOOD_DB.filter(food =>
          food.name.toLowerCase().includes(search.toLowerCase())
        )
      : FOOD_DB;

  const card: React.CSSProperties = {
    background: WHITE,
    border: `1px solid ${BORDER}`,
    borderRadius: 24,
    padding: 20,
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: BG,
        color: BLACK,
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

      <div
        style={{
          width: '100%',
          maxWidth: 560,
          margin: '0 auto',
        }}
      >
        {/* HEADER */}
        <header style={{ padding: '20px 20px 0' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginBottom: 18,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  color: MUTED,
                  letterSpacing: '.14em',
                  marginBottom: 5,
                }}
              >
                FUEL
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: 32,
                  lineHeight: 1,
                  fontWeight: 950,
                  letterSpacing: '-.05em',
                }}
              >
                Nutrition
              </h1>
            </div>

            <div
              style={{
                fontSize: 11,
                color: MUTED,
                fontWeight: 700,
              }}
            >
              Aujourd'hui
            </div>
          </div>

          {/* SEMAINE */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 5,
              marginBottom: 12,
            }}
          >
            {weekDays.map(day => (
              <div
                key={day.key}
                style={{
                  minWidth: 0,
                  padding: '7px 0 6px',
                  borderRadius: 12,
                  textAlign: 'center',
                  background: day.isToday ? BLACK : WHITE,
                  border: `1px solid ${day.isToday ? BLACK : BORDER}`,
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 900,
                    color: day.isToday ? ACCENT : MUTED,
                    marginBottom: 4,
                  }}
                >
                  {day.day}
                </div>

                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    color: day.isToday ? WHITE : BLACK,
                  }}
                >
                  {day.date}
                </div>
              </div>
            ))}
          </div>

          {/* INTERPRÉTATION NOX */}
          <div
            style={{
              background: 'linear-gradient(135deg, #F3FFD5 0%, #FBFFE9 100%)',
              border: '1px solid #E1F5A5',
              borderRadius: 22,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '48px 1fr 20px',
                gap: 12,
                alignItems: 'start',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: '#E4FF72',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 24,
                }}
              >
                🧠
              </div>

              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 900,
                    color: '#7A9800',
                    marginBottom: 5,
                  }}
                >
                  INTERPRÉTATION NOX
                </div>

                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 900,
                    lineHeight: 1.1,
                    marginBottom: 6,
                  }}
                >
                  {noxMessage.title}
                </div>

                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.35,
                    color: '#30342E',
                  }}
                >
                  {noxMessage.body}
                </div>
              </div>

              <ChevronRight
                size={22}
                color="#83A000"
                style={{ marginTop: 8 }}
              />
            </div>

            <button
              onClick={() =>
                isPro ? fetchIdeas() : navigate('/subscribe')
              }
              style={{
                width: '100%',
                height: 46,
                marginTop: 14,
                border: 0,
                borderRadius: 13,
                background: BLACK,
                color: WHITE,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 10px 0 18px',
                fontWeight: 900,
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              <span>
                <span style={{ color: ACCENT }}>✨</span>
                {'  '}IDÉES DE REPAS
              </span>

              {!isPro && (
                <span
                  style={{
                    background: ACCENT,
                    color: BLACK,
                    padding: '5px 9px',
                    borderRadius: 8,
                    fontSize: 10,
                    fontWeight: 950,
                  }}
                >
                  PRO
                </span>
              )}
            </button>

            {ideas && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #E1F5A5' }}>
                {ideas.split('\n').filter(l => l.trim()).map((line, i) => (
                  <div key={i} style={{ fontSize: 13, color: '#30342E', padding: '6px 0', lineHeight: 1.4 }}>{line}</div>
                ))}
              </div>
            )}
          </div>

          {/* CALORIES + MACROS */}
          {targets && (
            <div
              style={{
                background: WHITE,
                border: `1px solid ${BORDER}`,
                borderRadius: 22,
                padding: 16,
                display: 'grid',
                gridTemplateColumns: '135px 1fr',
                gap: 16,
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              {/* ANNEAU CALORIES */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 128,
                    height: 128,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    background: `conic-gradient(${
                      kcalPct >= 100 ? '#FF5C5C' : ACCENT
                    } ${kcalPct * 3.6}deg, ${BG} 0deg)`,
                  }}
                >
                  <div
                    style={{
                      width: 104,
                      height: 104,
                      borderRadius: '50%',
                      background: WHITE,
                      display: 'grid',
                      placeItems: 'center',
                      textAlign: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 9, color: MUTED, fontWeight: 900, letterSpacing: '.08em', marginBottom: 3 }}>
                        RESTANT
                      </div>
                      <div style={{ fontSize: 26, lineHeight: 1, fontWeight: 950, letterSpacing: '-.04em' }}>
                        {kcalLeft}
                      </div>
                      <div style={{ fontSize: 10, color: MUTED, marginTop: 3 }}>kcal</div>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 10, color: MUTED, textAlign: 'center', lineHeight: 1.3 }}>
                  {Math.round(totals.kcal)} / {targets.kcal} kcal
                </div>
              </div>

              {/* MACROS EN COLONNE */}
              <div style={{ display: 'grid', gap: 10 }}>
                {[
                  { label: 'Protéines', value: Math.round(totals.protein), target: targets.protein, color: '#4488FF' },
                  { label: 'Glucides',  value: Math.round(totals.carbs),   target: targets.carbs,   color: '#FFAA00' },
                  { label: 'Lipides',   value: Math.round(totals.fat),     target: targets.fat,     color: '#FF6B6B' },
                ].map(macro => {
                  const pct = macro.target > 0 ? Math.min(100, (macro.value / macro.target) * 100) : 0;
                  return (
                    <div key={macro.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: MUTED }}>{macro.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 900, color: BLACK }}>
                          {macro.value}<span style={{ fontSize: 9, color: MUTED, fontWeight: 400 }}>/{macro.target}g</span>
                        </span>
                      </div>
                      <div style={{ height: 4, background: BG, borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: macro.color, borderRadius: 99 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </header>

        <main style={{ padding: '0 20px' }}>
          {/* TES REPAS */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              margin: '12px 0 12px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: MUTED,
                  fontWeight: 900,
                  letterSpacing: '.12em',
                  marginBottom: 3,
                }}
              >
                AUJOURD'HUI
              </div>

              <div
                style={{
                  fontSize: 22,
                  fontWeight: 950,
                  letterSpacing: '-.04em',
                }}
              >
                Tes repas
              </div>
            </div>

            {/* MODIF : + CONTEXTUEL SELON L'HEURE */}
            <button
              onClick={openQuickAdd}
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: BLACK,
                border: 0,
                color: ACCENT,
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
              }}
            >
              <Plus size={20} strokeWidth={3} />
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gap: 7,
              marginBottom: 16,
            }}
          >
            {MEALS.map(meal => {
              const mealEntries = entries.filter(
                entry => entry.meal_type === meal
              );

              const mealKcal = mealEntries.reduce(
                (sum, entry) => sum + (entry.calories || 0),
                0
              );

              return (
                <div
                  key={meal}
                  style={{
                    ...card,
                    padding: 0,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      background: WHITE,
                      padding: '15px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 12, background: BG, display: 'grid', placeItems: 'center', fontSize: 17, flexShrink: 0 }}>
                        {mealIcon(meal)}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 900, color: BLACK }}>
                          {mealLabel(meal)}
                        </div>
                        <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>
                          {mealEntries.length
                            ? `${Math.round(mealKcal)} kcal`
                            : 'Rien enregistré'}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelMeal(meal);
                        setShowAdd(true);
                        setAddMode('choose');
                      }}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        background: BG,
                        border: `1px solid ${BORDER}`,
                        color: BLACK,
                        display: 'grid',
                        placeItems: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={16} strokeWidth={3} />
                    </button>
                  </div>

                  {mealEntries.length > 0 && (
                    <div
                      style={{
                        borderTop: `1px solid ${BORDER}`,
                      }}
                    >
                      {mealEntries.map((entry, index) => (
                        <div
                          key={entry.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 16px',
                            borderBottom:
                              index < mealEntries.length - 1
                                ? `1px solid ${BORDER}`
                                : 'none',
                          }}
                        >
                          <div
                            style={{
                              minWidth: 0,
                              paddingRight: 10,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: BLACK,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {entry.food_name}
                            </div>

                            <div
                              style={{
                                fontSize: 11,
                                color: MUTED,
                                marginTop: 2,
                              }}
                            >
                              {Math.round(entry.calories)} kcal
                              {entry.protein > 0
                                ? ` · ${Math.round(entry.protein)}g prot.`
                                : ''}
                            </div>
                          </div>

                          <button
                            onClick={() => deleteEntry(entry.id)}
                            style={{
                              background: 'none',
                              border: 0,
                              color: MUTED,
                              cursor: 'pointer',
                              padding: '4px 6px',
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* HYDRATATION — SANS FAUX OBJECTIF 2,5 L */}
          <div
            style={{
              ...card,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 14,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 900,
                    color: MUTED,
                    letterSpacing: '.1em',
                    marginBottom: 5,
                  }}
                >
                  HYDRATATION
                </div>

                <div
                  style={{
                    fontSize: 27,
                    fontWeight: 950,
                  }}
                >
                  {(water / 1000).toFixed(1)} L
                </div>
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: MUTED,
                  paddingTop: 4,
                }}
              >
                aujourd'hui
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 7,
              }}
            >
              {[150, 250, 330, 500].map(ml => (
                <button
                  key={ml}
                  onClick={() => addWater(ml)}
                  style={{
                    padding: '11px 0',
                    background: BG,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 12,
                    color: BLACK,
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  +{ml}
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>

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
              background: WHITE,
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
                background: '#D8DAD3',
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
                      color: BLACK,
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
                  background: BG,
                  color: BLACK,
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
                        color: '#888',
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
                          color: BLACK,
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
                      background: BG,
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
                        color: BLACK,
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
                      background: BG,
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
                          color: BLACK,
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
                        background: BG,
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
                        background: BG,
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

                {scanRes && !scanning && (
                  <div>
                    <div
                      style={{
                        background: BG,
                        borderRadius: 16,
                        padding: 16,
                        marginBottom: 14,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: BLACK,
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
                              background: WHITE,
                              borderRadius: 10,
                              padding: '10px 0',
                            }}
                          >
                            <div
                              style={{
                                fontSize: 18,
                                fontWeight: 950,
                                color: BLACK,
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
                          color: '#69715F',
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
                    background: BG,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 14,
                    color: BLACK,
                    fontSize: 15,
                    marginBottom: 14,
                    boxSizing: 'border-box',
                    outline: 'none',
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
                          color: BLACK,
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
                    background: BG,
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: BLACK,
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
                      background: BG,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 14,
                      color: BLACK,
                      fontSize: 28,
                      fontWeight: 950,
                      textAlign: 'center',
                      boxSizing: 'border-box',
                      outline: 'none',
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
                              background: BG,
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
                    background: BG,
                    fontSize: 16,
                    outline: 'none',
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
                    background: BG,
                    fontSize: 16,
                    outline: 'none',
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
                        background: BG,
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
                      background: BG,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 14,
                      fontSize: 15,
                      outline: 'none',
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
