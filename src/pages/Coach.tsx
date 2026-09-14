import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

const QUICK_PROMPTS = [
  'Je suis fatigué aujourd\'hui, je fais quoi ?',
  'Pourquoi je stagne depuis 2 semaines ?',
  'Je n\'ai que 30 minutes, adapte ma séance',
  'Que manger ce soir pour récupérer ?',
  'Dois-je augmenter mes charges ?',
  'J\'ai mal au dos, quels exos éviter ?',
  'Combien de protéines dois-je manger ?',
  'Analyse ma semaine et dis-moi quoi améliorer',
];

export default function Coach() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (user) loadContext(); }, [user]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadContext = async () => {
    const [{ data: profile }, { data: program }, { data: recentWorkouts }, { data: prs }, { data: bodyLogs }, { data: fuelToday }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle(),
      supabase.from('workout_programs').select('*').eq('user_id', user!.id).eq('is_active', true).maybeSingle(),
      supabase.from('workouts').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('personal_records').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('body_logs').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('food_entries').select('*').eq('user_id', user!.id).gte('created_at', new Date().toISOString().split('T')[0] + 'T00:00:00'),
    ]);

    const totalKcal = fuelToday?.reduce((s: number, f: any) => s + (f.calories || 0), 0) || 0;
    const totalProtein = fuelToday?.reduce((s: number, f: any) => s + (f.protein || 0), 0) || 0;

    setContext({
      profile: {
        name: profile?.display_name,
        goal: profile?.goal_type,
        weight: bodyLogs?.[0]?.weight,
        level: profile?.experience_level,
        activity: profile?.activity_level,
        xp: profile?.xp,
        streak: profile?.streak_days,
      },
      program: program ? { name: program.name, goal: program.goal, days_per_week: program.days_per_week } : null,
      recent_workouts: recentWorkouts?.length || 0,
      top_prs: prs?.slice(0, 5).map((p: any) => `${p.exercise_name}: ${p.weight}kg × ${p.reps}`),
      today_fuel: { kcal: totalKcal, protein: Math.round(totalProtein) },
      latest_weight: bodyLogs?.[0]?.weight,
    });

    // Message de bienvenue
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Salut ${profile?.display_name?.split(' ')[0] || 'champion'} ⚡\n\nJe suis ton Coach NOX. J'ai accès à tout ton historique — séances, records, nutrition, progression.\n\nQu'est-ce que tu veux travailler aujourd'hui ?`,
      }]);
    }
  };

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setLoading(true);

    const newMessages = [...messages, { role: 'user' as const, content: msg }];
    setMessages(newMessages);

    try {
      const systemPrompt = `Tu es NOX Coach, un coach de transformation physique IA ultra-premium, motivant et direct.

PROFIL UTILISATEUR :
${JSON.stringify(context, null, 2)}

RÈGLES :
- Tu parles français, tu tutoies l'utilisateur
- Tu es direct, précis, motivant — pas de blabla
- Tu utilises les données réelles de l'utilisateur dans tes réponses
- Tu ne poses pas de diagnostic médical
- Si quelqu'un parle de blessure grave, tu recommandes un professionnel
- Réponses courtes et actionnables (max 200 mots sauf si analyse demandée)
- Tu peux utiliser quelques emojis mais pas trop
- Tu connais leur programme, leurs PR, leur nutrition`;

      const { data, error: fnErr } = await supabase.functions.invoke('nox-coach', {
        body: {
          system: systemPrompt,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        },
      });

      if (fnErr) throw fnErr;
      const reply = data?.content?.[0]?.text || 'Désolé, je n\'ai pas pu répondre. Réessaie.';

      const finalMessages = [...newMessages, { role: 'assistant' as const, content: reply }];
      setMessages(finalMessages);

      // Sauvegarder conversation
      await supabase.from('coach_messages').insert([
        { user_id: user!.id, role: 'user', content: msg, created_at: new Date().toISOString() },
        { user_id: user!.id, role: 'assistant', content: reply, created_at: new Date().toISOString() },
      ]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erreur de connexion. Vérifie ta connexion et réessaie.' }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid ' + BORDER, flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em' }}>Intelligence NOX</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>COACH IA</div>
        {context?.profile && (
          <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
            {context.profile.streak > 0 && `🔥 ${context.profile.streak}j · `}
            {context.profile.weight && `⚖️ ${context.profile.weight}kg · `}
            {context.today_fuel.kcal > 0 && `🥗 ${context.today_fuel.kcal}kcal aujourd'hui`}
          </div>
        )}
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <div style={{ padding: '12px 20px', borderBottom: '1px solid ' + BORDER, flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>Questions rapides</div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {QUICK_PROMPTS.map(p => (
              <button key={p} onClick={() => send(p)}
                style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 20, padding: '8px 14px', color: '#ccc', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 0', paddingBottom: 160 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 16, display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'assistant' && (
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: ACCENT + '22', border: '1px solid ' + ACCENT + '44', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 10, alignSelf: 'flex-end' }}>
                <span style={{ fontSize: 14 }}>⚡</span>
              </div>
            )}
            <div style={{
              maxWidth: '80%',
              background: msg.role === 'user' ? ACCENT : SURFACE,
              color: msg.role === 'user' ? '#000' : '#e0e0e0',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              padding: '12px 16px',
              fontSize: 14,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              border: msg.role === 'assistant' ? '1px solid ' + BORDER : 'none',
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: ACCENT + '22', border: '1px solid ' + ACCENT + '44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 14 }}>⚡</span>
            </div>
            <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: '18px 18px 18px 4px', padding: '12px 20px' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT, animation: `bounce 1s ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ position: 'fixed', bottom: 70, left: 0, right: 0, background: '#0d0d0d', borderTop: '1px solid ' + BORDER, padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Pose une question à ton Coach NOX..."
            rows={1}
            style={{ flex: 1, padding: '12px 16px', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, color: '#fff', fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit', maxHeight: 100, overflowY: 'auto' }}
          />
          <button onClick={() => send()} disabled={!input.trim() || loading}
            style={{ width: 44, height: 44, borderRadius: '50%', background: input.trim() && !loading ? ACCENT : '#1a1a1a', border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
            ↑
          </button>
        </div>
      </div>

      <style>{`@keyframes bounce { 0%,80%,100% { transform: scale(0); } 40% { transform: scale(1); } }`}</style>
      <BottomNav active="coach" />
    </div>
  );
}
