import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

type Tab = 'weight' | 'measurements' | 'photos';

export default function Body() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('weight');
  const [logs, setLogs] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ weight: '', chest_cm: '', waist_cm: '', hips_cm: '', arms_cm: '', thighs_cm: '', notes: '' });
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    const { data } = await supabase.from('body_logs').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
    setLogs(data || []);
    setLoading(false);
  };

  const save = async () => {
    if (!form.weight && !form.waist_cm) return;
    await supabase.from('body_logs').insert({
      user_id: user!.id,
      weight: form.weight ? parseFloat(form.weight) : null,
      chest_cm: form.chest_cm ? parseFloat(form.chest_cm) : null,
      waist_cm: form.waist_cm ? parseFloat(form.waist_cm) : null,
      hips_cm: form.hips_cm ? parseFloat(form.hips_cm) : null,
      arms_cm: form.arms_cm ? parseFloat(form.arms_cm) : null,
      thighs_cm: form.thighs_cm ? parseFloat(form.thighs_cm) : null,
      notes: form.notes || null,
      created_at: new Date().toISOString(),
    });
    setForm({ weight: '', chest_cm: '', waist_cm: '', hips_cm: '', arms_cm: '', thighs_cm: '', notes: '' });
    setShowAdd(false);
    load();
  };

  const getRangeData = () => {
    const now = Date.now();
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return logs.filter(l => new Date(l.created_at).getTime() > cutoff).reverse();
  };

  const rangeData = getRangeData();
  const weightLogs = rangeData.filter(l => l.weight);
  const latest = logs.find(l => l.weight);
  const oldest = weightLogs[0];
  const delta = latest && oldest && latest.id !== oldest.id ? (latest.weight - oldest.weight).toFixed(1) : null;

  // Mini chart
  const MiniChart = () => {
    if (weightLogs.length < 2) return null;
    const weights = weightLogs.map(l => l.weight);
    const min = Math.min(...weights) - 1;
    const max = Math.max(...weights) + 1;
    const W = 300, H = 80;
    const points = weightLogs.map((l, i) => {
      const x = (i / (weightLogs.length - 1)) * W;
      const y = H - ((l.weight - min) / (max - min)) * H;
      return `${x},${y}`;
    }).join(' ');
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 80 }}>
        <polyline points={points} fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {weightLogs.map((l, i) => {
          const x = (i / (weightLogs.length - 1)) * W;
          const y = H - ((l.weight - min) / (max - min)) * H;
          return <circle key={i} cx={x} cy={y} r="3" fill={ACCENT} />;
        })}
      </svg>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 80 }}>
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid ' + BORDER }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em' }}>Suivi</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>BODY</div>
          </div>
          <button onClick={() => setShowAdd(true)} style={{ background: ACCENT, color: '#000', border: 'none', borderRadius: 12, padding: '10px 18px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>+ CHECK-IN</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', padding: '12px 20px', gap: 8, borderBottom: '1px solid ' + BORDER }}>
        {(['weight', 'measurements', 'photos'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: '8px 0', background: tab === t ? ACCENT : 'transparent', border: '1px solid ' + (tab === t ? ACCENT : BORDER), borderRadius: 10, color: tab === t ? '#000' : '#555', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', cursor: 'pointer' }}>
            {t === 'weight' ? '⚖️ Poids' : t === 'measurements' ? '📏 Mesures' : '📸 Photos'}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        {tab === 'weight' && (
          <>
            {/* Summary */}
            {latest && (
              <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: 20, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em' }}>Poids actuel</div>
                    <div style={{ fontSize: 40, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{latest.weight}<span style={{ fontSize: 16, color: '#555', marginLeft: 4 }}>kg</span></div>
                  </div>
                  {delta !== null && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em' }}>Évolution</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: parseFloat(delta) < 0 ? ACCENT : '#ff6644' }}>
                        {parseFloat(delta) > 0 ? '+' : ''}{delta} kg
                      </div>
                    </div>
                  )}
                </div>
                {/* Range selector */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  {(['7d', '30d', '90d'] as const).map(r => (
                    <button key={r} onClick={() => setRange(r)}
                      style={{ flex: 1, padding: '6px 0', background: range === r ? ACCENT + '22' : 'transparent', border: '1px solid ' + (range === r ? ACCENT : BORDER), borderRadius: 8, color: range === r ? ACCENT : '#555', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      {r}
                    </button>
                  ))}
                </div>
                <MiniChart />
              </div>
            )}

            {/* Log list */}
            {logs.filter(l => l.weight).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#333' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⚖️</div>
                <div style={{ fontWeight: 700, color: '#444' }}>Pas encore de pesée</div>
                <div style={{ fontSize: 13, marginTop: 8 }}>Commence à tracker ton poids</div>
              </div>
            ) : logs.filter(l => l.weight).slice(0, 10).map(log => (
              <div key={log.id} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '14px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>{log.weight} kg</div>
                  <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{new Date(log.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
                {log.notes && <div style={{ fontSize: 12, color: '#555', maxWidth: 120, textAlign: 'right' }}>{log.notes}</div>}
              </div>
            ))}
          </>
        )}

        {tab === 'measurements' && (
          <>
            {logs.filter(l => l.waist_cm || l.chest_cm).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#333' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📏</div>
                <div style={{ fontWeight: 700, color: '#444' }}>Pas encore de mesures</div>
                <div style={{ fontSize: 13, marginTop: 8 }}>Ajoute tes mensurations pour suivre ta composition</div>
              </div>
            ) : logs.filter(l => l.waist_cm || l.chest_cm).slice(0, 5).map(log => (
              <div key={log.id} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '14px 16px', marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#555', marginBottom: 10 }}>{new Date(log.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { key: 'chest_cm', label: 'Poitrine' },
                    { key: 'waist_cm', label: 'Tour de taille' },
                    { key: 'hips_cm', label: 'Hanches' },
                    { key: 'arms_cm', label: 'Bras' },
                    { key: 'thighs_cm', label: 'Cuisses' },
                  ].filter(m => log[m.key]).map(({ key, label }) => (
                    <div key={key} style={{ textAlign: 'center', background: '#0d0d0d', borderRadius: 10, padding: '10px 8px' }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>{log[key]}</div>
                      <div style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', marginTop: 2 }}>cm</div>
                      <div style={{ fontSize: 10, color: '#444', marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'photos' && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔮</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Photos de progression</div>
            <div style={{ fontSize: 14, color: '#555', marginBottom: 24, lineHeight: 1.5 }}>
              Utilise NOX FUTURE pour ajouter tes photos et générer ta projection IA
            </div>
            <button onClick={() => window.location.href = '/future'}
              style={{ padding: '14px 28px', background: ACCENT, border: 'none', borderRadius: 14, color: '#000', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
              🔮 OUVRIR NOX FUTURE
            </button>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.9)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: '#0d0d0d', borderRadius: '20px 20px 0 0', padding: 24, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>CHECK-IN BODY</div>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: '#555', fontSize: 24, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { key: 'weight', label: '⚖️ Poids (kg)', placeholder: 'ex: 80.5' },
                { key: 'chest_cm', label: '📏 Poitrine (cm)', placeholder: 'optionnel' },
                { key: 'waist_cm', label: '📏 Tour de taille (cm)', placeholder: 'optionnel' },
                { key: 'hips_cm', label: '📏 Hanches (cm)', placeholder: 'optionnel' },
                { key: 'arms_cm', label: '📏 Bras (cm)', placeholder: 'optionnel' },
                { key: 'thighs_cm', label: '📏 Cuisses (cm)', placeholder: 'optionnel' },
                { key: 'notes', label: '💬 Note', placeholder: 'Comment tu te sens ?' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: '#555', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</label>
                  <input
                    value={(form as any)[key]}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder} type={key === 'notes' ? 'text' : 'number'}
                    style={{ width: '100%', padding: '12px 16px', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontSize: 14, boxSizing: 'border-box', marginTop: 6 }} />
                </div>
              ))}
              <button onClick={save} style={{ width: '100%', padding: 16, background: ACCENT, border: 'none', borderRadius: 14, color: '#000', fontWeight: 900, fontSize: 15, cursor: 'pointer', marginTop: 8 }}>
                ENREGISTRER LE CHECK-IN
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="body" />
    </div>
  );
}
