import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CameraOff,
  Check,
  Keyboard,
  ScanLine,
  Search,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const ACCENT = '#B7FF00';
const BG = '#F6F7F2';
const SURFACE = '#FFFFFF';
const BORDER = '#E4E4DF';
const TEXT = '#111111';
const MUTED = '#77776F';

type Props = {
  onAdd: (entry: any) => void;
  selectedMeal: string;
  onClose: () => void;
};

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string; format?: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike;
  }
}

export default function BarcodeScanner({ onAdd, selectedMeal, onClose }: Props) {
  const { user } = useAuth();

  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [qty, setQty] = useState('100');

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(true);
  const [cameraMessage, setCameraMessage] = useState('');
  const [detectedCode, setDetectedCode] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const scanningRef = useRef(false);

  useEffect(() => {
    const supported =
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof window !== 'undefined' &&
      'BarcodeDetector' in window;

    setCameraSupported(supported);

    if (!supported) {
      setCameraMessage(
        'Le scan caméra natif n’est pas disponible sur ce navigateur. La saisie du code reste disponible.',
      );
    }

    return () => stopCamera();
  }, []);

  const clearScanTimer = () => {
    if (scanTimerRef.current !== null) {
      window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
  };

  const stopCamera = () => {
    clearScanTimer();
    scanningRef.current = false;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
    setCameraStarting(false);
  };

  const search = async (rawCode: string) => {
    const code = rawCode.replace(/\D/g, '').trim();

    if (code.length < 8) {
      setError('Entre un code-barres valide.');
      return;
    }

    setBarcode(code);
    setLoading(true);
    setError('');
    setProduct(null);

    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`,
      );

      if (!res.ok) throw new Error('network');

      const data = await res.json();

      if (data.status !== 1 || !data.product) {
        setError('Produit non trouvé. Tu peux saisir un autre code.');
        return;
      }

      const p = data.product;
      const n = p.nutriments || {};

      const servingGrams =
        Number.parseFloat(String(p.serving_quantity || '')) ||
        Number.parseFloat(String(p.serving_size || '').replace(',', '.')) ||
        100;

      const kcalRaw =
        Number(n['energy-kcal_100g']) ||
        (Number(n['energy_100g']) ? Number(n['energy_100g']) / 4.184 : 0);

      setProduct({
        code,
        name: p.product_name_fr || p.product_name || 'Produit sans nom',
        brand: p.brands || '',
        image: p.image_front_small_url || p.image_small_url || null,
        servingGrams: Math.max(1, Math.round(servingGrams)),
        per100g: {
          kcal: Math.round(kcalRaw || 0),
          protein: Math.round(Number(n['proteins_100g'] || 0) * 10) / 10,
          carbs: Math.round(Number(n['carbohydrates_100g'] || 0) * 10) / 10,
          fat: Math.round(Number(n['fat_100g'] || 0) * 10) / 10,
        },
      });

      setQty(String(Math.max(1, Math.round(servingGrams))));
    } catch {
      setError('Impossible de rechercher ce produit pour le moment.');
    } finally {
      setLoading(false);
    }
  };

  const scanFrame = async () => {
    if (
      !cameraActive ||
      !detectorRef.current ||
      !videoRef.current ||
      scanningRef.current
    ) {
      return;
    }

    const video = videoRef.current;

    if (video.readyState < 2 || video.videoWidth === 0) {
      scanTimerRef.current = window.setTimeout(scanFrame, 250);
      return;
    }

    scanningRef.current = true;

    try {
      const results = await detectorRef.current.detect(video);
      const result = results.find((item) => item.rawValue);

      if (result?.rawValue) {
        const code = result.rawValue.replace(/\D/g, '');

        if (code.length >= 8) {
          setDetectedCode(code);
          setBarcode(code);
          stopCamera();
          await search(code);
          return;
        }
      }
    } catch (scanError) {
      console.error('Barcode detection:', scanError);
    } finally {
      scanningRef.current = false;
    }

    scanTimerRef.current = window.setTimeout(scanFrame, 220);
  };

  useEffect(() => {
    if (!cameraActive) return;

    scanTimerRef.current = window.setTimeout(scanFrame, 300);

    return clearScanTimer;
  }, [cameraActive]);

  const startCamera = async () => {
    setError('');
    setCameraMessage('');
    setDetectedCode('');

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof window === 'undefined' ||
      !window.BarcodeDetector
    ) {
      setCameraSupported(false);
      setCameraMessage(
        'Le scan caméra natif n’est pas disponible sur ce navigateur. Utilise la saisie du code ci-dessous.',
      );
      inputRef.current?.focus();
      return;
    }

    setCameraStarting(true);

    try {
      detectorRef.current = new window.BarcodeDetector({
        formats: [
          'ean_13',
          'ean_8',
          'upc_a',
          'upc_e',
          'code_128',
          'code_39',
          'itf',
        ],
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;

      if (!videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        throw new Error('video unavailable');
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      setCameraActive(true);
      setCameraMessage('Place le code-barres au centre du cadre.');
    } catch (cameraError: any) {
      console.error('Camera start:', cameraError);
      stopCamera();

      if (
        cameraError?.name === 'NotAllowedError' ||
        cameraError?.name === 'PermissionDeniedError'
      ) {
        setCameraMessage(
          'Autorise l’accès à la caméra dans ton navigateur, puis réessaie.',
        );
      } else {
        setCameraMessage(
          'La caméra n’a pas pu démarrer. Tu peux saisir le code manuellement.',
        );
      }
    } finally {
      setCameraStarting(false);
    }
  };

  const quantity = Math.max(1, Number.parseFloat(qty) || 100);
  const ratio = quantity / 100;

  const portions = product
    ? [
        { label: '1 portion', g: product.servingGrams || 100 },
        { label: '100 g', g: 100 },
        { label: '150 g', g: 150 },
        { label: '200 g', g: 200 },
      ]
    : [];

  const add = async () => {
    if (!product || !user || saving) return;

    setSaving(true);
    setError('');

    const entry = {
      user_id: user.id,
      meal_type: selectedMeal,
      food_name: `${product.name}${product.brand ? ` (${product.brand})` : ''} - ${Math.round(quantity)}g`,
      calories: Math.round(product.per100g.kcal * ratio),
      protein: Math.round(product.per100g.protein * ratio * 10) / 10,
      carbs: Math.round(product.per100g.carbs * ratio * 10) / 10,
      fat: Math.round(product.per100g.fat * ratio * 10) / 10,
      created_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase
      .from('food_entries')
      .insert(entry);

    if (insertError) {
      console.error('Barcode food insert:', insertError);
      setError("L’aliment n’a pas pu être ajouté au journal.");
      setSaving(false);
      return;
    }

    onAdd(entry);
    onClose();
  };

  return (
    <div
      style={{
        minHeight: '100%',
        background: BG,
        color: TEXT,
        padding: '4px 0 22px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 900,
              color: MUTED,
              letterSpacing: '.08em',
            }}
          >
            ALIMENT
          </div>
          <div
            style={{
              fontSize: 23,
              fontWeight: 950,
              letterSpacing: '-.04em',
              marginTop: 3,
            }}
          >
            Scanner un code-barres
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            stopCamera();
            onClose();
          }}
          aria-label="Fermer"
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
          <X size={19} />
        </button>
      </div>

      <div
        style={{
          background: '#111',
          borderRadius: 24,
          overflow: 'hidden',
          position: 'relative',
          minHeight: 260,
          boxShadow: '0 10px 30px rgba(20,20,20,.08)',
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            width: '100%',
            height: 300,
            objectFit: 'cover',
            display: cameraActive ? 'block' : 'none',
          }}
        />

        {!cameraActive && (
          <div
            style={{
              minHeight: 260,
              padding: 24,
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: '#fff',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 21,
                background: ACCENT,
                color: TEXT,
                display: 'grid',
                placeItems: 'center',
                marginBottom: 16,
              }}
            >
              {cameraSupported ? <Camera size={29} /> : <CameraOff size={29} />}
            </div>

            <div style={{ fontSize: 17, fontWeight: 900 }}>
              {cameraSupported ? 'Scanner avec la caméra' : 'Caméra non compatible'}
            </div>

            <div
              style={{
                maxWidth: 300,
                color: '#9A9A95',
                fontSize: 11,
                lineHeight: 1.5,
                marginTop: 7,
              }}
            >
              {cameraSupported
                ? 'NOX détecte automatiquement les principaux codes EAN et UPC.'
                : 'Tu peux toujours retrouver le produit en entrant les chiffres du code-barres.'}
            </div>

            {cameraSupported && (
              <button
                type="button"
                onClick={startCamera}
                disabled={cameraStarting}
                style={{
                  marginTop: 18,
                  border: 0,
                  borderRadius: 14,
                  padding: '12px 17px',
                  background: ACCENT,
                  color: TEXT,
                  fontSize: 12,
                  fontWeight: 900,
                  cursor: cameraStarting ? 'default' : 'pointer',
                  opacity: cameraStarting ? 0.65 : 1,
                }}
              >
                {cameraStarting ? 'Ouverture…' : 'Ouvrir la caméra'}
              </button>
            )}
          </div>
        )}

        {cameraActive && (
          <>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <div
                style={{
                  width: '78%',
                  height: 118,
                  border: `2px solid ${ACCENT}`,
                  borderRadius: 18,
                  boxShadow: '0 0 0 999px rgba(0,0,0,.24)',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 16,
                    right: 16,
                    top: '50%',
                    height: 2,
                    background: ACCENT,
                    boxShadow: `0 0 12px ${ACCENT}`,
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={stopCamera}
              style={{
                position: 'absolute',
                right: 12,
                top: 12,
                width: 40,
                height: 40,
                borderRadius: 13,
                border: '1px solid rgba(255,255,255,.16)',
                background: 'rgba(0,0,0,.55)',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          </>
        )}
      </div>

      {(cameraMessage || detectedCode) && (
        <div
          style={{
            marginTop: 9,
            fontSize: 10.5,
            color: MUTED,
            textAlign: 'center',
            lineHeight: 1.45,
          }}
        >
          {detectedCode ? `Code détecté : ${detectedCode}` : cameraMessage}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          margin: '20px 0 11px',
        }}
      >
        <div style={{ height: 1, background: BORDER, flex: 1 }} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: MUTED,
            fontSize: 9.5,
            fontWeight: 850,
          }}
        >
          <Keyboard size={14} />
          SAISIE MANUELLE
        </div>
        <div style={{ height: 1, background: BORDER, flex: 1 }} />
      </div>

      <div
        style={{
          background: SURFACE,
          border: `1px solid ${BORDER}`,
          borderRadius: 20,
          padding: 14,
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            ref={inputRef}
            value={barcode}
            onChange={(e) => setBarcode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') search(barcode);
            }}
            placeholder="3017620422003"
            inputMode="numeric"
            maxLength={14}
            style={{
              flex: 1,
              minWidth: 0,
              padding: '13px 14px',
              background: '#FAFBF7',
              border: `1px solid ${BORDER}`,
              borderRadius: 13,
              color: TEXT,
              fontSize: 15,
              fontFamily: 'monospace',
              letterSpacing: '.04em',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          <button
            type="button"
            onClick={() => search(barcode)}
            disabled={loading || barcode.length < 8}
            style={{
              width: 48,
              border: 0,
              borderRadius: 13,
              background: ACCENT,
              color: TEXT,
              display: 'grid',
              placeItems: 'center',
              cursor:
                loading || barcode.length < 8 ? 'default' : 'pointer',
              opacity: loading || barcode.length < 8 ? 0.45 : 1,
            }}
          >
            <Search size={19} strokeWidth={2.7} />
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: '12px 14px',
            borderRadius: 14,
            background: '#FFF1EF',
            color: '#A53B2F',
            fontSize: 12,
            fontWeight: 750,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {product && (
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              borderRadius: 22,
              padding: 16,
            }}
          >
            <div style={{ display: 'flex', gap: 13, alignItems: 'center' }}>
              {product.image ? (
                <img
                  src={product.image}
                  alt=""
                  style={{
                    width: 62,
                    height: 62,
                    borderRadius: 14,
                    objectFit: 'cover',
                    border: `1px solid ${BORDER}`,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 62,
                    height: 62,
                    borderRadius: 14,
                    background: '#F0F1EC',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <ScanLine size={23} />
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 900 }}>
                  {product.name}
                </div>

                {product.brand && (
                  <div
                    style={{
                      fontSize: 11,
                      color: MUTED,
                      marginTop: 3,
                    }}
                  >
                    {product.brand}
                  </div>
                )}

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    marginTop: 7,
                    color:
                      product.per100g.kcal > 0 ? '#536000' : '#A53B2F',
                    fontSize: 10,
                    fontWeight: 850,
                  }}
                >
                  {product.per100g.kcal > 0 ? (
                    <Check size={13} />
                  ) : (
                    <AlertTriangle size={13} />
                  )}

                  {product.per100g.kcal > 0
                    ? 'Données nutritionnelles disponibles'
                    : 'Données nutritionnelles incomplètes'}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4,minmax(0,1fr))',
                gap: 7,
                marginTop: 16,
              }}
            >
              {[
                ['Calories', Math.round(product.per100g.kcal * ratio), 'kcal'],
                [
                  'Protéines',
                  Math.round(product.per100g.protein * ratio * 10) / 10,
                  'g',
                ],
                [
                  'Glucides',
                  Math.round(product.per100g.carbs * ratio * 10) / 10,
                  'g',
                ],
                [
                  'Lipides',
                  Math.round(product.per100g.fat * ratio * 10) / 10,
                  'g',
                ],
              ].map(([label, value, unit]) => (
                <div
                  key={String(label)}
                  style={{
                    background: '#F7F8F4',
                    borderRadius: 13,
                    padding: '11px 5px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 950 }}>
                    {value}
                    <span
                      style={{
                        fontSize: 8,
                        marginLeft: 2,
                        color: MUTED,
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

            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  fontSize: 10,
                  color: MUTED,
                  fontWeight: 850,
                  marginBottom: 8,
                }}
              >
                PORTION
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 7,
                  overflowX: 'auto',
                  paddingBottom: 4,
                }}
              >
                {portions.map((portion) => (
                  <button
                    key={`${portion.label}-${portion.g}`}
                    type="button"
                    onClick={() => setQty(String(portion.g))}
                    style={{
                      flexShrink: 0,
                      border: `1px solid ${
                        Math.round(quantity) === portion.g
                          ? '#A7D900'
                          : BORDER
                      }`,
                      background:
                        Math.round(quantity) === portion.g
                          ? ACCENT
                          : '#FAFBF7',
                      borderRadius: 999,
                      padding: '9px 12px',
                      fontSize: 10,
                      fontWeight: 850,
                      color: TEXT,
                      cursor: 'pointer',
                    }}
                  >
                    {portion.label}
                  </button>
                ))}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  marginTop: 10,
                }}
              >
                <input
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  type="number"
                  inputMode="decimal"
                  min="1"
                  style={{
                    width: '100%',
                    padding: '13px 14px',
                    background: '#FAFBF7',
                    border: `1px solid ${BORDER}`,
                    borderRadius: 13,
                    color: TEXT,
                    fontSize: 16,
                    fontWeight: 850,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <div
                  style={{
                    fontSize: 12,
                    color: MUTED,
                    fontWeight: 800,
                  }}
                >
                  g
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={add}
            disabled={saving}
            style={{
              width: '100%',
              marginTop: 12,
              padding: 16,
              background: ACCENT,
              border: '1px solid #A7D900',
              borderRadius: 16,
              color: TEXT,
              fontWeight: 950,
              fontSize: 14,
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.65 : 1,
            }}
          >
            {saving
              ? 'Ajout…'
              : `Ajouter · ${Math.round(
                  product.per100g.kcal * ratio,
                )} kcal`}
          </button>
        </div>
      )}

      <div
        style={{
          marginTop: 15,
          fontSize: 10,
          color: '#9A9D96',
          lineHeight: 1.5,
        }}
      >
        Informations produit fournies par Open Food Facts. Vérifie
        l’étiquette si les données semblent incomplètes.
      </div>
    </div>
  );
}
