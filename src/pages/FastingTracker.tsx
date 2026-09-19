import { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from '../components/BottomNav';

const ACCENT = '#B7FF00';
const BG = '#F7F7F7';
const SURFACE = '#FFFFFF';
const BORDER = '#EAEAEA';

const PROTOCOLS = [
  { id: '16:8', name: '16:8', fast: 16, eat: 8, desc: 'Le plus populaire' },
  { id: '14:10', name: '14:10', fast: 14, eat: 10, desc: 'Débutant' },
  { id: '12:12', name: '12:12', fast: 12, eat: 12, desc: 'Doux' },
  { id: 'custom', name: 'Perso', fast: 16, eat: 8, desc: 'Personnalisable' },
];

export default function FastingTracker() {
  const { user } = useAuth();
  const [protocol, setProtocol] = useState(PROTOCOLS[0]);
  const [customFastHours, setCustomFastHours] = useState(16);
  const [fastStart, setFastStart] = useState<Date | null>(null);
  const [isFasting, setIsFasting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [waterGoal] = useState(2500);
  const [waterIntake, setWaterIntake] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!user) return;
    // Charger état depuis localStorage
    const saved = localStorage.getItem('nox_fasting_' + user.id);
    if (saved) {
      const data = JSON.parse(saved);
      if (data.fastStart) {
        const start = new Date(data.fastStart);
        setFastStart(start);
        setIsFasting(true);
        setProtocol(PROTOCOLS.find(p => p.id === data.protocolId) || PROTOCOLS[0]);
        if (data.protocolId === 'custom' && Number(data.customFastHours) >= 10 && Number(data.customFastHours) <= 20) setCustomFastHours(Number(data.customFastHours));
      }
    }
    // Eau du jour
    const today = new Date().toISOString().split('T')[0];
    const water = localStorage.getItem('nox_water_' + user.id + '_' + today);
    if (water) setWaterIntake(parseInt(water));
  }, [user]);

  useEffect(() => {
    if (!isFasting || !fastStart) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - fastStart.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isFasting, fastStart]);

  const startFast = () => {
    const now = new Date();
    setFastStart(now);
    setIsFasting(true);
    localStorage.setItem('nox_fasting_' + user!.id, JSON.stringify({ fastStart: now.toISOString(), protocolId: protocol.id, customFastHours: protocol.id === 'custom' ? customFastHours : undefined }));
  };

  const stopFast = () => {
    const duration = elapsed / 3600;
    if (duration >= (protocol.id === 'custom' ? customFastHours : protocol.fast) * 0.8) setStreak(s => s + 1);
    setFastStart(null);
    setIsFasting(false);
    setElapsed(0);
    localStorage.removeItem('nox_fasting_' + user!.id);
  };

  const addWater = (ml: number) => {
    const newVal = waterIntake + ml;
    setWaterIntake(newVal);
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('nox_water_' + user!.id + '_' + today, String(newVal));
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const effectiveFastHours = protocol.id === 'custom' ? customFastHours : protocol.fast;
  const fastGoalSeconds = effectiveFastHours * 3600;
  const progress = Math.min(1, elapsed / fastGoalSeconds);
  const remainingH = Math.max(0, Math.floor((fastGoalSeconds - elapsed) / 3600));
  const remainingM = Math.max(0, Math.floor(((fastGoalSeconds - elapsed) % 3600) / 60));

  const circumference = 2 * Math.PI * 80;

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 80 }}>
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid ' + BORDER }}>
        <div style={{ fontSize: 11, color: '#777', textTransform: 'uppercase', letterSpacing: '.1em' }}>NUTRITION · OPTIONNEL</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#0A0A0A' }}>JEÛNE INTERMITTENT</div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        <div style={{background:'#fff',border:'1px solid '+BORDER,borderRadius:14,padding:'12px 14px',marginBottom:18,fontSize:11.5,color:'#777',lineHeight:1.5}}>Le suivi du jeûne est facultatif. NOX l’utilise uniquement comme outil d’organisation alimentaire, sans attribuer de bénéfice médical ni de jugement aux aliments.</div>
        {/* Protocol selector */}
        {!isFasting && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: '#555', fontWeight: 800, textTransform: 'uppercase', marginBottom: 10 }}>PROTOCOLE</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PROTOCOLS.map(p => (
                <button key={p.id} onClick={() => setProtocol(p)}
                  style={{ padding: '8px 14px', borderRadius: 20, border: '1px solid ' + (protocol.id === p.id ? ACCENT : BORDER), background: protocol.id === p.id ? ACCENT + '22' : 'transparent', color: protocol.id === p.id ? ACCENT : '#555', fontSize: 12, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>
                  {p.name}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
              {protocol.desc} · Jeûne {effectiveFastHours}h · Fenêtre {24 - effectiveFastHours}h
            </div>
            {protocol.id === 'custom' && (
              <div style={{ marginTop: 12, background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <div><div style={{ fontSize: 11, fontWeight: 850, color: '#0A0A0A' }}>Durée personnalisée</div><div style={{ fontSize: 10, color: '#777', marginTop: 2 }}>Choisis ton repère de jeûne</div></div>
                  <strong style={{ fontSize: 18, color: '#0A0A0A' }}>{customFastHours}h</strong>
                </div>
                <input aria-label="Durée du jeûne personnalisé" type="range" min="10" max="20" step="1" value={customFastHours} onChange={e => setCustomFastHours(Number(e.target.value))} style={{ width: '100%', marginTop: 12, accentColor: ACCENT }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#888' }}><span>10h</span><span>20h</span></div>
              </div>
            )}
            {protocol.id === 'custom' && (
              <div style={{ marginTop: 14, background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: 14 }}>
                <div style={{display:'flex',justifyContent:'space-between',gap:12,fontSize:11,fontWeight:850,color:'#555'}}><span>DURÉE PERSONNALISÉE</span><span>{customFastHours} h</span></div>
                <input type="range" min="10" max="20" step="1" value={customFastHours} onChange={e=>setCustomFastHours(Number(e.target.value))} style={{width:'100%',marginTop:10,accentColor:ACCENT}}/>
                <div style={{fontSize:10,color:'#888',marginTop:5}}>Fenêtre alimentaire correspondante : {effectiveEatHours} h.</div>
              </div>
            )}
          </div>
        )}

        {/* Timer */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto 20px' }}>
            <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="100" cy="100" r="80" fill="none" stroke="#EAEAEA" strokeWidth="12" />
              <circle cx="100" cy="100" r="80" fill="none"
                stroke={ACCENT}
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s linear, stroke .3s' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              {isFasting ? (
                <>
                  <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>En jeûne</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#0A0A0A', fontFamily: 'monospace' }}>{formatTime(elapsed)}</div>
                  {progress < 1 ? (
                    <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Encore {remainingH}h{remainingM}m</div>
                  ) : (
                    <div style={{ fontSize: 12, color: ACCENT, fontWeight: 800, marginTop: 4 }}>OBJECTIF ATTEINT ⚡</div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ fontSize: 24 }}>⏱️</div>
                  <div style={{ fontSize: 13, color: '#555', marginTop: 8 }}>Prêt à commencer</div>
                </>
              )}
            </div>
          </div>

          {isFasting ? (
            <button onTouchEnd={e => { e.preventDefault(); stopFast(); }} onClick={stopFast}
              style={{ padding: '16px 40px', background: '#ff4444', border: 'none', borderRadius: 14, color: '#fff', fontWeight: 900, fontSize: 15, cursor: 'pointer', touchAction: 'manipulation' }}>
              ARRÊTER LE JEÛNE
            </button>
          ) : (
            <button onTouchEnd={e => { e.preventDefault(); startFast(); }} onClick={startFast}
              style={{ padding: '16px 40px', background: ACCENT, border: 'none', borderRadius: 14, color: '#000', fontWeight: 900, fontSize: 15, cursor: 'pointer', touchAction: 'manipulation' }}>
              COMMENCER LE JEÛNE
            </button>
          )}
        </div>

        {/* Eau */}
        <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0A0A0A' }}>💧 Hydratation</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#4488ff' }}>{waterIntake}ml / {waterGoal}ml</div>
          </div>
          <div style={{ height: 8, background: '#EAEAEA', borderRadius: 4, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ height: '100%', width: Math.min(100, (waterIntake / waterGoal) * 100) + '%', background: '#4488ff', borderRadius: 4, transition: 'width .3s' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[150, 250, 500].map(ml => (
              <button key={ml} onTouchEnd={e => { e.preventDefault(); addWater(ml); }} onClick={() => addWater(ml)}
                style={{ flex: 1, padding: '10px 0', background: '#4488ff22', border: '1px solid #4488ff44', borderRadius: 10, color: '#4488ff', fontWeight: 800, fontSize: 13, cursor: 'pointer', touchAction: 'manipulation' }}>
                +{ml}ml
              </button>
            ))}
            {waterIntake > 0 && (
              <button onTouchEnd={e => { e.preventDefault(); addWater(-waterIntake); }} onClick={() => addWater(-waterIntake)}
                style={{ padding: '10px 12px', background: 'transparent', border: '1px solid #333', borderRadius: 10, color: '#555', fontSize: 12, cursor: 'pointer', touchAction: 'manipulation' }}>
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Streak */}
        {streak > 0 && (
          <div style={{ background: '#ff660011', border: '1px solid #ff660033', borderRadius: 14, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 32 }}>🔥</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#ff6600', marginTop: 6 }}>{streak} jeûnes complétés</div>
          </div>
        )}
      </div>

      <BottomNav active="fuel" />
    </div>
  );
}
