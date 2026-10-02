import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { todayLocalDate } from '../lib/localDate';
import { BottomNav } from './Home';

const BG    = '#090B0A';
const CARD  = '#232624';
const CARD2 = '#191C1A';
const WHITE = '#FFFFFF';
const LIME  = '#C8FF00';
const MUTED = '#A5AAA6';
const BORDER= '#4A4F4B';

// ── Readiness déterministe depuis Pulse + activité récente ────────────────────
type ReadinessResult = {
  level:  'good' | 'moderate' | 'low';
  label:  string;
  advice: string;
  color:  string;
  sources: { label: string; value: string; origin: 'declared' | 'device' }[];
};

function computeReadiness(
  pulse: { sleep_score: number; energy_score: number; body_score: number } | null,
  lastWorkout: { session_feedback?: string; finished_at?: string; name?: string } | null,
  lastMovement: { sport?: string; intensity?: string; duration_min?: number } | null,
): ReadinessResult | null {
  if (!pulse) return null;

  const sources: ReadinessResult['sources'] = [
    { label: 'Sommeil',  value: `${pulse.sleep_score}/5`,  origin: 'declared' },
    { label: 'Énergie',  value: `${pulse.energy_score}/5`, origin: 'declared' },
    { label: 'Corps',    value: `${pulse.body_score}/5`,   origin: 'declared' },
  ];

  // Score brut 0–100 depuis le Pulse
  let score = 0;
  score += (pulse.sleep_score  - 1) * 12.5; // 0–50
  score += (pulse.energy_score - 1) * 12.5; // 0–50
  score += (pulse.body_score   - 1) * 12.5; // 0–50 (on plafonne à 100 après)
  // On moyenne les 3
  score = Math.round(((pulse.sleep_score + pulse.energy_score + pulse.body_score) / 15) * 100);

  // Malus séance difficile récente (≤ 1 jour)
  const daysSinceWorkout = lastWorkout?.finished_at
    ? Math.floor((Date.now() - new Date(lastWorkout.finished_at).getTime()) / 86400000)
    : null;

  if (lastWorkout?.session_feedback === 'hard' && daysSinceWorkout !== null && daysSinceWorkout <= 1) {
    score = Math.max(0, score - 12);
    sources.push({ label: 'Dernière séance', value: 'Difficile', origin: 'declared' });
  } else if (lastWorkout?.session_feedback === 'hard' && daysSinceWorkout !== null && daysSinceWorkout <= 2) {
    score = Math.max(0, score - 6);
    sources.push({ label: 'Dernière séance', value: 'Difficile (il y a 2j)', origin: 'declared' });
  }

  // Malus mouvement intense récent
  if (lastMovement?.intensity === 'intense') {
    sources.push({ label: 'Dernière activité', value: `${lastMovement.sport} — Intense`, origin: 'declared' });
    score = Math.max(0, score - 8);
  }

  score = Math.min(100, Math.max(0, score));

  if (score >= 70) return {
    level: 'good', color: LIME,
    label: 'Tu peux maintenir ton rythme.',
    advice: 'Tes signaux du matin sont bons. Tu peux garder le rythme prévu et faire ta séance si elle est programmée.',
    sources,
  };

  if (score >= 45) return {
    level: 'moderate', color: '#FFD93D',
    label: 'Écoute ton corps aujourd\'hui.',
    advice: 'Ta récupération est moyenne. Tu peux bouger, mais évite de forcer. Reste attentif à tes sensations pendant l\'effort.',
    sources,
  };

  return {
    level: 'low', color: '#FF6B6B',
    label: 'Priorité récupération.',
    advice: 'Tes signaux indiquent une récupération faible. Privilégie le repos actif, les étirements ou une marche légère.',
    sources,
  };
}

