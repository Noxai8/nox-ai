import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BarChart3, WandSparkles, Medal, Apple, Bot, House, Dumbbell } from 'lucide-react';
import NoxMascot from '../components/NoxMascot';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

// ─── BottomNav ───────────────────────────────────────────────────────────────
export function BottomNav({ active }: { active: string }) {
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);

  const items = [
    { id: 'home', label: 'Home', icon: House, path: '/home' },
    { id: 'training', label: 'Train', icon: Dumbbell, path: '/program' },
    { id: 'fuel', label: 'Fuel', icon: Apple, path: '/fuel' },
    { id: 'coach', label: 'Coach', icon: Bot, path: '/coach' },
    { id: 'more', label: 'Plus', icon: null, path: '' },
  ];

  const moreCategories = [
    {
      title: 'CORPS & SUIVI',
      items: [
        { icon: BarChart3, label: 'Body', path: '/body' },
        { icon: WandSparkles, label: 'Future', path: '/future' },
        { icon: '🌙', label: 'Recovery', path: '/recovery' },
        { icon: '😊', label: 'Humeur', path: '/mood' },
      ],
    },
    {
      title: 'NUTRITION',
      items: [
        { icon: '🧊', label: 'Fuel IA', path: '/fuel-ai' },
        { icon: '👨‍🍳', label: 'Recettes', path: '/recipes' },
        { icon: '📅', label: 'Planifier', path: '/meal-planner' },
        { icon: '⏱️', label: 'Jeûne', path: '/fasting' },
      ],
    },
    {
      title: 'COMPÉTITION',
      items: [
        { icon: Medal, label: 'Play', path: '/play' },
        { icon: '🏆', label: 'Classement', path: '/leaderboard' },
        { icon: '👥', label: 'Partenaire', path: '/partner' },
        { icon: '📋', label: 'Bilan', path: '/weekly-review' },
      ],
    },
    {
      title: 'PARTAGE & RÉGLAGES',
      items: [
        { icon: '📤', label: 'Timeline', path: '/share-timeline' },
        { icon: '⚙️', label: 'Réglages', path: '/settings' },
        { icon: '🔔', label: 'Notifications', path: '/notification-settings' },
        { icon: '🎯', label: 'Calibration', path: '/calibration' },
      ],
    },
  ];
  const moreItems = moreCategories.flatMap(c => c.items);

  return (
    <>
      {showMore && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.93)', zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
          onClick={() => setShowMore(false)}>
          <div style={{ background: '#0d0d0d', borderRadius: '20px 20px 0 0', padding: '20px 20px 90px', maxHeight: '75vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            {moreCategories.map(cat => (
              <div key={cat.title} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10, fontWeight: 800 }}>{cat.title}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {cat.items.map(item => {
                    const isString = typeof item.icon === 'string';
                    return (
                      <button key={item.path} onClick={() => { navigate(item.path); setShowMore(false); }}
                        style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, padding: '14px 8px', textAlign: 'center', cursor: 'pointer', touchAction: 'manipulation' }}>
                        {isString
                          ? <div style={{ fontSize: 22, marginBottom: 5 }}>{item.icon as string}</div>
                          : (() => { const I = item.icon as any; return <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 5 }}><I size={22} color={ACCENT} /></div>; })()
                        }
                        <div style={{ fontSize: 9.5, color: '#888', fontWeight: 700, lineHeight: 1.2 }}>{item.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 0, width: '100%', maxWidth: 560, zIndex: 100, padding: '8px 10px max(10px, env(safe-area-inset-bottom))', background: 'rgba(7,7,7,.94)', backdropFilter: 'blur(18px)', borderTop: '1px solid rgba(255,255,255,.07)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 2, alignItems: 'end' }}>
          {items.map(item => {
            const selected = active === item.id || (item.id === 'more' && showMore);
            const Icon = item.icon;
            return (
              <button key={item.id}
                onClick={() => item.id === 'more' ? setShowMore(s => !s) : navigate(item.path)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '8px 0 3px', color: selected ? ACCENT : '#6f6f6f', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0, touchAction: 'manipulation' }}>
                <div style={{ width: 28, height: 28, borderRadius: 10, display: 'grid', placeItems: 'center', background: selected ? 'rgba(200,255,0,.11)' : 'transparent' }}>
                  {Icon ? <Icon size={18} strokeWidth={selected ? 2.4 : 1.9} /> : <span style={{ fontSize: 18 }}>☰</span>}
                </div>
                <span style={{ fontSize: 8.5, lineHeight: 1, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', whiteSpace: 'nowrap', color: selected ? ACCENT : '#6f6f6f' }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── NoxScore ────────────────────────────────────────────────────────────────
function NoxScore({ score }: { score: number }) {
  const safe = Math.max(0, Math.min(100, score));
  const degrees = safe * 3.6;
  return (
    <div style={{ width: 72, height: 72, borderRadius: '50%', padding: 4, background: `conic-gradient(${ACCENT} 0deg ${degrees}deg, #1a1a1a ${degrees}deg 360deg)`, flexShrink: 0 }}>
      <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: ACCENT, lineHeight: 1 }}>{safe}</div>
        <div style={{ fontSize: 8, color: '#555', fontWeight: 700, letterSpacing: '.04em' }}>NOX</div>
      </div>
    </div>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [program, setProgram] = useState<any>(null);
  const [todayEntries, setTodayEntries] = useState<any[]>([]);
  const [targets, setTargets] = useState<any>(null);
  const [workoutCount, setWorkoutCount] = useState(0);
  const [prs, setPrs] = useState(0);
  const [bodyLog, setBodyLog] = useState<any>(null);
  const [brief, setBrief] = useState<string | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [timeSlot, setTimeSlot] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('morning');

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) { setGreeting('Bonjour'); setTimeSlot('morning'); }
    else if (h < 17) { setGreeting('Bon après-midi'); setTimeSlot('afternoon'); }
    else if (h < 21) { setGreeting('Bonsoir'); setTimeSlot('evening'); }
    else { setGreeting('Bonne nuit'); setTimeSlot('night'); }
  }, []);

  useEffect(() => { if (user) loadAll(); }, [user]);

  const loadAll = async () => {
    const now = new Date();
    const localDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const startOfDay = new Date(localDate + 'T00:00:00').toISOString();
    const endOfDay = new Date(localDate + 'T23:59:59').toISOString();
    const weekStart = new Date(Date.now() - 7 * 86400000).toISOString();

    const [
      { data: prof },
      { data: prog },
      { data: entries },
      { data: tgts },
      { data: workouts },
      { data: prData },
      { data: body },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle(),
      supabase.from('workout_programs').select('*').eq('user_id', user!.id).eq('is_active', true).maybeSingle(),
      supabase.from('food_entries').select('calories, protein, carbs, fat, food_name').eq('user_id', user!.id).gte('created_at', startOfDay).lte('created_at', endOfDay),
      supabase.from('nutrition_targets').select('*').eq('user_id', user!.id).maybeSingle(),
      supabase.from('workouts').select('id').eq('user_id', user!.id).eq('status', 'completed').gte('created_at', weekStart),
      supabase.from('personal_records').select('id').eq('user_id', user!.id).gte('created_at', weekStart),
      supabase.from('body_logs').select('weight, created_at').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(1),
    ]);

    setProfile(prof);
    setProgram(prog);
    setTodayEntries(entries || []);
    setTargets(tgts);
    setWorkoutCount(workouts?.length || 0);
    setPrs(prData?.length || 0);
    setBodyLog(body?.[0] || null);
  };

  // Calculs nutrition du jour
  const todayKcal = todayEntries.reduce((s, e) => s + (e.calories || 0), 0);
  const todayProtein = todayEntries.reduce((s, e) => s + (e.protein || 0), 0);
  const targetKcal = targets?.calories || 2200;
  const targetProtein = targets?.protein || 160;
  const kcalLeft = Math.max(0, targetKcal - todayKcal);
  const kcalPct = Math.min(100, (todayKcal / targetKcal) * 100);

  // NOX Score
  const noxScore = Math.min(100, Math.round(
    (Math.min(workoutCount / 3, 1) * 40) +
    (Math.min(kcalPct / 100, 1) * 30) +
    (profile?.streak_days > 0 ? Math.min(profile.streak_days / 7, 1) * 30 : 0)
  ));

  // Séance du jour
  const sessions = program?.program_json?.sessions || [];
  const todayIndex = new Date().getDay(); // 0=dim
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const todaySession = sessions.find((s: any) =>
    s.day?.toLowerCase().includes(dayNames[todayIndex].toLowerCase().slice(0, 3))
  ) || sessions[0];
  const isRestDay = !todaySession;

  const generateBrief = async () => {
    setLoadingBrief(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const isEvening = timeSlot === 'evening' || timeSlot === 'night';
      const promptType = isEvening ? 'evening_recap' : 'morning_brief';

      const prompt = isEvening
        ? `Tu es NOX, coach IA. Génère un Evening Recap personnalisé en 2-3 phrases max.
DONNÉES DU JOUR :
- Calories : ${todayKcal}/${targetKcal} kcal
- Protéines : ${Math.round(todayProtein)}/${targetProtein}g
- Séances cette semaine : ${workoutCount}
- Streak : ${profile?.streak_days || 0} jours
- Objectif : ${profile?.goal_type || 'transformation'}
Bilan direct, encourageant, sans fioriture. Pas de markdown.`
        : `Tu es NOX, coach IA. Génère un Morning Brief personnalisé en 2-3 phrases max.
DONNÉES :
- Prénom : ${profile?.display_name?.split(' ')[0] || 'Athlète'}
- Objectif : ${profile?.goal_type || 'transformation'}
- Séance du jour : ${todaySession?.name || 'Repos'}
- Streak : ${profile?.streak_days || 0} jours
- Calories restantes hier : ${kcalLeft} kcal
Message motivant pour bien démarrer la journée. Pas de markdown.`;

      const resp = await fetch('https://zpxrsmnpcyzafawlweyl.supabase.co/functions/v1/generate-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ prompt }),
      });
      const data = await resp.json();
      const text = data?.content?.[0]?.text || data?.data?.content?.[0]?.text || '';
      if (text) setBrief(text.slice(0, 200));
    } catch {}
    setLoadingBrief(false);
  };

  const name = profile?.display_name?.split(' ')[0] || '';

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 90 }}>
      {/* ── HEADER ── */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, color: '#555', fontWeight: 500 }}>{greeting}{name ? `, ${name}` : ''} 👋</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>
              {timeSlot === 'morning' ? 'ON ATTAQUE' : timeSlot === 'afternoon' ? 'EN ROUTE' : timeSlot === 'evening' ? 'BILAN DU JOUR' : 'BONNE NUIT'}
            </div>
          </div>
          <NoxScore score={noxScore} />
        </div>

        {/* ── MORNING BRIEF / EVENING RECAP ── */}
        {brief ? (
          <div style={{ background: ACCENT + '0d', border: '1px solid ' + ACCENT + '33', borderRadius: 14, padding: '12px 16px', marginBottom: 14, position: 'relative' }}>
            <div style={{ fontSize: 10, color: ACCENT, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 5 }}>
              {timeSlot === 'evening' || timeSlot === 'night' ? '🌙 EVENING RECAP' : '☀️ MORNING BRIEF'}
            </div>
            <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.6 }}>{brief}</div>
            <button onClick={() => setBrief(null)} style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
        ) : (
          <button onClick={generateBrief} disabled={loadingBrief}
            style={{ width: '100%', padding: '10px 16px', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, color: '#555', fontSize: 12, fontWeight: 700, cursor: 'pointer', marginBottom: 14, textAlign: 'left', touchAction: 'manipulation' }}>
            {loadingBrief ? '⏳ NOX prépare ton brief...' : timeSlot === 'evening' || timeSlot === 'night' ? '🌙 Voir mon Evening Recap' : '☀️ Voir mon Morning Brief'}
          </button>
        )}
      </div>

      {/* ── SÉANCE DU JOUR ── */}
      <div style={{ padding: '0 20px', marginBottom: 12 }}>
        {todaySession ? (
          <button onClick={() => navigate('/program')}
            style={{ width: '100%', background: ACCENT + '0f', border: '1px solid ' + ACCENT + '44', borderRadius: 16, padding: '16px 20px', cursor: 'pointer', textAlign: 'left', touchAction: 'manipulation' }}>
            <div style={{ fontSize: 10, color: ACCENT, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 5 }}>
              ⚡ SÉANCE DU JOUR
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 4 }}>{todaySession.name}</div>
            <div style={{ fontSize: 12, color: '#666' }}>
              {todaySession.exercises?.length || 0} exercices
              {sessions.indexOf(todaySession) >= 0 ? ` · Séance ${sessions.indexOf(todaySession) + 1}/${sessions.length}` : ''}
            </div>
          </button>
        ) : (
          <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: '16px 20px' }}>
            <div style={{ fontSize: 10, color: '#555', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 5 }}>AUJOURD'HUI</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Jour de repos 🌿</div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 3 }}>Récupère bien. Le muscle se construit au repos.</div>
          </div>
        )}
      </div>

      {/* ── CALORIES DU JOUR ── */}
      <div style={{ padding: '0 20px', marginBottom: 12 }}>
        <button onClick={() => navigate('/fuel')}
          style={{ width: '100%', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: '16px 20px', cursor: 'pointer', textAlign: 'left', touchAction: 'manipulation' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: '#555', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em' }}>NUTRITION DU JOUR</div>
            <div style={{ fontSize: 12, color: ACCENT, fontWeight: 700 }}>{todayKcal} / {targetKcal} kcal</div>
          </div>
          {/* Barre progression */}
          <div style={{ height: 6, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
            <div style={{ height: '100%', width: kcalPct + '%', background: kcalPct > 100 ? '#ff5555' : ACCENT, borderRadius: 3, transition: 'width .4s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>{kcalLeft}</div>
              <div style={{ fontSize: 9, color: '#555' }}>kcal restantes</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>{Math.round(todayProtein)}<span style={{ fontSize: 10, color: '#555' }}>g</span></div>
              <div style={{ fontSize: 9, color: '#555' }}>protéines</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>{todayEntries.length}</div>
              <div style={{ fontSize: 9, color: '#555' }}>repas</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: kcalPct > 90 ? ACCENT : '#fff' }}>{Math.round(kcalPct)}%</div>
              <div style={{ fontSize: 9, color: '#555' }}>objectif</div>
            </div>
          </div>
          {todayEntries.length === 0 && (
            <div style={{ fontSize: 12, color: '#333', marginTop: 8, textAlign: 'center' }}>
              Rien enregistré aujourd'hui — appuie pour ajouter ton premier repas
            </div>
          )}
        </button>
      </div>

      {/* ── STATS SEMAINE ── */}
      <div style={{ padding: '0 20px', marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { label: 'Séances', value: workoutCount, unit: '/sem', color: workoutCount >= 3 ? ACCENT : '#fff', path: '/program' },
            { label: 'PR', value: prs, unit: ' cette sem.', color: prs > 0 ? ACCENT : '#fff', path: '/play' },
            { label: 'Streak', value: profile?.streak_days || 0, unit: 'j', color: (profile?.streak_days || 0) > 0 ? '#ff6600' : '#fff', path: '/play' },
          ].map(({ label, value, unit, color, path }) => (
            <button key={label} onClick={() => navigate(path)}
              style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: '14px 10px', textAlign: 'center', cursor: 'pointer', touchAction: 'manipulation' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}<span style={{ fontSize: 11, color: '#555' }}>{unit}</span></div>
              <div style={{ fontSize: 10, color: '#555', fontWeight: 700, marginTop: 3, textTransform: 'uppercase' }}>{label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── MASCOTTE ── */}
      <div style={{ padding: '0 20px', marginBottom: 12 }}>
        <NoxMascot context={isRestDay ? 'rest' : prs > 0 ? 'pr' : (profile?.streak_days || 0) > 3 ? 'streak' : 'training'} compact />
      </div>

      {/* ── CALIBRATION DÉBUTANT ── */}
      {profile?.experience_level === 'débutant' && !profile?.calibration_completed && workoutCount < 5 && (
        <div style={{ padding: '0 20px', marginBottom: 12 }}>
          <button onClick={() => navigate('/calibration')}
            style={{ width: '100%', background: '#ffaa0011', border: '1px solid #ffaa0044', borderRadius: 16, padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', touchAction: 'manipulation' }}>
            <div style={{ fontSize: 28, flexShrink: 0 }}>🎯</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#ffaa00', marginBottom: 2 }}>CALIBRATION SEMAINE 1</div>
              <div style={{ fontSize: 12, color: '#888' }}>Trouve tes vraies charges pour que NOX calibre ton programme</div>
            </div>
          </button>
        </div>
      )}

      {/* ── ACCÈS RAPIDE ── */}
      <div style={{ padding: '0 20px', marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: '#555', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>ACCÈS RAPIDE</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {[
            { label: 'Scan repas', icon: '📸', path: '/food-scan', desc: 'Photo → calories IA' },
            { label: 'Fuel IA', icon: '🧊', path: '/fuel-ai', desc: 'Frigo · Repas · Courses' },
            { label: 'Classement', icon: '🏆', path: '/leaderboard', desc: 'Compétition amis' },
            { label: 'NOX Future', icon: '🔮', path: '/future', desc: 'Ta projection physique' },
          ].map(({ label, icon, path, desc }) => (
            <button key={label} onClick={() => navigate(path)}
              style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: '14px 12px', textAlign: 'left', cursor: 'pointer', touchAction: 'manipulation' }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: 13, color: '#fff', fontWeight: 800 }}>{label}</div>
              <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── BILAN HEBDO CTA ── */}
      <div style={{ padding: '0 20px', marginBottom: 12 }}>
        <button onClick={() => navigate('/weekly-review')}
          style={{ width: '100%', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', touchAction: 'manipulation' }}>
          <div style={{ fontSize: 24, flexShrink: 0 }}>📋</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>Bilan hebdomadaire</div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Analyse ta semaine · NOX adapte ton programme</div>
          </div>
          <div style={{ marginLeft: 'auto', color: '#333', fontSize: 16 }}>→</div>
        </button>
      </div>

      <BottomNav active="home" />
    </div>
  );
}
