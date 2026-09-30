import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { todayLocalDate, formatLocalDate } from '../lib/localDate';
import { ArrowLeft, Check } from 'lucide-react';

const BG     = '#F7F8F4';
const WHITE  = '#FFFFFF';
const BLACK  = '#0B0B0B';
const ACCENT = '#C8FF00';
const MUTED  = '#7A7F76';
const BORDER = '#E8EAE4';

type PulseData = {
  sleep_score: number;
  energy_score: number;
  body_score: number;
};

const SCORES = [1, 2, 3, 4, 5] as const;

const LABELS: Record<string, Record<number, string>> = {
  sleep:  { 1: 'Très courte', 2: 'Courte', 3: 'Correcte', 4: 'Bonne', 5: 'Excellente' },
  energy: { 1: 'Épuisé', 2: 'Fatigué', 3: 'Correct', 4: 'Énergique', 5: 'Au top' },
  body:   { 1: 'Courbaturé', 2: 'Lourd', 3: 'Correct', 4: 'Bien', 5: 'Frais' },
};

function ScoreRow({
  label, sublabel, dimension, value, onChange,
}: {
  label: string; sublabel: string; dimension: string;
  value: number; onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: BLACK }}>{label}</div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{sublabel}</div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 750, color: value ? BLACK : MUTED }}>
          {value ? LABELS[dimension][value] : '—'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {SCORES.map(n => {
          const sel = value === n;
          return (
            <button key={n} onClick={() => onChange(n)} style={{
              flex: 1, height: 44, border: 0, borderRadius: 14,
              background: sel ? ACCENT : '#ECEEE8',
              color: sel ? BLACK : MUTED,
              fontWeight: sel ? 1000 : 700,
              fontSize: 18, cursor: 'pointer',
              transition: 'background .12s, color .12s',
            }}>
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Pulse() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const today = todayLocalDate();

  const [sleep,  setSleep]  = useState(0);
  const [energy, setEnergy] = useState(0);
  const [body,   setBody]   = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState('');
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
  }, [user]);

  const canSave = sleep > 0 && energy > 0 && body > 0;

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
      setTimeout(() => navigate('/home'), 900);
    } catch (e: any) {
      setError(e?.message || 'Impossible d\'enregistrer le Pulse.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'grid', placeItems: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: '-.04em' }}>NOX<span style={{ color: ACCENT }}>.</span></div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, color: BLACK }}>
      <div style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>

        <header style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <button onClick={() => navigate(-1)} style={{
            width: 40, height: 40, borderRadius: 14, border: `1px solid ${BORDER}`,
            background: WHITE, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0,
          }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.12em' }}>
              {existing ? 'MODIFIER TON PULSE' : 'PULSE DU MATIN'}
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 950, letterSpacing: '-.04em' }}>
              {formatLocalDate(today)}
            </h1>
          </div>
        </header>

        <main style={{ padding: '0 20px 40px' }}>
          <p style={{ margin: '0 0 28px', fontSize: 14, color: MUTED, lineHeight: 1.6 }}>
            En 3 signaux, NOX comprend ton état du jour. Ça prend 10 secondes.
          </p>

          <ScoreRow
            label="Sommeil" sublabel="Comment était ta nuit ?"
            dimension="sleep" value={sleep} onChange={setSleep}
          />
          <ScoreRow
            label="Énergie" sublabel="Comment tu te sens en ce moment ?"
            dimension="energy" value={energy} onChange={setEnergy}
          />
          <ScoreRow
            label="Corps" sublabel="Récupération physique, douleurs ?"
            dimension="body" value={body} onChange={setBody}
          />

          {error && (
            <div style={{ padding: '12px 14px', borderRadius: 14, background: '#FFF2F2',
              border: '1px solid #FFB8B8', color: '#9B1C1C', fontSize: 12, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button onClick={save} disabled={!canSave || saving}
            style={{
              width: '100%', padding: 18, border: 0, borderRadius: 18,
              background: saved ? '#69B578' : canSave ? BLACK : '#E8EAE4',
              color: saved ? WHITE : canSave ? ACCENT : MUTED,
              fontWeight: 950, fontSize: 15, cursor: canSave ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'background .2s',
            }}
          >
            {saved ? (
              <><Check size={18} /> PULSE ENREGISTRÉ</>
            ) : saving ? 'ENREGISTREMENT…' : existing ? 'METTRE À JOUR' : 'VALIDER MON PULSE'}
          </button>

          {!canSave && (
            <div style={{ marginTop: 12, textAlign: 'center', fontSize: 11, color: MUTED }}>
              Réponds aux 3 questions pour valider.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
