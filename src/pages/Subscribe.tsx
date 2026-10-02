import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BottomNav } from './Home';
import { ArrowLeft, Check } from 'lucide-react';

const ACCENT = '#C8FF00';
const BG     = '#090B0A';
const CARD   = '#232624';
const CARD_2 = '#191C1A';
const WHITE  = '#FFFFFF';
const BLACK  = '#0B0B0B';
const MUTED  = '#A5AAA6';
const BORDER = '#4A4F4B';

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
  'Coach NOX',
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
  const navigate = useNavigate();
  const location = useLocation();

  const routeState = (location.state as any) || {};
  const onboardingFlow = Boolean(routeState.onboardingFlow);

  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const [selected, setSelected] = useState<'pro' | 'pro_plus'>('pro');

  const proPrice = billing === 'annual' ? '4,99 €' : '6,99 €';
  const proPlusPrice = billing === 'annual' ? '7,49 €' : '9,99 €';

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: BG,
        color: WHITE,
        paddingBottom: onboardingFlow
          ? 40
          : 'calc(160px + env(safe-area-inset-bottom))',
      }}
    >
      <div style={{ width: '100%', maxWidth: 760, margin: '0 auto' }}>
        <header
          style={{
            padding: '30px 16px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 28,
          }}
        >
          <button
            onClick={() => navigate(-1)}
            aria-label="Retour"
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              border: `1px solid ${BORDER}`,
              background: CARD,
              color: WHITE,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={18} />
          </button>

          <div
            style={{
              fontSize: 10,
              fontWeight: 900,
              color: MUTED,
              letterSpacing: '.1em',
            }}
          >
            ABONNEMENT
          </div>
        </header>

        <main style={{ padding: '0 16px' }}>
          <h1
            style={{
              margin: '0 0 8px',
              fontSize: 'clamp(34px,5vw,46px)',
              fontWeight: 850,
              letterSpacing: '-.04em',
              lineHeight: .98,
            }}
          >
            NOX PRO<span style={{ color: ACCENT }}>.</span>
          </h1>

          <p
            style={{
              margin: '0 0 28px',
              fontSize: 14,
              color: MUTED,
              lineHeight: 1.5,
            }}
          >
            Plus de personnalisation avec les fonctions IA de NOX.
          </p>

          <div
            style={{
              display: 'flex',
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 16,
              padding: 4,
              marginBottom: 24,
            }}
          >
            {(['monthly', 'annual'] as const).map((b) => {
              const active = billing === b;
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBilling(b)}
                  style={{
                    flex: 1,
                    padding: '11px 0',
                    borderRadius: 12,
                    border: 0,
                    background: active ? ACCENT : 'transparent',
                    color: active ? BLACK : MUTED,
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  {b === 'monthly' ? 'Mensuel' : 'Annuel'}
                  {b === 'annual' && active ? ' · -30%' : ''}
                </button>
              );
            })}
          </div>

          <section
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 20,
              padding: 20,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 950 }}>NOX Free</div>
              <div style={{ fontSize: 20, fontWeight: 950 }}>0 €</div>
            </div>

            {FEATURES_FREE.map((f) => (
              <div
                key={f}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 0',
                }}
              >
                <Check size={14} color={MUTED} />
                <span style={{ fontSize: 12, color: MUTED }}>{f}</span>
              </div>
            ))}
          </section>

          <button
            type="button"
            onClick={() => setSelected('pro')}
            style={{
              width: '100%',
              background: CARD,
              border: `1px solid ${selected === 'pro' ? ACCENT : BORDER}`,
              borderRadius: 20,
              padding: 20,
              marginBottom: 12,
              textAlign: 'left',
              cursor: 'pointer',
              boxSizing: 'border-box',
              color: WHITE,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 16,
                marginBottom: 16,
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 4,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 950 }}>NOX Pro</div>
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 950 }}>{proPrice}</div>
                <div style={{ fontSize: 10, color: MUTED }}>/ mois</div>
              </div>
            </div>

            {FEATURES_PRO.map((f) => (
              <div
                key={f}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '5px 0',
                }}
              >
                <Check size={14} color={ACCENT} />
                <span style={{ fontSize: 12, color: '#A5AAA6' }}>{f}</span>
              </div>
            ))}
          </button>

          <button
            type="button"
            onClick={() => setSelected('pro_plus')}
            style={{
              width: '100%',
              background: CARD,
              border: `1px solid ${selected === 'pro_plus' ? ACCENT : BORDER}`,
              borderRadius: 20,
              padding: 20,
              marginBottom: 24,
              textAlign: 'left',
              cursor: 'pointer',
              boxSizing: 'border-box',
              color: WHITE,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 16,
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 950 }}>NOX Pro+</div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 950 }}>{proPlusPrice}</div>
                <div style={{ fontSize: 10, color: MUTED }}>/ mois</div>
              </div>
            </div>

            {FEATURES_PRO_PLUS.map((f) => (
              <div
                key={f}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '5px 0',
                }}
              >
                <Check size={14} color={ACCENT} />
                <span style={{ fontSize: 12, color: '#A5AAA6' }}>{f}</span>
              </div>
            ))}
          </button>

          <div
            style={{
              background: CARD_2,
              border: `1px solid ${BORDER}`,
              borderRadius: 14,
              padding: '16px 18px',
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 900,
                color: ACCENT,
                letterSpacing: '.07em',
                marginBottom: 6,
              }}
            >
              ABONNEMENTS
            </div>
            <div
              style={{
                fontSize: 13,
                color: '#A5AAA6',
                lineHeight: 1.55,
              }}
            >
              Le paiement n’est pas encore disponible dans cette version.
              Aucun abonnement ne sera activé depuis cet écran.
            </div>
          </div>

          <button
            type="button"
            disabled
            style={{
              width: '100%',
              padding: 18,
              background: '#191C1A',
              border: `1px solid ${BORDER}`,
              borderRadius: 14,
              color: '#747A76',
              fontWeight: 950,
              fontSize: 15,
              cursor: 'not-allowed',
              marginBottom: 16,
            }}
          >
            NOX {selected === 'pro' ? 'PRO' : 'PRO+'} — BIENTÔT DISPONIBLE
          </button>

          <div
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 16,
              padding: 16,
              fontSize: 11,
              color: MUTED,
              lineHeight: 1.6,
            }}
          >
            Les prix affichés sont en euros TTC. Les conditions d’abonnement,
            de renouvellement et d’annulation seront affichées lors de
            l’activation du paiement.
          </div>
        </main>
      </div>

      {!onboardingFlow && <BottomNav active="moi" />}
    </div>
  );
}
