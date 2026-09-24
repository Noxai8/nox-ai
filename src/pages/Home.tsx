import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import {
  Apple, Camera, ChevronRight, CircleUserRound,
  Droplets, Dumbbell, Moon, Plus, Ruler, Scale,
  ScanLine, Sparkles, Utensils, X,
} from 'lucide-react';

/* ── DESIGN SYSTEM ─────────────────────────────────────────── */
const ACCENT  = '#C8FF00';
const BG      = '#F7F8F4';
const WHITE   = '#FFFFFF';
const BLACK   = '#0B0B0B';
const MUTED   = '#7A7F76';
const BORDER  = '#E8EAE4';
const LIME    = '#F0FFD0';

type NavActive = 'home' | 'nutrition' | 'progress' | 'moi';

/* ── BOTTOM NAV ─────────────────────────────────────────────── */
export function BottomNav({ active }: { active: NavActive | string }) {
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);

  const quickActions = [
    { label: 'Scanner un repas', icon: Camera,   path: '/food-scan' },
    { label: 'Ajouter un aliment', icon: Utensils, path: '/fuel' },
    { label: 'Eau',                icon: Droplets, path: '/fuel#eau' },
    { label: 'Poids',              icon: Scale,    path: '/body' },
    { label: 'Mensurations',       icon: Ruler,    path: '/body' },
    { label: 'Code-barres',        icon: ScanLine, path: '/barcode-scanner' },
    { label: 'Entraînement',       icon: Dumbbell, path: '/program' },
    { label: 'Photo',              icon: Camera,   path: '/progress' },
  ];

  const tabs = [
    { id: 'home',      label: "Aujourd'hui", path: '/home' },
    { id: 'nutrition', label: 'Nutrition',    path: '/fuel' },
    { id: 'plus',      label: '',             path: '' },
    { id: 'progress',  label: 'Progrès',      path: '/progress' },
    { id: 'moi',       label: 'Moi',          path: '/profile' },
  ];

  return (
    <>
      {/* BOTTOM SHEET + */}
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

      {/* NAV BAR */}
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
              (tab.id === 'moi' && active === 'settings');
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

/* ── NOX CORE ───────────────────────────────────────────────── */
function NoxCore({ pct }: { pct: number }) {
  const safe = Math.max(0, Math.min(100, pct));
  const r = 46;
  const circ = 2 * Math.PI * r;
  const dash = (safe / 100) * circ;

  return (
    <div style={{ position: 'relative', width: 120, height: 120 }}>
      <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="#E8EAE4" strokeWidth="8" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={ACCENT} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray .6s ease' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 26, fontWeight: 950, color: BLACK, lineHeight: 1 }}>{safe}%</div>
        <div style={{ fontSize: 8, fontWeight: 900, color: MUTED, letterSpacing: '.1em', marginTop: 2 }}>TA JOURNÉE</div>
      </div>
    </div>
  );
}

/* ── HOME ────────────────────────────────────────────────────── */
export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile]     = useState<any>(null);
  const [program, setProgram]     = useState<any>(null);
  const [targets, setTargets]     = useState<any>(null);
  const [todayFood, setTodayFood] = useState<any[]>([]);
  const [noxMsg, setNoxMsg]       = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState(false);

  useEffect(() => { if (user) loadAll(); }, [user]);

  const loadAll = async () => {
    if (!user) return;
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    const [{ data: prof }, { data: prog }, { data: tgts }, { data: food }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('workout_programs').select('*').eq('user_id', user.id).eq('is_active', true).maybeSingle(),
      supabase.from('nutrition_targets').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('food_entries').select('calories, protein').eq('user_id', user.id).gte('created_at', start).lte('created_at', end),
    ]);
    setProfile(prof); setProgram(prog); setTargets(tgts); setTodayFood(food || []);
  };

  /* Calculs */
  const firstName = profile?.first_name || profile?.display_name?.split(' ')[0] || '';
  const caloriesTarget  = Number(targets?.calories || 2200);
  const proteinTarget   = Number(targets?.protein  || 160);
  const todayKcal   = todayFood.reduce((s, e) => s + (e.calories || 0), 0);
  const todayProt   = todayFood.reduce((s, e) => s + (e.protein  || 0), 0);
  const kcalLeft    = Math.max(0, caloriesTarget - Math.round(todayKcal));
  const kcalPct     = Math.min(100, Math.round((todayKcal / caloriesTarget) * 100));
  const protPct     = Math.min(100, Math.round((todayProt  / proteinTarget)  * 100));

  /* Séance du jour */
  const sessions   = program?.program_json?.sessions || [];
  const dayNames   = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const todayName  = dayNames[new Date().getDay()];
  const todaySession = sessions.find((s: any) =>
    String(s?.day || '').toLowerCase().includes(todayName.toLowerCase().slice(0, 3))
  ) || null;

  /* NOX Core score */
  const noxPct = Math.round((kcalPct * 0.5) + (protPct * 0.3) + (todaySession ? 0 : 20));

  /* Date */
  const dateLabel = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).toUpperCase();

  /* "ET MAINTENANT ?" */
  const fetchNoxMsg = async () => {
    setLoadingMsg(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const h = new Date().getHours();
      const prompt = `Tu es NOX, assistant de transformation personnelle. Réponds en 2-3 lignes maximum, sans markdown.
CONTEXTE : ${h}h${new Date().getMinutes()} · Objectif: ${profile?.goal_type || 'transformation'} · Calories: ${Math.round(todayKcal)}/${caloriesTarget} kcal · Protéines: ${Math.round(todayProt)}/${proteinTarget}g · Séance du jour: ${todaySession?.name || 'aucune'}.
L'utilisateur demande : ET MAINTENANT ? Donne UNE seule recommandation concrète et actionnable.`;
      const resp = await fetch('https://zpxrsmnpcyzafawlweyl.supabase.co/functions/v1/generate-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ prompt }),
      });
      const data = await resp.json();
      const text = data?.content?.[0]?.text || data?.data?.content?.[0]?.text || '';
      if (text) setNoxMsg(text.trim());
    } catch {}
    setLoadingMsg(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, color: BLACK, paddingBottom: 110 }}>
      <div style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>

        {/* ── HEADER ── */}
        <header style={{ padding: '22px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: '-.04em' }}>
            NOX<span style={{ color: '#9ED100' }}>.</span>
          </div>
          <button onClick={() => navigate('/profile')} style={{
            width: 42, height: 42, borderRadius: 14, border: `1px solid ${BORDER}`,
            background: WHITE, color: BLACK, display: 'grid', placeItems: 'center', cursor: 'pointer',
          }}>
            <CircleUserRound size={20} />
          </button>
        </header>

        <main style={{ padding: '24px 20px 0' }}>

          {/* ── DATE + GREETING ── */}
          <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.12em', marginBottom: 6 }}>
            {dateLabel}
          </div>
          <h1 style={{ margin: '0 0 28px', fontSize: 38, lineHeight: .95, fontWeight: 950, letterSpacing: '-.05em' }}>
            TON CORPS A BESOIN<br />DE ÇA AUJOURD'HUI.
          </h1>

          {/* ── NOX CORE + PRIORITÉ ── */}
          <div style={{
            background: BLACK, borderRadius: 28, padding: 22, marginBottom: 14,
            display: 'flex', alignItems: 'center', gap: 20,
          }}>
            <NoxCore pct={noxPct} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.12em', marginBottom: 8 }}>
                PRIORITÉ NOX
              </div>
              {kcalLeft > 200
                ? <>
                    <div style={{ fontSize: 20, fontWeight: 950, color: WHITE, lineHeight: 1.1, marginBottom: 6 }}>
                      NOURRIS TA<br />JOURNÉE.
                    </div>
                    <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>
                      {kcalLeft} kcal et {Math.round(Math.max(0, proteinTarget - todayProt))}g de protéines à compléter.
                    </div>
                    <button onClick={() => navigate('/fuel')} style={{
                      marginTop: 12, padding: '8px 14px', background: ACCENT, border: 0,
                      borderRadius: 12, color: BLACK, fontSize: 11, fontWeight: 900, cursor: 'pointer',
                    }}>
                      VOIR QUOI MANGER
                    </button>
                  </>
                : todaySession
                ? <>
                    <div style={{ fontSize: 20, fontWeight: 950, color: WHITE, lineHeight: 1.1, marginBottom: 6 }}>
                      BOUGE<br />AUJOURD'HUI.
                    </div>
                    <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>
                      {todaySession.name} · {todaySession.exercises?.length || 0} exercices
                    </div>
                    <button onClick={() => navigate('/program')} style={{
                      marginTop: 12, padding: '8px 14px', background: ACCENT, border: 0,
                      borderRadius: 12, color: BLACK, fontSize: 11, fontWeight: 900, cursor: 'pointer',
                    }}>
                      COMMENCER
                    </button>
                  </>
                : <>
                    <div style={{ fontSize: 20, fontWeight: 950, color: WHITE, lineHeight: 1.1, marginBottom: 6 }}>
                      SUR LA<br />BONNE VOIE.
                    </div>
                    <div style={{ fontSize: 12, color: '#888' }}>Journée bien engagée. Continue.</div>
                  </>
              }
            </div>
          </div>

          {/* ── ET MAINTENANT ? ── */}
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 24, padding: 20, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: noxMsg ? 14 : 0 }}>
              <div style={{ fontSize: 18, fontWeight: 950, letterSpacing: '-.03em' }}>ET MAINTENANT ?</div>
              {!noxMsg && (
                <button onClick={fetchNoxMsg} disabled={loadingMsg} style={{
                  padding: '10px 16px', background: ACCENT, border: 0, borderRadius: 12,
                  color: BLACK, fontSize: 11, fontWeight: 900, cursor: 'pointer',
                }}>
                  {loadingMsg ? '...' : 'DEMANDER À NOX'}
                </button>
              )}
            </div>
            {noxMsg && (
              <>
                <div style={{ fontSize: 14, color: BLACK, lineHeight: 1.6 }}>{noxMsg}</div>
                <button onClick={() => setNoxMsg(null)} style={{
                  marginTop: 12, background: 'none', border: 'none', color: MUTED,
                  fontSize: 11, cursor: 'pointer', padding: 0,
                }}>Nouvelle question</button>
              </>
            )}
          </div>

          {/* ── NOURRIR ── */}
          <button onClick={() => navigate('/fuel')} style={{
            width: '100%', background: WHITE, border: `1px solid ${BORDER}`,
            borderRadius: 24, padding: 20, textAlign: 'left', cursor: 'pointer',
            marginBottom: 10, boxSizing: 'border-box',
          }}>
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
                { label: 'PROTÉINES', v: Math.round(todayProt), t: proteinTarget },
                { label: 'CALORIES RESTANTES', v: kcalLeft, t: caloriesTarget, noSlash: true },
                { label: 'REPAS', v: todayFood.length, t: null },
              ].map(({ label, v, t, noSlash }) => (
                <div key={label}>
                  <div style={{ fontSize: 16, fontWeight: 950, color: BLACK }}>
                    {v}{!noSlash && t ? <span style={{ fontSize: 10, color: MUTED }}>/{t}g</span> : null}
                  </div>
                  <div style={{ fontSize: 9, color: MUTED, fontWeight: 700, marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </button>

          {/* ── BOUGER ── */}
          <button onClick={() => navigate(todaySession ? '/program' : '/program')} style={{
            width: '100%', background: WHITE, border: `1px solid ${BORDER}`,
            borderRadius: 24, padding: 20, textAlign: 'left', cursor: 'pointer',
            marginBottom: 10, boxSizing: 'border-box',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.1em', marginBottom: 4 }}>BOUGER</div>
                {todaySession
                  ? <>
                      <div style={{ fontSize: 20, fontWeight: 950, letterSpacing: '-.03em' }}>{todaySession.name}</div>
                      <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>
                        {todaySession.exercises?.length || 0} exercices
                      </div>
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
                  <div style={{ padding: '6px 12px', background: ACCENT, borderRadius: 20, fontSize: 10, fontWeight: 900, color: BLACK }}>
                    COMMENCER
                  </div>
                )}
              </div>
            </div>
          </button>

          {/* ── RÉCUPÉRER ── */}
          <button onClick={() => navigate('/sleep')} style={{
            width: '100%', background: WHITE, border: `1px solid ${BORDER}`,
            borderRadius: 24, padding: 20, textAlign: 'left', cursor: 'pointer',
            marginBottom: 10, boxSizing: 'border-box',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.1em', marginBottom: 4 }}>RÉCUPÉRER</div>
                <div style={{ fontSize: 18, fontWeight: 950, letterSpacing: '-.03em' }}>SOMMEIL & ÉNERGIE</div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>Prépare une bonne nuit.</div>
              </div>
              <ChevronRight size={18} color={MUTED} />
            </div>
          </button>

          {/* ── HABITUDE CLÉ ── */}
          <button onClick={() => navigate('/habits')} style={{
            width: '100%', background: LIME, border: '1px solid #DDF59C',
            borderRadius: 24, padding: 20, textAlign: 'left', cursor: 'pointer',
            marginBottom: 14, boxSizing: 'border-box',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 900, color: '#687600', letterSpacing: '.1em', marginBottom: 4 }}>HABITUDE CLÉ</div>
                <div style={{ fontSize: 18, fontWeight: 950, letterSpacing: '-.03em', color: BLACK }}>UNE ACTION SIMPLE.</div>
                <div style={{ fontSize: 12, color: '#69715F', marginTop: 4 }}>La régularité fait la différence.</div>
              </div>
              <ChevronRight size={18} color="#687600" />
            </div>
          </button>

          {/* ── NOX FUTURE ── */}
          <button onClick={() => navigate('/future')} style={{
            width: '100%', background: BLACK,
            borderRadius: 24, padding: 20, textAlign: 'left', cursor: 'pointer',
            marginBottom: 14, boxSizing: 'border-box',
          }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.12em', marginBottom: 8 }}>NOX FUTURE</div>
            <div style={{ fontSize: 22, fontWeight: 950, color: WHITE, lineHeight: 1.05, letterSpacing: '-.03em', marginBottom: 8 }}>
              VOIS OÙ<br />TU VEUX ALLER.
            </div>
            <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5, marginBottom: 14 }}>
              Ta direction physique. NOX construit le chemin.
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: ACCENT, borderRadius: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: BLACK }}>VOIR MA DIRECTION</span>
              <ChevronRight size={14} color={BLACK} />
            </div>
          </button>

          {/* ── DISCLAIMER ── */}
          <div style={{ fontSize: 9, color: '#B0B4AB', textAlign: 'center', paddingBottom: 8, lineHeight: 1.5 }}>
            NOX accompagne ton parcours. Les résultats varient selon ta régularité et ton contexte.
          </div>
        </main>
      </div>

      <BottomNav active="home" />
    </div>
  );
}
