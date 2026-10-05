import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, Check, Sparkles, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { localDayStartISO, todayLocalDate } from '../lib/localDate';
import { foodTotalsByLocalDay } from '../lib/nox/foodDays';
import { usePlan } from '../lib/usePlan';
import { BottomNav } from './Home';

const BG    = '#0A0A0A';
const CARD  = '#111111';
const CARD2 = '#161616';
const WHITE = '#FFFFFF';
const LIME  = '#C8FF00';
const MUTED = '#666666';
const BORDER= '#1E1E1E';
const BLACK = '#0B0B0B';
const ACCENT = LIME;

// ── Helpers ───────────────────────────────────────────────────────────────────

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// ── Moteur scénario déterministe ─────────────────────────────────────────────

type ScenarioItem = {
  label: string;
  value: string;
  trend: 'up' | 'stable' | 'unknown';
  basis: string; // source des données utilisées
};

type Horizon = '30j' | '90j' | '6m';

type Scenario = {
  horizon: Horizon;
  title: string;
  items: ScenarioItem[];
  dataQuality: 'sufficient' | 'partial' | 'insufficient';
  evidence: string[];
};

function buildScenarios(data: {
  pulses: any[];
  closures: any[];
  movements: any[];
  foodDays: number;
  avgKcal: number | null;
  avgProt: number | null;
  totalObs: number;
  profile: any;
}): Scenario[] {
  const { pulses, closures, movements, foodDays, avgKcal, avgProt, totalObs, profile } = data;

  const avgEnergy = pulses.length >= 3 ? avg(pulses.map(p => p.energy_score)) : null;
  const avgSleep  = pulses.length >= 3 ? avg(pulses.map(p => p.sleep_score))  : null;
  const avgBody   = pulses.length >= 3 ? avg(pulses.map(p => p.body_score))   : null;

  const movementsPerWeek = totalObs > 0 ? (movements.length / Math.max(totalObs / 7, 1)) : 0;
  const closureRate      = totalObs > 0 ? (closures.filter(c => c.completion === 'yes' || c.completion === 'partial').length / Math.max(closures.length, 1)) : 0;

  const hasEnoughData = pulses.length >= 5 && totalObs >= 7;

  const evidence: string[] = [
    pulses.length    > 0 ? `${pulses.length} Pulse${pulses.length > 1 ? 's' : ''} analysé${pulses.length > 1 ? 's' : ''}` : '',
    movements.length > 0 ? `${movements.length} activité${movements.length > 1 ? 's' : ''} enregistrée${movements.length > 1 ? 's' : ''}` : '',
    foodDays         > 0 ? `${foodDays} jour${foodDays > 1 ? 's' : ''} de nutrition` : '',
    totalObs         > 0 ? `${totalObs} journée${totalObs > 1 ? 's' : ''} observée${totalObs > 1 ? 's' : ''}` : '',
  ].filter(Boolean);

  // ── Scénario 30 jours ─────────────────────────────────────────────────────
  const items30: ScenarioItem[] = [];

  if (avgEnergy !== null) {
    const trend = avgEnergy >= 3.5 ? 'up' : avgEnergy >= 2.5 ? 'stable' : 'stable';
    items30.push({
      label: 'Énergie quotidienne',
      value: trend === 'up' ? 'Maintien ou légère amélioration si le rythme continue.' : 'Stable si tu maintiens ton Pulse régulier.',
      trend,
      basis: `Moyenne actuelle ${Math.round(avgEnergy * 10) / 10}/5 sur ${pulses.length} jours`,
    });
  }

  if (movementsPerWeek >= 2) {
    items30.push({
      label: 'Activité physique',
      value: `Si tu maintiens ${Math.round(movementsPerWeek)} activité${movementsPerWeek >= 2 ? 's' : ''}/semaine, NOX observera ta régularité d'ici 30 jours.`,
      trend: 'stable',
      basis: `${movements.length} activités enregistrées`,
    });
  }

  if (!hasEnoughData) {
    items30.push({
      label: 'Données insuffisantes',
      value: 'Continue à utiliser NOX chaque jour. Il faut au moins 7 journées pour construire un scénario fiable.',
      trend: 'unknown',
      basis: `${totalObs} journée${totalObs !== 1 ? 's' : ''} observée${totalObs !== 1 ? 's' : ''}`,
    });
  }

  // ── Scénario 90 jours ─────────────────────────────────────────────────────
  const items90: ScenarioItem[] = [];

  if (hasEnoughData && closureRate >= 0.5) {
    items90.push({
      label: 'Régularité',
      value: 'Si tu continues à clôturer tes journées, NOX aura assez de recul pour observer tes cycles.',
      trend: 'up',
      basis: `${Math.round(closureRate * 100)}% de priorités accomplies ou partielles`,
    });
  }

  if (avgProt !== null && avgProt > 0) {
    const goalProt = profile?.onboarding_context?.nutrition?.protein_target ?? null;
    items90.push({
      label: 'Apport en protéines',
      value: goalProt && avgProt < goalProt
        ? `À ce rythme, tu atteindras environ ${Math.round(avgProt)}g/j de moyenne. L'objectif est ${goalProt}g.`
        : `Moyenne actuelle : ${Math.round(avgProt)}g/j. NOX continue d'observer.`,
      trend: 'stable',
      basis: `Moyenne sur ${foodDays} jour${foodDays > 1 ? 's' : ''} de nutrition`,
    });
  }

  if (totalObs < 30) {
    items90.push({
      label: 'Pas encore assez de recul',
      value: 'Un scénario à 90 jours nécessite au moins 30 journées observées. Continue.',
      trend: 'unknown',
      basis: `${totalObs} journée${totalObs !== 1 ? 's' : ''} observée${totalObs !== 1 ? 's' : ''}`,
    });
  }

  // ── Scénario 6 mois ───────────────────────────────────────────────────────
  const items6m: ScenarioItem[] = [];

  if (totalObs >= 60 && avgSleep !== null && avgBody !== null) {
    items6m.push({
      label: 'Tendance long terme',
      value: 'Avec 6 mois de données, NOX pourra identifier tes cycles, tes pics et tes creux récurrents.',
      trend: 'up',
      basis: `${totalObs} journées observées`,
    });
  } else {
    items6m.push({
      label: 'Horizon à construire',
      value: 'NOX a besoin de plusieurs mois de données régulières pour construire un scénario à 6 mois crédible.',
      trend: 'unknown',
      basis: `${totalObs} journée${totalObs !== 1 ? 's' : ''} observée${totalObs !== 1 ? 's' : ''}`,
    });
  }

  const goal = profile?.goal_type ?? profile?.onboarding_context?.goal ?? null;
  if (goal && totalObs >= 30) {
    items6m.push({
      label: 'Objectif déclaré',
      value: `Ton objectif "${goal}" sera mieux cerné dans 6 mois si tu maintiens ce rythme.`,
      trend: 'up',
      basis: 'Profil onboarding',
    });
  }

  return [
    {
      horizon: '30j',
      title: 'Dans 30 jours',
      items: items30.length ? items30 : [{ label: 'Données insuffisantes', value: 'Reviens après 7 journées complètes de Pulse.', trend: 'unknown', basis: '' }],
      dataQuality: hasEnoughData ? 'sufficient' : totalObs >= 3 ? 'partial' : 'insufficient',
      evidence,
    },
    {
      horizon: '90j',
      title: 'Dans 90 jours',
      items: items90.length ? items90 : [{ label: 'Pas encore calculable', value: 'NOX a besoin de plus de données avant de projeter à 90 jours.', trend: 'unknown', basis: '' }],
      dataQuality: totalObs >= 14 ? 'partial' : 'insufficient',
      evidence,
    },
    {
      horizon: '6m',
      title: 'Dans 6 mois',
      items: items6m,
      dataQuality: totalObs >= 60 ? 'sufficient' : 'insufficient',
      evidence,
    },
  ];
}

