import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, Flame, Plus, Sparkles, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const ACCENT = '#C8FF00';
const BG = '#F7F8F4';
const WHITE = '#FFFFFF';
const BLACK = '#0B0B0B';
const MUTED = '#777D73';
const BORDER = '#E7EAE2';

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
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('goal_type').eq('id', user.id).maybeSingle()
      .then(({ data }) => setGoal(data?.goal_type || ''));

    try {
      const saved = localStorage.getItem(`nox-habits-${user.id}-${todayKey}`);
      if (saved) setDone(JSON.parse(saved));
      const savedCustom = localStorage.getItem(`nox-custom-habits-${user.id}`);
      if (savedCustom) setCustom(JSON.parse(savedCustom));
    } catch {}
  }, [user, todayKey]);

  const habits = [...BASE_HABITS, ...custom];
  const completed = habits.filter(h => done.includes(h.id)).length;
  const progress = habits.length ? Math.round((completed / habits.length) * 100) : 0;

  const toggle = (id: string) => {
    if (!user) return;
    const next = done.includes(id) ? done.filter(x => x !== id) : [...done, id];
    setDone(next);
    localStorage.setItem(`nox-habits-${user.id}-${todayKey}`, JSON.stringify(next));
  };

  const addHabit = () => {
    if (!user || !newHabit.trim()) return;
    const h: Habit = {
      id: `custom-${Date.now()}`,
      title: newHabit.trim(),
      detail: 'Une action personnelle à tenir régulièrement',
      category: 'PERSONNEL',
    };
    const next = [...custom, h];
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
    goal === 'maintien' ? 'maintien de ta forme' : 'transformation';

  return (
    <div style={{ minHeight: '100dvh', background: BG, color: BLACK, paddingBottom: 36 }}>
      <header style={{ maxWidth: 620, margin: '0 auto', padding: '20px 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => navigate(-1)} style={iconButton}><ArrowLeft size={19}/></button>
        <div style={{ fontSize: 19, fontWeight: 950, letterSpacing: '-.04em' }}>NOX<span style={{ color: '#9ED100' }}>.</span></div>
        <div style={{ width: 42 }} />
      </header>

      <main style={{ maxWidth: 620, margin: '0 auto', padding: '26px 20px' }}>
        <div style={{ fontSize: 10, fontWeight: 950, letterSpacing: '.13em', color: '#969C91' }}>HABITUDES · AUJOURD'HUI</div>
        <h1 style={{ margin: '9px 0 12px', fontSize: 'clamp(36px,10vw,48px)', lineHeight: .95, letterSpacing: '-.06em', fontWeight: 950 }}>
          Les petites actions<br/>font la différence.
        </h1>
        <p style={{ margin: '0 0 26px', color: MUTED, fontSize: 14, lineHeight: 1.6 }}>
          NOX t'aide à construire les comportements qui soutiennent ta {goalLabel}. Pas besoin d'être parfait : cherche surtout la régularité.
        </p>

        <section style={{ background: BLACK, color: WHITE, borderRadius: 28, padding: 22, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ color: '#8E928B', fontSize: 10, fontWeight: 900, letterSpacing: '.11em' }}>TON ÉLAN DU JOUR</div>
              <div style={{ marginTop: 7, fontSize: 27, fontWeight: 950 }}>{completed}/{habits.length} habitudes</div>
            </div>
            <div style={{ width: 54, height: 54, borderRadius: 18, background: ACCENT, color: BLACK, display: 'grid', placeItems: 'center' }}>
              <Flame size={25} />
            </div>
          </div>
          <div style={{ height: 8, background: '#282828', borderRadius: 999, marginTop: 19, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: ACCENT, borderRadius: 999, transition: 'width .2s ease' }} />
          </div>
          <div style={{ marginTop: 8, color: '#A8AAA6', fontSize: 11 }}>{progress}% réalisé aujourd'hui</div>
        </section>

        <section style={{ background: '#F0FFD0', border: '1px solid #DDF59C', borderRadius: 22, padding: 17, marginBottom: 25 }}>
          <div style={{ display: 'flex', gap: 9, alignItems: 'center', fontSize: 10, fontWeight: 950, letterSpacing: '.1em', color: '#687600' }}>
            <Sparkles size={15}/> CONSEIL NOX
          </div>
          <div style={{ marginTop: 8, fontWeight: 900, fontSize: 15, lineHeight: 1.35 }}>Aujourd'hui, vise la continuité plutôt que la perfection.</div>
          <div style={{ marginTop: 6, color: '#69715F', fontSize: 11.5, lineHeight: 1.55 }}>Une habitude simple répétée régulièrement peut mieux soutenir ton parcours qu'un effort exceptionnel impossible à maintenir.</div>
        </section>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 2px 11px' }}>
          <div style={{ fontSize: 11, fontWeight: 950, letterSpacing: '.08em' }}>MES HABITUDES</div>
          <Target size={17}/>
        </div>

        {habits.map(h => {
          const checked = done.includes(h.id);
          return (
            <button key={h.id} onClick={() => toggle(h.id)} style={{
              width: '100%', border: `1px solid ${checked ? '#D7ED8C' : BORDER}`, background: checked ? '#F5FFD9' : WHITE,
              borderRadius: 20, padding: 16, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 13, textAlign: 'left', color: BLACK
            }}>
              <div style={{ width: 36, height: 36, flex: '0 0 auto', borderRadius: 12, background: checked ? ACCENT : '#F0F2EC', display: 'grid', placeItems: 'center' }}>
                {checked ? <Check size={18} strokeWidth={3}/> : <ChevronRight size={17}/>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: MUTED, fontWeight: 900, letterSpacing: '.09em' }}>{h.category}</div>
                <div style={{ marginTop: 3, fontSize: 14, fontWeight: 900 }}>{h.title}</div>
                <div style={{ marginTop: 3, fontSize: 11, color: MUTED, lineHeight: 1.4 }}>{h.detail}</div>
              </div>
            </button>
          );
        })}

        <section style={{ marginTop: 23 }}>
          <div style={{ fontSize: 11, fontWeight: 950, letterSpacing: '.08em', marginBottom: 10 }}>AJOUTER UNE HABITUDE</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={newHabit} onChange={e => setNewHabit(e.target.value)} onKeyDown={e => e.key === 'Enter' && addHabit()}
              placeholder="Ex. 10 min de marche après déjeuner"
              style={{ flex: 1, minWidth: 0, height: 54, border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: '0 14px', background: WHITE, color: BLACK, outline: 'none', fontSize: 12, fontWeight: 700 }} />
            <button onClick={addHabit} disabled={!newHabit.trim()} style={{ width: 54, border: 0, borderRadius: 16, background: newHabit.trim() ? BLACK : '#E3E5DF', color: newHabit.trim() ? ACCENT : '#A1A59C', display: 'grid', placeItems: 'center' }}>
              <Plus size={20}/>
            </button>
          </div>
        </section>

        <button onClick={() => navigate('/home')} style={{ width: '100%', minHeight: 58, marginTop: 28, border: 0, borderRadius: 18, background: ACCENT, color: BLACK, fontWeight: 950, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px' }}>
          <span>RETOURNER À AUJOURD'HUI</span><ChevronRight size={19}/>
        </button>
      </main>
    </div>
  );
}

const iconButton = {
  width: 42, height: 42, borderRadius: 14, border: `1px solid ${BORDER}`,
  background: WHITE, color: BLACK, display: 'grid', placeItems: 'center', cursor: 'pointer'
} as const;
