import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { todayLocalDate } from '../lib/localDate';

const ACCENT = '#C8FF00';
const BG = '#090B0A';
const SURFACE = '#232624';
const SURFACE2 = '#191C1A';
const BORDER = '#4A4F4B';
const SOFT = '#343835';
const WHITE = '#FFFFFF';
const SEC = '#A5AAA6';
const MUTED = '#747A76';

// Axes de parcours (persistés dans profiles.focus_areas)
const PILLARS = [
  ['movement', 'Mouvement & corps', 'Séances, activités, programme'],
  ['nutrition', 'Nutrition', 'Repas, calories, macros'],
  ['recovery', 'Sommeil & récupération', 'Énergie, sommeil, récupération'],
  ['focus', 'Focus', 'Mission du jour, concentration, discipline'],
] as const;
// Habitudes : jamais persistées ici — configurées ensuite avec consentement et garde-fous
const HABIT_CHOICES = [
  ['tobacco', 'Tabac', 'Réduire ou arrêter'],
  ['alcohol', 'Alcool', 'Suivre ou réduire sa consommation'],
  ['sexual_habit', 'Habitude personnelle', 'Masturbation / pornographie'],
] as const;

type StepId = 'identity' | 'focus' | 'body' | 'lifestyle' | 'sport' | 'availability' | 'goal' | 'horizon' | 'diet' | 'foodHabits' | 'ready';

