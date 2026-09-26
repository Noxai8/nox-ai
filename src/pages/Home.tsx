import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import {
  Camera, ChevronRight, CircleUserRound,
  Droplets, Dumbbell, Plus, Ruler, Scale,
  ScanLine, Utensils, X,
} from 'lucide-react';
import { usePlan } from '../lib/usePlan';

const ACCENT = '#C8FF00';
const BG     = '#F7F8F4';
const WHITE  = '#FFFFFF';
const BLACK  = '#0B0B0B';
const MUTED  = '#7A7F76';
const BORDER = '#E8EAE4';
const LIME   = '#F0FFD0';

type NavActive = 'home' | 'nutrition' | 'progress' | 'moi';

export function BottomNav({ active }: { active: NavActive | string }) {
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);

  const quickActions = [
    { label: 'Scanner un repas',  icon: Camera,   path: '/food-scan' },
    { label: 'Ajouter un aliment',icon: Utensils, path: '/fuel' },
    { label: 'Eau',               icon: Droplets, path: '/fuel' },
    { label: 'Poids',             icon: Scale,    path: '/body' },
    { label: 'Mensurations',      icon: Ruler,    path: '/body' },
    { label: 'Code-barres',       icon: ScanLine, path: '/barcode-scanner' },
    { label: 'Entrainement',      icon: Dumbbell, path: '/program' },
    { label: 'Photo',             icon: Camera,   path: '/progress' },
  ];

  const tabs = [
    { id: 'home',      label: "Aujourd'hui", path: '/home' },
    { id: 'nutrition', label: 'Nutrition',    path: '/fuel' },
    { id: 'plus',      label: '',             path: '' },
    { id: 'progress',  label: 'Progres',      path: '/progress' },
    { id: 'moi',       label: 'Moi',          path: '/profile' },
  ];

  return (
    <>
      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 560, background: WHITE,
            borderRadius: '28px 28px 0 0',
            padding: '10px 20px max(32px, env(safe-area-inset-bottom))',
            boxSizing: 'border-box', maxHeight: '80vh', overflowY: 'auto',
          }}>
            <div style={{ width: 40, height: 5, borderRadius: 99, background: '#D8DAD3', margin: '2px auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.1em' }}>AJOUT RAPIDE</div>
                <div style={{ fontSize: 26, fontWeight: 950, letterSpacing: '-.04em', color: BLACK, marginTop: 2 }}>Que veux-tu ajouter ?</div>
              </div>
              <button onClick={() => setShowAdd(false)} style={{ width: 42, height: 42, borderRadius: 14, border: `1px solid ${BORDER}`, background: BG, color: BLACK, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {quickActions.map(a => {
                const Icon = a.icon;
                return (
                  <button key={a.label} onClick={() => { setShowAdd(false); navigate(a.path); }} style={{
                    border: `1px solid ${BORDER}`, background: BG, borderRadius: 20,
                    minHeight: 100, padding: 14, textAlign: 'left', cursor: 'pointer',
                  }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, background: WHITE, display: 'grid', placeItems: 'center', marginBottom: 12 }}>
                      <Icon size={18} />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: BLACK, lineHeight: 1.3 }}>{a.label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 560, zIndex: 200,
        background: 'rgba(255,255,255,.97)', backdropFilter: 'blur(20px)',
        borderTop: `1px solid ${BORDER}`,
        padding: '7px 16px max(10px, env(safe-area-inset-bottom))',
        boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {tabs.map(tab => {
            if (tab.id === 'plus') {
              return (
                <button key="plus" onClick={() => setShowAdd(true)} style={{
                  width: 52, height: 52, borderRadius: 18, border: 0,
                  background: ACCENT, color: BLACK,
                  display: 'grid', placeItems: 'center',
                  cursor: 'pointer', transform: 'translateY(-14px)',
                  boxShadow: '0 8px 22px rgba(200,255,0,.4)',
                  flexShrink: 0,
                }}>
                  <Plus size={26} strokeWidth={3} />
                </button>
              );
            }
            const sel = active === tab.id ||
              (tab.id === 'nutrition' && active === 'fuel') ||
              (tab.id === 'moi' && (active === 'settings' || active === 'profile'));
            return (
              <button key={tab.id} onClick={() => navigate(tab.path)} style={{
                flex: 1, border: 0, background: 'transparent',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                color: sel ? BLACK : '#A0A49B', cursor: 'pointer', padding: '6px 0',
              }}>
                <span style={{ fontSize: 9, fontWeight: sel ? 900 : 700, whiteSpace: 'nowrap' }}>{tab.label}</span>
                <div style={{ width: sel ? 16 : 0, height: 3, borderRadius: 99, background: ACCENT, transition: 'width .2s' }} />
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function NoxCore({ pct }: { pct: number }) {
  const safe = Math.max(0, Math.min(100, pct));
  const r = 46, circ = 2 * Math.PI * r, dash = (safe / 100) * circ;
  return (
    <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
      <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="#1a1a1a" strokeWidth="8" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={ACCENT} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray .6s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 26, fontWeight: 950, color: WHITE, lineHeight: 1 }}>{safe}%</div>
        <div style={{ fontSize: 8, fontWeight: 900, color: MUTED, letterSpacing: '.1em', marginTop: 2 }}>TA JOURNÉE</div>
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile]       = useState<any>(null);
  const [program, setProgram]       = useState<any>(null);
  const [targets, setTargets]       = useState<any>(null);
  const [todayFood, setTodayFood]   = useState<any[]>([]);
  const [noxMsg, setNoxMsg]         = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [sleepData, setSleepData]   = useState<any>(null);
  const [todayWorkout, setTodayWorkout] = useState<any>(null);
  const [habitDone, setHabitDone]   = useState(0);
  const [habitTotal, setHabitTotal] = useState(4);
  const { isPro } = usePlan();

  useEffect(() => { if (user) loadAll(); }, [user]);

  const loadAll = async () => {
    if (!user) return;
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
    const [{ data: prof }, { data: prog }, { data: tgts }, { data: food }, { data: sleep }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('workout_programs').select('*').eq('user_id', user.id).eq('is_active', true).maybeSingle(),
      supabase.from('nutrition_targets').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('food_entries').select('calories, protein').eq('user_id', user.id).gte('created_at', start).lte('created_at', end),
      supabase.from('sleep_logs').select('duration_hours, quality').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    setProfile(prof); setProgram(prog); setTargets(tgts); setTodayFood(food || []);
    setSleepData(sleep || null);
    // Séance terminée aujourd'hui
    const { data: workout } = await supabase
      .from('workouts')
      .select('id, name, status, finished_at, duration_minutes, session_feedback')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .gte('finished_at', start)
      .lte('finished_at', end)
      .order('finished_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setTodayWorkout(workout || null);
    // Habitudes du jour depuis localStorage
    try {
      const d = new Date();
      const key = `nox-habits-${user.id}-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const saved = localStorage.getItem(key);
      const done = saved ? JSON.parse(saved) : [];
      setHabitDone(done.length);
    } catch {}
  };

  const firstName        = profile?.first_name || profile?.display_name?.split(' ')[0] || '';
  const caloriesTarget   = Number(targets?.calories || 2200);
  const proteinTarget    = Number(targets?.protein_g || targets?.protein || 160);
  const todayKcal        = todayFood.reduce((s, e) => s + (e.calories || 0), 0);
  const todayProt        = todayFood.reduce((s, e) => s + (e.protein  || 0), 0);
  const kcalLeft         = Math.max(0, caloriesTarget - Math.round(todayKcal));
  const kcalPct          = Math.min(100, Math.round((todayKcal  / caloriesTarget) * 100));
  const protPct          = Math.min(100, Math.round((todayProt  / proteinTarget)  * 100));
  const sessions         = program?.program_json?.sessions || [];
  const dayNames         = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const todaySession     = sessions.find((s: any) =>
    String(s?.day || '').toLowerCase().includes(dayNames[new Date().getDay()].toLowerCase().slice(0,3))
  ) || null;
  // NOX Core — score explicable : nutrition 50% + protéines 30% + séance 20%
  const sessionDone  = Boolean(todayWorkout);
  const sessionScore = todaySession ? (sessionDone ? 20 : 10) : 20; // repos = plein score
  const noxPct = Math.min(100, Math.round((kcalPct * 0.5) + (protPct * 0.3) + sessionScore));
  const dateLabel = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).toUpperCase();

  const fetchNoxMsg = async () => {
    // Version déterministe pour Free — pas d'appel IA
    if (!isPro) {
      const h = new Date().getHours();
      const protLeft = Math.max(0, proteinTarget - Math.round(todayProt));
      if (kcalLeft > 300) {
        setNoxMsg(`Il te reste ${kcalLeft} kcal et ${protLeft}g de protéines aujourd'hui. Ajoute un repas riche en protéines pour rester sur ta trajectoire.`);
      } else if (todaySession) {
        setNoxMsg(`Ta séance "${todaySession.name}" t'attend. Lance-toi maintenant pendant que tu as l'énergie.`);
      } else if (h >= 20) {
        setNoxMsg(`Bonne récupération ce soir. Dors tôt pour optimiser ta progression de demain.`);
      } else {
        setNoxMsg(`Tu es sur la bonne voie aujourd'hui. Continue à suivre ton plan.`);
      }
      return;
    }
    // Version IA pour Pro
    setLoadingMsg(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const h = new Date().getHours();
      const prompt = `Tu es NOX. Reponds en 2 phrases max, sans markdown. Heure: ${h}h. Objectif: ${profile?.goal_type || 'transformation'}. Calories: ${Math.round(todayKcal)}/${caloriesTarget}. Proteines: ${Math.round(todayProt)}/${proteinTarget}g. Seance: ${todaySession?.name || 'aucune'}. Question: ET MAINTENANT ? Donne une seule recommandation concrete.`;
      const resp = await fetch('https://zpxrsmnpcyzafawlweyl.supabase.co/functions/v1/nox-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ system: 'Tu es NOX, assistant de transformation. 2 phrases max, pas de markdown.', messages: [{ role: 'user', content: prompt }] }),
      });
      const data = await resp.json();
      const text = data?.content?.[0]?.text || '';
      if (text) setNoxMsg(text.trim());
      else if (data?.error === 'PRO_REQUIRED') setNoxMsg('Passe à NOX Pro pour des recommandations personnalisées par IA.');
    } catch {}
    setLoadingMsg(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, color: BLACK, paddingBottom: 110 }}>
      <div style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>

        <header style={{ padding: '22px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: '-.04em' }}>NOX<span style={{ color: '#9ED100' }}>.</span></div>
          <button onClick={() => navigate('/profile')} style={{ width: 42, height: 42, borderRadius: 14, border: `1px solid ${BORDER}`, background: WHITE, color: BLACK, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <CircleUserRound size={20} />
          </button>
        </header>

        <main style={{ padding: '22px 20px 0' }}>

          {/* HEADER */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: MUTED, marginBottom: 4 }}>
              {firstName ? `Bonjour ${firstName} 👋` : 'Bonjour 👋'}
            </div>
            <h1 style={{ margin: 0, fontSize: 38, lineHeight: .95, fontWeight: 950, letterSpacing: '-.055em' }}>
              AUJOURD'HUI
            </h1>
            <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: MUTED }}>{dateLabel}</div>
          </div>

          {/* NOX SCORE */}
          <section style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 26, padding: 20, marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.11em', marginBottom: 16 }}>NOX SCORE</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ position: 'relative', width: 112, height: 112, flexShrink: 0 }}>
                <svg width="112" height="112" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="56" cy="56" r="44" fill="none" stroke="#EEF0EA" strokeWidth="9" />
                  <circle cx="56" cy="56" r="44" fill="none" stroke={ACCENT} strokeWidth="9" strokeLinecap="round"
                    strokeDasharray={`${(noxPct / 100) * (2 * Math.PI * 44)} ${2 * Math.PI * 44}`} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 30, fontWeight: 950, lineHeight: .9 }}>{noxPct}</div>
                    <div style={{ fontSize: 9, color: MUTED, fontWeight: 800, marginTop: 5 }}>/100</div>
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, display: 'grid', gap: 9 }}>
                {[
                  { label: 'Sommeil',      value: sleepData ? `${sleepData.duration_hours}h` : '—' },
                  { label: 'Nutrition',    value: `${kcalPct}%` },
                  { label: 'Protéines',    value: `${protPct}%` },
                  { label: 'Entraînement', value: sessionDone ? 'Fait' : todaySession ? 'Prévu' : 'Repos' },
                  { label: 'Régularité',   value: `${habitDone}/${habitTotal}` },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>{item.label}</span>
                    <span style={{ fontSize: 11, color: BLACK, fontWeight: 900 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* NOX A REMARQUÉ */}
          <section style={{ background: LIME, border: '1px solid #DDF59C', borderRadius: 24, padding: 20, marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 950, color: '#667500', letterSpacing: '.1em', marginBottom: 8 }}>NOX A REMARQUÉ</div>
            <div style={{ fontSize: 14, lineHeight: 1.55, fontWeight: 650, color: BLACK }}>
              {sleepData && Number(sleepData.duration_hours) < 7
                ? `Ta nuit a été courte (${sleepData.duration_hours}h). Garde un œil sur ton énergie aujourd'hui.`
                : sessionDone && todayWorkout?.session_feedback === 'hard'
                  ? `Ta séance d'aujourd'hui t'a semblé difficile. NOX utilisera ce signal pour contextualiser ta récupération.`
                  : kcalPct < 50 && new Date().getHours() >= 14
                    ? `Ton apport nutritionnel est encore bas pour ce moment de la journée.`
                    : protPct < kcalPct - 15
                      ? `Tes protéines avancent moins vite que ton apport énergétique aujourd'hui.`
                      : `Tes signaux du jour sont cohérents. Continue à suivre ton plan.`}
            </div>
          </section>

          {/* ET MAINTENANT */}
          <section style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 26, padding: 20, marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 950, color: MUTED, letterSpacing: '.11em', marginBottom: 8 }}>ET MAINTENANT</div>
            {todaySession && !sessionDone ? (
              <>
                <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: '-.04em', marginBottom: 5 }}>{todaySession.name}</div>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 18 }}>{todaySession.exercises?.length || 0} exercices</div>
                <button onClick={() => navigate('/program')} style={{ width: '100%', height: 52, border: 0, borderRadius: 16, background: BLACK, color: WHITE, fontSize: 12, fontWeight: 950, cursor: 'pointer' }}>
                  COMMENCER MA SÉANCE →
                </button>
              </>
            ) : kcalLeft > 300 ? (
              <>
                <div style={{ fontSize: 23, fontWeight: 950, letterSpacing: '-.04em', marginBottom: 6 }}>TON PROCHAIN REPAS</div>
                <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, marginBottom: 18 }}>
                  Il te reste {kcalLeft} kcal et environ {Math.max(0, proteinTarget - Math.round(todayProt))} g de protéines aujourd'hui.
                </div>
                <button onClick={() => navigate('/fuel')} style={{ width: '100%', height: 52, border: 0, borderRadius: 16, background: BLACK, color: WHITE, fontSize: 12, fontWeight: 950, cursor: 'pointer' }}>
                  TROUVER MON PROCHAIN REPAS →
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 23, fontWeight: 950, letterSpacing: '-.04em', marginBottom: 6 }}>CONTINUE COMME ÇA.</div>
                <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5 }}>Tes principales actions du jour sont bien engagées.</div>
              </>
            )}
          </section>

          {/* OBJECTIFS DU JOUR */}
          <div style={{ fontSize: 10, fontWeight: 950, color: MUTED, letterSpacing: '.11em', margin: '20px 2px 10px' }}>TES OBJECTIFS DU JOUR</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
            {[
              { icon: '🔥', value: `${Math.round(todayKcal)}`, label: `/ ${caloriesTarget} kcal`, click: () => navigate('/fuel') },
              { icon: '🥩', value: `${Math.round(todayProt)}g`, label: `/ ${proteinTarget}g prot.`, click: () => navigate('/fuel') },
              { icon: '🌙', value: sleepData ? `${sleepData.duration_hours}h` : '—', label: 'sommeil', click: () => navigate('/sleep') },
              { icon: '✓', value: `${habitDone}/${habitTotal}`, label: 'habitudes', click: () => navigate('/habits') },
            ].map((item, index) => (
              <button key={index} onClick={item.click} style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: '14px 5px', minWidth: 0, cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: 17, marginBottom: 7 }}>{item.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 950, color: BLACK, whiteSpace: 'nowrap' }}>{item.value}</div>
                <div style={{ fontSize: 8, color: MUTED, fontWeight: 700, marginTop: 3, lineHeight: 1.25 }}>{item.label}</div>
              </button>
            ))}
          </div>

          {/* ACCÈS NOX */}
          <button onClick={fetchNoxMsg} disabled={loadingMsg} style={{ width: '100%', border: 0, borderRadius: 20, background: BLACK, color: WHITE, padding: 18, marginTop: 4, cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: ACCENT, letterSpacing: '.1em', marginBottom: 5 }}>NOX</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 15 }}>
              <span style={{ fontSize: 15, fontWeight: 900 }}>{loadingMsg ? 'NOX analyse ta journée…' : 'Demander conseil à NOX'}</span>
              <ChevronRight size={18} color={ACCENT} />
            </div>
          </button>

          {noxMsg && (
            <div style={{ background: LIME, borderRadius: 20, padding: 18, marginTop: 8, fontSize: 13, lineHeight: 1.55, color: BLACK }}>
              {noxMsg}
            </div>
          )}

          <div style={{ fontSize: 9, color: '#B0B4AB', textAlign: 'center', padding: '20px 10px 8px', lineHeight: 1.5 }}>
            NOX adapte ses recommandations aux données disponibles.
          </div>

        </main>
      </div>
      <BottomNav active="home" />
    </div>
  );
}
