import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import {
  Beef, Camera, Check, ChevronRight, CircleUserRound,
  Droplets, Dumbbell, Flame, Moon, Plus, Ruler, Scale,
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
  const sessionScore = todaySession ? (sessionDone ? 20 : 10) : 20;

  const hasNutritionData   = todayFood.length > 0;
  const hasSleepData       = Boolean(sleepData?.duration_hours);
  const hasWorkoutData     = Boolean(todayWorkout);
  const availableSignals   = [hasNutritionData, hasSleepData, hasWorkoutData, habitDone > 0].filter(Boolean).length;
  const hasEnoughDataForScore = availableSignals >= 2;

  const calculatedNoxPct = Math.min(100, Math.round((kcalPct * 0.5) + (protPct * 0.3) + sessionScore));
  const noxPct = hasEnoughDataForScore ? calculatedNoxPct : null;
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

        <main style={{ padding: '20px 20px 0' }}>

          {/* HEADER */}
          <header style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 14, fontWeight: 750, color: '#555950', marginBottom: 4 }}>
              {firstName ? `Bonjour ${firstName} 👋` : 'Bonjour 👋'}
            </div>
            <h1 style={{ margin: 0, fontSize: 40, lineHeight: .92, fontWeight: 1000, letterSpacing: '-.055em', color: BLACK }}>
              AUJOURD'HUI
            </h1>
            <div style={{ marginTop: 7, fontSize: 13, color: '#7B8076', fontWeight: 700 }}>{dateLabel}</div>
          </header>

          {/* NOX SCORE */}
          <section style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 24, padding: '16px 18px 17px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 950, letterSpacing: '.06em', marginBottom: 12 }}>NOX SCORE</div>
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', gap: 14 }}>
              {/* GRAND CERCLE */}
              <div style={{ width: 142, height: 142, position: 'relative' }}>
                <svg width="142" height="142" viewBox="0 0 142 142" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="71" cy="71" r="57" fill="none" stroke="#ECEFE7" strokeWidth="12" />
                  <circle cx="71" cy="71" r="57" fill="none" stroke={ACCENT} strokeWidth="12" strokeLinecap="round"
                    strokeDasharray={`${((noxPct ?? 0) / 100) * (2 * Math.PI * 57)} ${2 * Math.PI * 57}`} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                  {noxPct !== null ? (
                    <div>
                      <div style={{ fontSize: 48, lineHeight: .85, fontWeight: 1000, letterSpacing: '-.06em' }}>{noxPct}</div>
                      <div style={{ marginTop: 7, fontSize: 12, fontWeight: 800, color: '#73786E' }}>/ 100</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 1000 }}>EN COURS</div>
                      <div style={{ marginTop: 5, fontSize: 8, fontWeight: 850, color: '#888D83' }}>PLUS DE DONNÉES</div>
                    </div>
                  )}
                </div>
              </div>
              {/* SIGNAUX */}
              <div style={{ display: 'grid', gap: 11, minWidth: 0 }}>
                {[
                  { label: 'Sommeil',      value: sleepData?.duration_hours ? `${sleepData.duration_hours}h` : '—', i: 0 },
                  { label: 'Nutrition',    value: hasNutritionData ? `${kcalPct}%` : '—', i: 1 },
                  { label: 'Entraînement', value: sessionDone ? 'Fait' : todaySession ? 'Prévu' : 'Repos', i: 2 },
                  { label: 'Récupération', value: '—', i: 3 },
                  { label: 'Régularité',   value: habitTotal > 0 ? `${habitDone}/${habitTotal}` : '—', i: 4 },
                ].map(item => (
                  <div key={item.label} style={{ display: 'grid', gridTemplateColumns: '18px 1fr auto', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 17, height: 17, borderRadius: 6, background: item.i === 1 || item.i === 3 ? '#E8FFD0' : '#F1F2EE', display: 'grid', placeItems: 'center', fontSize: 8, fontWeight: 1000 }}>
                      {item.i === 0 ? '◔' : item.i === 1 ? '◉' : item.i === 2 ? '↗' : item.i === 3 ? '◴' : '✓'}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#40443D', whiteSpace: 'nowrap' }}>{item.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 950, color: BLACK }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* NOX A REMARQUÉ */}
          <section style={{ background: '#EDFFC9', borderRadius: 22, padding: '18px 20px', marginBottom: 22 }}>
            <div style={{ fontSize: 11, fontWeight: 1000, letterSpacing: '.055em', marginBottom: 8 }}>NOX A REMARQUÉ</div>
            <div style={{ fontSize: 14, lineHeight: 1.5, fontWeight: 650, color: '#282B26' }}>
              {!hasEnoughDataForScore
                ? `Ta journée commence. NOX affinera son analyse à mesure que tu ajoutes tes données.`
                : sleepData && Number(sleepData.duration_hours) < 7
                  ? `Ta nuit a été courte (${sleepData.duration_hours}h). Garde un œil sur ton énergie aujourd'hui.`
                  : sessionDone && todayWorkout?.session_feedback === 'hard'
                    ? `Ta dernière séance t'a semblé difficile. NOX utilisera ce signal pour suivre ta récupération.`
                    : kcalPct < 50 && new Date().getHours() >= 14
                      ? `Ton apport nutritionnel est encore bas pour ce moment de la journée.`
                      : protPct < kcalPct - 15
                        ? `Tes protéines avancent moins vite que ton apport énergétique aujourd'hui.`
                        : `Tes signaux disponibles sont cohérents avec ton plan aujourd'hui.`}
            </div>
          </section>

          {/* ET MAINTENANT */}
          <section style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 18, marginBottom: 22 }}>
            <div style={{ fontSize: 15, fontWeight: 1000, letterSpacing: '.03em', marginBottom: 15 }}>ET MAINTENANT</div>
            {todaySession && !sessionDone ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 24px', gap: 13, alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#E8FFC2', display: 'grid', placeItems: 'center' }}>
                    <Dumbbell size={24} strokeWidth={2.5} color={BLACK} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 17, lineHeight: 1.1, fontWeight: 1000, letterSpacing: '-.025em', color: BLACK }}>{todaySession.name}</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: '#73786E', fontWeight: 650 }}>
                      {todaySession.duration_minutes ? `${todaySession.duration_minutes} min • ` : ''}
                      {todaySession.exercises?.length || 0} exercices
                    </div>
                  </div>
                  <ChevronRight size={25} strokeWidth={2.4} color="#4C5148" />
                </div>
                <button onClick={() => navigate('/program')} style={{ width: '100%', height: 58, border: 0, borderRadius: 17, background: BLACK, color: WHITE, cursor: 'pointer', fontSize: 12, fontWeight: 1000, letterSpacing: '.025em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  COMMENCER MA SÉANCE <span style={{ color: ACCENT, fontSize: 20, lineHeight: 1 }}>→</span>
                </button>
              </>
            ) : kcalLeft > 300 ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 24px', gap: 13, alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#E8FFC2', display: 'grid', placeItems: 'center' }}>
                    <Beef size={23} strokeWidth={2.4} color={BLACK} />
                  </div>
                  <div>
                    <div style={{ fontSize: 19, fontWeight: 1000, color: BLACK }}>Ton prochain repas</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: '#73786E' }}>{kcalLeft} kcal restantes</div>
                  </div>
                  <ChevronRight size={25} strokeWidth={2.4} color="#4C5148" />
                </div>
                <button onClick={() => navigate('/fuel')} style={{ width: '100%', height: 58, border: 0, borderRadius: 17, background: BLACK, color: WHITE, fontSize: 12, fontWeight: 1000, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  TROUVER MON PROCHAIN REPAS <span style={{ color: ACCENT, marginLeft: 4, fontSize: 18 }}>→</span>
                </button>
              </>
            ) : (
              <div style={{ fontSize: 15, fontWeight: 850 }}>Tes principales actions du jour sont bien engagées.</div>
            )}
          </section>

          {/* OBJECTIFS DU JOUR */}
          <section>
            <div style={{ fontSize: 11, fontWeight: 1000, letterSpacing: '.06em', marginBottom: 15 }}>TES OBJECTIFS DU JOUR</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 10 }}>
              {([
                { Icon: Flame, bg: '#FFF5D8', value: String(Math.round(todayKcal)), sub: `/ ${caloriesTarget} kcal`, action: () => navigate('/fuel') },
                { Icon: Beef,  bg: '#FFF8D7', value: `${Math.round(todayProt)} g`, sub: `/ ${proteinTarget} g prot.`, action: () => navigate('/fuel') },
                { Icon: Check, bg: '#FFEAEA', value: `${habitDone}/${habitTotal}`, sub: 'habitudes', action: () => navigate('/habits') },
                { Icon: Moon,  bg: '#F1EEFF', value: sleepData?.duration_hours ? `${sleepData.duration_hours}h` : '—', sub: 'sommeil', action: () => navigate('/sleep') },
              ] as { Icon: any; bg: string; value: string; sub: string; action: () => void }[]).map(({ Icon, bg, value, sub, action }, index) => (
                <button key={index} onClick={action} style={{ border: 0, background: 'transparent', padding: '2px 3px 12px', cursor: 'pointer', textAlign: 'center', minWidth: 0 }}>
                  <div style={{ width: 38, height: 38, margin: '0 auto 8px', borderRadius: '50%', background: bg, display: 'grid', placeItems: 'center' }}>
                    <Icon size={18} strokeWidth={2.3} color={BLACK} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 1000, color: BLACK, whiteSpace: 'nowrap' }}>{value}</div>
                  <div style={{ marginTop: 3, fontSize: 8.5, lineHeight: 1.25, fontWeight: 700, color: '#8A8E85' }}>{sub}</div>
                </button>
              ))}
            </div>
          </section>

        </main>
      </div>
      <BottomNav active="home" />
    </div>
  );
}
