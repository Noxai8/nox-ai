import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const ACCENT = '#C8FF00';
const BG = '#F7F8F4';
const WHITE = '#FFFFFF';
const BLACK = '#0B0B0B';
const MUTED = '#7A7F76';
const BORDER = '#E8EAE4';
const TOTAL = 9;

const GOALS = [
  ['perdre_gras', 'Perdre du gras', 'Affiner progressivement ma silhouette'],
  ['prendre_muscle', 'Prendre du muscle', 'Construire plus de masse musculaire'],
  ['recomposition', 'Recomposition', 'Plus de muscle, moins de masse grasse'],
  ['force', 'Gagner en force', 'Devenir plus fort sur mes mouvements'],
  ['performance', 'Performance', 'Améliorer mes capacités physiques'],
  ['maintien', 'Me maintenir', 'Rester en forme et conserver mes acquis'],
] as const;

const LEVELS = [
  ['débutant', 'Débutant', 'Je débute ou je reprends'],
  ['intermédiaire', 'Intermédiaire', 'Je m’entraîne régulièrement'],
  ['avancé', 'Avancé', 'J’ai plusieurs années de pratique'],
] as const;

const LOCATIONS = [
  ['salle', 'Salle de sport'],
  ['maison', 'À la maison'],
  ['exterieur', 'En extérieur'],
  ['mixte', 'Un peu partout'],
] as const;

const DAYS = [
  [1, 'LUN'], [2, 'MAR'], [3, 'MER'], [4, 'JEU'],
  [5, 'VEN'], [6, 'SAM'], [7, 'DIM'],
] as const;

const ACTIVITIES = [
  ['sedentaire', 'Plutôt sédentaire', 'Je bouge peu en dehors du sport', 1.2],
  ['leger', 'Un peu actif', 'Je marche et bouge un peu chaque jour', 1.375],
  ['modere', 'Actif', 'Je bouge régulièrement au quotidien', 1.55],
  ['actif', 'Très actif', 'Je marche beaucoup ou j’ai un travail physique', 1.725],
  ['tres_actif', 'Très intense', 'Mon quotidien est très physique', 1.9],
] as const;

