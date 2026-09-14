import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

export default function Coach() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Bonjour. Je suis ton coach NOX. Je connais ton programme, ton historique et tes objectifs. Comment puis-je t\'aider ?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<any>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || !user) return;
    setMessages(p => [...p, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      const { data: recentLogs } = await supabase.from('workout_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5);
      const { data: prs } = await supabase.from('personal_records').select('*').eq('user_id', user.id).limit(10);

      const context = `
Profil: ${JSON.stringify({ goal: profile?.goal, level: profile?.level, weight: profile?.weight, target_weight: profile?.target_weight })}
Séances récentes: ${recentLogs?.length || 0} séances
Records personnels: ${prs?.map((p: any) => `${p.exercise_name}: ${p.weight}kg×${p.reps}`).join(', ') || 'aucun'}
      `.trim();

      const { data, error } = await supabase.functions.invoke('nox-coach', {
        body: { message: text, context, messages: messages.slice(-6) }
      });

      if (error) throw error;
      setMessages(p => [...p, { role: 'assistant', content: data.reply || 'Je suis là pour t\'aider.' }]);
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: 'Une erreur est survenue. Réessaie.' }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = ['Comment progresser plus vite ?', 'Que manger aujourd\'hui ?', 'Je suis fatigué', 'Adapter ma séance'];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', paddingBottom: 90 }}>
      <div style={{ padding: '24px 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: '#1a1f00', border: `1px solid ${ACCENT}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🤖</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>Coach NOX</div>
            <div style={{ fontSize: 12, color: '#444' }}>Connecté à ton programme</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%', padding: '12px 16px', borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: m.role === 'user' ? ACCENT : SURFACE,
              color: m.role === 'user' ? '#0a0a0a' : '#fff',
              fontSize: 14, lineHeight: 1.5, fontWeight: m.role === 'user' ? 600 : 400,
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 6, padding: '12px 16px', background: SURFACE, borderRadius: '18px 18px 18px 4px', width: 'fit-content' }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#333', animation: `bounce 1s ${i*0.2}s infinite` }} />)}
          </div>
        )}
        <div ref={bottomRef} />
        <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}`}</style>
      </div>

      {messages.length <= 1 && (
        <div style={{ padding: '12px 20px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => send(s)} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '8px 14px', fontSize: 12, color: '#555', cursor: 'pointer' }}>{s}</button>
          ))}
        </div>
      )}

      <div style={{ padding: '12px 20px', display: 'flex', gap: 10, borderTop: `1px solid ${BORDER}` }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send(input)} placeholder="Pose une question..."
          style={{ flex: 1, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px', fontSize: 14, color: '#fff', outline: 'none' }} />
        <button onClick={() => send(input)} style={{ width: 46, height: 46, borderRadius: 12, background: ACCENT, color: '#0a0a0a', border: 'none', cursor: 'pointer', fontSize: 18, fontWeight: 900 }}>→</button>
      </div>

      <BottomNav active="coach" />
    </div>
  );
}
