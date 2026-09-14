import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

export default function Body() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('body_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => setLogs(data || []));
  }, [user]);

  const addLog = async () => {
    if (!weight || !user) return;
    setSaving(true);
    const { data } = await supabase.from('body_logs').insert({ user_id: user.id, weight: Number(weight), created_at: new Date().toISOString() }).select().single();
    if (data) setLogs(prev => [data, ...prev]);
    setWeight('');
    setSaving(false);
  };

  const latest = logs[0]?.weight;
  const first = logs[logs.length - 1]?.weight;
  const diff = latest && first ? (latest - first).toFixed(1) : null;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: 90 }}>
      <div style={{ padding: '24px 20px 0' }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 28, letterSpacing: '-.025em' }}>BODY</h1>

        {/* Poids actuel */}
        {latest && (
          <div style={{ background: 'linear-gradient(135deg, #1a1f00, #111)', border: `1px solid rgba(200,255,0,0.2)`, borderRadius: 20, padding: 24, marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: ACCENT, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>POIDS ACTUEL</div>
            <div style={{ fontSize: 52, fontWeight: 900, color: '#fff', letterSpacing: '-.04em' }}>{latest}<span style={{ fontSize: 18, color: '#444' }}> kg</span></div>
            {diff && <div style={{ fontSize: 14, color: Number(diff) < 0 ? ACCENT : '#ff3b30', fontWeight: 700, marginTop: 8 }}>{Number(diff) > 0 ? '+' : ''}{diff} kg depuis le début</div>}
          </div>
        )}

        {/* Ajouter une pesée */}
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: '#444', fontWeight: 800, textTransform: 'uppercase', marginBottom: 12 }}>Ajouter une pesée</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input value={weight} onChange={e => setWeight(e.target.value)} type="number" placeholder="80.5"
              style={{ flex: 1, background: '#0d0d0d', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px', fontSize: 18, fontWeight: 700, color: '#fff', outline: 'none' }} />
            <button onClick={addLog} disabled={saving || !weight}
              style={{ background: weight ? ACCENT : '#1a1a1a', color: weight ? '#0a0a0a' : '#333', border: 'none', borderRadius: 10, padding: '14px 20px', fontSize: 14, fontWeight: 900, cursor: 'pointer' }}>
              OK
            </button>
          </div>
        </div>

        {/* Historique */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {logs.slice(0, 10).map((log, i) => (
            <div key={log.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#444' }}>{new Date(log.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
              <span style={{ fontSize: 16, fontWeight: 900, color: i === 0 ? ACCENT : '#fff' }}>{log.weight} kg</span>
            </div>
          ))}
        </div>
      </div>
      <BottomNav active="body" />
    </div>
  );
}
