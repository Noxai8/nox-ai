import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';
import { ArrowUp, ChevronRight } from 'lucide-react';

const ACCENT = '#C8FF00';
const BG     = '#F7F8F4';
const WHITE  = '#FFFFFF';
const BLACK  = '#0B0B0B';
const MUTED  = '#7A7F76';
const BORDER = '#E8EAE4';
const LIME   = '#F0FFD0';
const FN     = 'https://zpxrsmnpcyzafawlweyl.supabase.co/functions/v1';

// Suggestions contextuelles selon la DA
const SUGGESTIONS = [
  { label: 'Que manger maintenant ?',     icon: '→' },
  { label: 'Adapte ma journee',           icon: '→' },
  { label: 'Adapte ma seance',            icon: '→' },
  { label: 'Je mange dehors ce soir',     icon: '→' },
  { label: 'Remplace cet exercice',       icon: '→' },
  { label: 'Pourquoi mon poids stagne ?', icon: '→' },
  { label: "J'ai 30 minutes",             icon: '→' },
  { label: 'Je suis fatigue',             icon: '→' },
];

// Actions rapides que NOX peut déclencher
type NoxAction = {
  type: 'navigate';
  label: string;
  path: string;
} | null;

function parseAction(text: string, navigate: (p: string) => void): NoxAction {
  const lower = text.toLowerCase();
  if (lower.includes('ajouter') && (lower.includes('repas') || lower.includes('aliment')))
    return { type: 'navigate', label: 'AJOUTER UN REPAS', path: '/fuel' };
  if (lower.includes('commencer') || lower.includes('seance') || lower.includes('séance'))
    return { type: 'navigate', label: 'COMMENCER LA SEANCE', path: '/program' };
  if (lower.includes('programme') || lower.includes('exercice'))
    return { type: 'navigate', label: 'VOIR LE PROGRAMME', path: '/program' };
  if (lower.includes('recette') || lower.includes('manger'))
    return { type: 'navigate', label: 'VOIR LES IDEES', path: '/fuel' };
  if (lower.includes('progression') || lower.includes('progres'))
    return { type: 'navigate', label: 'VOIR MES PROGRES', path: '/progress' };
  return null;
}

