import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { todayLocalDate, formatLocalDate } from '../lib/localDate';
import { ArrowLeft, ArrowRight, BatteryCharging, Check, Info, Moon, PersonStanding } from 'lucide-react';

const BG      = '#0A0A0A';
const WHITE   = '#FFFFFF';
const BLACK   = '#0B0B0B';
const ACCENT  = '#C8FF00';
const MUTED   = '#8C8C8C';
const SURFACE = '#111111';
const ALT     = '#181818';
const BORDER  = '#292929';

type PulseData = {
  sleep_score: number;
  energy_score: number;
  body_score: number;
};

type Dimension = 'sleep' | 'energy' | 'body';
type Mood = 'bad' | 'low' | 'okay' | 'good' | 'great';
const MOODS: { id: Mood; emoji: string; label: string }[] = [
  { id: 'bad', emoji: '😞', label: 'Ça ne va pas' },
  { id: 'low', emoji: '😕', label: 'Pas trop' },
  { id: 'okay', emoji: '😐', label: 'Correct' },
  { id: 'good', emoji: '🙂', label: 'Bien' },
  { id: 'great', emoji: '😄', label: 'Très bien' },
];
const NOXI_INTRO: Record<'bad' | 'low' | 'okay', string> = {
  bad: 'Hey 💚 Ça semble difficile aujourd’hui. Tu veux en parler, ou simplement trouver une toute petite étape pour rendre la journée plus facile ?',
  low: 'Hey 💚 Qu’est-ce qui te pèse le plus aujourd’hui ? On peut prendre les choses doucement.',
  okay: 'On peut avancer tranquillement aujourd’hui. Tu veux qu’on organise une petite étape ensemble ?',
};

const SCORES = [1, 2, 3, 4, 5] as const;

const LABELS: Record<Dimension, Record<number, string>> = {
  sleep:  { 1: 'Très mauvaise', 2: 'Mauvaise', 3: 'Correcte', 4: 'Bonne', 5: 'Excellente' },
  energy: { 1: 'Très faible', 2: 'Faible', 3: 'Correcte', 4: 'Bonne', 5: 'Excellente' },
  body:   { 1: 'Très fatigué', 2: 'Fatigué', 3: 'Correct', 4: 'Bien', 5: 'Top' },
};

const DIMENSIONS: Record<Dimension, {
  title: string;
  subtitle: string;
  Icon: typeof Moon;
}> = {
  sleep: {
    title: 'Sommeil',
    subtitle: 'Comment était ta nuit ?',
    Icon: Moon,
  },
  energy: {
    title: 'Énergie',
    subtitle: 'Comment tu te sens en ce moment ?',
    Icon: BatteryCharging,
  },
  body: {
    title: 'Corps',
    subtitle: 'Récupération physique, douleurs ?',
    Icon: PersonStanding,
  },
};

