import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  ImagePlus,
  Lock,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#C8FF00';
const BG = '#F7F8F4';
const WHITE = '#FFFFFF';
const BLACK = '#0B0B0B';
const MUTED = '#777D74';
const BORDER = '#E7EAE2';

type Step =
  | 'intro'
  | 'consent'
  | 'photo'
  | 'goal'
  | 'generating'
  | 'result';

export default function NoxFuture() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const onboardingFlow = Boolean(
    (location.state as any)?.onboarding
  );

  const [step, setStep] = useState<Step>(
    onboardingFlow ? 'consent' : 'intro'
  );

  const [profile, setProfile] = useState<any>(null);

  const [photos, setPhotos] = useState<{
    face?: string;
    side?: string;
    back?: string;
  }>({});

  const [angle, setAngle] =
    useState<'face' | 'side' | 'back'>('face');

  const [goal, setGoal] = useState('');
  const [projection, setProjection] = useState<any>(null);
  const [error, setError] = useState('');

  const [credits, setCredits] = useState({
    used: 0,
    max: 1,
    canGenerate: true,
  });

  const [historyLoaded, setHistoryLoaded] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [timerSeconds, setTimerSeconds] =
    useState<0 | 5 | 10>(0);
  const [countdown, setCountdown] =
    useState<number | null>(null);

  const countdownIntervalRef =
    useRef<number | null>(null);

  /* =========================================================
     CHARGEMENT PROFIL + HISTORIQUE
  ========================================================= */

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const loadFuture = async () => {
      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (profileError) {
        console.error(
          'NOX Future : profil indisponible',
          profileError
        );
      }

      setProfile(profileData || null);

      /* CRÉDITS */

      const plan =
        profileData?.subscription_plan || 'free';

      const max =
        (
          {
            free: 1,
            nox: 1,
            pro: 999,
            ultra: 999,
          } as Record<string, number>
        )[plan] || 1;

      const monthStart = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      ).toISOString();

      const {
        data: monthRows,
        error: monthError,
      } = await supabase
        .from('future_you_generations')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', monthStart);

      if (!cancelled) {
        if (monthError) {
          console.warn(
            'NOX Future : crédits indisponibles',
            monthError
          );
        }

        const used = monthRows?.length || 0;

        setCredits({
          used,
          max,
          canGenerate:
            max >= 999 || used < max,
        });
      }

      /* DERNIÈRE PROJECTION */

      const {
        data: latest,
        error: historyError,
      } = await supabase
        .from('future_you_generations')
        .select(
          'id,prompt,projection_text,source_photo_url,generated_image_url,status,created_at'
        )
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (historyError) {
        console.warn(
          'NOX Future : historique indisponible',
          historyError
        );

        setHistoryLoaded(true);
        return;
      }

      if (latest) {
        let restored: any = {};

        if (
          typeof latest.projection_text === 'string' &&
          latest.projection_text.trim()
        ) {
          try {
            restored = JSON.parse(
              latest.projection_text
            );
          } catch {
            restored = {
              message_coach:
                latest.projection_text,
            };
          }
        }

        restored.projected_image =
          latest.generated_image_url ||
          restored.projected_image ||
          restored.image_url ||
          null;

        restored.titre =
          restored.titre ||
          'TON NOX FUTURE';

        restored.tagline =
          restored.tagline ||
          'Une vision possible de ton objectif.';

        restored.message_coach =
          restored.message_coach ||
          'Cette projection est un repère visuel lié à ton objectif.';

        setProjection(restored);

        if (latest.prompt) {
          setGoal(latest.prompt);
        }

        if (latest.source_photo_url) {
          setPhotos({
            face: latest.source_photo_url,
          });
        }

        if (!onboardingFlow) {
          setStep('result');
        }
      }

      setHistoryLoaded(true);
    };

    void loadFuture();

    return () => {
      cancelled = true;
    };
  }, [user, onboardingFlow]);

  /* =========================================================
     NETTOYAGE CAMÉRA
  ========================================================= */

  useEffect(
    () => () => {
      streamRef.current
        ?.getTracks()
        .forEach((track) => track.stop());

      if (countdownIntervalRef.current !== null) {
        window.clearInterval(
          countdownIntervalRef.current
        );
      }
    },
    []
  );

  /* =========================================================
     CAMÉRA
  ========================================================= */

  const stopCamera = () => {
    if (countdownIntervalRef.current !== null) {
      window.clearInterval(
        countdownIntervalRef.current
      );

      countdownIntervalRef.current = null;
    }

    setCountdown(null);

    streamRef.current
      ?.getTracks()
      .forEach((track) => track.stop());

    streamRef.current = null;
    setCameraOpen(false);
  };

  const openCamera = async (
    selectedAngle: 'face' | 'side' | 'back'
  ) => {
    setAngle(selectedAngle);
    setError('');

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: {
              ideal: 1080,
            },
            height: {
              ideal: 1440,
            },
          },
          audio: false,
        });

      streamRef.current = stream;
      setCameraOpen(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          videoRef.current
            .play()
            .catch(() => {});
        }
      }, 50);
    } catch {
      inputRef.current?.click();
    }
  };

  const capture = () => {
    const video = videoRef.current;

    if (!video?.videoWidth) return;

    const canvas =
      document.createElement('canvas');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    canvas
      .getContext('2d')
      ?.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
      );

    setPhotos((current) => ({
      ...current,
      [angle]: canvas.toDataURL(
        'image/jpeg',
        0.86
      ),
    }));

    stopCamera();
  };

  const triggerCapture = () => {
    if (countdown !== null) return;

    if (timerSeconds === 0) {
      capture();
      return;
    }

    let remaining = timerSeconds;

    setCountdown(remaining);

    countdownIntervalRef.current =
      window.setInterval(() => {
        remaining -= 1;

        if (remaining <= 0) {
          if (
            countdownIntervalRef.current !== null
          ) {
            window.clearInterval(
              countdownIntervalRef.current
            );
          }

          countdownIntervalRef.current = null;
          setCountdown(null);
          capture();
        } else {
          setCountdown(remaining);
        }
      }, 1000);
  };

  const importPhoto = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () =>
      setPhotos((current) => ({
        ...current,
        [angle]: String(reader.result),
      }));

    reader.readAsDataURL(file);
    event.target.value = '';
  };

  /* =========================================================
     GÉNÉRATION NOX FUTURE PERSONNALISÉE
  ========================================================= */

  const generate = async () => {
    if (!user || !goal.trim()) return;

    setError('');
    setStep('generating');

    try {
      /*
       * On transmet uniquement des données réellement
       * présentes dans le profil.
       *
       * L'IA reçoit ainsi le contexte personnel au lieu
       * d'avoir uniquement "perdre du gras", par exemple.
       */
      const profileContext = {
        objectif_principal:
          profile?.goal_type || null,

        poids_depart_kg:
          profile?.starting_weight_kg || null,

        taille_cm:
          profile?.height_cm || null,

        date_naissance:
          profile?.date_of_birth || null,

        sexe:
          profile?.sex || null,

        niveau_sportif:
          profile?.experience_level || null,

        lieu_entrainement:
          profile?.training_location || null,

        jours_disponibles:
          profile?.available_days || null,

        duree_seance_minutes:
          profile?.session_length_min || null,

        niveau_activite:
          profile?.activity_level || null,

        equipement:
          profile?.equipment || null,

        preferences_alimentaires:
          profile?.diet_preferences || null,

        motivation:
          profile?.motivation || null,

        objectif_visuel_utilisateur:
          goal.trim(),
      };

      const prompt = `
Tu es NOX, le système personnel de transformation de cet utilisateur.

Ta mission comporte deux parties :

1. créer une projection visuelle illustrative cohérente avec son objectif ;
2. produire un MESSAGE NOX réellement personnalisé à CET utilisateur.

========================
PROFIL RÉEL
========================

${JSON.stringify(profileContext, null, 2)}

========================
OBJECTIF VISUEL PERSONNEL
========================

"${goal.trim()}"

========================
PROJECTION VISUELLE
========================

Crée une évolution physique illustrative cohérente avec l'objectif déclaré.

Conserve impérativement :
- l'identité de la personne ;
- son visage ;
- sa carnation ;
- ses cheveux ;
- sa pose ;
- ses caractéristiques reconnaissables ;
- ses proportions générales.

Les changements corporels doivent rester modérés et plausibles.

La projection n'est PAS une prédiction.

Elle ne garantit :
- aucun résultat ;
- aucun délai ;
- aucun poids futur précis ;
- aucun taux de masse grasse futur précis.

========================
MESSAGE NOX
========================

Le message doit donner l'impression que NOX connaît réellement CET utilisateur.

Il ne doit PAS ressembler à une réponse générique de coach fitness.

INTERDIT :

- "patience et régularité sont les clés" ;
- "reste constant" ;
- "mange sainement" ;
- donner automatiquement un déficit de 300-500 kcal ;
- donner automatiquement 1,8-2 g/kg de protéines ;
- donner automatiquement une fréquence de musculation ;
- inventer un poids cible ;
- inventer un délai ;
- inventer une donnée absente du profil ;
- garantir le résultat représenté sur l'image ;
- simplement reformuler son objectif ;
- produire un conseil applicable de la même manière à n'importe quel utilisateur.

OBLIGATOIRE :

1. Utilise plusieurs informations concrètes du profil lorsqu'elles sont réellement disponibles.

Tu peux notamment utiliser :
- l'objectif principal ;
- le poids actuel ;
- la taille ;
- le niveau sportif ;
- le lieu d'entraînement ;
- le nombre de jours disponibles ;
- la durée des séances ;
- le niveau d'activité ;
- l'équipement disponible ;
- les préférences alimentaires ;
- la motivation personnelle ;
- la description du physique souhaité.

2. Ne cite pas mécaniquement toutes les données.

Transforme-les en compréhension utile.

3. Explique ce que CETTE projection signifie pour CETTE personne.

4. Identifie la priorité principale de son parcours.

5. Explique brièvement comment NOX devra construire ou adapter son chemin autour de son profil.

6. Si une information est absente ou null :
ignore-la totalement.
Ne l'invente jamais.

7. Adresse-toi directement à l'utilisateur avec "tu".

8. Utilise un ton direct, précis, humain et premium.

9. Ne fais pas de diagnostic médical.

10. Ne promets jamais que l'utilisateur ressemblera exactement à la projection.

11. Le message doit faire environ 70 à 120 mots maximum.

========================
EXEMPLE DU NIVEAU ATTENDU
========================

MAUVAIS :

"Pour perdre du gras, maintiens un déficit calorique, mange suffisamment de protéines et entraîne-toi régulièrement."

BON NIVEAU DE PERSONNALISATION :

"Avec ton rythme actuel et tes séances en salle, l'enjeu n'est pas simplement de faire baisser ton poids. Ta direction demande surtout de réduire progressivement la masse grasse tout en conservant le physique que tu veux mettre en valeur. Ton entraînement peut déjà servir cette transformation ; NOX devra surtout organiser nutrition, récupération et progression autour de tes vraies semaines pour que tes efforts aillent tous dans la même direction."

Ne copie PAS cet exemple.

Le message final doit être construit uniquement à partir du profil fourni.

========================
FORMAT DE RÉPONSE
========================

Réponds uniquement avec un JSON valide :

{
  "titre": "titre très court",
  "tagline": "phrase courte personnalisée",
  "message_coach": "message NOX réellement personnalisé"
}
      `.trim();

      const {
        data,
        error: functionError,
      } = await supabase.functions.invoke(
        'nox-future',
        {
          body: {
            prompt,

            photos,

            source_image:
              photos.face ||
              photos.side ||
              photos.back ||
              null,

            goal_description: goal.trim(),

            objective:
              profile?.goal_type ||
              'transformation physique',

            /*
             * Également envoyé séparément.
             * Cela permettra à l'Edge Function de l'exploiter
             * directement plus tard si nécessaire.
             */
            profile_context: profileContext,

            request_visual_projection: Boolean(
              photos.face ||
                photos.side ||
                photos.back
            ),
          },
        }
      );

      if (functionError) {
        console.error(
          'NOX Future Edge Function error:',
          functionError
        );

        throw new Error(
          functionError.message ||
            'Impossible de contacter NOX Future.'
        );
      }

      if (!data) {
        throw new Error(
          'NOX Future n’a renvoyé aucune donnée.'
        );
      }

      if (data?.error) {
        throw new Error(
          data?.error?.message ||
            (typeof data.error === 'string'
              ? data.error
              : 'La génération NOX Future a échoué.')
        );
      }

      /* =====================================================
         PARSING DU MESSAGE NOX
      ===================================================== */

      const text =
        data?.data?.content?.[0]?.text ||
        data?.content?.[0]?.text ||
        data?.text ||
        '';

      let parsed: any = {};

      try {
        const match =
          text.match(/\{[\s\S]*\}/);

        parsed = match
          ? JSON.parse(match[0])
          : {};
      } catch {
        parsed = {};
      }

      /* IMAGE GÉNÉRÉE */

      parsed.projected_image =
        data?.projected_image ||
        data?.image_url ||
        data?.output_image ||
        data?.data?.projected_image ||
        data?.data?.image_url ||
        null;

      /* FALLBACKS */

      parsed.titre =
        parsed.titre ||
        'TON NOX FUTURE';

      parsed.tagline =
        parsed.tagline ||
        'Une direction construite autour de ton objectif.';

      parsed.message_coach =
        parsed.message_coach ||
        'Cette projection représente la direction que tu as donnée à NOX. Ton chemin sera adapté à ton profil, à ton rythme et à ton objectif réel.';

      setProjection(parsed);

      /* =====================================================
         SAUVEGARDE
      ===================================================== */

      const sourcePhoto =
        photos.face ||
        photos.side ||
        photos.back ||
        null;

      const { error: saveError } =
        await supabase
          .from('future_you_generations')
          .insert({
            user_id: user.id,

            source_photo_url:
              sourcePhoto || null,

            generated_image_url:
              parsed.projected_image || null,

            projection_months: 3,

            prompt: goal.trim(),

            projection_text:
              JSON.stringify(parsed),

            status: 'completed',

            created_at:
              new Date().toISOString(),
          });

      if (saveError) {
        console.warn(
          'NOX Future : historique non sauvegardé',
          saveError
        );
      }

      setCredits((current) => ({
        ...current,

        used: current.used + 1,

        canGenerate:
          current.max >= 999 ||
          current.used + 1 < current.max,
      }));

      setStep('result');
    } catch (generationError: any) {
      console.error(
        'NOX Future generation error:',
        generationError
      );

      setError(
        generationError?.message ||
          'La génération a échoué. Réessaie.'
      );

      setStep('goal');
    }
  };

  /* =========================================================
     SUITE DU PARCOURS
  ========================================================= */

  const continueFlow = () => {
    /*
     * PREMIÈRE INSCRIPTION :
     * NOX Future -> premier programme.
     */
    if (onboardingFlow) {
      navigate('/generate-program', {
        state: {
          fromFuture: true,
          goalDescription: goal,
        },
      });

      return;
    }

    /*
     * UTILISATION NORMALE :
     * NOX Future ne doit jamais recréer automatiquement
     * le programme.
     */
    navigate('/home');
  };

  /* =========================================================
     CHARGEMENT
  ========================================================= */

  if (!historyLoaded && !onboardingFlow) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          background: BG,
          color: BLACK,
          display: 'grid',
          placeItems: 'center',
          padding: 24,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 950,
              letterSpacing: '.16em',
              marginBottom: 12,
            }}
          >
            NOX
            <span style={{ color: ACCENT }}>.</span>
          </div>

          <div
            style={{
              fontSize: 12,
              color: MUTED,
              fontWeight: 800,
            }}
          >
            CHARGEMENT DE TA DIRECTION...
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: BG,
        color: BLACK,
        paddingBottom: onboardingFlow ? 24 : 86,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={importPhoto}
      />

      {/* CAMÉRA */}

      {cameraOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            background: '#000',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: 18,
              display: 'flex',
              justifyContent: 'space-between',
              color: '#fff',
            }}
          >
            <b>
              PHOTO{' '}
              {angle === 'face'
                ? 'DE FACE'
                : angle === 'side'
                  ? 'DE PROFIL'
                  : 'DE DOS'}
            </b>

            <button
              onClick={stopCamera}
              style={closeBtn}
            >
              ×
            </button>
          </div>

          <div
            style={{
              flex: 1,
              margin: '0 14px',
              borderRadius: 24,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <video
              ref={videoRef}
              muted
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)',
              }}
            />

            <div
              style={{
                position: 'absolute',
                inset: '7% 17%',
                border:
                  '1px solid rgba(255,255,255,.4)',
                borderRadius: 80,
              }}
            />

            {countdown !== null && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'grid',
                  placeItems: 'center',
                  background:
                    'rgba(0,0,0,.22)',
                  color: '#fff',
                  fontSize:
                    'clamp(90px,30vw,160px)',
                  fontWeight: 950,
                  textShadow:
                    '0 4px 30px rgba(0,0,0,.35)',
                }}
              >
                {countdown}
              </div>
            )}
          </div>

          <div style={{ padding: 18 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(3,1fr)',
                gap: 8,
                marginBottom: 12,
              }}
            >
              {([0, 5, 10] as const).map(
                (seconds) => (
                  <button
                    key={seconds}
                    onClick={() =>
                      setTimerSeconds(seconds)
                    }
                    disabled={countdown !== null}
                    style={{
                      minHeight: 42,
                      borderRadius: 13,
                      border: `1px solid ${
                        timerSeconds === seconds
                          ? ACCENT
                          : '#333'
                      }`,
                      background:
                        timerSeconds === seconds
                          ? ACCENT
                          : '#171717',
                      color:
                        timerSeconds === seconds
                          ? BLACK
                          : '#fff',
                      fontSize: 11,
                      fontWeight: 900,
                    }}
                  >
                    {seconds === 0
                      ? 'DIRECT'
                      : `${seconds} SEC`}
                  </button>
                )
              )}
            </div>

            <button
              onClick={triggerCapture}
              disabled={countdown !== null}
              style={primary(countdown === null)}
            >
              {countdown !== null
                ? `PHOTO DANS ${countdown}...`
                : 'PRENDRE LA PHOTO'}

              <Camera size={18} />
            </button>
          </div>
        </div>
      )}

      <Top
        step={step}
        back={() =>
          setStep(
            step === 'photo'
              ? 'consent'
              : step === 'goal'
                ? 'photo'
                : 'intro'
          )
        }
      />

      <main
        style={{
          maxWidth: 560,
          margin: '0 auto',
          padding: '28px 20px',
        }}
      >
        {/* INTRO */}

        {step === 'intro' && (
          <>
            <Eyebrow>NOX FUTURE</Eyebrow>

            <Title>
              Vois où tu veux aller.
            </Title>

            <Text>
              Une photo actuelle, ton objectif, puis une
              projection IA illustrative. NOX construit ensuite
              le chemin autour de ton profil.
            </Text>

            <div
              style={{
                background: BLACK,
                borderRadius: 30,
                padding: 24,
                color: '#fff',
                margin: '30px 0',
              }}
            >
              <Sparkles
                size={28}
                color={ACCENT}
              />

              <h2
                style={{
                  fontSize: 24,
                  lineHeight: 1.05,
                  margin: '18px 0 10px',
                }}
              >
                TON OBJECTIF.
                <br />
                VISUALISÉ.
              </h2>

              <p
                style={{
                  color: '#999',
                  fontSize: 13,
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                La projection n’est pas une prédiction. Elle
                représente une possibilité visuelle liée à
                l’objectif que tu décris.
              </p>
            </div>

            {!credits.canGenerate ? (
              <div style={notice}>
                Tu as utilisé ta projection disponible ce
                mois-ci.
              </div>
            ) : (
              <button
                onClick={() => setStep('consent')}
                style={primary(true)}
              >
                CRÉER MON NOX FUTURE
                <ChevronRight size={18} />
              </button>
            )}
          </>
        )}

        {/* CONFIDENTIALITÉ */}

        {step === 'consent' && (
          <>
            <Eyebrow>CONFIDENTIALITÉ</Eyebrow>

            <Title>
              Ta photo. Ton choix.
            </Title>

            <Text>
              La photo est utilisée pour générer ta projection
              NOX Future. La projection reste illustrative et ne
              garantit pas ton apparence future.
            </Text>

            <div
              style={{
                display: 'grid',
                gap: 10,
                margin: '26px 0',
              }}
            >
              <Info
                icon={<Lock size={17} />}
                title="Utilisation ciblée"
              >
                Ta photo peut être envoyée au service NOX Future
                pour produire la projection.
              </Info>

              <Info
                icon={<Sparkles size={17} />}
                title="Projection illustrative"
              >
                Le résultat réel dépend de nombreux facteurs et
                peut être différent.
              </Info>
            </div>

            <button
              onClick={() => setStep('photo')}
              style={primary(true)}
            >
              J’ACCEPTE — CONTINUER
              <ChevronRight size={18} />
            </button>
          </>
        )}

        {/* PHOTO */}

        {step === 'photo' && (
          <>
            <Eyebrow>
              TA PHOTO ACTUELLE
            </Eyebrow>

            <Title>
              Ton point de départ.
            </Title>

            <Text>
              Pour la projection visuelle, ajoute au minimum une
              photo de face, en pied, nette et bien éclairée.
            </Text>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(3,1fr)',
                gap: 9,
                margin: '26px 0 14px',
              }}
            >
              {(
                ['face', 'side', 'back'] as const
              ).map((currentAngle, index) => (
                <PhotoCard
                  key={currentAngle}
                  label={
                    ['FACE', 'PROFIL', 'DOS'][
                      index
                    ]
                  }
                  src={photos[currentAngle]}
                  onClick={() =>
                    openCamera(currentAngle)
                  }
                />
              ))}
            </div>

            <button
              onClick={() => {
                setAngle('face');
                inputRef.current?.click();
              }}
              style={secondary}
            >
              <ImagePlus size={16} />
              IMPORTER DEPUIS LE TÉLÉPHONE
            </button>

            <div style={{ height: 12 }} />

            <button
              onClick={() => setStep('goal')}
              disabled={!photos.face}
              style={primary(Boolean(photos.face))}
            >
              CONTINUER
              <ChevronRight size={18} />
            </button>
          </>
        )}

        {/* OBJECTIF */}

        {step === 'goal' && (
          <>
            <Eyebrow>
              TON PHYSIQUE IDÉAL
            </Eyebrow>

            <Title>
              Décris la direction.
            </Title>

            <Text>
              Décris ce que tu souhaites améliorer. NOX utilisera
              ce texte comme direction visuelle, pas comme une
              promesse de résultat.
            </Text>

            <textarea
              value={goal}
              onChange={(event) =>
                setGoal(event.target.value)
              }
              placeholder="Ex. Je souhaite une silhouette plus athlétique, davantage de définition au niveau du haut du corps et une taille plus affinée..."
              style={{
                width: '100%',
                minHeight: 170,
                boxSizing: 'border-box',
                border: `1.5px solid ${BORDER}`,
                borderRadius: 22,
                background: WHITE,
                padding: 18,
                font: 'inherit',
                fontSize: 15,
                lineHeight: 1.55,
                outline: 'none',
                resize: 'vertical',
              }}
            />

            <div
              style={{
                display: 'flex',
                gap: 7,
                flexWrap: 'wrap',
                margin: '12px 0 24px',
              }}
            >
              {[
                'Plus athlétique',
                'Plus musclé',
                'Plus défini',
                'Taille plus affinée',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() =>
                    setGoal((current) =>
                      current
                        ? `${current}, ${suggestion.toLowerCase()}`
                        : suggestion
                    )
                  }
                  style={chip}
                >
                  + {suggestion}
                </button>
              ))}
            </div>

            {error && (
              <div
                style={{
                  ...notice,
                  color: '#A52116',
                  background: '#FFF1EF',
                  borderColor: '#FFD4CE',
                }}
              >
                {error}
              </div>
            )}

            <button
              onClick={generate}
              disabled={!goal.trim()}
              style={primary(Boolean(goal.trim()))}
            >
              GÉNÉRER MON NOX FUTURE
              <Sparkles size={18} />
            </button>
          </>
        )}

        {/* GÉNÉRATION */}

        {step === 'generating' && (
          <div
            style={{
              paddingTop: 70,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 24,
                background: BLACK,
                color: ACCENT,
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 24px',
              }}
            >
              <Sparkles size={30} />
            </div>

            <Eyebrow>
              INTELLIGENCE NOX
            </Eyebrow>

            <Title>
              Création en cours.
            </Title>

            <Text>
              Analyse de ta photo, compréhension de ton objectif
              et génération de ta projection.
            </Text>

            {[
              'Analyse de la photo',
              'Compréhension de ton objectif',
              'Création de la projection',
            ].map((item, index) => (
              <div
                key={item}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 0',
                  borderBottom:
                    `1px solid ${BORDER}`,
                  fontSize: 13,
                  fontWeight: 750,
                }}
              >
                <Check
                  size={16}
                  color={
                    index === 0
                      ? '#78A000'
                      : '#B8BDB4'
                  }
                />

                {item}
              </div>
            ))}
          </div>
        )}

        {/* RÉSULTAT */}

        {step === 'result' && projection && (
          <>
            <Eyebrow>
              TON NOX FUTURE
            </Eyebrow>

            <Title>
              La destination.
            </Title>

            <Text>
              {projection.tagline}
            </Text>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  '1fr 1fr',
                gap: 10,
                margin: '25px 0',
              }}
            >
              <ResultImage
                src={photos.face}
                label="AUJOURD’HUI"
              />

              <ResultImage
                src={projection.projected_image}
                label="PROJECTION IA"
                accent
              />
            </div>

            <div
              style={{
                background: WHITE,
                border:
                  `1px solid ${BORDER}`,
                borderRadius: 22,
                padding: 18,
                marginBottom: 12,
              }}
            >
              <Eyebrow>
                MESSAGE NOX
              </Eyebrow>

              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.65,
                  fontWeight: 650,
                }}
              >
                {projection.message_coach}
              </div>
            </div>

            <div style={notice}>
              Projection IA illustrative et non garantie. Elle
              représente un scénario visuel possible ; ton
              évolution réelle peut être différente.
            </div>

            <button
              onClick={continueFlow}
              style={{
                ...primary(true),
                marginTop: 18,
              }}
            >
              {onboardingFlow
                ? 'CONSTRUIRE LE CHEMIN'
                : 'RETOUR À AUJOURD’HUI'}

              <ChevronRight size={18} />
            </button>

            {!onboardingFlow && (
              <button
                onClick={() => {
                  setProjection(null);
                  setGoal('');
                  setPhotos({});
                  setError('');
                  setStep('consent');
                }}
                style={{
                  ...secondary,
                  marginTop: 10,
                }}
              >
                <RotateCcw size={16} />
                NOUVELLE PROJECTION
              </button>
            )}
          </>
        )}
      </main>

      {!onboardingFlow &&
        step !== 'generating' && (
          <BottomNav active="future" />
        )}
    </div>
  );
}

