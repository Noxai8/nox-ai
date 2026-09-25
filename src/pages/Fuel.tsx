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
const MEALS  = ['Petit-dejeuner', 'Dejeuner', 'Diner', 'Snacks'];

const FOOD_DB = [
  { name: 'Poulet grille',      kcal: 165, protein: 31,  carbs: 0,  fat: 4   },
  { name: 'Riz blanc cuit',     kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { name: 'Oeuf entier',        kcal: 78,  protein: 6,   carbs: 0.6,fat: 5   },
  { name: 'Blanc de poulet',    kcal: 110, protein: 23,  carbs: 0,  fat: 1.2 },
  { name: 'Saumon',             kcal: 208, protein: 20,  carbs: 0,  fat: 13  },
  { name: 'Thon en boite',      kcal: 116, protein: 26,  carbs: 0,  fat: 1   },
  { name: 'Steak hache 5%',     kcal: 120, protein: 20,  carbs: 0,  fat: 5   },
  { name: 'Fromage blanc 0%',   kcal: 57,  protein: 10,  carbs: 4,  fat: 0.2 },
  { name: 'Yaourt grec',        kcal: 57,  protein: 10,  carbs: 4,  fat: 0.4 },
  { name: 'Flocons avoine',     kcal: 379, protein: 13,  carbs: 68, fat: 6.9 },
  { name: 'Pates cuites',       kcal: 158, protein: 5.5, carbs: 31, fat: 0.9 },
  { name: 'Patate douce',       kcal: 86,  protein: 1.6, carbs: 20, fat: 0.1 },
  { name: 'Quinoa cuit',        kcal: 120, protein: 4.4, carbs: 21, fat: 1.9 },
  { name: 'Avocat',             kcal: 160, protein: 2,   carbs: 9,  fat: 15  },
  { name: 'Amandes',            kcal: 580, protein: 21,  carbs: 22, fat: 50  },
  { name: 'Whey proteine',      kcal: 115, protein: 24,  carbs: 2,  fat: 1.5 },
  { name: 'Brocoli',            kcal: 34,  protein: 2.8, carbs: 7,  fat: 0.4 },
  { name: 'Epinards',           kcal: 23,  protein: 2.9, carbs: 3.6,fat: 0.4 },
  { name: 'Banane',             kcal: 89,  protein: 1.1, carbs: 23, fat: 0.3 },
  { name: 'Pomme',              kcal: 52,  protein: 0.3, carbs: 14, fat: 0.2 },
  { name: 'Pain complet',       kcal: 240, protein: 10,  carbs: 45, fat: 3   },
  { name: 'Lentilles',          kcal: 116, protein: 9,   carbs: 20, fat: 0.4 },
  { name: 'Pois chiches',       kcal: 164, protein: 8.9, carbs: 27, fat: 2.6 },
  { name: 'Lait demi-ecreme',   kcal: 46,  protein: 3.2, carbs: 4.7,fat: 1.6 },
  { name: 'Cottage cheese',     kcal: 90,  protein: 12,  carbs: 3,  fat: 3   },
  { name: 'Beurre cacahuete',   kcal: 628, protein: 27,  carbs: 20, fat: 53  },
  { name: 'Crevettes cuites',   kcal: 99,  protein: 21,  carbs: 0.5,fat: 1   },
  { name: 'Dinde',              kcal: 104, protein: 22,  carbs: 0,  fat: 1.7 },
  { name: 'Skyr',               kcal: 65,  protein: 11,  carbs: 4,  fat: 0.2 },
];

export default function Fuel() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const fileRef    = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const { isPro } = usePlan();
  const [entries,    setEntries]    = useState<any[]>([]);
  const [targets,    setTargets]    = useState({ kcal: 2200, protein: 160, carbs: 220, fat: 70 });
  const [water,      setWater]      = useState(0);
  const [ideas,      setIdeas]      = useState<string | null>(null);
  const [loadIdeas,  setLoadIdeas]  = useState(false);
  const [showAdd,    setShowAdd]    = useState(false);
  const [addMode,    setAddMode]    = useState<'choose'|'photo'|'search'|'barcode'|'quick'|'voice'|'custom'>('choose');
  const [selMeal,    setSelMeal]    = useState('Dejeuner');
  const [search,     setSearch]     = useState('');
  const [selFood,    setSelFood]    = useState<any>(null);
  const [qty,        setQty]        = useState('100');
  const [photoB64,   setPhotoB64]   = useState<string|null>(null);
  const [scanning,   setScanning]   = useState(false);
  const [scanRes,    setScanRes]    = useState<any>(null);
  const [voiceText,  setVoiceText]  = useState('');
  const [listening,  setListening]  = useState(false);
  const [quickKcal,  setQuickKcal]  = useState('');
  const [quickProt,  setQuickProt]  = useState('');
  const [saving,     setSaving]     = useState(false);
  const [customForm, setCustomForm] = useState({ name: '', kcal: '', protein: '', carbs: '', fat: '' });

  useEffect(() => { if (user) load(); }, [user]);

  const todayBounds = () => {
    const d = new Date();
    return {
      start: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).toISOString(),
      end:   new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString(),
    };
  };

  const load = async () => {
    const { start, end } = todayBounds();
    const [{ data: ents }, { data: tgts }, { data: wlog }] = await Promise.all([
      supabase.from('food_entries').select('*').eq('user_id', user!.id).gte('created_at', start).lte('created_at', end).order('created_at'),
      supabase.from('nutrition_targets').select('*').eq('user_id', user!.id).maybeSingle(),
      supabase.from('food_entries').select('water_ml').eq('user_id', user!.id).gte('created_at', start).lte('created_at', end),
    ]);
    setEntries(ents || []);
    if (tgts?.calories) setTargets({ kcal: tgts.calories, protein: tgts.protein || 160, carbs: tgts.carbs || 220, fat: tgts.fat || 70 });
    setWater((wlog || []).reduce((s: number, e: any) => s + (e.water_ml || 0), 0));
  };

  const totals = entries.reduce((s, e) => ({
    kcal:    s.kcal    + (e.calories || 0),
    protein: s.protein + (e.protein  || 0),
    carbs:   s.carbs   + (e.carbs    || 0),
    fat:     s.fat     + (e.fat      || 0),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  const kcalLeft  = Math.max(0, targets.kcal - Math.round(totals.kcal));
  const protLeft  = Math.max(0, targets.protein - Math.round(totals.protein));
  const kcalPct   = Math.min(100, Math.round((totals.kcal / targets.kcal) * 100));

  const closeAdd = () => {
    setShowAdd(false); setAddMode('choose'); setSelFood(null);
    setQty('100'); setSearch(''); setPhotoB64(null); setScanRes(null);
    setQuickKcal(''); setQuickProt(''); setVoiceText('');
    setCustomForm({ name: '', kcal: '', protein: '', carbs: '', fat: '' });
  };

  const addEntry = async (d: { food_name: string; calories: number; protein: number; carbs: number; fat: number }) => {
    setSaving(true);
    await supabase.from('food_entries').insert({ user_id: user!.id, meal_type: selMeal, ...d, created_at: new Date().toISOString() });
    await load(); setSaving(false); closeAdd();
  };

  const deleteEntry = async (id: string) => {
    await supabase.from('food_entries').delete().eq('id', id); await load();
  };

  const addWater = async (ml: number) => {
    await supabase.from('food_entries').insert({ user_id: user!.id, meal_type: 'Eau', food_name: 'Eau', calories: 0, protein: 0, carbs: 0, fat: 0, water_ml: ml, created_at: new Date().toISOString() });
    setWater(w => w + ml);
  };

  const handlePhoto = (file: File) => {
    const reader = new FileReader();
    reader.onload = async e => {
      const b64 = (e.target?.result as string).split(',')[1];
      setPhotoB64(e.target?.result as string); setScanning(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const resp = await fetch(`${FN}/analyze-meal`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` }, body: JSON.stringify({ image: b64 }) });
        const data = await resp.json();
        const text = data?.content?.[0]?.text || data?.data?.content?.[0]?.text || '';
        const m = text.match(/\{[\s\S]*\}/);
        if (m) setScanRes(JSON.parse(m[0]));
      } catch {}
      setScanning(false);
    };
    reader.readAsDataURL(file);
  };

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setVoiceText('Non supporte sur ce navigateur.'); return; }
    const rec = new SR(); rec.lang = 'fr-FR';
    setListening(true);
    rec.onresult = (e: any) => { setVoiceText(e.results[0][0].transcript); setListening(false); };
    rec.onerror = () => setListening(false);
    rec.onend   = () => setListening(false);
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

  const fetchIdeas = async () => {
    setLoadIdeas(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${FN}/generate-program`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ prompt: `Nutritionniste. Il reste ${kcalLeft} kcal et ${protLeft}g proteines. Propose 3 idees de repas simples, sans markdown, une par ligne avec calories entre parentheses.` }),
      });
      const data = await resp.json();
      const text = data?.content?.[0]?.text || data?.data?.content?.[0]?.text || '';
      if (text) setIdeas(text.trim());
    } catch {}
    setLoadIdeas(false);
  };

  const filtered = search.length > 1 ? FOOD_DB.filter(f => f.name.toLowerCase().includes(search.toLowerCase())) : FOOD_DB;

  const card: React.CSSProperties = { background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 24, padding: 20 };

  return (
    <div style={{ minHeight: '100vh', background: BG, color: BLACK, paddingBottom: 110 }}>
      <input ref={fileRef}    type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setAddMode('photo'); handlePhoto(f); } e.target.value = ''; }} />
      <input ref={galleryRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setAddMode('photo'); handlePhoto(f); } e.target.value = ''; }} />

      <div style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>

        {/* HEADER */}
        <header style={{ padding: '22px 20px 0' }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.12em', marginBottom: 6 }}>NUTRITION</div>
          <h1 style={{ margin: '0 0 24px', fontSize: 36, lineHeight: .95, fontWeight: 950, letterSpacing: '-.05em' }}>
            NOURRIS<br />TON OBJECTIF.
          </h1>

          {/* Calories */}
          <div style={{ ...card, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 48, fontWeight: 950, lineHeight: 1, letterSpacing: '-.04em', color: BLACK }}>{Math.round(totals.kcal)}</div>
                <div style={{ fontSize: 14, color: MUTED, marginTop: 4 }}>/ {targets.kcal} kcal</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 28, fontWeight: 950, color: BLACK }}>{kcalLeft}</div>
                <div style={{ fontSize: 11, color: MUTED }}>restantes</div>
              </div>
            </div>
            <div style={{ height: 8, background: BG, borderRadius: 99, overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ height: '100%', width: `${kcalPct}%`, background: kcalPct >= 100 ? '#FF5C5C' : ACCENT, borderRadius: 99, transition: 'width .4s' }} />
            </div>
            {/* Macros */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { label: 'PROTEINES', v: Math.round(totals.protein), t: targets.protein, color: '#4488FF' },
                { label: 'GLUCIDES',  v: Math.round(totals.carbs),   t: targets.carbs,   color: '#FFAA00' },
                { label: 'LIPIDES',   v: Math.round(totals.fat),     t: targets.fat,     color: '#FF6B6B' },
              ].map(({ label, v, t, color }) => (
                <div key={label}>
                  <div style={{ fontSize: 16, fontWeight: 950, color: BLACK }}>{v}<span style={{ fontSize: 10, color: MUTED }}>/{t}g</span></div>
                  <div style={{ height: 4, background: BG, borderRadius: 99, overflow: 'hidden', margin: '6px 0 4px' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, v/t*100)}%`, background: color, borderRadius: 99 }} />
                  </div>
                  <div style={{ fontSize: 9, color: MUTED, fontWeight: 700 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </header>

        <main style={{ padding: '0 20px' }}>

          {/* CE QU'IL TE FAUT MAINTENANT */}
          {kcalLeft > 100 && (
            <div style={{ background: LIME, border: '1px solid #DDF59C', borderRadius: 24, padding: 20, marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: '#687600', letterSpacing: '.1em', marginBottom: 8 }}>CE QU'IL TE FAUT MAINTENANT</div>
              <div style={{ fontSize: 18, fontWeight: 950, color: BLACK, marginBottom: 6 }}>
                {totals.protein < targets.protein * 0.7 ? 'Priorite : proteines' : 'Continue sur ta lancee.'}
              </div>
              <div style={{ fontSize: 13, color: '#69715F', lineHeight: 1.5, marginBottom: 14 }}>
                Il te reste environ {kcalLeft} kcal et {protLeft}g de proteines a completer.
              </div>
              <button onClick={() => isPro ? fetchIdeas() : navigate('/subscribe')} disabled={loadIdeas} style={{
                padding: '10px 16px', background: BLACK, border: 0, borderRadius: 14,
                color: ACCENT, fontSize: 11, fontWeight: 900, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {!isPro && <span style={{ background: ACCENT, color: BLACK, borderRadius: 6, padding: '1px 5px', fontSize: 8, fontWeight: 900 }}>PRO</span>}
                {loadIdeas ? 'NOX reflechit...' : 'VOIR DES IDEES DE REPAS'}
              </button>
              {ideas && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #DDF59C' }}>
                  {ideas.split('\n').filter(l => l.trim()).map((line, i) => (
                    <div key={i} style={{ fontSize: 13, color: '#444', padding: '8px 0', borderBottom: i < ideas.split('\n').filter(l=>l.trim()).length - 1 ? '1px solid #DDF59C' : 'none', lineHeight: 1.5 }}>{line}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* BOUTON AJOUTER */}
          <button onClick={() => setShowAdd(true)} style={{
            width: '100%', padding: '16px 20px', background: BLACK, border: 0,
            borderRadius: 18, color: ACCENT, fontWeight: 900, fontSize: 14,
            cursor: 'pointer', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxSizing: 'border-box',
          }}>
            <span>AJOUTER UN REPAS</span>
            <Plus size={20} strokeWidth={3} />
          </button>

          {/* JOURNAL PAR REPAS */}
          {MEALS.map(meal => {
            const mealEntries = entries.filter(e => e.meal_type === meal);
            const mealKcal    = mealEntries.reduce((s, e) => s + (e.calories || 0), 0);
            return (
              <div key={meal} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.08em' }}>{meal.toUpperCase()}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {mealKcal > 0 && <span style={{ fontSize: 12, color: MUTED }}>{Math.round(mealKcal)} kcal</span>}
                    <button onClick={() => { setSelMeal(meal); setShowAdd(true); setAddMode('choose'); }}
                      style={{ width: 28, height: 28, borderRadius: '50%', background: BLACK, border: 0, color: ACCENT, fontSize: 18, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>+</button>
                  </div>
                </div>
                {mealEntries.length === 0 ? (
                  <button onClick={() => { setSelMeal(meal); setShowAdd(true); setAddMode('choose'); }}
                    style={{ width: '100%', padding: '14px 16px', background: WHITE, border: `1px dashed ${BORDER}`, borderRadius: 16, color: MUTED, fontSize: 13, cursor: 'pointer', textAlign: 'left', boxSizing: 'border-box' }}>
                    Ajouter un aliment
                  </button>
                ) : (
                  <div style={{ background: WHITE, borderRadius: 16, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
                    {mealEntries.map((e, i) => (
                      <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: i < mealEntries.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: BLACK }}>{e.food_name}</div>
                          <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{Math.round(e.calories)} kcal{e.protein > 0 ? ` · ${Math.round(e.protein)}g prot.` : ''}</div>
                        </div>
                        <button onClick={() => deleteEntry(e.id)} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 18, padding: '4px 8px' }}>x</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* EAU */}
          <div style={{ ...card, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.1em', marginBottom: 4 }}>HYDRATATION</div>
                <div style={{ fontSize: 24, fontWeight: 950, color: '#4488FF' }}>{(water / 1000).toFixed(1)}L</div>
                <div style={{ fontSize: 12, color: MUTED }}>objectif 2.5L</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 950, color: BLACK }}>{Math.max(0, 2500 - water)}ml</div>
                <div style={{ fontSize: 11, color: MUTED }}>restants</div>
              </div>
            </div>
            <div style={{ height: 6, background: BG, borderRadius: 99, overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ height: '100%', width: `${Math.min(100, water/25)}%`, background: '#4488FF', borderRadius: 99 }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[150, 250, 330, 500].map(ml => (
                <button key={ml} onClick={() => addWater(ml)} style={{
                  flex: 1, padding: '12px 0', background: BG, border: `1px solid ${BORDER}`,
                  borderRadius: 12, color: BLACK, fontSize: 12, fontWeight: 800, cursor: 'pointer',
                }}>+{ml}ml</button>
              ))}
            </div>
          </div>

          {/* LIENS */}
          {[
            { label: 'Mes recettes',      path: '/recipes',      sub: 'Recettes personnalisees' },
            { label: 'Planifier la semaine', path: '/meal-planner', sub: 'Plan sur 7 jours' },
            { label: 'Liste de courses',  path: '/quick-groceries', sub: 'Generee par IA' },
            { label: 'Jeune intermittent', path: '/fasting',     sub: 'Timers et protocoles' },
          ].map(({ label, path, sub }) => (
            <button key={label} onClick={() => navigate(path)} style={{
              width: '100%', background: WHITE, border: `1px solid ${BORDER}`,
              borderRadius: 18, padding: '16px 20px', textAlign: 'left', cursor: 'pointer',
              marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: BLACK }}>{label}</div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>{sub}</div>
              </div>
              <ChevronRight size={18} color={MUTED} />
            </button>
          ))}
        </main>
      </div>

      {/* MODAL AJOUTER */}
      {showAdd && (
        <div onClick={closeAdd} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, background: WHITE, borderRadius: '28px 28px 0 0', padding: '10px 20px max(32px, env(safe-area-inset-bottom))', boxSizing: 'border-box', maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ width: 40, height: 5, borderRadius: 99, background: '#D8DAD3', margin: '2px auto 20px' }} />

            {/* Header modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                {addMode !== 'choose' && (
                  <button onClick={() => { setAddMode('choose'); setSelFood(null); setPhotoB64(null); setScanRes(null); }}
                    style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 13, padding: 0, display: 'block', marginBottom: 4 }}>
                    Retour
                  </button>
                )}
                <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.1em' }}>
                  {addMode === 'choose' ? 'AJOUTER A ' + selMeal.toUpperCase() : addMode === 'photo' ? 'SCANNER' : addMode === 'search' ? 'RECHERCHER' : addMode === 'barcode' ? 'CODE-BARRES' : addMode === 'quick' ? 'AJOUT RAPIDE' : addMode === 'voice' ? 'VOCAL' : 'SAISIE MANUELLE'}
                </div>
                {addMode === 'choose' && (
                  <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: '-.03em', color: BLACK, marginTop: 2 }}>Que veux-tu ajouter ?</div>
                )}
              </div>
              <button onClick={closeAdd} style={{ width: 40, height: 40, borderRadius: 12, border: `1px solid ${BORDER}`, background: BG, color: BLACK, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* Selecteur repas */}
            {addMode === 'choose' && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto' }}>
                {MEALS.map(m => (
                  <button key={m} onClick={() => setSelMeal(m)} style={{
                    flexShrink: 0, padding: '8px 16px', borderRadius: 20,
                    border: `1px solid ${selMeal === m ? BLACK : BORDER}`,
                    background: selMeal === m ? BLACK : 'transparent',
                    color: selMeal === m ? ACCENT : MUTED,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}>{m}</button>
                ))}
              </div>
            )}

            {/* MENU PRINCIPAL */}
            {addMode === 'choose' && (
              <div style={{ display: 'grid', gap: 10 }}>
                {/* Scanner photo — Pro */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button onClick={() => isPro ? fileRef.current?.click() : navigate('/subscribe')} style={{ padding: '18px 14px', background: BLACK, borderRadius: 18, border: 0, cursor: 'pointer', textAlign: 'left', position: 'relative' }}>
                    <Camera size={22} color={ACCENT} style={{ marginBottom: 10 }} />
                    <div style={{ fontSize: 14, fontWeight: 900, color: WHITE }}>Photo</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>IA analyse le repas</div>
                    {!isPro && <div style={{ position: 'absolute', top: 8, right: 8, background: ACCENT, borderRadius: 8, padding: '2px 6px', fontSize: 8, fontWeight: 900, color: BLACK }}>PRO</div>}
                  </button>
                  <button onClick={() => isPro ? galleryRef.current?.click() : navigate('/subscribe')} style={{ padding: '18px 14px', background: BG, borderRadius: 18, border: `1px solid ${BORDER}`, cursor: 'pointer', textAlign: 'left', position: 'relative' }}>
                    <Camera size={22} color={BLACK} style={{ marginBottom: 10 }} />
                    <div style={{ fontSize: 14, fontWeight: 900, color: BLACK }}>Galerie</div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>Photo existante</div>
                    {!isPro && <div style={{ position: 'absolute', top: 8, right: 8, background: '#E8EAE4', borderRadius: 8, padding: '2px 6px', fontSize: 8, fontWeight: 900, color: MUTED }}>PRO</div>}
                  </button>
                </div>
                {/* Autres modes */}
                {[
                  { label: 'Rechercher',     sub: 'Base de 30 aliments',    mode: 'search'  as const },
                  { label: 'Code-barres',    sub: 'Scanner un produit',      mode: 'barcode' as const },
                  { label: 'Ajout rapide',   sub: 'Calories + proteines',    mode: 'quick'   as const },
                  { label: 'Vocal',          sub: '"200g de poulet..."',      mode: 'voice'   as const },
                  { label: 'Manuel',         sub: 'Entrer les valeurs',       mode: 'custom'  as const },
                ].map(({ label, sub, mode }) => (
                  <button key={mode} onClick={() => setAddMode(mode)} style={{
                    padding: '14px 16px', background: BG, border: `1px solid ${BORDER}`,
                    borderRadius: 16, cursor: 'pointer', textAlign: 'left',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: BLACK }}>{label}</div>
                      <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{sub}</div>
                    </div>
                    <ChevronRight size={16} color={MUTED} />
                  </button>
                ))}
              </div>
            )}

            {/* PHOTO */}
            {addMode === 'photo' && (
              <div>
                {photoB64 && <img src={photoB64} style={{ width: '100%', borderRadius: 16, objectFit: 'cover', maxHeight: 220, marginBottom: 14 }} alt="" />}
                {scanning && <div style={{ textAlign: 'center', padding: '20px 0', color: MUTED, fontSize: 14 }}>NOX analyse ton repas...</div>}
                {!photoB64 && !scanning && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button onClick={() => fileRef.current?.click()} style={{ padding: '20px', background: BG, border: `2px dashed ${BORDER}`, borderRadius: 16, color: MUTED, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Prendre une photo</button>
                    <button onClick={() => galleryRef.current?.click()} style={{ padding: '20px', background: BG, border: `1px solid ${BORDER}`, borderRadius: 16, color: MUTED, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Choisir une photo</button>
                  </div>
                )}
                {scanRes && !scanning && (
                  <div>
                    <div style={{ background: BG, borderRadius: 16, padding: 16, marginBottom: 14 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: BLACK, marginBottom: 12 }}>{scanRes.description || 'Repas detecte'}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                        {[
                          ['Kcal', Math.round(scanRes.total?.kcal || scanRes.total?.calories || 0)],
                          ['Prot', Math.round(scanRes.total?.protein || scanRes.total?.proteines || 0) + 'g'],
                          ['Gluc', Math.round(scanRes.total?.carbs  || scanRes.total?.glucides  || 0) + 'g'],
                          ['Lip',  Math.round(scanRes.total?.fat    || scanRes.total?.lipides    || 0) + 'g'],
                        ].map(([l, v]) => (
                          <div key={l as string} style={{ textAlign: 'center', background: WHITE, borderRadius: 10, padding: '10px 0' }}>
                            <div style={{ fontSize: 18, fontWeight: 950, color: BLACK }}>{v}</div>
                            <div style={{ fontSize: 9, color: MUTED }}>{l}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 12, fontSize: 13, color: '#69715F', fontStyle: 'italic' }}>
                        {scanRes.interpretation || (totals.protein < targets.protein * 0.7 ? 'Ce repas peut aider a couvrir tes proteines.' : 'Bien adapte a ta journee.')}
                      </div>
                    </div>
                    <button onClick={() => addEntry({ food_name: scanRes.description || 'Repas scanne', calories: scanRes.total?.kcal || scanRes.total?.calories || 0, protein: scanRes.total?.protein || scanRes.total?.proteines || 0, carbs: scanRes.total?.carbs || scanRes.total?.glucides || 0, fat: scanRes.total?.fat || scanRes.total?.lipides || 0 })} disabled={saving}
                      style={{ width: '100%', padding: 16, background: BLACK, border: 0, borderRadius: 16, color: ACCENT, fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
                      AJOUTER CE REPAS
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* RECHERCHE */}
            {addMode === 'search' && !selFood && (
              <div>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chercher un aliment..." autoFocus
                  style={{ width: '100%', padding: '14px 16px', background: BG, border: `1px solid ${BORDER}`, borderRadius: 14, color: BLACK, fontSize: 15, marginBottom: 14, boxSizing: 'border-box', outline: 'none' }} />
                <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                  {filtered.map(f => (
                    <button key={f.name} onClick={() => { setSelFood(f); setQty('100'); }} style={{ width: '100%', padding: '13px 4px', background: 'none', border: 'none', borderBottom: `1px solid ${BORDER}`, cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: BLACK }}>{f.name}</div>
                      <div style={{ fontSize: 11, color: MUTED }}>{f.kcal} kcal · {f.protein}g prot. / 100g</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* DETAIL ALIMENT */}
            {addMode === 'search' && selFood && (
              <div>
                <div style={{ background: BG, borderRadius: 16, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: BLACK, marginBottom: 4 }}>{selFood.name}</div>
                  <div style={{ fontSize: 12, color: MUTED }}>{selFood.kcal} kcal · {selFood.protein}g prot. / 100g</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>Quantite (g)</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    {[50,100,150,200,250,300].map(g => (
                      <button key={g} onClick={() => setQty(String(g))} style={{ padding: '8px 14px', borderRadius: 20, border: `1px solid ${qty === String(g) ? BLACK : BORDER}`, background: qty === String(g) ? BLACK : 'transparent', color: qty === String(g) ? ACCENT : MUTED, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{g}g</button>
                    ))}
                  </div>
                  <input value={qty} onChange={e => setQty(e.target.value)} type="number"
                    style={{ width: '100%', padding: '14px', background: BG, border: `1px solid ${BORDER}`, borderRadius: 14, color: BLACK, fontSize: 28, fontWeight: 950, textAlign: 'center', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                {(() => {
                  const r = parseFloat(qty) / 100;
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
                      {[['Kcal', Math.round(selFood.kcal*r)], ['Prot', Math.round(selFood.protein*r)+'g'], ['Gluc', Math.round(selFood.carbs*r)+'g'], ['Lip', Math.round(selFood.fat*r)+'g']].map(([l,v]) => (
                        <div key={l as string} style={{ textAlign: 'center', background: BG, borderRadius: 10, padding: '10px 0' }}>
                          <div style={{ fontSize: 18, fontWeight: 950, color: BLACK }}>{v}</div>
                          <div style={{ fontSize: 9, color: MUTED }}>{l}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <button onClick={() => { const r = parseFloat(qty)/100; addEntry({ food_name: `${selFood.name} (${qty}g)`, calories: Math.round(selFood.kcal*r), protein: Math.round(selFood.protein*r*10)/10, carbs: Math.round(selFood.carbs*r*10)/10, fat: Math.round(selFood.fat*r*10)/10 }); }} disabled={saving}
                  style={{ width: '100%', padding: 16, background: BLACK, border: 0, borderRadius: 16, color: ACCENT, fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
                  AJOUTER A {selMeal.toUpperCase()}
                </button>
              </div>
            )}

            {/* CODE-BARRES */}
            {addMode === 'barcode' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <ScanLine size={48} color={BLACK} style={{ marginBottom: 16 }} />
                <div style={{ fontSize: 18, fontWeight: 950, color: BLACK, marginBottom: 8 }}>Scanner un code-barres</div>
                <div style={{ fontSize: 13, color: MUTED, marginBottom: 24 }}>Scanne l'emballage du produit</div>
                <button onClick={() => { closeAdd(); navigate('/barcode-scanner'); }} style={{ width: '100%', padding: 16, background: BLACK, border: 0, borderRadius: 16, color: ACCENT, fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
                  OUVRIR LE SCANNER
                </button>
              </div>
            )}

            {/* AJOUT RAPIDE */}
            {addMode === 'quick' && (
              <div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>Calories *</div>
                  <input value={quickKcal} onChange={e => setQuickKcal(e.target.value)} type="number" placeholder="500" autoFocus
                    style={{ width: '100%', padding: '16px', background: BG, border: `1px solid ${BORDER}`, borderRadius: 14, color: BLACK, fontSize: 36, fontWeight: 950, textAlign: 'center', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>Proteines (g) — optionnel</div>
                  <input value={quickProt} onChange={e => setQuickProt(e.target.value)} type="number" placeholder="30"
                    style={{ width: '100%', padding: '14px', background: BG, border: `1px solid ${BORDER}`, borderRadius: 14, color: BLACK, fontSize: 24, fontWeight: 900, textAlign: 'center', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <button onClick={() => addEntry({ food_name: 'Ajout rapide', calories: parseInt(quickKcal)||0, protein: parseFloat(quickProt)||0, carbs: 0, fat: 0 })} disabled={!quickKcal || saving}
                  style={{ width: '100%', padding: 16, background: quickKcal ? BLACK : '#E8EAE4', border: 0, borderRadius: 16, color: quickKcal ? ACCENT : MUTED, fontWeight: 900, fontSize: 14, cursor: quickKcal ? 'pointer' : 'not-allowed' }}>
                  AJOUTER {quickKcal ? quickKcal + ' KCAL' : ''}
                </button>
              </div>
            )}

            {/* VOCAL */}
            {addMode === 'voice' && (
              <div style={{ textAlign: 'center' }}>
                <button onClick={startVoice} disabled={listening} style={{ width: 90, height: 90, borderRadius: '50%', background: listening ? '#FF5C5C' : BLACK, border: 0, fontSize: 32, cursor: 'pointer', margin: '10px auto 16px', display: 'grid', placeItems: 'center' }}>
                  {listening ? '⏹' : '🎤'}
                </button>
                {listening && <div style={{ color: '#FF5C5C', fontSize: 13, marginBottom: 12 }}>Ecoute...</div>}
                {voiceText && !listening && (
                  <div>
                    <div style={{ background: BG, borderRadius: 14, padding: 14, marginBottom: 14, fontSize: 15, color: BLACK }}>"{voiceText}"</div>
                    <button onClick={addVoiceEntry} style={{ width: '100%', padding: 14, background: BLACK, border: 0, borderRadius: 14, color: ACCENT, fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>AJOUTER CE REPAS</button>
                  </div>
                )}
                {!voiceText && !listening && <div style={{ fontSize: 13, color: MUTED }}>Ex: "200g de riz" ou "un steak 150g"</div>}
              </div>
            )}

            {/* MANUEL */}
            {addMode === 'custom' && (
              <div>
                {[
                  { label: 'Nom du repas', key: 'name',    type: 'text',   placeholder: 'Mon repas' },
                  { label: 'Calories *',   key: 'kcal',    type: 'number', placeholder: '400' },
                  { label: 'Proteines (g)',key: 'protein',  type: 'number', placeholder: '30' },
                  { label: 'Glucides (g)', key: 'carbs',   type: 'number', placeholder: '40' },
                  { label: 'Lipides (g)',  key: 'fat',     type: 'number', placeholder: '10' },
                ].map(({ label, key, type, placeholder }) => (
                  <div key={key} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>{label}</div>
                    <input value={(customForm as any)[key]} onChange={e => setCustomForm(f => ({ ...f, [key]: e.target.value }))} type={type} placeholder={placeholder}
                      style={{ width: '100%', padding: '13px 14px', background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, color: BLACK, fontSize: 16, boxSizing: 'border-box', outline: 'none' }} />
                  </div>
                ))}
                <button onClick={() => addEntry({ food_name: customForm.name || 'Repas', calories: parseFloat(customForm.kcal)||0, protein: parseFloat(customForm.protein)||0, carbs: parseFloat(customForm.carbs)||0, fat: parseFloat(customForm.fat)||0 })} disabled={!customForm.kcal || saving}
                  style={{ width: '100%', padding: 16, background: customForm.kcal ? BLACK : '#E8EAE4', border: 0, borderRadius: 16, color: customForm.kcal ? ACCENT : MUTED, fontWeight: 900, fontSize: 14, cursor: customForm.kcal ? 'pointer' : 'not-allowed', marginTop: 8 }}>
                  AJOUTER
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav active="nutrition" />
    </div>
  );
}
