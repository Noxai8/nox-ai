import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from '../components/BottomNav';

const ACCENT = '#B7FF00';
const BG = '#FFFFFF';
const SURFACE = '#F5F5F2';
const BORDER = '#E8E8E3';

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
  const [contextLoading, setContextLoading] = useState(false);
  const [error, setError] = useState('');
  const [context, setContext] = useState<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (user) loadContext(); }, [user]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadContext = async () => {
    if (!user) return;
    setContextLoading(true);
    setError('');

    try {
      const today = new Date();
      const startToday = new Date(today);
      startToday.setHours(0, 0, 0, 0);

      const [
        profileResult,
        programResult,
        workoutsResult,
        prsResult,
        bodyResult,
        fuelResult,
        historyResult,
        targetResult,
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('workout_programs').select('*').eq('user_id', user.id).eq('is_active', true).maybeSingle(),
        supabase.from('workouts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('personal_records').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('body_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('food_entries').select('calories, protein, carbs, fat, created_at').eq('user_id', user.id).gte('created_at', startToday.toISOString()),
        supabase.from('coach_messages').select('role, content, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('nutrition_targets').select('calories, protein, carbs, fat').eq('user_id', user.id).maybeSingle(),
      ]);

      const results = [
        profileResult,
        programResult,
        workoutsResult,
        prsResult,
        bodyResult,
        fuelResult,
        historyResult,
        targetResult,
      ];
      const failed = results.find(result => result.error);
      if (failed?.error) throw failed.error;

      const profile = profileResult.data;
      const program = programResult.data;
      const recentWorkouts = workoutsResult.data || [];
      const prs = prsResult.data || [];
      const bodyLogs = bodyResult.data || [];
      const fuelToday = fuelResult.data || [];
      const history = historyResult.data || [];
      const target = targetResult.data;

      const totalKcal = fuelToday.reduce((sum: number, f: any) => sum + (Number(f.calories) || 0), 0);
      const totalProtein = fuelToday.reduce((sum: number, f: any) => sum + (Number(f.protein) || 0), 0);
      const totalCarbs = fuelToday.reduce((sum: number, f: any) => sum + (Number(f.carbs) || 0), 0);
      const totalFat = fuelToday.reduce((sum: number, f: any) => sum + (Number(f.fat) || 0), 0);

      const completedWorkouts = recentWorkouts.filter((w: any) =>
        w.status === 'completed' || w.completed === true || Boolean(w.completed_at)
      );

      setContext({
        profile: {
          name: profile?.display_name,
          goal: profile?.goal_type || profile?.goal || profile?.objective,
          weight: bodyLogs?.[0]?.weight || profile?.starting_weight_kg || profile?.weight,
          starting_weight: profile?.starting_weight_kg || profile?.weight || null,
          level: profile?.experience_level,
          activity: profile?.activity_level,
          xp: profile?.xp,
          streak: profile?.streak_days,
        },
        nutrition_targets: target ? {
          calories: Number(target.calories) || null,
          protein: Number(target.protein) || null,
          carbs: Number(target.carbs) || null,
          fat: Number(target.fat) || null,
          source: 'nutrition_targets',
        } : null,
        program: program ? {
          name: program.name,
          goal: program.goal,
          days_per_week: program.days_per_week,
        } : null,
        recent_workouts: {
          loaded: recentWorkouts.length,
          completed: completedWorkouts.length,
          last_status: recentWorkouts?.[0]?.status || null,
          last_date: recentWorkouts?.[0]?.created_at || null,
        },
        top_prs: prs.slice(0, 5).map((p: any) => `${p.exercise_name}: ${p.weight}kg × ${p.reps}`),
        today_fuel: {
          kcal: Math.round(totalKcal),
          protein: Math.round(totalProtein),
          carbs: Math.round(totalCarbs),
          fat: Math.round(totalFat),
          entries: fuelToday.length,
          note: 'Apports enregistrés aujourd’hui uniquement. Une journée incomplètement trackée ne doit pas être interprétée comme une consommation réelle faible.',
        },
        latest_weight: bodyLogs?.[0]?.weight || null,
      });

      if (history.length > 0) {
        const sorted = [...history].reverse();
        setMessages([
          {
            role: 'assistant',
            content: `Yo ${profile?.display_name?.split(' ')[0] || ''} 👊 Content de te revoir. On reprend où on s'est arrêtés.`,
          },
          ...sorted.map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        ]);
      } else {
        setMessages([{
          role: 'assistant',
          content: `Yo ${profile?.display_name?.split(' ')[0] || ''} 👊 Qu'est-ce qui se passe ?`,
        }]);
      }
    } catch (err: any) {
      console.error('COACH_CONTEXT_ERROR', err);
      setError(err?.message || 'Impossible de charger le contexte NOX.');
      setMessages(prev => prev.length ? prev : [{
        role: 'assistant',
        content: "Je peux te répondre, mais je n'ai pas réussi à charger toutes tes données personnelles pour le moment.",
      }]);
    } finally {
      setContextLoading(false);
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

      // Détection de données incomplètes : on questionne au lieu d'inventer.
      const anomalies: string[] = [];
      if (!context?.nutrition_targets?.calories) {
        anomalies.push("Cible calorique NOX indisponible — ne calcule pas une cible concurrente. Invite l'utilisateur à ouvrir Fuel pour initialiser/synchroniser nutrition_targets si nécessaire.");
      }
      if (context?.today_fuel?.entries === 0) {
        anomalies.push("Aucun aliment enregistré aujourd'hui — cela signifie seulement que le journal est vide, pas que l'utilisateur n'a pas mangé.");
      }
      if (!context?.latest_weight) {
        anomalies.push("Poids récent indisponible — ne déduis pas une évolution de poids.");
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
- Pour les calories et macros, nutrition_targets est la seule cible officielle NOX. Ne recalcule jamais une cible concurrente à partir du poids, du sexe ou de l'activité.
- Si nutrition_targets est absent, dis que la cible n'est pas disponible au lieu d'inventer un chiffre.
- today_fuel contient uniquement ce qui a été enregistré aujourd'hui : ne confonds jamais absence de tracking et faible consommation réelle.
- Pour une progression de charge, appuie-toi sur les données d'entraînement disponibles. Si elles ne suffisent pas, demande des précisions au lieu d'inventer une charge.
- Une mauvaise séance isolée ne signifie pas stagnation. Vérifie récupération, sommeil, douleur, technique et régularité avant de proposer plus de volume.
- Ne promets pas un rythme de perte de poids, de prise de muscle ou une date de résultat comme garanti.
- Si douleur importante, persistante, traumatique ou symptômes inquiétants → conseille une évaluation par un professionnel de santé.
- Pas de diagnostic médical`;

      const _cr = await fetch('https://zpxrsmnpcyzafawlweyl.supabase.co/functions/v1/nox-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpweHJzbW5wY3l6YWZhd2x3ZXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNTI1MDAsImV4cCI6MjEwNDkyODUwMH0.h76-uAn6f4qwtxIOTUt3sSzMdOSg7BzMIRFkXZW6iq4', 'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpweHJzbW5wY3l6YWZhd2x3ZXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNTI1MDAsImV4cCI6MjEwNDkyODUwMH0.h76-uAn6f4qwtxIOTUt3sSzMdOSg7BzMIRFkXZW6iq4' },
        body: JSON.stringify({ system: systemPrompt, messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await _cr.json().catch(() => null);
      if (!_cr.ok) {
        throw new Error(
          data?.error?.message ||
          data?.error ||
          data?.message ||
          `Service coach indisponible (${_cr.status}).`
        );
      }
      if (data?.error) {
        throw new Error(typeof data.error === 'string' ? data.error : data.error?.message || 'Erreur du coach NOX.');
      }

      const reply = data?.content?.[0]?.text || data?.text || '';
      if (!reply.trim()) throw new Error("NOX n'a pas renvoyé de réponse exploitable.");

      const finalMessages = [...newMessages, { role: 'assistant' as const, content: reply }];
      setMessages(finalMessages);

      // Sauvegarder conversation
      const { error: saveError } = await supabase.from('coach_messages').insert([
        { user_id: user!.id, role: 'user', content: msg, created_at: new Date().toISOString() },
        { user_id: user!.id, role: 'assistant', content: reply, created_at: new Date().toISOString() },
      ]);
      if (saveError) {
        console.error('COACH_HISTORY_SAVE_ERROR', saveError);
        setError('La réponse a été reçue, mais l’historique n’a pas pu être sauvegardé.');
      }
    } catch (err: any) {
      console.error('COACH_SEND_ERROR', err);
      setError(err?.message || 'Impossible de contacter le coach NOX.');
      setMessages(prev => [...prev, { role: 'assistant', content: 'Je n’ai pas pu répondre correctement. Réessaie dans un instant.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fff', color: '#0B0B0B', paddingBottom: 82 }}>
      <div style={{ width: '100%', maxWidth: 560, minHeight: '100vh', margin: '0 auto', background: '#fff', display: 'flex', flexDirection: 'column' }}>
        <header style={{ flexShrink: 0, padding: '20px 20px 14px', borderBottom: '1px solid #EFEFEB' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <NoxBrand />
            <button
              type="button"
              aria-label="Profil"
              style={{
                width: 34, height: 34, borderRadius: 12, border: '1px solid #E9E9E4',
                background: '#fff', display: 'grid', placeItems: 'center', color: '#111',
                fontSize: 16, cursor: 'pointer'
              }}
            >
              ♙
            </button>
          </div>

          <div style={{ marginTop: 22 }}>
            <div style={{ fontSize: 10, color: '#85857D', letterSpacing: '.13em', fontWeight: 850 }}>INTELLIGENCE NOX</div>
            <h1 style={{ margin: '4px 0 0', fontSize: 31, lineHeight: .95, fontWeight: 1000, letterSpacing: '-.055em' }}>COACH IA</h1>
            <div style={{ marginTop: 7, color: '#76766F', fontSize: 12 }}>Ton coach personnel, 24/7</div>
          </div>

          <div style={{
            marginTop: 15, borderRadius: 16, padding: '13px 14px',
            background: '#F6FFE0', border: '1px solid #E5F6B2',
            display: 'grid', gridTemplateColumns: '34px 1fr', gap: 11, alignItems: 'center'
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, background: ACCENT,
              display: 'grid', placeItems: 'center', fontWeight: 1000, fontSize: 16
            }}>▥</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 950 }}>Contexte actif</div>
              <div style={{ marginTop: 2, fontSize: 9.5, color: '#77776F', lineHeight: 1.4 }}>
                Ton profil, ton programme, tes entraînements et la cible nutritionnelle Fuel sont pris en compte.
              </div>
            </div>
          </div>

          {error && (
            <div style={{
              marginTop: 10, padding: '10px 12px', borderRadius: 11,
              background: '#FFF2F2', border: '1px solid #FFD2D2',
              color: '#A53A3A', fontSize: 10.5, lineHeight: 1.45
            }}>
              {error}
            </div>
          )}

          {contextLoading && !context && (
            <div style={{ marginTop: 10, color: '#8B8B84', fontSize: 10.5 }}>
              Chargement du contexte NOX...
            </div>
          )}

          {context?.profile && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
              <InfoCard icon="✦" label="Objectif" value={formatGoal(context.profile.goal)} />
              <InfoCard icon="▣" label="Programme" value={context.program?.name || 'Non défini'} />
              <InfoCard icon="★" label="Streak" value={`${context.profile.streak || 0} jours`} />
              <InfoCard icon="●" label="Poids" value={context.profile.weight ? `${context.profile.weight} kg` : '—'} />
              <InfoCard icon="◈" label="Cible Fuel" value={context.nutrition_targets?.calories ? `${Math.round(context.nutrition_targets.calories)} kcal` : '—'} />
            </div>
          )}
        </header>

        {messages.length <= 1 && (
          <section style={{ padding: '16px 20px 4px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
              <div style={{ fontSize: 13, fontWeight: 950 }}>Questions rapides</div>
              <span style={{ fontSize: 9.5, color: '#8B8B84' }}>Suggestions NOX</span>
            </div>

            <div style={{ display: 'grid', gap: 7 }}>
              {QUICK_PROMPTS.slice(0, 4).map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  disabled={loading}
                  style={{
                    width: '100%', minHeight: 43, display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', gap: 10, textAlign: 'left',
                    padding: '10px 12px', borderRadius: 12, border: '1px solid #E6E6E1',
                    background: '#fff', color: '#3D3D38', fontSize: 10.5,
                    fontWeight: 650, cursor: loading ? 'default' : 'pointer'
                  }}
                >
                  <span>{p}</span>
                  <span style={{ color: '#111', fontSize: 18, lineHeight: 1 }}>›</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <section style={{
          flex: 1, overflowY: 'auto', padding: messages.length <= 1 ? '13px 20px 155px' : '20px 20px 155px',
          boxSizing: 'border-box'
        }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 13,
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
            }}>
              {msg.role === 'assistant' && <NoxAvatar />}

              <div style={{
                maxWidth: '82%',
                background: msg.role === 'user' ? ACCENT : '#F3F3F0',
                color: '#151512',
                border: msg.role === 'user' ? '1px solid #AEEA00' : '1px solid #E9E9E4',
                borderRadius: msg.role === 'user' ? '16px 16px 5px 16px' : '16px 16px 16px 5px',
                padding: '11px 13px', fontSize: 12.5, lineHeight: 1.55, whiteSpace: 'pre-wrap'
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 13 }}>
              <NoxAvatar />
              <div style={{
                background: '#F3F3F0', border: '1px solid #E9E9E4',
                borderRadius: '16px 16px 16px 5px', padding: '13px 16px'
              }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      width: 5, height: 5, borderRadius: '50%', background: '#8C8C85',
                      animation: `noxBounce 1s ${i * .16}s infinite`
                    }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </section>
      </div>

      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 68, zIndex: 100,
        padding: '24px 15px 10px',
        background: 'linear-gradient(180deg,rgba(255,255,255,0),#fff 27%)'
      }}>
        <div style={{ maxWidth: 530, margin: '0 auto' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: 7, padding: 5,
            background: '#fff', border: '1px solid #DCDCD7', borderRadius: 15,
            boxShadow: '0 8px 24px rgba(0,0,0,.06)'
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
              placeholder="Écris ton message..."
              rows={1}
              style={{
                flex: 1, minHeight: 40, maxHeight: 110, boxSizing: 'border-box',
                padding: '10px 9px', border: 0, outline: 'none', resize: 'none',
                background: 'transparent', color: '#111', fontFamily: 'inherit',
                fontSize: 12.5, overflowY: 'auto'
              }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              aria-label="Envoyer"
              style={{
                width: 40, height: 40, borderRadius: 11, border: 0,
                background: input.trim() && !loading ? ACCENT : '#EFEFEC',
                color: input.trim() && !loading ? '#111' : '#A9A9A2',
                fontSize: 20, fontWeight: 1000,
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed'
              }}
            >↑</button>
          </div>
          <div style={{ marginTop: 5, textAlign: 'center', color: '#A3A39C', fontSize: 8 }}>
            NOX peut se tromper. Pour une douleur ou un problème médical, consulte un professionnel.
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

function formatGoal(goal?: string) {
  if (!goal) return 'Non défini';
  const map: Record<string, string> = {
    muscle_gain: 'Prise de masse',
    gain_muscle: 'Prise de masse',
    hypertrophy: 'Prise de masse',
    weight_loss: 'Perte de poids',
    lose_weight: 'Perte de poids',
    fat_loss: 'Perte de poids',
    strength: 'Force',
    performance: 'Performance',
    maintenance: 'Maintien',
  };
  return map[goal] || goal.replaceAll('_', ' ');
}

function NoxBrand() {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: 29, height: 22 }}>
        <span style={{
          position: 'absolute', width: 12, height: 8, left: 1, top: 2,
          borderRadius: 999, background: ACCENT, transform: 'rotate(28deg)'
        }} />
        <span style={{
          position: 'absolute', width: 22, height: 8, left: 7, top: 11,
          borderRadius: 999, background: ACCENT, transform: 'rotate(7deg)'
        }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 17, fontWeight: 1000, letterSpacing: '-.05em' }}>NOX</span>
        <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '.11em', color: '#676760' }}>AI</span>
      </div>
    </div>
  );
}

function NoxAvatar() {
  return (
    <div style={{
      width: 30, height: 30, flexShrink: 0, borderRadius: 10,
      background: '#101010', display: 'grid', placeItems: 'center'
    }}>
      <div style={{ position: 'relative', width: 17, height: 13 }}>
        <span style={{
          position: 'absolute', width: 7, height: 5, left: 0, top: 1,
          borderRadius: 999, background: ACCENT, transform: 'rotate(28deg)'
        }} />
        <span style={{
          position: 'absolute', width: 13, height: 5, left: 4, top: 7,
          borderRadius: 999, background: ACCENT, transform: 'rotate(7deg)'
        }} />
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{
      minHeight: 52, border: '1px solid #E8E8E3', borderRadius: 12,
      padding: '9px 10px', background: '#fff',
      display: 'grid', gridTemplateColumns: '22px 1fr', gap: 7, alignItems: 'center'
    }}>
      <div style={{ color: '#73A600', fontSize: 14, fontWeight: 950 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: '#92928A', fontSize: 8.5, lineHeight: 1.2 }}>{label}</div>
        <div style={{
          marginTop: 2, fontSize: 10.5, fontWeight: 900, color: '#20201D',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>{value}</div>
      </div>
    </div>
  );
}
