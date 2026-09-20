import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const ACCENT = '#B7FF00';
const BG = '#F6F7F2';
const SURFACE = '#FFFFFF';
const BORDER = '#E7E9E2';
const DARK = '#111111';
const MUTED = '#777C73';
const TOTAL = 8;

const GOALS = [
  ['perdre_gras', 'Perdre du gras', 'Déficit modéré et progression durable'],
  ['prendre_muscle', 'Prendre du muscle', 'Léger surplus et entraînement progressif'],
  ['recomposition', 'Recomposition', 'Construire du muscle en maîtrisant le gras'],
  ['force', 'Force', 'Priorité à la performance'],
  ['performance', 'Performance', 'Soutenir énergie et récupération'],
  ['maintien', 'Maintien', 'Stabiliser le poids et les habitudes'],
] as const;

const LEVELS = [
  ['débutant', 'Débutant', 'Moins de 6 mois'],
  ['intermédiaire', 'Intermédiaire', '6 mois à 2 ans'],
  ['avancé', 'Avancé', '2 ans et plus'],
] as const;

const LOCATIONS = [
  ['salle', 'Salle'], ['maison', 'Maison'], ['exterieur', 'Extérieur'], ['mixte', 'Mixte'],
] as const;

const DAYS = [
  [1, 'LUN'], [2, 'MAR'], [3, 'MER'], [4, 'JEU'], [5, 'VEN'], [6, 'SAM'], [7, 'DIM'],
] as const;

const ACTIVITIES = [
  ['sedentaire', 'Sédentaire', 'Peu de marche, travail surtout assis', 1.2],
  ['leger', 'Légèrement actif', 'Un peu de marche au quotidien', 1.375],
  ['modere', 'Modérément actif', 'Marche régulière, journées assez actives', 1.55],
  ['actif', 'Actif', 'Beaucoup de marche ou travail physique', 1.725],
  ['tres_actif', 'Très actif', 'Travail très physique ou activité quotidienne élevée', 1.9],
] as const;

const DIETS = ['omnivore', 'vegetarien', 'vegan', 'sans_gluten', 'sans_lactose', 'halal', 'casher', 'keto'];
const DIET_LABELS: Record<string, string> = {
  omnivore: 'Omnivore', vegetarien: 'Végétarien', vegan: 'Vegan',
  sans_gluten: 'Sans gluten', sans_lactose: 'Sans lactose',
  halal: 'Halal', casher: 'Casher', keto: 'Kéto',
};

