import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

import { supabase } from '../lib/supabase';

const NOX_GREEN = '#B7FF00';

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Remplis tous les champs.');
      return;
    }

    setLoading(true);
    setError('');

    const { data, error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (err) {
      if (err.message.toLowerCase().includes('email not confirmed')) {
        setError(
          'Ton adresse email n’est pas encore confirmée. Vérifie ta boîte mail avant de te connecter.'
        );
      } else {
        setError(err.message);
      }

      setLoading(false);
      return;
    }

    // Vérifier si l'onboarding NOX est terminé
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        'Erreur lors de la vérification du profil NOX :',
        profileError
      );

      // En cas de doute, on envoie vers l'onboarding
      // plutôt que de laisser passer un profil incomplet.
      navigate('/onboarding');
      return;
    }

    navigate(
      profile?.onboarding_completed === true
        ? '/home'
        : '/onboarding'
    );
  };

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: '#FFFFFF',
        color: '#0A0A0A',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background details */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -180,
          right: -180,
          width: 420,
          height: 420,
          borderRadius: '50%',
          background: NOX_GREEN,
          opacity: 0.08,
          filter: 'blur(20px)',
          pointerEvents: 'none',
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: -220,
          left: -180,
          width: 440,
          height: 440,
          borderRadius: '50%',
          background: NOX_GREEN,
          opacity: 0.05,
          filter: 'blur(30px)',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <header
        style={{
          width: '100%',
          padding: '24px 24px 0',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 1100,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link
            to="/"
            aria-label="Retour à l'accueil NOX AI"
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
            }}
          >
            <span
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: '#c8ff00',
                letterSpacing: '.1em',
              }}
            >
              NOX
            </span>
          </Link>

          <Link
            to="/register"
            style={{
              color: '#0A0A0A',
              fontSize: 12,
              fontWeight: 800,
              textDecoration: 'none',
              letterSpacing: '0.04em',
            }}
          >
            CRÉER UN COMPTE
          </Link>
        </div>
      </header>

      {/* Content */}
      <section
        style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 20px 40px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 430,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 20,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: NOX_GREEN,
              }}
            />

            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.12em',
                color: '#777777',
              }}
            >
              CONTENT DE TE REVOIR
            </span>
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(42px, 8vw, 58px)',
              lineHeight: 0.96,
              letterSpacing: '-0.055em',
              fontWeight: 950,
              color: '#0A0A0A',
            }}
          >
            BON
            <br />
            RETOUR.
          </h1>

          <p
            style={{
              margin: '16px 0 0',
              fontSize: 15,
              lineHeight: 1.6,
              color: '#717171',
              fontWeight: 500,
              maxWidth: 350,
            }}
          >
            Reprends exactement là où tu t’étais arrêté.
          </p>

          {error && (
            <div
              role="alert"
              style={{
                marginTop: 24,
                padding: '14px 16px',
                borderRadius: 14,
                background: '#FFF3F2',
                border: '1px solid #FFD0CD',
                color: '#D92D20',
                fontSize: 13,
                fontWeight: 650,
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              marginTop: 30,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                style={{
                  display: 'block',
                  marginBottom: 8,
                  fontSize: 11,
                  fontWeight: 850,
                  letterSpacing: '0.08em',
                  color: '#787878',
                }}
              >
                EMAIL
              </label>

              <input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                placeholder="ton@email.com"
                style={{
                  width: '100%',
                  height: 58,
                  padding: '0 17px',
                  boxSizing: 'border-box',
                  background: '#F8F8F8',
                  border: '1px solid #E8E8E8',
                  borderRadius: 16,
                  fontSize: 15,
                  fontWeight: 550,
                  color: '#0A0A0A',
                  outline: 'none',
                  transition:
                    'border-color 160ms ease, box-shadow 160ms ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#0A0A0A';
                  e.currentTarget.style.boxShadow =
                    '0 0 0 3px rgba(183, 255, 0, 0.18)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#E8E8E8';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Password */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <label
                  htmlFor="password"
                  style={{
                    fontSize: 11,
                    fontWeight: 850,
                    letterSpacing: '0.08em',
                    color: '#787878',
                  }}
                >
                  MOT DE PASSE
                </label>
              </div>

              <div
                style={{
                  position: 'relative',
                }}
              >
                <input
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Ton mot de passe"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleLogin();
                    }
                  }}
                  style={{
                    width: '100%',
                    height: 58,
                    padding: '0 54px 0 17px',
                    boxSizing: 'border-box',
                    background: '#F8F8F8',
                    border: '1px solid #E8E8E8',
                    borderRadius: 16,
                    fontSize: 15,
                    fontWeight: 550,
                    color: '#0A0A0A',
                    outline: 'none',
                    transition:
                      'border-color 160ms ease, box-shadow 160ms ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#0A0A0A';
                    e.currentTarget.style.boxShadow =
                      '0 0 0 3px rgba(183, 255, 0, 0.18)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#E8E8E8';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((value) => !value)
                  }
                  aria-label={
                    showPassword
                      ? 'Masquer le mot de passe'
                      : 'Afficher le mot de passe'
                  }
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 42,
                    height: 42,
                    border: 'none',
                    borderRadius: 12,
                    background: 'transparent',
                    color: '#8A8A8A',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showPassword ? (
                    <EyeOff size={19} strokeWidth={2} />
                  ) : (
                    <Eye size={19} strokeWidth={2} />
                  )}
                </button>
              </div>
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              style={{
                width: '100%',
                minHeight: 60,
                border: 'none',
                borderRadius: 16,
                padding: '0 18px',
                marginTop: 6,
                background: loading ? '#DDFE73' : NOX_GREEN,
                color: '#080808',
                fontSize: 13,
                fontWeight: 950,
                letterSpacing: '0.045em',
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 14px 34px rgba(183,255,0,.2)',
                transition:
                  'transform 150ms ease, box-shadow 150ms ease, opacity 150ms ease',
                opacity: loading ? 0.75 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform =
                    'translateY(-1px)';
                  e.currentTarget.style.boxShadow =
                    '0 18px 40px rgba(183,255,0,.28)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform =
                  'translateY(0)';
                e.currentTarget.style.boxShadow =
                  '0 14px 34px rgba(183,255,0,.2)';
              }}
            >
              <span>
                {loading ? 'CONNEXION...' : 'SE CONNECTER'}
              </span>

              {!loading && (
                <ArrowRight size={19} strokeWidth={2.4} />
              )}
            </button>
          </div>

          <div
            style={{
              margin: '26px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                flex: 1,
                height: 1,
                background: '#EEEEEE',
              }}
            />

            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: '#AAAAAA',
                letterSpacing: '0.08em',
              }}
            >
              NOX AI
            </span>

            <div
              style={{
                flex: 1,
                height: 1,
                background: '#EEEEEE',
              }}
            />
          </div>

          <p
            style={{
              margin: 0,
              textAlign: 'center',
              fontSize: 13,
              color: '#7B7B7B',
              lineHeight: 1.5,
            }}
          >
            Pas encore de compte ?{' '}
            <Link
              to="/register"
              style={{
                color: '#0A0A0A',
                textDecoration: 'none',
                fontWeight: 850,
                borderBottom: `2px solid ${NOX_GREEN}`,
                paddingBottom: 2,
              }}
            >
              Créer un compte
            </Link>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          width: '100%',
          padding: '0 24px 22px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            paddingTop: 18,
            borderTop: '1px solid #F0F0F0',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              color: '#B4B4B4',
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.12em',
            }}
          >
            CONÇU POUR TOI · PENSÉ POUR PROGRESSER
          </span>
        </div>
      </footer>
    </main>
  );
}
