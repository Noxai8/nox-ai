import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { todayLocalDate } from '../lib/localDate';

type Completion = 'yes' | 'partial' | 'no';

const BG    = '#0A0A0A';
const CARD  = '#111111';
const CARD2 = '#161616';
const WHITE = '#FFFFFF';
const LIME  = '#C8FF00';
const MUTED = '#666666';
const BORDER= '#1E1E1E';

const COMPLETIONS: { id: Completion; label: string }[] = [
  { id: 'yes',     label: 'Oui' },
  { id: 'partial', label: 'En partie' },
  { id: 'no',      label: 'Non' },
];

const FEELINGS = ['😫', '😕', '😐', '🙂', '😄'];

const NOX_FEEDBACK: Record<Completion, string> = {
  yes:     'Journée enregistrée. Une journée de plus pour mieux te comprendre.',
  partial: 'Journée enregistrée. L\'important est d\'avancer, même partiellement.',
  no:      'Journée enregistrée. Une mauvaise journée reste une donnée utile.',
};

export default function Closure() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();

  // Priorité passée depuis Home via navigation state
  const priorityTitle  = (location.state as any)?.priorityTitle  ?? null;
  const priorityType   = (location.state as any)?.priorityType   ?? 'none';
  const alreadyClosed  = (location.state as any)?.alreadyClosed  ?? false;

  const [completion, setCompletion] = useState<Completion | null>(null);
  const [feeling,    setFeeling]    = useState<number | null>(null);
  const [note,       setNote]       = useState('');
  const [saving,     setSaving]     = useState(false);
  const [saveError,  setSaveError]  = useState('');
  const [saved,      setSaved]      = useState(false);
  const [existing,   setExisting]   = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('daily_closures')
      .select('completion, evening_energy, note')
      .eq('user_id', user.id)
      .eq('date', todayLocalDate())
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExisting(data);
          setCompletion(data.completion as Completion);
          setFeeling(data.evening_energy);
          setNote(data.note ?? '');
        }
      });
  }, [user]);

  const canSave = completion !== null;

  const save = async () => {
    if (!user || !canSave || saving) return;
    setSaving(true);
    setSaveError('');
    try {
      const { error } = await supabase.from('daily_closures').upsert({
        user_id:        user.id,
        date:           todayLocalDate(),
        priority_type:  priorityType,
        completion,
        evening_energy: feeling,
        note:           note.trim() || null,
      }, { onConflict: 'user_id,date' });
      if (error) {
        console.error('daily_closures:', error);
        setSaveError('Ta journée n’a pas pu être enregistrée. Vérifie ta connexion et réessaie.');
      } else setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  // Écran confirmation
  if (saved) {
    return (
      <div style={{ minHeight: '100vh', background: BG, color: WHITE, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 28px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#0F1A00', border: `2px solid ${LIME}`, display: 'grid', placeItems: 'center', marginBottom: 24 }}>
          <Check size={28} color={LIME} strokeWidth={3} />
        </div>
        <div style={{ fontSize: 10, fontWeight: 900, color: LIME, letterSpacing: '.1em', marginBottom: 10 }}>JOURNÉE CLÔTURÉE</div>
        <div style={{ fontSize: 24, fontWeight: 1000, letterSpacing: '-.04em', marginBottom: 14 }}>
          {completion === 'yes' ? 'Bien joué.' : completion === 'partial' ? 'Noté.' : 'C\'est enregistré.'}
        </div>
        <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, marginBottom: 36, maxWidth: 320 }}>
          {NOX_FEEDBACK[completion!]}
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
        <header style={{ paddingTop: 52, paddingBottom: 28, display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => navigate(-1)}
            style={{ width: 40, height: 40, borderRadius: 14, border: `1px solid ${BORDER}`, background: CARD, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <ArrowLeft size={18} color={WHITE} />
          </button>
          <div>
            <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.1em', marginBottom: 3 }}>
              {existing ? 'MODIFIER LA CLÔTURE' : 'CLÔTURE DE JOURNÉE'}
            </div>
            <div style={{ fontSize: 22, fontWeight: 1000, letterSpacing: '-.04em' }}>
              Ta journée touche à sa fin.
            </div>
          </div>
        </header>

        {/* Priorité du jour */}
        {priorityTitle && priorityType !== 'none' && (
          <div style={{ background: '#0F1A00', border: `1px solid #3A5200`, borderRadius: 20, padding: '14px 16px', marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: LIME, letterSpacing: '.08em', marginBottom: 6 }}>TA PRIORITÉ DU JOUR</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: WHITE }}>{priorityTitle}</div>
          </div>
        )}

        {/* As-tu accompli ta priorité ? */}
        <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 22, padding: '18px 20px', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.08em', marginBottom: 14 }}>
            {priorityType !== 'none' ? 'AS-TU ACCOMPLI TA PRIORITÉ ?' : 'COMMENT S\'EST PASSÉE TA JOURNÉE ?'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {COMPLETIONS.map(({ id, label }) => (
              <button key={id} onClick={() => setCompletion(id)}
                style={{ padding: '15px 8px', border: `1px solid ${completion === id ? LIME + '66' : BORDER}`, borderRadius: 16, background: completion === id ? '#0F1A00' : CARD2, color: completion === id ? LIME : MUTED, fontWeight: 1000, fontSize: 13, cursor: 'pointer', transition: 'all .15s' }}>
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Ressenti */}
        <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 22, padding: '18px 20px', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.08em', marginBottom: 14 }}>
            COMMENT TE SENS-TU ?
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {FEELINGS.map((emoji, i) => (
              <button key={i} onClick={() => setFeeling(feeling === i + 1 ? null : i + 1)}
                style={{ fontSize: 28, padding: '12px 0', border: `1px solid ${feeling === i + 1 ? LIME + '66' : BORDER}`, borderRadius: 16, background: feeling === i + 1 ? '#0F1A00' : CARD2, cursor: 'pointer', transition: 'all .15s' }}>
                {emoji}
              </button>
            ))}
          </div>
        </section>

        {/* Note optionnelle */}
        <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 22, padding: '18px 20px', marginBottom: 22 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.08em', marginBottom: 12 }}>
            QUELQUE CHOSE À AJOUTER ? <span style={{ color: '#333' }}>OPTIONNEL</span>
          </div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Ex : Journée productive, bonne séance..."
            maxLength={280}
            rows={3}
            style={{ width: '100%', boxSizing: 'border-box', background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '13px 14px', color: WHITE, fontSize: 13, resize: 'none', outline: 'none', font: 'inherit' }}
          />
        </section>

        {/* CTA */}
        <button onClick={save} disabled={!canSave || saving}
          style={{ width: '100%', padding: 18, border: 0, borderRadius: 18, background: canSave ? LIME : '#1A1A1A', color: canSave ? '#0A0A0A' : MUTED, fontWeight: 1000, fontSize: 15, cursor: canSave ? 'pointer' : 'not-allowed', transition: 'all .2s' }}>
          {saving ? 'ENREGISTREMENT...' : 'TERMINER MA JOURNÉE'}
        </button>
        {saveError && (
          <div role="alert" style={{ marginTop: 12, textAlign: 'center', color: '#E9C2C2', fontSize: 13, lineHeight: 1.5 }}>{saveError}</div>
        )}

        {!canSave && (
          <div style={{ marginTop: 10, textAlign: 'center', fontSize: 11, color: MUTED }}>
            Indique si tu as accompli ta priorité pour valider.
          </div>
        )}

      </div>
    </div>
  );
}
