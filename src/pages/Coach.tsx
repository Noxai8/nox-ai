import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#B7FF00';
const BG = '#FFFFFF';
const SURFACE = '#F4F4F1';
const BORDER = '#E5E5E0';

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
    const [{ data: profile }, { data: program }, { data: recentWorkouts }, { data: prs }, { data: bodyLogs }, { data: fuelToday }, { data: history }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle(),
      supabase.from('workout_programs').select('*').eq('user_id', user!.id).eq('is_active', true).maybeSingle(),
      supabase.from('workouts').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('personal_records').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('body_logs').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('food_entries').select('*').eq('user_id', user!.id).gte('created_at', new Date().toISOString().split('T')[0] + 'T00:00:00'),
      supabase.from('coach_messages').select('role, content, created_at').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(20),
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

    // Charger l'historique des conversations précédentes
    if (history && history.length > 0) {
      const sorted = [...history].reverse();
      setMessages([
        { role: 'assistant', content: `Yo ${profile?.display_name?.split(' ')[0] || ''} 👊 Content de te revoir. On reprend où on s'est arrêtés.` },
        ...sorted.map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ]);
    } else {
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
      // Résumé des 5 derniers échanges pour la mémoire
      const recentExchanges = newMessages.slice(-10)
        .map(m => `${m.role === 'user' ? 'Lui' : 'NOX'}: ${m.content.slice(0, 150)}`)
        .join('\n');

      // Détection d'anomalies dans les données
      const anomalies: string[] = [];
      if (context?.latest_weight && context?.profile?.weight) {
        const weightDelta = context.latest_weight - context.profile.weight;
        if (Math.abs(weightDelta) > 2 && context.today_fuel?.kcal > 0) {
          anomalies.push(`Poids ${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)}kg vs apports déclarés ${context.today_fuel.kcal}kcal — données à vérifier`);
        }
      }
      if (context?.profile?.streak > 14 && context?.today_fuel?.kcal === 0) {
        anomalies.push('14+ jours de streak mais aucune nutrition trackée — cohérence à questionner');
      }

      const systemPrompt = `Tu es NOX, le coach de ${context?.profile?.name?.split(' ')[0] || 'l\'utilisateur'}.

DONNÉES ACTUELLES :
${JSON.stringify(context, null, 2)}

HISTORIQUE RÉCENT :
${recentExchanges}

${anomalies.length > 0 ? `ANOMALIES DÉTECTÉES (pose une question plutôt que de deviner) :
${anomalies.join('\n')}` : ''}

STYLE :
- Parle comme un pote qui maîtrise le sport — pas un robot, pas un prof
- Tu te souviens des échanges précédents — référence-les naturellement si pertinent
- Naturel, direct, sans bullshit. Pas de "Excellente question !" jamais
- Tutoie, sois concis (3-5 phrases), utilise les vraies données
- Si anomalie détectée → pose une question directe plutôt que de deviner
- Si blessure grave → conseille un pro
- Pas de diagnostic médical`;

      const _cr = await fetch('https://zpxrsmnpcyzafawlweyl.supabase.co/functions/v1/nox-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpweHJzbW5wY3l6YWZhd2x3ZXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNTI1MDAsImV4cCI6MjEwNDkyODUwMH0.h76-uAn6f4qwtxIOTUt3sSzMdOSg7BzMIRFkXZW6iq4', 'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpweHJzbW5wY3l6YWZhd2x3ZXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNTI1MDAsImV4cCI6MjEwNDkyODUwMH0.h76-uAn6f4qwtxIOTUt3sSzMdOSg7BzMIRFkXZW6iq4' },
        body: JSON.stringify({ system: systemPrompt, messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      });
      if (!_cr.ok) throw new Error('Erreur coach');
      const data = await _cr.json();
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
    <div style={{ minHeight: '100vh', background: '#F5F5F2', color: '#111', paddingBottom: 84 }}>
      <main style={{
        minHeight: '100vh',
        maxWidth: 560,
        margin: '0 auto',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}>
        <header style={{
          flexShrink: 0,
          padding: '18px 18px 14px',
          background: 'radial-gradient(circle at 92% 18%, rgba(183,255,0,.16), transparent 31%), #fff',
          borderBottom: '1px solid #ECECE7',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto', alignItems: 'center' }}>
            <button
              onClick={() => window.history.back()}
              aria-label="Retour"
              style={{
                width: 36, height: 36, border: 0, background: 'transparent',
                fontSize: 27, color: '#111', cursor: 'pointer', padding: 0,
              }}
            >
              ‹
            </button>

            <div style={{ justifySelf: 'center' }}>
              <NoxBrand />
            </div>

            <div style={{
              padding: '7px 9px',
              borderRadius: 999,
              background: '#F4FFD5',
              border: '1px solid rgba(183,255,0,.75)',
              color: '#111',
              fontSize: 8.5,
              fontWeight: 950,
              whiteSpace: 'nowrap',
            }}>
              Contexte actif
            </div>
          </div>

          <div style={{ marginTop: 22 }}>
            <div style={{
              fontSize: 9.5, color: '#77776F', textTransform: 'uppercase',
              letterSpacing: '.13em', fontWeight: 900,
            }}>
              Intelligence NOX
            </div>
            <h1 style={{
              margin: '4px 0 0', fontSize: 31, lineHeight: .95,
              fontWeight: 1000, letterSpacing: '-.055em',
            }}>
              COACH IA
            </h1>
            <div style={{ marginTop: 7, color: '#77776F', fontSize: 11.5 }}>
              Ton assistant personnel 24/7
            </div>
          </div>

          {context?.profile && (
            <div style={{
              display: 'flex', gap: 7, overflowX: 'auto',
              marginTop: 14, paddingBottom: 2, scrollbarWidth: 'none',
            }}>
              {context.profile.streak > 0 && <ContextPill strong={`${context.profile.streak}j`} text="streak" />}
              {context.profile.weight && <ContextPill strong={`${context.profile.weight} kg`} text="body" />}
              {context.today_fuel?.kcal > 0 && <ContextPill strong={`${context.today_fuel.kcal}`} text="kcal" />}
              {context.recent_workouts > 0 && <ContextPill strong={`${context.recent_workouts}`} text="séances" />}
            </div>
          )}
        </header>

        {messages.length <= 1 && (
          <section style={{ padding: '14px 18px 0', flexShrink: 0 }}>
            <div style={{
              borderRadius: 14,
              padding: '13px 14px',
              background: '#F7FFE2',
              border: '1px solid #E2F5A8',
              display: 'grid',
              gridTemplateColumns: '30px 1fr',
              gap: 10,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 9,
                background: ACCENT, display: 'grid', placeItems: 'center',
                fontSize: 14, fontWeight: 1000,
              }}>ϟ</div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 950 }}>
                  Je suis là pour t'aider !
                </div>
                <div style={{ marginTop: 3, fontSize: 10.5, color: '#66665F', lineHeight: 1.45 }}>
                  Pose-moi toutes tes questions sur ton entraînement, ta nutrition ou ta récupération.
                </div>
              </div>
            </div>

            <div style={{
              fontSize: 9, color: '#999991', fontWeight: 900,
              letterSpacing: '.09em', margin: '15px 1px 8px',
            }}>
              QUESTIONS RAPIDES
            </div>

            <div style={{ display: 'grid', gap: 7 }}>
              {QUICK_PROMPTS.slice(0, 4).map(p => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  style={{
                    width: '100%', textAlign: 'left', cursor: 'pointer',
                    background: '#fff', border: '1px solid #E5E5E0',
                    borderRadius: 12, padding: '11px 12px',
                    color: '#44443F', fontSize: 10.5, fontWeight: 650,
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </section>
        )}

        <div style={{
          flex: 1, overflowY: 'auto',
          padding: messages.length <= 1 ? '16px 18px 154px' : '20px 18px 154px',
          boxSizing: 'border-box',
        }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              marginBottom: 12,
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              alignItems: 'flex-end',
              gap: 8,
            }}>
              {msg.role === 'assistant' && (
                <div style={{
                  width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                  display: 'grid', placeItems: 'center',
                  background: ACCENT, color: '#111',
                  fontSize: 9, fontWeight: 1000,
                }}>
                  NX
                </div>
              )}

              <div style={{
                maxWidth: '82%',
                background: msg.role === 'user' ? '#111' : '#F4F4F1',
                color: msg.role === 'user' ? '#fff' : '#33332F',
                border: msg.role === 'user' ? 'none' : '1px solid #E8E8E3',
                borderRadius: msg.role === 'user'
                  ? '17px 17px 5px 17px'
                  : '17px 17px 17px 5px',
                padding: '11px 13px',
                fontSize: 12.5,
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 12 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 9,
                display: 'grid', placeItems: 'center',
                background: ACCENT, color: '#111',
                fontSize: 9, fontWeight: 1000,
              }}>
                NX
              </div>
              <div style={{
                background: '#F4F4F1', border: '1px solid #E8E8E3',
                borderRadius: '17px 17px 17px 5px', padding: '13px 16px',
              }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: '#77776F',
                      animation: `noxBounce 1s ${i * .16}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      <div style={{
        position: 'fixed', zIndex: 100,
        left: 0, right: 0, bottom: 68,
        padding: '25px 14px 10px',
        background: 'linear-gradient(180deg,rgba(255,255,255,0),#fff 28%)',
      }}>
        <div style={{ width: '100%', maxWidth: 528, margin: '0 auto' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: 7,
            padding: 5, background: '#fff',
            border: '1px solid #DCDCD7',
            borderRadius: 16,
            boxShadow: '0 8px 28px rgba(0,0,0,.07)',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Écris ta question à NOX..."
              rows={1}
              style={{
                flex: 1, minHeight: 42, maxHeight: 110,
                boxSizing: 'border-box', padding: '11px 10px',
                background: 'transparent', border: 0,
                color: '#111', fontSize: 12.5, resize: 'none',
                outline: 'none', fontFamily: 'inherit', overflowY: 'auto',
              }}
            />

            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              aria-label="Envoyer"
              style={{
                width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                background: input.trim() && !loading ? ACCENT : '#EFEFEC',
                color: input.trim() && !loading ? '#111' : '#B2B2AB',
                border: 0,
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                fontSize: 20, fontWeight: 1000,
              }}
            >
              ↑
            </button>
          </div>

          <div style={{
            fontSize: 8, color: '#AAA9A2',
            textAlign: 'center', marginTop: 5,
          }}>
            NOX peut se tromper. Pour un problème médical, consulte un professionnel.
          </div>
        </div>
      </div>

      <style>{`
        @keyframes noxBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: .35; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
        textarea::placeholder { color: #AAA9A2; }
      `}</style>

      <BottomNav active="coach" />
    </div>
  );
}

function NoxBrand() {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <div style={{ position: 'relative', width: 26, height: 20, flexShrink: 0 }}>
        <span style={{
          position: 'absolute', width: 11, height: 7,
          left: 1, top: 2, borderRadius: 999,
          background: ACCENT, transform: 'rotate(28deg)',
        }} />
        <span style={{
          position: 'absolute', width: 20, height: 8,
          left: 6, top: 10, borderRadius: 999,
          background: ACCENT, transform: 'rotate(7deg)',
        }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 16, fontWeight: 1000, letterSpacing: '-.045em' }}>NOX</span>
        <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '.1em', color: '#66665F' }}>AI</span>
      </div>
    </div>
  );
}

function ContextPill({ strong, text }: { strong: string; text: string }) {
  return (
    <div style={{
      flexShrink: 0,
      background: '#FAFAF8',
      border: '1px solid #E5E5E0',
      borderRadius: 9,
      padding: '6px 8px',
      fontSize: 9.5,
      color: '#77776F',
    }}>
      <b style={{ color: '#111' }}>{strong}</b> {text}
    </div>
  );
}
