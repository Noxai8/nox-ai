import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Phone, Route as RouteIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { todayLocalDate } from '../lib/localDate';
import { BottomNav } from './Home';
import { HABITS, MODE_LABELS, habitName, isTargetMet, targetLine, usesValueInput, type HabitMode, type UserHabit } from '../lib/nox/habits';

const BG = '#090B0A';
const CARD = '#232624';
const CARD2 = '#191C1A';
const BORDER = '#4A4F4B';
const SOFT = '#343835';
const WHITE = '#FFFFFF';
const SEC = '#A5AAA6';
const MUTED = '#747A76';
const LIME = '#C8FF00';

type Log = { date: string; count: number; target_snapshot: number | null; mode_snapshot: HabitMode | null };
type Period = 7 | 30 | 90;

/** Clés de date locales (YYYY-MM-DD) des n derniers jours, du plus ancien au plus récent */
function lastDays(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i);
    out.push(x.toLocaleDateString('sv-SE'));
  }
  return out;
}

function frDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export default function HabitDetail() {
  const { habitId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [habit, setHabit] = useState<UserHabit | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(false);
  const [editMode, setEditMode] = useState<HabitMode>('reduce');
  const [editTarget, setEditTarget] = useState('');
  const [editPro, setEditPro] = useState(false);

  useEffect(() => { if (user && habitId) void load(); }, [user, habitId]);

  const load = async () => {
    const since = lastDays(90)[0];
    const [{ data: h, error: hErr }, { data: l, error: lErr }] = await Promise.all([
      supabase.from('user_habits')
        .select('id, kind, label, mode, unit, baseline, daily_target, professional_support, risk_flag, active, started_on')
        .eq('id', habitId!).eq('user_id', user!.id).maybeSingle(),
      supabase.from('habit_logs')
        .select('date, count, target_snapshot, mode_snapshot')
        .eq('habit_id', habitId!).eq('user_id', user!.id).gte('date', since)
        .order('date', { ascending: false }),
    ]);
    if (hErr || lErr) setError((hErr || lErr)!.message);
    setHabit(h && HABITS[(h as UserHabit).kind] ? (h as UserHabit) : null);
    setLogs((l ?? []).map((x: any) => ({
      date: x.date, count: Number(x.count),
      target_snapshot: x.target_snapshot == null ? null : Number(x.target_snapshot),
      mode_snapshot: x.mode_snapshot ?? null,
    })));
    setLoading(false);
  };

  const today = todayLocalDate();
  const todayLog = logs.find(l => l.date === today);
  const def = habit ? HABITS[habit.kind] : null;

  // Alcool à risque sans accompagnement : le serveur impose le suivi seulement
  const alcoholLocked = !!habit && habit.kind === 'alcohol' && habit.risk_flag && !editPro;

  const byDate = useMemo(() => new Map(logs.map(l => [l.date, l])), [logs]);
  const days = useMemo(() => lastDays(period), [period]);
  const periodLogs = days.map(d => byDate.get(d)).filter(Boolean) as Log[];
  const evaluated = periodLogs.filter(l => l.target_snapshot != null);
  const okLog = (l: Log) => isTargetMet(l.count, l.target_snapshot, l.mode_snapshot ?? (habit?.mode === 'build' ? 'build' : 'reduce')) === true;
  const metCount = evaluated.filter(okLog).length;
  const [valueDraft, setValueDraft] = useState('');

  // Évolution : seulement si départ connu et au moins 3 relevés sur les 7 derniers jours
  const recent = lastDays(7).map(d => byDate.get(d)).filter(Boolean) as Log[];
  const avgRecent = recent.length ? recent.reduce((s, l) => s + l.count, 0) / recent.length : null;
  const canMeasure = habit?.mode !== 'build' && habit?.baseline != null && habit.baseline > 0 && recent.length >= 3 && avgRecent != null;
  const change = canMeasure ? Math.round(((avgRecent! - habit!.baseline!) / habit!.baseline!) * 100) : null;

  const logToday = async (count: number) => {
    if (!user || !habit || busy) return;
    setBusy(true); setError('');
    const { error: e } = await supabase.from('habit_logs').upsert(
      { user_id: user.id, habit_id: habit.id, date: today, count: Math.max(0, count) },
      { onConflict: 'habit_id,date' },
    );
    if (e) setError(e.message);
    await load();
    setBusy(false);
  };

  const openEdit = () => {
    if (!habit) return;
    setEditMode(habit.mode);
    setEditTarget(habit.daily_target != null ? String(habit.daily_target) : '');
    setEditPro(habit.professional_support);
    setEditing(true);
  };

  const effectiveEditMode: HabitMode = alcoholLocked ? 'track' : editMode;
  const targetValid = effectiveEditMode === 'build'
    ? editTarget !== '' && Number(editTarget) > 0 && Number(editTarget) <= 100000
    : effectiveEditMode !== 'reduce'
      || (editTarget !== '' && Number(editTarget) >= 0 && Number(editTarget) <= 500);

  const saveEdit = async () => {
    if (!habit || !targetValid || busy) return;
    setBusy(true); setError('');
    const { error: e } = await supabase.from('user_habits').update({
      mode: effectiveEditMode,
      daily_target: effectiveEditMode === 'reduce' || effectiveEditMode === 'build' ? Number(editTarget) : null,
      professional_support: editPro,
    }).eq('id', habit.id);
    if (e) setError(e.message);
    setEditing(false);
    await load();
    setBusy(false);
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20 };
  const label: React.CSSProperties = { color: MUTED, fontSize: 11, fontWeight: 900, letterSpacing: '.09em', marginBottom: 12 };
  const choice = (on: boolean): React.CSSProperties => ({
    width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
    background: on ? 'rgba(200,255,0,.08)' : CARD2, border: `1px solid ${on ? LIME : SOFT}`, color: WHITE,
  });
  const pill: React.CSSProperties = {
    height: 44, minWidth: 54, padding: '0 16px', borderRadius: 14, border: `1px solid ${SOFT}`,
    background: CARD2, color: WHITE, fontSize: 14, fontWeight: 900, cursor: busy ? 'wait' : 'pointer', opacity: busy ? .6 : 1,
  };

  const dayLine = (l: Log) =>
    targetLine(l.count, l.target_snapshot, l.mode_snapshot ?? (habit?.mode === 'build' ? 'build' : 'reduce'), habit?.unit ?? def!.unit);


  const shell = (children: React.ReactNode) => (
    <div style={{ minHeight: '100dvh', background: BG, color: WHITE, paddingBottom: 'calc(160px + env(safe-area-inset-bottom))' }}>
      <main style={{ width: '100%', maxWidth: 760, margin: '0 auto', padding: '0 16px', boxSizing: 'border-box' }}>
        {children}
      </main>
      <BottomNav active="home" />
    </div>
  );

  if (loading) return shell(<div style={{ paddingTop: 60, color: MUTED }}>Chargement…</div>);

  if (!habit || !def) return shell(
    <div style={{ paddingTop: 60 }}>
      <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 10 }}>Habitude introuvable</div>
      <button onClick={() => navigate('/habits')} style={{ ...pill, color: LIME }}>Mes habitudes →</button>
    </div>,
  );

  const Icon = def.icon;
  const max = Math.max(1, ...periodLogs.map(l => l.count), habit.daily_target ?? 0, habit.baseline ?? 0);
  const W = 700, H = 160, gap = period === 7 ? 14 : period === 30 ? 4 : 2;
  const bw = (W - gap * (days.length - 1)) / days.length;
  const yOf = (v: number) => H - (v / max) * (H - 10);

  return shell(
    <>
      <header style={{ paddingTop: 44, paddingBottom: 22, display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => navigate(-1)} aria-label="Retour"
          style={{ width: 42, height: 42, borderRadius: 14, border: `1px solid ${BORDER}`, background: CARD, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <ArrowLeft size={18} color={WHITE} />
        </button>
        <div style={{ width: 46, height: 46, borderRadius: 15, background: CARD2, border: `1px solid ${SOFT}`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon size={21} color={LIME} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(26px,5vw,36px)', fontWeight: 850, letterSpacing: '-.04em', lineHeight: 1 }}>{habitName(habit)}</h1>
          <div style={{ color: SEC, fontSize: 13, marginTop: 6 }}>
            {MODE_LABELS[habit.mode].title}
            {habit.daily_target != null ? ` · cible ≤ ${habit.daily_target} ${habit.unit}/jour` : ''}
            {habit.professional_support ? ' · avec un professionnel' : ''}
          </div>
        </div>
      </header>

      {error && <div style={{ ...card, borderColor: '#5A3A3A', color: '#E9C2C2', fontSize: 13, marginBottom: 14 }}>{error}</div>}

      {/* AUJOURD'HUI */}
      <section style={{ ...card, marginBottom: 14 }}>
        <div style={label}>AUJOURD’HUI</div>
        <div style={{ fontSize: 34, fontWeight: 1000, letterSpacing: '-.04em', lineHeight: 1 }}>
          {todayLog ? todayLog.count.toLocaleString('fr-FR') : '—'}
          <span style={{ fontSize: 15, color: MUTED, fontWeight: 900 }}> {habit.unit}{habit.kind === 'steps' ? ' · déclaré' : ''}</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: todayLog && okLog(todayLog) ? LIME : SEC, fontWeight: 800 }}>
          {!todayLog ? 'Pas encore noté aujourd’hui' : dayLine(todayLog)}
        </div>
        {usesValueInput(habit) ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <input type="number" inputMode="numeric" min={0} max={100000} value={valueDraft} placeholder={todayLog ? String(todayLog.count) : 'Valeur du jour'}
              onChange={e => setValueDraft(e.target.value)}
              style={{ flex: 1, minWidth: 0, height: 44, padding: '0 14px', borderRadius: 14, border: `1px solid ${SOFT}`, background: CARD2, color: WHITE, fontSize: 15, fontWeight: 900, outline: 'none' }} />
            <button style={pill} disabled={busy || valueDraft === '' || Number(valueDraft) < 0}
              onClick={() => { void logToday(Number(valueDraft)); setValueDraft(''); }}>Enregistrer</button>
          </div>
        ) : (
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          {!todayLog && habit.mode !== 'build'
            ? <button style={{ ...pill, flex: 1 }} disabled={busy} onClick={() => logToday(0)}>Aucun{habit.kind === 'tobacco' ? 'e' : ''} aujourd’hui</button>
            : <button style={pill} disabled={busy || !todayLog || todayLog.count <= 0} onClick={() => todayLog && logToday(todayLog.count - 1)} aria-label="Retirer 1">−1</button>}
          <button style={{ ...pill, flex: 1 }} disabled={busy} onClick={() => logToday((todayLog?.count ?? 0) + 1)} aria-label="Ajouter 1">+1</button>
        </div>
        )}
      </section>

      {/* GRAPHIQUE */}
      <section style={{ ...card, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ ...label, marginBottom: 0 }}>ÉVOLUTION</div>
          <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 999, background: CARD2 }}>
            {([7, 30, 90] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                style={{ border: 0, borderRadius: 999, padding: '7px 12px', fontSize: 11, fontWeight: 900, cursor: 'pointer',
                  background: period === p ? LIME : 'transparent', color: period === p ? BG : SEC }}>
                {p === 7 ? '7 j' : p === 30 ? '30 j' : '3 mois'}
              </button>
            ))}
          </div>
        </div>

        {periodLogs.length === 0 ? (
          <div style={{ color: MUTED, fontSize: 13, padding: '18px 0' }}>Aucun relevé sur cette période.</div>
        ) : (
          <svg viewBox={`0 0 ${W} ${H + 4}`} width="100%" style={{ display: 'block' }} role="img" aria-label="Relevés quotidiens">
            {habit.daily_target != null && (
              <line x1={0} x2={W} y1={yOf(habit.daily_target)} y2={yOf(habit.daily_target)} stroke={SEC} strokeDasharray="6 6" strokeWidth={1.5} opacity={.6} />
            )}
            {days.map((d, i) => {
              const l = byDate.get(d);
              const x = i * (bw + gap);
              if (!l) return <rect key={d} x={x} y={H - 2} width={bw} height={2} rx={1} fill={SOFT} />;
              const ok = l.target_snapshot != null && okLog(l);
              const h = Math.max(3, (l.count / max) * (H - 10));
              return <rect key={d} x={x} y={H - h} width={bw} height={h} rx={Math.min(6, bw / 2)}
                fill={l.target_snapshot == null ? SEC : ok ? LIME : MUTED} />;
            })}
          </svg>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 14, fontSize: 12, color: SEC }}>
          <span>{periodLogs.length} jour{periodLogs.length > 1 ? 's' : ''} noté{periodLogs.length > 1 ? 's' : ''} sur {period}</span>
          {evaluated.length > 0 && <span>Dans la cible : {metCount} / {evaluated.length}</span>}
          {habit.daily_target != null && <span style={{ color: MUTED }}>– – cible actuelle</span>}
        </div>
      </section>

      {/* PROGRESSION */}
      <section style={{ ...card, marginBottom: 14 }}>
        <div style={label}>PROGRESSION</div>
        {canMeasure ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 10, fontSize: 15, fontWeight: 800 }}>
              <span style={{ color: SEC }}>Départ : <b style={{ color: WHITE }}>{habit.baseline}/jour</b></span>
              <span style={{ color: MUTED }}>→</span>
              <span style={{ color: SEC }}>Moyenne actuelle : <b style={{ color: WHITE }}>{round1(avgRecent!)}/jour</b></span>
            </div>
            {change !== null && change !== 0 && (
              <div style={{ marginTop: 12, fontSize: 30, fontWeight: 1000, letterSpacing: '-.04em', color: change < 0 ? LIME : SEC }}>
                {change > 0 ? '+' : '−'}{Math.abs(change)} %
              </div>
            )}
            <div style={{ marginTop: 8, color: MUTED, fontSize: 11 }}>Moyenne sur les {recent.length} jours notés des 7 derniers jours.</div>
          </>
        ) : (
          <div style={{ color: SEC, fontSize: 13, lineHeight: 1.55 }}>
            {habit.baseline == null || habit.baseline <= 0
              ? 'Aucune valeur de départ renseignée : NOX ne peut pas calculer ton évolution.'
              : `Pas encore assez de relevés pour mesurer ton évolution (3 jours notés sur les 7 derniers jours minimum, ${recent.length} pour l’instant).`}
          </div>
        )}
      </section>

      {/* IMPACT */}
      <section style={{ ...card, marginBottom: 14, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <RouteIcon size={20} color={LIME} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 6 }}>Impact sur ton parcours</div>
          <div style={{ color: SEC, fontSize: 13, lineHeight: 1.55 }}>
            {habit.mode === 'track'
              ? 'En suivi seulement, cette habitude n’a pas de cible : elle ne compte pas pour la journée alignée.'
              : 'Les journées où tu tiens cet objectif peuvent contribuer à une journée alignée. Un dépassement ne fait jamais perdre de progression.'}
          </div>
        </div>
      </section>

      {/* OBJECTIF */}
      <section style={{ ...card, marginBottom: 14 }}>
        <div style={label}>OBJECTIF ACTUEL</div>
        {!editing ? (
          <>
            <div style={{ fontSize: 16, fontWeight: 900 }}>
              {MODE_LABELS[habit.mode].title}
              {habit.daily_target != null ? ` · ≤ ${habit.daily_target} ${habit.unit}/jour` : ''}
            </div>
            <div style={{ color: SEC, fontSize: 12, marginTop: 4 }}>{MODE_LABELS[habit.mode].detail}</div>
            <button onClick={openEdit} style={{ ...pill, marginTop: 16, width: '100%', color: LIME }}>Modifier mon objectif</button>
          </>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {habit.kind === 'alcohol' && habit.risk_flag && (
              <div style={{ padding: 16, borderRadius: 14, background: CARD2, border: `1px solid ${SOFT}` }}>
                <div style={{ fontSize: 13, lineHeight: 1.55, marginBottom: 12 }}>
                  Tu as indiqué une consommation quotidienne ou des signes de manque. Un objectif de réduction ou d’arrêt
                  doit être fixé avec un médecin ou un professionnel ; NOX n’en propose pas.
                </div>
                <button onClick={() => setEditPro(!editPro)} style={choice(editPro)}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <Check size={16} color={editPro ? LIME : MUTED} />
                    <span style={{ fontSize: 13, fontWeight: 800 }}>Je suis accompagné par un professionnel et j’ai un objectif fixé avec lui.</span>
                  </div>
                </button>
              </div>
            )}

            {alcoholLocked ? (
              <div style={{ color: SEC, fontSize: 13, lineHeight: 1.55 }}>Suivi seulement, sans cible.</div>
            ) : (
              habit.mode === 'build' ? null : (['reduce', 'stop', 'track'] as HabitMode[]).map(m => (
                <button key={m} onClick={() => setEditMode(m)} style={choice(editMode === m)}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: editMode === m ? LIME : WHITE }}>{MODE_LABELS[m].title}</div>
                  <div style={{ fontSize: 12, color: SEC, marginTop: 3 }}>{MODE_LABELS[m].detail}</div>
                </button>
              ))
            )}

            {(effectiveEditMode === 'reduce' || effectiveEditMode === 'build') && (
              <input type="number" inputMode="numeric" min={0} max={habit.mode === 'build' ? 100000 : 500} value={editTarget} placeholder={habit.mode === 'build' ? 'Au moins…' : 'Cible quotidienne'}
                onChange={e => setEditTarget(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 14, border: `1px solid ${SOFT}`, background: CARD2, color: WHITE, fontSize: 16, fontWeight: 800, outline: 'none' }} />
            )}
            <div style={{ color: MUTED, fontSize: 11, lineHeight: 1.5 }}>
              Le nouvel objectif s’applique aux prochains relevés. Les journées déjà notées gardent la cible de l’époque.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={() => setEditing(false)} style={pill}>Annuler</button>
              <button onClick={saveEdit} disabled={!targetValid || busy}
                style={{ ...pill, border: 0, background: targetValid ? LIME : '#2B2F2C', color: targetValid ? BG : MUTED }}>
                Enregistrer
              </button>
            </div>
          </div>
        )}
      </section>

      {/* HISTORIQUE */}
      <section style={{ ...card, marginBottom: 14 }}>
        <div style={label}>HISTORIQUE</div>
        {logs.length === 0 ? (
          <div style={{ color: MUTED, fontSize: 13 }}>Aucun relevé pour l’instant.</div>
        ) : (
          <div>
            {logs.slice(0, 30).map((l, i) => {
              const ok = l.target_snapshot != null && okLog(l);
              return (
                <div key={l.date} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '11px 0', borderTop: i ? `1px solid ${SOFT}` : 'none' }}>
                  <span style={{ color: SEC, fontSize: 13, textTransform: 'capitalize' }}>{l.date === today ? 'Aujourd’hui' : frDate(l.date)}</span>
                  <span style={{ fontSize: 13, fontWeight: 900, color: ok ? LIME : WHITE }}>{dayLine(l)}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {def.resources.length > 0 && (
        <section style={card}>
          <div style={label}>BESOIN D’AIDE ?</div>
          {def.resources.map(r => (
            <a key={r.label} href={r.href}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, background: CARD2, color: WHITE, textDecoration: 'none' }}>
              <Phone size={16} color={LIME} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 900 }}>{r.label}</div>
                <div style={{ fontSize: 12, color: SEC, marginTop: 2 }}>{r.detail}</div>
              </div>
            </a>
          ))}
        </section>
      )}
    </>,
  );
}
