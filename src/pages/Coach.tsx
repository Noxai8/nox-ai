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
        content: `Yo ${profile?.display_name?.split(' ')[0] || ''} 👊 Qu'est-ce qui se passe ?`,
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
      const systemPrompt = `Tu es NOX, le coach de ${context?.profile?.name?.split(' ')[0] || 'l\'utilisateur'}.

DONNÉES :
${JSON.stringify(context, null, 2)}

STYLE :
- Parle comme un pote qui maîtrise le sport — pas un robot, pas un prof
- Naturel, direct, sans bullshit. Pas de "Excellente question !" jamais
- Tutoie, sois concis (3-5 phrases), utilise les vraies données
- Pas de listes à puces partout — parle normalement
- Si blessure grave → conseille un pro
- Pas de diagnostic médical`;

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
    <div style={{ minHeight: '100vh', background: '#070707', color: '#fff', display: 'flex', flexDirection: 'column', paddingBottom: 80 }}>
      <header style={{
        flexShrink: 0,
        background: 'radial-gradient(circle at 88% 0%, rgba(200,255,0,.07), transparent 32%), #090909',
        borderBottom: '1px solid #202020'
      }}>
        <div style={{ width: '100%', maxWidth: 560, margin: '0 auto', padding: '22px 20px 16px', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
            <div>
              <div style={{ fontSize: 10, color: '#777', textTransform: 'uppercase', letterSpacing: '.14em', fontWeight: 850 }}>Intelligence NOX</div>
              <div style={{ fontSize: 27, fontWeight: 950, letterSpacing: '-.04em', marginTop: 4 }}>COACH IA</div>
            </div>
            <div style={{
              padding: '7px 10px', borderRadius: 999, background: 'rgba(200,255,0,.07)',
              border: '1px solid rgba(200,255,0,.18)', color: ACCENT,
              fontSize: 9.5, fontWeight: 950, letterSpacing: '.07em'
            }}>CONTEXTE ACTIF</div>
          </div>

          {context?.profile && (
            <div style={{ display: 'flex', gap: 7, overflowX: 'auto', marginTop: 15, paddingBottom: 2 }}>
              {context.profile.streak > 0 && (
                <div style={{ flexShrink: 0, background: '#111', border: '1px solid #222', borderRadius: 10, padding: '7px 9px', fontSize: 10.5, color: '#aaa' }}>
                  <b style={{ color: '#fff' }}>{context.profile.streak}j</b> streak
                </div>
              )}
              {context.profile.weight && (
                <div style={{ flexShrink: 0, background: '#111', border: '1px solid #222', borderRadius: 10, padding: '7px 9px', fontSize: 10.5, color: '#aaa' }}>
                  <b style={{ color: '#fff' }}>{context.profile.weight} kg</b> body
                </div>
              )}
              {context.today_fuel.kcal > 0 && (
                <div style={{ flexShrink: 0, background: '#111', border: '1px solid #222', borderRadius: 10, padding: '7px 9px', fontSize: 10.5, color: '#aaa' }}>
                  <b style={{ color: '#fff' }}>{context.today_fuel.kcal}</b> kcal
                </div>
              )}
              {context.recent_workouts > 0 && (
                <div style={{ flexShrink: 0, background: '#111', border: '1px solid #222', borderRadius: 10, padding: '7px 9px', fontSize: 10.5, color: '#aaa' }}>
                  <b style={{ color: '#fff' }}>{context.recent_workouts}</b> séances récentes
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {messages.length <= 1 && (
        <div style={{ width: '100%', maxWidth: 560, margin: '0 auto', padding: '14px 20px 0', boxSizing: 'border-box', flexShrink: 0 }}>
          <div style={{
            borderRadius: 18, padding: 15,
            background: 'linear-gradient(135deg,rgba(200,255,0,.075),rgba(200,255,0,.02))',
            border: '1px solid rgba(200,255,0,.14)'
          }}>
            <div style={{ color: ACCENT, fontSize: 9.5, fontWeight: 950, letterSpacing: '.1em' }}>COACH CONTEXTUEL</div>
            <div style={{ fontSize: 13, fontWeight: 850, marginTop: 6, lineHeight: 1.45 }}>
              Je peux croiser ton entraînement, tes records, BODY et ta nutrition pour te répondre.
            </div>
          </div>

          <div style={{ fontSize: 9.5, color: '#666', fontWeight: 900, letterSpacing: '.09em', margin: '15px 2px 8px' }}>QUESTIONS RAPIDES</div>
          <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 3 }}>
            {QUICK_PROMPTS.map(p => (
              <button key={p} onClick={() => send(p)} style={{
                flexShrink: 0, whiteSpace: 'nowrap', cursor: 'pointer',
                background: '#111', border: '1px solid #242424', borderRadius: 999,
                padding: '9px 12px', color: '#bbb', fontSize: 10.5, fontWeight: 700
              }}>{p}</button>
            ))}
          </div>
        </div>
      )}

      <div style={{
        flex: 1, overflowY: 'auto', width: '100%', maxWidth: 560, margin: '0 auto',
        padding: '18px 20px 150px', boxSizing: 'border-box'
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            marginBottom: 14, display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            alignItems: 'flex-end', gap: 9
          }}>
            {msg.role === 'assistant' && (
              <div style={{
                width: 32, height: 32, borderRadius: 11, flexShrink: 0,
                display: 'grid', placeItems: 'center',
                background: 'rgba(200,255,0,.07)', border: '1px solid rgba(200,255,0,.17)',
                color: ACCENT, fontSize: 9.5, fontWeight: 950
              }}>NX</div>
            )}

            <div style={{
              maxWidth: '82%',
              background: msg.role === 'user' ? ACCENT : '#111',
              color: msg.role === 'user' ? '#050505' : '#e8e8e8',
              border: msg.role === 'user' ? 'none' : '1px solid #242424',
              borderRadius: msg.role === 'user' ? '18px 18px 5px 18px' : '18px 18px 18px 5px',
              padding: '12px 14px', fontSize: 13.5, lineHeight: 1.58,
              whiteSpace: 'pre-wrap'
            }}>{msg.content}</div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 9, marginBottom: 14 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 11, display: 'grid', placeItems: 'center',
              background: 'rgba(200,255,0,.07)', border: '1px solid rgba(200,255,0,.17)',
              color: ACCENT, fontSize: 9.5, fontWeight: 950
            }}>NX</div>
            <div style={{ background: '#111', border: '1px solid #242424', borderRadius: '18px 18px 18px 5px', padding: '14px 17px' }}>
              <div style={{ display: 'flex', gap: 5 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 5, height: 5, borderRadius: '50%', background: ACCENT,
                    animation: `noxBounce 1s ${i * .16}s infinite`
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{
        position: 'fixed', zIndex: 100, left: 0, right: 0, bottom: 70,
        background: 'linear-gradient(180deg,rgba(7,7,7,0),#0b0b0b 28%)',
        padding: '22px 16px 11px'
      }}>
        <div style={{ width: '100%', maxWidth: 528, margin: '0 auto' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: 8,
            padding: 6, background: '#111', border: '1px solid #292929', borderRadius: 18
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Demande quelque chose à NOX…"
              rows={1}
              style={{
                flex: 1, minHeight: 42, maxHeight: 110, boxSizing: 'border-box',
                padding: '11px 10px', background: 'transparent', border: 0,
                color: '#fff', fontSize: 13.5, resize: 'none', outline: 'none',
                fontFamily: 'inherit', overflowY: 'auto'
              }}
            />
            <button onClick={() => send()} disabled={!input.trim() || loading} aria-label="Envoyer" style={{
              width: 42, height: 42, borderRadius: 13, flexShrink: 0,
              background: input.trim() && !loading ? ACCENT : '#1b1b1b',
              color: input.trim() && !loading ? '#050505' : '#555',
              border: 0, cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              fontSize: 19, fontWeight: 900
            }}>↑</button>
          </div>
          <div style={{ fontSize: 8.5, color: '#4f4f4f', textAlign: 'center', marginTop: 6 }}>
            NOX Coach peut se tromper. Pour une douleur ou un problème médical, consulte un professionnel.
          </div>
        </div>
      </div>

      <style>{`
        @keyframes noxBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: .35; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
      <BottomNav active="coach" />
    </div>
  );
}
