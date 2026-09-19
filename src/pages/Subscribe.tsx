import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';

const ACCENT = '#B7FF00';
const BG = '#F7F7F7';
const SURFACE = '#FFFFFF';
const BORDER = '#EAEAEA';

const PLANS = [
  {
    id: 'nox',
    name: 'NOX',
    monthly: 'Gratuit',
    annual: 'Gratuit',
    annualMonthly: 'Gratuit',
    color: '#0A0A0A',
    features: ['Suivi quotidien', 'Journal nutrition essentiel', 'Calories & macros', 'Poids & hydratation', 'Activité de base', 'Training & progrès essentiels'],
  },
  {
    id: 'plus',
    name: 'NOX+',
    monthly: 'À venir',
    annual: 'À venir',
    annualMonthly: 'À venir',
    color: ACCENT,
    badge: 'PLUS COMPLET',
    features: ['Tout NOX inclus', 'Scan nourriture avancé', 'Analyses longue durée', 'Meal Planner avancé', 'Training & statistiques avancés', 'Synthèses personnalisées', 'Fonctions premium selon intégrations disponibles'],
  },
];

export default function Subscribe() {
  const navigate = useNavigate();
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const [selected, setSelected] = useState('plus');

  const plan = PLANS.find(p => p.id === selected)!;

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ padding: '40px 24px 24px', textAlign: 'center', borderBottom: '1px solid ' + BORDER }}>
        <button onClick={() => navigate(-1)} style={{ position: 'absolute', top: 24, left: 20, background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14 }}>← Retour</button>
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.15em', marginBottom: 8 }}>Passe au niveau supérieur</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#0A0A0A', letterSpacing: '-.02em' }}>CHOISIS TON EXPÉRIENCE NOX</div>
        <div style={{ fontSize: 14, color: ACCENT, marginTop: 8, fontWeight: 700 }}>NOX reste utile gratuitement · NOX+ ajoute les fonctions avancées</div>
      </div>

      {/* Billing toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 24px' }}>
        <div style={{ display: 'flex', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: 4, gap: 4 }}>
          {(['monthly', 'annual'] as const).map(b => (
            <button key={b} onClick={() => setBilling(b)}
              style={{ padding: '8px 20px', borderRadius: 10, background: billing === b ? ACCENT : 'transparent', border: 'none', color: billing === b ? '#000' : '#555', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
              {b === 'monthly' ? 'Mensuel' : 'Annuel'}
            </button>
          ))}
        </div>
      </div>

      {/* Plans */}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {PLANS.map(p => (
          <div key={p.id} onClick={() => setSelected(p.id)}
            style={{ background: SURFACE, border: '2px solid ' + (selected === p.id ? p.color : BORDER), borderRadius: 20, padding: 20, cursor: 'pointer', position: 'relative', transition: 'border-color .2s' }}>
            {p.badge && (
              <div style={{ position: 'absolute', top: -10, right: 16, background: p.color, color: '#000', borderRadius: 20, padding: '4px 14px', fontSize: 11, fontWeight: 900 }}>{p.badge}</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid ' + (selected === p.id ? p.color : '#333'), background: selected === p.id ? p.color : 'transparent', marginBottom: 8 }} />
                <div style={{ fontSize: 20, fontWeight: 900, color: p.color }}>{p.name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#0A0A0A' }}>{billing === 'annual' ? p.annualMonthly : p.monthly}</div>
                <div style={{ fontSize: 11, color: '#555' }}>{p.id === 'nox' ? 'accès essentiel' : 'tarification à confirmer'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {p.features.map(f => (
                <div key={f} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: p.color, fontSize: 14 }}>✓</span>
                  <span style={{ fontSize: 13, color: '#444' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ padding: '24px 20px' }}>
        <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: 16, marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#0A0A0A' }}>{plan.name}</div>
          <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
            <>{plan.id === 'nox' ? 'Le suivi essentiel reste accessible gratuitement.' : 'Les fonctions avancées NOX+ seront activées avec une tarification confirmée avant commercialisation.'}</>
          </div>
        </div>

        <button onClick={() => navigate(plan.id === 'nox' ? '/home' : '/settings')}
          style={{ width: '100%', padding: 18, background: ACCENT, border: 'none', borderRadius: 16, color: '#000', fontWeight: 900, fontSize: 16, cursor: 'pointer', marginBottom: 12 }}>
          {plan.id === 'nox' ? 'CONTINUER AVEC NOX' : 'RETOUR AUX PARAMÈTRES'}
        </button>

        <div style={{ fontSize: 11, color: '#333', textAlign: 'center', lineHeight: 1.6 }}>
          Aucun paiement n’est déclenché depuis cet écran. La tarification, le checkout et le renouvellement NOX+ seront connectés avant commercialisation.
        </div>
      </div>
      <BottomNav active="settings" />
    </div>
  );
}
