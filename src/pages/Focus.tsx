import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, CircleCheck, Plus, Target, Timer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { todayLocalDate } from '../lib/localDate';
import { BottomNav } from './Home';
import {
  BLOCKS, MISSION_TARGETS, isMissionDone, missionMinutes, serverMessage, suggestBlock,
  type DailyMission, type FocusSession, type MissionKind,
} from '../lib/nox/focus';

const BG = '#090B0A';
const CARD = '#232624';
const CARD2 = '#191C1A';
const BORDER = '#4A4F4B';
const SOFT = '#343835';
const WHITE = '#FFFFFF';
const SEC = '#A5AAA6';
const MUTED = '#747A76';
const LIME = '#C8FF00';

const IDEAS = ['Avancer sur mon projet', 'Réviser', 'Finir un dossier', 'Lire', 'Ranger mon appartement', 'Méditer'];

const fmt = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default function Focus() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = todayLocalDate();

  const [mission, setMission] = useState<DailyMission | null>(null);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [open, setOpen] = useState<FocusSession | null>(null);
  const [pulse, setPulse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Formulaire de mission
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<MissionKind>('duration');
  const [target, setTarget] = useState<number>(120);

  // Mode focus
  const [block, setBlock] = useState<number>(25);
  const [distractions, setDistractions] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [result, setResult] = useState<{ minutes: number; total: number } | null>(null);
  const wakeLock = useRef<any>(null);

  const suggestion = suggestBlock(pulse, new Date().getHours());

  useEffect(() => { if (user) void load(); }, [user]);
  useEffect(() => { setBlock(suggestion.minutes); }, [pulse]);

  // Horloge d'affichage uniquement : la durée réelle est calculée par le serveur
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open]);

  // Garde l'écran allumé pendant une session (si l'appareil le permet)
  useEffect(() => {
    const nav: any = navigator;
    if (open && nav.wakeLock?.request) nav.wakeLock.request('screen').then((l: any) => { wakeLock.current = l; }).catch(() => {});
    if (!open && wakeLock.current) { wakeLock.current.release?.(); wakeLock.current = null; }
  }, [open]);

  const load = async () => {
    const [{ data: m }, { data: p }, { data: o }] = await Promise.all([
      supabase.from('daily_missions').select('id, date, title, kind, target_minutes, done_at')
        .eq('user_id', user!.id).eq('date', today).maybeSingle(),
      supabase.from('daily_pulses').select('sleep_score, energy_score, body_score')
        .eq('user_id', user!.id).eq('date', today).maybeSingle(),
      supabase.from('focus_sessions').select('id, mission_id, planned_minutes, started_at, ended_at, minutes, distractions')
        .eq('user_id', user!.id).is('ended_at', null).order('started_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    setMission((m as DailyMission) ?? null);
    setPulse(p ?? null);
    setOpen((o as FocusSession) ?? null);
    if (m) {
      const { data: s } = await supabase.from('focus_sessions')
        .select('id, mission_id, planned_minutes, started_at, ended_at, minutes, distractions')
        .eq('mission_id', (m as any).id).order('started_at');
      setSessions((s ?? []) as FocusSession[]);
    } else setSessions([]);
    setLoading(false);
  };

  const openForm = () => {
    setTitle(mission?.title ?? '');
    setKind(mission?.kind ?? 'duration');
    setTarget(mission?.target_minutes ?? 120);
    setEditing(true);
  };

  const saveMission = async () => {
    if (!title.trim() || busy) return;
    setBusy(true); setError('');
    const { error: e } = await supabase.rpc('set_daily_mission', {
      p_date: today, p_title: title.trim(), p_kind: kind, p_target_minutes: kind === 'duration' ? target : null,
    });
    setBusy(false);
    if (e) { setError(serverMessage(e)); return; }
    setEditing(false);
    await load();
  };

  const toggleTask = async () => {
    if (!mission || busy) return;
    setBusy(true); setError('');
    const { error: e } = await supabase.rpc('complete_focus_task', { p_mission_id: mission.id, p_done: !mission.done_at });
    setBusy(false);
    if (e) { setError(serverMessage(e)); return; }
    await load();
  };

  const start = async () => {
    if (!mission || busy) return;
    setBusy(true); setError(''); setResult(null); setDistractions(0);
    const { error: e } = await supabase.rpc('start_focus_session', { p_mission_id: mission.id, p_planned_minutes: block });
    setBusy(false);
    if (e) { setError(serverMessage(e)); return; }
    await load();
  };

  const stop = async () => {
    if (!open || busy) return;
    setBusy(true); setError('');
    const { data, error: e } = await supabase.rpc('stop_focus_session', { p_session_id: open.id, p_distractions: distractions });
    setBusy(false);
    if (e) { setError(serverMessage(e)); return; }
    setResult({ minutes: Number(data?.minutes ?? 0), total: Number(data?.mission_total ?? 0) });
    await load();
  };

  const done = mission ? missionMinutes(sessions, mission.id) : 0;
  const complete = mission ? isMissionDone(mission, done) : false;

  const card: React.CSSProperties = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20, marginBottom: 14 };
  const label: React.CSSProperties = { color: MUTED, fontSize: 11, fontWeight: 900, letterSpacing: '.09em', marginBottom: 12 };
  const choice = (on: boolean): React.CSSProperties => ({
    padding: '12px 14px', borderRadius: 13, cursor: 'pointer', fontWeight: 900, fontSize: 13,
    border: `1px solid ${on ? LIME : SOFT}`, background: on ? 'rgba(200,255,0,.08)' : CARD2, color: on ? LIME : WHITE,
  });
  const primary = (enabled = true): React.CSSProperties => ({
    width: '100%', padding: 18, border: 0, borderRadius: 14, fontWeight: 800, fontSize: 15,
    background: enabled ? LIME : '#2B2F2C', color: enabled ? BG : MUTED, cursor: enabled ? 'pointer' : 'not-allowed',
  });
  const secondary: React.CSSProperties = {
    width: '100%', padding: 16, borderRadius: 14, border: `1px solid ${SOFT}`, background: CARD2, color: WHITE, fontWeight: 800, fontSize: 14, cursor: 'pointer',
  };

  // ── MODE CONCENTRATION (session en cours) ───────────────────────────────────────────
  if (open) {
    const elapsed = (now - new Date(open.started_at).getTime()) / 1000;
    const remaining = open.planned_minutes * 60 - elapsed;
    return (
      <div style={{ minHeight: '100dvh', background: BG, color: WHITE, display: 'flex', flexDirection: 'column' }}>
        <main style={{ flex: 1, width: '100%', maxWidth: 560, margin: '0 auto', padding: '56px 20px 32px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: MUTED, fontSize: 11, fontWeight: 900, letterSpacing: '.12em' }}>MODE CONCENTRATION</div>
          <div style={{ fontSize: 24, fontWeight: 850, letterSpacing: '-.03em', marginTop: 8 }}>{mission?.title ?? 'Ta mission'}</div>
          <div style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: 'clamp(64px, 18vw, 104px)', fontWeight: 900, letterSpacing: '-.05em', fontVariantNumeric: 'tabular-nums', color: remaining <= 0 ? LIME : WHITE }}>
                {remaining > 0 ? fmt(remaining) : fmt(elapsed)}
              </div>
              <div style={{ color: SEC, fontSize: 14, marginTop: 6 }}>
                {remaining > 0 ? `Bloc de ${open.planned_minutes} min` : 'Bloc terminé ✓ · tu peux t’arrêter ou continuer'}
              </div>
              <div style={{ color: MUTED, fontSize: 12, marginTop: 18 }}>Pose ton téléphone. Une seule chose à la fois.</div>
            </div>
          </div>
          <button onClick={() => setDistractions(d => d + 1)} style={{ ...secondary, marginBottom: 10 }}>
            Noter une distraction{distractions ? ` (${distractions})` : ''}
          </button>
          <button onClick={stop} disabled={busy} style={primary(!busy)}>{busy ? 'ENREGISTREMENT…' : 'TERMINER LA SESSION'}</button>
          {error && <div style={{ marginTop: 10, color: '#E9C2C2', fontSize: 12 }}>{error}</div>}
          <div style={{ color: MUTED, fontSize: 11, textAlign: 'center', marginTop: 12 }}>Une session compte au maximum 90 minutes.</div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', background: BG, color: WHITE, paddingBottom: 'calc(160px + env(safe-area-inset-bottom))' }}>
      <main style={{ width: '100%', maxWidth: 760, margin: '0 auto', padding: '0 16px', boxSizing: 'border-box' }}>
        <header style={{ paddingTop: 44, paddingBottom: 22, display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => (editing ? setEditing(false) : navigate(-1))} aria-label="Retour"
            style={{ width: 42, height: 42, borderRadius: 14, border: `1px solid ${BORDER}`, background: CARD, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={18} color={WHITE} />
          </button>
          <div>
            <div style={{ color: MUTED, fontSize: 11, fontWeight: 900, letterSpacing: '.09em' }}>CONCENTRATION</div>
            <h1 style={{ margin: 0, fontSize: 'clamp(30px,5vw,40px)', fontWeight: 850, letterSpacing: '-.04em', lineHeight: 1 }}>Mission du jour</h1>
          </div>
        </header>

        {error && <div style={{ ...card, borderColor: '#5A3A3A', color: '#E9C2C2', fontSize: 13 }}>{error}</div>}

        {loading ? <div style={{ color: MUTED }}>Chargement…</div> : (!mission || editing) ? (
          /* ── DÉFINIR LA MISSION ── */
          <>
            <section style={card}>
              <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 6 }}>Qu’est-ce qui ferait de cette journée une réussite ?</div>
              <div style={{ color: SEC, fontSize: 13, marginBottom: 14 }}>Une seule chose importante.</div>
              <input value={title} onChange={e => setTitle(e.target.value.slice(0, 80))} placeholder="Ex : Avancer sur mon projet"
                style={{ width: '100%', boxSizing: 'border-box', padding: '15px 16px', borderRadius: 14, border: `1px solid ${SOFT}`, background: CARD2, color: WHITE, fontSize: 16, fontWeight: 800, outline: 'none' }} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {IDEAS.map(i => <button key={i} onClick={() => setTitle(i)} style={{ ...choice(title === i), padding: '8px 12px', fontSize: 12 }}>{i}</button>)}
              </div>
            </section>

            <section style={card}>
              <div style={label}>COMMENT LA MESURER ?</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button onClick={() => setKind('duration')} style={choice(kind === 'duration')}><Timer size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />Temps de concentration</button>
                <button onClick={() => setKind('task')} style={choice(kind === 'task')}><CircleCheck size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />Tâche à finir</button>
              </div>
              {kind === 'duration' && (
                <>
                  <div style={{ color: SEC, fontSize: 13, margin: '16px 0 10px' }}>Objectif aujourd’hui</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {MISSION_TARGETS.map(t => <button key={t} onClick={() => setTarget(t)} style={choice(target === t)}>{t >= 60 ? `${t / 60} h${t % 60 ? ` ${t % 60}` : ''}` : `${t} min`}</button>)}
                  </div>
                </>
              )}
            </section>

            <button onClick={saveMission} disabled={!title.trim() || busy} style={primary(!!title.trim() && !busy)}>
              {busy ? 'ENREGISTREMENT…' : mission ? 'ENREGISTRER' : 'C’EST MA MISSION'}
            </button>
          </>
        ) : (
          /* ── MISSION DÉFINIE ── */
          <>
            <section style={card}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <Target size={22} color={complete ? LIME : SEC} style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-.02em' }}>{mission.title}</div>
                  <div style={{ color: SEC, fontSize: 13, marginTop: 4 }}>
                    {mission.kind === 'duration' ? `Objectif : ${mission.target_minutes} min de concentration` : 'Tâche à finir aujourd’hui'}
                  </div>
                </div>
                <button onClick={openForm} style={{ border: 0, background: 'transparent', color: LIME, fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>Modifier</button>
              </div>

              {mission.kind === 'duration' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '18px 0 8px', fontSize: 13 }}>
                    <span style={{ fontWeight: 900 }}>{done} / {mission.target_minutes} min</span>
                    {complete && <span style={{ color: LIME, fontWeight: 900 }}>Mission accomplie ✓</span>}
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: SOFT, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, (done / Math.max(1, mission.target_minutes ?? 1)) * 100)}%`, height: '100%', background: LIME, borderRadius: 999, transition: 'width .5s' }} />
                  </div>
                </>
              ) : (
                <button onClick={toggleTask} disabled={busy} style={{ ...(mission.done_at ? secondary : primary(!busy)), marginTop: 18 }}>
                  {mission.done_at ? 'Annuler la validation' : <><Check size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />C’EST FAIT</>}
                </button>
              )}
              {mission.kind === 'task' && mission.done_at && <div style={{ color: LIME, fontWeight: 900, fontSize: 13, marginTop: 12 }}>Mission accomplie ✓</div>}
            </section>

            {result && (
              <section style={{ ...card, borderColor: LIME }}>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{result.minutes} min terminées</div>
                <div style={{ color: SEC, fontSize: 13, marginTop: 4 }}>{result.total} / {mission.target_minutes} min aujourd’hui</div>
              </section>
            )}

            {mission.kind === 'duration' && (
              <section style={card}>
                <div style={label}>{result ? 'CONTINUER ?' : 'LANCER UN BLOC'}</div>
                <div style={{ color: SEC, fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>
                  <span style={{ color: LIME, fontWeight: 900 }}>NOX : </span>{suggestion.reason}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                  {BLOCKS.map(b => <button key={b} onClick={() => setBlock(b)} style={choice(block === b)}>{b} min{b === suggestion.minutes ? ' ·' : ''}</button>)}
                </div>
                <button onClick={start} disabled={busy} style={primary(!busy)}>{busy ? 'DÉMARRAGE…' : result ? 'CONTINUER →' : 'DÉMARRER UNE SESSION'}</button>
              </section>
            )}

            {sessions.length > 0 && (
              <section style={card}>
                <div style={label}>SESSIONS DU JOUR</div>
                {sessions.filter(s => s.ended_at).map((s, i) => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: i ? `1px solid ${SOFT}` : 'none', fontSize: 13 }}>
                    <span style={{ color: SEC }}>{new Date(s.started_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span style={{ fontWeight: 900 }}>{s.minutes ?? 0} min{s.distractions ? <span style={{ color: MUTED, fontWeight: 700 }}> · {s.distractions} distraction{s.distractions > 1 ? 's' : ''}</span> : ''}</span>
                  </div>
                ))}
              </section>
            )}

            <div style={{ color: MUTED, fontSize: 11, lineHeight: 1.5, display: 'flex', gap: 6 }}>
              <Plus size={12} style={{ flexShrink: 0, marginTop: 2 }} />
              Une mission accomplie compte pour ta journée alignée. Les minutes sont calculées par le serveur, à partir de l’heure réelle de début et de fin de chaque session.
            </div>
          </>
        )}
      </main>
      <BottomNav active="home" />
    </div>
  );
}
