import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

export default function WeeklyReview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { if (user) loadWeekData(); }, [user]);

  const loadWeekData = async () => {
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: profile }, { data: workouts }, { data: prs }, { data: bodyLogs }, { data: fuel }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle(),
      supabase.from('workouts').select('*').eq('user_id', user!.id).eq('status', 'completed').gte('created_at', weekStart),
      supabase.from('personal_records').select('*').eq('user_id', user!.id).gte('created_at', weekStart),
      supabase.from('body_logs').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(2),
      supabase.from('food_entries').select('calories, protein').eq('user_id', user!.id).gte('created_at', weekStart),
    ]);

    const weightDelta = bodyLogs && bodyLogs.length >= 2 ? (bodyLogs[0].weight - bodyLogs[1].weight).toFixed(1) : null;
    const avgKcal = fuel && fuel.length > 0 ? Math.round(fuel.reduce((s: number, f: any) => s + f.calories, 0) / 7) : 0;
    const avgProtein = fuel && fuel.length > 0 ? Math.round(fuel.reduce((s: number, f: any) => s + f.protein, 0) / 7) : 0;

    const weekData = {
      profile,
      workouts_done: workouts?.length || 0,
      workouts_planned: profile?.available_days?.length || 4,
      prs: prs?.length || 0,
      weight_delta: weightDelta,
      avg_kcal: avgKcal,
      avg_protein: avgProtein,
      streak: profile?.streak_days || 0,
    };
    setData(weekData);
    setLoading(false);
    generateAnalysis(weekData);
  };

  const generateAnalysis = async (weekData: any) => {
    setGenerating(true);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 600,
          messages: [{
            role: 'user',
            content: `Tu es NOX Coach. Analyse la semaine de l'utilisateur et donne une décision claire.

Données de la semaine :
- Séances réalisées : ${weekData.workouts_done}/${weekData.workouts_planned}
- Records battus : ${weekData.prs}
- Évolution du poids : ${weekData.weight_delta ? weekData.weight_delta + ' kg' : 'Non renseigné'}
- Calories moyennes/jour : ${weekData.avg_kcal} kcal
- Protéines moyennes/jour : ${weekData.avg_protein}g
- Streak actuel : ${weekData.streak} jours

Réponds en JSON uniquement :
{
  "note": "Chiffre de 1 à 10 pour évaluer la semaine",
  "titre": "Titre court et percutant (ex: SEMAINE SOLIDE)",
  "points_forts": ["Point fort 1", "Point fort 2"],
  "points_ameliorer": ["Point à améliorer 1"],
  "decision": "CONSERVER LA STRATÉGIE ou ADAPTER LA STRATÉGIE",
  "message": "Message motivant personnel court (2-3 phrases max)",
  "conseil_semaine": "Un conseil actionnable concret pour la semaine prochaine"
}`
          }]
        })
      });

      const res = await response.json();
      const text = res.content?.[0]?.text || '{}';
      const clean = text.replace(/```json|```/g, '').trim();
      setAnalysis(clean);
    } catch { setAnalysis(''); }
    setGenerating(false);
  };

  if (loading) return <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: ACCENT, fontWeight: 900 }}>ANALYSE...</div></div>;

  let parsed: any = {};
  try { parsed = JSON.parse(analysis); } catch {}

  const adherence = data ? Math.round((data.workouts_done / Math.max(data.workouts_planned, 1)) * 100) : 0;

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 80 }}>
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid ' + BORDER }}>
        <button onClick={() => navigate('/home')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14, marginBottom: 16 }}>← Retour</button>
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em' }}>Bilan</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>TA SEMAINE NOX</div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        {/* Score */}
        {parsed.note && (
          <div style={{ background: SURFACE, border: '1px solid ' + (parseInt(parsed.note) >= 7 ? ACCENT + '44' : BORDER), borderRadius: 20, padding: 24, marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 64, fontWeight: 900, color: parseInt(parsed.note) >= 7 ? ACCENT : parseInt(parsed.note) >= 5 ? '#ffaa00' : '#ff4444' }}>
              {parsed.note}<span style={{ fontSize: 24, color: '#555' }}>/10</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginTop: 8 }}>{parsed.titre || 'BILAN SEMAINE'}</div>
            {parsed.message && <div style={{ fontSize: 14, color: '#888', marginTop: 12, lineHeight: 1.6 }}>{parsed.message}</div>}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Séances', value: `${data.workouts_done}/${data.workouts_planned}`, icon: '🏋️', good: data.workouts_done >= data.workouts_planned },
            { label: 'Adhérence', value: adherence + '%', icon: '📊', good: adherence >= 75 },
            { label: 'Records', value: data.prs, icon: '🏆', good: data.prs > 0 },
            { label: 'Évolution', value: data.weight_delta ? (parseFloat(data.weight_delta) > 0 ? '+' : '') + data.weight_delta + ' kg' : '—', icon: '⚖️', good: true },
          ].map(({ label, value, icon, good }) => (
            <div key={label} style={{ background: SURFACE, border: '1px solid ' + (good ? ACCENT + '33' : BORDER), borderRadius: 14, padding: '16px 14px' }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>{value}</div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Points forts */}
        {parsed.points_forts?.length > 0 && (
          <div style={{ background: ACCENT + '11', border: '1px solid ' + ACCENT + '33', borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: ACCENT, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>✓ POINTS FORTS</div>
            {parsed.points_forts.map((p: string) => (
              <div key={p} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                <span style={{ color: ACCENT, flexShrink: 0 }}>•</span>
                <span style={{ fontSize: 14, color: '#ccc' }}>{p}</span>
              </div>
            ))}
          </div>
        )}

        {/* Améliorer */}
        {parsed.points_ameliorer?.length > 0 && (
          <div style={{ background: '#ff660011', border: '1px solid #ff660033', borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#ff6600', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>⚡ À AMÉLIORER</div>
            {parsed.points_ameliorer.map((p: string) => (
              <div key={p} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                <span style={{ color: '#ff6600', flexShrink: 0 }}>•</span>
                <span style={{ fontSize: 14, color: '#ccc' }}>{p}</span>
              </div>
            ))}
          </div>
        )}

        {/* Conseil */}
        {parsed.conseil_semaine && (
          <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>CONSEIL SEMAINE PROCHAINE</div>
            <div style={{ fontSize: 14, color: '#ccc', lineHeight: 1.6 }}>{parsed.conseil_semaine}</div>
          </div>
        )}

        {/* Décision */}
        {parsed.decision && (
          <div style={{ background: parsed.decision.includes('ADAPTER') ? '#ffaa0011' : ACCENT + '11', border: '1px solid ' + (parsed.decision.includes('ADAPTER') ? '#ffaa0044' : ACCENT + '44'), borderRadius: 16, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>DÉCISION NOX</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: parsed.decision.includes('ADAPTER') ? '#ffaa00' : ACCENT }}>
              {parsed.decision}
            </div>
          </div>
        )}

        {generating && (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#555' }}>
            <div style={{ fontSize: 14 }}>Analyse en cours...</div>
          </div>
        )}

        <button onClick={() => navigate('/home')} style={{ width: '100%', padding: 16, background: ACCENT, border: 'none', borderRadius: 14, color: '#000', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
          RETOUR À L'ACCUEIL
        </button>
      </div>

      <BottomNav active="home" />
    </div>
  );
}
