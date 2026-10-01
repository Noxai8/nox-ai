import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { todayLocalDate } from '../lib/localDate';

const BG    = '#0A0A0A';
const CARD  = '#111111';
const CARD2 = '#161616';
const WHITE = '#FFFFFF';
const LIME  = '#C8FF00';
const MUTED = '#666666';
const BORDER= '#1E1E1E';

type Sport = {
  id: string;
  label: string;
  icon: string;
};

type Intensity = 'light' | 'moderate' | 'intense';

const SPORTS: Sport[] = [
  { id: 'marche',        label: 'Marche',       icon: '🚶' },
  { id: 'course',        label: 'Course',        icon: '🏃' },
  { id: 'velo',          label: 'Vélo',          icon: '🚴' },
  { id: 'musculation',   label: 'Musculation',   icon: '🏋️' },
  { id: 'natation',      label: 'Natation',      icon: '🏊' },
  { id: 'football',      label: 'Football',      icon: '⚽' },
  { id: 'tennis',        label: 'Tennis',        icon: '🎾' },
  { id: 'basket',        label: 'Basket',        icon: '🏀' },
  { id: 'yoga',          label: 'Yoga',          icon: '🧘' },
  { id: 'randonnee',     label: 'Randonnée',     icon: '🥾' },
  { id: 'danse',         label: 'Danse',         icon: '💃' },
  { id: 'autre',         label: 'Autre',         icon: '🏅' },
];

const INTENSITIES: { id: Intensity; label: string; desc: string }[] = [
  { id: 'light',    label: 'Légère',   desc: 'Confortable, tu peux parler' },
  { id: 'moderate', label: 'Modérée',  desc: 'Effort soutenu, rythmé' },
  { id: 'intense',  label: 'Intense',  desc: 'Difficile, essoufflé' },
];

const DURATIONS = [15, 20, 30, 45, 60, 75, 90];

const intensityLabel: Record<Intensity, string> = {
  light: 'Légère', moderate: 'Modérée', intense: 'Intense',
};