export default function Recovery() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [pulse,        setPulse]        = useState<any>(null);
  const [lastWorkout,  setLastWorkout]  = useState<any>(null);
  const [lastMovement, setLastMovement] = useState<any>(null);
  const [readiness,    setReadiness]    = useState<ReadinessResult | null>(null);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => { if (user) void load(); }, [user]);

  const load = async () => {
    const today = todayLocalDate();
    const [
      { data: pulseData },
      { data: workoutData },
      { data: movementData },
    ] = await Promise.all([
      supabase.from('daily_pulses').select('sleep_score,energy_score,body_score')
        .eq('user_id', user!.id).eq('date', today).maybeSingle(),
      supabase.from('workouts').select('id,name,finished_at,session_feedback')
        .eq('user_id', user!.id).eq('status', 'completed')
        .not('finished_at', 'is', null)
        .order('finished_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('movement_logs').select('sport,intensity,duration_min,date')
        .eq('user_id', user!.id)
        .order('date', { ascending: false }).limit(1).maybeSingle(),
    ]);

    setPulse(pulseData ?? null);
    setLastWorkout(workoutData ?? null);
    setLastMovement(movementData ?? null);
    setReadiness(computeReadiness(pulseData ?? null, workoutData ?? null, movementData ?? null));
    setLoading(false);
  };

  // Label intensité
  const intensityLabel: Record<string, string> = { light: 'Légère', moderate: 'Modérée', intense: 'Intense' };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'grid', placeItems: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 950, color: WHITE }}>NOX<span style={{ color: LIME }}>.</span></div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, color: WHITE, paddingBottom: 'calc(160px + env(safe-area-inset-bottom))' }}>
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '0 16px' }}>

        {/* Header */}
        <div style={{ paddingTop: 52, paddingBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.1em', marginBottom: 6 }}>RÉCUPÉRATION</div>
          <h1 style={{ margin: 0, fontSize: 'clamp(34px,5vw,46px)', fontWeight: 850, letterSpacing: '-.04em', lineHeight: .98 }}>
            Comment<br />tu te portes ?
          </h1>
        </div>

        {/* Pas de Pulse */}
        {!pulse && (
          <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '22px 20px', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 8 }}>Pulse du matin manquant</div>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 18, lineHeight: 1.55 }}>
              Renseigne ton Pulse pour que NOX puisse évaluer ta récupération d'aujourd'hui.
            </div>
            <button onClick={() => navigate('/pulse')}
              style={{ width: '100%', padding: 16, border: 0, borderRadius: 14, background: LIME, color: '#0A0A0A', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
              FAIRE MON PULSE →
            </button>
          </section>
        )}

        {/* Readiness */}
        {readiness && (
          <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '22px 20px', marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: readiness.color, letterSpacing: '.1em', marginBottom: 12 }}>
              TON ÉTAT AUJOURD'HUI
            </div>
            <div style={{ fontSize: 24, fontWeight: 1000, letterSpacing: '-.04em', color: readiness.color, marginBottom: 10 }}>
              {readiness.label}
            </div>
            <div style={{ fontSize: 14, color: '#CCCCCC', lineHeight: 1.6 }}>{readiness.advice}</div>
          </section>
        )}

        {/* Signaux — Pulse du jour */}
        {pulse && (
          <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '18px 20px', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.08em' }}>SIGNAUX DU MATIN</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4CAF50' }} />
                <span style={{ fontSize: 9, color: '#4CAF50', fontWeight: 900 }}>DÉCLARÉ</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { label: 'Sommeil', value: pulse.sleep_score,  emoji: '🌙', color: '#9C89FF' },
                { label: 'Énergie', value: pulse.energy_score, emoji: '⚡', color: '#FFD93D' },
                { label: 'Corps',   value: pulse.body_score,   emoji: '💪', color: '#4FC3F7' },
              ].map(({ label, value, emoji, color }) => (
                <div key={label} style={{ background: CARD2, borderRadius: 14, padding: '14px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, marginBottom: 6 }}>{emoji}</div>
                  <div style={{ fontSize: 24, fontWeight: 1000, color: WHITE }}>{value}</div>
                  <div style={{ fontSize: 9, color, fontWeight: 800, marginTop: 2 }}>/5</div>
                  <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, marginTop: 6 }}>{label}</div>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/pulse')}
              style={{ width: '100%', marginTop: 12, padding: '11px 0', border: `1px solid ${BORDER}`, borderRadius: 14, background: 'transparent', color: MUTED, fontSize: 11, fontWeight: 900, cursor: 'pointer' }}>
              MODIFIER MON PULSE
            </button>
          </section>
        )}

        {/* Dernière activité */}
        {(lastWorkout || lastMovement) && (
          <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '18px 20px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.08em', marginBottom: 14 }}>ACTIVITÉ RÉCENTE</div>

            {lastWorkout && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: CARD2, borderRadius: 14, marginBottom: lastMovement ? 8 : 0 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: WHITE }}>{lastWorkout.name || 'Séance'}</div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                    {lastWorkout.session_feedback === 'hard' ? 'Difficile' : lastWorkout.session_feedback === 'easy' ? 'Facile' : lastWorkout.session_feedback ? 'Bien' : ''
                    }
                    {lastWorkout.finished_at && ` · ${Math.floor((Date.now() - new Date(lastWorkout.finished_at).getTime()) / 86400000)}j`}
                  </div>
                </div>
                <div style={{ fontSize: 9, fontWeight: 900, color: '#4CAF50', background: '#4CAF5018', padding: '4px 8px', borderRadius: 99 }}>DÉCLARÉ</div>
              </div>
            )}

            {lastMovement && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: CARD2, borderRadius: 14 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: WHITE }}>{lastMovement.sport}</div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                    {lastMovement.duration_min} min · {intensityLabel[lastMovement.intensity] || lastMovement.intensity}
                  </div>
                </div>
                <div style={{ fontSize: 9, fontWeight: 900, color: '#4CAF50', background: '#4CAF5018', padding: '4px 8px', borderRadius: 99 }}>DÉCLARÉ</div>
              </div>
            )}
          </section>
        )}

        {/* Appareils connectés */}
        <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '18px 20px', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.08em', marginBottom: 8 }}>APPAREILS CONNECTÉS</div>
          <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.55, marginBottom: 16 }}>
            Les données d'un appareil permettront à NOX de distinguer ce que tu ressens de ce qui est réellement mesuré.
          </div>
          {[
            { name: 'Apple Health / HealthKit' },
            { name: 'Google Fit / Health Connect' },
            { name: 'Garmin, WHOOP, Oura…' },
          ].map(({ name }) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 14, marginBottom: 8, opacity: .65 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: WHITE }}>{name}</div>
                <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>Bientôt disponible</div>
              </div>
            </div>
          ))}
        </section>

        {/* Légende source */}
        <div style={{ display: 'flex', gap: 16, padding: '0 4px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4CAF50' }} />
            <span style={{ fontSize: 10, color: MUTED, fontWeight: 700 }}>Déclaré par toi</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4FC3F7' }} />
            <span style={{ fontSize: 10, color: MUTED, fontWeight: 700 }}>Mesuré par un appareil</span>
          </div>
        </div>

      </main>
      <BottomNav active="home" />
    </div>
  );
}