export default function Coach() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<{ role: 'user'|'assistant'; content: string; action?: NoxAction }[]>([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [context,  setContext]  = useState<any>(null);
  const [showNow,  setShowNow]  = useState(false);
  const [nowLoading, setNowLoading] = useState(false);

  useEffect(() => { if (user) loadContext(); }, [user]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadContext = async () => {
    if (!user) return;
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
    const weekStart = new Date(Date.now() - 7 * 86400000).toISOString();

    const [
      { data: prof },
      { data: prog },
      { data: tgts },
      { data: food },
      { data: workouts },
      { data: prs },
      { data: body },
      { data: recovery },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('workout_programs').select('*').eq('user_id', user.id).eq('is_active', true).maybeSingle(),
      supabase.from('nutrition_targets').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('food_entries').select('calories, protein, food_name').eq('user_id', user.id).gte('created_at', start).lte('created_at', end),
      supabase.from('workouts').select('*').eq('user_id', user.id).eq('status', 'completed').gte('created_at', weekStart).order('created_at', { ascending: false }),
      supabase.from('personal_records').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('body_logs').select('weight, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
      supabase.from('recovery_checkins')
        .select('sleep_hours, sleep_quality, fatigue, soreness, stress, hrv, resting_hr, created_at')
        .eq('user_id', user.id)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const todayKcal   = (food || []).reduce((s: number, e: any) => s + (e.calories || 0), 0);
    const todayProt   = (food || []).reduce((s: number, e: any) => s + (e.protein  || 0), 0);
    const sessions    = prog?.program_json?.sessions || [];
    const dayNames    = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
    const todaySession = sessions.find((s: any) =>
      String(s?.day || '').toLowerCase().includes(dayNames[new Date().getDay()].toLowerCase().slice(0,3))
    );

    // Habitudes : même stockage local que Habits.tsx.
    const todayKey = new Date().toISOString().slice(0, 10);
    let habitDone: string[] = [];
    let customHabits: any[] = [];
    try {
      habitDone = JSON.parse(localStorage.getItem(`nox-habits-${user.id}-${todayKey}`) || '[]');
      customHabits = JSON.parse(localStorage.getItem(`nox-custom-habits-${user.id}`) || '[]');
    } catch {
      habitDone = [];
      customHabits = [];
    }

    setContext({
      profile:       prof,
      todayKcal:     Math.round(todayKcal),
      todayProt:     Math.round(todayProt),
      caloriesTarget: tgts?.calories || 2200,
      proteinTarget:  tgts?.protein  || 160,
      todayFoods:    (food || []).map((f: any) => f.food_name).slice(0,5),
      todaySession:  todaySession?.name || null,
      weekWorkouts:  (workouts || []).length,
      recentPRs:     (prs || []).slice(0, 3),
      lastWeight:    (body || [])[0]?.weight,
      recovery:      recovery || null,
      habits: {
        completedIds: habitDone,
        customHabits,
      },
      hour:          new Date().getHours(),
    });
  };

  const buildSystemPrompt = () => {
    if (!context) return '';
    const { profile, todayKcal, todayProt, caloriesTarget, proteinTarget, todayFoods, todaySession, weekWorkouts, lastWeight, recovery, habits, hour } = context;
    return `Tu es NOX, assistant personnel de transformation. Tu parles directement, avec précision, sans fioritures. Tu connais tout du profil de l'utilisateur.

PROFIL :
- Objectif : ${profile?.goal_type || 'transformation'}
- Niveau : ${profile?.experience_level || 'intermédiaire'}
- Poids actuel : ${lastWeight ? lastWeight + 'kg' : 'non renseigné'}
- Streak : ${profile?.streak_days || 0} jours

AUJOURD'HUI (${hour}h) :
- Calories : ${todayKcal} / ${caloriesTarget} kcal
- Protéines : ${todayProt} / ${proteinTarget}g
- Repas : ${todayFoods.length ? todayFoods.join(', ') : 'aucun encore'}
- Séance du jour : ${todaySession || 'pas de séance prévue'}
- Séances cette semaine : ${weekWorkouts}

RECUPERATION AUJOURD'HUI :
- Sommeil : ${recovery?.sleep_hours != null ? recovery.sleep_hours + 'h' : 'non renseigné'}
- Qualité du sommeil : ${recovery?.sleep_quality ?? 'non renseignée'}
- Fatigue : ${recovery?.fatigue ?? 'non renseignée'}
- Courbatures : ${recovery?.soreness ?? 'non renseignées'}
- Stress : ${recovery?.stress ?? 'non renseigné'}
- HRV : ${recovery?.hrv ?? 'non renseignée'}
- Fréquence cardiaque au repos : ${recovery?.resting_hr ?? 'non renseignée'}

HABITUDES AUJOURD'HUI :
- Habitudes validées : ${habits?.completedIds?.length ? habits.completedIds.join(', ') : 'aucune validée'}
- Habitudes personnalisées configurées : ${habits?.customHabits?.length ? habits.customHabits.map((h: any) => h.label || h.name || h.title || h.id).filter(Boolean).join(', ') : 'aucune'}

REGLES :
- Réponds toujours en français
- Maximum 3-4 phrases par réponse sauf si l'utilisateur demande des détails
- Pas de markdown, pas de listes à puce
- Quand tu peux proposer une action concrète, termine par une ligne qui commence par ACTION: suivie de l'action
- Ne culpabilise jamais. Adapte, propose, explique.
- Tiens compte de la récupération et des habitudes quand elles sont renseignées. Si fatigue, sommeil, stress ou courbatures justifient une adaptation, privilégie une recommandation prudente plutôt qu'une séance plus intense.
- N'invente jamais une donnée de récupération ou une habitude absente.
- Tu ne garantis aucun résultat physique précis`;
  };

  const send = async (msg?: string) => {
    const text = (msg || input).trim();
    if (!text || loading) return;
    setInput('');
    const userMsg = { role: 'user' as const, content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
      const resp = await fetch(`${FN}/nox-coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ message: text, history, systemPrompt: buildSystemPrompt() }),
      });
      const data = await resp.json();
      const reply = data?.content || data?.message || data?.data?.content || '';

      // Extraire ACTION si présente
      let displayText = reply;
      let action: NoxAction = null;
      const actionMatch = reply.match(/ACTION:\s*(.+)/i);
      if (actionMatch) {
        displayText = reply.replace(/ACTION:\s*.+/i, '').trim();
        action = parseAction(actionMatch[1], navigate);
      }

      setMessages(prev => [...prev, { role: 'assistant', content: displayText, action }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "NOX n'a pas pu repondre. Verifie ta connexion.", action: null }]);
    }
    setLoading(false);
  };

  // ET MAINTENANT — recommandation unique
  const fetchNow = async () => {
    setNowLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!context) return;
      const { todayKcal, caloriesTarget, todayProt, proteinTarget, todaySession, hour } = context;
      const kcalLeft = Math.max(0, caloriesTarget - todayKcal);
      const protLeft = Math.max(0, proteinTarget - todayProt);
      const prompt = `${buildSystemPrompt()}\n\nL'utilisateur demande ET MAINTENANT ? Il est ${hour}h. Donne UNE SEULE recommandation concrète et immédiatement actionnable. 2-3 phrases maximum. Termine par ACTION: suivi de l'action recommandée.`;
      const resp = await fetch(`${FN}/nox-coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ message: 'ET MAINTENANT ?', history: [], systemPrompt: prompt }),
      });
      const data = await resp.json();
      const reply = data?.content || data?.message || data?.data?.content || '';

      let displayText = reply;
      let action: NoxAction = null;
      const actionMatch = reply.match(/ACTION:\s*(.+)/i);
      if (actionMatch) {
        displayText = reply.replace(/ACTION:\s*.+/i, '').trim();
        action = parseAction(actionMatch[1], navigate);
      }
      setMessages(prev => [...prev,
        { role: 'user',      content: 'ET MAINTENANT ?', action: null },
        { role: 'assistant', content: displayText, action },
      ]);
      setShowNow(false);
    } catch {}
    setNowLoading(false);
  };

  const firstName = context?.profile?.first_name || context?.profile?.display_name?.split(' ')[0] || '';

  return (
    <div style={{ minHeight: '100vh', background: BG, color: BLACK, display: 'flex', flexDirection: 'column' }}>
      <div style={{ width: '100%', maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* HEADER */}
        <header style={{ padding: '22px 20px 0', flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.12em', marginBottom: 6 }}>NOX</div>
          <h1 style={{ margin: '0 0 6px', fontSize: 36, lineHeight: .95, fontWeight: 950, letterSpacing: '-.05em' }}>
            NOX.
          </h1>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: MUTED, lineHeight: 1.5 }}>
            Qu'est-ce que je peux faire pour toi ?
          </p>

          {/* ET MAINTENANT — card prioritaire */}
          {messages.length === 0 && (
            <div style={{ background: BLACK, borderRadius: 24, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.12em', marginBottom: 8 }}>
                {new Date().getHours()}H{String(new Date().getMinutes()).padStart(2,'0')}
              </div>
              <div style={{ fontSize: 22, fontWeight: 950, color: WHITE, lineHeight: 1.05, letterSpacing: '-.03em', marginBottom: 12 }}>
                ET MAINTENANT ?
              </div>
              <button onClick={fetchNow} disabled={nowLoading} style={{
                width: '100%', padding: '14px 0', background: ACCENT, border: 0,
                borderRadius: 14, color: BLACK, fontWeight: 900, fontSize: 13,
                cursor: 'pointer', touchAction: 'manipulation',
              }}>
                {nowLoading ? 'NOX reflechit...' : 'DEMANDER A NOX'}
              </button>
            </div>
          )}

          {/* Suggestions contextuelles */}
          {messages.length === 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.1em', marginBottom: 12 }}>SUGGESTIONS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {SUGGESTIONS.slice(0, 5).map(s => (
                  <button key={s.label} onClick={() => send(s.label)} style={{
                    width: '100%', padding: '14px 18px', background: WHITE,
                    border: `1px solid ${BORDER}`, borderRadius: 16,
                    color: BLACK, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span>{s.label}</span>
                    <ChevronRight size={16} color={MUTED} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </header>

        {/* MESSAGES */}
        <div style={{ flex: 1, padding: '0 20px', overflowY: 'auto', paddingBottom: 160 }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 12,
            }}>
              {m.role === 'assistant' && (
                <div style={{
                  width: 28, height: 28, borderRadius: 10, background: ACCENT, color: BLACK,
                  display: 'grid', placeItems: 'center', fontWeight: 950, fontSize: 11,
                  flexShrink: 0, marginRight: 8, marginTop: 2,
                }}>N</div>
              )}
              <div style={{ maxWidth: '80%' }}>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: m.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                  background: m.role === 'user' ? BLACK : WHITE,
                  border: m.role === 'assistant' ? `1px solid ${BORDER}` : 'none',
                  color: m.role === 'user' ? WHITE : BLACK,
                  fontSize: 14, lineHeight: 1.6,
                }}>
                  {m.content}
                </div>
                {/* Action bouton si présente */}
                {m.action && m.role === 'assistant' && (
                  <button onClick={() => navigate((m.action as any).path)} style={{
                    marginTop: 8, padding: '10px 16px', background: ACCENT,
                    border: 0, borderRadius: 14, color: BLACK,
                    fontSize: 12, fontWeight: 900, cursor: 'pointer',
                    display: 'block',
                  }}>
                    {(m.action as any).label}
                  </button>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 10, background: ACCENT, color: BLACK, display: 'grid', placeItems: 'center', fontWeight: 950, fontSize: 11 }}>N</div>
              <div style={{ padding: '12px 16px', background: WHITE, border: `1px solid ${BORDER}`, borderRadius: '20px 20px 20px 4px', fontSize: 20, letterSpacing: 4 }}>
                <span style={{ animation: 'pulse 1s infinite' }}>...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* INPUT */}
        <div style={{
          position: 'fixed', bottom: 70, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 560, padding: '12px 16px',
          background: 'rgba(247,248,244,.97)', backdropFilter: 'blur(16px)',
          borderTop: `1px solid ${BORDER}`, boxSizing: 'border-box', zIndex: 100,
        }}>
          {/* Suggestion rapide ET MAINTENANT si conversation en cours */}
          {messages.length > 0 && (
            <button onClick={fetchNow} disabled={nowLoading} style={{
              marginBottom: 10, padding: '8px 14px', background: LIME,
              border: '1px solid #DDF59C', borderRadius: 20,
              color: '#687600', fontSize: 11, fontWeight: 800, cursor: 'pointer',
            }}>
              {nowLoading ? '...' : 'ET MAINTENANT ?'}
            </button>
          )}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Pose ta question a NOX..."
              rows={1}
              style={{
                flex: 1, padding: '14px 16px', background: WHITE,
                border: `1px solid ${BORDER}`, borderRadius: 18,
                color: BLACK, fontSize: 14, resize: 'none', outline: 'none',
                fontFamily: 'inherit', lineHeight: 1.4,
              }}
            />
            <button onClick={() => send()} disabled={!input.trim() || loading} style={{
              width: 46, height: 46, borderRadius: 14, border: 0, flexShrink: 0,
              background: input.trim() ? BLACK : BORDER,
              color: input.trim() ? ACCENT : MUTED,
              display: 'grid', placeItems: 'center', cursor: input.trim() ? 'pointer' : 'not-allowed',
            }}>
              <ArrowUp size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      <BottomNav active="moi" />
    </div>
  );
}