const OBSTACLES = [
  ['temps', 'Manque de temps'],
  ['regularite', 'Régularité difficile'],
  ['alimentation', 'Alimentation non maitrisée'],
  ['motivation', 'Motivation insuffisante'],
  ['organisation', 'Organisation'],
  ['stagnation', 'Stagnation / plateau'],
  ['stress', 'Stress et fatigue'],
  ['blessure', 'Blessures passées'],
] as const;

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

  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [firstName, setFirstName] = useState(String(user?.user_metadata?.first_name || user?.user_metadata?.name || ''));
  const [lastName, setLastName] = useState(String(user?.user_metadata?.last_name || ''));
  const [dob, setDob] = useState('');
  const [focusSel, setFocusSel] = useState<string[]>([]);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [sex, setSex] = useState<'homme' | 'femme' | ''>('');
  const [activity, setActivity] = useState('');
  const [level, setLevel] = useState('');
  const [location, setLocation] = useState('');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [days, setDays] = useState<number[]>([]);
  const [duration, setDuration] = useState('60');
  const [goal, setGoal] = useState('');
  const [goalTime, setGoalTime] = useState('6');
  const [dietPrefs, setDietPrefs] = useState<string[]>(['omnivore']);
  const [allergies, setAllergies] = useState('');
  const [foodLikes, setFoodLikes] = useState('');
  const [foodDislikes, setFoodDislikes] = useState('');
  const [mealsPerDay, setMealsPerDay] = useState('3');
  const [cookingTime, setCookingTime] = useState('30');

  const movement = focusSel.includes('movement');
  const nutrition = focusSel.includes('nutrition');
  const needsBody = movement || nutrition;
  const pillars = PILLARS.map(p => p[0]).filter(id => focusSel.includes(id));
  const habitKinds = HABIT_CHOICES.map(h => h[0]).filter(id => focusSel.includes(id));

  // Parcours conditionnel : seules les étapes utiles aux axes choisis
  const steps: StepId[] = [
    'identity', 'focus',
    ...(needsBody ? ['body', 'lifestyle'] as StepId[] : []),
    ...(movement ? ['sport', 'availability'] as StepId[] : []),
    ...(needsBody ? ['goal', 'horizon'] as StepId[] : []),
    ...(nutrition ? ['diet', 'foodHabits'] as StepId[] : []),
    'ready',
  ];
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const last = stepIndex >= steps.length - 1;

  const age = useMemo(() => (dob ? ageFromDob(dob) : 0), [dob]);
  const adult = age >= 18 && age <= 100;
  const bmi = useMemo(() => {
    const w = Number(weight); const h = Number(height) / 100;
    if (!w || !h || h <= 0) return 0;
    return w / (h * h);
  }, [weight, height]);
  const bodyValid = !!sex && Number(weight) >= 35 && Number(weight) <= 350 && Number(height) >= 120 && Number(height) <= 230;

  const preview = useMemo(() => {
    if (!nutrition || !goal || !activity || !bodyValid || !sex || !adult) return null;
    return nutritionTarget({ sex, weight: Number(weight), height: Number(height), age, activity, goal });
  }, [nutrition, goal, activity, bodyValid, sex, weight, height, age, adult]);

  const canNext =
    step === 'identity' ? firstName.trim().length > 1 && lastName.trim().length > 1 && adult :
    step === 'focus' ? focusSel.length > 0 :
    step === 'body' ? bodyValid :
    step === 'lifestyle' ? !!activity :
    step === 'sport' ? !!level && !!location :
    step === 'availability' ? days.length > 0 :
    step === 'goal' ? !!goal :
    step === 'horizon' ? !!goalTime :
    step === 'diet' ? dietPrefs.length > 0 :
    true;

  const toggle = (list: string[], id: string) => list.includes(id) ? list.filter(x => x !== id) : [...list, id];
  const toggleDiet = (id: string) => {
    setDietPrefs(current => {
      if (id === 'omnivore') return ['omnivore'];
      if (current.includes(id)) return current.filter(x => x !== id);
      return [...current.filter(x => x !== 'omnivore'), id];
    });
  };

  const finish = async () => {
    if (!user || saving) return;
    if (nutrition && !preview) { setError('Il manque des informations pour estimer ta base nutritionnelle.'); return; }
    setSaving(true);
    setError('');

    try {
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { first_name: firstName.trim(), last_name: lastName.trim(), name: firstName.trim(), ...(needsBody ? { goal_time_months: Number(goalTime) } : {}) },
      });
      if (metadataError) throw metadataError;

      const nutritionContext = nutrition ? [
        ...dietPrefs,
        allergies.trim() ? `allergies:${allergies.trim()}` : '',
        foodLikes.trim() ? `likes:${foodLikes.trim()}` : '',
        foodDislikes.trim() ? `dislikes:${foodDislikes.trim()}` : '',
        `meals_per_day:${mealsPerDay}`,
        `cooking_time_min:${cookingTime}`,
        `goal_time_months:${goalTime}`,
      ].filter(Boolean) : [];

      // Seules les données réellement collectées sont écrites
      const profile: Record<string, unknown> = {
        id: user.id,
        display_name: firstName.trim(),
        date_of_birth: dob,
        focus_areas: pillars,
        goal_type: goal || 'maintien',
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
        onboarding_context: {
          first_name: firstName.trim(),
          focus_areas: pillars,
          goal: goal || null,
          ...(needsBody ? {
            body: { starting_weight_kg: Number(weight), height_cm: Number(height), date_of_birth: dob, sex },
            lifestyle: { activity_level: activity },
          } : {}),
          ...(movement ? {
            experience_level: level,
            training: { location, equipment, available_days: days, session_length_min: Number(duration) },
          } : {}),
          ...(nutrition ? { nutrition: { preferences: nutritionContext } } : {}),
          completed_at: new Date().toISOString(),
        },
      };
      if (needsBody) Object.assign(profile, {
        starting_weight_kg: Number(weight), height_cm: Number(height), sex, activity_level: activity,
      });
      if (movement) Object.assign(profile, {
        experience_level: level, training_location: location,
        equipment: location === 'maison' ? equipment : [],
        available_days: days, session_length_min: Number(duration),
      });
      if (nutrition) Object.assign(profile, { diet_preferences: nutritionContext });

      const { error: profileError } = await supabase.from('profiles').upsert(profile, { onConflict: 'id' });
      if (profileError) throw profileError;

      if (nutrition && preview) {
        const { error: targetError } = await supabase.from('nutrition_targets').upsert({
          user_id: user.id,
          calories: preview.calories, protein_g: preview.protein, carbs_g: preview.carbs, fat_g: preview.fat,
          carbs: preview.carbs, fat: preview.fat,
          start_date: todayLocalDate(), is_active: true,
        }, { onConflict: 'user_id' });
        if (targetError) throw targetError;
      }

      const next = movement
        ? { path: '/future', state: { onboardingFlow: true, futureOffer: true } }
        : { path: '/home' };

      if (habitKinds.length > 0) {
        // Configuration des habitudes avec les garde-fous existants (repérage, consentement)
        navigate('/habits', { replace: true, state: { onboardingSetup: habitKinds, next } });
      } else {
        navigate(next.path, { replace: true, state: (next as any).state });
      }
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
    setStepIndex(i => Math.min(steps.length - 1, i + 1));
  };

  const num = String(stepIndex + 1).padStart(2, '0');
  const focusLabels = [
    ...PILLARS.filter(p => focusSel.includes(p[0])).map(p => p[1]),
    ...HABIT_CHOICES.filter(h => focusSel.includes(h[0])).map(h => h[1]),
  ];

  return (
    <div style={{ minHeight: '100dvh', background: BG, color: WHITE, display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '20px 16px 0' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => setStepIndex(i => Math.max(0, i - 1))} disabled={stepIndex === 0} aria-label="Retour"
            style={{ width: 42, height: 42, borderRadius: 14, border: `1px solid ${BORDER}`, background: SURFACE, color: WHITE, display: 'grid', placeItems: 'center', opacity: stepIndex === 0 ? 0 : 1, cursor: 'pointer' }}>
            <ArrowLeft size={18} />
          </button>
          <div style={{ fontSize: 19, fontWeight: 950, letterSpacing: '-.04em' }}>NOX<span style={{ color: ACCENT }}>.</span></div>
          <div style={{ fontSize: 11, fontWeight: 850, color: MUTED, minWidth: 42, textAlign: 'right' }}>{stepIndex + 1}/{steps.length}</div>
        </div>
        <div style={{ maxWidth: 760, height: 4, margin: '18px auto 0', borderRadius: 999, background: SOFT, overflow: 'hidden' }}>
          <div style={{ width: `${((stepIndex + 1) / steps.length) * 100}%`, height: '100%', borderRadius: 999, background: ACCENT, transition: 'width .3s' }} />
        </div>
      </header>

      <main style={{ width: '100%', maxWidth: 760, margin: '0 auto', flex: 1, boxSizing: 'border-box', padding: '38px 16px 28px' }}>
        {step === 'identity' && <Screen eyebrow={`${num} · TOI`} title={<>Commençons par<br />faire connaissance.</>} subtitle="NOX construit une expérience autour de toi, pas autour d’un profil générique.">
          <Field label="PRÉNOM" value={firstName} setValue={setFirstName} placeholder="Alex" />
          <Field label="NOM" value={lastName} setValue={setLastName} placeholder="Martin" />
          <Field label="DATE DE NAISSANCE" value={dob} setValue={setDob} type="date" />
          {dob && age > 0 && age < 18 && <Info>NOX est actuellement réservé aux adultes.</Info>}
        </Screen>}

        {step === 'focus' && <Screen eyebrow={`${num} · TON PARCOURS`} title={<>Qu’est-ce que tu<br />veux travailler ?</>} subtitle="Choisis tout ce qui compte pour toi en ce moment. Tu pourras modifier ces choix à tout moment dans Moi.">
          <SmallTitle>CORPS & QUOTIDIEN</SmallTitle>
          {PILLARS.map(([id, label, desc]) => <Choice key={id} selected={focusSel.includes(id)} onClick={() => setFocusSel(s => toggle(s, id))}><b>{label}</b><span>{desc}</span></Choice>)}
          <SmallTitle>HABITUDES</SmallTitle>
          {HABIT_CHOICES.map(([id, label, desc]) => <Choice key={id} selected={focusSel.includes(id)} onClick={() => setFocusSel(s => toggle(s, id))}><b>{label}</b><span>{desc}</span></Choice>)}
          <Info>Les habitudes seront configurées juste après, une par une. Rien n’est enregistré à leur sujet avant ton accord.</Info>
        </Screen>}

        {step === 'body' && <Screen eyebrow={`${num} · TON CORPS`} title={<>Ton point<br />de départ.</>} subtitle="Ces données servent à estimer tes besoins et à adapter ton parcours.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
            {(['homme', 'femme'] as const).map(s => <Choice key={s} selected={sex === s} onClick={() => setSex(s)} centered>{s === 'homme' ? 'Homme' : 'Femme'}</Choice>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="POIDS · KG" value={weight} setValue={setWeight} type="number" placeholder="80" />
            <Field label="TAILLE · CM" value={height} setValue={setHeight} type="number" placeholder="178" />
          </div>
          {bmi > 0 && Number(weight) >= 35 && Number(height) >= 120 && <div style={{ marginBottom: 14, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.1em', color: MUTED }}>TON IMC · REPÈRE GÉNÉRAL</div>
            <div style={{ marginTop: 5, fontSize: 28, fontWeight: 950 }}>{bmi.toFixed(1).replace('.', ',')}</div>
            <div style={{ marginTop: 5, color: SEC, fontSize: 11, lineHeight: 1.5 }}>L’IMC est un indicateur général. Il ne distingue pas la masse musculaire de la masse grasse. NOX l’utilise comme un repère parmi d’autres.</div>
          </div>}
        </Screen>}

        {step === 'lifestyle' && <Screen eyebrow={`${num} · MODE DE VIE`} title={<>À quoi ressemble<br />ton quotidien ?</>} subtitle="En dehors du sport, combien bouges-tu réellement ?">
          {ACTIVITIES.map(([id, label, desc]) => <Choice key={id} selected={activity === id} onClick={() => setActivity(id)}><b>{label}</b><span>{desc}</span></Choice>)}
        </Screen>}

        {step === 'sport' && <Screen eyebrow={`${num} · SPORT`} title={<>Ton expérience.<br />Ton terrain.</>} subtitle="NOX adaptera la difficulté et les exercices à ce que tu peux réellement faire.">
          <SmallTitle>TON NIVEAU</SmallTitle>
          {LEVELS.map(([id, label, desc]) => <Choice key={id} selected={level === id} onClick={() => setLevel(id)}><b>{label}</b><span>{desc}</span></Choice>)}
          <SmallTitle>OÙ T’ENTRAÎNES-TU ?</SmallTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {LOCATIONS.map(([id, label]) => <Choice key={id} selected={location === id} onClick={() => setLocation(id)} centered>{label}</Choice>)}
          </div>
          {location === 'maison' && (<>
            <SmallTitle>TON MATÉRIEL À LA MAISON</SmallTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[['aucun', 'Aucun matériel'], ['halteres', 'Haltères'], ['elastiques', 'Élastiques'], ['kettlebell', 'Kettlebell'], ['banc', 'Banc'], ['barre', 'Barre + poids'], ['barre_traction', 'Barre de traction']].map(([id, label]) => {
                const isNone = id === 'aucun';
                const sel = isNone ? equipment.length === 0 : equipment.includes(id);
                return <Pill key={id} selected={sel} onClick={() => isNone ? setEquipment([]) : setEquipment(c => toggle(c, id))}>{label}</Pill>;
              })}
            </div>
          </>)}
        </Screen>}

        {step === 'availability' && <Screen eyebrow={`${num} · DISPONIBILITÉS`} title={<>Un plan qui tient<br />dans ta vraie vie.</>} subtitle="Choisis uniquement les jours où tu peux réellement t’entraîner.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 28 }}>
            {DAYS.map(([id, label]) => <Pill key={id} selected={days.includes(id)} onClick={() => setDays(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id].sort())}>{label}</Pill>)}
          </div>
          <SmallTitle>DURÉE D’UNE SÉANCE</SmallTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['30', '45', '60', '75', '90'].map(d => <Pill key={d} selected={duration === d} onClick={() => setDuration(d)}>{d} min</Pill>)}
          </div>
        </Screen>}

        {step === 'goal' && <Screen eyebrow={`${num} · OBJECTIF PHYSIQUE`} title={<>Qu’est-ce que tu<br />veux changer ?</>} subtitle="Choisis ta priorité côté corps. NOX s’en sert pour ton programme et tes estimations.">
          {GOALS.map(([id, label, desc]) => <Choice key={id} selected={goal === id} onClick={() => setGoal(id)}><b>{label}</b><span>{desc}</span></Choice>)}
        </Screen>}

        {step === 'horizon' && <Screen eyebrow={`${num} · TON HORIZON`} title={<>En combien de temps<br />veux-tu avancer ?</>} subtitle="Ce délai est un objectif de parcours, pas une promesse de résultat.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[['3', '3 mois'], ['6', '6 mois'], ['9', '9 mois'], ['12', '12 mois']].map(([id, label]) => <Choice key={id} selected={goalTime === id} onClick={() => setGoalTime(id)} centered>{label}</Choice>)}
          </div>
          <Choice selected={goalTime === '0'} onClick={() => setGoalTime('0')} centered>Je ne sais pas encore</Choice>
        </Screen>}

        {step === 'diet' && <Screen eyebrow={`${num} · NUTRITION`} title={<>Mange comme<br />tu aimes manger.</>} subtitle="NOX utilisera ces préférences pour personnaliser tes suggestions alimentaires.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {DIETS.map(([id, label]) => <Choice key={id} selected={dietPrefs.includes(id)} onClick={() => toggleDiet(id)} centered>{label}</Choice>)}
          </div>
        </Screen>}

        {step === 'foodHabits' && <Screen eyebrow={`${num} · TES REPAS`} title={<>La nutrition doit<br />s’adapter à toi.</>} subtitle="Renseigne uniquement ce qui compte pour toi. Tu peux laisser un champ vide.">
          <Field label="ALLERGIES / INTOLÉRANCES" value={allergies} setValue={setAllergies} placeholder="Ex. arachides, lactose..." />
          <Field label="ALIMENTS QUE TU AIMES" value={foodLikes} setValue={setFoodLikes} placeholder="Ex. poulet, riz, saumon..." />
          <Field label="ALIMENTS QUE TU N’AIMES PAS" value={foodDislikes} setValue={setFoodDislikes} placeholder="Ex. brocoli, champignons..." />
          <SmallTitle>NOMBRE DE REPAS</SmallTitle>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>{['2', '3', '4', '5'].map(n => <Pill key={n} selected={mealsPerDay === n} onClick={() => setMealsPerDay(n)}>{n}</Pill>)}</div>
          <SmallTitle>TEMPS POUR CUISINER</SmallTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{['10', '20', '30', '45', '60'].map(n => <Pill key={n} selected={cookingTime === n} onClick={() => setCookingTime(n)}>{n} min</Pill>)}</div>
        </Screen>}

        {step === 'ready' && <Screen eyebrow={`${num} · PRÊT`} title={<>NOX est prêt.</>} subtitle="Ton parcours commence aujourd’hui. Une priorité à la fois, au rythme de ta vraie vie.">
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 22, padding: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.12em', color: MUTED, marginBottom: 10 }}>TON PARCOURS</div>
            <SummaryRow label="Ce que tu travailles" value={focusLabels.join(' · ')} last={!movement && !nutrition} />
            {movement && <SummaryRow label="Entraînement" value={`${days.length}× / semaine · ${duration} min`} />}
            {movement && <SummaryRow label="Niveau" value={LEVELS.find(l => l[0] === level)?.[1] || '—'} last={!nutrition} />}
            {nutrition && <SummaryRow label="Base nutritionnelle estimée" value={preview ? `${preview.calories} kcal` : '—'} last />}
          </div>
          {habitKinds.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, color: SEC, fontSize: 12, lineHeight: 1.5 }}>
              <div style={{ width: 26, height: 26, borderRadius: 9, background: ACCENT, display: 'grid', placeItems: 'center', color: BG, flexShrink: 0 }}><Check size={14} strokeWidth={3} /></div>
              Ensuite, tu configureras {habitKinds.length > 1 ? `tes ${habitKinds.length} habitudes` : 'ton habitude'} : objectif, cible et ressources d’aide.
            </div>
          )}
        </Screen>}
      </main>

      <footer style={{ width: '100%', maxWidth: 760, margin: '0 auto', boxSizing: 'border-box', padding: '12px 16px max(24px, env(safe-area-inset-bottom))' }}>
        {error && <div style={{ marginBottom: 10, padding: '12px 14px', borderRadius: 14, background: SURFACE, border: '1px solid #5A3A3A', color: '#E9C2C2', fontSize: 12 }}>{error}</div>}
        {!last
          ? <button onClick={next} disabled={!canNext} style={primaryButton(canNext)}><span>CONTINUER</span><ChevronRight size={19} /></button>
          : <button onClick={finish} disabled={saving} style={primaryButton(!saving)}><span>{saving ? 'ENREGISTREMENT...' : 'COMMENCER'}</span>{!saving && <ChevronRight size={19} />}</button>}
      </footer>
    </div>
  );
}

