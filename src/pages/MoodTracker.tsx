import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from '../components/BottomNav';

const ACCENT = '#B7FF00';
const BG = '#F7F7F7';
const SURFACE = '#FFFFFF';
const BORDER = '#EAEAEA';

const MOODS = [
  { id: 5, emoji: '😄', label: 'Excellent', color: ACCENT },
  { id: 4, emoji: '😊', label: 'Bien', color: '#4488ff' },
  { id: 3, emoji: '😐', label: 'Neutre', color: '#ffaa00' },
  { id: 2, emoji: '😔', label: 'Pas top', color: '#ff6644' },
  { id: 1, emoji: '😞', label: 'Difficile', color: '#ff4444' },
];

const SYMPTOMS = ['Faim', 'Maux de tête', 'Bonne récup', 'Motivation haute', 'Sommeil réparateur'];

type Recommendation = {
  score: number;
  level: 'go' | 'adapt' | 'rest';
  title: string;
  text: string;
  actions: string[];
};

export default function MoodTracker() {
  const { user } = useAuth();
  const [mood, setMood] = useState<number | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [caloriesBurned, setCaloriesBurned] = useState(0);

  const [sleepHours, setSleepHours] = useState(7.5);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [fatigue, setFatigue] = useState(3);
  const [soreness, setSoreness] = useState(2);
  const [stress, setStress] = useState(2);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [todayLogId, setTodayLogId] = useState<string | null>(null);

  useEffect(() => {
    if (user) load();
  }, [user]);

  const load = async () => {
    if (!user) return;
    setError('');

    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error: moodError } = await supabase
        .from('mood_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(14);

      if (moodError) throw moodError;

      setHistory(data || []);

      const todayLog = data?.find((d: any) => d.created_at?.startsWith(today));
      if (todayLog) {
        setTodayLogId(todayLog.id || null);
        setMood(todayLog.mood_score ?? null);
        setSelectedSymptoms(Array.isArray(todayLog.symptoms) ? todayLog.symptoms : []);
        setNote(todayLog.note || '');
        setSaved(true);
      }

      const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: workouts, error: workoutError } = await supabase
        .from('workouts')
        .select('duration_minutes')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', weekStart);

      if (workoutError) throw workoutError;

      const totalMin = workouts?.reduce((sum: number, w: any) => sum + (Number(w.duration_minutes) || 0), 0) || 0;
      setCaloriesBurned(Math.round(totalMin * 7));
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Impossible de charger tes données de récupération.');
    }
  };

  const recommendation = useMemo<Recommendation>(() => {
    let score = 100;

    if (sleepHours < 5) score -= 35;
    else if (sleepHours < 6) score -= 25;
    else if (sleepHours < 7) score -= 12;
    else if (sleepHours >= 8) score += 3;

    score -= (5 - sleepQuality) * 6;
    score -= (fatigue - 1) * 8;
    score -= (soreness - 1) * 6;
    score -= (stress - 1) * 5;

    if (mood === 1) score -= 16;
    if (mood === 2) score -= 10;
    if (mood === 4) score += 2;
    if (mood === 5) score += 5;

    if (selectedSymptoms.includes('Maux de tête')) score -= 8;
    if (selectedSymptoms.includes('Bonne récup')) score += 5;
    if (selectedSymptoms.includes('Sommeil réparateur')) score += 5;
    if (selectedSymptoms.includes('Motivation haute')) score += 3;

    score = Math.max(0, Math.min(100, Math.round(score)));

    if (score >= 72) {
      return {
        score,
        level: 'go',
        title: 'ENTRAÎNEMENT NORMAL',
        text: 'Tes indicateurs sont compatibles avec une séance normale aujourd’hui.',
        actions: [
          'Garde le volume prévu dans ton programme.',
          'Échauffe-toi normalement et réévalue tes sensations sur les premières séries.',
          'Si tes performances chutent nettement, adapte la charge plutôt que de forcer.',
        ],
      };
    }

    if (score >= 45) {
      return {
        score,
        level: 'adapt',
        title: 'SÉANCE À ADAPTER',
        text: 'Ta récupération semble moyenne. Tu peux t’entraîner, mais NOX recommande de réduire la contrainte.',
        actions: [
          'Réduis le volume d’environ 20 à 30 % aujourd’hui.',
          'Évite les séries à l’échec et garde 2 à 3 répétitions en réserve.',
          'Priorise technique, hydratation, alimentation et sommeil ce soir.',
        ],
      };
    }

    return {
      score,
      level: 'rest',
      title: 'RÉCUPÉRATION PRIORITAIRE',
      text: 'Plusieurs indicateurs suggèrent une récupération insuffisante. Une journée légère peut être plus productive.',
      actions: [
        'Privilégie repos, marche légère ou mobilité.',
        'Évite une séance très intense si tes sensations restent mauvaises.',
        'Si un symptôme important, inhabituel ou persistant apparaît, demande un avis médical.',
      ],
    };
  }, [sleepHours, sleepQuality, fatigue, soreness, stress, mood, selectedSymptoms]);

  const save = async () => {
    if (!user || !mood || saving) return;

    setSaving(true);
    setError('');

    const symptoms = [
      ...selectedSymptoms,
      `Sommeil: ${sleepHours}h`,
      `Qualité sommeil: ${sleepQuality}/5`,
      `Fatigue: ${fatigue}/5`,
      `Courbatures: ${soreness}/5`,
      `Stress: ${stress}/5`,
      `Recovery score: ${recommendation.score}/100`,
      `Recommandation: ${recommendation.title}`,
    ];

    const payload = {
      user_id: user.id,
      mood_score: mood,
      symptoms,
      note: note || null,
      calories_burned_today: caloriesBurned,
    };

    try {
      if (todayLogId) {
        const { error: updateError } = await supabase
          .from('mood_logs')
          .update(payload)
          .eq('id', todayLogId)
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from('mood_logs')
          .insert({ ...payload, created_at: new Date().toISOString() })
          .select('id')
          .single();

        if (insertError) throw insertError;
        setTodayLogId(data?.id || null);
      }

      setSaved(true);
      await load();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Impossible d’enregistrer ton check-in.');
    } finally {
      setSaving(false);
    }
  };

  const editToday = () => {
    setSaved(false);
    setError('');
  };

  const Scale = ({
    label,
    value,
    setValue,
    left,
    right,
  }: {
    label: string;
    value: number;
    setValue: (value: number) => void;
    left: string;
    right: string;
  }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#777', textTransform: 'uppercase', letterSpacing: '.07em' }}>{label}</div>
        <div style={{ color: ACCENT, fontSize: 14, fontWeight: 900 }}>{value}/5</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 7 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => setValue(n)}
            style={{
              height: 42,
              borderRadius: 10,
              border: '1px solid ' + (value === n ? ACCENT : BORDER),
              background: value === n ? ACCENT + '18' : SURFACE,
              color: value === n ? ACCENT : '#666',
              fontWeight: 900,
              cursor: 'pointer',
              touchAction: 'manipulation',
            }}
          >
            {n}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#444', fontSize: 10, marginTop: 6 }}>
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 90 }}>
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid ' + BORDER }}>
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em' }}>Readiness NOX</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#0A0A0A' }}>HUMEUR & RÉCUPÉRATION</div>
        <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5, marginTop: 6 }}>
          Ton check-in ajoute du contexte à ta journée. Les repères affichés restent indicatifs et modifiables selon tes sensations.
        </div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        {error && (
          <div style={{ background: '#ff444411', border: '1px solid #ff444433', borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <div style={{ color: '#ff7777', fontSize: 12, fontWeight: 900, marginBottom: 4 }}>ERREUR</div>
            <div style={{ color: '#666', fontSize: 12, lineHeight: 1.5 }}>{error}</div>
          </div>
        )}

        <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: '14px 16px', marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>ACTIVITÉ ESTIMÉE · 7 JOURS</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#ff6644' }}>{caloriesBurned} kcal</div>
          </div>
          <div style={{ fontSize: 11, color: '#555', textAlign: 'right', lineHeight: 1.4 }}>
            Estimation NOX<br />à partir des séances
          </div>
        </div>

        {!saved ? (
          <>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#777', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>1 · SOMMEIL</div>

            <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: 16, marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ color: '#666', fontSize: 13, fontWeight: 700 }}>Durée cette nuit</span>
                <span style={{ color: ACCENT, fontSize: 16, fontWeight: 900 }}>{sleepHours.toFixed(1)} h</span>
              </div>
              <input
                type="range"
                min="3"
                max="11"
                step="0.5"
                value={sleepHours}
                onChange={e => setSleepHours(Number(e.target.value))}
                style={{ width: '100%', accentColor: ACCENT }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#444', fontSize: 10 }}>
                <span>3 h</span><span>11 h</span>
              </div>
            </div>

            <Scale label="Qualité du sommeil" value={sleepQuality} setValue={setSleepQuality} left="Mauvaise" right="Excellente" />

            <div style={{ fontSize: 12, fontWeight: 900, color: '#777', textTransform: 'uppercase', letterSpacing: '.08em', margin: '26px 0 12px' }}>2 · ÉTAT PHYSIQUE</div>
            <Scale label="Fatigue" value={fatigue} setValue={setFatigue} left="Très frais" right="Épuisé" />
            <Scale label="Courbatures" value={soreness} setValue={setSoreness} left="Aucune" right="Fortes" />

            <div style={{ fontSize: 12, fontWeight: 900, color: '#777', textTransform: 'uppercase', letterSpacing: '.08em', margin: '26px 0 12px' }}>3 · MENTAL</div>
            <Scale label="Stress" value={stress} setValue={setStress} left="Très faible" right="Très élevé" />

            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#777', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>HUMEUR</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {MOODS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMood(m.id)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: '12px 2px',
                      background: mood === m.id ? m.color + '22' : SURFACE,
                      border: '1px solid ' + (mood === m.id ? m.color : BORDER),
                      borderRadius: 13,
                      cursor: 'pointer',
                      textAlign: 'center',
                      touchAction: 'manipulation',
                    }}
                  >
                    <div style={{ fontSize: 25 }}>{m.emoji}</div>
                    <div style={{ fontSize: 8, color: mood === m.id ? m.color : '#555', fontWeight: 800, marginTop: 4 }}>{m.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#777', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>AUTRES SENSATIONS</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SYMPTOMS.map(s => (
                  <button
                    key={s}
                    onClick={() => setSelectedSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                    style={{
                      padding: '8px 13px',
                      borderRadius: 20,
                      border: '1px solid ' + (selectedSymptoms.includes(s) ? ACCENT : BORDER),
                      background: selectedSymptoms.includes(s) ? ACCENT + '18' : 'transparent',
                      color: selectedSymptoms.includes(s) ? ACCENT : '#666',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      touchAction: 'manipulation',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div style={{
              background: recommendation.level === 'go' ? ACCENT + '0d' : recommendation.level === 'adapt' ? '#ffaa000d' : '#ff44440d',
              border: '1px solid ' + (recommendation.level === 'go' ? ACCENT + '44' : recommendation.level === 'adapt' ? '#ffaa0044' : '#ff444444'),
              borderRadius: 16,
              padding: 18,
              marginBottom: 18,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 10, color: '#666', fontWeight: 900, letterSpacing: '.09em', marginBottom: 5 }}>REPÈRE NOX</div>
                  <div style={{ fontSize: 17, color: '#0A0A0A', fontWeight: 900 }}>{recommendation.title}</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: recommendation.level === 'go' ? ACCENT : recommendation.level === 'adapt' ? '#ffaa00' : '#ff6666' }}>
                  {recommendation.score}
                </div>
              </div>
              <div style={{ color: '#888', fontSize: 12, lineHeight: 1.55, marginTop: 9 }}>{recommendation.text}</div>
              <div style={{ marginTop: 12 }}>
                {recommendation.actions.map((action, i) => (
                  <div key={i} style={{ color: '#555', fontSize: 12, lineHeight: 1.5, marginTop: 6 }}>
                    <span style={{ color: ACCENT, marginRight: 7 }}>→</span>{action}
                  </div>
                ))}
              </div>
            </div>

            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Note personnelle (optionnel)..."
              style={{ width: '100%', minHeight: 80, padding: '12px 14px', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, color: '#0A0A0A', fontSize: 14, resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 16 }}
            />

            <button
              onClick={save}
              disabled={!mood || saving}
              style={{
                width: '100%',
                padding: 18,
                background: mood && !saving ? ACCENT : '#E5E5E5',
                border: 'none',
                borderRadius: 14,
                color: mood && !saving ? '#000' : '#888',
                fontWeight: 900,
                fontSize: 15,
                cursor: mood && !saving ? 'pointer' : 'not-allowed',
                touchAction: 'manipulation',
              }}
            >
              {saving ? 'ENREGISTREMENT...' : 'ENREGISTRER MON CHECK-IN'}
            </button>
          </>
        ) : (
          <>
            <div style={{
              background: recommendation.level === 'go' ? ACCENT + '0d' : recommendation.level === 'adapt' ? '#ffaa000d' : '#ff44440d',
              border: '1px solid ' + (recommendation.level === 'go' ? ACCENT + '44' : recommendation.level === 'adapt' ? '#ffaa0044' : '#ff444444'),
              borderRadius: 16,
              padding: 20,
              marginBottom: 14,
            }}>
              <div style={{ fontSize: 11, color: '#666', fontWeight: 900, letterSpacing: '.08em' }}>READINESS DU JOUR</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginTop: 6 }}>
                <div>
                  <div style={{ fontSize: 18, color: '#0A0A0A', fontWeight: 900 }}>{recommendation.title}</div>
                  <div style={{ color: '#777', fontSize: 12, marginTop: 4 }}>{MOODS.find(m => m.id === mood)?.emoji} {MOODS.find(m => m.id === mood)?.label}</div>
                </div>
                <div style={{ fontSize: 32, fontWeight: 900, color: recommendation.level === 'go' ? ACCENT : recommendation.level === 'adapt' ? '#ffaa00' : '#ff6666' }}>{recommendation.score}</div>
              </div>
              <div style={{ color: '#999', fontSize: 12, lineHeight: 1.55, marginTop: 12 }}>{recommendation.text}</div>
              {recommendation.actions.map((action, i) => (
                <div key={i} style={{ color: '#555', fontSize: 12, lineHeight: 1.5, marginTop: 7 }}>
                  <span style={{ color: ACCENT, marginRight: 7 }}>→</span>{action}
                </div>
              ))}
            </div>

            <button
              onClick={editToday}
              style={{ width: '100%', padding: 13, background: 'transparent', border: '1px solid ' + BORDER, borderRadius: 12, color: '#666', fontWeight: 800, cursor: 'pointer', marginBottom: 22 }}
            >
              MODIFIER MON CHECK-IN
            </button>
          </>
        )}

        {history.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>DERNIERS CHECK-INS</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {history.slice(0, 7).reverse().map((log, i) => {
                const m = MOODS.find(item => item.id === log.mood_score);
                return (
                  <div key={log.id || i} style={{ flex: 1, minWidth: 0, textAlign: 'center', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 10, padding: '9px 2px' }}>
                    <div style={{ fontSize: 20 }}>{m?.emoji || '—'}</div>
                    <div style={{ fontSize: 9, color: '#555', marginTop: 4 }}>
                      {new Date(log.created_at).toLocaleDateString('fr-FR', { weekday: 'short' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ color: '#3f3f3f', fontSize: 10, lineHeight: 1.45, marginTop: 18 }}>
          Ce repère de récupération est calculé à partir de tes réponses enregistrées. Il n’est ni une mesure médicale ni une consigne obligatoire.
        </div>
      </div>

      <BottomNav active="body" />
    </div>
  );
}
