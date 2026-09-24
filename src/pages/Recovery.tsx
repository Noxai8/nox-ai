import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#C8FF00';
const BG = '#F7F8F4';
const SURFACE = '#FFFFFF';
const BORDER = '#E8EAE4';
const BLACK = '#0B0B0B';
const MUTED = '#7A7F76';
const SOFT_LIME = '#F0FFD0';

const WEARABLES = [
  { id: 'apple_watch', name: 'Apple Watch', icon: '⌚', color: MUTED, connected: false },
  { id: 'oura', name: 'Oura Ring', icon: '💍', color: MUTED, connected: false },
  { id: 'whoop', name: 'WHOOP', icon: '📿', color: MUTED, connected: false },
  { id: 'garmin', name: 'Garmin', icon: '🏃', color: MUTED, connected: false },
  { id: 'fitbit', name: 'Fitbit', icon: '⌚', color: MUTED, connected: false },
];

export default function Recovery() {
  const { user } = useAuth();
  const [checkin, setCheckin] = useState({
    sleep_hours: '',
    sleep_quality: '',
    fatigue: '',
    soreness: '',
    stress: '',
    hrv: '',
    resting_hr: '',
  });
  const [saved, setSaved] = useState(false);
  const [todayCheckin, setTodayCheckin] = useState<any>(null);
  const [readiness, setReadiness] = useState<{ score: number; label: string; color: string; advice: string } | null>(null);

  useEffect(() => { if (user) loadToday(); }, [user]);

  const loadToday = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('recovery_checkins')
      .select('*').eq('user_id', user!.id)
      .gte('created_at', today + 'T00:00:00')
      .maybeSingle();
    if (data) {
      setTodayCheckin(data);
      computeReadiness(data);
    }
  };

  const computeReadiness = (data: any) => {
    let score = 100;
    if (data.sleep_hours) score -= Math.max(0, (7 - parseFloat(data.sleep_hours)) * 10);
    if (data.fatigue) score -= (parseInt(data.fatigue) - 1) * 8;
    if (data.soreness) score -= (parseInt(data.soreness) - 1) * 6;
    if (data.stress) score -= (parseInt(data.stress) - 1) * 6;
    if (data.sleep_quality) score -= (parseInt(data.sleep_quality) > 3 ? 0 : (4 - parseInt(data.sleep_quality)) * 8);
    score = Math.max(0, Math.min(100, Math.round(score)));

    let label, color, advice;
    if (score >= 75) {
      label = 'TU PEUX GARDER LE RYTHME.'; color = ACCENT;
      advice = 'Tes signaux de récupération sont bons aujourd’hui. Tu peux maintenir la séance et le rythme prévus.';
    } else if (score >= 50) {
      label = 'RALENTIS UN PEU.'; color = '#ffaa00';
      advice = 'Ta récupération est moyenne aujourd’hui. Tu peux bouger, mais évite de forcer inutilement et reste attentif à tes sensations.';
    } else {
      label = 'PRIORITÉ RÉCUPÉRATION.'; color = '#ff4444';
      advice = 'Tes signaux indiquent une récupération faible aujourd’hui. Privilégie le repos actif ou une séance légère.';
    }
    setReadiness({ score, label, color, advice });
  };

  const saveCheckin = async () => {
    const entry = {
      user_id: user!.id,
      sleep_hours: checkin.sleep_hours ? parseFloat(checkin.sleep_hours) : null,
      sleep_quality: checkin.sleep_quality ? parseInt(checkin.sleep_quality) : null,
      fatigue: checkin.fatigue ? parseInt(checkin.fatigue) : null,
      soreness: checkin.soreness ? parseInt(checkin.soreness) : null,
      stress: checkin.stress ? parseInt(checkin.stress) : null,
      hrv: checkin.hrv ? parseInt(checkin.hrv) : null,
      resting_hr: checkin.resting_hr ? parseInt(checkin.resting_hr) : null,
      created_at: new Date().toISOString(),
    };
    await supabase.from('recovery_checkins').insert(entry);
    setSaved(true);
    setTodayCheckin(entry);
    computeReadiness(entry);
  };

  const ScaleSelector = ({ label, stateKey, emoji }: any) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, color: MUTED, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
        {emoji} {label} <span style={{ color: MUTED }}>(1 = très bien · 5 = très mauvais)</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[1, 2, 3, 4, 5].map(v => (
          <button key={v} onClick={() => setCheckin(p => ({ ...p, [stateKey]: String(v) }))}
            style={{ flex: 1, padding: '12px 0', background: checkin[stateKey as keyof typeof checkin] === String(v) ? BLACK : SURFACE, border: '1px solid ' + (checkin[stateKey as keyof typeof checkin] === String(v) ? BLACK : BORDER), borderRadius: 16, color: checkin[stateKey as keyof typeof checkin] === String(v) ? '#000' : '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
            {v}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 80 }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '28px 20px 8px' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: '.12em' }}>RÉCUPÉRATION</div>
        <div style={{ marginTop: 10, fontSize: 40, lineHeight: .95, letterSpacing: '-.04em', fontWeight: 950, color: BLACK }}>
          TON CORPS<br />RÉCUPÈRE AUSSI.
        </div>
        <div style={{ marginTop: 16, fontSize: 14, lineHeight: 1.5, color: MUTED }}>
          Dis à NOX comment ton corps se sent aujourd’hui. Tes signaux de récupération servent à adapter ses recommandations.
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 20px 0' }}>

        {/* Score readiness */}
        {readiness && (
          <div style={{ background: SOFT_LIME, border: '1px solid ' + BORDER, borderRadius: 24, padding: 20, marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: BLACK, letterSpacing: '.1em', textTransform: 'uppercase' }}>RECOMMANDATION NOX</div>
            <div style={{ fontSize: 28, lineHeight: 1, fontWeight: 950, color: BLACK, marginTop: 12, letterSpacing: '-.03em' }}>{readiness.label}</div>
            <div style={{ fontSize: 14, color: '#4F534C', marginTop: 12, lineHeight: 1.55 }}>{readiness.advice}</div>
          </div>
        )}

        {/* Check-in du jour */}
        {!todayCheckin ? (
          <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 24, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: BLACK, marginBottom: 20 }}>CHECK-IN RÉCUPÉRATION</div>

            {/* Sommeil */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: MUTED, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>😴 HEURES DE SOMMEIL</div>
              <input value={checkin.sleep_hours} onChange={e => setCheckin(p => ({ ...p, sleep_hours: e.target.value }))}
                type="number" step="0.5" min="0" max="12" placeholder="7.5"
                style={{ width: '100%', padding: '12px 16px', background: BG, border: '1px solid ' + BORDER, borderRadius: 16, color: BLACK, fontSize: 18, fontWeight: 700, boxSizing: 'border-box', outline: 'none' }} />
            </div>

            <ScaleSelector label="Qualité du sommeil" stateKey="sleep_quality" emoji="🌙" />
            <ScaleSelector label="Fatigue générale" stateKey="fatigue" emoji="⚡" />
            <ScaleSelector label="Courbatures / douleurs musculaires" stateKey="soreness" emoji="💪" />
            <ScaleSelector label="Niveau de stress" stateKey="stress" emoji="🧠" />

            {/* HRV optionnel */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: MUTED, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                📱 HRV (optionnel — depuis ta montre)
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input value={checkin.hrv} onChange={e => setCheckin(p => ({ ...p, hrv: e.target.value }))}
                  type="number" placeholder="HRV ms"
                  style={{ flex: 1, padding: '10px 14px', background: BG, border: '1px solid ' + BORDER, borderRadius: 16, color: BLACK, fontSize: 14, outline: 'none' }} />
                <input value={checkin.resting_hr} onChange={e => setCheckin(p => ({ ...p, resting_hr: e.target.value }))}
                  type="number" placeholder="FC repos bpm"
                  style={{ flex: 1, padding: '10px 14px', background: BG, border: '1px solid ' + BORDER, borderRadius: 16, color: BLACK, fontSize: 14, outline: 'none' }} />
              </div>
            </div>

            <button onClick={saveCheckin}
              style={{ width: '100%', padding: 16, background: BLACK, border: 'none', borderRadius: 18, color: '#fff', fontWeight: 900, fontSize: 15, cursor: 'pointer' }}>
              ENREGISTRER MON CHECK-IN
            </button>
          </div>
        ) : (
          <div style={{ background: ACCENT + '11', border: '1px solid ' + ACCENT + '33', borderRadius: 22, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: ACCENT }}>✓ Check-in récupération enregistré aujourd'hui</div>
          </div>
        )}

        <div style={{ marginTop: 8, padding: '16px 18px', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: MUTED, letterSpacing: '.06em' }}>DONNÉES AVANCÉES</div>
          <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5, color: MUTED }}>
            HRV et fréquence cardiaque restent optionnelles. Les intégrations automatiques pourront être ajoutées plus tard sans bloquer ton check-in quotidien.
          </div>
        </div>
      </div>

      <BottomNav active="body" />
    </div>
  );
}
