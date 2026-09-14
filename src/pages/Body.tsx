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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'grid', placeItems: 'center' }}>
        <div style={{ color: ACCENT, fontWeight: 900, letterSpacing: '.14em' }}>NOX BODY</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#fff', paddingBottom: 100 }}>
      <main style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
        <header style={{
          padding: '24px 20px 18px',
          background: 'radial-gradient(circle at 88% 0%, rgba(200,255,0,.06), transparent 30%), #090909',
          borderBottom: `1px solid ${BORDER}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: '#777', fontWeight: 850, textTransform: 'uppercase', letterSpacing: '.14em' }}>Progression physique</div>
              <div style={{ fontSize: 27, fontWeight: 950, letterSpacing: '-.04em', marginTop: 4 }}>BODY</div>
            </div>
            <button onClick={() => setShowAdd(true)} style={{
              border: 0, borderRadius: 13, background: ACCENT, color: '#050505', padding: '11px 15px',
              fontSize: 11, fontWeight: 950, letterSpacing: '.04em', cursor: 'pointer'
            }}>+ CHECK-IN</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', background: '#111', padding: 4, borderRadius: 14, marginTop: 20 }}>
            {([
              ['weight', 'POIDS'],
              ['measurements', 'MESURES'],
              ['photos', 'PHOTOS'],
            ] as [Tab, string][]).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                border: 0, borderRadius: 11, padding: '10px 4px', cursor: 'pointer',
                background: tab === id ? '#202020' : 'transparent',
                color: tab === id ? '#fff' : '#666', fontSize: 10, fontWeight: 900, letterSpacing: '.05em'
              }}>{label}</button>
            ))}
          </div>
        </header>

        <section style={{ padding: 20 }}>
          {tab === 'weight' && (
            <>
              {latest ? (
                <div style={{
                  background: 'linear-gradient(145deg,#151515,#0e0e0e)', border: `1px solid ${BORDER}`,
                  borderRadius: 22, padding: 20, marginBottom: 14
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#777', fontWeight: 850, letterSpacing: '.09em' }}>POIDS ACTUEL</div>
                      <div style={{ fontSize: 42, fontWeight: 950, letterSpacing: '-.055em', lineHeight: 1.05, marginTop: 6 }}>
                        {latest.weight}<span style={{ fontSize: 15, color: '#777', marginLeft: 5 }}>kg</span>
                      </div>
                    </div>
                    {delta !== null && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 9.5, color: '#666', fontWeight: 850, letterSpacing: '.08em' }}>ÉVOLUTION</div>
                        <div style={{ marginTop: 6, fontSize: 20, fontWeight: 950, color: parseFloat(delta) <= 0 ? ACCENT : '#ff785f' }}>
                          {parseFloat(delta) > 0 ? '+' : ''}{delta} kg
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6, margin: '22px 0 15px' }}>
                    {(['7d', '30d', '90d'] as const).map(r => (
                      <button key={r} onClick={() => setRange(r)} style={{
                        flex: 1, borderRadius: 9, padding: '7px 0', cursor: 'pointer',
                        border: `1px solid ${range === r ? 'rgba(200,255,0,.28)' : BORDER}`,
                        background: range === r ? 'rgba(200,255,0,.08)' : '#0c0c0c',
                        color: range === r ? ACCENT : '#666', fontSize: 10.5, fontWeight: 850
                      }}>{r}</button>
                    ))}
                  </div>

                  <div style={{ borderRadius: 15, padding: '12px 10px 4px', background: '#0b0b0b', border: '1px solid #1d1d1d' }}>
                    {weightLogs.length >= 2 ? <MiniChart /> : (
                      <div style={{ height: 80, display: 'grid', placeItems: 'center', color: '#555', fontSize: 11.5 }}>
                        Encore un check-in pour afficher ta courbe
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{
                  borderRadius: 22, border: `1px solid ${BORDER}`, background: SURFACE, padding: '42px 22px',
                  textAlign: 'center', marginBottom: 14
                }}>
                  <div style={{ width: 52, height: 52, margin: '0 auto 16px', borderRadius: 16, background: 'rgba(200,255,0,.08)', border: '1px solid rgba(200,255,0,.16)', display: 'grid', placeItems: 'center', color: ACCENT, fontSize: 22 }}>+</div>
                  <div style={{ fontSize: 18, fontWeight: 950 }}>COMMENCE TON SUIVI</div>
                  <div style={{ color: '#777', fontSize: 12.5, lineHeight: 1.55, margin: '8px auto 18px', maxWidth: 300 }}>
                    Ajoute ton premier check-in pour construire ta courbe de progression.
                  </div>
                  <button onClick={() => setShowAdd(true)} style={{ border: 0, borderRadius: 12, background: ACCENT, color: '#050505', padding: '12px 17px', fontWeight: 950, cursor: 'pointer' }}>
                    AJOUTER MON POIDS
                  </button>
                </div>
              )}

              {logs.filter(l => l.weight).length > 0 && (
                <>
                  <div style={{ fontSize: 10.5, color: '#777', fontWeight: 900, letterSpacing: '.09em', margin: '21px 2px 10px' }}>HISTORIQUE</div>
                  {logs.filter(l => l.weight).slice(0, 10).map(log => (
                    <div key={log.id} style={{
                      background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 15, padding: '14px 15px',
                      marginBottom: 8, display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 950 }}>{log.weight} <span style={{ fontSize: 11, color: '#666' }}>kg</span></div>
                        <div style={{ fontSize: 10.5, color: '#666', marginTop: 4 }}>
                          {new Date(log.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      {log.notes && <div style={{ fontSize: 11, color: '#777', maxWidth: 150, textAlign: 'right', lineHeight: 1.4 }}>{log.notes}</div>}
                    </div>
                  ))}
                </>
              )}
            </>
          )}

          {tab === 'measurements' && (
            <>
              {logs.filter(l => l.waist_cm || l.chest_cm).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '55px 20px', borderRadius: 22, background: SURFACE, border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 18, fontWeight: 950 }}>MESURE TON ÉVOLUTION</div>
                  <div style={{ fontSize: 12.5, color: '#777', lineHeight: 1.55, margin: '9px auto 20px', maxWidth: 310 }}>
                    Le poids ne raconte pas tout. Ajoute tes mensurations pour mieux suivre ta transformation.
                  </div>
                  <button onClick={() => setShowAdd(true)} style={{ border: 0, borderRadius: 12, background: ACCENT, color: '#050505', padding: '12px 17px', fontWeight: 950, cursor: 'pointer' }}>AJOUTER DES MESURES</button>
                </div>
              ) : logs.filter(l => l.waist_cm || l.chest_cm).slice(0, 5).map(log => (
                <div key={log.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 16, marginBottom: 11 }}>
                  <div style={{ fontSize: 10.5, color: '#666', fontWeight: 850, marginBottom: 12 }}>
                    {new Date(log.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
                    {[
                      { key: 'chest_cm', label: 'Poitrine' },
                      { key: 'waist_cm', label: 'Taille' },
                      { key: 'hips_cm', label: 'Hanches' },
                      { key: 'arms_cm', label: 'Bras' },
                      { key: 'thighs_cm', label: 'Cuisses' },
                    ].filter(m => log[m.key]).map(({ key, label }) => (
                      <div key={key} style={{ background: '#0b0b0b', border: '1px solid #1d1d1d', borderRadius: 13, padding: 13 }}>
                        <div style={{ fontSize: 18, fontWeight: 950 }}>{log[key]} <span style={{ fontSize: 10, color: '#666' }}>cm</span></div>
                        <div style={{ fontSize: 9.5, color: '#777', marginTop: 4, textTransform: 'uppercase', fontWeight: 800 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === 'photos' && (
            <div style={{
              minHeight: 330, borderRadius: 22, border: '1px solid rgba(200,255,0,.16)',
              background: 'radial-gradient(circle at 50% 20%, rgba(200,255,0,.10), transparent 28%), linear-gradient(145deg,#151515,#0d0d0d)',
              padding: '44px 22px', textAlign: 'center'
            }}>
              <div style={{ display: 'inline-block', color: ACCENT, fontSize: 10, fontWeight: 950, letterSpacing: '.12em', marginBottom: 13 }}>NOX FUTURE</div>
              <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: '-.03em' }}>TA TRANSFORMATION EN IMAGES</div>
              <div style={{ fontSize: 12.5, color: '#858585', lineHeight: 1.6, maxWidth: 330, margin: '10px auto 23px' }}>
                Ajoute tes photos de progression et accède à ta timeline NOX FUTURE. Tes photos restent privées.
              </div>
              <button onClick={() => window.location.href = '/future'} style={{
                border: 0, borderRadius: 13, background: ACCENT, color: '#050505', padding: '13px 19px',
                fontSize: 11.5, fontWeight: 950, cursor: 'pointer'
              }}>OUVRIR NOX FUTURE</button>
              <div style={{ fontSize: 9.5, color: '#555', lineHeight: 1.5, marginTop: 16 }}>
                Les projections IA sont indicatives et ne garantissent pas un résultat physique.
              </div>
            </div>
          )}
        </section>
      </main>

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.82)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 560, background: '#0d0d0d', border: `1px solid ${BORDER}`, borderBottom: 0, borderRadius: '24px 24px 0 0', padding: '10px 20px max(24px, env(safe-area-inset-bottom))', maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ width: 38, height: 4, background: '#2b2b2b', borderRadius: 999, margin: '2px auto 17px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 10, color: ACCENT, fontWeight: 900, letterSpacing: '.1em' }}>BODY</div>
                <div style={{ fontSize: 19, fontWeight: 950, marginTop: 3 }}>NOUVEAU CHECK-IN</div>
              </div>
              <button onClick={() => setShowAdd(false)} style={{ width: 36, height: 36, borderRadius: 12, border: `1px solid ${BORDER}`, background: '#151515', color: '#888', fontSize: 21, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
              {[
                { key: 'weight', label: 'Poids', unit: 'kg', placeholder: '80.5' },
                { key: 'chest_cm', label: 'Poitrine', unit: 'cm', placeholder: '—' },
                { key: 'waist_cm', label: 'Taille', unit: 'cm', placeholder: '—' },
                { key: 'hips_cm', label: 'Hanches', unit: 'cm', placeholder: '—' },
                { key: 'arms_cm', label: 'Bras', unit: 'cm', placeholder: '—' },
                { key: 'thighs_cm', label: 'Cuisses', unit: 'cm', placeholder: '—' },
              ].map(({ key, label, unit, placeholder }) => (
                <label key={key} style={{ display: 'block', background: '#111', border: `1px solid ${BORDER}`, borderRadius: 14, padding: 12 }}>
                  <div style={{ fontSize: 9.5, color: '#777', fontWeight: 850, textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: 5 }}>
                    <input
                      value={(form as any)[key]}
                      onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      type="number"
                      inputMode="decimal"
                      style={{ width: '100%', minWidth: 0, border: 0, outline: 0, background: 'transparent', color: '#fff', fontSize: 18, fontWeight: 900 }}
                    />
                    <span style={{ color: '#555', fontSize: 10 }}>{unit}</span>
                  </div>
                </label>
              ))}
            </div>

            <label style={{ display: 'block', marginTop: 10 }}>
              <div style={{ fontSize: 9.5, color: '#777', fontWeight: 850, textTransform: 'uppercase', marginBottom: 6 }}>Note</div>
              <input
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Comment tu te sens aujourd'hui ?"
                type="text"
                style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${BORDER}`, outline: 0, background: '#111', color: '#fff', borderRadius: 14, padding: '13px 14px', fontSize: 13 }}
              />
            </label>

            <button onClick={save} style={{ width: '100%', border: 0, borderRadius: 14, background: ACCENT, color: '#050505', padding: 15, marginTop: 16, fontSize: 12, fontWeight: 950, letterSpacing: '.04em', cursor: 'pointer' }}>
              ENREGISTRER LE CHECK-IN
            </button>
          </div>
        </div>
      )}

      <BottomNav active="body" />
    </div>
  );
}
