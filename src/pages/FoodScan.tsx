import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  ImagePlus,
  LoaderCircle,
  Plus,
  RefreshCw,
  ScanLine,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const ACCENT = '#B7FF00';
const BG = '#F6F7F2';
const SURFACE = '#FFFFFF';
const BORDER = '#E4E4DF';
const TEXT = '#111111';
const MUTED = '#74746D';

const MEALS = ['Petit-déjeuner', 'Déjeuner', 'Dîner', 'Snacks'];

export default function FoodScan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const defaultMeal = (location.state as any)?.meal || 'Déjeuner';

  const [selectedMeal, setSelectedMeal] = useState(defaultMeal);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const resetScan = () => {
    setPhotoBase64(null);
    setResult(null);
    setError('');
    setAdded(false);
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Choisis une image valide.');
      e.target.value = '';
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError('Cette image est trop lourde. Choisis une photo de moins de 15 Mo.');
      e.target.value = '';
      return;
    }

    setError('');
    setResult(null);

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const max = 1200;

        let { width, height } = img;

        if (width > max || height > max) {
          if (width > height) {
            height = Math.round((height * max) / width);
            width = max;
          } else {
            width = Math.round((width * max) / height);
            height = max;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error("Impossible de préparer l'image.");
        }

        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
        setPhotoBase64(dataUrl);

        const base64 = dataUrl.split(',')[1];

        if (!base64) {
          throw new Error("Impossible de lire l'image.");
        }

        void analyze(base64);
      } catch (err: any) {
        setError(err?.message || "Impossible de préparer l'image.");
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError("Impossible d'ouvrir cette image.");
    };

    img.src = url;
    e.target.value = '';
  };

  const analyze = async (base64: string) => {
    setScanning(true);
    setError('');
    setResult(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Reconnecte-toi à NOX pour analyser ce repas.');
      }

      const resp = await fetch(
        'https://zpxrsmnpcyzafawlweyl.supabase.co/functions/v1/analyze-meal',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          },
          body: JSON.stringify({
            base64,
            mime: 'image/jpeg',
          }),
        },
      );

      let data: any = null;

      try {
        data = await resp.json();
      } catch {
        // handled below
      }

      if (!resp.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "L'analyse du repas n'est pas disponible pour le moment.",
        );
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data) {
        throw new Error("NOX n'a reçu aucun résultat pour cette photo.");
      }

      setResult(data);
    } catch (err: any) {
      setError(err?.message || 'Analyse impossible.');
    } finally {
      setScanning(false);
    }
  };

  const addAll = async () => {
    if (!result || adding || !user) return;

    setAdding(true);
    setError('');

    const kcal = result.total?.kcal ?? result.total?.calories ?? 0;

    const { error: insertError } = await supabase.from('food_entries').insert({
      user_id: user.id,
      meal_type: selectedMeal,
      food_name: result.description || 'Repas scanné',
      calories: Math.round(Number(kcal) || 0),
      protein:
        Math.round(Number(result.total?.protein || 0) * 10) / 10,
      carbs:
        Math.round(Number(result.total?.carbs || 0) * 10) / 10,
      fat:
        Math.round(Number(result.total?.fat || 0) * 10) / 10,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('FoodScan addAll:', insertError);
      setError("Le repas n'a pas pu être ajouté au journal.");
      setAdding(false);
      return;
    }

    setAdded(true);
    setAdding(false);

    window.setTimeout(() => {
      navigate('/fuel');
    }, 900);
  };

  const addSingle = async (item: any) => {
    if (!user || adding) return;

    setAdding(true);
    setError('');

    const { error: insertError } = await supabase.from('food_entries').insert({
      user_id: user.id,
      meal_type: selectedMeal,
      food_name: item.nom || item.name || 'Aliment',
      calories: Math.round(Number(item.kcal || item.calories || 0)),
      protein: Math.round(Number(item.protein || 0) * 10) / 10,
      carbs: Math.round(Number(item.carbs || 0) * 10) / 10,
      fat: Math.round(Number(item.fat || 0) * 10) / 10,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('FoodScan addSingle:', insertError);
      setError("Cet aliment n'a pas pu être ajouté au journal.");
      setAdding(false);
      return;
    }

    setAdded(true);
    setAdding(false);

    window.setTimeout(() => {
      navigate('/fuel');
    }, 850);
  };

  const totalKcal = Math.round(
    Number(result?.total?.kcal ?? result?.total?.calories ?? 0),
  );

  if (added) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: BG,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          padding: 24,
          boxSizing: 'border-box',
          color: TEXT,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 24,
            background: ACCENT,
            display: 'grid',
            placeItems: 'center',
            border: '1px solid #A5E600',
          }}
        >
          <Check size={32} strokeWidth={3} />
        </div>

        <div
          style={{
            fontSize: 21,
            fontWeight: 950,
            letterSpacing: '-.03em',
          }}
        >
          Ajouté au journal
        </div>

        <div
          style={{
            fontSize: 12,
            color: MUTED,
          }}
        >
          Mise à jour de ta nutrition…
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: BG,
        color: TEXT,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handlePhoto}
      />

      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handlePhoto}
      />

      <header
        style={{
          padding: '16px 18px 14px',
          borderBottom: `1px solid ${BORDER}`,
          background: BG,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/fuel')}
            aria-label="Retour"
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              border: `1px solid ${BORDER}`,
              background: SURFACE,
              color: TEXT,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={19} />
          </button>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                color: MUTED,
                textTransform: 'uppercase',
                letterSpacing: '.1em',
                fontWeight: 850,
              }}
            >
              Nutrition
            </div>

            <div
              style={{
                fontSize: 23,
                fontWeight: 950,
                letterSpacing: '-.04em',
                marginTop: 2,
              }}
            >
              Scanner un repas
            </div>
          </div>
        </div>
      </header>

      <div
        style={{
          padding: '11px 18px',
          borderBottom: `1px solid ${BORDER}`,
          display: 'flex',
          gap: 7,
          flexShrink: 0,
          overflowX: 'auto',
          background: BG,
        }}
      >
        {MEALS.map((meal) => {
          const active = selectedMeal === meal;

          return (
            <button
              key={meal}
              type="button"
              onClick={() => setSelectedMeal(meal)}
              style={{
                padding: '9px 13px',
                borderRadius: 999,
                border: `1px solid ${active ? '#A5E600' : BORDER}`,
                background: active ? ACCENT : SURFACE,
                color: TEXT,
                fontSize: 11,
                fontWeight: 850,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {meal}
            </button>
          );
        })}
      </div>

      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '18px 18px 8px',
        }}
      >
        {photoBase64 && (
          <div
            style={{
              position: 'relative',
              marginBottom: 14,
              borderRadius: 22,
              overflow: 'hidden',
              background: '#ECEDE8',
              border: `1px solid ${BORDER}`,
            }}
          >
            <img
              src={photoBase64}
              alt="Repas à analyser"
              style={{
                display: 'block',
                width: '100%',
                height: 260,
                objectFit: 'cover',
              }}
            />

            {scanning && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(17,17,17,.36)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <div
                  style={{
                    width: '76%',
                    height: 118,
                    borderRadius: 20,
                    border: `2px solid ${ACCENT}`,
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 14,
                      right: 14,
                      top: '50%',
                      height: 2,
                      background: ACCENT,
                      boxShadow: `0 0 14px ${ACCENT}`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {scanning && (
          <div
            style={{
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              borderRadius: 20,
              padding: 20,
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 13,
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 15,
                background: ACCENT,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <LoaderCircle size={22} />
            </div>

            <div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 900,
                }}
              >
                Analyse en cours…
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: MUTED,
                  marginTop: 4,
                  lineHeight: 1.45,
                }}
              >
                NOX identifie les aliments et estime les quantités.
              </div>
            </div>
          </div>
        )}

        {error && !scanning && (
          <div
            style={{
              background: '#FFF1EF',
              border: '1px solid #F3C8C2',
              borderRadius: 16,
              padding: 14,
              marginBottom: 14,
              fontSize: 12,
              color: '#A53B2F',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 9,
              lineHeight: 1.45,
            }}
          >
            <AlertTriangle size={17} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {result && !scanning && (
          <div>
            <div
              style={{
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: 20,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 10,
                    background: ACCENT,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <ScanLine size={16} />
                </div>

                <div
                  style={{
                    fontSize: 10,
                    color: MUTED,
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '.06em',
                  }}
                >
                  Repas détecté
                  {result.fiabilite ? ` · ${result.fiabilite}` : ''}
                </div>
              </div>

              <div
                style={{
                  fontSize: 17,
                  fontWeight: 900,
                  lineHeight: 1.3,
                }}
              >
                {result.description || 'Repas analysé'}
              </div>

              {result.note && (
                <div
                  style={{
                    fontSize: 11,
                    color: MUTED,
                    marginTop: 7,
                    lineHeight: 1.45,
                  }}
                >
                  {result.note}
                </div>
              )}
            </div>

            <div
              style={{
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: 20,
                padding: 15,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: MUTED,
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  marginBottom: 12,
                }}
              >
                Estimation nutritionnelle
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4,minmax(0,1fr))',
                  gap: 7,
                }}
              >
                {[
                  {
                    label: 'Calories',
                    val: totalKcal,
                    unit: 'kcal',
                  },
                  {
                    label: 'Protéines',
                    val: Math.round(Number(result.total?.protein || 0)),
                    unit: 'g',
                  },
                  {
                    label: 'Glucides',
                    val: Math.round(Number(result.total?.carbs || 0)),
                    unit: 'g',
                  },
                  {
                    label: 'Lipides',
                    val: Math.round(Number(result.total?.fat || 0)),
                    unit: 'g',
                  },
                ].map(({ label, val, unit }) => (
                  <div
                    key={label}
                    style={{
                      background: '#F7F8F4',
                      borderRadius: 13,
                      padding: '11px 4px',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 950,
                      }}
                    >
                      {val}
                      <span
                        style={{
                          fontSize: 8,
                          color: MUTED,
                          marginLeft: 2,
                        }}
                      >
                        {unit}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: 8.5,
                        color: MUTED,
                        marginTop: 4,
                      }}
                    >
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {Array.isArray(result.aliments) && result.aliments.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {result.aliments.map((item: any, index: number) => (
                  <div
                    key={`${item.nom || item.name || 'food'}-${index}`}
                    style={{
                      background: SURFACE,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 17,
                      padding: '13px 13px 13px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 850,
                        }}
                      >
                        {item.nom || item.name || 'Aliment'}
                      </div>

                      <div
                        style={{
                          fontSize: 10.5,
                          color: MUTED,
                          marginTop: 4,
                          lineHeight: 1.4,
                        }}
                      >
                        {item.quantite || 'Quantité estimée'}
                        {' · '}
                        P {Number(item.protein || 0)}g
                        {' · '}
                        G {Number(item.carbs || 0)}g
                        {' · '}
                        L {Number(item.fat || 0)}g
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      >
                        {Math.round(Number(item.kcal || item.calories || 0))}{' '}
                        kcal
                      </div>

                      <button
                        type="button"
                        onClick={() => void addSingle(item)}
                        disabled={adding}
                        aria-label={`Ajouter ${item.nom || item.name || 'cet aliment'}`}
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 13,
                          border: '1px solid #A5E600',
                          background: ACCENT,
                          color: TEXT,
                          display: 'grid',
                          placeItems: 'center',
                          cursor: adding ? 'default' : 'pointer',
                          opacity: adding ? 0.6 : 1,
                        }}
                      >
                        <Plus size={18} strokeWidth={2.8} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                marginTop: 12,
                fontSize: 10,
                color: '#989A93',
                lineHeight: 1.45,
              }}
            >
              Les valeurs issues d’une photo sont des estimations. Vérifie les
              quantités si tu as besoin d’un suivi plus précis.
            </div>
          </div>
        )}

        {!photoBase64 && !scanning && !result && (
          <div
            style={{
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              borderRadius: 24,
              padding: '30px 22px',
              textAlign: 'center',
              marginTop: 8,
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 23,
                background: ACCENT,
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 18px',
              }}
            >
              <Camera size={31} strokeWidth={2.3} />
            </div>

            <div
              style={{
                fontSize: 20,
                fontWeight: 950,
                letterSpacing: '-.03em',
              }}
            >
              Prends ton repas en photo
            </div>

            <div
              style={{
                maxWidth: 300,
                margin: '8px auto 0',
                fontSize: 12,
                color: MUTED,
                lineHeight: 1.55,
              }}
            >
              NOX analyse la photo pour identifier les aliments et estimer
              calories, protéines, glucides et lipides.
            </div>

            <div
              style={{
                marginTop: 20,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                style={{
                  minHeight: 50,
                  border: '1px solid #A5E600',
                  borderRadius: 15,
                  background: ACCENT,
                  color: TEXT,
                  fontWeight: 900,
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                }}
              >
                <Camera size={17} />
                Caméra
              </button>

              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                style={{
                  minHeight: 50,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 15,
                  background: '#FAFBF7',
                  color: TEXT,
                  fontWeight: 850,
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                }}
              >
                <ImagePlus size={17} />
                Galerie
              </button>
            </div>
          </div>
        )}
      </main>

      <footer
        style={{
          flexShrink: 0,
          padding: '11px 18px',
          paddingBottom: 'max(22px, env(safe-area-inset-bottom))',
          background: BG,
          borderTop: result ? `1px solid ${BORDER}` : 'none',
        }}
      >
        {result && !scanning ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <button
              type="button"
              onClick={() => void addAll()}
              disabled={adding}
              style={{
                width: '100%',
                minHeight: 56,
                padding: '14px 16px',
                background: ACCENT,
                border: '1px solid #A5E600',
                borderRadius: 16,
                color: TEXT,
                fontWeight: 950,
                fontSize: 14,
                cursor: adding ? 'default' : 'pointer',
                opacity: adding ? 0.65 : 1,
              }}
            >
              {adding ? 'Ajout…' : `Ajouter le repas · ${totalKcal} kcal`}
            </button>

            <button
              type="button"
              onClick={() => {
                resetScan();
                cameraRef.current?.click();
              }}
              style={{
                width: '100%',
                minHeight: 46,
                padding: '11px 14px',
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: 14,
                color: TEXT,
                fontWeight: 800,
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
              }}
            >
              <RefreshCw size={15} />
              Nouvelle photo
            </button>
          </div>
        ) : photoBase64 && !scanning && !result ? (
          <button
            type="button"
            onClick={() => {
              resetScan();
              cameraRef.current?.click();
            }}
            style={{
              width: '100%',
              minHeight: 52,
              border: `1px solid ${BORDER}`,
              borderRadius: 16,
              background: SURFACE,
              color: TEXT,
              fontWeight: 850,
              cursor: 'pointer',
            }}
          >
            Réessayer avec une autre photo
          </button>
        ) : null}
      </footer>
    </div>
  );
}