const trendIcon = { up: '↑', stable: '→', unknown: '○' };
const trendColor = { up: LIME, stable: '#FFD93D', unknown: MUTED };
const qualityLabel = { sufficient: 'Données suffisantes', partial: 'Données partielles', insufficient: 'Données insuffisantes' };
const qualityColor = { sufficient: LIME, partial: '#FFD93D', insufficient: MUTED };

// ── Composant ─────────────────────────────────────────────────────────────────

export default function NoxFuture() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const location    = useLocation();
  const { isPro }   = usePlan();

  const routeState      = (location.state as any) || {};
  const onboardingFlow  = Boolean(routeState.onboardingFlow);
  const futureOffer     = Boolean(routeState.futureOffer);

  const [horizon,   setHorizon]   = useState<Horizon>('30j');
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showWhy,   setShowWhy]   = useState(false);

  useEffect(() => { if (user && !futureOffer) void load(); }, [user, futureOffer]);

  const load = async () => {
    const sevenAgo = new Date();
    sevenAgo.setDate(sevenAgo.getDate() - 90);
    const since = sevenAgo.toLocaleDateString('sv-SE');

    const [
      { data: pulses },
      { data: closures },
      { data: movements },
      { data: food },
      { data: profile },
      { count: totalObs },
    ] = await Promise.all([
      supabase.from('daily_pulses').select('sleep_score,energy_score,body_score,date').eq('user_id', user!.id).gte('date', since),
      supabase.from('daily_closures').select('completion,date').eq('user_id', user!.id).gte('date', since),
      supabase.from('movement_logs').select('sport,intensity,duration_min,date').eq('user_id', user!.id).gte('date', since),
      supabase.from('food_entries').select('calories,protein,created_at').eq('user_id', user!.id).gte('created_at', localDayStartISO(since)),
      supabase.from('profiles').select('goal_type,onboarding_context').eq('id', user!.id).maybeSingle(),
      supabase.from('daily_closures').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
    ]);

    // Regrouper food
    // Journée LOCALE de l'utilisateur (et non jour UTC)
    const foodByDay = foodTotalsByLocalDay(food ?? []);
    const foodDays = Object.keys(foodByDay).length;
    const kcalArr  = Object.values(foodByDay).map(d => d.kcal).filter(v => v > 0);
    const protArr  = Object.values(foodByDay).map(d => d.prot).filter(v => v > 0);

    setScenarios(buildScenarios({
      pulses:    pulses    ?? [],
      closures:  closures  ?? [],
      movements: movements ?? [],
      foodDays,
      avgKcal: kcalArr.length ? Math.round(avg(kcalArr)) : null,
      avgProt: protArr.length ? Math.round(avg(protArr)) : null,
      totalObs: totalObs ?? 0,
      profile: profile ?? null,
    }));
    setLoading(false);
  };

  // ── Écran onboarding paywall ───────────────────────────────────────────────
  if (onboardingFlow && futureOffer) {
    return (
      <div style={{ minHeight: '100dvh', background: BG, color: WHITE }}>
        <main style={{ maxWidth: 560, margin: '0 auto', padding: '28px 20px 40px' }}>
          <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: '-.05em', marginBottom: 42, color: WHITE }}>
            NOX<span style={{ color: ACCENT }}>.</span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.1em', marginBottom: 10 }}>TON PROFIL EST PRÊT</div>
          <h1 style={{ margin: '0 0 14px', fontSize: 38, lineHeight: .95, fontWeight: 1000, letterSpacing: '-.055em', color: WHITE }}>
            Vois où<br />tu vas.
          </h1>
          <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, marginBottom: 28 }}>
            NOX connaît maintenant ton objectif, ton niveau, ton rythme et ton environnement. Passe à l'étape supérieure.
          </p>
          <div style={{ background: CARD, border: `1px solid ${LIME}22`, borderRadius: 24, padding: 22, marginBottom: 18 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 10px', borderRadius: 999, background: `${LIME}18`, fontSize: 10, fontWeight: 950, letterSpacing: '.08em', marginBottom: 18, color: LIME }}>
              <Sparkles size={14} />NOX FUTURE
            </div>
            <h2 style={{ fontSize: 24, lineHeight: 1.1, letterSpacing: '-.04em', margin: '0 0 10px', fontWeight: 1000, color: WHITE }}>
              Transforme ton objectif en trajectoire.
            </h2>
            <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.55, margin: '0 0 18px' }}>
              Débloque l'intelligence NOX pour une expérience réellement personnalisée.
            </p>
            {['NOX Future — scénarios personnalisés', 'Programme IA sur mesure', 'Coach NOX conversationnel', 'Analyses nutrition IA', 'Adaptations intelligentes'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 0', borderTop: `1px solid ${BORDER}`, fontSize: 13, fontWeight: 750, color: WHITE }}>
                <div style={{ width: 22, height: 22, borderRadius: 8, background: LIME, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Check size={13} strokeWidth={3} color={BLACK} />
                </div>
                {f}
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/subscribe', { state: { onboardingFlow: true, returnTo: '/future' } })}
            style={{ width: '100%', padding: 18, border: 0, borderRadius: 18, background: LIME, color: BLACK, fontWeight: 1000, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
            DÉCOUVRIR NOX FUTURE <ChevronRight size={18} />
          </button>
          <button onClick={() => navigate('/home', { replace: true })}
            style={{ width: '100%', padding: 14, border: 0, background: 'transparent', color: MUTED, fontSize: 11, fontWeight: 900, cursor: 'pointer', textDecoration: 'underline' }}>
            IGNORER POUR L'INSTANT
          </button>
        </main>
      </div>
    );
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'grid', placeItems: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 950, color: WHITE }}>NOX<span style={{ color: LIME }}>.</span></div>
    </div>
  );

  const current = scenarios.find(s => s.horizon === horizon)!;

  return (
    <div style={{ minHeight: '100vh', background: BG, color: WHITE, paddingBottom: 100 }}>
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px' }}>

        {/* Header */}
        <header style={{ paddingTop: 52, paddingBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => navigate(-1)}
            style={{ width: 40, height: 40, borderRadius: 14, border: `1px solid ${BORDER}`, background: CARD, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <ArrowLeft size={18} color={WHITE} />
          </button>
          <div>
            <div style={{ fontSize: 10, fontWeight: 900, color: LIME, letterSpacing: '.1em', marginBottom: 3 }}>NOX FUTURE</div>
            <div style={{ fontSize: 22, fontWeight: 1000, letterSpacing: '-.04em' }}>Ton évolution possible</div>
          </div>
        </header>

        {/* Avertissement scénario */}
        <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.55, padding: '12px 16px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, marginBottom: 18 }}>
          Ces projections sont des <strong style={{ color: '#AAAAAA' }}>scénarios illustratifs</strong>, pas des prédictions certaines. Elles sont construites uniquement depuis tes données réelles.
        </div>

        {/* Sélecteur horizon */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 18 }}>
          {(['30j', '90j', '6m'] as Horizon[]).map(h => {
            const sc = scenarios.find(s => s.horizon === h)!;
            return (
              <button key={h} onClick={() => setHorizon(h)}
                style={{ padding: '13px 8px', border: `1px solid ${horizon === h ? LIME + '55' : BORDER}`, borderRadius: 16, background: horizon === h ? '#0F1A00' : CARD, cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 1000, color: horizon === h ? LIME : WHITE }}>
                  {h === '30j' ? '30 JOURS' : h === '90j' ? '90 JOURS' : '6 MOIS'}
                </div>
                <div style={{ fontSize: 9, fontWeight: 800, marginTop: 4, color: qualityColor[sc.dataQuality] }}>
                  {qualityLabel[sc.dataQuality].toUpperCase()}
                </div>
              </button>
            );
          })}
        </div>

        {/* Scénario actif */}
        <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 22, padding: '18px 20px', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: LIME, letterSpacing: '.08em', marginBottom: 16 }}>
            {current.title.toUpperCase()}
          </div>

          {current.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '14px 0', borderTop: i > 0 ? `1px solid ${BORDER}` : 'none' }}>
              <span style={{ fontSize: 14, color: trendColor[item.trend], fontWeight: 900, flexShrink: 0, marginTop: 1 }}>
                {trendIcon[item.trend]}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: WHITE, marginBottom: 5 }}>{item.label}</div>
                <div style={{ fontSize: 13, color: '#AAAAAA', lineHeight: 1.55 }}>{item.value}</div>
                {item.basis && (
                  <div style={{ fontSize: 10, color: MUTED, marginTop: 6, fontStyle: 'italic' }}>Source : {item.basis}</div>
                )}
              </div>
            </div>
          ))}
        </section>

        {/* Pourquoi NOX pense ça */}
        <button onClick={() => setShowWhy(v => !v)}
          style={{ width: '100%', textAlign: 'left', padding: '14px 20px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, color: WHITE, cursor: 'pointer', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 900, color: LIME }}>POURQUOI NOX PENSE ÇA ?</span>
          <span style={{ fontSize: 14, color: MUTED }}>{showWhy ? '▲' : '▼'}</span>
        </button>
        {showWhy && (
          <div style={{ background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 18, padding: '16px 20px', marginBottom: 14, marginTop: -8 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.08em', marginBottom: 12 }}>DONNÉES UTILISÉES</div>
            {current.evidence.length > 0 ? current.evidence.map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 9, fontSize: 13, color: '#AAAAAA', marginBottom: 7 }}>
                <span style={{ color: LIME, fontWeight: 900 }}>✓</span>{e}
              </div>
            )) : (
              <div style={{ fontSize: 13, color: MUTED }}>Pas encore assez de données pour construire ce scénario.</div>
            )}
            <div style={{ marginTop: 14, fontSize: 12, color: MUTED, lineHeight: 1.5, padding: '10px 12px', background: CARD, borderRadius: 12 }}>
              Ces scénarios n'utilisent que des règles déterministes et tes données réelles. Aucune IA générative n'est impliquée en Free.
            </div>
          </div>
        )}

        {/* Teaser Pro — analyse IA */}
        {!isPro && (
          <button onClick={() => navigate('/subscribe')}
            style={{ width: '100%', padding: '16px 20px', border: `1px solid ${LIME}33`, borderRadius: 20, background: `${LIME}08`, cursor: 'pointer', textAlign: 'left', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <Sparkles size={14} color={LIME} />
              <span style={{ fontSize: 10, fontWeight: 900, color: LIME, letterSpacing: '.08em' }}>NOX PRO — SCÉNARIOS IA PERSONNALISÉS</span>
            </div>
            <div style={{ fontSize: 13, color: '#AAAAAA', lineHeight: 1.5 }}>
              Avec Pro, NOX analyse les relations entre tes données pour construire des projections réellement personnalisées — et les met à jour chaque semaine.
            </div>
          </button>
        )}

      </main>
      <BottomNav active="mon-nox" />
    </div>
  );
}
