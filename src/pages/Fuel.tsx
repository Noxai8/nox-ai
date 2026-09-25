import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';
import { usePlan } from '../lib/usePlan';
import PaywallCard from '../components/PaywallCard';
import { Camera, ChevronRight, Plus, ScanLine, X } from 'lucide-react';

const ACCENT = '#C8FF00';
const BG     = '#F7F8F4';
const WHITE  = '#FFFFFF';
const BLACK  = '#0B0B0B';
const MUTED  = '#7A7F76';
const BORDER = '#E8EAE4';
const LIME   = '#F0FFD0';
const FN     = 'https://zpxrsmnpcyzafawlweyl.supabase.co/functions/v1';

const MEALS = [
  'Petit-dejeuner',
  'Dejeuner',
  'Diner',
  'Snacks',
];

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

  // Aucun faux objectif par défaut.
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
    'choose' |
    'photo' |
    'search' |
    'barcode' |
    'quick' |
    'voice' |
    'custom'
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

    const [
      { data: ents },
      { data: tgts },
      { data: wlog },
    ] = await Promise.all([
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
        (sum: number, entry: any) =>
          sum + (entry.water_ml || 0),
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
    ? Math.max(
        0,
        targets.kcal - Math.round(totals.kcal)
      )
    : 0;

  const protLeft = targets
    ? Math.max(
        0,
        targets.protein - Math.round(totals.protein)
      )
    : 0;

  const kcalPct = targets?.kcal
    ? Math.min(
        100,
        Math.round(
          (totals.kcal / targets.kcal) * 100
        )
      )
    : 0;

  /*
   * Semaine courante.
   * Lundi -> dimanche.
   */
  const weekDays = Array.from(
    { length: 7 },
    (_, i) => {
      const d = new Date();

      const mondayOffset =
        (d.getDay() + 6) % 7;

      d.setDate(
        d.getDate() - mondayOffset + i
      );

      return {
        key: d.toISOString().slice(0, 10),

        day: [
          'L',
          'M',
          'M',
          'J',
          'V',
          'S',
          'D',
        ][i],

        date: d.getDate(),

        isToday:
          d.toDateString() ===
          new Date().toDateString(),
      };
    }
  );

  const mealLabel = (meal: string) =>
    ({
      'Petit-dejeuner': 'Petit-déjeuner',
      Dejeuner: 'Déjeuner',
      Diner: 'Dîner',
      Snacks: 'Snacks',
    } as Record<string, string>)[meal] || meal;

  /*
   * Interprétation locale NOX.
   * Aucun chiffre nutritionnel inventé :
   * cette logique ne fonctionne que lorsque
   * de vrais targets existent.
   */
  const noxMessage = !targets
    ? null
    : totals.kcal === 0
      ? {
          title: 'Ta journée commence ici.',
          body:
            'Ajoute ton premier repas pour que NOX puisse interpréter ta journée.',
        }
      : totals.protein <
          targets.protein * 0.7
        ? {
            title: 'Priorité : protéines',
            body:
              `Il te reste environ ${kcalLeft} kcal ` +
              `et ${protLeft} g de protéines à compléter.`,
          }
        : {
            title:
              'Tu es sur la bonne trajectoire.',
            body:
              `Il te reste environ ${kcalLeft} kcal. ` +
              'Continue à construire tes repas autour de ton objectif.',
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

    await supabase
      .from('food_entries')
      .insert({
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
    await supabase
      .from('food_entries')
      .delete()
      .eq('id', id);

    await load();
  };

  const addWater = async (ml: number) => {
    await supabase
      .from('food_entries')
      .insert({
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
      const b64 = (
        event.target?.result as string
      ).split(',')[1];

      setPhotoB64(
        event.target?.result as string
      );

      setScanning(true);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const response = await fetch(
          `${FN}/analyze-meal`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',

              Authorization:
                `Bearer ${
                  session?.access_token || ''
                }`,
            },

            body: JSON.stringify({
              image: b64,
            }),
          }
        );

        const data = await response.json();

        const text =
          data?.content?.[0]?.text ||
          data?.data?.content?.[0]?.text ||
          '';

        const match =
          text.match(/\{[\s\S]*\}/);

        if (match) {
          setScanRes(
            JSON.parse(match[0])
          );
        }
      } catch {}

      setScanning(false);
    };

    reader.readAsDataURL(file);
  };

  const startVoice = () => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any)
        .webkitSpeechRecognition;

    if (!SR) {
      setVoiceText(
        'Non supporte sur ce navigateur.'
      );
      return;
    }

    const rec = new SR();

    rec.lang = 'fr-FR';

    setListening(true);

    rec.onresult = (event: any) => {
      setVoiceText(
        event.results[0][0].transcript
      );

      setListening(false);
    };

    rec.onerror = () =>
      setListening(false);

    rec.onend = () =>
      setListening(false);

    rec.start();
  };

  const addVoiceEntry = async () => {
    const lower =
      voiceText.toLowerCase();

    const food = FOOD_DB.find(item =>
      lower.includes(
        item.name
          .toLowerCase()
          .split(' ')[0]
      )
    );

    const match =
      lower.match(/(\d+)/);

    const grams = match
      ? parseInt(match[1])
      : 100;

    if (food) {
      const ratio = grams / 100;

      await addEntry({
        food_name:
          `${food.name} (${grams}g)`,

        calories:
          Math.round(
            food.kcal * ratio
          ),

        protein:
          Math.round(
            food.protein * ratio
          ),

        carbs:
          Math.round(
            food.carbs * ratio
          ),

        fat:
          Math.round(
            food.fat * ratio
          ),
      });
    }
  };

  const fetchIdeas = async () => {
    setLoadIdeas(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(
        `${FN}/generate-program`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            Authorization:
              `Bearer ${
                session?.access_token || ''
              }`,
          },

          body: JSON.stringify({
            prompt:
              `Nutritionniste. Il reste ${kcalLeft} kcal ` +
              `et ${protLeft}g proteines. ` +
              'Propose 3 idees de repas simples, sans markdown, ' +
              'une par ligne avec calories entre parentheses.',
          }),
        }
      );

      const data =
        await response.json();

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
          food.name
            .toLowerCase()
            .includes(
              search.toLowerCase()
            )
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
          const file =
            event.target.files?.[0];

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
          const file =
            event.target.files?.[0];

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

        {/* ================================
            DASHBOARD NUTRITION
        ================================= */}
