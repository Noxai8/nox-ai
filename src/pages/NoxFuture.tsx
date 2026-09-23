import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';
import TutorialTooltip from '../components/TutorialTooltip';

const ACCENT = '#B7FF00';
const BG = '#F6F7F2';
const SURFACE = '#FFFFFF';
const BORDER = '#E8EAE2';

type Step = 'intro' | 'consent' | 'photo' | 'goal_desc' | 'generating' | 'result';

export default function NoxFuture() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('intro');
  const [photos, setPhotos] = useState<{ face?: string; side?: string; back?: string }>({});
  const [currentAngle, setCurrentAngle] = useState<'face' | 'side' | 'back'>('face');
  const [goalDesc, setGoalDesc] = useState('');
  const [projectionText, setProjectionText] = useState('');
  const [originalProjection, setOriginalProjection] = useState<any>(null); // première projection ever
  const [latestProjection, setLatestProjection] = useState<any>(null); // la plus récente
  const [allProjections, setAllProjections] = useState<any[]>([]); // historique
  const [profile, setProfile] = useState<any>(null);
  const [bodyLogs, setBodyLogs] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [showComparison, setShowComparison] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [timerSeconds, setTimerSeconds] = useState<0 | 3 | 5 | 10>(3);
  const [countdown, setCountdown] = useState<number | null>(null);

  const [futureCredits, setFutureCredits] = useState<{ used: number; max: number; canGenerate: boolean }>({ used: 0, max: 1, canGenerate: true });

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(({ data }) => {
      setProfile(data);
      // Calculer crédits FUTURE selon le plan
      const plan = data?.subscription_plan || 'free';
      const maxByPlan: Record<string, number> = { free: 1, nox: 1, pro: 999, ultra: 999 };
      const max = maxByPlan[plan] || 1;
      // Compter les générations du mois
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      supabase.from('future_you_generations').select('id').eq('user_id', user!.id).gte('created_at', monthStart)
        .then(({ data: gens }) => {
          const used = gens?.length || 0;
          setFutureCredits({ used, max, canGenerate: used < max || plan === 'pro' || plan === 'ultra' });
        });
    });
    supabase.from('body_logs').select('weight, created_at').eq('user_id', user.id).order('created_at').then(({ data }) => setBodyLogs(data || []));
    // Charger TOUTES les projections — la première = originale, la dernière = actuelle
    supabase.from('future_you_generations').select('*').eq('user_id', user.id).order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setAllProjections(data);
          setOriginalProjection(data[0]); // La toute première
          setLatestProjection(data[data.length - 1]); // La plus récente
          // Le schéma actuel ne stocke pas la projection JSON/base64 dans la table.
        }
      });
  }, [user]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const stopCamera = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setCountdown(null);
    setCameraOpen(false);
  };

  const openCamera = async (angle: 'face' | 'side' | 'back') => {
    setCurrentAngle(angle);
    setCameraError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        fileRef.current?.click();
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1440 } },
        audio: false,
      });

      streamRef.current = stream;
      setCameraOpen(true);

      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch (e) {
      console.error(e);
      setCameraError("La caméra n'est pas accessible. Tu peux importer une photo à la place.");
      fileRef.current?.click();
    }
  };

  const captureNow = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError("La caméra n'est pas encore prête.");
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL('image/jpeg', 0.88);
    setPhotos(prev => ({ ...prev, [currentAngle]: image }));
    stopCamera();
  };

  const startCapture = () => {
    if (timerSeconds === 0) {
      captureNow();
      return;
    }

    if (timerRef.current) window.clearInterval(timerRef.current);
    let remaining = timerSeconds;
    setCountdown(remaining);

    timerRef.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = null;
        setCountdown(null);
        captureNow();
      } else {
        setCountdown(remaining);
      }
    }, 1000);
  };

  const handlePhoto = (angle: 'face' | 'side' | 'back') => {
    setCurrentAngle(angle);
    fileRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotos(p => ({ ...p, [currentAngle]: reader.result as string }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const generate = async () => {
    setStep('generating');
    setError('');
    try {
      // Build context
      const ctx = {
        profile: {
          objective: profile?.goal_type || profile?.goal || 'transformation physique',
          current_weight: bodyLogs.length ? bodyLogs[bodyLogs.length - 1]?.weight : (profile?.starting_weight_kg || profile?.weight),
          experience: profile?.experience_level,
          activity: profile?.activity_level,
        },
        goal_description: goalDesc,
        has_photos: Object.keys(photos).length > 0,
      };

      // Construire le prompt
      const futurPrompt = `Tu es NOX. Génère une projection de transformation physique personnalisée et prudente sur 90 jours.
Si le service supporte la génération/édition d'image et qu'une photo est fournie, crée une projection visuelle photoréaliste qui conserve l'identité, le visage, la pose et les proportions générales de la personne, avec uniquement des changements corporels plausibles cohérents avec son objectif.
Ne promets jamais un résultat physique précis ni une date garantie.

PROFIL :
- Objectif : ${ctx.profile.objective}
- Poids actuel : ${ctx.profile.current_weight || '?'} kg
- Niveau : ${ctx.profile.experience || 'débutant'}
- Activité : ${ctx.profile.activity || 'modérée'}
- Description objectif : ${goalDesc}
- Photos fournies : ${ctx.has_photos ? 'oui' : 'non'}

Réponds UNIQUEMENT en JSON valide :
{
  "titre": "TON NOX FUTURE",
  "tagline": "Phrase courte et percutante",
  "en_30_jours": "Changements visibles et concrets à 30 jours",
  "en_60_jours": "Changements à 60 jours",
  "en_90_jours": "Résultat à 90 jours si constants",
  "chiffres_cles": ["Résultat chiffré 1", "Résultat chiffré 2", "Résultat chiffré 3"],
  "message_coach": "Message motivant, ton naturel, 2-3 phrases",
  "avertissement": "Projection IA illustrative et non garantie. Le résultat réel peut être différent."
}`;

      const { data: authData } = await supabase.auth.getSession();
      const session = authData.session;

      const _futureResp = await fetch('https://zpxrsmnpcyzafawlweyl.supabase.co/functions/v1/nox-future', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          prompt: futurPrompt,
          photos,
          source_image: photos.face || photos.side || photos.back || null,
          goal_description: goalDesc,
          objective: ctx.profile.objective,
          request_visual_projection: Object.keys(photos).length > 0,
        }),
      });
      if (!_futureResp.ok) throw new Error('Erreur future');
      const data = await _futureResp.json();
      if (!data) throw new Error('Réponse vide');
      const text = data?.data?.content?.[0]?.text || data?.content?.[0]?.text || data?.text || '';
      const projectedImage =
        data?.projected_image ||
        data?.image_url ||
        data?.output_image ||
        data?.data?.projected_image ||
        data?.data?.image_url ||
        null;
      let parsed: any = {};
      try {
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('No JSON');
        parsed = JSON.parse(match[0]);
      } catch {
        parsed = { titre: 'TON NOX FUTURE', tagline: 'Ta transformation commence maintenant.', message_coach: text };
      }

      // IMPORTANT : garder l'image générée uniquement dans l'état de la page.
      // Une image base64 peut être très volumineuse : on ne la stocke pas dans result_text.
      if (projectedImage) parsed.projected_image = projectedImage;
      parsed.avertissement = parsed.avertissement || 'Projection IA illustrative et non garantie. Le résultat réel peut être différent.';

      const resultText = JSON.stringify(parsed);
      setProjectionText(resultText);

      // Version légère destinée à la base de données : texte uniquement.
      const parsedForDatabase = { ...parsed };
      delete parsedForDatabase.projected_image;
      const databaseResultText = JSON.stringify(parsedForDatabase);

      // L'enregistrement de l'historique ne doit jamais empêcher l'utilisateur
      // de voir une projection visuelle qui a déjà été générée avec succès.
      const { data: savedGeneration, error: saveError } = await supabase
        .from('future_you_generations')
        .insert({
          user_id: user!.id,
          source_photo_url: null,
          generated_image_url: null,
          projection_months: 3,
          prompt: goalDesc,
          status: 'completed',
        })
        .select('*')
        .single();

      if (saveError) {
        console.error('NOX Future save error:', saveError);
      } else if (savedGeneration) {
        const next = [...allProjections, savedGeneration];
        setAllProjections(next);
        setOriginalProjection(originalProjection || savedGeneration);
        setLatestProjection(savedGeneration);
        setFutureCredits(prev => ({ ...prev, used: prev.used + 1, canGenerate: prev.max >= 999 || prev.used + 1 < prev.max }));
      }

      // La génération est réussie dès que le backend a répondu.
      setStep('result');
    } catch (err: any) {
      console.error('NOX Future generation error:', err);
      setError(err?.message ? `Erreur lors de la génération : ${err.message}` : 'Erreur lors de la génération. Réessaie.');
      setStep('goal_desc');
    }
  };

  const AngleCard = ({ angle, label, icon }: { angle: 'face' | 'side' | 'back'; label: string; icon: string }) => (
    <button onClick={() => openCamera(angle)}
      style={{ flex: 1, aspectRatio: '3/4', background: photos[angle] ? 'transparent' : SURFACE, border: '2px dashed ' + (photos[angle] ? ACCENT : BORDER), borderRadius: 16, cursor: 'pointer', overflow: 'hidden', position: 'relative', padding: 0 }}>
      {photos[angle] ? (
        <img src={photos[angle]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
          <div style={{ fontSize: 32 }}>{icon}</div>
          <div style={{ fontSize: 12, color: '#555', fontWeight: 700 }}>{label}</div>
          <div style={{ fontSize: 10, color: '#333' }}>Appuyer pour ajouter</div>
        </div>
      )}
      {photos[angle] && (
        <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: ACCENT, color: '#000', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 800 }}>✓ {label}</div>
        </div>
      )}
    </button>
  );

  // Parse projection
  let proj: any = {};
  try { proj = JSON.parse(projectionText); } catch {}

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 80 }}>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

      {cameraOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#000', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '18px 18px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ color: ACCENT, fontSize: 10, fontWeight: 900, letterSpacing: '.1em' }}>PHOTO PLEIN CORPS</div>
              <div style={{ color: '#fff', fontSize: 17, fontWeight: 900, marginTop: 3 }}>
                {currentAngle === 'face' ? 'FACE' : currentAngle === 'side' ? 'PROFIL' : 'DOS'}
              </div>
            </div>
            <button onClick={stopCamera} style={{ background: '#171717', color: '#fff', border: '1px solid #262626', width: 40, height: 40, borderRadius: 20, fontSize: 22, cursor: 'pointer' }}>×</button>
          </div>

          <div style={{ position: 'relative', flex: 1, minHeight: 0, margin: '0 14px', borderRadius: 20, overflow: 'hidden', background: '#111' }}>
            <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: currentAngle === 'back' ? 'none' : 'scaleX(-1)' }} />
            <div style={{ position: 'absolute', inset: '8% 18%', border: '1px solid rgba(255,255,255,.28)', borderRadius: '48% 48% 20% 20% / 18% 18% 10% 10%', pointerEvents: 'none' }} />
            {countdown !== null && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.28)' }}>
                <div style={{ color: '#fff', fontSize: 96, fontWeight: 950, textShadow: '0 3px 20px #000' }}>{countdown}</div>
              </div>
            )}
          </div>

          <div style={{ padding: '16px 18px 24px' }}>
            <div style={{ color: '#666', fontSize: 11, textAlign: 'center', marginBottom: 10 }}>Place le téléphone, recule et garde tout le corps dans le cadre.</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
              {([0, 3, 5, 10] as const).map(seconds => (
                <button key={seconds} onClick={() => setTimerSeconds(seconds)}
                  style={{ padding: '8px 13px', borderRadius: 20, border: '1px solid ' + (timerSeconds === seconds ? ACCENT : '#2a2a2a'), background: timerSeconds === seconds ? ACCENT + '18' : '#111', color: timerSeconds === seconds ? ACCENT : '#777', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                  {seconds === 0 ? 'Direct' : `${seconds}s`}
                </button>
              ))}
            </div>
            {cameraError && <div style={{ color: '#ff6666', fontSize: 11, textAlign: 'center', marginBottom: 10 }}>{cameraError}</div>}
            <button onClick={startCapture} disabled={countdown !== null}
              style={{ width: '100%', padding: 17, background: ACCENT, color: '#000', border: 0, borderRadius: 14, fontWeight: 950, fontSize: 15, cursor: 'pointer' }}>
              {countdown !== null ? 'PHOTO EN COURS...' : timerSeconds ? `PRENDRE LA PHOTO · ${timerSeconds}s` : 'PRENDRE LA PHOTO'}
            </button>
            <button onClick={() => { stopCamera(); window.setTimeout(() => fileRef.current?.click(), 50); }}
              style={{ width: '100%', padding: 13, marginTop: 8, background: 'transparent', color: '#777', border: 0, fontWeight: 800, cursor: 'pointer' }}>
              IMPORTER UNE PHOTO
            </button>
          </div>
        </div>
      )}

      {/* INTRO */}
      {step === 'intro' && (
        <div style={{ padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🔮</div>
          <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.15em', marginBottom: 8 }}>Intelligence NOX</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: '-.02em', lineHeight: 1.1, marginBottom: 12 }}>NOX FUTURE</div>
          <div style={{ fontSize: 15, color: '#555', lineHeight: 1.6, marginBottom: 28, maxWidth: 300, margin: '0 auto 28px' }}>
            NOX projette ta transformation et compare la projection originale à ta réalité.
          </div>

          {/* Projection existante */}
          {latestProjection && (
            <>
              <div style={{ background: SURFACE, border: '1px solid ' + ACCENT + '33', borderRadius: 16, padding: 16, marginBottom: 12, textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: ACCENT, fontWeight: 800, textTransform: 'uppercase' }}>PROJECTION ACTUELLE</div>
                  <div style={{ fontSize: 11, color: '#555' }}>{new Date(latestProjection.created_at).toLocaleDateString('fr-FR')}</div>
                </div>
                <div style={{ fontSize: 13, color: '#ccc' }}>
                  {(() => { try { return latestProjection.result_text ? JSON.parse(latestProjection.result_text).tagline : 'Ta projection est prête'; } catch { return 'Ta projection est prête'; } })()}
                </div>
                <button onClick={() => setStep('result')} style={{ marginTop: 12, background: ACCENT, color: '#000', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 800, fontSize: 13, cursor: 'pointer', width: '100%' }}>
                  VOIR MA PROJECTION →
                </button>
              </div>

              {/* Comparaison originale vs réel si 2+ projections */}
              {allProjections.length > 1 && originalProjection && (
                <div style={{ background: '#4488ff11', border: '1px solid #4488ff33', borderRadius: 16, padding: 16, marginBottom: 12, textAlign: 'left' }}>
                  <div style={{ fontSize: 11, color: '#4488ff', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>
                    📈 PROJECTION ORIGINALE VS RÉEL
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
                    Générée le {new Date(originalProjection.created_at).toLocaleDateString('fr-FR')} — {allProjections.length} projections au total
                  </div>
                  {bodyLogs.length >= 2 && (
                    <div style={{ fontSize: 13, color: '#ccc', marginTop: 8 }}>
                      Poids J1 : <span style={{ color: '#fff', fontWeight: 700 }}>{bodyLogs[0]?.weight}kg</span>
                      {' → '}
                      Actuel : <span style={{ color: ACCENT, fontWeight: 700 }}>{bodyLogs[bodyLogs.length - 1]?.weight}kg</span>
                      {' '}
                      <span style={{ color: bodyLogs[bodyLogs.length-1]?.weight < bodyLogs[0]?.weight ? ACCENT : '#ff6644' }}>
                        ({bodyLogs[bodyLogs.length-1]?.weight < bodyLogs[0]?.weight ? '' : '+'}{(bodyLogs[bodyLogs.length-1]?.weight - bodyLogs[0]?.weight).toFixed(1)}kg)
                      </span>
                    </div>
                  )}
                  <button onClick={() => setShowComparison(true)} style={{ marginTop: 12, background: 'transparent', color: '#4488ff', border: '1px solid #4488ff44', borderRadius: 10, padding: '8px 16px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    VOIR LA COMPARAISON →
                  </button>
                </div>
              )}
            </>
          )}

          {!futureCredits.canGenerate ? (
            <div style={{ background: '#ff444411', border: '1px solid #ff444433', borderRadius: 16, padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#ff6666', marginBottom: 8 }}>
                {futureCredits.used}/{futureCredits.max} projections utilisées ce mois
              </div>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>Passe à NOX PRO pour des projections illimitées</div>
              <button onClick={() => navigate('/subscribe')}
                style={{ padding: '12px 24px', background: '#c8ff00', border: 'none', borderRadius: 12, color: '#000', fontWeight: 900, fontSize: 13, cursor: 'pointer' }}>
                PASSER À NOX PRO →
              </button>
            </div>
          ) : (
            <button onClick={() => setStep('consent')} style={{ width: '100%', padding: 18, background: latestProjection ? SURFACE : ACCENT, border: '1px solid ' + (latestProjection ? BORDER : ACCENT), borderRadius: 16, color: latestProjection ? '#fff' : '#000', fontWeight: 900, fontSize: 15, cursor: 'pointer', maxWidth: 400 }}>
              {latestProjection ? '↻ NOUVELLE PROJECTION' : 'CRÉER MA PROJECTION'}
            </button>
          )}
          {futureCredits.max < 999 && (
            <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: '#333' }}>
              {futureCredits.used}/{futureCredits.max} projection(s) utilisée(s) ce mois · Plan {profile?.subscription_plan || 'free'}
            </div>
          )}
        </div>
      )}

      {/* MODAL COMPARAISON ORIGINALE VS RÉEL */}
      {showComparison && originalProjection && latestProjection && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.96)', zIndex: 400, overflowY: 'auto' }}>
          <div style={{ padding: '24px 20px 100px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>PROJECTION VS RÉALITÉ</div>
              <button onClick={() => setShowComparison(false)} style={{ background: 'none', border: 'none', color: '#555', fontSize: 28, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'PROJECTION ORIGINALE', data: originalProjection, color: '#4488ff' },
                { label: 'PROJECTION ACTUELLE', data: latestProjection, color: ACCENT },
              ].map(({ label, data, color }) => {
                let parsed: any = {};
                try { parsed = data.result_text ? JSON.parse(data.result_text) : {}; } catch {}
                return (
                  <div key={label} style={{ background: SURFACE, border: '1px solid ' + color + '44', borderRadius: 14, padding: 14 }}>
                    <div style={{ fontSize: 10, color, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>{label}</div>
                    <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>{new Date(data.created_at).toLocaleDateString('fr-FR')}</div>
                    <div style={{ fontSize: 12, color: '#ccc', lineHeight: 1.5 }}>{parsed.tagline || '—'}</div>
                    {parsed.en_90_jours && (
                      <div style={{ marginTop: 8, fontSize: 11, color: '#888', lineHeight: 1.4 }}>
                        <span style={{ color: '#555' }}>J+90 : </span>{parsed.en_90_jours.slice(0, 100)}...
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Évolution réelle */}
            {bodyLogs.length >= 2 && (
              <div style={{ background: ACCENT + '11', border: '1px solid ' + ACCENT + '33', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: ACCENT, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>TA RÉALITÉ</div>
                <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>{bodyLogs[0]?.weight}kg</div>
                    <div style={{ fontSize: 11, color: '#555' }}>Départ</div>
                  </div>
                  <div style={{ fontSize: 24, color: '#333', alignSelf: 'center' }}>→</div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: ACCENT }}>{bodyLogs[bodyLogs.length-1]?.weight}kg</div>
                    <div style={{ fontSize: 11, color: '#555' }}>Aujourd'hui</div>
                  </div>
                  <div style={{ fontSize: 24, color: '#333', alignSelf: 'center' }}>→</div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>{(bodyLogs[bodyLogs.length-1]?.weight < bodyLogs[0]?.weight ? '' : '+')}{(bodyLogs[bodyLogs.length-1]?.weight - bodyLogs[0]?.weight).toFixed(1)}kg</div>
                    <div style={{ fontSize: 11, color: '#555' }}>Évolution</div>
                  </div>
                </div>
              </div>
            )}

            <button onClick={() => setShowComparison(false)}
              style={{ width: '100%', padding: 16, background: ACCENT, border: 'none', borderRadius: 14, color: '#000', fontWeight: 900, cursor: 'pointer' }}>
              FERMER
            </button>
          </div>
        </div>
      )}

      {/* CONSENT */}
      {step === 'consent' && (
        <div style={{ padding: '40px 24px' }}>
          <button onClick={() => setStep('intro')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14, marginBottom: 24 }}>← Retour</button>
          <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Confidentialité</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 24 }}>TES PHOTOS SONT PRIVÉES</div>
          {[
            { icon: '🔒', text: 'Tes photos sont utilisées pour cette fonctionnalité selon les règles de confidentialité de NOX' },
            { icon: '🤖', text: 'Si tu les fournis, elles peuvent être envoyées au service NOX Future pour produire la projection' },
            { icon: '🗑️', text: 'La suppression et la conservation doivent suivre les réglages et la politique de confidentialité de NOX' },
            { icon: '⚠️', text: 'La projection est illustrative : elle ne prédit pas ni ne garantit ton apparence future' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ fontSize: 24, flexShrink: 0 }}>{icon}</div>
              <div style={{ fontSize: 14, color: '#888', lineHeight: 1.5 }}>{text}</div>
            </div>
          ))}
          <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 32, fontSize: 12, color: '#555', lineHeight: 1.5 }}>
            Les photos sont facultatives. Tu peux générer ta projection en décrivant simplement ton objectif.
          </div>
          <button onClick={() => setStep('photo')} style={{ width: '100%', padding: 18, background: ACCENT, border: 'none', borderRadius: 16, color: '#000', fontWeight: 900, fontSize: 16, cursor: 'pointer' }}>
            J'ACCEPTE — CONTINUER
          </button>
        </div>
      )}

      {/* PHOTO */}
      {step === 'photo' && (
        <div style={{ padding: '40px 24px' }}>
          <button onClick={() => setStep('consent')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14, marginBottom: 24 }}>← Retour</button>
          <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Optionnel</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 8 }}>AJOUTE TES PHOTOS</div>
          <div style={{ fontSize: 14, color: '#555', marginBottom: 24, lineHeight: 1.5 }}>
            Debout, bonne lumière, tenue ajustée et corps entier visible. Utilise le retardateur 3, 5 ou 10 secondes pour poser le téléphone et reculer.
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <AngleCard angle="face" label="Face" icon="👤" />
            <AngleCard angle="side" label="Profil" icon="🚶" />
            <AngleCard angle="back" label="Dos" icon="🔄" />
          </div>
          <button onClick={() => { setCurrentAngle('face'); fileRef.current?.click(); }}
            style={{ width: '100%', padding: 11, marginBottom: 20, background: 'transparent', border: '1px solid ' + BORDER, borderRadius: 12, color: '#777', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
            IMPORTER UNE PHOTO DEPUIS LE TÉLÉPHONE
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={() => setStep('goal_desc')} style={{ width: '100%', padding: 18, background: ACCENT, border: 'none', borderRadius: 16, color: '#000', fontWeight: 900, fontSize: 16, cursor: 'pointer' }}>
              {Object.keys(photos).length > 0 ? `CONTINUER AVEC ${Object.keys(photos).length} PHOTO(S)` : 'CONTINUER SANS PHOTO'}
            </button>
          </div>
        </div>
      )}

      {/* GOAL DESC */}
      {step === 'goal_desc' && (
        <div style={{ padding: '40px 24px' }}>
          <button onClick={() => setStep('photo')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14, marginBottom: 24 }}>← Retour</button>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 8 }}>DÉCRIS TON OBJECTIF</div>
          <div style={{ fontSize: 14, color: '#555', marginBottom: 24, lineHeight: 1.5 }}>
            Dis à NOX exactement ce que tu veux atteindre. Plus c'est précis, plus la projection sera personnalisée.
          </div>

          <div style={{ background: SURFACE, borderRadius: 16, border: '1px solid ' + BORDER, padding: 4, marginBottom: 16 }}>
            <textarea value={goalDesc} onChange={e => setGoalDesc(e.target.value)}
              placeholder="Ex: Je veux perdre 10kg de graisse et voir mes abdos. Je veux avoir un physique sec et musclé, comme un athlète. J'ai 3 mois pour y arriver et je suis prêt à tout donner..."
              style={{ width: '100%', minHeight: 150, background: 'transparent', border: 'none', color: '#fff', fontSize: 15, padding: '16px', resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6, fontFamily: 'inherit' }} />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
            {['Perdre du gras', 'Prendre du muscle', 'Abdos visibles', 'Corps athlétique', 'Être sec et défini', 'Plus de force'].map(s => (
              <button key={s} onClick={() => setGoalDesc(p => p ? p + ', ' + s.toLowerCase() : s)}
                style={{ padding: '8px 14px', background: 'transparent', border: '1px solid ' + BORDER, borderRadius: 20, color: '#555', fontSize: 12, cursor: 'pointer' }}>
                + {s}
              </button>
            ))}
          </div>

          {error && <div style={{ background: '#ff4444' + '22', border: '1px solid #ff4444', borderRadius: 12, padding: 14, color: '#ff4444', fontSize: 13, marginBottom: 16 }}>{error}</div>}

          <button onClick={generate} disabled={!goalDesc.trim()}
            style={{ width: '100%', padding: 18, background: goalDesc.trim() ? ACCENT : '#1a1a1a', border: 'none', borderRadius: 16, color: goalDesc.trim() ? '#000' : '#333', fontWeight: 900, fontSize: 16, cursor: goalDesc.trim() ? 'pointer' : 'not-allowed' }}>
            GÉNÉRER MA PROJECTION →
          </button>
        </div>
      )}

      {/* GENERATING */}
      {step === 'generating' && (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 24, animation: 'spin 2s linear infinite' }}>🔮</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 16 }}>NOX ANALYSE...</div>
          {['Analyse de ton profil...', 'Construction de ta trajectoire...', 'Projection sur 90 jours...', 'Finalisation de ta vision...'].map((msg, i) => (
            <div key={msg} style={{ fontSize: 14, color: i === 0 ? ACCENT : '#333', marginBottom: 8, transition: 'color 1s' }}>{msg}</div>
          ))}
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* RESULT */}
      {step === 'result' && (
        <div style={{ padding: '24px 20px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.15em', marginBottom: 8 }}>Intelligence NOX</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-.02em' }}>{proj.titre || 'TON NOX FUTURE'}</div>
            <div style={{ fontSize: 16, color: ACCENT, fontWeight: 700, marginTop: 8 }}>{proj.tagline || ''}</div>
          </div>

          {/* Photo if exists */}
          {photos.face && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <img src={photos.face} style={{ width: '100%', borderRadius: 16, aspectRatio: '3/4', objectFit: 'cover' }} />
                <div style={{ fontSize: 12, color: '#555', marginTop: 8, fontWeight: 700 }}>AUJOURD'HUI</div>
              </div>
              {proj.projected_image ? (
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <img src={proj.projected_image} alt="Projection physique IA illustrative" style={{ width: '100%', borderRadius: 16, aspectRatio: '3/4', objectFit: 'cover' }} />
                  <div style={{ fontSize: 12, color: ACCENT, marginTop: 8, fontWeight: 700 }}>PROJECTION IA</div>
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: SURFACE, borderRadius: 16, border: '2px dashed ' + ACCENT + '44', aspectRatio: '3/4', textAlign: 'center', padding: 16 }}>
                  <div style={{ fontSize: 13, color: ACCENT, fontWeight: 800 }}>PROJECTION VISUELLE</div>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 7, lineHeight: 1.45 }}>Le backend NOX actuel n'a pas renvoyé d'image transformée. La projection textuelle reste disponible ci-dessous.</div>
                </div>
              )}
            </div>
          )}

          {/* Timeline */}
          <div style={{ marginBottom: 24 }}>
            {[
              { day: 'J+30', content: proj.en_30_jours, color: '#4488ff' },
              { day: 'J+60', content: proj.en_60_jours, color: '#ffaa00' },
              { day: 'J+90', content: proj.en_90_jours, color: ACCENT },
            ].filter(t => t.content).map(({ day, content, color }) => (
              <div key={day} style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: color + '22', border: '2px solid ' + color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 900, color }}>{day}</span>
                  </div>
                  <div style={{ width: 2, flex: 1, background: '#1a1a1a', margin: '8px 0' }} />
                </div>
                <div style={{ flex: 1, paddingTop: 8 }}>
                  <div style={{ fontSize: 14, color: '#ccc', lineHeight: 1.6 }}>{content}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Key numbers */}
          {proj.chiffres_cles && (
            <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 16 }}>RÉSULTATS PROJETÉS</div>
              {proj.chiffres_cles.map((c: string, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT, flexShrink: 0 }} />
                  <div style={{ fontSize: 14, color: '#ccc' }}>{c}</div>
                </div>
              ))}
            </div>
          )}

          {/* Coach message */}
          {proj.message_coach && (
            <div style={{ background: ACCENT + '11', border: '1px solid ' + ACCENT + '44', borderRadius: 16, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: ACCENT, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>MESSAGE DE TON COACH NOX</div>
              <div style={{ fontSize: 14, color: '#ccc', lineHeight: 1.6, fontStyle: 'italic' }}>"{proj.message_coach}"</div>
            </div>
          )}

          {/* Disclaimer */}
          <div style={{ fontSize: 11, color: '#333', textAlign: 'center', lineHeight: 1.5, marginBottom: 24 }}>
            {proj.avertissement || 'Projection IA illustrative et non garantie. Elle visualise un scénario possible : ton apparence réelle peut évoluer différemment.'}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={() => navigate('/share-timeline')}
              style={{ width: '100%', padding: 14, background: '#4488ff22', border: '1px solid #4488ff44', borderRadius: 14, color: '#4488ff', fontWeight: 800, fontSize: 13, cursor: 'pointer', marginBottom: 8 }}>
              📤 EXPORTER MA TIMELINE
            </button>
            <button onClick={() => { setPhotos({}); setGoalDesc(''); setStep('consent'); }}
              style={{ width: '100%', padding: 16, background: ACCENT, border: 'none', borderRadius: 14, color: '#000', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
              NOUVELLE PROJECTION
            </button>
            <button onClick={() => setStep('intro')}
              style={{ width: '100%', padding: 16, background: 'transparent', border: '1px solid ' + BORDER, borderRadius: 14, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              RETOUR À L'ACCUEIL
            </button>
          </div>
        </div>
      )}

      <BottomNav active="future" />
      <TutorialTooltip page="future" />
    </div>
  );
}