function ScoreCard({
  dimension,
  value,
  onChange,
}: {
  dimension: Dimension;
  value: number;
  onChange: (v: number) => void;
}) {
  const { title, subtitle, Icon } = DIMENSIONS[dimension];

  return (
    <section style={{
      padding: '22px 20px 26px',
      marginBottom: 16,
      borderRadius: 26,
      background: 'linear-gradient(145deg, #121312 0%, #0F100F 100%)',
      border: `1px solid ${BORDER}`,
      boxShadow: '0 18px 50px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.018)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        marginBottom: 22,
      }}>
        <div style={{
          width: 58,
          height: 58,
          borderRadius: 18,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          color: ACCENT,
          background: 'linear-gradient(145deg, rgba(200,255,0,.12), rgba(200,255,0,.045))',
          border: '1px solid rgba(200,255,0,.10)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04)',
        }}>
          <Icon size={27} strokeWidth={2.3} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 20,
            lineHeight: 1.1,
            fontWeight: 950,
            letterSpacing: '-.035em',
            color: WHITE,
          }}>
            {title}
          </div>
          <div style={{
            fontSize: 13,
            color: '#9A9A9A',
            marginTop: 7,
            lineHeight: 1.35,
          }}>
            {subtitle}
          </div>
        </div>

        <div
          aria-hidden="true"
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            border: '1px solid #555',
            color: '#777',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <Info size={14} />
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
        gap: 9,
      }}>
        {SCORES.map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              aria-pressed={selected}
              aria-label={`${title} ${n} sur 5 — ${LABELS[dimension][n]}`}
              onClick={() => onChange(n)}
              style={{
                minWidth: 0,
                minHeight: 92,
                padding: '12px 5px 10px',
                borderRadius: 18,
                border: selected ? `1px solid ${ACCENT}` : '1px solid #2C2C2C',
                background: selected
                  ? 'linear-gradient(145deg, #D8FF38 0%, #BFFF00 100%)'
                  : 'linear-gradient(145deg, #1B1B1B 0%, #161616 100%)',
                color: selected ? BLACK : '#D1D1D1',
                boxShadow: selected
                  ? '0 0 0 1px rgba(200,255,0,.10), 0 10px 28px rgba(200,255,0,.15)'
                  : 'inset 0 1px 0 rgba(255,255,255,.02)',
                cursor: 'pointer',
                transition: 'transform .14s ease, background .14s ease, border-color .14s ease, box-shadow .14s ease',
              }}
            >
              <div style={{
                fontSize: 23,
                fontWeight: 1000,
                lineHeight: 1,
                letterSpacing: '-.04em',
              }}>
                {n}
              </div>
              <div style={{
                marginTop: 10,
                fontSize: 10.5,
                lineHeight: 1.15,
                fontWeight: selected ? 850 : 650,
                color: selected ? BLACK : '#B7B7B7',
                overflowWrap: 'anywhere',
              }}>
                {LABELS[dimension][n]}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function Pulse() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = todayLocalDate();

  const [mood, setMood] = useState<Mood | null>(null);
  const [showNoxiInvite, setShowNoxiInvite] = useState(false);
  const [sleep, setSleep] = useState(0);
  const [energy, setEnergy] = useState(0);
  const [body, setBody] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [existing, setExisting] = useState<PulseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    supabase
      .from('daily_pulses')
      .select('sleep_score, energy_score, body_score')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExisting(data);
          setSleep(data.sleep_score);
          setEnergy(data.energy_score);
          setBody(data.body_score);
        }
        setLoading(false);
      });
  }, [user, today]);

  const canSave = sleep > 0 && energy > 0 && body > 0 && mood !== null;

  const save = async () => {
    if (!user || !canSave || saving) return;

    setSaving(true);
    setError('');

    try {
      const { error: err } = await supabase
        .from('daily_pulses')
        .upsert({
          user_id: user.id,
          date: today,
          sleep_score: sleep,
          energy_score: energy,
          body_score: body,
        }, { onConflict: 'user_id,date' });

      if (err) throw err;

      setSaved(true);
      if (mood === 'bad' || mood === 'low' || mood === 'okay') {
        setShowNoxiInvite(true);
      } else {
        navigate('/home');
      }
    } catch (e: any) {
      setError(e?.message || 'Impossible d\'enregistrer le Pulse.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh',
        background: BG,
        color: WHITE,
        display: 'grid',
        placeItems: 'center',
      }}>
        <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: '-.04em' }}>
          NOX<span style={{ color: ACCENT }}>.</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: `
        radial-gradient(circle at 50% -15%, rgba(255,255,255,.045), transparent 34%),
        ${BG}
      `,
      color: WHITE,
    }}>
      <div style={{ width: '100%', maxWidth: 720, margin: '0 auto' }}>
        <header style={{
          padding: '42px 28px 0',
          display: 'grid',
          gridTemplateColumns: '56px minmax(0,1fr)',
          gap: 24,
          alignItems: 'start',
          marginBottom: 34,
        }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Retour"
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              border: `1px solid ${BORDER}`,
              background: 'linear-gradient(145deg, #111, #0D0D0D)',
              color: WHITE,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.03)',
            }}
          >
            <ArrowLeft size={25} />
          </button>

          <div style={{ paddingTop: 2 }}>
            <div style={{
              fontSize: 12,
              fontWeight: 900,
              color: '#A2A2A2',
              letterSpacing: '.18em',
              marginBottom: 8,
            }}>
              {existing ? 'MODIFIER TON PULSE' : 'PULSE DU MATIN'}
            </div>
            <h1 style={{
              margin: 0,
              fontSize: 'clamp(34px, 7vw, 46px)',
              lineHeight: 1,
              fontWeight: 1000,
              letterSpacing: '-.055em',
              color: WHITE,
              textTransform: 'none',
            }}>
              {formatLocalDate(today)}
            </h1>
            <p style={{
              margin: '24px 0 0',
              fontSize: 16,
              color: '#A0A0A0',
              lineHeight: 1.55,
              maxWidth: 500,
            }}>
              En 3 signaux, NOX comprend ton état du jour.<br />
              Ça prend 10 secondes.
            </p>
          </div>
        </header>

        <main style={{ padding: '0 28px 54px' }}>
          <section aria-label="Humeur du jour" style={{ padding: 20, marginBottom: 16, borderRadius: 24, background: SURFACE, border: `1px solid ${BORDER}` }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 21 }}>Comment tu te sens aujourd’hui ?</h2>
            <p style={{ color: MUTED, fontSize: 13, margin: '0 0 18px' }}>Il n’y a pas de bonne ou de mauvaise réponse.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
              {MOODS.map(item => <button key={item.id} type="button" aria-pressed={mood === item.id} onClick={() => setMood(item.id)} style={{ minHeight: 86, borderRadius: 16, border: `1px solid ${mood === item.id ? ACCENT : BORDER}`, background: mood === item.id ? '#283217' : ALT, color: WHITE, cursor: 'pointer', padding: 8 }}><span style={{ display: 'block', fontSize: 27, marginBottom: 6 }}>{item.emoji}</span><span style={{ fontSize: 11 }}>{item.label}</span></button>)}
            </div>
          </section>
          <ScoreCard
            dimension="sleep"
            value={sleep}
            onChange={setSleep}
          />

          <ScoreCard
            dimension="energy"
            value={energy}
            onChange={setEnergy}
          />

          <ScoreCard
            dimension="body"
            value={body}
            onChange={setBody}
          />

          {error && (
            <div style={{
              padding: '13px 15px',
              borderRadius: 15,
              background: '#241313',
              border: '1px solid #6B2B2B',
              color: '#FFB8B8',
              fontSize: 12,
              margin: '4px 0 16px',
            }}>
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={save}
            disabled={!canSave || saving}
            style={{
              width: '100%',
              minHeight: 72,
              marginTop: 10,
              padding: '16px 22px',
              border: saved
                ? '1px solid #69B578'
                : canSave
                  ? `1px solid ${ACCENT}`
                  : `1px solid ${BORDER}`,
              borderRadius: 28,
              background: saved
                ? '#17351F'
                : canSave
                  ? 'linear-gradient(90deg, #D8FF38 0%, #BFFF00 100%)'
                  : ALT,
              color: saved ? '#9BE6AA' : canSave ? BLACK : '#686868',
              fontWeight: 1000,
              fontSize: 16,
              cursor: canSave && !saving ? 'pointer' : 'not-allowed',
              display: 'grid',
              gridTemplateColumns: '44px 1fr 44px',
              alignItems: 'center',
              gap: 8,
              transition: 'background .2s, color .2s, border-color .2s, transform .15s',
              boxShadow: canSave && !saved ? '0 16px 42px rgba(200,255,0,.10)' : 'none',
            }}
          >
            <span />
            <span>
              {saved
                ? 'PULSE ENREGISTRÉ'
                : saving
                  ? 'ENREGISTREMENT…'
                  : existing
                    ? 'METTRE À JOUR'
                    : 'VALIDER MON PULSE'}
            </span>
            <span style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              justifySelf: 'end',
              background: canSave && !saved ? BLACK : 'transparent',
              color: canSave && !saved ? ACCENT : 'currentColor',
            }}>
              {saved ? <Check size={20} /> : <ArrowRight size={22} />}
            </span>
          </button>

          {!canSave && (
            <div style={{
              marginTop: 17,
              textAlign: 'center',
              fontSize: 12,
              color: '#777',
            }}>
              Réponds aux 3 questions pour valider.
            </div>
          )}
        </main>
      </div>

      {showNoxiInvite && mood && (mood === 'bad' || mood === 'low' || mood === 'okay') && (
        <div role="dialog" aria-modal="true" aria-label="NOXI te propose son aide" style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,.85)', display: 'grid', placeItems: 'center', padding: 20 }}>
          <div style={{ maxWidth: 420, width: '100%', background: '#141914', border: '1px solid #35412A', borderRadius: 26, padding: 24 }}>
            <div style={{ color: ACCENT, fontWeight: 900, marginBottom: 14 }}>NOXI 💚</div>
            <p style={{ lineHeight: 1.65, fontSize: 17 }}>{NOXI_INTRO[mood]}</p>
            <button type="button" onClick={() => navigate('/coach')} style={{ width: '100%', padding: 16, border: 0, borderRadius: 16, background: ACCENT, color: BLACK, fontWeight: 900, marginTop: 12 }}>Parler à NOXI</button>
            <button type="button" onClick={() => navigate('/home')} style={{ width: '100%', padding: 16, border: 0, background: 'transparent', color: '#C7CCC7', marginTop: 8 }}>Pas maintenant</button>
          </div>
        </div>
      )}
      <style>{`
        @media (max-width: 560px) {
          .nox-pulse-score-label { font-size: 9px; }
        }
      `}</style>
    </div>
  );
}
