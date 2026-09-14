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
  { name: 'Poulet grillé (100g)', kcal: 165, protein: 31, carbs: 0, fat: 4 },
  { name: 'Riz blanc cuit (100g)', kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { name: 'Œuf entier', kcal: 78, protein: 6, carbs: 0.6, fat: 5 },
  { name: 'Blanc de dinde (100g)', kcal: 104, protein: 22, carbs: 0, fat: 1.7 },
  { name: "Flocons d'avoine (100g)", kcal: 379, protein: 13, carbs: 68, fat: 6.9 },
  { name: 'Thon en boîte (100g)', kcal: 116, protein: 26, carbs: 0, fat: 1 },
  { name: 'Fromage blanc 0% (100g)', kcal: 57, protein: 10, carbs: 4, fat: 0.2 },
  { name: 'Banane', kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  { name: 'Patate douce (100g)', kcal: 86, protein: 1.6, carbs: 20, fat: 0.1 },
  { name: 'Saumon (100g)', kcal: 208, protein: 20, carbs: 0, fat: 13 },
  { name: 'Lentilles cuites (100g)', kcal: 116, protein: 9, carbs: 20, fat: 0.4 },
  { name: 'Amandes (30g)', kcal: 174, protein: 6, carbs: 5, fat: 15 },
  { name: 'Yaourt grec 0% (100g)', kcal: 57, protein: 10, carbs: 4, fat: 0.4 },
  { name: 'Pain complet (1 tranche)', kcal: 80, protein: 3.5, carbs: 15, fat: 1 },
  { name: 'Whey protéine (30g)', kcal: 115, protein: 24, carbs: 2, fat: 1.5 },
  { name: 'Avocat (100g)', kcal: 160, protein: 2, carbs: 9, fat: 15 },
  { name: 'Quinoa cuit (100g)', kcal: 120, protein: 4.4, carbs: 21, fat: 1.9 },
  { name: 'Brocoli (100g)', kcal: 34, protein: 2.8, carbs: 7, fat: 0.4 },
  { name: 'Fromage (30g)', kcal: 110, protein: 7, carbs: 0.5, fat: 9 },
  { name: 'Pasta cuite (100g)', kcal: 158, protein: 5.5, carbs: 31, fat: 0.9 },
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
  const [custom, setCustom] = useState({ name: '', kcal: '', protein: '', carbs: '', fat: '' });
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [qty, setQty] = useState('1');

  // Photo scan state
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    const [{ data: t }, { data: e }] = await Promise.all([
      supabase.from('nutrition_targets').select('*').eq('user_id', user!.id).maybeSingle(),
      supabase.from('food_entries').select('*').eq('user_id', user!.id)
        .gte('created_at', today + 'T00:00:00').order('created_at'),
    ]);
    if (t) setTargets({ kcal: t.calories || 2200, protein: t.protein || 160, carbs: t.carbs || 220, fat: t.fat || 70 });
    if (e) setEntries(e);
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
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setPhotoBase64(reader.result as string);
      analyzePhoto(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const analyzePhoto = async (base64: string) => {
    setScanning(true);
    setScanError('');
    setScanResult(null);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: 'image/jpeg', data: base64 },
              },
              {
                type: 'text',
                text: `Tu es un nutritionniste expert. Analyse cette photo de repas et identifie tous les aliments visibles.

Estime les quantités de façon réaliste (portion normale d'une personne).

Réponds UNIQUEMENT en JSON valide, sans texte avant ou après :
{
  "description": "Description courte du repas en français",
  "aliments": [
    {
      "nom": "Nom de l'aliment",
      "quantite": "ex: 150g ou 1 portion",
      "kcal": 000,
      "protein": 00,
      "carbs": 00,
      "fat": 00
    }
  ],
  "total": {
    "kcal": 000,
    "protein": 00,
    "carbs": 00,
    "fat": 00
  },
  "fiabilite": "haute / moyenne / faible",
  "note": "Remarque courte si besoin (ex: difficile à estimer les quantités exactes)"
}`,
              },
            ],
          }],
        }),
      });

      const data = await response.json();
      const text = data.content?.[0]?.text || '';
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      setScanResult(parsed);
    } catch (err) {
      setScanError("Impossible d'analyser cette image. Essaie avec une photo plus nette ou saisis manuellement.");
    }
    setScanning(false);
  };

  const addScanResult = async () => {
    if (!scanResult?.total) return;
    const entry = {
      user_id: user!.id,
      meal_type: selectedMeal,
      food_name: scanResult.description || 'Repas scanné',
      calories: Math.round(scanResult.total.kcal),
      protein: Math.round(scanResult.total.protein * 10) / 10,
      carbs: Math.round(scanResult.total.carbs * 10) / 10,
      fat: Math.round(scanResult.total.fat * 10) / 10,
      quantity: 1,
      created_at: new Date().toISOString(),
    };
    await supabase.from('food_entries').insert(entry);
    await loadData();
    closeAdd();
  };

  const addSingleFood = async (food: any) => {
    await supabase.from('food_entries').insert({
      user_id: user!.id,
      meal_type: selectedMeal,
      food_name: food.nom,
      calories: Math.round(food.kcal),
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

  const filtered = COMMON_FOODS.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
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
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 80 }}>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhotoSelect} />

      {/* Header */}
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid ' + BORDER }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em' }}>Nutrition</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>FUEL</div>
          </div>
          <button onClick={() => setShowAdd(true)}
            style={{ background: ACCENT, color: '#000', border: 'none', borderRadius: 12, padding: '10px 18px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
            + AJOUTER
          </button>
        </div>
      </div>

      {/* Calories ring */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ background: SURFACE, borderRadius: 16, border: '1px solid ' + BORDER, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
              <svg width="90" height="90" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="45" cy="45" r="38" fill="none" stroke="#1a1a1a" strokeWidth="8" />
                <circle cx="45" cy="45" r="38" fill="none" stroke={ACCENT} strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 38}`}
                  strokeDashoffset={`${2 * Math.PI * 38 * (1 - pct(totals.kcal, targets.kcal) / 100)}`}
                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset .5s' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#fff' }}>{Math.round(totals.kcal)}</div>
                <div style={{ fontSize: 9, color: '#555' }}>kcal</div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 26, fontWeight: 900, color: ACCENT }}>{Math.round(totals.kcal)}</span>
                <span style={{ fontSize: 13, color: '#333' }}> / {targets.kcal}</span>
              </div>
              <div style={{ fontSize: 12, color: '#555' }}>{Math.max(0, targets.kcal - Math.round(totals.kcal))} kcal restantes</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <MacroBar label="Protéines" val={totals.protein} max={targets.protein} color={ACCENT} />
            <MacroBar label="Glucides" val={totals.carbs} max={targets.carbs} color="#4488ff" />
            <MacroBar label="Lipides" val={totals.fat} max={targets.fat} color="#ff6644" />
          </div>
        </div>
      </div>

      {/* Meals */}
      <div style={{ padding: '16px 20px' }}>
        {mealGroups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#333' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🥗</div>
            <div style={{ fontWeight: 700, color: '#444' }}>Aucun repas enregistré</div>
            <div style={{ fontSize: 13, marginTop: 8, marginBottom: 20 }}>Prends une photo de ton repas ou ajoute manuellement</div>
            <button onClick={() => { setShowAdd(true); setAddMode('photo'); }}
              style={{ padding: '12px 24px', background: ACCENT, border: 'none', borderRadius: 12, color: '#000', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
              📸 SCANNER UN REPAS
            </button>
          </div>
        ) : mealGroups.map(({ meal, items }) => (
          <div key={meal} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>{meal}</div>
            {items.map((item: any) => (
              <div key={item.id} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.food_name}</div>
                  <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>P:{item.protein}g · G:{item.carbs}g · L:{item.fat}g</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: ACCENT }}>{item.calories} kcal</div>
                  <button onClick={() => deleteEntry(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#333', fontSize: 18, lineHeight: 1 }}>×</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ─── ADD MODAL ─── */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: '#0d0d0d', borderRadius: '20px 20px 0 0', padding: 24, maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>

            {/* Header modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 17, fontWeight: 900, color: '#fff' }}>
                {addMode === 'choose' ? 'AJOUTER UN REPAS' : addMode === 'photo' ? '📸 SCAN IA' : addMode === 'search' ? '🔍 RECHERCHER' : '✏️ SAISIE MANUELLE'}
              </div>
              <button onClick={closeAdd} style={{ background: 'none', border: 'none', color: '#555', fontSize: 26, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            {/* Meal selector */}
            {addMode !== 'choose' && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                {MEALS.map(m => (
                  <button key={m} onClick={() => setSelectedMeal(m)}
                    style={{ padding: '6px 12px', borderRadius: 20, border: '1px solid ' + (selectedMeal === m ? ACCENT : BORDER), background: selectedMeal === m ? ACCENT + '22' : 'transparent', color: selectedMeal === m ? ACCENT : '#555', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {m}
                  </button>
                ))}
              </div>
            )}

            {/* ── CHOOSE MODE ── */}
            {addMode === 'choose' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Meal selector */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  {MEALS.map(m => (
                    <button key={m} onClick={() => setSelectedMeal(m)}
                      style={{ padding: '6px 12px', borderRadius: 20, border: '1px solid ' + (selectedMeal === m ? ACCENT : BORDER), background: selectedMeal === m ? ACCENT + '22' : 'transparent', color: selectedMeal === m ? ACCENT : '#555', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      {m}
                    </button>
                  ))}
                </div>

                {/* 📸 Photo scan — CTA principal */}
                <button onClick={() => { setAddMode('photo'); fileRef.current?.click(); }}
                  style={{ padding: '20px', background: 'linear-gradient(135deg, ' + ACCENT + '22 0%, ' + ACCENT + '11 100%)', border: '1.5px solid ' + ACCENT + '66', borderRadius: 16, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ fontSize: 40, flexShrink: 0 }}>📸</div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: ACCENT, marginBottom: 4 }}>SCANNER MON REPAS</div>
                    <div style={{ fontSize: 13, color: '#888', lineHeight: 1.4 }}>Prends une photo — NOX détecte les aliments et calcule les macros automatiquement</div>
                  </div>
                </button>

                <button onClick={() => setAddMode('search')}
                  style={{ padding: '16px 20px', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ fontSize: 28 }}>🔍</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Rechercher un aliment</div>
                    <div style={{ fontSize: 12, color: '#555' }}>Base de 20 aliments courants</div>
                  </div>
                </button>

                <button onClick={() => setAddMode('custom')}
                  style={{ padding: '16px 20px', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ fontSize: 28 }}>✏️</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Saisie manuelle</div>
                    <div style={{ fontSize: 12, color: '#555' }}>Entre les valeurs toi-même</div>
                  </div>
                </button>
              </div>
            )}

            {/* ── PHOTO MODE ── */}
            {addMode === 'photo' && (
              <div>
                {/* Photo preview */}
                {photoBase64 && (
                  <div style={{ marginBottom: 16, borderRadius: 14, overflow: 'hidden', maxHeight: 250, background: '#000' }}>
                    <img src={photoBase64} style={{ width: '100%', height: 250, objectFit: 'cover' }} alt="repas" />
                  </div>
                )}

                {/* Scanning */}
                {scanning && (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', marginBottom: 8 }}>NOX ANALYSE TON REPAS...</div>
                    <div style={{ fontSize: 13, color: '#555' }}>Détection des aliments en cours</div>
                  </div>
                )}

                {/* Error */}
                {scanError && !scanning && (
                  <div style={{ background: '#ff444422', border: '1px solid #ff4444', borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 13, color: '#ff8888' }}>
                    {scanError}
                  </div>
                )}

                {/* Scan result */}
                {scanResult && !scanning && (
                  <div>
                    {/* Description */}
                    <div style={{ background: ACCENT + '11', border: '1px solid ' + ACCENT + '44', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                      <div style={{ fontSize: 11, color: ACCENT, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
                        REPAS DÉTECTÉ · Fiabilité : {scanResult.fiabilite}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{scanResult.description}</div>
                      {scanResult.note && <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>{scanResult.note}</div>}
                    </div>

                    {/* Total macros */}
                    <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: 16, marginBottom: 16 }}>
                      <div style={{ fontSize: 11, color: '#555', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>TOTAL ESTIMÉ</div>
                      <div style={{ display: 'flex', gap: 0, textAlign: 'center' }}>
                        {[
                          { label: 'Calories', val: Math.round(scanResult.total.kcal), unit: 'kcal', color: ACCENT },
                          { label: 'Protéines', val: Math.round(scanResult.total.protein), unit: 'g', color: '#fff' },
                          { label: 'Glucides', val: Math.round(scanResult.total.carbs), unit: 'g', color: '#4488ff' },
                          { label: 'Lipides', val: Math.round(scanResult.total.fat), unit: 'g', color: '#ff6644' },
                        ].map(({ label, val, unit, color }) => (
                          <div key={label} style={{ flex: 1 }}>
                            <div style={{ fontSize: 22, fontWeight: 900, color }}>{val}</div>
                            <div style={{ fontSize: 10, color: '#555' }}>{unit}</div>
                            <div style={{ fontSize: 10, color: '#444', marginTop: 2 }}>{label}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Aliments détectés */}
                    {scanResult.aliments?.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, color: '#555', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>ALIMENTS DÉTECTÉS</div>
                        {scanResult.aliments.map((a: any, i: number) => (
                          <div key={i} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 10, padding: '10px 14px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{a.nom}</div>
                              <div style={{ fontSize: 11, color: '#555' }}>{a.quantite} · P:{a.protein}g G:{a.carbs}g L:{a.fat}g</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ fontSize: 14, fontWeight: 900, color: ACCENT }}>{a.kcal} kcal</div>
                              <button onClick={() => addSingleFood(a)}
                                style={{ background: ACCENT + '22', border: '1px solid ' + ACCENT + '44', borderRadius: 8, padding: '4px 10px', color: ACCENT, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                                + Ajouter
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => { setPhotoBase64(null); setScanResult(null); fileRef.current?.click(); }}
                        style={{ flex: 1, padding: 14, background: 'transparent', border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                        📸 Nouvelle photo
                      </button>
                      <button onClick={addScanResult}
                        style={{ flex: 2, padding: 14, background: ACCENT, border: 'none', borderRadius: 12, color: '#000', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
                        AJOUTER TOUT ({Math.round(scanResult.total.kcal)} kcal)
                      </button>
                    </div>
                  </div>
                )}

                {/* No photo yet — bouton prendre photo */}
                {!photoBase64 && !scanning && !scanResult && (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: 60, marginBottom: 16 }}>📸</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Prends une photo de ton repas</div>
                    <div style={{ fontSize: 13, color: '#555', marginBottom: 24, lineHeight: 1.5 }}>NOX identifie les aliments et calcule les calories + macros automatiquement</div>
                    <button onClick={() => fileRef.current?.click()}
                      style={{ padding: '16px 32px', background: ACCENT, border: 'none', borderRadius: 14, color: '#000', fontWeight: 900, fontSize: 15, cursor: 'pointer', marginBottom: 12, display: 'block', width: '100%' }}>
                      OUVRIR L'APPAREIL PHOTO
                    </button>
                    <button onClick={() => setAddMode('choose')}
                      style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 13 }}>
                      ← Retour
                    </button>
                  </div>
                )}

                {/* Back while scanning or result */}
                {(scanResult || (!photoBase64 && !scanning)) && addMode === 'photo' && !scanResult && (
                  <button onClick={() => setAddMode('choose')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 13, marginTop: 12 }}>← Retour</button>
                )}
              </div>
            )}

            {/* ── SEARCH MODE ── */}
            {addMode === 'search' && !selectedFood && (
              <>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un aliment..."
                  style={{ width: '100%', padding: '12px 16px', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontSize: 14, boxSizing: 'border-box', marginBottom: 12, outline: 'none' }} autoFocus />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filtered.map(f => (
                    <button key={f.name} onClick={() => setSelectedFood(f)}
                      style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '12px 16px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{f.name}</div>
                        <div style={{ fontSize: 11, color: '#555' }}>P:{f.protein}g · G:{f.carbs}g · L:{f.fat}g</div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: ACCENT, flexShrink: 0, marginLeft: 10 }}>{f.kcal} kcal</div>
                    </button>
                  ))}
                </div>
                <button onClick={() => setAddMode('choose')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 13, marginTop: 16 }}>← Retour</button>
              </>
            )}

            {addMode === 'search' && selectedFood && (
              <div>
                <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 12 }}>{selectedFood.name}</div>
                  <div style={{ display: 'flex', gap: 0, textAlign: 'center' }}>
                    {[
                      { label: 'Calories', val: Math.round(selectedFood.kcal * (parseFloat(qty) || 1)), unit: 'kcal', color: ACCENT },
                      { label: 'Protéines', val: Math.round(selectedFood.protein * (parseFloat(qty) || 1) * 10) / 10, unit: 'g', color: '#fff' },
                      { label: 'Glucides', val: Math.round(selectedFood.carbs * (parseFloat(qty) || 1) * 10) / 10, unit: 'g', color: '#4488ff' },
                      { label: 'Lipides', val: Math.round(selectedFood.fat * (parseFloat(qty) || 1) * 10) / 10, unit: 'g', color: '#ff6644' },
                    ].map(({ label, val, unit, color }) => (
                      <div key={label} style={{ flex: 1 }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color }}>{val}</div>
                        <div style={{ fontSize: 10, color: '#555' }}>{unit}</div>
                        <div style={{ fontSize: 10, color: '#444' }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <label style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.05em' }}>Quantité (portions)</label>
                <input value={qty} onChange={e => setQty(e.target.value)} type="number" min="0.1" step="0.1"
                  style={{ width: '100%', padding: '12px 16px', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontSize: 16, boxSizing: 'border-box', margin: '8px 0 16px', outline: 'none' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setSelectedFood(null)} style={{ flex: 1, padding: 14, background: 'transparent', border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>RETOUR</button>
                  <button onClick={() => addEntry(selectedFood)} style={{ flex: 2, padding: 14, background: ACCENT, border: 'none', borderRadius: 12, color: '#000', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>AJOUTER</button>
                </div>
              </div>
            )}

            {/* ── CUSTOM MODE ── */}
            {addMode === 'custom' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { key: 'name', label: "Nom de l'aliment", type: 'text', placeholder: 'ex: Bol de riz au poulet' },
                  { key: 'kcal', label: 'Calories (kcal)', type: 'number', placeholder: '0' },
                  { key: 'protein', label: 'Protéines (g)', type: 'number', placeholder: '0' },
                  { key: 'carbs', label: 'Glucides (g)', type: 'number', placeholder: '0' },
                  { key: 'fat', label: 'Lipides (g)', type: 'number', placeholder: '0' },
                ].map(({ key, label, type, placeholder }) => (
                  <div key={key}>
                    <label style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</label>
                    <input value={(custom as any)[key]} onChange={e => setCustom(p => ({ ...p, [key]: e.target.value }))}
                      type={type} placeholder={placeholder}
                      style={{ width: '100%', padding: '12px 16px', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontSize: 14, boxSizing: 'border-box', marginTop: 6, outline: 'none' }} />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => setAddMode('choose')} style={{ flex: 1, padding: 14, background: 'transparent', border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>RETOUR</button>
                  <button onClick={addCustom} style={{ flex: 2, padding: 14, background: ACCENT, border: 'none', borderRadius: 12, color: '#000', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>AJOUTER</button>
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