/* =========================================================
   COMPOSANTS
========================================================= */

function Top({
  step,
  back,
}: {
  step: Step;
  back: () => void;
}) {
  if (
    step === 'generating' ||
    step === 'result' ||
    step === 'intro'
  ) {
    return <div style={{ height: 20 }} />;
  }

  return (
    <header
      style={{
        maxWidth: 560,
        margin: '0 auto',
        padding: '20px 20px 0',
      }}
    >
      <button
        onClick={back}
        style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          border:
            `1px solid ${BORDER}`,
          background: WHITE,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <ArrowLeft size={18} />
      </button>
    </header>
  );
}

function Eyebrow({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 950,
        letterSpacing: '.13em',
        color: '#949A90',
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

function Title({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <h1
      style={{
        fontSize:
          'clamp(36px,10vw,48px)',
        lineHeight: 0.94,
        letterSpacing: '-.06em',
        margin: 0,
        fontWeight: 950,
      }}
    >
      {children}
    </h1>
  );
}

function Text({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <p
      style={{
        color: MUTED,
        fontSize: 14,
        lineHeight: 1.65,
        margin: '16px 0 0',
      }}
    >
      {children}
    </p>
  );
}

function Info({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 13,
        background: WHITE,
        border:
          `1px solid ${BORDER}`,
        borderRadius: 18,
        padding: 16,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          background: '#F0FFD0',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      <div>
        <b style={{ fontSize: 13 }}>
          {title}
        </b>

        <div
          style={{
            fontSize: 12,
            color: MUTED,
            lineHeight: 1.5,
            marginTop: 3,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function PhotoCard({
  label,
  src,
  onClick,
}: {
  label: string;
  src?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        aspectRatio: '3/4',
        border: `1.5px ${
          src ? 'solid' : 'dashed'
        } ${
          src ? BLACK : '#CED2C9'
        }`,
        borderRadius: 20,
        overflow: 'hidden',
        padding: 0,
        background: WHITE,
        position: 'relative',
      }}
    >
      {src ? (
        <img
          src={src}
          alt={label}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <div
          style={{
            height: '100%',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <div>
            <Camera size={22} />

            <div
              style={{
                fontSize: 9,
                fontWeight: 900,
                marginTop: 8,
              }}
            >
              {label}
            </div>
          </div>
        </div>
      )}
    </button>
  );
}

function ResultImage({
  src,
  label,
  accent = false,
}: {
  src?: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          aspectRatio: '3/4',
          borderRadius: 22,
          overflow: 'hidden',
          background: '#ECEEE8',
          border: `2px solid ${
            accent
              ? ACCENT
              : 'transparent'
          }`,
        }}
      >
        {src ? (
          <img
            src={src}
            alt={label}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              height: '100%',
              display: 'grid',
              placeItems: 'center',
              padding: 14,
              textAlign: 'center',
              fontSize: 11,
              color: MUTED,
            }}
          >
            Image indisponible
          </div>
        )}
      </div>

      <div
        style={{
          fontSize: 9,
          fontWeight: 950,
          letterSpacing: '.08em',
          textAlign: 'center',
          marginTop: 8,
          color:
            accent
              ? '#779C00'
              : MUTED,
        }}
      >
        {label}
      </div>
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const primary = (
  enabled: boolean
): CSSProperties => ({
  width: '100%',
  minHeight: 60,
  border: 0,
  borderRadius: 18,
  padding: '0 18px',

  background:
    enabled
      ? ACCENT
      : '#E1E4DD',

  color:
    enabled
      ? BLACK
      : '#9EA39B',

  fontWeight: 950,
  fontSize: 13,

  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',

  cursor:
    enabled
      ? 'pointer'
      : 'not-allowed',
});

const secondary: CSSProperties = {
  width: '100%',
  minHeight: 52,

  border:
    `1px solid ${BORDER}`,

  borderRadius: 16,

  padding: '0 16px',

  background: WHITE,
  color: BLACK,

  fontWeight: 850,
  fontSize: 12,

  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',

  gap: 8,
};

const chip: CSSProperties = {
  border:
    `1px solid ${BORDER}`,

  borderRadius: 999,

  background: WHITE,

  padding: '9px 12px',

  fontSize: 11,
  fontWeight: 750,

  color: '#555',
};

const notice: CSSProperties = {
  padding: 14,

  borderRadius: 16,

  background: '#F0FFD0',

  border:
    '1px solid #DDF49B',

  fontSize: 11,

  lineHeight: 1.55,

  color: '#596600',
};

const closeBtn: CSSProperties = {
  width: 38,
  height: 38,

  borderRadius: 20,

  border:
    '1px solid #333',

  background: '#171717',

  color: '#fff',

  fontSize: 22,
};
