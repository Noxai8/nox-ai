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
  const proteinTarget    = Number(targets?.protein  || 160);
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
  const sessionDone  = false; // sera mis à jour quand Training sauvegarde
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

        <main style={{ padding: '24px 20px 0' }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.12em', marginBottom: 6 }}>{dateLabel}</div>
          <h1 style={{ margin: '0 0 28px', fontSize: 36, lineHeight: .95, fontWeight: 950, letterSpacing: '-.05em' }}>
            {firstName ? `BONJOUR ${firstName.toUpperCase()}.` : 'TON CORPS A BESOIN'}<br />
            {firstName ? 'ON Y VA.' : 'DE CA AUJOURD\'HUI.'}
          </h1>

          {/* NOX CORE + PRIORITE */}
          <div style={{ background: BLACK, borderRadius: 28, padding: 22, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 20 }}>
            <NoxCore pct={noxPct} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.12em', marginBottom: 8 }}>PRIORITE NOX</div>
              {kcalLeft > 200
                ? <>
                    <div style={{ fontSize: 20, fontWeight: 950, color: WHITE, lineHeight: 1.1, marginBottom: 6 }}>NOURRIS TA<br />JOURNEE.</div>
                    <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>{kcalLeft} kcal et {Math.round(Math.max(0, proteinTarget - todayProt))}g de proteines restants.</div>
                    <button onClick={() => navigate('/fuel')} style={{ marginTop: 12, padding: '8px 14px', background: ACCENT, border: 0, borderRadius: 12, color: BLACK, fontSize: 11, fontWeight: 900, cursor: 'pointer' }}>
                      VOIR QUOI MANGER
                    </button>
                  </>
                : todaySession
                ? <>
                    <div style={{ fontSize: 20, fontWeight: 950, color: WHITE, lineHeight: 1.1, marginBottom: 6 }}>BOUGE<br />AUJOURD'HUI.</div>
                    <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>{todaySession.name} · {todaySession.exercises?.length || 0} exercices</div>
                    <button onClick={() => navigate('/program')} style={{ marginTop: 12, padding: '8px 14px', background: ACCENT, border: 0, borderRadius: 12, color: BLACK, fontSize: 11, fontWeight: 900, cursor: 'pointer' }}>
                      COMMENCER
                    </button>
                  </>
                : <>
                    <div style={{ fontSize: 20, fontWeight: 950, color: WHITE, lineHeight: 1.1, marginBottom: 6 }}>SUR LA<br />BONNE VOIE.</div>
                    <div style={{ fontSize: 12, color: '#888' }}>Journee bien engagee. Continue.</div>
                  </>
              }
            </div>
          </div>

          {/* ET MAINTENANT */}
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 24, padding: 20, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: noxMsg ? 14 : 0 }}>
              <div style={{ fontSize: 18, fontWeight: 950, letterSpacing: '-.03em' }}>ET MAINTENANT ?</div>
              {!noxMsg && (
                <button onClick={fetchNoxMsg} disabled={loadingMsg} style={{ padding: '10px 16px', background: ACCENT, border: 0, borderRadius: 12, color: BLACK, fontSize: 11, fontWeight: 900, cursor: 'pointer' }}>
                  {loadingMsg ? '...' : 'DEMANDER A NOX'}
                </button>
              )}
            </div>
            {noxMsg && (
              <>
                <div style={{ fontSize: 14, color: BLACK, lineHeight: 1.6 }}>{noxMsg}</div>
                <button onClick={() => setNoxMsg(null)} style={{ marginTop: 12, background: 'none', border: 'none', color: MUTED, fontSize: 11, cursor: 'pointer', padding: 0 }}>Nouvelle question</button>
              </>
            )}
          </div>

          {/* NOURRIR */}
          <button onClick={() => navigate('/fuel')} style={{ width: '100%', background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 24, padding: 20, textAlign: 'left', cursor: 'pointer', marginBottom: 10, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.1em', marginBottom: 4 }}>NOURRIR</div>
                <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: '-.03em' }}>
                  {Math.round(todayKcal)}<span style={{ fontSize: 12, color: MUTED, fontWeight: 500 }}> / {caloriesTarget} kcal</span>
                </div>
              </div>
              <ChevronRight size={18} color={MUTED} />
            </div>
            <div style={{ height: 6, background: BG, borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
              <div style={{ height: '100%', width: `${kcalPct}%`, background: ACCENT, borderRadius: 99, transition: 'width .4s' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { label: 'PROTEINES', v: `${Math.round(todayProt)}/${proteinTarget}g` },
                { label: 'RESTANTES', v: `${kcalLeft} kcal` },
                { label: 'REPAS', v: `${todayFood.length}` },
              ].map(({ label, v }) => (
                <div key={label}>
                  <div style={{ fontSize: 15, fontWeight: 950, color: BLACK }}>{v}</div>
                  <div style={{ fontSize: 9, color: MUTED, fontWeight: 700, marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </button>

          {/* BOUGER */}
          <button onClick={() => navigate('/program')} style={{ width: '100%', background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 24, padding: 20, textAlign: 'left', cursor: 'pointer', marginBottom: 10, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.1em', marginBottom: 4 }}>BOUGER</div>
                {todaySession
                  ? <>
                      <div style={{ fontSize: 20, fontWeight: 950, letterSpacing: '-.03em' }}>{todaySession.name}</div>
                      <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{todaySession.exercises?.length || 0} exercices</div>
                    </>
                  : <>
                      <div style={{ fontSize: 18, fontWeight: 950, letterSpacing: '-.03em' }}>JOUR DE REPOS</div>
                      <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>Le muscle se construit au repos.</div>
                    </>
                }
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <ChevronRight size={18} color={MUTED} />
                {todaySession && (
                  <div style={{ padding: '6px 12px', background: ACCENT, borderRadius: 20, fontSize: 10, fontWeight: 900, color: BLACK }}>COMMENCER</div>
                )}
              </div>
            </div>
          </button>

          {/* RECUPERER */}
          <button onClick={() => navigate('/sleep')} style={{ width: '100%', background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 24, padding: 20, textAlign: 'left', cursor: 'pointer', marginBottom: 10, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.1em', marginBottom: 4 }}>RECUPERER</div>
                {sleepData ? (
                  <>
                    <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: '-.03em' }}>
                      {sleepData.duration_hours}h
                      <span style={{ fontSize: 12, color: MUTED, fontWeight: 500, marginLeft: 6 }}>de sommeil</span>
                    </div>
                    <div style={{ fontSize: 12, color: sleepData.duration_hours >= 7 ? '#69B578' : '#FF8C42', marginTop: 4 }}>
                      {sleepData.duration_hours >= 8 ? 'Excellente nuit' : sleepData.duration_hours >= 7 ? 'Bonne nuit' : sleepData.duration_hours >= 6 ? 'Nuit correcte' : 'Nuit trop courte'}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 18, fontWeight: 950, letterSpacing: '-.03em' }}>SOMMEIL & ENERGIE</div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>Enregistre ta nuit.</div>
                  </>
                )}
              </div>
              <ChevronRight size={18} color={MUTED} />
            </div>
          </button>

          {/* HABITUDE CLE */}
          <button onClick={() => navigate('/habits')} style={{ width: '100%', background: LIME, border: '1px solid #DDF59C', borderRadius: 24, padding: 20, textAlign: 'left', cursor: 'pointer', marginBottom: 14, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: '#687600', letterSpacing: '.1em', marginBottom: 4 }}>HABITUDES DU JOUR</div>
                <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: '-.03em', color: BLACK }}>
                  {habitDone}/{habitTotal}
                  <span style={{ fontSize: 13, color: '#69715F', fontWeight: 500, marginLeft: 8 }}>
                    {habitDone === habitTotal ? 'Toutes faites' : 'complétées'}
                  </span>
                </div>
                <div style={{ height: 4, background: '#DDF59C', borderRadius: 99, overflow: 'hidden', marginTop: 10 }}>
                  <div style={{ height: '100%', width: `${habitTotal > 0 ? (habitDone/habitTotal)*100 : 0}%`, background: '#687600', borderRadius: 99, transition: 'width .4s' }} />
                </div>
              </div>
              <ChevronRight size={18} color="#687600" style={{ flexShrink: 0, marginLeft: 12 }} />
            </div>
          </button>

          {/* NOX FUTURE */}
          <button onClick={() => navigate('/future')} style={{ width: '100%', background: BLACK, borderRadius: 24, padding: 20, textAlign: 'left', cursor: 'pointer', marginBottom: 14, boxSizing: 'border-box' }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.12em', marginBottom: 8 }}>NOX FUTURE</div>
            <div style={{ fontSize: 24, fontWeight: 950, color: WHITE, lineHeight: 1.05, letterSpacing: '-.03em', marginBottom: 8 }}>VOIS OU<br />TU VEUX ALLER.</div>
            <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5, marginBottom: 14 }}>Ta direction physique. NOX construit le chemin.</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: ACCENT, borderRadius: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: BLACK }}>VOIR MA DIRECTION</span>
              <ChevronRight size={14} color={BLACK} />
            </div>
          </button>

          <div style={{ fontSize: 9, color: '#B0B4AB', textAlign: 'center', paddingBottom: 8, lineHeight: 1.5 }}>
            NOX accompagne ton parcours. Les resultats varient selon ta regularite et ton contexte.
          </div>
        </main>
      </div>
      <BottomNav active="home" />
    </div>
  );
}