const DIETS = [
  ['omnivore', 'Je mange de tout'],
  ['vegetarien', 'Végétarien'],
  ['vegan', 'Vegan'],
  ['sans_gluten', 'Sans gluten'],
  ['sans_lactose', 'Sans lactose'],
  ['halal', 'Halal'],
  ['casher', 'Casher'],
  ['keto', 'Kéto'],
] as const;

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

  const bmr = 10 * args.weight + 6.25 * args.height - 5 * args.age + (args.sex === 'homme' ? 5 : -161);
  const maintenance = bmr * activity[3];
  const factors: Record<string, number> = {
    perdre_gras: 0.85,
    prendre_muscle: 1.08,
    recomposition: 0.95,
    force: 1,
    performance: 1,
    maintien: 1,
  };

  const calories = Math.round((maintenance * (factors[args.goal] ?? 1)) / 25) * 25;
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

  const [firstName, setFirstName] = useState(String(user?.user_metadata?.first_name || user?.user_metadata?.name || ''));
  const [lastName, setLastName] = useState(String(user?.user_metadata?.last_name || ''));
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState<'homme' | 'femme' | ''>('');
  const [activity, setActivity] = useState('');
  const [level, setLevel] = useState('');
  const [location, setLocation] = useState('');
  const [days, setDays] = useState<number[]>([]);
  const [duration, setDuration] = useState('60');
  const [goal, setGoal] = useState('');
  const [dietPrefs, setDietPrefs] = useState<string[]>(['omnivore']);
  const [allergies, setAllergies] = useState('');
  const [foodLikes, setFoodLikes] = useState('');
  const [foodDislikes, setFoodDislikes] = useState('');
  const [mealsPerDay, setMealsPerDay] = useState('3');
  const [cookingTime, setCookingTime] = useState('30');

  const age = useMemo(() => (dob ? ageFromDob(dob) : 0), [dob]);
  const physicalValid = !!sex && !!dob && age >= 18 && age <= 100 &&
    Number(weight) >= 35 && Number(weight) <= 350 &&
    Number(height) >= 120 && Number(height) <= 230;

  const preview = useMemo(() => {
    if (!goal || !activity || !physicalValid || !sex) return null;
    return nutritionTarget({ sex, weight: Number(weight), height: Number(height), age, activity, goal });
  }, [goal, activity, physicalValid, sex, weight, height, age]);

  const canNext =
    step === 1 ? firstName.trim().length > 1 && lastName.trim().length > 1 :
    step === 2 ? physicalValid :
    step === 3 ? !!activity :
    step === 4 ? !!level && !!location :
    step === 5 ? days.length > 0 :
    step === 6 ? !!goal :
    step === 7 ? dietPrefs.length > 0 :
    true;

  const toggleDiet = (id: string) => {
    setDietPrefs(current => {
      if (id === 'omnivore') return ['omnivore'];
      if (current.includes(id)) return current.filter(x => x !== id);
      return [...current.filter(x => x !== 'omnivore'), id];
    });
  };

  const finish = async () => {
    if (!user || saving || !preview || !sex) return;
    setSaving(true);
    setError('');

    try {
      const nutritionContext = [
        ...dietPrefs,
        allergies.trim() ? `allergies:${allergies.trim()}` : '',
        foodLikes.trim() ? `likes:${foodLikes.trim()}` : '',
        foodDislikes.trim() ? `dislikes:${foodDislikes.trim()}` : '',
        `meals_per_day:${mealsPerDay}`,
        `cooking_time_min:${cookingTime}`,
      ].filter(Boolean);

      const { error: metadataError } = await supabase.auth.updateUser({
        data: { first_name: firstName.trim(), last_name: lastName.trim(), name: firstName.trim() },
      });
      if (metadataError) throw metadataError;

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
        diet_preferences: nutritionContext,
        activity_level: activity,
        onboarding_completed: false,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);
      if (profileError) throw profileError;

      const { error: targetError } = await supabase.from('nutrition_targets').upsert({
        user_id: user.id,
        calories: preview.calories,
        protein_g: preview.protein,
        carbs_g: preview.carbs,
        fat_g: preview.fat,
        carbs: preview.carbs,
        fat: preview.fat,
        start_date: new Date().toISOString().slice(0, 10),
        is_active: true,
      }, { onConflict: 'user_id' });
      if (targetError) throw targetError;

      navigate('/future', { state: { onboarding: true } });
    } catch (e: any) {
      console.error('Erreur onboarding NOX :', e);
      setError(e?.message || "Impossible d'enregistrer ton profil.");
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (!canNext) return;
    setError('');
    setStep(s => Math.min(TOTAL, s + 1));
  };

  return (
    <div style={{ minHeight: '100dvh', background: BG, color: BLACK, display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '20px 20px 0' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}
            style={{ width: 42, height: 42, borderRadius: 14, border: `1px solid ${BORDER}`, background: WHITE, display: 'grid', placeItems: 'center', opacity: step === 1 ? 0 : 1 }}>
            <ArrowLeft size={18} />
          </button>
          <div style={{ fontSize: 19, fontWeight: 950, letterSpacing: '-.04em' }}>NOX<span style={{ color: '#9ED100' }}>.</span></div>
          <div style={{ width: 42, textAlign: 'right', fontSize: 11, fontWeight: 850, color: MUTED }}>{step}/{TOTAL}</div>
        </div>
        <div style={{ maxWidth: 560, height: 4, margin: '18px auto 0', borderRadius: 999, background: '#E4E7DF', overflow: 'hidden' }}>
          <div style={{ width: `${(step / TOTAL) * 100}%`, height: '100%', borderRadius: 999, background: BLACK }} />
        </div>
      </header>

      <main style={{ width: '100%', maxWidth: 560, margin: '0 auto', flex: 1, boxSizing: 'border-box', padding: '38px 20px 28px' }}>
        {step === 1 && <Screen eyebrow="01 · TOI" title={<>Commençons par<br />faire connaissance.</>} subtitle="NOX construit une expérience autour de toi, pas autour d’un profil générique.">
          <Field label="PRÉNOM" value={firstName} setValue={setFirstName} placeholder="Alex" />
          <Field label="NOM" value={lastName} setValue={setLastName} placeholder="Martin" />
          <Info>Ton email est déjà lié à ton compte NOX.</Info>
        </Screen>}

        {step === 2 && <Screen eyebrow="02 · TON CORPS" title={<>Ton point<br />de départ.</>} subtitle="Ces données permettent d’adapter les estimations et ton futur programme.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
            {(['homme', 'femme'] as const).map(s => <Choice key={s} selected={sex === s} onClick={() => setSex(s)} centered>{s === 'homme' ? 'Homme' : 'Femme'}</Choice>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="POIDS · KG" value={weight} setValue={setWeight} type="number" placeholder="80" />
            <Field label="TAILLE · CM" value={height} setValue={setHeight} type="number" placeholder="178" />
          </div>
          <Field label="DATE DE NAISSANCE" value={dob} setValue={setDob} type="date" />
          {dob && age > 0 && age < 18 && <Info>Le parcours automatique NOX est actuellement réservé aux adultes.</Info>}
        </Screen>}

        {step === 3 && <Screen eyebrow="03 · MODE DE VIE" title={<>À quoi ressemble<br />ton quotidien ?</>} subtitle="En dehors du sport, combien bouges-tu réellement ?">
          {ACTIVITIES.map(([id, label, desc]) => <Choice key={id} selected={activity === id} onClick={() => setActivity(id)}><b>{label}</b><span>{desc}</span></Choice>)}
        </Screen>}

        {step === 4 && <Screen eyebrow="04 · SPORT" title={<>Ton expérience.<br />Ton terrain.</>} subtitle="NOX adaptera la difficulté et les exercices à ce que tu peux réellement faire.">
          <SmallTitle>TON NIVEAU</SmallTitle>
          {LEVELS.map(([id, label, desc]) => <Choice key={id} selected={level === id} onClick={() => setLevel(id)}><b>{label}</b><span>{desc}</span></Choice>)}
          <SmallTitle>OÙ T’ENTRAÎNES-TU ?</SmallTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {LOCATIONS.map(([id, label]) => <Choice key={id} selected={location === id} onClick={() => setLocation(id)} centered>{label}</Choice>)}
          </div>
        </Screen>}

        {step === 5 && <Screen eyebrow="05 · DISPONIBILITÉS" title={<>Un plan qui tient<br />dans ta vraie vie.</>} subtitle="Choisis uniquement les jours où tu peux réellement t’entraîner.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 28 }}>
            {DAYS.map(([id, label]) => {
              const selected = days.includes(id);
              return <button key={id} onClick={() => setDays(c => selected ? c.filter(x => x !== id) : [...c, id].sort())}
                style={{ minHeight: 54, borderRadius: 15, border: `1.5px solid ${selected ? BLACK : BORDER}`, background: selected ? BLACK : WHITE, color: selected ? ACCENT : BLACK, fontWeight: 900 }}>{label}</button>;
            })}
          </div>
          <SmallTitle>DURÉE D’UNE SÉANCE</SmallTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['30','45','60','75','90'].map(d => <Pill key={d} selected={duration === d} onClick={() => setDuration(d)}>{d} min</Pill>)}
          </div>
        </Screen>}

        {step === 6 && <Screen eyebrow="06 · OBJECTIF" title={<>Qu’est-ce que tu<br />veux changer ?</>} subtitle="Choisis ta priorité. Tu décriras précisément ton physique idéal dans NOX Future.">
          {GOALS.map(([id, label, desc]) => <Choice key={id} selected={goal === id} onClick={() => setGoal(id)}><b>{label}</b><span>{desc}</span></Choice>)}
        </Screen>}

        {step === 7 && <Screen eyebrow="07 · NUTRITION" title={<>Mange comme<br />tu aimes manger.</>} subtitle="NOX utilisera ces préférences pour personnaliser tes futures suggestions alimentaires.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {DIETS.map(([id, label]) => <Choice key={id} selected={dietPrefs.includes(id)} onClick={() => toggleDiet(id)} centered>{label}</Choice>)}
          </div>
        </Screen>}

        {step === 8 && <Screen eyebrow="08 · TES HABITUDES" title={<>La nutrition doit<br />s’adapter à toi.</>} subtitle="Renseigne uniquement ce qui compte pour toi. Tu peux laisser un champ vide.">
          <Field label="ALLERGIES / INTOLÉRANCES" value={allergies} setValue={setAllergies} placeholder="Ex. arachides, lactose..." />
          <Field label="ALIMENTS QUE TU AIMES" value={foodLikes} setValue={setFoodLikes} placeholder="Ex. poulet, riz, saumon..." />
          <Field label="ALIMENTS QUE TU N’AIMES PAS" value={foodDislikes} setValue={setFoodDislikes} placeholder="Ex. brocoli, champignons..." />
          <SmallTitle>NOMBRE DE REPAS</SmallTitle>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>{['2','3','4','5'].map(n => <Pill key={n} selected={mealsPerDay === n} onClick={() => setMealsPerDay(n)}>{n}</Pill>)}</div>
          <SmallTitle>TEMPS POUR CUISINER</SmallTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{['10','20','30','45','60'].map(n => <Pill key={n} selected={cookingTime === n} onClick={() => setCookingTime(n)}>{n} min</Pill>)}</div>
        </Screen>}

        {step === 9 && <Screen eyebrow="09 · PRÊT" title={<>Maintenant,<br />visualise ton objectif.</>} subtitle="Ton profil est prêt. La prochaine étape est NOX Future : ta photo actuelle, ton objectif visuel, puis ta projection IA.">
          <div style={{ background: BLACK, color: WHITE, borderRadius: 28, padding: 22, boxShadow: '0 18px 45px rgba(0,0,0,.10)' }}>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.12em', color: '#888', marginBottom: 16 }}>TON PROFIL NOX</div>
            <SummaryRow label="Objectif" value={GOALS.find(g => g[0] === goal)?.[1] || goal} />
            <SummaryRow label="Niveau" value={LEVELS.find(l => l[0] === level)?.[1] || level} />
            <SummaryRow label="Entraînement" value={`${days.length}× / semaine`} />
            <SummaryRow label="Séance" value={`${duration} min`} />
            <SummaryRow label="Nutrition" value={`${dietPrefs.length} préférence${dietPrefs.length > 1 ? 's' : ''}`} last />
          </div>
          {preview && <div style={{ marginTop: 12, background: '#F0FFD0', border: '1px solid #D9F48E', borderRadius: 22, padding: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.1em', color: '#687600' }}>BASE NUTRITIONNELLE ESTIMÉE</div>
            <div style={{ marginTop: 6, fontSize: 26, fontWeight: 950 }}>{preview.calories} kcal</div>
            <div style={{ marginTop: 5, color: MUTED, fontSize: 12 }}>{preview.protein} g protéines · {preview.carbs} g glucides · {preview.fat} g lipides</div>
          </div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18, color: MUTED, fontSize: 12, lineHeight: 1.5 }}>
            <div style={{ width: 26, height: 26, borderRadius: 9, background: ACCENT, display: 'grid', placeItems: 'center', color: BLACK }}><Check size={14} strokeWidth={3} /></div>
            Après NOX Future, ton objectif servira à construire ton programme personnalisé.
          </div>
        </Screen>}
      </main>

      <footer style={{ width: '100%', maxWidth: 560, margin: '0 auto', boxSizing: 'border-box', padding: '12px 20px max(24px, env(safe-area-inset-bottom))' }}>
        {error && <div style={{ marginBottom: 10, padding: '12px 14px', borderRadius: 14, background: '#FFF1F0', border: '1px solid #FFD1CD', color: '#B42318', fontSize: 12 }}>{error}</div>}
        {step < TOTAL
          ? <button onClick={next} disabled={!canNext} style={primaryButton(canNext)}><span>CONTINUER</span><ChevronRight size={19} /></button>
          : <button onClick={finish} disabled={saving || !preview} style={primaryButton(!saving && !!preview)}><span>{saving ? 'PRÉPARATION...' : 'CRÉER MON NOX FUTURE'}</span>{!saving && <ChevronRight size={19} />}</button>}
      </footer>
    </div>
  );
}

function Screen({ eyebrow, title, subtitle, children }: { eyebrow: string; title: ReactNode; subtitle: string; children: ReactNode }) {
  return <section>
    <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.13em', color: '#9BA096', marginBottom: 11 }}>{eyebrow}</div>
    <h1 style={{ margin: 0, color: BLACK, fontSize: 'clamp(34px, 9vw, 46px)', lineHeight: .96, letterSpacing: '-.06em', fontWeight: 950 }}>{title}</h1>
    <p style={{ margin: '16px 0 28px', maxWidth: 440, color: MUTED, fontSize: 14, lineHeight: 1.6 }}>{subtitle}</p>
    {children}
  </section>;
}

function Choice({ selected, onClick, children, centered = false }: { selected: boolean; onClick: () => void; children: ReactNode; centered?: boolean }) {
  return <button onClick={onClick} style={{ width: '100%', minHeight: 64, marginBottom: 10, padding: '14px 16px', boxSizing: 'border-box', borderRadius: 18, border: `1.5px solid ${selected ? BLACK : BORDER}`, background: selected ? BLACK : WHITE, color: selected ? WHITE : BLACK, textAlign: centered ? 'center' : 'left', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, fontSize: 13, fontWeight: 850 }}>
    {children}
  </button>;
}

function Field({ label, value, setValue, type = 'text', placeholder }: { label: string; value: string; setValue: (v: string) => void; type?: string; placeholder?: string }) {
  return <div style={{ marginBottom: 17 }}>
    <label style={{ display: 'block', margin: '0 0 8px 2px', fontSize: 10, fontWeight: 900, letterSpacing: '.09em', color: MUTED }}>{label}</label>
    <input value={value} onChange={e => setValue(e.target.value)} type={type} placeholder={placeholder}
      style={{ width: '100%', height: 58, padding: '0 16px', boxSizing: 'border-box', borderRadius: 17, border: `1.5px solid ${BORDER}`, background: WHITE, color: BLACK, outline: 'none', fontSize: 15, fontWeight: 750 }} />
  </div>;
}

function SmallTitle({ children }: { children: ReactNode }) {
  return <div style={{ margin: '22px 2px 10px', color: MUTED, fontSize: 10, fontWeight: 900, letterSpacing: '.1em' }}>{children}</div>;
}

function Pill({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return <button onClick={onClick} style={{ minWidth: 58, padding: '12px 15px', borderRadius: 13, border: `1px solid ${selected ? BLACK : BORDER}`, background: selected ? BLACK : WHITE, color: selected ? ACCENT : BLACK, fontWeight: 900 }}>{children}</button>;
}

function Info({ children }: { children: ReactNode }) {
  return <div style={{ padding: '13px 14px', borderRadius: 15, background: '#F0FFD0', border: '1px solid #DDF59C', color: '#596700', fontSize: 11, lineHeight: 1.5, fontWeight: 650 }}>{children}</div>;
}

function SummaryRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '12px 0', borderBottom: last ? 'none' : '1px solid #242424' }}>
    <span style={{ color: '#858585', fontSize: 12 }}>{label}</span><strong style={{ color: WHITE, fontSize: 12, textAlign: 'right' }}>{value}</strong>
  </div>;
}

function primaryButton(enabled: boolean): CSSProperties {
  return {
    width: '100%', minHeight: 60, padding: '0 18px', border: 0, borderRadius: 18,
    background: enabled ? ACCENT : '#E1E4DD', color: enabled ? BLACK : '#A4A8A0',
    fontSize: 13, fontWeight: 950, letterSpacing: '.035em', display: 'flex',
    alignItems: 'center', justifyContent: 'space-between', cursor: enabled ? 'pointer' : 'not-allowed',
  };
}