function ageFromDob(dob: string) {
  const birth = new Date(`${dob}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function nutritionTarget(args: {
  sex: 'homme' | 'femme';
  weight: number;
  height: number;
  age: number;
  activity: string;
  goal: string;
}) {
  const activity = ACTIVITIES.find(a => a[0] === args.activity);
  if (!activity) throw new Error("Niveau d'activité invalide.");

  // Mifflin-St Jeor (adulte), puis facteur d'activité.
  const bmr = 10 * args.weight + 6.25 * args.height - 5 * args.age + (args.sex === 'homme' ? 5 : -161);
  const maintenance = bmr * activity[3];
  const factors: Record<string, number> = {
    perdre_gras: 0.85, prendre_muscle: 1.08, recomposition: 0.95,
    force: 1, performance: 1, maintien: 1,
  };
  const calories = Math.round((maintenance * (factors[args.goal] ?? 1)) / 25) * 25;

  // Garde-fou : NOX n'enregistre jamais une cible aberrante.
  if (!Number.isFinite(calories) || calories < 1200 || calories > 5000) {
    throw new Error("Objectif calorique hors plage. Vérifie le profil.");
  }

  const protein = Math.round(args.weight * (['prendre_muscle', 'recomposition'].includes(args.goal) ? 2 : 1.8));
  const fat = Math.round(args.weight * 0.8);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { calories, protein, carbs, fat };
}

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [goal, setGoal] = useState('');
  const [level, setLevel] = useState('');
  const [location, setLocation] = useState('');
  const [days, setDays] = useState<number[]>([]);
  const [duration, setDuration] = useState('60');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState<'homme' | 'femme' | ''>('');
  const [activity, setActivity] = useState('');
  const [dietPrefs, setDietPrefs] = useState<string[]>(['omnivore']);

  const age = useMemo(() => dob ? ageFromDob(dob) : 0, [dob]);
  const physicalValid =
    !!sex && !!dob && age >= 18 && age <= 100 &&
    Number(weight) >= 35 && Number(weight) <= 350 &&
    Number(height) >= 120 && Number(height) <= 230;

  const preview = useMemo(() => {
    if (!goal || !activity || !physicalValid || !sex) return null;
    try {
      return nutritionTarget({
        sex, weight: Number(weight), height: Number(height), age, activity, goal,
      });
    } catch { return null; }
  }, [goal, activity, physicalValid, sex, weight, height, age]);

  const canNext =
    step === 1 ? !!goal :
    step === 2 ? !!level :
    step === 3 ? !!location :
    step === 4 ? days.length > 0 :
    step === 5 ? physicalValid :
    step === 6 ? !!activity : true;

  const next = () => { setError(''); setStep(s => Math.min(TOTAL, s + 1)); };
  const prev = () => { setError(''); setStep(s => Math.max(1, s - 1)); };

  const finish = async () => {
    if (!user || saving || !preview || !sex) return;
    setSaving(true);
    setError('');

    try {
      // Le profil reste incomplet tant que la cible nutritionnelle n'est pas sauvegardée.
      const { error: profileError } = await supabase.from('profiles').update({
        goal_type: goal,
        experience_level: level,
        training_location: location,
        available_days: days,
        session_length_min: Number(duration),
        starting_weight_kg: Number(weight),
        height_cm: Number(height),
        date_of_birth: dob,
        sex,
        diet_preferences: dietPrefs,
        activity_level: activity,
        onboarding_completed: false,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);
      if (profileError) throw new Error(`Profil : ${profileError.message}`);

      // Une seule source de vérité par utilisateur.
      // La contrainte UNIQUE(user_id) permet un upsert sûr et évite les doublons.
      const target = {
        user_id: user.id,
        calories: preview.calories,
        protein_g: preview.protein,
        carbs_g: preview.carbs,
        fat_g: preview.fat,
        // Compatibilité avec le schéma actuel : carbs/fat existent aussi en colonnes historiques.
        carbs: preview.carbs,
        fat: preview.fat,
        start_date: new Date().toISOString().slice(0, 10),
        is_active: true,
      };

      const { error: targetError } = await supabase
        .from('nutrition_targets')
        .upsert(target, { onConflict: 'user_id' });

      if (targetError) throw new Error(`Nutrition : ${targetError.message}`);

      const { error: completeError } = await supabase.from('profiles').update({
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);
      if (completeError) throw new Error(`Finalisation : ${completeError.message}`);

      navigate('/generate-program');
    } catch (e: any) {
      console.error('Erreur onboarding NOX :', e);
      setError(e?.message || "Impossible d'enregistrer le profil.");
    } finally {
      setSaving(false);
    }
  };

  const card = (selected: boolean): React.CSSProperties => ({
    width: '100%', padding: '16px 18px', marginBottom: 10,
    background: selected ? '#F2FFD0' : SURFACE,
    border: `1.5px solid ${selected ? '#9EDB00' : BORDER}`,
    borderRadius: 16, cursor: 'pointer', textAlign: 'left',
  });

  const title: React.CSSProperties = {
    fontSize: 28, fontWeight: 900, color: DARK, lineHeight: 1.08,
    letterSpacing: '-.03em', marginBottom: 10,
  };

  const sub: React.CSSProperties = {
    fontSize: 13, color: MUTED, lineHeight: 1.55, marginBottom: 24,
  };

  const stepLabel = (text: string) => (
    <div style={{ fontSize: 11, color: MUTED, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>
      Étape {step} · {text}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          {step > 1
            ? <button onClick={prev} aria-label="Retour" style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${BORDER}`, background: SURFACE, fontSize: 20 }}>←</button>
            : <div style={{ width: 38 }} />}
          <div style={{ fontSize: 12, color: MUTED, fontWeight: 800 }}>{step} / {TOTAL}</div>
          <div style={{ width: 38 }} />
        </div>
        <div style={{ height: 5, background: '#E7E9E2', borderRadius: 99, overflow: 'hidden', marginBottom: 30 }}>
          <div style={{ height: '100%', width: `${((step - 1) / (TOTAL - 1)) * 100}%`, background: ACCENT, transition: 'width .3s' }} />
        </div>
      </header>

      <main style={{ flex: 1, padding: '0 20px', overflowY: 'auto' }}>
        {step === 1 && <div>
          {stepLabel('Objectif')}<div style={title}>Quel est ton objectif principal ?</div>
          <div style={sub}>Il servira à adapter l'entraînement et la cible énergétique.</div>
          {GOALS.map(([id, label, desc]) =>
            <button key={id} onClick={() => setGoal(id)} style={card(goal === id)}>
              <b style={{ fontSize: 15, color: DARK }}>{label}</b>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>{desc}</div>
            </button>)}
        </div>}

        {step === 2 && <div>
          {stepLabel('Niveau')}<div style={title}>Ton niveau d'expérience</div>
          <div style={sub}>NOX adapte le volume et la progression.</div>
          {LEVELS.map(([id, label, desc]) =>
            <button key={id} onClick={() => setLevel(id)} style={card(level === id)}>
              <b style={{ fontSize: 15, color: DARK }}>{label}</b>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>{desc}</div>
            </button>)}
        </div>}

        {step === 3 && <div>
          {stepLabel('Lieu')}<div style={title}>Où t'entraînes-tu ?</div>
          <div style={sub}>Pour proposer des exercices compatibles avec ton environnement.</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {LOCATIONS.map(([id, label]) =>
              <button key={id} onClick={() => setLocation(id)} style={{ ...card(location === id), textAlign: 'center', marginBottom: 0 }}>
                <b style={{ color: DARK }}>{label}</b>
              </button>)}
          </div>
        </div>}

        {step === 4 && <div>
          {stepLabel('Planning')}<div style={title}>Tes jours d'entraînement</div>
          <div style={sub}>Choisis les jours où tu peux réellement t'entraîner.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 26 }}>
            {DAYS.map(([id, label]) => {
              const selected = days.includes(id);
              return <button key={id} onClick={() => setDays(p => selected ? p.filter(x => x !== id) : [...p, id].sort())}
                style={{ padding: '13px 0', borderRadius: 11, border: `1px solid ${selected ? '#9EDB00' : BORDER}`, background: selected ? ACCENT : SURFACE, fontWeight: 900 }}>
                {label}
              </button>;
            })}
          </div>
          <div style={{ fontSize: 12, color: MUTED, fontWeight: 800, marginBottom: 10 }}>Durée par séance</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['30','45','60','75','90'].map(d =>
              <button key={d} onClick={() => setDuration(d)} style={{ padding: '11px 16px', borderRadius: 12, border: `1px solid ${duration === d ? DARK : BORDER}`, background: duration === d ? DARK : SURFACE, color: duration === d ? ACCENT : DARK, fontWeight: 800 }}>{d} min</button>)}
          </div>
        </div>}

        {step === 5 && <div>
          {stepLabel('Profil')}<div style={title}>Ton profil physique</div>
          <div style={sub}>Ces données sont nécessaires au calcul. NOX ne crée plus de cible calorique si elles sont incomplètes.</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            {(['homme','femme'] as const).map(s =>
              <button key={s} onClick={() => setSex(s)} style={{ ...card(sex === s), textAlign: 'center', marginBottom: 0, textTransform: 'capitalize' }}><b>{s}</b></button>)}
          </div>
          <Field label="Poids actuel (kg)" value={weight} setValue={setWeight} type="number" placeholder="80" />
          <Field label="Taille (cm)" value={height} setValue={setHeight} type="number" placeholder="178" />
          <Field label="Date de naissance" value={dob} setValue={setDob} type="date" />
          {dob && age > 0 && age < 18 && <div style={{ padding: 12, borderRadius: 12, background: '#FFF4E8', color: '#8A5A20', fontSize: 12 }}>Le calcul automatique NOX est actuellement réservé aux adultes.</div>}
        </div>}

        {step === 6 && <div>
          {stepLabel('Activité')}<div style={title}>Ton activité au quotidien</div>
          <div style={sub}>Choisis ton activité habituelle en dehors des séances planifiées.</div>
          {ACTIVITIES.map(([id, label, desc]) =>
            <button key={id} onClick={() => setActivity(id)} style={card(activity === id)}>
              <b style={{ fontSize: 15, color: DARK }}>{label}</b>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>{desc}</div>
            </button>)}
        </div>}

        {step === 7 && <div>
          {stepLabel('Nutrition')}<div style={title}>Tes préférences alimentaires</div>
          <div style={sub}>Elles personnalisent les suggestions de repas, pas le calcul calorique.</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {DIETS.map(id => {
              const selected = dietPrefs.includes(id);
              return <button key={id} onClick={() => setDietPrefs(p => id === 'omnivore' ? (selected ? [] : ['omnivore']) : selected ? p.filter(x => x !== id) : [...p.filter(x => x !== 'omnivore'), id])}
                style={{ ...card(selected), textAlign: 'center', marginBottom: 0 }}><b>{DIET_LABELS[id]}</b></button>;
            })}
          </div>
        </div>}

        {step === 8 && <div>
          {stepLabel('Résumé')}<div style={title}>Ton profil NOX est prêt</div>
          <div style={sub}>Vérifie les informations avant de construire ton plan.</div>
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 18, marginBottom: 14 }}>
            <Row label="Objectif" value={GOALS.find(g => g[0] === goal)?.[1] || goal} />
            <Row label="Niveau" value={LEVELS.find(l => l[0] === level)?.[1] || level} />
            <Row label="Séances" value={`${days.length} / semaine`} />
            <Row label="Poids" value={`${weight} kg`} />
            <Row label="Taille" value={`${height} cm`} />
            <Row label="Âge" value={`${age} ans`} last />
          </div>
          {preview && <div style={{ background: '#F2FFD0', border: '1px solid #D7F58A', borderRadius: 18, padding: 18 }}>
            <div style={{ fontSize: 11, color: '#687600', fontWeight: 900, textTransform: 'uppercase' }}>Cible initiale estimée</div>
            <div style={{ fontSize: 32, fontWeight: 950, margin: '6px 0 10px' }}>{preview.calories} kcal</div>
            <div style={{ fontSize: 12, color: MUTED }}>{preview.protein} g protéines · {preview.carbs} g glucides · {preview.fat} g lipides</div>
          </div>}
          <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, marginTop: 12 }}>Estimation de départ basée sur le profil. Elle pourra être ajustée selon l'évolution réelle.</div>
        </div>}
      </main>

      <footer style={{ padding: '16px 20px', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
        {error && <div style={{ background: '#FFF0F0', border: '1px solid #F0C4C4', color: '#A52A2A', borderRadius: 12, padding: 11, fontSize: 12, marginBottom: 10 }}>{error}</div>}
        {step < TOTAL
          ? <button onClick={() => canNext && next()} disabled={!canNext} style={footerButton(canNext)}>CONTINUER</button>
          : <button onClick={finish} disabled={saving || !preview} style={footerButton(!saving && !!preview)}>{saving ? 'ENREGISTREMENT...' : 'CONSTRUIRE MON PLAN NOX'}</button>}
      </footer>
    </div>
  );
}

