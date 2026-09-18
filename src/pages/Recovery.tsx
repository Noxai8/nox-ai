import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from '../components/BottomNav';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

const WEARABLES = [
  { id: 'apple_watch', name: 'Apple Watch', icon: '⌚', color: '#555', connected: false },
  { id: 'oura', name: 'Oura Ring', icon: '💍', color: '#555', connected: false },
  { id: 'whoop', name: 'WHOOP', icon: '📿', color: '#555', connected: false },
  { id: 'garmin', name: 'Garmin', icon: '🏃', color: '#555', connected: false },
  { id: 'fitbit', name: 'Fitbit', icon: '⌚', color: '#555', connected: false },
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
      label = 'PRÊT À PERFORMER'; color = ACCENT;
      advice = 'Ton corps est récupéré. Séance à pleine intensité possible.';
    } else if (score >= 50) {
      label = 'RÉCUPÉRATION MODÉRÉE'; color = '#ffaa00';
      advice = 'Tu peux t\'entraîner mais réduis l\'intensité de 20%. Priorité aux mouvements composés.';
    } else {
      label = 'REPOS RECOMMANDÉ'; color = '#ff4444';
      advice = 'Ton corps signale de la fatigue. Repos actif ou séance légère seulement.';
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
      <div style={{ fontSize: 12, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
        {emoji} {label} <span style={{ color: '#333' }}>(1 = très bien · 5 = très mauvais)</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[1, 2, 3, 4, 5].map(v => (
          <button key={v} onClick={() => setCheckin(p => ({ ...p, [stateKey]: String(v) }))}
            style={{ flex: 1, padding: '12px 0', background: checkin[stateKey as keyof typeof checkin] === String(v) ? ACCENT : SURFACE, border: '1px solid ' + (checkin[stateKey as keyof typeof checkin] === String(v) ? ACCENT : BORDER), borderRadius: 10, color: checkin[stateKey as keyof typeof checkin] === String(v) ? '#000' : '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
            {v}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 80 }}>
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid ' + BORDER }}>
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em' }}>Récupération</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>RECOVERY</div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>

        {/* Score readiness */}
        {readiness && (
          <div style={{ background: SURFACE, border: '1px solid ' + readiness.color + '44', borderRadius: 16, padding: 20, marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 56, fontWeight: 900, color: readiness.color, lineHeight: 1 }}>{readiness.score}</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: readiness.color, marginTop: 8 }}>{readiness.label}</div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 8, lineHeight: 1.5 }}>{readiness.advice}</div>
          </div>
        )}

        {/* Check-in du jour */}
        {!todayCheckin ? (
          <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', marginBottom: 20 }}>CHECK-IN RÉCUPÉRATION</div>

            {/* Sommeil */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>😴 HEURES DE SOMMEIL</div>
              <input value={checkin.sleep_hours} onChange={e => setCheckin(p => ({ ...p, sleep_hours: e.target.value }))}
                type="number" step="0.5" min="0" max="12" placeholder="7.5"
                style={{ width: '100%', padding: '12px 16px', background: '#0d0d0d', border: '1px solid ' + BORDER, borderRadius: 10, color: '#fff', fontSize: 18, fontWeight: 700, boxSizing: 'border-box', outline: 'none' }} />
            </div>

            <ScaleSelector label="Qualité du sommeil" stateKey="sleep_quality" emoji="🌙" />
            <ScaleSelector label="Fatigue générale" stateKey="fatigue" emoji="⚡" />
            <ScaleSelector label="Courbatures / douleurs musculaires" stateKey="soreness" emoji="💪" />
            <ScaleSelector label="Niveau de stress" stateKey="stress" emoji="🧠" />

            {/* HRV optionnel */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                📱 HRV (optionnel — depuis ta montre)
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input value={checkin.hrv} onChange={e => setCheckin(p => ({ ...p, hrv: e.target.value }))}
                  type="number" placeholder="HRV ms"
                  style={{ flex: 1, padding: '10px 14px', background: '#0d0d0d', border: '1px solid ' + BORDER, borderRadius: 10, color: '#fff', fontSize: 14, outline: 'none' }} />
                <input value={checkin.resting_hr} onChange={e => setCheckin(p => ({ ...p, resting_hr: e.target.value }))}
                  type="number" placeholder="FC repos bpm"
                  style={{ flex: 1, padding: '10px 14px', background: '#0d0d0d', border: '1px solid ' + BORDER, borderRadius: 10, color: '#fff', fontSize: 14, outline: 'none' }} />
              </div>
            </div>

            <button onClick={saveCheckin}
              style={{ width: '100%', padding: 16, background: ACCENT, border: 'none', borderRadius: 12, color: '#000', fontWeight: 900, fontSize: 15, cursor: 'pointer' }}>
              ENREGISTRER MON CHECK-IN
            </button>
          </div>
        ) : (
          <div style={{ background: ACCENT + '11', border: '1px solid ' + ACCENT + '33', borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: ACCENT }}>✓ Check-in récupération enregistré aujourd'hui</div>
          </div>
        )}

        {/* Wearables */}
        <div style={{ fontSize: 13, fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>
          INTÉGRATIONS WEARABLES
        </div>
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, padding: '4px 0', marginBottom: 16 }}>
          {WEARABLES.map((w, i) => (
            <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderBottom: i < WEARABLES.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{w.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{w.name}</div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Disponible prochainement</div>
              </div>
              <div style={{ background: '#1a1a1a', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: '#555', fontWeight: 700 }}>
                BIENTÔT
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: '#4488ff11', border: '1px solid #4488ff22', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 12, color: '#4488ff', fontWeight: 800, marginBottom: 6 }}>À VENIR</div>
          <div style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>
            Apple Health, Oura, WHOOP, Garmin Connect et Fitbit seront intégrés pour récupérer automatiquement HRV, sommeil, FC repos et activité quotidienne — et les injecter dans la boucle NOX.
          </div>
        </div>
      </div>

      <BottomNav active="body" />
    </div>
  );
}
