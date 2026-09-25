import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from './Home';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { ArrowLeft, Check } from 'lucide-react';

const ACCENT = '#C8FF00';
const BG     = '#F7F8F4';
const WHITE  = '#FFFFFF';
const BLACK  = '#0B0B0B';
const MUTED  = '#7A7F76';
const BORDER = '#E8EAE4';
const LIME   = '#F0FFD0';

const FEATURES_FREE = [
  'Journal alimentaire (calories, macros, eau)',
  'Suivi du poids et mensurations',
  'Programme d\'entraînement basique',
  'Habitudes et récupération',
  'Progrès et historique',
];

const FEATURES_PRO = [
  'Tout NOX Free inclus',
  'NOX Future — projection IA',
  'Scanner repas par photo IA',
  'Idées repas personnalisées IA',
  'Programme généré par IA',
  'Coach NOX — ET MAINTENANT ?',
  'Adaptations intelligentes',
  'Bilan hebdomadaire IA',
];

const FEATURES_PRO_PLUS = [
  'Tout NOX Pro inclus',
  'Analyses longitudinales avancées',
  'Analyse photo de progression IA',
  'Rapports mensuels approfondis',
  'Fonctions avancées NOX Future',
  'Quotas IA étendus',
];

export default function Subscribe() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const [selected, setSelected] = useState<'pro' | 'pro_plus'>('pro');
  const [loading, setLoading] = useState(false);

  const startTrial = async () => {
    if (!user) return;
    setLoading(true);
    const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('profiles').update({
      subscription_plan: selected,
      trial_ends_at: trialEnd,
    }).eq('id', user.id);
    setLoading(false);
    navigate('/home');
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, color: BLACK, paddingBottom: 110 }}>
      <div style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>

        <header style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <button onClick={() => navigate(-1)} style={{ width: 40, height: 40, borderRadius: 14, border: `1px solid ${BORDER}`, background: WHITE, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.1em' }}>ABONNEMENT</div>
          </div>
        </header>

        <main style={{ padding: '0 20px' }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 36, fontWeight: 950, letterSpacing: '-.05em', lineHeight: .95 }}>
            NOX PRO.
          </h1>
          <p style={{ margin: '0 0 28px', fontSize: 14, color: MUTED, lineHeight: 1.5 }}>
            Ta transformation, encore plus personnelle.
          </p>

          {/* Toggle mensuel / annuel */}
          <div style={{ display: 'flex', background: '#ECEEE8', borderRadius: 16, padding: 4, marginBottom: 24 }}>
            {(['monthly', 'annual'] as const).map(b => (
              <button key={b} onClick={() => setBilling(b)} style={{
                flex: 1, padding: '11px 0', borderRadius: 12, border: 0,
                background: billing === b ? BLACK : 'transparent',
                color: billing === b ? ACCENT : MUTED,
                fontSize: 12, fontWeight: 850, cursor: 'pointer',
              }}>
                {b === 'monthly' ? 'Mensuel' : 'Annuel'}{b === 'annual' && billing === 'annual' ? ' · -30%' : ''}
              </button>
            ))}
          </div>

          {/* NOX Free */}
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 950, color: BLACK }}>NOX Free</div>
              <div style={{ fontSize: 20, fontWeight: 950, color: BLACK }}>0 €</div>
            </div>
            {FEATURES_FREE.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                <Check size={14} color={MUTED} />
                <span style={{ fontSize: 12, color: MUTED }}>{f}</span>
              </div>
            ))}
          </div>

          {/* NOX Pro */}
          <button onClick={() => setSelected('pro')} style={{
            width: '100%', background: selected === 'pro' ? BLACK : WHITE,
            border: `2px solid ${selected === 'pro' ? ACCENT : BORDER}`,
            borderRadius: 20, padding: 20, marginBottom: 12, textAlign: 'left', cursor: 'pointer',
            boxSizing: 'border-box',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ fontSize: 18, fontWeight: 950, color: selected === 'pro' ? WHITE : BLACK }}>NOX Pro</div>
                  <div style={{ background: ACCENT, borderRadius: 8, padding: '2px 8px', fontSize: 9, fontWeight: 900, color: BLACK }}>RECOMMANDÉ</div>
                </div>
                <div style={{ fontSize: 11, color: selected === 'pro' ? MUTED : MUTED }}>Essai 30 jours gratuit</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 950, color: selected === 'pro' ? WHITE : BLACK }}>
                  {billing === 'annual' ? '4,99 €' : '6,99 €'}
                </div>
                <div style={{ fontSize: 10, color: MUTED }}>/ mois</div>
              </div>
            </div>
            {FEATURES_PRO.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
                <Check size={14} color={selected === 'pro' ? ACCENT : '#69B578'} />
                <span style={{ fontSize: 12, color: selected === 'pro' ? '#ccc' : BLACK }}>{f}</span>
              </div>
            ))}
          </button>

          {/* NOX Pro+ */}
          <button onClick={() => setSelected('pro_plus')} style={{
            width: '100%', background: selected === 'pro_plus' ? BLACK : WHITE,
            border: `2px solid ${selected === 'pro_plus' ? ACCENT : BORDER}`,
            borderRadius: 20, padding: 20, marginBottom: 24, textAlign: 'left', cursor: 'pointer',
            boxSizing: 'border-box',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 950, color: selected === 'pro_plus' ? WHITE : BLACK, marginBottom: 4 }}>NOX Pro+</div>
                <div style={{ fontSize: 11, color: MUTED }}>Essai 30 jours gratuit</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 950, color: selected === 'pro_plus' ? WHITE : BLACK }}>
                  {billing === 'annual' ? '7,49 €' : '9,99 €'}
                </div>
                <div style={{ fontSize: 10, color: MUTED }}>/ mois</div>
              </div>
            </div>
            {FEATURES_PRO_PLUS.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
                <Check size={14} color={selected === 'pro_plus' ? ACCENT : '#69B578'} />
                <span style={{ fontSize: 12, color: selected === 'pro_plus' ? '#ccc' : BLACK }}>{f}</span>
              </div>
            ))}
          </button>

          {/* CTA */}
          <button onClick={startTrial} disabled={loading}
            style={{ width: '100%', padding: 18, background: ACCENT, border: 0, borderRadius: 18, color: BLACK, fontWeight: 950, fontSize: 15, cursor: 'pointer', marginBottom: 16 }}>
            {loading ? 'CHARGEMENT...' : `ESSAYER NOX ${selected === 'pro' ? 'PRO' : 'PRO+'} 30 JOURS`}
          </button>

          <div style={{ textAlign: 'center', fontSize: 11, color: MUTED, lineHeight: 1.6, marginBottom: 20 }}>
            Sans engagement. Tu peux annuler à tout moment.<br />
            Le paiement réel sera intégré prochainement via Stripe.
          </div>

          {/* Légal */}
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, fontSize: 11, color: MUTED, lineHeight: 1.6 }}>
            En continuant, tu acceptes que l'abonnement se renouvelle automatiquement au tarif indiqué. Tu peux gérer ton abonnement depuis la page Profil. Les prix sont en euros TTC.
          </div>
        </main>
      </div>
      <BottomNav active="moi" />
    </div>
  );
}
