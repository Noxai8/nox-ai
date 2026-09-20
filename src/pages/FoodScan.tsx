import { useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const ACCENT = '#c8ff00';
const BG = '#F6F7F2';
const SURFACE = '#FFFFFF';
const BORDER = '#E8E8E3';
const MEALS = ['Petit-déjeuner', 'Déjeuner', 'Dîner', 'Snacks'];

export default function FoodScan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const defaultMeal = (location.state as any)?.meal || 'Déjeuner';
  const [selectedMeal, setSelectedMeal] = useState(defaultMeal);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const max = 800;
      let { width, height } = img;
      if (width > max || height > max) {
        if (width > height) { height = Math.round(height * max / width); width = max; }
        else { width = Math.round(width * max / height); height = max; }
      }
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      setPhotoBase64(dataUrl);
      analyze(dataUrl.split(',')[1]);
      URL.revokeObjectURL(url);
    };
    img.src = url;
    e.target.value = '';
  };

  const analyze = async (base64: string) => {
    setScanning(true); setError(''); setResult(null);
    try {
      const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpweHJzbW5wY3l6YWZhd2x3ZXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNTI1MDAsImV4cCI6MjEwNDkyODUwMH0.h76-uAn6f4qwtxIOTUt3sSzMdOSg7BzMIRFkXZW6iq4';
      const resp = await fetch('https://zpxrsmnpcyzafawlweyl.supabase.co/functions/v1/analyze-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON}`, 'apikey': ANON },
        body: JSON.stringify({ base64, mime: 'image/jpeg' }),
      });
      if (!resp.ok) throw new Error('Erreur serveur');
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e: any) { setError(e.message || 'Analyse impossible'); }
    setScanning(false);
  };

  const addAll = async () => {
    if (!result || adding) return;
    setAdding(true);
    const kcal = result.total?.kcal ?? result.total?.calories ?? 0;
    const { error: err } = await supabase.from('food_entries').insert({
      user_id: user!.id, meal_type: selectedMeal,
      food_name: result.description || 'Repas scanné',
      calories: Math.round(kcal),
      protein: Math.round((result.total?.protein ?? 0) * 10) / 10,
      carbs: Math.round((result.total?.carbs ?? 0) * 10) / 10,
      fat: Math.round((result.total?.fat ?? 0) * 10) / 10,
      created_at: new Date().toISOString(),
    });
    if (!err) { setAdded(true); setTimeout(() => navigate('/fuel'), 1200); }
    else alert('Erreur: ' + err.message);
    setAdding(false);
  };

  const addSingle = async (item: any) => {
    await supabase.from('food_entries').insert({
      user_id: user!.id, meal_type: selectedMeal,
      food_name: item.nom || item.name || 'Aliment',
      calories: Math.round(item.kcal || item.calories || 0),
      protein: Math.round((item.protein || 0) * 10) / 10,
      carbs: Math.round((item.carbs || 0) * 10) / 10,
      fat: Math.round((item.fat || 0) * 10) / 10,
      created_at: new Date().toISOString(),
    });
    setAdded(true); setTimeout(() => navigate('/fuel'), 1000);
  };

  if (added) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ fontSize: 64 }}>✅</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: ACCENT }}>Ajouté au journal !</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column' }}>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} />

      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid ' + BORDER, flexShrink: 0 }}>
        <button onClick={() => navigate('/fuel')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 22, marginBottom: 12, display: 'block' }}>←</button>
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em' }}>Fuel</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#111' }}>📸 SCANNER UN REPAS</div>
      </div>

      <div style={{ padding: '12px 20px', borderBottom: '1px solid ' + BORDER, display: 'flex', gap: 8, flexShrink: 0, overflowX: 'auto' }}>
        {MEALS.map(m => (
          <button key={m} onClick={() => setSelectedMeal(m)}
            style={{ padding: '7px 14px', borderRadius: 20, border: '1px solid ' + (selectedMeal === m ? ACCENT : BORDER), background: selectedMeal === m ? ACCENT + '22' : 'transparent', color: selectedMeal === m ? ACCENT : '#555', fontSize: 12, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation', flexShrink: 0 }}>
            {m}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 0' }}>
        {photoBase64 && <img src={photoBase64} style={{ width: '100%', borderRadius: 16, marginBottom: 16, maxHeight: 240, objectFit: 'cover' }} alt="" />}

        {scanning && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#111', marginBottom: 8 }}>Analyse en cours...</div>
            <div style={{ fontSize: 13, color: '#555' }}>NOX identifie les aliments</div>
          </div>
        )}

        {error && !scanning && (
          <div style={{ background: '#ff444422', border: '1px solid #ff4444', borderRadius: 14, padding: 16, marginBottom: 16, fontSize: 13, color: '#ff8888', textAlign: 'center' }}>{error}</div>
        )}

        {result && !scanning && (
          <div>
            <div style={{ background: ACCENT + '11', border: '1px solid ' + ACCENT + '33', borderRadius: 14, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: ACCENT, fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>REPAS DÉTECTÉ · {result.fiabilite || 'moyenne'}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#111' }}>{result.description}</div>
              {result.note && <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>{result.note}</div>}
            </div>

            <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#555', fontWeight: 800, textTransform: 'uppercase', marginBottom: 12 }}>TOTAL</div>
              <div style={{ display: 'flex', textAlign: 'center' }}>
                {[
                  { label: 'Calories', val: Math.round(result.total?.kcal ?? 0), color: ACCENT },
                  { label: 'Protéines', val: Math.round(result.total?.protein ?? 0) + 'g', color: '#111' },
                  { label: 'Glucides', val: Math.round(result.total?.carbs ?? 0) + 'g', color: '#8da0ff' },
                  { label: 'Lipides', val: Math.round(result.total?.fat ?? 0) + 'g', color: '#ff806b' },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ flex: 1 }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color }}>{val}</div>
                    <div style={{ fontSize: 10, color: '#555', marginTop: 3 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {result.aliments?.map((a: any, i: number) => (
              <div key={i} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '12px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{a.nom}</div>
                  <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{a.quantite} · P:{a.protein}g G:{a.carbs}g L:{a.fat}g</div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: ACCENT }}>{a.kcal} kcal</div>
                  <button onTouchEnd={e => { e.preventDefault(); addSingle(a); }} onClick={() => addSingle(a)}
                    style={{ padding: '10px 14px', background: ACCENT + '22', border: '1px solid ' + ACCENT + '44', borderRadius: 10, color: ACCENT, fontSize: 14, fontWeight: 900, cursor: 'pointer', touchAction: 'manipulation', minWidth: 44, minHeight: 44 }}>+</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!photoBase64 && !scanning && !result && (
          <div style={{ textAlign: 'center', paddingTop: 40 }}>
            <div style={{ fontSize: 72, marginBottom: 20 }}>📸</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#111', marginBottom: 8 }}>Prends une photo de ton repas</div>
            <div style={{ fontSize: 14, color: '#555', marginBottom: 32, lineHeight: 1.5 }}>NOX identifie les aliments et calcule les macros</div>
          </div>
        )}
      </div>

      {/* BOUTONS FIXES EN BAS */}
      <div style={{ flexShrink: 0, padding: '12px 20px', paddingBottom: 'max(24px, env(safe-area-inset-bottom))', background: BG, borderTop: result ? '1px solid #1a1a1a' : 'none' }}>
        {result && !scanning ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onTouchEnd={e => { e.preventDefault(); addAll(); }} onClick={addAll} disabled={adding}
              style={{ width: '100%', padding: 20, background: ACCENT, border: 'none', borderRadius: 16, color: '#000', fontWeight: 900, fontSize: 18, cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
              {adding ? 'Ajout...' : `✓ AJOUTER TOUT · ${Math.round(result.total?.kcal ?? 0)} KCAL`}
            </button>
            <button onTouchEnd={e => { e.preventDefault(); setPhotoBase64(null); setResult(null); setError(''); fileRef.current?.click(); }}
              onClick={() => { setPhotoBase64(null); setResult(null); setError(''); fileRef.current?.click(); }}
              style={{ width: '100%', padding: 14, background: 'transparent', border: '1px solid ' + BORDER, borderRadius: 14, color: '#888', fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>
              Nouvelle photo
            </button>
          </div>
        ) : !scanning && (
          <button onTouchEnd={e => { e.preventDefault(); fileRef.current?.click(); }} onClick={() => fileRef.current?.click()}
            style={{ width: '100%', padding: 20, background: ACCENT, border: 'none', borderRadius: 16, color: '#000', fontWeight: 900, fontSize: 17, cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
            📸 OUVRIR L'APPAREIL PHOTO
          </button>
        )}
      </div>
    </div>
  );
}