function footerButton(enabled: boolean): React.CSSProperties {
  return {
    width: '100%', padding: 18, border: 'none', borderRadius: 16,
    background: enabled ? ACCENT : '#E4E6DF', color: enabled ? DARK : '#A5AAA1',
    fontWeight: 950, fontSize: 16, cursor: enabled ? 'pointer' : 'not-allowed',
  };
}

function Field({ label, value, setValue, type, placeholder }: {
  label: string; value: string; setValue: (v: string) => void; type: string; placeholder?: string;
}) {
  return <div style={{ marginBottom: 18 }}>
    <label style={{ display: 'block', fontSize: 12, color: MUTED, fontWeight: 800, marginBottom: 8 }}>{label}</label>
    <input value={value} onChange={e => setValue(e.target.value)} type={type} placeholder={placeholder}
      style={{ width: '100%', padding: 16, boxSizing: 'border-box', background: SURFACE, border: `1.5px solid ${value ? '#BBD968' : BORDER}`, borderRadius: 14, color: DARK, fontSize: type === 'date' ? 17 : 24, fontWeight: 850, outline: 'none' }} />
  </div>;
}

function Row({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '10px 0', borderBottom: last ? 'none' : `1px solid ${BORDER}` }}>
    <span style={{ color: MUTED, fontSize: 13 }}>{label}</span>
    <b style={{ color: DARK, fontSize: 13, textAlign: 'right' }}>{value}</b>
  </div>;
}