export default function Movement() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step,      setStep]      = useState<'sport' | 'detail' | 'done'>('sport');
  const [sport,     setSport]     = useState<Sport | null>(null);
  const [duration,  setDuration]  = useState<number>(30);
  const [customDur, setCustomDur] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [intensity, setIntensity] = useState<Intensity | null>(null);
  const [note,      setNote]      = useState('');
  const [saving,    setSaving]    = useState(false);

  const effectiveDuration = useCustom ? Number(customDur) : duration;
  const canSave = sport !== null && effectiveDuration > 0 && intensity !== null;

  const selectSport = (s: Sport) => {
    setSport(s);
    if (s.id === 'musculation') {
      setStep('detail'); // affiche le choix musculation
    } else {
      setStep('detail');
    }
  };

  const save = async () => {
    if (!user || !canSave || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('movement_logs').insert({
        user_id:      user.id,
        date:         todayLocalDate(),
        sport:        sport!.label,
        duration_min: effectiveDuration,
        intensity,
        note:         note.trim() || null,
      });
      if (!error) setStep('done');
    } finally {
      setSaving(false);
    }
  };

  // Écran final
  if (step === 'done') {
    return (
      <div style={{ minHeight: '100vh', background: BG, color: WHITE, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 28px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#0F1A00', border: `2px solid ${LIME}`, display: 'grid', placeItems: 'center', marginBottom: 24 }}>
          <Check size={28} color={LIME} strokeWidth={3} />
        </div>
        <div style={{ fontSize: 10, fontWeight: 900, color: LIME, letterSpacing: '.1em', marginBottom: 10 }}>MOUVEMENT ENREGISTRÉ ✓</div>
        <div style={{ fontSize: 26, fontWeight: 1000, letterSpacing: '-.04em', marginBottom: 10 }}>
          {sport!.icon} {sport!.label}
        </div>
        <div style={{ fontSize: 16, color: '#AAAAAA', marginBottom: 6 }}>
          {effectiveDuration} min · {intensityLabel[intensity!]}
        </div>
        <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, marginBottom: 36, maxWidth: 320 }}>
          NOX gardera cette activité dans l'historique de ta journée.
        </div>
        <button onClick={() => navigate('/home')}
          style={{ padding: '16px 36px', border: 0, borderRadius: 18, background: LIME, color: '#0A0A0A', fontWeight: 1000, fontSize: 14, cursor: 'pointer' }}>
          RETOUR À L'ACCUEIL
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, color: WHITE }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 40px' }}>

        {/* Header */}
        <header style={{ paddingTop: 52, paddingBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => step === 'sport' ? navigate(-1) : setStep('sport')}
            style={{ width: 40, height: 40, borderRadius: 14, border: `1px solid ${BORDER}`, background: CARD, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <ArrowLeft size={18} color={WHITE} />
          </button>
          <div>
            <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.1em', marginBottom: 3 }}>MOUVEMENT / SPORT</div>
            <div style={{ fontSize: 22, fontWeight: 1000, letterSpacing: '-.04em' }}>
              {step === 'sport' ? 'Qu\'est-ce que tu as fait ?' : `${sport!.icon} ${sport!.label}`}
            </div>
          </div>
        </header>

        {/* ÉTAPE 1 — Sélection sport */}
        {step === 'sport' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {SPORTS.map(s => (
              <button key={s.id} onClick={() => selectSport(s)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '18px 8px', border: `1px solid ${BORDER}`, borderRadius: 20, background: CARD, cursor: 'pointer', color: WHITE }}>
                <span style={{ fontSize: 32 }}>{s.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#BBBBBB' }}>{s.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* ÉTAPE 2 — Détail */}
        {step === 'detail' && (
          <>
            {/* Cas spécial Musculation */}
            {sport?.id === 'musculation' && (
              <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 22, padding: '20px', marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.08em', marginBottom: 14 }}>MUSCULATION</div>
                <button onClick={() => navigate('/program')}
                  style={{ width: '100%', padding: 16, marginBottom: 10, border: 0, borderRadius: 16, background: LIME, color: '#0A0A0A', fontWeight: 1000, fontSize: 14, cursor: 'pointer' }}>
                  DÉMARRER MA SÉANCE →
                </button>
                <button onClick={() => {/* reste sur detail pour enregistrement rapide */}}
                  style={{ width: '100%', padding: 16, border: `1px solid ${BORDER}`, borderRadius: 16, background: 'transparent', color: WHITE, fontWeight: 900, fontSize: 13, cursor: 'pointer' }}>
                  ENREGISTRER RAPIDEMENT
                </button>
              </section>
            )}

            {/* Durée */}
            <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 22, padding: '18px 20px', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.08em', marginBottom: 14 }}>DURÉE</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {DURATIONS.map(d => (
                  <button key={d} onClick={() => { setDuration(d); setUseCustom(false); }}
                    style={{ padding: '10px 14px', border: `1px solid ${!useCustom && duration === d ? LIME + '66' : BORDER}`, borderRadius: 12, background: !useCustom && duration === d ? '#0F1A00' : CARD2, color: !useCustom && duration === d ? LIME : MUTED, fontWeight: 900, fontSize: 13, cursor: 'pointer' }}>
                    {d} min
                  </button>
                ))}
                <button onClick={() => setUseCustom(true)}
                  style={{ padding: '10px 14px', border: `1px solid ${useCustom ? LIME + '66' : BORDER}`, borderRadius: 12, background: useCustom ? '#0F1A00' : CARD2, color: useCustom ? LIME : MUTED, fontWeight: 900, fontSize: 13, cursor: 'pointer' }}>
                  Autre
                </button>
              </div>
              {useCustom && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="number" placeholder="Ex : 50" value={customDur}
                    onChange={e => setCustomDur(e.target.value)}
                    style={{ flex: 1, padding: '13px 14px', background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 14, color: WHITE, fontSize: 15, outline: 'none', fontWeight: 900 }} />
                  <span style={{ color: MUTED, fontSize: 13, fontWeight: 700 }}>minutes</span>
                </div>
              )}
            </section>

            {/* Intensité */}
            <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 22, padding: '18px 20px', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.08em', marginBottom: 14 }}>INTENSITÉ RESSENTIE</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {INTENSITIES.map(({ id, label, desc }) => (
                  <button key={id} onClick={() => setIntensity(id)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', border: `1px solid ${intensity === id ? LIME + '66' : BORDER}`, borderRadius: 16, background: intensity === id ? '#0F1A00' : CARD2, color: WHITE, cursor: 'pointer', textAlign: 'left' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: intensity === id ? LIME : WHITE }}>{label}</div>
                      <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{desc}</div>
                    </div>
                    {intensity === id && <Check size={16} color={LIME} strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </section>

            {/* Note optionnelle */}
            <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 22, padding: '18px 20px', marginBottom: 22 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.08em', marginBottom: 12 }}>
                NOTE <span style={{ color: '#333' }}>OPTIONNEL</span>
              </div>
              <textarea value={note} onChange={e => setNote(e.target.value)}
                placeholder="Ex : bonne séance, légère douleur genou..."
                maxLength={280} rows={2}
                style={{ width: '100%', boxSizing: 'border-box', background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '13px 14px', color: WHITE, fontSize: 13, resize: 'none', outline: 'none', font: 'inherit' }} />
            </section>

            <button onClick={save} disabled={!canSave || saving}
              style={{ width: '100%', padding: 18, border: 0, borderRadius: 18, background: canSave ? LIME : '#1A1A1A', color: canSave ? '#0A0A0A' : MUTED, fontWeight: 1000, fontSize: 15, cursor: canSave ? 'pointer' : 'not-allowed', transition: 'all .2s' }}>
              {saving ? 'ENREGISTREMENT...' : 'ENREGISTRER MON ACTIVITÉ'}
            </button>
            {!canSave && (
              <div style={{ marginTop: 10, textAlign: 'center', fontSize: 11, color: MUTED }}>
                Choisis une durée et une intensité pour valider.
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
