import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';
import TutorialTooltip from '../components/TutorialTooltip';

const ACCENT = '#c8ff00';
const BG = '#F6F7F2';
const SURFACE = '#FFFFFF';
const BORDER = '#E8E8E3';
const DARK = '#111';

const FN = 'https://zpxrsmnpcyzafawlweyl.supabase.co/functions/v1';

const MEALS = ['Petit-déjeuner', 'Déjeuner', 'Dîner', 'Snacks'];

const FOOD_DB = [
  { name: 'Poulet grillé', kcal: 165, protein: 31, carbs: 0, fat: 4 },
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
  { name: 'Beurre de cacahuete', kcal: 628, protein: 27, carbs: 20, fat: 53 },
  { name: 'Crevettes cuites', kcal: 99, protein: 21, carbs: 0.5, fat: 1 },
  { name: 'Dinde', kcal: 104, protein: 22, carbs: 0, fat: 1.7 },
  { name: 'Jambon blanc', kcal: 107, protein: 17, carbs: 1, fat: 4 },
  { name: 'Skyr', kcal: 65, protein: 11, carbs: 4, fat: 0.2 },
];

type Tab = 'journal' | 'macros' | 'eau' | 'idees';

export default function Fuel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('journal');
  const [entries, setEntries] = useState<any[]>([]);
  const [targets, setTargets] = useState({ kcal: 2200, protein: 160, carbs: 220, fat: 70 });
  const [selectedMeal, setSelectedMeal] = useState('Déjeuner');
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<'choose'|'photo'|'search'|'barcode'|'custom'|'quick'|'voice'>('choose');
  const [search, setSearch] = useState('');
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [qty, setQty] = useState('100');
  const [customForm, setCustomForm] = useState({ name: '', kcal: '', protein: '', carbs: '', fat: '' });
  const [quickKcal, setQuickKcal] = useState('');
  const [quickProt, setQuickProt] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string|null>(null);
  const [voiceText, setVoiceText] = useState('');
  const [listening, setListening] = useState(false);
  const [water, setWater] = useState(0);
  const [waterTarget] = useState(2500);
  const [mealIdeas, setMealIdeas] = useState<string|null>(null);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (user) load(); }, [user]);

  useEffect(() => {
    const add = searchParams.get('add');
    if (!add) return;

    if (add === 'meal') {
      setTab('journal'); setShowAdd(true); setAddMode('choose');
    } else if (add === 'food') {
      setTab('journal'); setShowAdd(true); setAddMode('search');
    } else if (add === 'water') {
      setTab('eau'); setShowAdd(false);
    } else if (add === 'photo') {
      setTab('journal'); setShowAdd(true); setAddMode('photo');
    } else if (add === 'barcode') {
      setTab('journal'); setShowAdd(true); setAddMode('barcode');
    }

    const next = new URLSearchParams(searchParams);
    next.delete('add');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const todayBounds = () => {
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).toISOString();
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString();
    return { start, end };
  };

  const load = async () => {
    const { start, end } = todayBounds();
    const [{ data: ents }, { data: tgts }, { data: profile }, { data: wlog }] = await Promise.all([
      supabase.from('food_entries').select('*').eq('user_id', user!.id).gte('created_at', start).lte('created_at', end).order('created_at'),
      supabase.from('nutrition_targets').select('*').eq('user_id', user!.id).maybeSingle(),
      supabase.from('profiles').select('goal_type, starting_weight_kg').eq('id', user!.id).maybeSingle(),
      supabase.from('food_entries').select('water_ml').eq('user_id', user!.id).gte('created_at', start).lte('created_at', end),
    ]);
    setEntries(ents || []);
    if (tgts?.calories) setTargets({ kcal: tgts.calories, protein: tgts.protein || 160, carbs: tgts.carbs || 220, fat: tgts.fat || 70 });
    const totalWater = (wlog || []).reduce((s: number, e: any) => s + (e.water_ml || 0), 0);
    setWater(totalWater);
  };

  // Totaux du jour — calculés UNE SEULE FOIS depuis entries (pas de re-calc en cours de rendu)
  const totals = entries.reduce((s, e) => ({
    kcal: s.kcal + (e.calories || 0),
    protein: s.protein + (e.protein || 0),
    carbs: s.carbs + (e.carbs || 0),
    fat: s.fat + (e.fat || 0),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  const kcalLeft = Math.max(0, targets.kcal - Math.round(totals.kcal));
  const kcalPct = Math.min(100, (totals.kcal / targets.kcal) * 100);

  const closeAdd = () => {
    setShowAdd(false); setAddMode('choose'); setSelectedFood(null);
    setQty('100'); setSearch(''); setPhotoBase64(null);
    setScanResult(null); setScanError(''); setCustomForm({ name: '', kcal: '', protein: '', carbs: '', fat: '' });
    setQuickKcal(''); setQuickProt(''); setVoiceText('');
  };

  const addEntry = async (data: { food_name: string; calories: number; protein: number; carbs: number; fat: number }) => {
    setSaving(true);
    await supabase.from('food_entries').insert({
      user_id: user!.id, meal_type: selectedMeal,
      ...data, created_at: new Date().toISOString(),
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
      user_id: user!.id, meal_type: 'Eau', food_name: 'Eau', calories: 0,
      protein: 0, carbs: 0, fat: 0, water_ml: ml, created_at: new Date().toISOString(),
    });
    setWater(w => w + ml);
  };

  const handlePhoto = async (file: File) => {
    setAddMode('photo');
    setScanResult(null);
    setScanError('');

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl?.split(',')[1];
      if (!base64) {
        setScanError("Impossible de lire cette photo. Essaie avec une autre image.");
        return;
      }

      setPhotoBase64(dataUrl);
      setScanning(true);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const resp = await fetch(`${FN}/analyze-meal`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({ image: base64 }),
        });

        const raw = await resp.text();
        let data: any = null;
        try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }

        if (!resp.ok) {
          const apiMessage = data?.error || data?.message || `Erreur serveur (${resp.status})`;
          throw new Error(apiMessage);
        }

        // L'Edge Function peut renvoyer soit le résultat directement,
        // soit du JSON dans content[0].text selon le provider IA utilisé.
        let parsed: any = null;
        if (data && typeof data === 'object' && (data.total || data.description || data.foods || data.aliments)) {
          parsed = data;
        } else {
          const content =
            data?.content?.[0]?.text ||
            data?.data?.content?.[0]?.text ||
            data?.result?.content?.[0]?.text ||
            data?.result ||
            data?.text ||
            (typeof data === 'string' ? data : '');

          if (typeof content === 'object' && content) {
            parsed = content;
          } else if (typeof content === 'string' && content.trim()) {
            const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').trim();
            try {
              parsed = JSON.parse(cleaned);
            } catch {
              const first = cleaned.indexOf('{');
              const last = cleaned.lastIndexOf('}');
              if (first !== -1 && last > first) parsed = JSON.parse(cleaned.slice(first, last + 1));
            }
          }
        }

        if (!parsed) throw new Error("L'analyse n'a renvoyé aucun résultat exploitable.");

        // Normalise plusieurs formats possibles de réponse.
        const sourceTotal = parsed.total || parsed.macros || parsed.nutrition || parsed;
        const normalized = {
          ...parsed,
          description: parsed.description || parsed.name || parsed.meal || parsed.repas || 'Repas analysé',
          foods: parsed.foods || parsed.aliments || parsed.items || [],
          total: {
            kcal: Number(sourceTotal.kcal ?? sourceTotal.calories ?? parsed.calories ?? 0),
            protein: Number(sourceTotal.protein ?? sourceTotal.proteines ?? parsed.protein ?? parsed.proteines ?? 0),
            carbs: Number(sourceTotal.carbs ?? sourceTotal.glucides ?? parsed.carbs ?? parsed.glucides ?? 0),
            fat: Number(sourceTotal.fat ?? sourceTotal.lipides ?? parsed.fat ?? parsed.lipides ?? 0),
          },
        };

        setScanResult(normalized);
      } catch (err: any) {
        console.error('analyze-meal failed:', err);
        setScanResult(null);
        setScanError(err?.message || "NOX n'a pas réussi à analyser ce repas. Réessaie avec une photo plus nette.");
      } finally {
        setScanning(false);
      }
    };
    reader.onerror = () => setScanError("Impossible de lire cette photo.");
    reader.readAsDataURL(file);
  };

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setVoiceText('Non supporté sur ce navigateur.'); return; }
    const rec = new SR(); rec.lang = 'fr-FR'; rec.continuous = false;
    setListening(true);
    rec.onresult = (e: any) => { setVoiceText(e.results[0][0].transcript); setListening(false); };
    rec.onerror = () => { setListening(false); };
    rec.onend = () => setListening(false);
    rec.start();
  };

  const addVoiceEntry = async () => {
    const lower = voiceText.toLowerCase();
    const food = FOOD_DB.find(f => lower.includes(f.name.toLowerCase().split(' ')[0]));
    const m = lower.match(/(\d+)/);
    const g = m ? parseInt(m[1]) : 100;
    if (food) {
      const r = g / 100;
      await addEntry({ food_name: `${food.name} (${g}g)`, calories: Math.round(food.kcal * r), protein: Math.round(food.protein * r), carbs: Math.round(food.carbs * r), fat: Math.round(food.fat * r) });
    }
  };

  const getMealIdeas = async () => {
    setLoadingIdeas(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${FN}/generate-program`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ prompt: `Tu es un nutritionniste. Il reste ${kcalLeft} kcal et ${Math.round(Math.max(0, targets.protein - totals.protein))}g de protéines à consommer aujourd'hui. Propose 3 idées de repas simples et rapides sous forme de liste, sans markdown, sans emojis. Chaque idée sur une ligne avec les calories approximatives entre parenthèses.` }),
      });
      const data = await resp.json();
      const text = data?.content?.[0]?.text || data?.data?.content?.[0]?.text || '';
      setMealIdeas(text);
    } catch {}
    setLoadingIdeas(false);
  };

  const filteredFoods = search.length > 1
    ? FOOD_DB.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    : FOOD_DB;

  const mealsByType = MEALS.reduce((acc, m) => {
    acc[m] = entries.filter(e => e.meal_type === m);
    return acc;
  }, {} as Record<string, any[]>);

  const TABS: [Tab, string][] = [['journal', 'Journal'], ['macros', 'Macros'], ['eau', 'Eau'], ['idees', 'Frigo IA ✦']];

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 90 }}>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handlePhoto(f); e.target.value = ''; }} />
      <input ref={galleryRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handlePhoto(f); e.target.value = ''; }} />

      {/* HEADER / NUTRITION OVERVIEW */}
      <div style={{ background: 'linear-gradient(180deg,#090909 0%,#111 100%)', padding: '20px 20px 18px', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 34, lineHeight: 1, fontWeight: 950, letterSpacing: '-.04em' }}>Noxai<span style={{ color: ACCENT }}>.</span></div>
            <div style={{ marginTop: 7, fontSize: 9, letterSpacing: '.28em', color: '#d8d8d8', fontWeight: 700 }}>MANGE MIEUX. VIS PLUS LOIN.</div>
          </div>
          <div style={{ border: '1px solid #3b3b3b', borderRadius: 18, padding: '10px 14px', fontSize: 12, fontWeight: 800 }}>Aujourd’hui⌄</div>
        </div>
      </div>

      <div style={{ background: BG, borderRadius: '28px 28px 0 0', marginTop: -1, padding: '20px 20px 0' }}>
        <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 22, padding: 18, boxShadow: '0 10px 30px rgba(17,17,17,.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'stretch' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: DARK }}>Calories restantes</div>
              <div style={{ fontSize: 42, fontWeight: 950, color: DARK, lineHeight: 1, marginTop: 8, letterSpacing: '-.04em' }}>{kcalLeft}</div>
              <div style={{ fontSize: 13, color: '#777', marginTop: 5 }}>sur {targets.kcal} kcal</div>
            </div>
            <div style={{ flex: '0 0 43%', borderRadius: 18, padding: '14px 13px', background: 'linear-gradient(135deg,#f1ffd0,#f8ffe9)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 28 }}>♨</div>
              <div><div style={{ fontSize: 14, fontWeight: 900, color: DARK, lineHeight: 1.15 }}>Tu es sur la<br/>bonne voie !</div><div style={{ fontSize: 10, color: '#666', marginTop: 5 }}>Continue comme ça ⚡</div></div>
            </div>
          </div>
          <div style={{ height: 10, background: '#ececea', borderRadius: 999, overflow: 'hidden', marginTop: 16 }}>
            <div style={{ height: '100%', width: kcalPct + '%', background: kcalPct >= 100 ? '#ff5555' : ACCENT, borderRadius: 999, transition: 'width .3s' }} />
          </div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 7, fontWeight: 700 }}>{Math.round(totals.kcal)} kcal consommées</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10, marginTop: 12 }}>
          {[
            { label: 'Protéines', v: Math.round(totals.protein), t: targets.protein, color: '#4488ff', icon: '◉' },
            { label: 'Glucides', v: Math.round(totals.carbs), t: targets.carbs, color: '#ffaa00', icon: '◐' },
            { label: 'Lipides', v: Math.round(totals.fat), t: targets.fat, color: '#ff6b6b', icon: '◒' },
          ].map(({ label, v, t, color, icon }) => (
            <div key={label} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 18, padding: '13px 12px', minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#555', fontSize: 11 }}><span style={{ color, fontWeight: 900 }}>{icon}</span><span>{label}</span></div>
              <div style={{ marginTop: 8, fontSize: 24, fontWeight: 950, color: DARK }}>{v}<span style={{ fontSize: 12, marginLeft: 3 }}>g</span></div>
              <div style={{ fontSize: 11, color: '#777' }}>/ {t} g</div>
              <div style={{ height: 6, background: '#eee', borderRadius: 999, overflow: 'hidden', marginTop: 10 }}><div style={{ height: '100%', width: Math.min(100,v/t*100)+'%', background: color, borderRadius: 999 }}/></div>
              <div style={{ textAlign: 'right', fontSize: 9, color: '#555', marginTop: 4 }}>{Math.round(Math.min(100,v/t*100))}%</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 18, padding: 7, marginTop: 14 }}>
          {TABS.map(([id,label]) => (
            <button key={id} onClick={() => {
                if (id === 'idees') {
                  navigate('/meal-planner');
                  return;
                }
                setTab(id);
              }} style={{ minWidth: 0, padding: '10px 4px', background: tab===id ? '#f2ffd0' : 'transparent', border: 'none', borderRadius: 14, color: tab===id ? DARK : '#555', fontSize: 11, fontWeight: tab===id ? 900 : 700, cursor: 'pointer', touchAction: 'manipulation' }}>{label}</button>
          ))}
        </div>
      </div>
      <div style={{ padding: '16px 20px 0' }}>

        {/* ── JOURNAL ── */}
        {tab === 'journal' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div><div style={{ fontSize: 22, fontWeight: 950, color: DARK, letterSpacing: '-.03em' }}>Mon journal alimentaire</div><div style={{ fontSize: 12, color: '#8a8a8a', marginTop: 3 }}>Ajoute tes repas et garde le cap sur tes objectifs.</div></div>
              <button onClick={() => navigate('/fuel-ai')} style={{ flexShrink: 0, padding: '9px 12px', background: SURFACE, border: '1px solid '+BORDER, borderRadius: 999, color: DARK, fontWeight: 800, fontSize: 11, cursor: 'pointer' }}>◎ Objectifs</button>
            </div>
            {MEALS.map(meal => {
              const mealEntries = mealsByType[meal] || [];
              const mealKcal = mealEntries.reduce((s, e) => s + (e.calories || 0), 0);
              return (
                <div key={meal} style={{ marginBottom: 12, background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 20, padding: 14, boxShadow: '0 8px 24px rgba(17,17,17,.035)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div><div style={{ fontSize: 16, fontWeight: 900, color: DARK }}>{meal}</div><div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{meal === 'Petit-déjeuner' ? 'Bien commencer la journée' : meal === 'Déjeuner' ? 'Fais le plein d’énergie' : meal === 'Dîner' ? 'Une soirée équilibrée' : 'Les petits plus'}</div></div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      {mealKcal > 0 && <span style={{ fontSize: 12, color: '#999' }}>{Math.round(mealKcal)} kcal</span>}
                      <button onClick={() => { setSelectedMeal(meal); setShowAdd(true); setAddMode('choose'); }}
                        style={{ width: 42, height: 42, borderRadius: 14, background: ACCENT, border: 'none', color: DARK, fontSize: 26, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}>+</button>
                    </div>
                  </div>
                  {mealEntries.length === 0 ? (
                    <button onClick={() => { setSelectedMeal(meal); setShowAdd(true); setAddMode('choose'); }}
                      style={{ width: '100%', padding: '4px 0 0', background: 'transparent', border: 'none', color: '#aaa', fontSize: 12, fontStyle: 'italic', cursor: 'pointer', textAlign: 'left', touchAction: 'manipulation' }}>
                      Aucun aliment ajouté
                    </button>
                  ) : (
                    <div style={{ background: SURFACE, borderRadius: 12, overflow: 'hidden', border: '1px solid ' + BORDER }}>
                      {mealEntries.map((e, i) => (
                        <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: i < mealEntries.length - 1 ? '1px solid ' + BORDER : 'none' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: DARK }}>{e.food_name}</div>
                            <div style={{ fontSize: 11, color: '#999', marginTop: 1 }}>
                              {Math.round(e.calories)} kcal
                              {e.protein > 0 && ` · ${Math.round(e.protein)}g prot.`}
                            </div>
                          </div>
                          <button onClick={() => deleteEntry(e.id)}
                            style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 18, padding: '4px 8px', touchAction: 'manipulation' }}>x</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── MACROS ── */}
        {tab === 'macros' && (
          <div>
            {[
              { label: 'Proteines', v: Math.round(totals.protein), t: targets.protein, color: '#4488ff', unit: 'g', tip: 'Essentielles pour la construction musculaire.' },
              { label: 'Glucides', v: Math.round(totals.carbs), t: targets.carbs, color: '#ffaa00', unit: 'g', tip: 'Energie principale pour l\'entrainement.' },
              { label: 'Lipides', v: Math.round(totals.fat), t: targets.fat, color: '#ff6b6b', unit: 'g', tip: 'Hormones et absorption des vitamines.' },
              { label: 'Calories', v: Math.round(totals.kcal), t: targets.kcal, color: ACCENT, unit: 'kcal', tip: 'Balance energetique totale de la journee.' },
            ].map(({ label, v, t, color, unit, tip }) => (
              <div key={label} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: '16px 18px', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: DARK }}>{label}</div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{tip}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: DARK }}>{v}</div>
                    <div style={{ fontSize: 11, color: '#999' }}>/ {t} {unit}</div>
                  </div>
                </div>
                <div style={{ height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: Math.min(100, v/t*100) + '%', background: color, borderRadius: 4, transition: 'width .4s' }} />
                </div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>{Math.max(0, t - v)} {unit} restants</div>
              </div>
            ))}

            <button onClick={() => navigate('/fuel-ai')}
              style={{ width: '100%', padding: 16, background: DARK, border: 'none', borderRadius: 14, color: ACCENT, fontWeight: 800, fontSize: 14, cursor: 'pointer', touchAction: 'manipulation', marginTop: 8 }}>
              Analyser avec Fuel IA
            </button>
          </div>
        )}

        {/* ── EAU ── */}
        {tab === 'eau' && (
          <div>
            <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 20, padding: 24, marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 48, fontWeight: 900, color: '#4488ff' }}>{Math.round(water / 100) / 10}L</div>
              <div style={{ fontSize: 14, color: '#999', marginBottom: 16 }}>objectif : {waterTarget / 1000}L</div>
              <div style={{ height: 12, background: '#f0f0f0', borderRadius: 6, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', width: Math.min(100, water / waterTarget * 100) + '%', background: '#4488ff', borderRadius: 6, transition: 'width .4s' }} />
              </div>
              <div style={{ fontSize: 12, color: '#999' }}>{Math.max(0, waterTarget - water)}ml restants</div>
            </div>

            <div style={{ fontSize: 12, color: '#999', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Ajouter</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              {[150, 250, 330, 500, 750, 1000].map(ml => (
                <button key={ml} onClick={() => addWater(ml)}
                  style={{ padding: '18px 0', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, color: DARK, fontSize: 15, fontWeight: 800, cursor: 'pointer', touchAction: 'manipulation' }}>
                  +{ml}ml
                </button>
              ))}
            </div>

            <div style={{ background: '#4488ff11', border: '1px solid #4488ff33', borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 6 }}>Conseils hydratation</div>
              <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>
                Boire 500ml au reveil. 500ml avant chaque repas. 500ml pendant l\'entrainement. Objectif : 35ml par kg de poids corporel.
              </div>
            </div>
          </div>
        )}

        {/* ── FRIGO IA ── */}
        {tab === 'idees' && (
          <div>
            <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 20, fontWeight: 950, color: DARK, marginBottom: 6 }}>Frigo IA ✦</div><div style={{ fontSize: 12, color: '#888', lineHeight: 1.5, marginBottom: 14 }}>Analyse ce que tu as sous la main et génère un repas adapté à tes objectifs du jour.</div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ background: BG, borderRadius: 12, padding: '10px 14px', textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: DARK }}>{kcalLeft}</div>
                  <div style={{ fontSize: 10, color: '#999' }}>kcal</div>
                </div>
                <div style={{ background: BG, borderRadius: 12, padding: '10px 14px', textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: DARK }}>{Math.round(Math.max(0, targets.protein - totals.protein))}g</div>
                  <div style={{ fontSize: 10, color: '#999' }}>proteines</div>
                </div>
              </div>
              <button onClick={getMealIdeas} disabled={loadingIdeas || kcalLeft < 50}
                style={{ width: '100%', padding: 14, background: kcalLeft >= 50 ? DARK : '#eee', border: 'none', borderRadius: 12, color: kcalLeft >= 50 ? ACCENT : '#ccc', fontWeight: 800, fontSize: 13, cursor: kcalLeft >= 50 ? 'pointer' : 'not-allowed', touchAction: 'manipulation' }}>
                {loadingIdeas ? 'NOX analyse...' : kcalLeft < 50 ? 'Objectif atteint !' : 'Générer un repas adapté'}
              </button>
            </div>

            {mealIdeas && (
              <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: 20, marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: DARK, marginBottom: 12 }}>Suggestions NOX</div>
                {mealIdeas.split('\n').filter(l => l.trim()).map((line, i) => (
                  <div key={i} style={{ padding: '10px 0', borderBottom: i < mealIdeas.split('\n').filter(l=>l.trim()).length - 1 ? '1px solid ' + BORDER : 'none', fontSize: 13, color: '#444', lineHeight: 1.5 }}>
                    {line}
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => navigate('/recipes')}
              style={{ width: '100%', padding: 14, background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, color: DARK, fontWeight: 700, fontSize: 13, cursor: 'pointer', touchAction: 'manipulation', marginBottom: 10 }}>
              Voir mes recettes
            </button>
            <button onClick={() => navigate('/meal-planner')}
              style={{ width: '100%', padding: 14, background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, color: DARK, fontWeight: 700, fontSize: 13, cursor: 'pointer', touchAction: 'manipulation', marginBottom: 10 }}>
              Planifier ma semaine
            </button>
            <button onClick={() => navigate('/fasting')}
              style={{ width: '100%', padding: 14, background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, color: DARK, fontWeight: 700, fontSize: 13, cursor: 'pointer', touchAction: 'manipulation' }}>
              Jeune intermittent
            </button>
          </div>
        )}
      </div>

      {/* MODAL AJOUTER */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200 }} onClick={closeAdd}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: SURFACE, borderRadius: '20px 20px 0 0', padding: '18px 24px 130px', maxHeight: '88vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
            onClick={e => e.stopPropagation()}>

            {/* Header modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: DARK }}>
                {addMode === 'choose' ? 'Ajouter a ' + selectedMeal : addMode === 'photo' ? 'Scanner mon repas' : addMode === 'search' ? 'Rechercher' : addMode === 'barcode' ? 'Code-barres' : addMode === 'quick' ? 'Ajout rapide' : addMode === 'voice' ? 'Dictee vocale' : 'Saisie manuelle'}
              </div>
              <button onClick={closeAdd} style={{ background: 'none', border: 'none', fontSize: 24, color: '#999', cursor: 'pointer' }}>x</button>
            </div>

            {addMode !== 'choose' && (
              <button onClick={() => setAddMode('choose')} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 13, marginBottom: 12, display: 'block' }}>
                Retour
              </button>
            )}

            {/* Selecteur repas */}
            {addMode === 'choose' && (
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 20 }}>
                {MEALS.map(m => (
                  <button key={m} onClick={() => setSelectedMeal(m)}
                    style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 20, border: '1px solid ' + (selectedMeal === m ? DARK : BORDER), background: selectedMeal === m ? DARK : 'transparent', color: selectedMeal === m ? ACCENT : '#999', fontSize: 12, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>
                    {m}
                  </button>
                ))}
              </div>
            )}

            {/* Menu principal */}
            {addMode === 'choose' && (
              <div style={{ display: 'grid', gap: 10 }}>
                <button onClick={() => { setAddMode('photo'); fileRef.current?.click(); }}
                  style={{ padding: '16px 18px', background: '#FFFFFF', borderRadius: 14, border: '1px solid ' + BORDER, cursor: 'pointer', textAlign: 'left', touchAction: 'manipulation' }}>
                  <div style={{ fontSize: 11, color: '#6B7600', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>Recommande</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: DARK }}>Scanner mon repas en photo</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>NOX identifie les aliments et estime les macros</div>
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Rechercher', sub: 'Base d\'aliments', mode: 'search' as const },
                    { label: 'Code-barres', sub: 'Scanner un produit', mode: 'barcode' as const },
                    { label: 'Ajout rapide', sub: 'Calories + proteines', mode: 'quick' as const },
                    { label: 'Dictee vocale', sub: '"200g de poulet..."', mode: 'voice' as const },
                    { label: 'Saisie manuelle', sub: 'Entrer les valeurs', mode: 'custom' as const },
                  ].map(({ label, sub, mode }) => (
                    <button key={mode} onClick={() => setAddMode(mode)}
                      style={{ padding: '14px 14px', background: BG, border: '1px solid ' + BORDER, borderRadius: 14, cursor: 'pointer', textAlign: 'left', touchAction: 'manipulation' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: DARK }}>{label}</div>
                      <div style={{ fontSize: 11, color: '#999', marginTop: 3 }}>{sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Photo scan */}
            {addMode === 'photo' && (
              <div>
                <div style={{ width: 42, height: 5, borderRadius: 999, background: '#d7d7d2', margin: '-2px auto 18px' }} />

                {!photoBase64 && (
                  <div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 18 }}>
                      <div style={{ width: 58, height: 58, flexShrink: 0, borderRadius: 18, background: '#f1ffd0', display: 'grid', placeItems: 'center', fontSize: 28, color: DARK }}>⌗</div>
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 950, color: DARK, letterSpacing: '-.02em' }}>Analyse ton repas</div>
                        <div style={{ fontSize: 12, color: '#777', lineHeight: 1.45, marginTop: 4 }}>Une photo suffit. NOX identifie le repas et estime ses calories et macros.</div>
                      </div>
                    </div>

                    <button onClick={() => fileRef.current?.click()} style={{ width: '100%', minHeight: 132, border: '1.5px dashed #dfe3d3', borderRadius: 20, background: 'linear-gradient(145deg,#fbfff2,#f7f8f3)', display: 'grid', placeItems: 'center', cursor: 'pointer', marginBottom: 10 }}>
                      <div>
                        <div style={{ width: 52, height: 52, borderRadius: '50%', background: DARK, color: '#fff', display: 'grid', placeItems: 'center', margin: '0 auto 9px', fontSize: 24 }}>◉</div>
                        <div style={{ fontSize: 14, fontWeight: 900, color: DARK }}>Prendre une photo</div>
                        <div style={{ fontSize: 11, color: '#999', marginTop: 3 }}>Cadre toute l'assiette si possible</div>
                      </div>
                    </button>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <button onClick={() => galleryRef.current?.click()} style={{ padding: 14, border: '1px solid '+BORDER, borderRadius: 14, background: SURFACE, color: DARK, fontWeight: 850, cursor: 'pointer' }}>▧ Galerie</button>
                      <button onClick={() => navigate('/barcode-scanner')} style={{ padding: 14, border: '1px solid '+BORDER, borderRadius: 14, background: SURFACE, color: DARK, fontWeight: 850, cursor: 'pointer' }}>▥ Code-barres</button>
                    </div>
                  </div>
                )}

                {photoBase64 && (
                  <div>
                    <div style={{ position: 'relative', width: '100%', height: 190, borderRadius: 20, overflow: 'hidden', background: '#111', marginBottom: 12 }}>
                      <img src={photoBase64} alt="Repas à analyser" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <div style={{ position: 'absolute', left: 10, top: 10, padding: '6px 9px', borderRadius: 999, background: 'rgba(0,0,0,.62)', color: '#fff', fontSize: 10, fontWeight: 800 }}>PHOTO DU REPAS</div>
                      {scanning && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,8,8,.62)', backdropFilter: 'blur(2px)', display: 'grid', placeItems: 'center', color: '#fff' }}>
                          <div style={{ textAlign: 'center', padding: 20 }}>
                            <div style={{ width: 58, height: 58, borderRadius: '50%', background: ACCENT, color: DARK, display: 'grid', placeItems: 'center', margin: '0 auto 12px', fontSize: 28, fontWeight: 950 }}>✦</div>
                            <div style={{ fontSize: 16, fontWeight: 950 }}>NOX analyse ton repas</div>
                            <div style={{ fontSize: 11, opacity: .78, marginTop: 5 }}>Aliments · portions · calories · macros</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {scanning && (
                      <div style={{ background: '#f5f7f0', borderRadius: 16, padding: 14, marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 800, color: '#777', marginBottom: 8 }}><span>Analyse IA en cours</span><span>Quelques secondes</span></div>
                        <div style={{ height: 7, borderRadius: 999, background: '#e6e8e0', overflow: 'hidden' }}><div style={{ width: '72%', height: '100%', borderRadius: 999, background: ACCENT }} /></div>
                      </div>
                    )}

                    {scanError && !scanning && (
                      <div style={{ border: '1px solid #ffd3d3', background: '#fff7f7', borderRadius: 18, padding: 15, marginBottom: 12 }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: DARK }}>Analyse impossible</div>
                        <div style={{ fontSize: 12, color: '#777', lineHeight: 1.5, marginTop: 5 }}>{scanError}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                          <button onClick={() => { const f = fileRef.current; setScanError(''); setPhotoBase64(null); f?.click(); }} style={{ padding: 12, borderRadius: 12, border: 'none', background: DARK, color: '#fff', fontWeight: 850 }}>Reprendre</button>
                          <button onClick={() => { setScanError(''); setPhotoBase64(null); galleryRef.current?.click(); }} style={{ padding: 12, borderRadius: 12, border: '1px solid '+BORDER, background: SURFACE, color: DARK, fontWeight: 850 }}>Galerie</button>
                        </div>
                      </div>
                    )}

                    {scanResult && !scanning && (
                      <div>
                        <div style={{ background: 'linear-gradient(145deg,#f5ffd9,#fbfff1)', border: '1px solid #e2efb6', borderRadius: 18, padding: 16, marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ fontSize: 10, color: '#718000', fontWeight: 950, letterSpacing: '.08em' }}>ANALYSE TERMINÉE</div>
                              <div style={{ fontSize: 18, fontWeight: 950, color: DARK, marginTop: 5 }}>{scanResult.description || 'Repas analysé'}</div>
                            </div>
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: ACCENT, display: 'grid', placeItems: 'center', fontWeight: 950 }}>✓</div>
                          </div>
                        </div>

                        {Array.isArray(scanResult.foods) && scanResult.foods.length > 0 && (
                          <div style={{ background: SURFACE, border: '1px solid '+BORDER, borderRadius: 16, padding: '4px 14px', marginBottom: 12 }}>
                            {scanResult.foods.slice(0, 6).map((food: any, i: number) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: i < Math.min(scanResult.foods.length, 6)-1 ? '1px solid '+BORDER : 'none' }}>
                                <span style={{ fontSize: 12, fontWeight: 750, color: DARK }}>{food.name || food.nom || food.food || `Aliment ${i+1}`}</span>
                                <span style={{ fontSize: 11, color: '#999' }}>{food.quantity || food.quantite || food.portion || ''}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 7, marginBottom: 12 }}>
                          {[
                            ['kcal', Math.round(scanResult.total?.kcal || 0), '#111'],
                            ['prot.', Math.round(scanResult.total?.protein || 0)+'g', '#4488ff'],
                            ['gluc.', Math.round(scanResult.total?.carbs || 0)+'g', '#ffaa00'],
                            ['lip.', Math.round(scanResult.total?.fat || 0)+'g', '#ff6b6b'],
                          ].map(([label, value, color]) => (
                            <div key={label as string} style={{ background: SURFACE, border: '1px solid '+BORDER, borderRadius: 14, padding: '11px 4px', textAlign: 'center', minWidth: 0 }}>
                              <div style={{ fontSize: 16, fontWeight: 950, color: color as string }}>{value}</div>
                              <div style={{ fontSize: 9, color: '#999', marginTop: 3, textTransform: 'uppercase' }}>{label}</div>
                            </div>
                          ))}
                        </div>

                        <button onClick={() => addEntry({
                          food_name: scanResult.description || 'Repas scanné',
                          calories: scanResult.total?.kcal || 0,
                          protein: scanResult.total?.protein || 0,
                          carbs: scanResult.total?.carbs || 0,
                          fat: scanResult.total?.fat || 0,
                        })} disabled={saving} style={{ width: '100%', padding: 16, border: 'none', borderRadius: 15, background: ACCENT, color: DARK, fontSize: 14, fontWeight: 950, cursor: saving ? 'wait' : 'pointer', boxShadow: '0 10px 26px rgba(200,255,0,.25)' }}>
                          {saving ? 'AJOUT EN COURS...' : `AJOUTER À ${selectedMeal.toUpperCase()}`}
                        </button>
                        <button onClick={() => { setPhotoBase64(null); setScanResult(null); setScanError(''); }} style={{ width: '100%', padding: 12, border: 'none', background: 'transparent', color: '#888', fontWeight: 800, marginTop: 5 }}>Analyser une autre photo</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Recherche */}
            {addMode === 'search' && !selectedFood && (
              <div>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chercher un aliment..."
                  autoFocus
                  style={{ width: '100%', padding: '12px 14px', background: BG, border: '1px solid ' + BORDER, borderRadius: 12, color: DARK, fontSize: 14, marginBottom: 14, boxSizing: 'border-box' as const, outline: 'none' }} />
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {filteredFoods.map(f => (
                    <button key={f.name} onClick={() => { setSelectedFood(f); setQty('100'); }}
                      style={{ width: '100%', padding: '12px 14px', background: 'none', border: 'none', borderBottom: '1px solid ' + BORDER, cursor: 'pointer', textAlign: 'left', touchAction: 'manipulation' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: DARK }}>{f.name}</div>
                      <div style={{ fontSize: 11, color: '#999' }}>{f.kcal} kcal · {f.protein}g prot. · pour 100g</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Detail aliment */}
            {addMode === 'search' && selectedFood && (
              <div>
                <div style={{ background: BG, borderRadius: 14, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: DARK, marginBottom: 4 }}>{selectedFood.name}</div>
                  <div style={{ fontSize: 12, color: '#999' }}>{selectedFood.kcal} kcal · {selectedFood.protein}g prot. · pour 100g</div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>Quantite (g)</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    {[50, 100, 150, 200, 250, 300].map(g => (
                      <button key={g} onClick={() => setQty(String(g))}
                        style={{ padding: '8px 14px', borderRadius: 20, border: '1px solid ' + (qty === String(g) ? DARK : BORDER), background: qty === String(g) ? DARK : 'transparent', color: qty === String(g) ? ACCENT : '#999', fontSize: 12, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>
                        {g}g
                      </button>
                    ))}
                  </div>
                  <input value={qty} onChange={e => setQty(e.target.value)} type="number" placeholder="100"
                    style={{ width: '100%', padding: '14px', background: BG, border: '1px solid ' + BORDER, borderRadius: 12, color: DARK, fontSize: 24, fontWeight: 900, textAlign: 'center', boxSizing: 'border-box' as const, outline: 'none' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
                  {(() => {
                    const r = parseFloat(qty) / 100;
                    return [
                      ['Kcal', Math.round(selectedFood.kcal * r)],
                      ['Prot', Math.round(selectedFood.protein * r) + 'g'],
                      ['Gluc', Math.round(selectedFood.carbs * r) + 'g'],
                      ['Lip', Math.round(selectedFood.fat * r) + 'g'],
                    ].map(([l, v]) => (
                      <div key={l as string} style={{ textAlign: 'center', background: BG, borderRadius: 8, padding: '10px 0' }}>
                        <div style={{ fontSize: 16, fontWeight: 900, color: DARK }}>{v}</div>
                        <div style={{ fontSize: 10, color: '#999' }}>{l}</div>
                      </div>
                    ));
                  })()}
                </div>

                <button onClick={() => {
                  const r = parseFloat(qty) / 100;
                  addEntry({ food_name: `${selectedFood.name} (${qty}g)`, calories: Math.round(selectedFood.kcal * r), protein: Math.round(selectedFood.protein * r * 10) / 10, carbs: Math.round(selectedFood.carbs * r * 10) / 10, fat: Math.round(selectedFood.fat * r * 10) / 10 });
                }} disabled={saving}
                  style={{ width: '100%', padding: 16, background: DARK, border: 'none', borderRadius: 12, color: ACCENT, fontWeight: 900, fontSize: 14, cursor: 'pointer', touchAction: 'manipulation' }}>
                  AJOUTER A {selectedMeal.toUpperCase()}
                </button>
              </div>
            )}

            {/* Code-barres */}
            {addMode === 'barcode' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: 58, height: 42, margin: "0 auto 14px", border: "2px solid #111", borderRadius: 8, display: "grid", placeItems: "center", color: "#111", fontSize: 11, fontWeight: 1000, letterSpacing: ".08em" }}>BAR</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: DARK, marginBottom: 8 }}>Scanner un code-barres</div>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 20 }}>Scanne le code sur l'emballage du produit</div>
                <button onClick={() => navigate('/barcode-scanner')}
                  style={{ width: '100%', padding: 16, background: DARK, border: 'none', borderRadius: 12, color: ACCENT, fontWeight: 900, fontSize: 14, cursor: 'pointer', touchAction: 'manipulation' }}>
                  OUVRIR LE SCANNER
                </button>
              </div>
            )}

            {/* Quick add */}
            {addMode === 'quick' && (
              <div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>Calories *</div>
                  <input value={quickKcal} onChange={e => setQuickKcal(e.target.value)} type="number" placeholder="500" autoFocus
                    style={{ width: '100%', padding: '16px', background: BG, border: '1px solid ' + BORDER, borderRadius: 12, color: DARK, fontSize: 32, fontWeight: 900, textAlign: 'center', boxSizing: 'border-box' as const, outline: 'none' }} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>Proteines (g) — optionnel</div>
                  <input value={quickProt} onChange={e => setQuickProt(e.target.value)} type="number" placeholder="30"
                    style={{ width: '100%', padding: '14px', background: BG, border: '1px solid ' + BORDER, borderRadius: 12, color: DARK, fontSize: 24, fontWeight: 900, textAlign: 'center', boxSizing: 'border-box' as const, outline: 'none' }} />
                </div>
                <button onClick={() => addEntry({ food_name: 'Ajout rapide', calories: parseInt(quickKcal) || 0, protein: parseFloat(quickProt) || 0, carbs: 0, fat: 0 })}
                  disabled={!quickKcal || saving}
                  style={{ width: '100%', padding: 16, background: quickKcal ? DARK : '#eee', border: 'none', borderRadius: 12, color: quickKcal ? ACCENT : '#ccc', fontWeight: 900, fontSize: 14, cursor: quickKcal ? 'pointer' : 'not-allowed', touchAction: 'manipulation' as const }}>
                  AJOUTER {quickKcal ? quickKcal + ' KCAL' : ''}
                </button>
              </div>
            )}

            {/* Voice */}
            {addMode === 'voice' && (
              <div style={{ textAlign: 'center' }}>
                <button onClick={startVoice} disabled={listening}
                  style={{ width: 90, height: 90, borderRadius: '50%', background: listening ? '#ff4444' : DARK, border: 'none', fontSize: 32, cursor: 'pointer', margin: '10px auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}>
                  MIC
                </button>
                {listening && <div style={{ color: '#ff4444', fontSize: 13, marginBottom: 12 }}>Ecoute...</div>}
                {voiceText && !listening && (
                  <div>
                    <div style={{ background: BG, borderRadius: 12, padding: 14, marginBottom: 14, fontSize: 14, color: DARK }}>"{voiceText}"</div>
                    <button onClick={addVoiceEntry} style={{ width: '100%', padding: 14, background: DARK, border: 'none', borderRadius: 12, color: ACCENT, fontWeight: 900, fontSize: 14, cursor: 'pointer', touchAction: 'manipulation' }}>
                      AJOUTER CE REPAS
                    </button>
                  </div>
                )}
                {!voiceText && !listening && (
                  <div style={{ fontSize: 12, color: '#999' }}>Ex: "200g de riz" ou "un steak 150g"</div>
                )}
              </div>
            )}

            {/* Custom */}
            {addMode === 'custom' && (
              <div>
                {[
                  { label: 'Nom du repas', key: 'name', type: 'text', placeholder: 'Mon repas' },
                  { label: 'Calories (kcal) *', key: 'kcal', type: 'number', placeholder: '400' },
                  { label: 'Proteines (g)', key: 'protein', type: 'number', placeholder: '30' },
                  { label: 'Glucides (g)', key: 'carbs', type: 'number', placeholder: '40' },
                  { label: 'Lipides (g)', key: 'fat', type: 'number', placeholder: '10' },
                ].map(({ label, key, type, placeholder }) => (
                  <div key={key} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>{label}</div>
                    <input value={(customForm as any)[key]} onChange={e => setCustomForm(f => ({ ...f, [key]: e.target.value }))}
                      type={type} placeholder={placeholder}
                      style={{ width: '100%', padding: '12px 14px', background: BG, border: '1px solid ' + BORDER, borderRadius: 10, color: DARK, fontSize: 16, boxSizing: 'border-box' as const, outline: 'none' }} />
                  </div>
                ))}
                <button onClick={() => addEntry({ food_name: customForm.name || 'Repas custom', calories: parseFloat(customForm.kcal) || 0, protein: parseFloat(customForm.protein) || 0, carbs: parseFloat(customForm.carbs) || 0, fat: parseFloat(customForm.fat) || 0 })}
                  disabled={!customForm.kcal || saving}
                  style={{ width: '100%', padding: 16, background: customForm.kcal ? DARK : '#eee', border: 'none', borderRadius: 12, color: customForm.kcal ? ACCENT : '#ccc', fontWeight: 900, fontSize: 14, cursor: customForm.kcal ? 'pointer' : 'not-allowed', touchAction: 'manipulation' as const, marginTop: 8 }}>
                  AJOUTER
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <TutorialTooltip page="fuel" />
      <BottomNav active="fuel" />
    </div>
  );
}
