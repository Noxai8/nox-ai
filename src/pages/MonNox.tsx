import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';
import NoxCompanion from '../components/NoxCompanion';

const BG    = '#0A0A0A';
const CARD  = '#111111';
const WHITE = '#FFFFFF';
const LIME  = '#C8FF00';
const MUTED = '#888888';
const BORDER= '#222222';

function getStageLabel(stage: number) {
  return ['', 'Graine', 'Éveil', 'Explorateur', 'Éclairé', 'Maître NOX'][stage] || 'Graine';
}

function getNextMilestone(days: number): { label: string; target: number } {
  if (days < 7)   return { label: '7 jours', target: 7 };
  if (days < 30)  return { label: '30 jours', target: 30 };
  if (days < 90)  return { label: '90 jours', target: 90 };
  if (days < 365) return { label: '1 an', target: 365 };
  return { label: 'Maîtrise', target: 365 };
}

function getNoxStage(days: number): number {
  if (days >= 365) return 5;
  if (days >= 90)  return 4;
  if (days >= 30)  return 3;
  if (days >= 7)   return 2;
  return 1;
}

export default function MonNox() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [observedDays,   setObservedDays]   = useState(0);
  const [totalPulses,    setTotalPulses]     = useState(0);
  const [totalWorkouts,  setTotalWorkouts]   = useState(0);
  const [loading,        setLoading]         = useState(true);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  const load = async () => {
    const [
      { count: closures },
      { count: pulses },
      { count: workouts },
    ] = await Promise.all([
      supabase.from('daily_closures').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
      supabase.from('daily_pulses').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
      supabase.from('workouts').select('id', { count: 'exact', head: true }).eq('user_id', user!.id).eq('status', 'completed'),
    ]);
    setObservedDays(closures ?? 0);
    setTotalPulses(pulses ?? 0);
    setTotalWorkouts(workouts ?? 0);
    setLoading(false);
  };

  const stage = getNoxStage(observedDays);
  const milestone = getNextMilestone(observedDays);
  const progress = Math.min(100, Math.round((observedDays / milestone.target) * 100));

  const memoryItems = [
    {
      label: 'NOX SAIT',
      color: LIME,
      bg: `${LIME}14`,
      items: [
        totalPulses >= 3   ? `Tu as renseigné ton état ${totalPulses} fois.` : null,
        totalWorkouts >= 1 ? `Tu as complété ${totalWorkouts} séance${totalWorkouts > 1 ? 's' : ''}.` : null,
        observedDays >= 7  ? 'Tu utilises NOX depuis plus d\'une semaine.' : null,
      ].filter(Boolean) as string[],
    },
    {
      label: 'NOX OBSERVE',
      color: '#FFD93D',
      bg: '#FFD93D14',
      items: [
        totalPulses >= 2 ? 'Tes niveaux d\'énergie en début de journée.' : null,
        totalWorkouts >= 2 ? 'Ta fréquence d\'entraînement.' : null,
      ].filter(Boolean) as string[],
    },
    {
      label: 'NOX NE SAIT PAS ENCORE',
      color: MUTED,
      bg: '#FFFFFF08',
      items: [
        totalPulses < 7  ? 'Tes rythmes de sommeil sur la durée.' : null,
        totalWorkouts < 5 ? 'Tes préférences d\'exercice réelles.' : null,
        'La relation entre ta nutrition et ton énergie.',
      ].filter(Boolean) as string[],
    },
  ];

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

        {/* Header */}
        <div style={{ paddingTop: 52, paddingBottom: 28, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <NoxCompanion observedDays={observedDays} size="lg" />
          </div>
          <div style={{ fontSize: 11, fontWeight: 900, color: LIME, letterSpacing: '.1em', marginBottom: 6 }}>
            STADE {stage} — {getStageLabel(stage).toUpperCase()}
          </div>
          <div style={{ fontSize: 32, fontWeight: 1000, letterSpacing: '-.04em' }}>Mon NOX</div>
          <div style={{ color: MUTED, fontSize: 13, marginTop: 6 }}>
            {observedDays} journée{observedDays !== 1 ? 's' : ''} observée{observedDays !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Progression */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 22, padding: '18px 20px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.08em' }}>PROCHAIN STADE</div>
            <div style={{ fontSize: 11, fontWeight: 900, color: LIME }}>{milestone.label}</div>
          </div>
          <div style={{ height: 6, background: '#222', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: LIME, borderRadius: 999, transition: 'width .6s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 1000 }}>{observedDays}</div>
              <div style={{ fontSize: 9, color: MUTED, fontWeight: 700, marginTop: 2 }}>JOURNÉES</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 1000 }}>{totalPulses}</div>
              <div style={{ fontSize: 9, color: MUTED, fontWeight: 700, marginTop: 2 }}>PULSES</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 1000 }}>{totalWorkouts}</div>
              <div style={{ fontSize: 9, color: MUTED, fontWeight: 700, marginTop: 2 }}>SÉANCES</div>
            </div>
          </div>
        </div>

        {/* Mémoire NOX */}
        {memoryItems.map(({ label, color, bg, items }) => items.length > 0 && (
          <div key={label} style={{ background: bg, border: `1px solid ${color}22`, borderRadius: 22, padding: '16px 18px', marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 1000, color, letterSpacing: '.1em', marginBottom: 12 }}>{label}</div>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < items.length - 1 ? 9 : 0, fontSize: 13, color: '#DDDDDD', lineHeight: 1.5 }}>
                <span style={{ color, fontWeight: 900, fontSize: 12, marginTop: 2 }}>✓</span>
                {item}
              </div>
            ))}
          </div>
        ))}

        {/* Accès NOX Future */}
        <button onClick={() => navigate('/future')}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 22, color: WHITE, cursor: 'pointer', marginTop: 8, marginBottom: 12 }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: LIME, letterSpacing: '.08em', marginBottom: 4 }}>NOX FUTURE</div>
            <div style={{ fontSize: 15, fontWeight: 900 }}>Voir ton évolution possible</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>Scénarios à 30, 90 jours et 6 mois</div>
          </div>
          <ChevronRight size={20} color={MUTED} />
        </button>

        {/* Voir la mémoire complète */}
        <button onClick={() => navigate('/coach')}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 22, color: WHITE, cursor: 'pointer', marginBottom: 12 }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#9C89FF', letterSpacing: '.08em', marginBottom: 4 }}>NOX COACH</div>
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
