import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

const MOODS = [
  { id: 5, emoji: '😄', label: 'Excellent', color: ACCENT },
  { id: 4, emoji: '😊', label: 'Bien', color: '#4488ff' },
  { id: 3, emoji: '😐', label: 'Neutre', color: '#ffaa00' },
  { id: 2, emoji: '😔', label: 'Pas top', color: '#ff6644' },
  { id: 1, emoji: '😞', label: 'Difficile', color: '#ff4444' },
];

const SYMPTOMS = ['Fatigue', 'Courbatures', 'Faim', 'Énergie basse', 'Maux de tête', 'Bonne récup', 'Motivation haute', 'Sommeil réparateur'];

export default function MoodTracker() {
  const { user } = useAuth();
  const [mood, setMood] = useState<number | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [calories_burned, setCaloriesBurned] = useState(0);

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('mood_logs')
      .select('*').eq('user_id', user!.id)
      .order('created_at', { ascending: false }).limit(7);
    setHistory(data || []);
    const todayLog = data?.find(d => d.created_at?.startsWith(today));
    if (todayLog) { setMood(todayLog.mood_score); setSaved(true); }

    // Calories brûlées depuis Training cette semaine
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: workouts } = await supabase.from('workouts')
      .select('duration_minutes').eq('user_id', user!.id)
      .eq('status', 'completed').gte('created_at', weekStart);
    const totalMin = workouts?.reduce((s, w) => s + (w.duration_minutes || 0), 0) || 0;
    setCaloriesBurned(Math.round(totalMin * 7)); // ~7 kcal/min moyenne
  };

  const save = async () => {
    if (!mood) return;
    await supabase.from('mood_logs').insert({
      user_id: user!.id,
      mood_score: mood,
      symptoms: selectedSymptoms,
      note: note || null,
      calories_burned_today: calories_burned,
      created_at: new Date().toISOString(),
    });
    setSaved(true);
    load();
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 80 }}>
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid ' + BORDER }}>
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em' }}>Bien-être</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>HUMEUR & RÉCUPÉRATION</div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        {/* Calories brûlées */}
        <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: '14px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>🔥 CALORIES BRÛLÉES (cette semaine)</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#ff6644' }}>{calories_burned} kcal</div>
          </div>
          <div style={{ fontSize: 12, color: '#555', textAlign: 'right' }}>Depuis tes<br />séances NOX</div>
        </div>

        {!saved ? (
          <>
            {/* Humeur */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>COMMENT TU TE SENS ?</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {MOODS.map(m => (
                  <button key={m.id} onClick={() => setMood(m.id)}
                    style={{ flex: 1, padding: '14px 0', background: mood === m.id ? m.color + '22' : SURFACE, border: '2px solid ' + (mood === m.id ? m.color : BORDER), borderRadius: 14, cursor: 'pointer', textAlign: 'center', touchAction: 'manipulation' }}>
                    <div style={{ fontSize: 28 }}>{m.emoji}</div>
                    <div style={{ fontSize: 9, color: mood === m.id ? m.color : '#555', fontWeight: 700, marginTop: 4 }}>{m.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Symptômes */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>SYMPTÔMES / SENSATIONS</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SYMPTOMS.map(s => (
                  <button key={s} onClick={() => setSelectedSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                    style={{ padding: '8px 14px', borderRadius: 20, border: '1px solid ' + (selectedSymptoms.includes(s) ? ACCENT : BORDER), background: selectedSymptoms.includes(s) ? ACCENT + '22' : 'transparent', color: selectedSymptoms.includes(s) ? ACCENT : '#555', fontSize: 12, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div style={{ marginBottom: 20 }}>
              <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Note personnelle (optionnel)..."
                style={{ width: '100%', minHeight: 80, padding: '12px 14px', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontSize: 14, resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>

            <button onTouchEnd={e => { e.preventDefault(); save(); }} onClick={save} disabled={!mood}
              style={{ width: '100%', padding: 18, background: mood ? ACCENT : '#1a1a1a', border: 'none', borderRadius: 14, color: mood ? '#000' : '#333', fontWeight: 900, fontSize: 15, cursor: mood ? 'pointer' : 'not-allowed', touchAction: 'manipulation' }}>
              ENREGISTRER
            </button>
          </>
        ) : (
          <div style={{ background: ACCENT + '11', border: '1px solid ' + ACCENT + '33', borderRadius: 14, padding: 20, textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 40 }}>{MOODS.find(m => m.id === mood)?.emoji}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginTop: 10 }}>Enregistré pour aujourd'hui</div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>{MOODS.find(m => m.id === mood)?.label}</div>
          </div>
        )}

        {/* Historique */}
        {history.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>7 DERNIERS JOURS</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {history.slice(0, 7).reverse().map((log, i) => {
                const m = MOODS.find(m => m.id === log.mood_score);
                return (
                  <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 22 }}>{m?.emoji || '—'}</div>
                    <div style={{ fontSize: 9, color: '#555', marginTop: 4 }}>
                      {new Date(log.created_at).toLocaleDateString('fr-FR', { weekday: 'short' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <BottomNav active="body" />
    </div>
  );
}