function Screen({ eyebrow, title, subtitle, children }: { eyebrow: string; title: ReactNode; subtitle: string; children: ReactNode }) {
  return <section>
    <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.13em', color: MUTED, marginBottom: 11 }}>{eyebrow}</div>
    <h1 style={{ margin: 0, color: WHITE, fontSize: 'clamp(34px, 5vw, 46px)', lineHeight: .98, letterSpacing: '-.04em', fontWeight: 850 }}>{title}</h1>
    <p style={{ margin: '16px 0 28px', maxWidth: 520, color: SEC, fontSize: 14, lineHeight: 1.6 }}>{subtitle}</p>
    {children}
  </section>;
}

function Choice({ selected, onClick, children, centered = false }: { selected: boolean; onClick: () => void; children: ReactNode; centered?: boolean }) {
  return <button onClick={onClick} style={{ width: '100%', minHeight: 64, marginBottom: 10, padding: '14px 16px', boxSizing: 'border-box', borderRadius: 18, border: `1px solid ${selected ? ACCENT : SOFT}`, background: selected ? 'rgba(200,255,0,.08)' : SURFACE, color: WHITE, textAlign: centered ? 'center' : 'left', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, fontSize: 13, fontWeight: 850, cursor: 'pointer' }}>
    {children}
  </button>;
}

