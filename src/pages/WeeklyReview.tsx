import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { todayLocalDate } from '../lib/localDate';
import { usePlan } from '../lib/usePlan';

const BG    = '#0A0A0A';
const CARD  = '#111111';
const CARD2 = '#161616';
const WHITE = '#FFFFFF';
const LIME  = '#C8FF00';
const MUTED = '#666666';
const BORDER= '#1E1E1E';

function getLast7Days(): { start: string; end: string; label: string } {
  const end   = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  const fmt = (d: Date) => d.toLocaleDateString('sv-SE');
  const lbl = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return { start: fmt(start), end: fmt(end), label: `${lbl(start)} — ${lbl(end)}` };
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
}

type WeekData = {
  pulses:        any[];
  closures:      any[];
  movements:     any[];
  foodDays:      number;
  avgKcal:       number | null;
  avgProt:       number | null;
  totalObs:      number;
};

export default function WeeklyReview() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const { isPro }   = usePlan();

  const [data,    setData]    = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(true);
  const period = getLast7Days();

  useEffect(() => { if (user) void load(); }, [user]);

  const load = async () => {
    const { start, end } = period;

    const [
      { data: pulses },
      { data: closures },
      { data: movements },
      { data: foodRaw },
      { count: totalObs },
    ] = await Promise.all([
      supabase.from('daily_pulses').select('sleep_score,energy_score,body_score,date')
        .eq('user_id', user!.id).gte('date', start).lte('date', end),
      supabase.from('daily_closures').select('completion,date')
        .eq('user_id', user!.id).gte('date', start).lte('date', end),
      supabase.from('movement_logs').select('sport,duration_min,intensity,date')
        .eq('user_id', user!.id).gte('date', start).lte('date', end),
      supabase.from('food_entries').select('calories,protein,created_at')
        .eq('user_id', user!.id).gte('created_at', start + 'T00:00:00').lte('created_at', end + 'T23:59:59'),
      supabase.from('daily_closures').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
    ]);

    // Regrouper food par jour
    const foodByDay: Record<string, { kcal: number; prot: number }> = {};
    (foodRaw ?? []).forEach(f => {
      const day = f.created_at.slice(0, 10);
      if (!foodByDay[day]) foodByDay[day] = { kcal: 0, prot: 0 };
      foodByDay[day].kcal += Number(f.calories ?? 0);
      foodByDay[day].prot += Number(f.protein  ?? 0);
    });
    const foodDays  = Object.keys(foodByDay).length;
    const kcalArr   = Object.values(foodByDay).map(d => d.kcal).filter(v => v > 0);
    const protArr   = Object.values(foodByDay).map(d => d.prot).filter(v => v > 0);

    setData({
      pulses:    pulses    ?? [],
      closures:  closures  ?? [],
      movements: movements ?? [],
      foodDays,
      avgKcal:   kcalArr.length  ? Math.round(avg(kcalArr))  : null,
      avgProt:   protArr.length  ? Math.round(avg(protArr))  : null,
      totalObs:  totalObs ?? 0,
    });
    setLoading(false);
  };

  if (loading || !data) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'grid', placeItems: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 950, color: WHITE }}>NOX<span style={{ color: LIME }}>.</span></div>
      </div>
    );
  }

  const { pulses, closures, movements, foodDays, avgKcal, avgProt, totalObs } = data;

  // Pulse stats
  const avgSleep  = pulses.length ? avg(pulses.map(p => p.sleep_score))  : null;
  const avgEnergy = pulses.length ? avg(pulses.map(p => p.energy_score)) : null;
  const avgBody   = pulses.length ? avg(pulses.map(p => p.body_score))   : null;

  // Clôtures
  const closureYes     = closures.filter(c => c.completion === 'yes').length;
  const closurePartial = closures.filter(c => c.completion === 'partial').length;
  const closureNo      = closures.filter(c => c.completion === 'no').length;

  // Mouvements
  const totalMins   = movements.reduce((s, m) => s + (m.duration_min ?? 0), 0);
  const sportSet    = [...new Set(movements.map(m => m.sport))];

  // Énergie basse sur 3 derniers pulses
  const last3Energy = pulses.slice(-3).map(p => p.energy_score);
  const lowEnergyTrend = last3Energy.length === 3 && avg(last3Energy) <= 2.5;

  // Observations déterministes
  const saitItems: string[] = [
    pulses.length    > 0 ? `${pulses.length} Pulse${pulses.length > 1 ? 's' : ''} renseigné${pulses.length > 1 ? 's' : ''} cette semaine.` : '',
    movements.length > 0 ? `${movements.length} activité${movements.length > 1 ? 's' : ''} enregistrée${movements.length > 1 ? 's' : ''}.` : '',
    closures.length  > 0 ? `${closures.length} journée${closures.length > 1 ? 's' : ''} clôturée${closures.length > 1 ? 's' : ''}.` : '',
    foodDays         > 0 ? `${foodDays} jour${foodDays > 1 ? 's' : ''} de nutrition renseigné${foodDays > 1 ? 's' : ''}.` : '',
  ].filter(Boolean);

  const observeItems: string[] = [
    lowEnergyTrend ? 'Ton énergie déclarée était plus basse sur tes 3 derniers Pulse.' : '',
    movements.length >= 3 && totalMins >= 90 ? `Tu as bougé ${totalMins} minutes au total — bon rythme.` : '',
    closureYes >= 3 ? `Tu as accompli ta priorité ${closureYes} fois cette semaine.` : '',
  ].filter(Boolean);

  const neSaitPasItems: string[] = [
    pulses.length < 4 ? 'Continue à renseigner ton sommeil pour que NOX puisse comparer plusieurs semaines.' : '',
    foodDays < 3 ? 'Renseigne ta nutrition plus régulièrement pour des observations utiles.' : '',
    movements.length < 2 ? 'Enregistre plus d\'activités pour que NOX observe tes habitudes sportives.' : '',
  ].filter(Boolean);

  // Priorité semaine prochaine (déterministe)
  let nextPriority = 'Continue à renseigner ton Pulse chaque matin.';
  if (movements.length >= 3) nextPriority = 'Maintenir 3 moments de mouvement la semaine prochaine.';
  else if (pulses.length >= 5 && movements.length < 2) nextPriority = 'Ajoute au moins 2 activités physiques la semaine prochaine.';
  else if (closureYes + closurePartial < 3) nextPriority = 'Essaie de clôturer ta journée chaque soir cette semaine.';

  // Prochain stade
  const getNoxStage = (days: number) => days >= 365 ? 5 : days >= 90 ? 4 : days >= 30 ? 3 : days >= 7 ? 2 : 1;
  const milestones  = [0, 7, 30, 90, 365];
  const stage       = getNoxStage(totalObs);
  const nextTarget  = milestones[Math.min(stage, 4)];
  const daysLeft    = Math.max(0, nextTarget - totalObs);

  // Pro teaser — uniquement si assez de données pour une vraie analyse
  const showProTeaser = isPro === false && pulses.length >= 5 && movements.length >= 3 && foodDays >= 3;

  return (
    <div style={{ minHeight: '100vh', background: BG, color: WHITE, paddingBottom: 60 }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px' }}>

        {/* Header */}
        <header style={{ paddingTop: 52, paddingBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => navigate(-1)}
            style={{ width: 40, height: 40, borderRadius: 14, border: `1px solid ${BORDER}`, background: CARD, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <ArrowLeft size={18} color={WHITE} />
          </button>
          <div>
            <div style={{ fontSize: 10, fontWeight: 900, color: LIME, letterSpacing: '.1em', marginBottom: 3 }}>TA SEMAINE AVEC NOX</div>
            <div style={{ fontSize: 20, fontWeight: 1000, letterSpacing: '-.04em' }}>{period.label}</div>
          </div>
        </header>

        {/* Résumé global */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
          {[
            { value: pulses.length,    label: 'PULSES' },
            { value: movements.length, label: 'ACTIVITÉS' },
            { value: closures.length,  label: 'CLÔTURES' },
          ].map(({ value, label }) => (
            <div key={label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: '16px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 1000 }}>{value}</div>
              <div style={{ fontSize: 9, color: MUTED, fontWeight: 800, marginTop: 5, letterSpacing: '.06em' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* PULSE */}
        {pulses.length > 0 && (
          <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 22, padding: '18px 20px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.08em', marginBottom: 14 }}>PULSE — MOYENNES</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { label: 'Sommeil', value: avgSleep, emoji: '🌙', color: '#9C89FF' },
                { label: 'Énergie', value: avgEnergy, emoji: '⚡', color: '#FFD93D' },
                { label: 'Corps',   value: avgBody,   emoji: '💪', color: '#4FC3F7' },
              ].map(({ label, value, emoji, color }) => (
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

        {/* NUTRITION */}
        {(foodDays > 0 || avgKcal !== null) && (
          <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 22, padding: '18px 20px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.08em', marginBottom: 14 }}>NUTRITION</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <div style={{ background: CARD2, borderRadius: 16, padding: '14px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 1000 }}>{foodDays}</div>
                <div style={{ fontSize: 9, color: MUTED, fontWeight: 800, marginTop: 4, letterSpacing: '.04em' }}>JOURS RENS.</div>
              </div>
              {avgKcal !== null && (
                <div style={{ background: CARD2, borderRadius: 16, padding: '14px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 1000 }}>{avgKcal}</div>
                  <div style={{ fontSize: 9, color: MUTED, fontWeight: 800, marginTop: 4, letterSpacing: '.04em' }}>KCAL MOY.</div>
                </div>
              )}
              {avgProt !== null && (
                <div style={{ background: CARD2, borderRadius: 16, padding: '14px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 1000 }}>{avgProt}g</div>
                  <div style={{ fontSize: 9, color: MUTED, fontWeight: 800, marginTop: 4, letterSpacing: '.04em' }}>PROT. MOY.</div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* MOUVEMENT */}
        {movements.length > 0 && (
          <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 22, padding: '18px 20px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.08em', marginBottom: 14 }}>MOUVEMENT</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: sportSet.length ? 12 : 0 }}>
              <div style={{ background: CARD2, borderRadius: 16, padding: '14px 16px' }}>
                <div style={{ fontSize: 24, fontWeight: 1000 }}>{movements.length}</div>
                <div style={{ fontSize: 10, color: MUTED, fontWeight: 800, marginTop: 4 }}>ACTIVITÉS</div>
              </div>
              <div style={{ background: CARD2, borderRadius: 16, padding: '14px 16px' }}>
                <div style={{ fontSize: 24, fontWeight: 1000 }}>{totalMins}</div>
                <div style={{ fontSize: 10, color: MUTED, fontWeight: 800, marginTop: 4 }}>MINUTES TOTALES</div>
              </div>
            </div>
            {sportSet.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {sportSet.map(s => (
                  <span key={s} style={{ padding: '6px 12px', background: CARD2, borderRadius: 99, fontSize: 11, color: '#CCCCCC', fontWeight: 800 }}>{s}</span>
                ))}
              </div>
            )}
          </section>
        )}

        {/* PRIORITÉS */}
        {closures.length > 0 && (
          <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 22, padding: '18px 20px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.08em', marginBottom: 14 }}>PRIORITÉS ACCOMPLIES</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { label: 'Oui',       value: closureYes,     color: LIME },
                { label: 'En partie', value: closurePartial, color: '#FFD93D' },
                { label: 'Non',       value: closureNo,      color: '#FF6B6B' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: CARD2, borderRadius: 16, padding: '14px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 26, fontWeight: 1000, color }}>{value}</div>
                  <div style={{ fontSize: 10, color: MUTED, fontWeight: 800, marginTop: 6 }}>{label}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CE QUE NOX A APPRIS */}
        <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 22, padding: '18px 20px', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.08em', marginBottom: 18 }}>CE QUE NOX A APPRIS CETTE SEMAINE</div>

          {saitItems.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: LIME, letterSpacing: '.08em', marginBottom: 10 }}>SAIT</div>
              {saitItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 9, fontSize: 13, color: '#CCCCCC', lineHeight: 1.55, marginBottom: 7 }}>
                  <span style={{ color: LIME, fontWeight: 900, flexShrink: 0 }}>✓</span>{item}
                </div>
              ))}
            </div>
          )}

          {observeItems.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: '#FFD93D', letterSpacing: '.08em', marginBottom: 10 }}>OBSERVE</div>
              {observeItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 9, fontSize: 13, color: '#CCCCCC', lineHeight: 1.55, marginBottom: 7 }}>
                  <span style={{ color: '#FFD93D', fontWeight: 900, flexShrink: 0 }}>◎</span>{item}
                </div>
              ))}
            </div>
          )}

          {neSaitPasItems.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.08em', marginBottom: 10 }}>PAS ENCORE ASSEZ DE DONNÉES</div>
              {neSaitPasItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 9, fontSize: 13, color: '#888888', lineHeight: 1.55, marginBottom: 7 }}>
                  <span style={{ color: MUTED, flexShrink: 0 }}>○</span>{item}
                </div>
              ))}
            </div>
          )}

          {/* Teaser Pro — uniquement si assez de données */}
          {showProTeaser && (
            <button onClick={() => navigate('/subscribe')}
              style={{ width: '100%', marginTop: 18, padding: '14px 16px', border: `1px solid ${LIME}33`, borderRadius: 16, background: `${LIME}0A`, cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: LIME, letterSpacing: '.08em', marginBottom: 5 }}>✦ ANALYSE APPROFONDIE PAR NOX</div>
              <div style={{ fontSize: 13, color: '#AAAAAA', lineHeight: 1.5 }}>
                Tes données sont suffisantes pour une analyse des relations entre sommeil, énergie et activité. Disponible avec NOX Pro.
              </div>
            </button>
          )}
        </section>

        {/* SEMAINE PROCHAINE */}
        <section style={{ background: '#0F1A00', border: `1px solid #3A5200`, borderRadius: 22, padding: '18px 20px', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: LIME, letterSpacing: '.08em', marginBottom: 10 }}>LA SEMAINE PROCHAINE</div>
          <div style={{ fontSize: 15, fontWeight: 950, lineHeight: 1.4, color: WHITE }}>{nextPriority}</div>
        </section>

        {/* Footer NOX */}
        <button onClick={() => navigate('/mon-nox')}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 22, color: WHITE, cursor: 'pointer', textAlign: 'left' }}>
          <div>
            <div style={{ fontSize: 16, marginBottom: 6 }}>🌱</div>
            <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 3 }}>NOX continue d'apprendre</div>
            <div style={{ fontSize: 12, color: MUTED }}>
              {totalObs} journée{totalObs !== 1 ? 's' : ''} observée{totalObs !== 1 ? 's' : ''} au total
              {daysLeft > 0 ? ` · Prochain stade dans ${daysLeft} journée${daysLeft !== 1 ? 's' : ''}` : ''}
            </div>
          </div>
          <ChevronRight size={20} color={MUTED} />
        </button>

      </div>
    </div>
  );
}
