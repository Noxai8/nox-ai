import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Dumbbell, Moon, Phone, Plus, ShieldCheck, Target, Utensils } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';
import {
  CUSTOM_UNITS, HABITS, HABIT_KINDS, MODE_LABELS, habitName,
  type HabitKind, type HabitMode, type UserHabit,
} from '../lib/nox/habits';

const BG = '#090B0A';
const CARD = '#232624';
const CARD2 = '#191C1A';
const BORDER = '#4A4F4B';
const WHITE = '#FFFFFF';
const SEC = '#A5AAA6';
const MUTED = '#747A76';
const LIME = '#C8FF00';

type Draft = {
  kind: HabitKind;
  label: string;
  unit: string;
  mode: HabitMode;
  baseline: string;
  target: string;
  riskAnswer: 'yes' | 'no' | null;
  professional: boolean;
  consent: boolean;
};

type FocusArea = 'movement' | 'nutrition' | 'recovery' | 'focus';
const FOCUS: { id: FocusArea; label: string; detail: string; icon: typeof Dumbbell; setup?: { label: string; path: string } }[] = [
  { id: 'movement',  label: 'Mouvement & corps',     detail: 'Séances, activités, programme.', icon: Dumbbell, setup: { label: 'Configurer mon programme', path: '/program' } },
  { id: 'nutrition', label: 'Nutrition',             detail: 'Repas, objectifs caloriques, macros.', icon: Utensils, setup: { label: 'Configurer mes objectifs', path: '/nutrition-goals' } },
  { id: 'recovery',  label: 'Sommeil & récupération', detail: 'Sommeil, énergie, récupération.', icon: Moon },
  { id: 'focus',     label: 'Concentration',          detail: 'Mission du jour, sessions de concentration.', icon: Target, setup: { label: 'Définir ma mission du jour', path: '/focus' } },
];

type OnboardingQueue = { onboardingSetup?: HabitKind[]; next?: { path: string; state?: unknown } };

const emptyDraft = (kind: HabitKind): Draft => ({
  kind, label: '', unit: kind === 'steps' ? 'pas' : 'min',
  mode: kind === 'steps' || kind === 'custom' ? 'build' : 'reduce',
  baseline: '', target: kind === 'steps' ? '7000' : '', riskAnswer: null, professional: false, consent: false,
});

const isBuildKind = (k: HabitKind) => k === 'steps' || k === 'custom';
const GOAL_IDEAS = ['Lire', 'Méditer', 'Boire de l’eau', 'Étirements', 'Marcher', 'Écrire'];