function Field({ label, value, setValue, type = 'text', placeholder }: { label: string; value: string; setValue: (v: string) => void; type?: string; placeholder?: string }) {
  return <div style={{ marginBottom: 17 }}>
    <label style={{ display: 'block', margin: '0 0 8px 2px', fontSize: 10, fontWeight: 900, letterSpacing: '.09em', color: MUTED }}>{label}</label>
    <input value={value} onChange={e => setValue(e.target.value)} type={type} placeholder={placeholder}
      style={{ width: '100%', height: 58, padding: '0 16px', boxSizing: 'border-box', borderRadius: 17, border: `1px solid ${SOFT}`, background: SURFACE2, color: WHITE, outline: 'none', fontSize: 15, fontWeight: 750, colorScheme: 'dark' }} />
  </div>;
}

function SmallTitle({ children }: { children: ReactNode }) {
  return <div style={{ margin: '22px 2px 10px', color: MUTED, fontSize: 10, fontWeight: 900, letterSpacing: '.1em' }}>{children}</div>;
}

function Pill({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return <button onClick={onClick} style={{ minWidth: 58, minHeight: 48, padding: '12px 15px', borderRadius: 13, border: `1px solid ${selected ? ACCENT : SOFT}`, background: selected ? 'rgba(200,255,0,.08)' : SURFACE, color: selected ? ACCENT : WHITE, fontWeight: 900, cursor: 'pointer' }}>{children}</button>;
}

function Info({ children }: { children: ReactNode }) {
  return <div style={{ marginTop: 6, padding: '13px 14px', borderRadius: 15, background: SURFACE2, border: `1px solid ${SOFT}`, color: SEC, fontSize: 12, lineHeight: 1.5, fontWeight: 650 }}>{children}</div>;
}

function SummaryRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '12px 0', borderBottom: last ? 'none' : `1px solid ${SOFT}` }}>
    <span style={{ color: SEC, fontSize: 12 }}>{label}</span><strong style={{ color: WHITE, fontSize: 12, textAlign: 'right' }}>{value}</strong>
  </div>;
}

function primaryButton(enabled: boolean): CSSProperties {
  return {
    width: '100%', minHeight: 60, padding: '0 18px', border: 0, borderRadius: 14,
    background: enabled ? ACCENT : '#2B2F2C', color: enabled ? BG : MUTED,
    fontSize: 13, fontWeight: 800, letterSpacing: '.035em', display: 'flex',
    alignItems: 'center', justifyContent: 'space-between', cursor: enabled ? 'pointer' : 'not-allowed',
  };
}
