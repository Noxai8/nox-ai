import { useMemo, useState } from 'react';

// ── Vérification d'un repas estimé par photo ─────────────────────────────────
// Une photo donne une ESTIMATION. Rien n'est enregistré avant que l'utilisateur ait
// vérifié et, si besoin, corrigé la quantité, les calories et les macros.

export type MealValues = { food_name: string; calories: number; protein: number; carbs: number; fat: number };

const PORTIONS = [0.5, 0.75, 1, 1.5, 2] as const;
const portionLabel = (p: number) => (p === 1 ? 'Portion estimée' : `× ${String(p).replace('.', ',')}`);

const r0 = (n: number) => Math.max(0, Math.round(n));
const r1 = (n: number) => Math.max(0, Math.round(n * 10) / 10);

export default function MealReview({
  estimate, busy = false, onConfirm, onCancel, dark = true,
}: {
  estimate: MealValues;
  busy?: boolean;
  onConfirm: (values: MealValues) => void;
  onCancel: () => void;
  dark?: boolean;
}) {
  const [name, setName] = useState(estimate.food_name || 'Repas');
  const [portion, setPortion] = useState(1);
  // Valeurs saisies par l'utilisateur (null = suivre l'estimation × portion)
  const [edited, setEdited] = useState<Partial<Record<'calories' | 'protein' | 'carbs' | 'fat', string>>>({});

  const scaled = useMemo(() => ({
    calories: r0(estimate.calories * portion),
    protein: r1(estimate.protein * portion),
    carbs: r1(estimate.carbs * portion),
    fat: r1(estimate.fat * portion),
  }), [estimate, portion]);

  const value = (k: keyof typeof scaled) => (edited[k] !== undefined ? edited[k]! : String(scaled[k]));
  const num = (k: keyof typeof scaled) => Number(String(value(k)).replace(',', '.'));
  const valid = name.trim().length > 0 && (['calories', 'protein', 'carbs', 'fat'] as const)
    .every(k => value(k) !== '' && Number.isFinite(num(k)) && num(k) >= 0 && num(k) <= (k === 'calories' ? 5000 : 500));

  const C = dark
    ? { card: '#111611', field: '#1A201C', border: '#343D35', text: '#FFFFFF', sec: '#A5AAA6', muted: '#747A76' }
    : { card: '#FFFFFF', field: '#F4F5F1', border: '#E1E3DC', text: '#0B0B0B', sec: '#5C6158', muted: '#8A8F85' };
  const LIME = '#C8FF00';
  const field: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', height: 46, padding: '0 12px', borderRadius: 12,
    border: `1px solid ${C.border}`, background: C.field, color: C.text, fontSize: 15, fontWeight: 800, outline: 'none',
  };
  const label: React.CSSProperties = { fontSize: 11, fontWeight: 900, color: C.muted, letterSpacing: '.06em', margin: '0 0 6px 2px' };

  // Fonction de rendu (et non composant interne) : le champ garde le focus pendant la saisie
  const numField = (k: keyof typeof scaled, title: string, unit: string) => (
    <div key={k}>
      <div style={label}>{title}</div>
      <div style={{ position: 'relative' }}>
        <input type="number" inputMode="decimal" min={0} value={value(k)}
          onChange={e => setEdited(v => ({ ...v, [k]: e.target.value }))} style={{ ...field, paddingRight: 40 }} />
        <span style={{ position: 'absolute', right: 12, top: 14, color: C.muted, fontSize: 12, fontWeight: 800 }}>{unit}</span>
      </div>
    </div>
  );

  return (
    <div style={{ background: C.card, border: `1px solid ${dark ? LIME : C.border}`, borderRadius: 20, padding: 'clamp(16px, 2.5vw, 24px)', color: C.text, boxShadow: dark ? 'inset 0 0 0 1px rgba(200,255,0,.10)' : 'none' }}>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', color: LIME, marginBottom: 6 }}>VÉRIFIE ET AJUSTE SI NÉCESSAIRE</div>
      <div style={{ fontSize: 13, color: C.sec, lineHeight: 1.5, marginBottom: 16 }}>
        Les valeurs sont estimées à partir de la photo. Ajuste-les si besoin : rien n'est enregistré avant ta validation.
      </div>

      <div style={label}>REPAS</div>
      <input value={name} onChange={e => setName(e.target.value.slice(0, 80))} style={{ ...field, marginBottom: 14 }} />

      <div style={label}>QUANTITÉ</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {PORTIONS.map(p => (
          <button key={p} type="button" onClick={() => { setPortion(p); setEdited({}); }}
            style={{ padding: '8px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 900,
              border: `1px solid ${portion === p ? LIME : C.border}`, background: portion === p ? 'rgba(200,255,0,.10)' : C.field,
              color: portion === p ? (dark ? LIME : C.text) : C.sec }}>
            {portionLabel(p)}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 12, marginBottom: 16 }}>
        {numField('calories', 'CALORIES', 'kcal')}
        {numField('protein', 'PROTÉINES', 'g')}
        {numField('carbs', 'GLUCIDES', 'g')}
        {numField('fat', 'LIPIDES', 'g')}
      </div>

      <button type="button" disabled={!valid || busy}
        onClick={() => onConfirm({ food_name: name.trim(), calories: r0(num('calories')), protein: r1(num('protein')), carbs: r1(num('carbs')), fat: r1(num('fat')) })}
        style={{ width: '100%', padding: 16, border: 0, borderRadius: 14, cursor: valid && !busy ? 'pointer' : 'not-allowed',
          background: valid && !busy ? LIME : '#2B2F2C', color: valid && !busy ? '#090B0A' : C.muted, fontWeight: 900, fontSize: 14 }}>
        {busy ? 'ENREGISTREMENT…' : `VALIDER ET AJOUTER · ${r0(num('calories') || 0)} kcal`}
      </button>
      <button type="button" onClick={onCancel} disabled={busy}
        style={{ width: '100%', padding: 12, marginTop: 6, border: 0, background: 'transparent', color: C.muted, fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
        Annuler
      </button>
    </div>
  );
}
