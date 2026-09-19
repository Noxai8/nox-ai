import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

const QUALITY_LABELS = ['', 'Très mauvais', 'Mauvais', 'Moyen', 'Bien', 'Excellent'];
const QUALITY_COLORS = ['', '#ff4444', '#ff6600', '#ffaa00', '#44cc88', ACCENT];

export default function SleepTracker() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState<any[]>([]);
  const [todayLog, setTodayLog] = useState<any>(null);
  const [form, setForm] = useState({ bedtime: '23:00', waketime: '07:00', quality: 0, notes: '' });
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ avgDuration: 0, avgQuality: 0, consistency: 0 });

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    const { data } = await supabase.from('sleep_logs')
      .select('*').eq('user_id', user!.id)
      .order('created_at', { ascending: false }).limit(14);

    setHistory(data || []);
    const today = new Date().toISOString().slice(0, 10);
    const todayEntry = (data || []).find(s => s.created_at?.slice(0, 10) === today);
    setTodayLog(todayEntry);

    if (data && data.length > 0) {
      const avgDur = data.reduce((s, d) => s + (d.duration_hours || 0), 0) / data.length;
      const avgQual = data.reduce((s, d) => s + (d.quality || 0), 0) / data.length;
      // Régularité = nb de nuits avec même heure de coucher ±30min
      const bedtimes = data.map(d => d.bedtime).filter(Boolean);
      const consistency = bedtimes.length > 1 ? 
        Math.round((1 - (Math.max(...bedtimes.map(t => parseInt(t))) - Math.min(...bedtimes.map(t => parseInt(t)))) / 240) * 100) : 0;
      setStats({ avgDuration: Math.round(avgDur * 10) / 10, avgQuality: Math.round(avgQual * 10) / 10, consistency: Math.max(0, Math.min(100, consistency)) });
    }
  };

  const calcDuration = (bed: string, wake: string) => {
    const [bh, bm] = bed.split(':').map(Number);
    const [wh, wm] = wake.split(':').map(Number);
    let bedMin = bh * 60 + bm;
    let wakeMin = wh * 60 + wm;
    if (wakeMin < bedMin) wakeMin += 24 * 60;
    return Math.round((wakeMin - bedMin) / 60 * 10) / 10;
  };

  const save = async () => {
    if (!form.quality) return;
    setSaving(true);
    const duration = calcDuration(form.bedtime, form.waketime);
    await supabase.from('sleep_logs').insert({
      user_id: user!.id,
      bedtime: form.bedtime,
      waketime: form.waketime,
      duration_hours: duration,
      quality: form.quality,
      notes: form.notes || null,
      created_at: new Date().toISOString(),
    });
    setSaving(false);
    load();
  };

  const duration = calcDuration(form.bedtime, form.waketime);
  const durationColor = duration >= 8 ? ACCENT : duration >= 7 ? '#44cc88' : duration >= 6 ? '#ffaa00' : '#ff6600';

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 90 }}>
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid ' + BORDER }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 22, marginBottom: 12, display: 'block' }}>←</button>
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em' }}>Récupération</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>SOMMEIL</div>
      </div>

      <div style={{ padding: '16px 20px 0' }}>
        {/* Stats semaine */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
          {[
            { label: 'Durée moy.', value: stats.avgDuration + 'h', color: stats.avgDuration >= 7 ? ACCENT : '#ffaa00' },
            { label: 'Qualité moy.', value: stats.avgQuality + '/5', color: stats.avgQuality >= 4 ? ACCENT : '#ffaa00' },
            { label: 'Régularité', value: stats.consistency + '%', color: stats.consistency >= 70 ? ACCENT : '#ffaa00' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: '14px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color }}>{value}</div>
              <div style={{ fontSize: 10, color: '#555', fontWeight: 700 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Saisie du soir */}
        {!todayLog ? (
          <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 16 }}>🌙 Log de la nuit</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>Couché à</label>
                <input type="time" value={form.bedtime} onChange={e => setForm(f => ({ ...f, bedtime: e.target.value }))}
                  style={{ width: '100%', padding: '12px', background: '#0d0d0d', border: '1px solid ' + BORDER, borderRadius: 10, color: '#fff', fontSize: 16, boxSizing: 'border-box' as const, outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>Levé à</label>
                <input type="time" value={form.waketime} onChange={e => setForm(f => ({ ...f, waketime: e.target.value }))}
                  style={{ width: '100%', padding: '12px', background: '#0d0d0d', border: '1px solid ' + BORDER, borderRadius: 10, color: '#fff', fontSize: 16, boxSizing: 'border-box' as const, outline: 'none' }} />
              </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: durationColor }}>{duration}h</span>
              <span style={{ fontSize: 13, color: '#555', marginLeft: 8 }}>de sommeil</span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                Qualité {form.quality > 0 && <span style={{ color: QUALITY_COLORS[form.quality] }}>— {QUALITY_LABELS[form.quality]}</span>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 2, 3, 4, 5].map(v => (
                  <button key={v} onClick={() => setForm(f => ({ ...f, quality: v }))}
                    style={{ flex: 1, padding: '12px 0', background: form.quality === v ? QUALITY_COLORS[v] + '33' : SURFACE, border: '2px solid ' + (form.quality === v ? QUALITY_COLORS[v] : BORDER), borderRadius: 10, color: form.quality === v ? QUALITY_COLORS[v] : '#555', fontWeight: 900, fontSize: 16, cursor: 'pointer', touchAction: 'manipulation' }}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Notes optionnelles (rêves, réveils nocturnes...)"
              style={{ width: '100%', minHeight: 60, padding: '10px 12px', background: '#0d0d0d', border: '1px solid ' + BORDER, borderRadius: 10, color: '#fff', fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit', marginBottom: 14 }} />

            <button onClick={save} disabled={!form.quality || saving}
              onTouchEnd={e => { e.preventDefault(); if (form.quality && !saving) save(); }}
              style={{ width: '100%', padding: 16, background: form.quality ? ACCENT : '#1a1a1a', border: 'none', borderRadius: 12, color: form.quality ? '#000' : '#333', fontWeight: 900, fontSize: 14, cursor: form.quality ? 'pointer' : 'not-allowed', touchAction: 'manipulation' as const }}>
              {saving ? 'ENREGISTREMENT...' : 'ENREGISTRER'}
            </button>
          </div>
        ) : (
          <div style={{ background: ACCENT + '0d', border: '1px solid ' + ACCENT + '33', borderRadius: 16, padding: 16, marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: ACCENT }}>{todayLog.duration_hours}h</div>
            <div style={{ fontSize: 13, color: '#888' }}>Nuit enregistrée · Qualité {todayLog.quality}/5</div>
          </div>
        )}

        {/* Historique 14 nuits */}
        {history.length > 0 && (
          <>
            <div style={{ fontSize: 11, color: '#555', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>14 DERNIÈRES NUITS</div>
            {/* Mini graphique barres */}
            <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60, marginBottom: 8 }}>
                {history.slice(0, 14).reverse().map((log, i) => {
                  const h = Math.max(4, ((log.duration_hours || 0) / 10) * 56);
                  const c = (log.duration_hours || 0) >= 7 ? ACCENT : (log.duration_hours || 0) >= 6 ? '#ffaa00' : '#ff6600';
                  return <div key={i} style={{ flex: 1, height: h, background: c, borderRadius: '3px 3px 0 0' }} />;
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 9, color: '#555' }}>il y a 2 sem.</span>
                <span style={{ fontSize: 9, color: '#555' }}>Hier</span>
              </div>
            </div>

            {history.slice(0, 7).map(log => (
              <div key={log.id} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '10px 14px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#555' }}>{new Date(log.created_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{log.bedtime} → {log.waketime}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: (log.duration_hours || 0) >= 7 ? ACCENT : '#ffaa00' }}>{log.duration_hours}h</div>
                  <div style={{ fontSize: 10, color: QUALITY_COLORS[log.quality] }}>{QUALITY_LABELS[log.quality]}</div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Conseils sommeil */}
        <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: 16, marginTop: 8 }}>
          <div style={{ fontSize: 11, color: '#555', fontWeight: 800, textTransform: 'uppercase', marginBottom: 10 }}>💡 OPTIMISATION SOMMEIL</div>
          {[
            { tip: 'Dors 7-9h pour maximiser la synthèse protéique et la récupération musculaire', icon: '⏰' },
            { tip: 'Heure de coucher régulière ±30min = meilleure qualité de sommeil profond', icon: '🎯' },
            { tip: 'Évite les écrans 1h avant de dormir — la lumière bleue retarde la mélatonine', icon: '📵' },
            { tip: 'La caféine bloque le sommeil jusqu\'à 8h après consommation', icon: '☕' },
          ].map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: i < 3 ? '1px solid #0d0d0d' : 'none' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{c.icon}</span>
              <span style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>{c.tip}</span>
            </div>
          ))}
        </div>
      </div>

      <BottomNav active="body" />
    </div>
  );
}
