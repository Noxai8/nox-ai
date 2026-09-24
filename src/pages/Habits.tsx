import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, Plus, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const ACCENT = '#C8FF00';
const BG = '#F7F8F4';
const WHITE = '#FFFFFF';
const BLACK = '#0B0B0B';
const MUTED = '#7A7F76';
const BORDER = '#E8EAE4';
const SOFT_LIME = '#F0FFD0';

type Habit = {
  id: string;
  title: string;
  detail: string;
  category: string;
};

const BASE_HABITS: Habit[] = [
  { id: 'water', title: 'Hydratation', detail: 'Boire régulièrement dans la journée', category: 'RÉCUPÉRATION' },
  { id: 'steps', title: 'Bouger chaque jour', detail: 'Ajouter de la marche et du mouvement à ta journée', category: 'MOUVEMENT' },
  { id: 'protein', title: 'Priorité protéines', detail: 'Inclure une source de protéines dans tes repas principaux', category: 'NUTRITION' },
  { id: 'sleep', title: 'Préparer ton sommeil', detail: 'Créer une fin de journée plus calme et régulière', category: 'RÉCUPÉRATION' },
];

export default function Habits() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [goal, setGoal] = useState('');
  const [done, setDone] = useState<string[]>([]);
  const [custom, setCustom] = useState<Habit[]>([]);
  const [newHabit, setNewHabit] = useState('');

  const todayKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    if (!user) return;

    supabase
      .from('profiles')
      .select('goal_type')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => setGoal(data?.goal_type || ''));

    try {
      const saved = localStorage.getItem(`nox-habits-${user.id}-${todayKey}`);
      if (saved) setDone(JSON.parse(saved));

      const savedCustom = localStorage.getItem(`nox-custom-habits-${user.id}`);
      if (savedCustom) setCustom(JSON.parse(savedCustom));
    } catch {}
  }, [user, todayKey]);

  const habits = [...BASE_HABITS, ...custom];
  const completed = habits.filter((h) => done.includes(h.id)).length;
  const progress = habits.length ? Math.round((completed / habits.length) * 100) : 0;

  const toggle = (id: string) => {
    if (!user) return;
    const next = done.includes(id) ? done.filter((x) => x !== id) : [...done, id];
    setDone(next);
    localStorage.setItem(`nox-habits-${user.id}-${todayKey}`, JSON.stringify(next));
  };

  const addHabit = () => {
    if (!user || !newHabit.trim()) return;

    const habit: Habit = {
      id: `custom-${Date.now()}`,
      title: newHabit.trim(),
      detail: 'Une action personnelle à tenir régulièrement',
      category: 'PERSONNEL',
    };

    const next = [...custom, habit];
    setCustom(next);
    setNewHabit('');
    localStorage.setItem(`nox-custom-habits-${user.id}`, JSON.stringify(next));
  };

  const goalLabel =
    goal === 'perdre_gras' ? 'perte de gras' :
    goal === 'prendre_muscle' ? 'prise de muscle' :
    goal === 'recomposition' ? 'recomposition corporelle' :
    goal === 'force' ? 'gain de force' :
    goal === 'performance' ? 'performance' :
    goal === 'maintien' ? 'maintien de ta forme' :
    'transformation';

  const keyHabit = useMemo(() => {
    const unfinished = (id: string) => !done.includes(id);

    if ((goal === 'prendre_muscle' || goal === 'recomposition') && unfinished('protein')) {
      return BASE_HABITS.find((h) => h.id === 'protein')!;
    }
    if (goal === 'perdre_gras' && unfinished('steps')) {
      return BASE_HABITS.find((h) => h.id === 'steps')!;
    }
    if ((goal === 'performance' || goal === 'force') && unfinished('sleep')) {
      return BASE_HABITS.find((h) => h.id === 'sleep')!;
    }

    return habits.find((h) => !done.includes(h.id)) || null;
  }, [goal, done, habits]);

  return (
    <div style={{ minHeight: '100dvh', background: BG, color: BLACK, paddingBottom: 36 }}>
      <header
        style={{
          maxWidth: 620,
          margin: '0 auto',
          padding: '20px 20px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button onClick={() => navigate(-1)} style={iconButton} aria-label="Retour">
          <ArrowLeft size={19} />
        </button>
        <div style={{ fontSize: 19, fontWeight: 950, letterSpacing: '-.04em' }}>
          NOX<span style={{ color: '#9ED100' }}>.</span>
        </div>
        <div style={{ width: 42 }} />
      </header>

      <main style={{ maxWidth: 620, margin: '0 auto', padding: '26px 20px' }}>
        <div style={{ fontSize: 10, fontWeight: 950, letterSpacing: '.13em', color: '#969C91' }}>
          HABITUDES · AUJOURD’HUI
        </div>

        <h1
          style={{
            margin: '9px 0 12px',
            fontSize: 'clamp(38px,10vw,52px)',
            lineHeight: .94,
            letterSpacing: '-.055em',
            fontWeight: 950,
          }}
        >
          LES PETITES CHOSES
          <br />
          QUI FONT LE RESTE.
        </h1>

        <p style={{ margin: '0 0 28px', color: MUTED, fontSize: 14, lineHeight: 1.6 }}>
          NOX t’aide à garder les comportements qui soutiennent ta {goalLabel}. Ici, la régularité compte plus que la perfection.
        </p>

        {keyHabit ? (
          <section
            style={{
              background: ACCENT,
              borderRadius: 28,
              padding: 22,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 10,
                fontWeight: 950,
                letterSpacing: '.11em',
              }}
            >
              <Sparkles size={15} />
              HABITUDE CLÉ
            </div>

            <div
              style={{
                marginTop: 13,
                fontSize: 27,
                lineHeight: 1.02,
                fontWeight: 950,
                letterSpacing: '-.035em',
              }}
            >
              {keyHabit.title.toUpperCase()}.
            </div>

            <div style={{ marginTop: 9, maxWidth: 440, color: '#3F451E', fontSize: 13, lineHeight: 1.5 }}>
              {keyHabit.detail}
            </div>

            <button
              type="button"
              onClick={() => toggle(keyHabit.id)}
              style={{
                marginTop: 18,
                minHeight: 48,
                padding: '0 17px',
                border: 0,
                borderRadius: 16,
                background: BLACK,
                color: WHITE,
                fontWeight: 900,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              MARQUER COMME FAIT
            </button>
          </section>
        ) : (
          <section
            style={{
              background: SOFT_LIME,
              borderRadius: 28,
              padding: 22,
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 950, letterSpacing: '.11em' }}>JOURNÉE</div>
            <div style={{ marginTop: 10, fontSize: 27, fontWeight: 950, letterSpacing: '-.035em' }}>
              TES HABITUDES SONT FAITES.
            </div>
            <div style={{ marginTop: 8, color: MUTED, fontSize: 13, lineHeight: 1.5 }}>
              Pas besoin d’en faire plus. Continue simplement ton plan.
            </div>
          </section>
        )}

        <section
          style={{
            background: BLACK,
            color: WHITE,
            borderRadius: 28,
            padding: 22,
            marginBottom: 28,
          }}
        >
          <div style={{ fontSize: 10, color: '#9A9D97', fontWeight: 900, letterSpacing: '.11em' }}>
            AUJOURD’HUI
          </div>

          <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 7 }}>
            <div style={{ fontSize: 42, lineHeight: 1, fontWeight: 950, letterSpacing: '-.05em' }}>
              {completed}/{habits.length}
            </div>
            <div style={{ color: '#A8AAA6', fontSize: 12 }}>habitudes</div>
          </div>

          <div style={{ height: 8, background: '#282828', borderRadius: 999, marginTop: 19, overflow: 'hidden' }}>
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: ACCENT,
                borderRadius: 999,
                transition: 'width .25s ease',
              }}
            />
          </div>

          <div style={{ marginTop: 9, color: '#A8AAA6', fontSize: 11 }}>
            {progress === 100 ? 'Journée complétée.' : `${progress}% réalisé aujourd’hui`}
          </div>
        </section>

        <div style={{ margin: '0 2px 12px', fontSize: 11, fontWeight: 950, letterSpacing: '.09em' }}>
          MES HABITUDES
        </div>

        {habits.map((habit) => {
          const checked = done.includes(habit.id);

          return (
            <button
              key={habit.id}
              type="button"
              onClick={() => toggle(habit.id)}
              style={{
                width: '100%',
                border: `1px solid ${checked ? '#DCEEA1' : BORDER}`,
                background: checked ? '#F6FFDE' : WHITE,
                borderRadius: 22,
                padding: 17,
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                textAlign: 'left',
                color: BLACK,
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  flex: '0 0 auto',
                  borderRadius: 14,
                  background: checked ? ACCENT : '#F0F2EC',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                {checked ? <Check size={19} strokeWidth={3} /> : <ChevronRight size={18} />}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: MUTED, fontWeight: 900, letterSpacing: '.09em' }}>
                  {habit.category}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 15,
                    fontWeight: 900,
                    textDecoration: checked ? 'line-through' : 'none',
                    textDecorationColor: '#A8AD9F',
                  }}
                >
                  {habit.title}
                </div>
                <div style={{ marginTop: 4, fontSize: 11.5, color: MUTED, lineHeight: 1.4 }}>
                  {habit.detail}
                </div>
              </div>
            </button>
          );
        })}

        <section style={{ marginTop: 26 }}>
          <div style={{ fontSize: 11, fontWeight: 950, letterSpacing: '.09em', marginBottom: 10 }}>
            AJOUTER UNE HABITUDE
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={newHabit}
              onChange={(e) => setNewHabit(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addHabit()}
              placeholder="Ex. 10 min de marche après déjeuner"
              style={{
                flex: 1,
                minWidth: 0,
                height: 54,
                border: `1px solid ${BORDER}`,
                borderRadius: 16,
                padding: '0 14px',
                background: WHITE,
                color: BLACK,
                outline: 'none',
                fontSize: 12,
                fontWeight: 700,
              }}
            />

            <button
              type="button"
              onClick={addHabit}
              disabled={!newHabit.trim()}
              aria-label="Ajouter l'habitude"
              style={{
                width: 54,
                border: 0,
                borderRadius: 16,
                background: newHabit.trim() ? BLACK : '#E3E5DF',
                color: newHabit.trim() ? ACCENT : '#A1A59C',
                display: 'grid',
                placeItems: 'center',
                cursor: newHabit.trim() ? 'pointer' : 'default',
              }}
            >
              <Plus size={20} />
            </button>
          </div>
        </section>

        <button
          type="button"
          onClick={() => navigate('/home')}
          style={{
            width: '100%',
            minHeight: 58,
            marginTop: 30,
            border: 0,
            borderRadius: 18,
            background: BLACK,
            color: WHITE,
            fontWeight: 950,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 18px',
            cursor: 'pointer',
          }}
        >
          <span>RETOURNER À AUJOURD’HUI</span>
          <ChevronRight size={19} color={ACCENT} />
        </button>
      </main>
    </div>
  );
}

const iconButton = {
  width: 42,
  height: 42,
  borderRadius: 14,
  border: `1px solid ${BORDER}`,
  background: WHITE,
  color: BLACK,
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
} as const;
