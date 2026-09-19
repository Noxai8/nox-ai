import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const NOX_GREEN = '#c8ff00';

function NoxSymbol() {
  return (
    <svg
      width="46"
      height="36"
      viewBox="0 0 64 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="7"
        y="8"
        width="25"
        height="13"
        rx="6.5"
        transform="rotate(23 7 8)"
        fill="currentColor"
      />

      <rect
        x="22"
        y="27"
        width="40"
        height="14"
        rx="7"
        transform="rotate(-8 22 27)"
        fill="currentColor"
      />
    </svg>
  );
}

export default function Landing() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        width: '100%',
        background: NOX_GREEN,
        color: '#080808',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* HEADER */}
      <header
        style={{
          width: '100%',
          padding: '24px 24px 0',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Link
            to="/"
            aria-label="NOX AI"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 11,
              color: '#080808',
              textDecoration: 'none',
            }}
          >
            <NoxSymbol />

            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 6,
              }}
            >
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 950,
                  letterSpacing: '-0.06em',
                  lineHeight: 1,
                }}
              >
                NOX
              </span>

              <span
                style={{
                  fontSize: 10,
                  fontWeight: 850,
                  letterSpacing: '0.12em',
                  lineHeight: 1,
                  opacity: 0.65,
                }}
              >
                AI
              </span>
            </div>
          </Link>

          <Link
            to="/login"
            style={{
              color: '#080808',
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.05em',
            }}
          >
            CONNEXION
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          padding: '48px 24px 38px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 1200,
            margin: '0 auto',
          }}
        >
          <div
            style={{
              maxWidth: 760,
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 24,
                padding: '8px 12px',
                border: '1px solid rgba(0,0,0,.15)',
                borderRadius: 999,
                background: 'rgba(255,255,255,.16)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#080808',
                }}
              />

              <span
                style={{
                  fontSize: 10,
                  fontWeight: 850,
                  letterSpacing: '0.12em',
                }}
              >
                COACHING PERSONNALISÉ PAR IA
              </span>
            </div>

            <h1
              style={{
                margin: 0,
                maxWidth: 700,
                fontSize: 'clamp(52px, 8vw, 106px)',
                lineHeight: 0.88,
                letterSpacing: '-0.075em',
                fontWeight: 950,
                textTransform: 'uppercase',
              }}
            >
              CONÇU POUR
              <br />
              TOI.
              <br />
              PENSÉ POUR
              <br />
              PROGRESSER.
            </h1>

            <p
              style={{
                margin: '30px 0 0',
                maxWidth: 520,
                fontSize: 'clamp(16px, 2vw, 20px)',
                lineHeight: 1.5,
                letterSpacing: '-0.02em',
                fontWeight: 550,
                color: 'rgba(0,0,0,.68)',
              }}
            >
              Ton entraînement, ta nutrition et ta progression réunis
              dans un seul coach qui s&apos;adapte réellement à toi.
            </p>

            <div
              style={{
                marginTop: 36,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <Link
                to="/register"
                style={{
                  minHeight: 58,
                  padding: '0 24px',
                  borderRadius: 16,
                  background: '#080808',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 14,
                  fontSize: 13,
                  fontWeight: 900,
                  letterSpacing: '0.04em',
                  boxShadow: '0 16px 40px rgba(0,0,0,.14)',
                }}
              >
                COMMENCER
                <ArrowRight size={18} strokeWidth={2.4} />
              </Link>

              <Link
                to="/login"
                style={{
                  minHeight: 58,
                  padding: '0 24px',
                  borderRadius: 16,
                  border: '1.5px solid rgba(0,0,0,.38)',
                  color: '#080808',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 900,
                  letterSpacing: '0.04em',
                  background: 'rgba(255,255,255,.08)',
                }}
              >
                J&apos;AI DÉJÀ UN COMPTE
              </Link>
            </div>

            <p
              style={{
                margin: '18px 0 0',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.02em',
                color: 'rgba(0,0,0,.48)',
              }}
            >
              30 jours gratuits · Sans carte bancaire
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          padding: '0 24px 24px',
          width: '100%',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            paddingTop: 18,
            borderTop: '1px solid rgba(0,0,0,.12)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 850,
              letterSpacing: '0.12em',
              opacity: 0.46,
            }}
          >
            TRAIN · EAT · PROGRESS
          </span>

          <span
            style={{
              fontSize: 10,
              fontWeight: 850,
              letterSpacing: '0.12em',
              opacity: 0.46,
            }}
          >
            NOX AI
          </span>
        </div>
      </footer>
    </main>
  );
}