export default function Habits() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [habits, setHabits] = useState<UserHabit[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [focus, setFocus] = useState<FocusArea[] | null>(null);
  const [justEnabled, setJustEnabled] = useState<FocusArea | null>(null);

  // File de configuration en fin d'onboarding
  const location = useLocation();
  const flow = (location.state as OnboardingQueue | null) ?? null;
  const [queue, setQueue] = useState<HabitKind[]>(flow?.onboardingSetup ?? []);
  const inOnboarding = !!flow?.onboardingSetup;

  useEffect(() => { if (user) void load(); }, [user]);

  // Ouvre automatiquement la configuration de la première habitude choisie à l'inscription
  useEffect(() => {
    if (!loading && inOnboarding && !draft && queue.length > 0) setDraft(emptyDraft(queue[0]));
  }, [loading, queue]);

  const advanceQueue = () => {
    const rest = queue.slice(1);
    setQueue(rest);
    setDraft(null);
    if (rest.length === 0) {
      const next = flow?.next ?? { path: '/home' };
      navigate(next.path, { replace: true, state: next.state });
    }
  };

  const toggleFocus = async (area: FocusArea) => {
    if (!user || !focus) return;
    const nextFocus = focus.includes(area) ? focus.filter(a => a !== area) : [...focus, area];
    setFocus(nextFocus);
    setJustEnabled(focus.includes(area) ? null : area);
    const { error: e } = await supabase.from('profiles').update({ focus_areas: nextFocus }).eq('id', user.id);
    if (e) { setError(e.message); setFocus(focus); }
  };

  const load = async () => {
    const { data, error: e } = await supabase
      .from('user_habits')
      .select('id, kind, label, mode, unit, baseline, daily_target, professional_support, risk_flag, active, started_on')
      .eq('user_id', user!.id)
      .eq('active', true)
      .order('created_at');
    if (e) setError(e.message);
    setHabits((data ?? []) as UserHabit[]);
    const { data: p } = await supabase.from('profiles').select('focus_areas').eq('id', user!.id).maybeSingle();
    setFocus(((p?.focus_areas ?? []) as FocusArea[]));
    setLoading(false);
  };

  const activeKinds = new Set(habits.map(h => h.kind));
  const available = HABIT_KINDS.filter(k => !activeKinds.has(k));

  // Alcool + consommation à risque sans accompagnement → suivi uniquement, aucune cible proposée par NOX
  const alcoholLocked = draft?.kind === 'alcohol' && draft.riskAnswer === 'yes' && !draft.professional;
  const def = draft ? HABITS[draft.kind] : null;
  const effectiveMode: HabitMode | null = draft ? (alcoholLocked ? 'track' : draft.mode) : null;

  const canSave = (() => {
    if (!draft || !def) return false;
    if (def.discreet && !draft.consent) return false;
    if (def.needsRiskCheck && draft.riskAnswer === null) return false;
    if (isBuildKind(draft.kind)) {
      const t = Number(draft.target);
      if (draft.kind === 'custom' && !draft.label.trim()) return false;
      return draft.target !== '' && Number.isFinite(t) && t > 0 && t <= 100000;
    }
    if (effectiveMode === 'reduce') {
      const t = Number(draft.target);
      return draft.target !== '' && Number.isFinite(t) && t >= 0 && t <= 500;
    }
    return true;
  })();

  const save = async () => {
    if (!user || !draft || !def || !canSave || saving) return;
    setSaving(true); setError('');
    const baseline = draft.baseline === '' ? null : Number(draft.baseline);
    const { error: e } = await supabase.from('user_habits').insert({
      user_id: user.id,
      kind: draft.kind,
      label: draft.kind === 'custom' ? draft.label.trim().slice(0, 40) : null,
      mode: effectiveMode,
      unit: draft.kind === 'custom' ? draft.unit : def.unit,
      baseline: Number.isFinite(baseline as number) ? baseline : null,
      daily_target: effectiveMode === 'reduce' || effectiveMode === 'build' ? Number(draft.target) : null,
      professional_support: draft.professional,
      risk_flag: draft.riskAnswer === 'yes',
    });
    setSaving(false);
    if (e) { setError(e.message); return; }
    await load();
    if (inOnboarding) { advanceQueue(); return; }
    setDraft(null);
  };

  const stopTracking = async (h: UserHabit) => {
    const name = habitName(h);
    if (!confirm(`Retirer « ${name} » de tes habitudes ? Ton historique est conservé.`)) return;
    const { error: e } = await supabase.from('user_habits').update({ active: false }).eq('id', h.id);
    if (e) { setError(e.message); return; }
    void load();
  };

  const card: React.CSSProperties = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20 };
  const choice = (on: boolean): React.CSSProperties => ({
    width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
    background: on ? 'rgba(200,255,0,.08)' : CARD2, border: `1px solid ${on ? LIME : '#343835'}`, color: WHITE,
  });
  const input: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 14, border: '1px solid #343835',
    background: CARD2, color: WHITE, fontSize: 16, fontWeight: 800, outline: 'none',
  };

  return (
    <div style={{ minHeight: '100dvh', background: BG, color: WHITE, paddingBottom: 'calc(160px + env(safe-area-inset-bottom))' }}>
      <main style={{ width: '100%', maxWidth: 760, margin: '0 auto', padding: '0 16px', boxSizing: 'border-box' }}>

        <header style={{ paddingTop: 44, paddingBottom: 26, display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => (inOnboarding ? advanceQueue() : draft ? setDraft(null) : navigate(-1))} aria-label="Retour"
            style={{ width: 42, height: 42, borderRadius: 14, border: `1px solid ${BORDER}`, background: CARD, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <ArrowLeft size={18} color={WHITE} />
          </button>
          <div>
            <div style={{ color: MUTED, fontSize: 11, fontWeight: 900, letterSpacing: '.09em' }}>{inOnboarding ? 'TON PARCOURS' : 'MOI'}</div>
            <h1 style={{ margin: 0, fontSize: 'clamp(30px,5vw,40px)', fontWeight: 850, letterSpacing: '-.04em', lineHeight: 1 }}>
              {draft && def ? (isBuildKind(draft.kind) ? def.label : def.publicLabel) : 'Mes habitudes'}
            </h1>
          </div>
        </header>

        {error && (
          <div style={{ ...card, borderColor: '#7A2E2E', color: '#FFB4B4', fontSize: 13, marginBottom: 14 }}>{error}</div>
        )}

        {/* ── LISTE ─────────────────────────────────────────────── */}
        {!draft && (
          <>
            {focus && (
              <section style={{ ...card, marginBottom: 24 }}>
                <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 4 }}>Ce que tu travailles</div>
                <div style={{ color: SEC, fontSize: 12, lineHeight: 1.5, marginBottom: 14 }}>
                  NOX ne te propose des priorités que sur les axes activés. Tu peux en changer à tout moment.
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {FOCUS.map(f => {
                    const on = focus.includes(f.id); const FIcon = f.icon;
                    return (
                      <div key={f.id}>
                        <button onClick={() => toggleFocus(f.id)} style={{ ...choice(on), display: 'flex', alignItems: 'center', gap: 12 }}>
                          <FIcon size={18} color={on ? LIME : MUTED} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 900, color: on ? WHITE : SEC }}>{f.label}</div>
                            <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{f.detail}</div>
                          </div>
                          {on && <Check size={16} color={LIME} />}
                        </button>
                        {justEnabled === f.id && f.setup && (
                          <button onClick={() => navigate(f.setup!.path)}
                            style={{ marginTop: 6, width: '100%', padding: '10px 14px', borderRadius: 12, border: 0, background: 'transparent', color: LIME, fontSize: 12, fontWeight: 900, textAlign: 'left', cursor: 'pointer' }}>
                            {f.setup.label} →
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <p style={{ color: SEC, fontSize: 14, lineHeight: 1.55, margin: '0 0 22px' }}>
              Choisis ce que tu veux travailler. Chaque habitude apparaît sur Aujourd’hui uniquement si tu l’as activée,
              et tenir ta cible du jour compte pour ta progression.
            </p>

            {loading ? (
              <div style={{ color: MUTED, fontSize: 13 }}>Chargement…</div>
            ) : (
              <>
                {habits.length > 0 && (
                  <section style={{ display: 'grid', gap: 10, marginBottom: 28 }}>
                    {habits.map(h => {
                      const d = HABITS[h.kind]; const Icon = d.icon;
                      return (
                        <div key={h.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{ width: 44, height: 44, borderRadius: 14, background: CARD2, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                            <Icon size={20} color={LIME} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 900 }}>{habitName(h)}</div>
                            <div style={{ color: SEC, fontSize: 12, marginTop: 3 }}>
                              {h.mode === 'build'
                                ? `Au moins ${Number(h.daily_target).toLocaleString('fr-FR')} ${h.unit}/jour${h.kind === 'steps' ? ' · déclaré' : ''}`
                                : <>{MODE_LABELS[h.mode].title}{h.daily_target != null ? ` · cible ${h.daily_target} ${h.unit}/jour` : ''}</>}
                              {h.professional_support ? ' · avec un professionnel' : ''}
                            </div>
                          </div>
                          <button onClick={() => stopTracking(h)}
                            style={{ border: 0, background: 'transparent', color: MUTED, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                            Retirer
                          </button>
                        </div>
                      );
                    })}
                  </section>
                )}

                <div style={{ color: MUTED, fontSize: 11, fontWeight: 900, letterSpacing: '.09em', marginBottom: 10 }}>OBJECTIFS DU QUOTIDIEN</div>
                <section style={{ display: 'grid', gap: 10, marginBottom: 28 }}>
                  {([...(activeKinds.has('steps') ? [] : ['steps']), 'custom'] as HabitKind[]).map(k => {
                    const d = HABITS[k]; const Icon = d.icon;
                    return (
                      <button key={k} onClick={() => setDraft(emptyDraft(k))}
                        style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', color: WHITE, textAlign: 'left' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 14, background: CARD2, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                          <Icon size={20} color={SEC} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 15, fontWeight: 900 }}>{d.label}</div>
                          <div style={{ fontSize: 12, color: SEC, marginTop: 3 }}>
                            {k === 'steps' ? 'Un nombre de pas à atteindre chaque jour' : 'Lire, méditer, boire de l’eau…'}
                          </div>
                        </div>
                        <Plus size={18} color={LIME} />
                      </button>
                    );
                  })}
                </section>

                {available.length > 0 && (
                  <>
                    <div style={{ color: MUTED, fontSize: 11, fontWeight: 900, letterSpacing: '.09em', marginBottom: 10 }}>HABITUDES À RÉDUIRE OU ARRÊTER</div>
                    <section style={{ display: 'grid', gap: 10 }}>
                      {available.map(k => {
                        const d = HABITS[k]; const Icon = d.icon;
                        return (
                          <button key={k} onClick={() => setDraft(emptyDraft(k))}
                            style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', color: WHITE, textAlign: 'left' }}>
                            <div style={{ width: 44, height: 44, borderRadius: 14, background: CARD2, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                              <Icon size={20} color={SEC} />
                            </div>
                            <div style={{ flex: 1, fontSize: 15, fontWeight: 900 }}>{d.label}</div>
                            <Plus size={18} color={LIME} />
                          </button>
                        );
                      })}
                    </section>
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ── CONFIGURATION ─────────────────────────────────────── */}
        {draft && def && (
          <div style={{ display: 'grid', gap: 14 }}>

            {def.discreet && (
              <section style={card}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                  <ShieldCheck size={18} color={LIME} />
                  <div style={{ fontSize: 14, fontWeight: 900 }}>Discrétion</div>
                </div>
                <div style={{ color: SEC, fontSize: 13, lineHeight: 1.55, marginBottom: 14 }}>
                  Cette habitude apparaîtra partout sous le nom « {def.publicLabel} ». Elle n’est visible que par toi,
                  n’apparaît dans aucune notification détaillée et n’est jamais partagée.
                </div>
                <button onClick={() => setDraft({ ...draft, consent: !draft.consent })} style={choice(draft.consent)}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <Check size={16} color={draft.consent ? LIME : MUTED} />
                    <span style={{ fontSize: 13, fontWeight: 800 }}>J’accepte que NOX enregistre cette donnée personnelle sensible.</span>
                  </div>
                </button>
              </section>
            )}

            {def.needsRiskCheck && (
              <section style={card}>
                <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 6 }}>Avant de commencer</div>
                <div style={{ color: SEC, fontSize: 13, lineHeight: 1.55, marginBottom: 14 }}>
                  Bois-tu tous les jours, ou as-tu déjà ressenti un manque (tremblements, sueurs, anxiété) quand tu ne bois pas ?
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {(['yes', 'no'] as const).map(a => (
                    <button key={a} onClick={() => setDraft({ ...draft, riskAnswer: a })} style={{ ...choice(draft.riskAnswer === a), textAlign: 'center', fontWeight: 900 }}>
                      {a === 'yes' ? 'Oui' : 'Non'}
                    </button>
                  ))}
                </div>

                {draft.riskAnswer === 'yes' && (
                  <div style={{ marginTop: 14, padding: 16, borderRadius: 14, background: CARD2, border: '1px solid #343835' }}>
                    <div style={{ fontSize: 13, lineHeight: 1.55, color: WHITE, marginBottom: 12 }}>
                      Dans ce cas, arrêter ou réduire brutalement peut être dangereux. Ce changement doit se faire avec un médecin
                      ou un professionnel. NOX peut t’aider à suivre ta consommation, mais ne fixera pas d’objectif à ta place.
                    </div>
                    <button onClick={() => setDraft({ ...draft, professional: !draft.professional })} style={choice(draft.professional)}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <Check size={16} color={draft.professional ? LIME : MUTED} />
                        <span style={{ fontSize: 13, fontWeight: 800 }}>Je suis accompagné par un professionnel et j’ai un objectif fixé avec lui.</span>
                      </div>
                    </button>
                  </div>
                )}
              </section>
            )}

            {isBuildKind(draft.kind) && (
              <>
                <section style={card}>
                  <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 12 }}>Ton objectif quotidien</div>
                  {draft.kind === 'custom' && (
                    <>
                      <input value={draft.label} onChange={e => setDraft({ ...draft, label: e.target.value.slice(0, 40) })}
                        placeholder="Ex : Lire" style={input} />
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0 18px' }}>
                        {GOAL_IDEAS.map(g => (
                          <button key={g} onClick={() => setDraft({ ...draft, label: g })}
                            style={{ ...choice(draft.label === g), width: 'auto', padding: '8px 12px', fontSize: 12, fontWeight: 800 }}>{g}</button>
                        ))}
                      </div>
                      <div style={{ color: SEC, fontSize: 13, marginBottom: 10 }}>Unité</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                        {CUSTOM_UNITS.map(u => (
                          <button key={u} onClick={() => setDraft({ ...draft, unit: u })}
                            style={{ ...choice(draft.unit === u), width: 'auto', padding: '8px 14px', fontSize: 13, fontWeight: 900 }}>{u}</button>
                        ))}
                      </div>
                    </>
                  )}
                  <div style={{ color: SEC, fontSize: 13, marginBottom: 10 }}>
                    Au moins combien de {draft.kind === 'custom' ? draft.unit : 'pas'} par jour ?
                  </div>
                  <input type="number" inputMode="numeric" min={1} max={100000} placeholder={draft.kind === 'steps' ? '7000' : 'Ex : 20'}
                    value={draft.target} onChange={e => setDraft({ ...draft, target: e.target.value })} style={input} />
                  <div style={{ color: MUTED, fontSize: 12, lineHeight: 1.5, marginTop: 12 }}>
                    {draft.kind === 'steps'
                      ? 'Tu saisis ton nombre de pas : il est affiché comme déclaré. La mesure automatique arrivera avec l’app mobile (Apple Santé, Health Connect).'
                      : 'Cet objectif apparaît dans Ta journée. Il ne rapporte pas d’XP à lui seul, pour qu’un objectif facile ne remplace jamais un vrai effort.'}
                  </div>
                </section>
                <button onClick={save} disabled={!canSave || saving}
                  style={{ width: '100%', padding: 18, border: 0, borderRadius: 14, background: canSave ? LIME : '#2B2F2C', color: canSave ? BG : MUTED, fontWeight: 800, fontSize: 15, cursor: canSave ? 'pointer' : 'not-allowed' }}>
                  {saving ? 'ENREGISTREMENT…' : 'AJOUTER CET OBJECTIF'}
                </button>
              </>
            )}

            {!isBuildKind(draft.kind) && (!def.needsRiskCheck || draft.riskAnswer !== null) && (
              <>
                <section style={card}>
                  <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 12 }}>Ton objectif</div>
                  {alcoholLocked ? (
                    <div style={{ color: SEC, fontSize: 13, lineHeight: 1.55 }}>
                      Suivi seulement : tu notes ta consommation chaque jour, sans cible. Tu pourras définir un objectif quand il aura été fixé avec un professionnel.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {(['reduce', 'stop', 'track'] as HabitMode[]).map(m => (
                        <button key={m} onClick={() => setDraft({ ...draft, mode: m })} style={choice(draft.mode === m)}>
                          <div style={{ fontSize: 14, fontWeight: 900, color: draft.mode === m ? LIME : WHITE }}>{MODE_LABELS[m].title}</div>
                          <div style={{ fontSize: 12, color: SEC, marginTop: 3 }}>{MODE_LABELS[m].detail}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </section>

                <section style={card}>
                  <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 6 }}>En ce moment</div>
                  <div style={{ color: SEC, fontSize: 13, marginBottom: 12 }}>
                    En moyenne, combien de {def.unit} par jour ? (facultatif, sert à mesurer ton évolution)
                  </div>
                  <input type="number" inputMode="numeric" min={0} max={500} placeholder="—" value={draft.baseline}
                    onChange={e => setDraft({ ...draft, baseline: e.target.value })} style={input} />

                  {effectiveMode === 'reduce' && (
                    <>
                      <div style={{ color: SEC, fontSize: 13, margin: '18px 0 12px' }}>
                        {draft.professional
                          ? `Cible quotidienne fixée avec ton professionnel (${def.unit} maximum)`
                          : `Ta cible quotidienne (${def.unit} maximum)`}
                      </div>
                      <input type="number" inputMode="numeric" min={0} max={500} placeholder="Ex : 5" value={draft.target}
                        onChange={e => setDraft({ ...draft, target: e.target.value })} style={input} />
                    </>
                  )}
                </section>

                {def.resources.length > 0 && (
                  <section style={card}>
                    <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 10 }}>Besoin d’aide ?</div>
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

                <button onClick={save} disabled={!canSave || saving}
                  style={{ width: '100%', padding: 18, border: 0, borderRadius: 14, background: canSave ? LIME : '#2B2F2C', color: canSave ? BG : MUTED, fontWeight: 800, fontSize: 15, cursor: canSave ? 'pointer' : 'not-allowed' }}>
                  {saving ? 'ENREGISTREMENT…' : 'ACTIVER CETTE HABITUDE'}
                </button>
                {inOnboarding && (
                  <button onClick={advanceQueue}
                    style={{ width: '100%', padding: 14, border: 0, background: 'transparent', color: MUTED, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
                    Plus tard
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </main>
      <BottomNav active="moi" />
    </div>
  );
}
