import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';
import NoxCompanion from '../components/NoxCompanion';

const BG     = '#0A0A0A';
const CARD   = '#111111';
const CARD2  = '#161616';
const WHITE  = '#FFFFFF';
const LIME   = '#C8FF00';
const MUTED  = '#666666';
const BORDER = '#1E1E1E';

type MemoryTab = 'sait' | 'observe' | 'ne-sait-pas';

function getNoxStage(days: number): number {
  if (days >= 365) return 5;
  if (days >= 90)  return 4;
  if (days >= 30)  return 3;
  if (days >= 7)   return 2;
  return 1;
}

function getStageLabel(stage: number) {
  return ['', 'Graine', 'Éveil', 'Explorateur', 'Éclairé', 'Maître NOX'][stage] || 'Graine';
}

function getNextMilestone(days: number): { label: string; target: number } {
  if (days < 7)   return { label: '7 jours', target: 7 };
  if (days < 30)  return { label: '30 jours', target: 30 };
  if (days < 90)  return { label: '90 jours', target: 90 };
  if (days < 365) return { label: '1 an', target: 365 };
  return { label: 'Maîtrise complète', target: 365 };
}

export default function MonNox() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab,           setTab]           = useState<MemoryTab>('sait');
  const [observedDays,  setObservedDays]  = useState(0);
  const [totalPulses,   setTotalPulses]   = useState(0);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [avgSleep,      setAvgSleep]      = useState<number | null>(null);
  const [avgEnergy,     setAvgEnergy]     = useState<number | null>(null);
  const [avgBody,       setAvgBody]       = useState<number | null>(null);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => { if (user) void load(); }, [user]);

  const load = async () => {
    const [
      { count: closures },
      { count: pulses },
      { count: workouts },
      { data: pulseData },
    ] = await Promise.all([
      supabase.from('daily_closures').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
      supabase.from('daily_pulses').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
      supabase.from('workouts').select('id', { count: 'exact', head: true }).eq('user_id', user!.id).eq('status', 'completed'),
      supabase.from('daily_pulses').select('sleep_score, energy_score, body_score').eq('user_id', user!.id).order('date', { ascending: false }).limit(14),
    ]);

    setObservedDays(closures ?? 0);
    setTotalPulses(pulses ?? 0);
    setTotalWorkouts(workouts ?? 0);

    if (pulseData && pulseData.length >= 3) {
      const avg = (key: 'sleep_score' | 'energy_score' | 'body_score') =>
        Math.round((pulseData.reduce((s, r) => s + Number(r[key]), 0) / pulseData.length) * 10) / 10;
      setAvgSleep(avg('sleep_score'));
      setAvgEnergy(avg('energy_score'));
      setAvgBody(avg('body_score'));
    }

    setLoading(false);
  };

  const stage     = getNoxStage(observedDays);
  const milestone = getNextMilestone(observedDays);
  const progress  = Math.min(100, Math.round((observedDays / milestone.target) * 100));

  // Mémoire — contenu déterministe selon vraies données
  const saitItems: string[] = [
    totalPulses >= 1  ? `Tu as renseigné ton état ${totalPulses} fois.` : '',
    totalWorkouts >= 1 ? `Tu as complété ${totalWorkouts} séance${totalWorkouts > 1 ? 's' : ''}.` : '',
    observedDays >= 7  ? `Tu utilises NOX depuis ${observedDays} jours.` : '',
    avgSleep !== null  ? `Ton sommeil moyen (14 j) : ${avgSleep}/5.` : '',
    avgEnergy !== null ? `Ton énergie moyenne (14 j) : ${avgEnergy}/5.` : '',
  ].filter(Boolean);

  const observeItems: string[] = [
    totalPulses >= 5   ? 'Tes niveaux d\'énergie varient peu en début de semaine.' : '',
    totalWorkouts >= 3 ? 'Ta fréquence d\'entraînement se stabilise.' : '',
    avgBody !== null   ? `Ton état physique moyen (14 j) : ${avgBody}/5.` : '',
    observedDays >= 14 ? 'NOX commence à détecter des patterns dans tes journées.' : '',
  ].filter(Boolean);

  const neSaitPasItems: string[] = [
    totalPulses < 14   ? 'Tes rythmes de sommeil sur la durée.' : '',
    totalWorkouts < 10 ? 'Tes préférences d\'exercice réelles.' : '',
    'La relation entre ta nutrition et ton énergie.',
    observedDays < 30  ? 'Tes tendances hebdomadaires.' : '',
    'L\'impact des repas tardifs sur ton sommeil.',
  ].filter(Boolean);

  const tabs: { id: MemoryTab; label: string; color: string; items: string[] }[] = [
    { id: 'sait',        label: 'Sait',            color: LIME,     items: saitItems },
    { id: 'observe',     label: 'Observe',          color: '#FFD93D', items: observeItems },
    { id: 'ne-sait-pas', label: 'Ne sait pas encore', color: MUTED, items: neSaitPasItems },
  ];

  const activeTab = tabs.find(t => t.id === tab)!;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'grid', placeItems: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 950, color: WHITE }}>NOX<span style={{ color: LIME }}>.</span></div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, color: WHITE, paddingBottom: 100 }}>
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px' }}>

        {/* Header compagnon */}
        <div style={{ paddingTop: 48, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <NoxCompanion observedDays={observedDays} size="lg" />
          </div>
          <div style={{ fontSize: 11, fontWeight: 900, color: LIME, letterSpacing: '.1em', marginBottom: 4 }}>
            STADE {stage} — {getStageLabel(stage).toUpperCase()}
          </div>
          <div style={{ fontSize: 30, fontWeight: 1000, letterSpacing: '-.04em' }}>Mon NOX</div>
          <div style={{ color: MUTED, fontSize: 13, marginTop: 5, marginBottom: 24 }}>
            {observedDays} journée{observedDays !== 1 ? 's' : ''} observée{observedDays !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Progression */}
        <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, padding: '18px 20px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.08em' }}>VERS LE PROCHAIN STADE</div>
            <div style={{ fontSize: 11, fontWeight: 900, color: LIME }}>{milestone.label}</div>
          </div>
          <div style={{ height: 5, background: '#1E1E1E', borderRadius: 999, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ width: `${progress}%`, height: '100%', background: LIME, borderRadius: 999, transition: 'width .8s ease' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { value: observedDays, label: 'JOURNÉES' },
              { value: totalPulses,  label: 'PULSES' },
              { value: totalWorkouts, label: 'SÉANCES' },
            ].map(({ value, label }) => (
              <div key={label} style={{ background: CARD2, borderRadius: 16, padding: '14px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 1000 }}>{value}</div>
                <div style={{ fontSize: 9, color: MUTED, fontWeight: 800, marginTop: 4, letterSpacing: '.06em' }}>{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Ce que NOX sait de toi */}
        <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, padding: '18px 20px', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.08em', marginBottom: 14 }}>
            CE QUE NOX SAIT DE TOI
          </div>

          {/* Onglets */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 18 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ padding: '10px 6px', borderRadius: 12, border: `1px solid ${tab === t.id ? t.color + '44' : BORDER}`, background: tab === t.id ? t.color + '14' : 'transparent', color: tab === t.id ? t.color : MUTED, fontSize: 10, fontWeight: 900, cursor: 'pointer', lineHeight: 1.3, textAlign: 'center' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Contenu onglet */}
          {activeTab.items.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeTab.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13, color: '#CCCCCC', lineHeight: 1.55, padding: '10px 12px', background: CARD2, borderRadius: 14 }}>
                  <span style={{ color: activeTab.color, fontWeight: 900, fontSize: 14, marginTop: 1, flexShrink: 0 }}>
                    {tab === 'ne-sait-pas' ? '○' : '✓'}
                  </span>
                  {item}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: MUTED, textAlign: 'center', padding: '20px 0' }}>
              {tab === 'sait' ? 'Continue à utiliser NOX pour que je te connaisse mieux.' :
               tab === 'observe' ? 'Il faut quelques journées de plus pour que NOX commence à observer tes patterns.' :
               'Tout va bien — NOX n\'a pas de zone d\'incertitude à signaler.'}
            </div>
          )}
        </section>

        {/* Moyennes Pulse */}
        {(avgSleep !== null || avgEnergy !== null || avgBody !== null) && (
          <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, padding: '18px 20px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.08em', marginBottom: 14 }}>
              TES MOYENNES (14 DERNIERS JOURS)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { label: 'Sommeil', value: avgSleep, emoji: '🌙', color: '#9C89FF' },
                { label: 'Énergie', value: avgEnergy, emoji: '⚡', color: '#FFD93D' },
                { label: 'Corps',   value: avgBody,   emoji: '💪', color: '#4FC3F7' },
              ].filter(x => x.value !== null).map(({ label, value, emoji, color }) => (
                <div key={label} style={{ background: CARD2, borderRadius: 16, padding: '14px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, marginBottom: 6 }}>{emoji}</div>
                  <div style={{ fontSize: 22, fontWeight: 1000, color: WHITE }}>{value}</div>
                  <div style={{ fontSize: 9, color, fontWeight: 800, marginTop: 2 }}>/5</div>
                  <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, marginTop: 6 }}>{label}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Weekly Review */}
        <button onClick={() => navigate('/weekly-review')}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, color: WHITE, cursor: 'pointer', marginBottom: 10, textAlign: 'left' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 900, color: '#FFD93D', letterSpacing: '.08em', marginBottom: 5 }}>BILAN HEBDOMADAIRE</div>
            <div style={{ fontSize: 15, fontWeight: 900 }}>Ta semaine avec NOX</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>Pulse · nutrition · mouvement · priorités</div>
          </div>
          <ChevronRight size={20} color={MUTED} />
        </button>

        {/* NOX Future */}
        <button onClick={() => navigate('/future')}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, color: WHITE, cursor: 'pointer', marginBottom: 10, textAlign: 'left' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 900, color: LIME, letterSpacing: '.08em', marginBottom: 5 }}>NOX FUTURE</div>
            <div style={{ fontSize: 15, fontWeight: 900 }}>Voir ton évolution possible</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>Scénarios à 30, 90 jours et 6 mois</div>
          </div>
          <ChevronRight size={20} color={MUTED} />
        </button>

        {/* Coach */}
        <button onClick={() => navigate('/coach')}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, color: WHITE, cursor: 'pointer', marginBottom: 14, textAlign: 'left' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 900, color: '#9C89FF', letterSpacing: '.08em', marginBottom: 5 }}>NOX COACH</div>
            <div style={{ fontSize: 15, fontWeight: 900 }}>Parler à NOX</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>Pose une question, explore ta progression</div>
          </div>
          <ChevronRight size={20} color={MUTED} />
        </button>

      </main>
      <BottomNav active="mon-nox" />
    </div>
  );
}
