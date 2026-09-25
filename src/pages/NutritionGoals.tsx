import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { ArrowLeft } from 'lucide-react';

const BG     = '#F7F8F4';
const WHITE  = '#FFFFFF';
const BLACK  = '#0B0B0B';
const MUTED  = '#7A7F76';
const BORDER = '#E8EAE4';
const ACCENT = '#C8FF00';

export default function NutritionGoals() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [calories, setCalories] = useState('2200');
  const [protein,  setProtein]  = useState('160');
  const [carbs,    setCarbs]    = useState('240');
  const [fat,      setFat]      = useState('80');
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('nutrition_targets')
      .select('calories, protein, carbs, fat')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        if (data.calories) setCalories(String(data.calories));
        if (data.protein)  setProtein(String(data.protein));
        if (data.carbs)    setCarbs(String(data.carbs));
        if (data.fat)      setFat(String(data.fat));
      });
  }, [user]);

  const saveTargets = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('nutrition_targets').upsert(
      { user_id: user.id, calories: Number(calories), protein: Number(protein), carbs: Number(carbs), fat: Number(fat) },
      { onConflict: 'user_id' }
    );
    setSaving(false);
    if (error) { console.error(error); return; }
    setSaved(true);
    setTimeout(() => navigate('/fuel'), 800);
  };

  const valid = Number(calories) > 0 && Number(protein) > 0;

  const Field = ({ label, value, setValue, unit, hint }: {
    label: string; value: string; setValue: (v: string) => void;
    unit: string; hint?: string;
  }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: BLACK }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: MUTED }}>{hint}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden' }}>
        <input
          type="number"
          value={value}
          onChange={e => setValue(e.target.value)}
          inputMode="numeric"
          style={{
            flex: 1, padding: '16px 18px', border: 'none', outline: 'none',
            fontSize: 24, fontWeight: 950, color: BLACK, background: 'transparent',
          }}
        />
        <div style={{ padding: '0 18px', fontSize: 14, color: MUTED, fontWeight: 700 }}>{unit}</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, color: BLACK }}>
      <div style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>

        <header style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <button onClick={() => navigate(-1)} style={{
            width: 40, height: 40, borderRadius: 14, border: `1px solid ${BORDER}`,
            background: WHITE, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0,
          }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.12em' }}>NUTRITION</div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 950, letterSpacing: '-.04em' }}>Ton cap nutritionnel</h1>
          </div>
        </header>

        <main style={{ padding: '0 20px 40px' }}>
          <p style={{ margin: '0 0 28px', fontSize: 14, color: MUTED, lineHeight: 1.6 }}>
            Ajuste tes objectifs. NOX utilisera ces données pour interpréter ta journée et adapter ses recommandations.
          </p>

          <Field label="Calories"  value={calories} setValue={setCalories} unit="kcal" hint="objectif journalier" />
          <Field label="Protéines" value={protein}  setValue={setProtein}  unit="g"    hint="priorité transformation" />
          <Field label="Glucides"  value={carbs}    setValue={setCarbs}    unit="g" />
          <Field label="Lipides"   value={fat}      setValue={setFat}      unit="g" />

          <div style={{ background: '#F0FFD0', border: '1px solid #DDF59C', borderRadius: 16, padding: '12px 16px', marginBottom: 28, fontSize: 12, color: '#456000', lineHeight: 1.6 }}>
            Ces valeurs sont des estimations de départ. NOX les utilise comme cap — pas comme une prescription médicale. Ajuste-les selon tes résultats réels.
          </div>

          <button
            onClick={saveTargets}
            disabled={!valid || saving}
            style={{
              width: '100%', padding: 18, border: 0, borderRadius: 18,
              background: saved ? '#69B578' : valid ? BLACK : '#E8EAE4',
              color: saved ? WHITE : valid ? ACCENT : MUTED,
              fontWeight: 950, fontSize: 15, cursor: valid ? 'pointer' : 'not-allowed',
              transition: 'background .2s',
            }}
          >
            {saved ? 'ENREGISTRÉ' : saving ? 'ENREGISTREMENT...' : 'ENREGISTRER'}
          </button>
        </main>
      </div>
    </div>
  );
}
