import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';
const TOTAL = 7;

const GOALS = [
  { id: 'perdre_gras', label: 'Perdre du gras', icon: '🔥', desc: 'Déficit calorique + cardio' },
  { id: 'prendre_muscle', label: 'Prendre du muscle', icon: '💪', desc: 'Surplus + force' },
  { id: 'recomposition', label: 'Recomposition', icon: '⚡', desc: 'Rééquilibrer corps' },
  { id: 'force', label: 'Force', icon: '🏋️', desc: 'Lever plus lourd' },
  { id: 'performance', label: 'Performance', icon: '🎯', desc: 'Sport / compétition' },
  { id: 'maintien', label: 'Maintien', icon: '✅', desc: 'Garder ma forme' },
];

const LEVELS = [
  { id: 'débutant', label: 'Débutant', desc: 'Moins de 6 mois de pratique' },
  { id: 'intermédiaire', label: 'Intermédiaire', desc: '6 mois – 2 ans' },
  { id: 'avancé', label: 'Avancé', desc: '2 ans et plus' },
];

const LOCATIONS = ['🏋️ Salle', '🏠 Maison', '🌿 Extérieur', '🔀 Mixte'];
const DAYS = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];
const DURATIONS = ['30', '45', '60', '75', '90'];

const DIET_PREFS = [
  { id: 'omnivore', label: 'Omnivore', icon: '🍗' },
  { id: 'vegetarien', label: 'Végétarien', icon: '🥗' },
  { id: 'vegan', label: 'Vegan', icon: '🌱' },
  { id: 'sans_gluten', label: 'Sans gluten', icon: '🌾' },
  { id: 'sans_lactose', label: 'Sans lactose', icon: '🥛' },
  { id: 'halal', label: 'Halal', icon: '☪️' },
  { id: 'casher', label: 'Casher', icon: '✡️' },
  { id: 'keto', label: 'Kéto', icon: '🥑' },
];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [goal, setGoal] = useState('');
  const [level, setLevel] = useState('');
  const [location, setLocation] = useState('');
  const [days, setDays] = useState<string[]>([]);
  const [duration, setDuration] = useState('60');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [dietPrefs, setDietPrefs] = useState<string[]>(['omnivore']);

  const next = () => setStep(s => Math.min(s + 1, TOTAL));
  const prev = () => setStep(s => Math.max(s - 1, 1));

  const canNext = () => {
    if (step === 1) return !!goal;
    if (step === 2) return !!level;
    if (step === 3) return !!location;
    if (step === 4) return days.length > 0;
    if (step === 5) return !!weight;
    if (step === 6) return true; // préférences alimentaires optionnelles
    return true;
  };

  const finish = async () => {
    setSaving(true);
    const dob = age ? new Date(Date.now() - parseInt(age) * 365.25 * 86400000).toISOString().split('T')[0] : null;
    await supabase.from('profiles').update({
      goal_type: goal,
      experience_level: level,
      available_days: days,
      session_length_min: parseInt(duration) || 60,
      starting_weight_kg: parseFloat(weight) || null,
      height_cm: parseFloat(height) || null,
      date_of_birth: dob,
      sex: sex || null,
      diet_preferences: dietPrefs,
      activity_level: 'modérément actif',
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    }).eq('id', user!.id);
    navigate('/generate-program');
  };

  const progress = ((step - 1) / (TOTAL - 1)) * 100;

  const Btn = ({ selected, onClick, children, style = {} }: any) => (
    <button onClick={onClick} style={{
      width: '100%', padding: '16px 20px',
      background: selected ? ACCENT + '18' : SURFACE,
      border: '2px solid ' + (selected ? ACCENT : BORDER),
      borderRadius: 16, cursor: 'pointer', textAlign: 'left',
      touchAction: 'manipulation', marginBottom: 10, ...style,
    }}>
      {children}
    </button>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          {step > 1
            ? <button onClick={prev} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 24, padding: 4 }}>←</button>
            : <div style={{ width: 32 }} />
          }
          <div style={{ fontSize: 12, color: '#555', fontWeight: 700 }}>{step} / {TOTAL}</div>
          <div style={{ width: 32 }} />
        </div>
        <div style={{ height: 4, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden', marginBottom: 32 }}>
          <div style={{ height: '100%', width: progress + '%', background: ACCENT, borderRadius: 2, transition: 'width .4s' }} />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '0 20px', overflowY: 'auto' }}>

        {/* STEP 1 — Objectif */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 8 }}>Étape 1 · Objectif</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 28 }}>Quel est ton<br />objectif principal ?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {GOALS.map(g => (
                <button key={g.id} onClick={() => setGoal(g.id)}
                  style={{ padding: '18px 12px', background: goal === g.id ? ACCENT + '18' : SURFACE, border: '2px solid ' + (goal === g.id ? ACCENT : BORDER), borderRadius: 16, cursor: 'pointer', textAlign: 'center', touchAction: 'manipulation' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{g.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: goal === g.id ? ACCENT : '#fff' }}>{g.label}</div>
                  <div style={{ fontSize: 10, color: '#555', marginTop: 3 }}>{g.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2 — Niveau */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 8 }}>Étape 2 · Niveau</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 28 }}>Ton niveau<br />d'expérience ?</div>
            {LEVELS.map(l => (
              <Btn key={l.id} selected={level === l.id} onClick={() => setLevel(l.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: level === l.id ? ACCENT : '#fff' }}>{l.label}</div>
                    <div style={{ fontSize: 12, color: '#555', marginTop: 3 }}>{l.desc}</div>
                  </div>
                  {level === l.id && <div style={{ color: ACCENT, fontSize: 20 }}>✓</div>}
                </div>
              </Btn>
            ))}
          </div>
        )}

        {/* STEP 3 — Lieu */}
        {step === 3 && (
          <div>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 8 }}>Étape 3 · Lieu</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 28 }}>Où t'entraînes-tu ?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {LOCATIONS.map(l => (
                <button key={l} onClick={() => setLocation(l)}
                  style={{ padding: '20px 12px', background: location === l ? ACCENT + '18' : SURFACE, border: '2px solid ' + (location === l ? ACCENT : BORDER), borderRadius: 16, cursor: 'pointer', textAlign: 'center', touchAction: 'manipulation' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{l.split(' ')[0]}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: location === l ? ACCENT : '#ccc' }}>{l.split(' ').slice(1).join(' ')}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4 — Disponibilités */}
        {step === 4 && (
          <div>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 8 }}>Étape 4 · Planning</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 24 }}>Tes jours<br />d'entraînement</div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
              {DAYS.map(d => (
                <button key={d} onClick={() => setDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])}
                  style={{ flex: 1, padding: '14px 0', background: days.includes(d) ? ACCENT : SURFACE, border: '1px solid ' + (days.includes(d) ? ACCENT : BORDER), borderRadius: 10, color: days.includes(d) ? '#000' : '#555', fontWeight: 800, fontSize: 10, cursor: 'pointer', touchAction: 'manipulation' }}>
                  {d}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>Durée par séance</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DURATIONS.map(d => (
                <button key={d} onClick={() => setDuration(d)}
                  style={{ padding: '12px 18px', background: duration === d ? ACCENT : SURFACE, border: '1px solid ' + (duration === d ? ACCENT : BORDER), borderRadius: 12, color: duration === d ? '#000' : '#555', fontWeight: 700, fontSize: 13, cursor: 'pointer', touchAction: 'manipulation' }}>
                  {d} min
                </button>
              ))}
            </div>

            {days.length > 0 && (
              <div style={{ marginTop: 20, background: ACCENT + '0d', border: '1px solid ' + ACCENT + '33', borderRadius: 12, padding: '10px 14px', fontSize: 12, color: ACCENT }}>
                {days.length} séance{days.length > 1 ? 's' : ''}/semaine · {duration} min chacune
              </div>
            )}
          </div>
        )}

        {/* STEP 5 — Profil physique */}
        {step === 5 && (
          <div>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 8 }}>Étape 5 · Profil</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 8 }}>Ton profil physique</div>
            <div style={{ fontSize: 13, color: '#555', marginBottom: 24 }}>Pour calculer tes objectifs caloriques et personnaliser ton programme.</div>

            {/* Sexe */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>Sexe (optionnel)</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['homme', 'femme'].map(s => (
                  <button key={s} onClick={() => setSex(s)}
                    style={{ flex: 1, padding: '12px 0', background: sex === s ? ACCENT + '22' : SURFACE, border: '1px solid ' + (sex === s ? ACCENT : BORDER), borderRadius: 12, color: sex === s ? ACCENT : '#555', fontWeight: 700, fontSize: 13, cursor: 'pointer', touchAction: 'manipulation', textTransform: 'capitalize' }}>
                    {s === 'homme' ? '♂ Homme' : '♀ Femme'}
                  </button>
                ))}
              </div>
            </div>

            {[
              { label: 'Poids actuel (kg) *', val: weight, set: setWeight, placeholder: '80' },
              { label: 'Taille (cm)', val: height, set: setHeight, placeholder: '178' },
              { label: 'Âge', val: age, set: setAge, placeholder: '25' },
            ].map(({ label, val, set, placeholder }) => (
              <div key={label} style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 8 }}>{label}</label>
                <input value={val} onChange={e => set(e.target.value)} type="number" placeholder={placeholder} inputMode="decimal"
                  style={{ width: '100%', padding: '18px 16px', background: SURFACE, border: '1px solid ' + (val ? ACCENT + '66' : BORDER), borderRadius: 14, color: '#fff', fontSize: 28, fontWeight: 900, textAlign: 'center', boxSizing: 'border-box' as const, outline: 'none' }} />
              </div>
            ))}
          </div>
        )}

        {/* STEP 6 — Préférences alimentaires */}
        {step === 6 && (
          <div>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 8 }}>Étape 6 · Nutrition</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 8 }}>Tes préférences<br />alimentaires</div>
            <div style={{ fontSize: 13, color: '#555', marginBottom: 24 }}>Pour que NOX adapte tes suggestions de repas et ta liste de courses.</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {DIET_PREFS.map(p => (
                <button key={p.id} onClick={() => setDietPrefs(prev =>
                  prev.includes(p.id)
                    ? prev.filter(x => x !== p.id)
                    : p.id === 'omnivore' ? [p.id] : [...prev.filter(x => x !== 'omnivore'), p.id]
                )}
                  style={{ padding: '16px 12px', background: dietPrefs.includes(p.id) ? ACCENT + '18' : SURFACE, border: '2px solid ' + (dietPrefs.includes(p.id) ? ACCENT : BORDER), borderRadius: 14, cursor: 'pointer', textAlign: 'center', touchAction: 'manipulation' }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{p.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: dietPrefs.includes(p.id) ? ACCENT : '#ccc' }}>{p.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 7 — Résumé */}
        {step === 7 && (
          <div>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 8 }}>Étape 7 · Résumé</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 24 }}>Ton profil NOX</div>

            <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 20, padding: 20, marginBottom: 20 }}>
              {[
                { label: 'Objectif', value: GOALS.find(g2 => g2.id === goal)?.label || goal },
                { label: 'Niveau', value: LEVELS.find(l => l.id === level)?.label || level },
                { label: 'Lieu', value: location },
                { label: 'Séances', value: days.join(', ') || '—' },
                { label: 'Durée', value: duration + ' min' },
                { label: 'Poids', value: weight ? weight + ' kg' : '—' },
                { label: 'Taille', value: height ? height + ' cm' : '—' },
                { label: 'Alimentation', value: dietPrefs.join(', ') },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>
                  <span style={{ fontSize: 13, color: '#555' }}>{label}</span>
                  <span style={{ fontSize: 13, color: '#fff', fontWeight: 700, textAlign: 'right', maxWidth: '55%' }}>{value}</span>
                </div>
              ))}
            </div>

            <div style={{ background: ACCENT + '0d', border: '1px solid ' + ACCENT + '22', borderRadius: 14, padding: 14, marginBottom: 20, fontSize: 13, color: '#888', lineHeight: 1.6 }}>
              ⚡ NOX va générer ton programme personnalisé, calculer tes objectifs caloriques et préparer ton plan de transformation.
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 20px', paddingBottom: 'max(24px, env(safe-area-inset-bottom))', flexShrink: 0 }}>
        {step < TOTAL ? (
          <button
            onTouchEnd={e => { e.preventDefault(); if (canNext()) next(); }}
            onClick={() => { if (canNext()) next(); }}
            disabled={!canNext()}
            style={{ width: '100%', padding: 20, background: canNext() ? ACCENT : '#1a1a1a', border: 'none', borderRadius: 16, color: canNext() ? '#000' : '#333', fontWeight: 900, fontSize: 17, cursor: canNext() ? 'pointer' : 'not-allowed', touchAction: 'manipulation', transition: 'background .2s' }}>
            CONTINUER →
          </button>
        ) : (
          <button
            onTouchEnd={e => { e.preventDefault(); if (!saving) finish(); }}
            onClick={() => { if (!saving) finish(); }}
            disabled={saving}
            style={{ width: '100%', padding: 20, background: ACCENT, border: 'none', borderRadius: 16, color: '#000', fontWeight: 900, fontSize: 17, cursor: 'pointer', touchAction: 'manipulation' }}>
            {saving ? 'CRÉATION EN COURS...' : '⚡ CONSTRUIRE MON PLAN NOX'}
          </button>
        )}
      </div>
    </div>
  );
}
