import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MealReview, { type MealValues } from '../components/MealReview';
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
  Sparkles,
  Utensils,
  Flame,
  Dumbbell,
  Wheat,
  Droplets,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { invokeEdge } from '../lib/edgeFunctions';
import { useAuth } from '../lib/AuthContext';

const ACCENT = '#C8FF00';
const BG = '#090B0A';
const SURFACE = '#171A18';
const BORDER = '#303531';
const TEXT = '#FFFFFF';
const ON_ACCENT = '#090B0A';
const MUTED = '#A5AAA6';

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
  const reviewRef = useRef<HTMLDivElement>(null);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const resetScan = () => {
    setReview(null);
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

      // Client Supabase existant : clé publique et jeton de l'utilisateur envoyés automatiquement
      const { data, error: fnError } = await invokeEdge<any>(
        'analyze-meal',
        { base64, mime: 'image/jpeg' },
        "L'analyse du repas n'est pas disponible pour le moment.",
      );

      if (fnError) {
        throw new Error(fnError);
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

  // Une estimation photo n'est jamais enregistrée directement : vérification obligatoire
  const [review, setReview] = useState<MealValues | null>(null);

  const showReview = (values: MealValues) => {
    setReview(values);
    window.setTimeout(() => reviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  const addAll = () => {
    if (!result) return;
    showReview({
      food_name: result.description || 'Repas scanné',
      calories: Number(result.total?.kcal ?? result.total?.calories ?? 0),
      protein: Number(result.total?.protein || 0),
      carbs: Number(result.total?.carbs || 0),
      fat: Number(result.total?.fat || 0),
    });
  };

  const addSingle = (item: any) => {
    showReview({
      food_name: item.nom || item.name || 'Aliment',
      calories: Number(item.kcal || item.calories || 0),
      protein: Number(item.protein || 0),
      carbs: Number(item.carbs || 0),
      fat: Number(item.fat || 0),
    });
  };

  const saveReviewed = async (values: MealValues) => {
    if (!user || adding) return;
    setAdding(true);
    setError('');
    const { error: insertError } = await supabase.from('food_entries').insert({
      user_id: user.id,
      meal_type: selectedMeal,
      ...values,
      source: 'photo',
      created_at: new Date().toISOString(),
    });
    if (insertError) {
      console.error('FoodScan saveReviewed:', insertError);
      setError("Le repas n'a pas pu être ajouté au journal.");
      setAdding(false);
      return;
    }
    setReview(null);
    setAdded(true);
    setAdding(false);
    window.setTimeout(() => { navigate('/fuel'); }, 900);
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
                border: `1px solid ${active ? '#A5D600' : BORDER}`,
                background: active ? ACCENT : SURFACE,
                color: active ? ON_ACCENT : TEXT,
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
        {photoBase64 && (!result || scanning) && (
          <div style={{ maxWidth: 900, margin: '0 auto 16px', borderRadius: 20, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
            <img src={photoBase64} alt="Photo du repas" style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }} />
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
              background: '#2B1C1A',
              border: '1px solid #F3C8C2',
              borderRadius: 16,
              padding: 14,
              marginBottom: 14,
              fontSize: 12,
              color: '#FFB2A8',
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
          <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gap: 18, paddingBottom: 22 }}>
            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 20, alignItems: 'stretch' }}>
              {photoBase64 && (
                <img src={photoBase64} alt="Photo analysée du repas" style={{ width: '100%', height: '100%', minHeight: 230, maxHeight: 330, objectFit: 'cover', borderRadius: 20, border: `1px solid ${BORDER}`, boxSizing: 'border-box' }} />
              )}
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
                <div style={{ color: ACCENT, fontSize: 13, fontWeight: 850, display: 'flex', gap: 8, alignItems: 'center' }}><Sparkles size={17} /> Analyse par IA · Estimation</div>
                <h2 style={{ fontSize: 'clamp(20px, 2.7vw, 28px)', lineHeight: 1.2, margin: 0, letterSpacing: '-.035em' }}>{result.description || 'Repas analysé'}</h2>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: MUTED }}>Voici les aliments détectés sur ta photo. Vérifie les quantités avant d'enregistrer.</p>
                {result.note && <p style={{ margin: 0, fontSize: 12, color: MUTED }}>{result.note}</p>}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 9 }}>
                  {[
                    { label: 'Calories', val: totalKcal, unit: 'kcal', Icon: Flame, tint: '#FF823B' },
                    { label: 'Protéines', val: Math.round(Number(result.total?.protein || 0)), unit: 'g', Icon: Dumbbell, tint: ACCENT },
                    { label: 'Glucides', val: Math.round(Number(result.total?.carbs || 0)), unit: 'g', Icon: Wheat, tint: '#F7C947' },
                    { label: 'Lipides', val: Math.round(Number(result.total?.fat || 0)), unit: 'g', Icon: Droplets, tint: '#F178A5' },
                  ].map(({ label, val, unit, Icon, tint }) => (
                    <div key={label} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '14px 12px', display: 'flex', alignItems: 'center', gap: 11 }}>
                      <div style={{ background: '#242924', color: tint, width: 38, height: 38, borderRadius: 12, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon size={20} /></div>
                      <div><div style={{ fontWeight: 950, fontSize: 21, lineHeight: 1.1 }}>{val}<span style={{ fontSize: 10, color: MUTED, marginLeft: 4 }}>{unit}</span></div><div style={{ color: MUTED, fontSize: 11, marginTop: 5 }}>{label}</div></div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {Array.isArray(result.aliments) && result.aliments.length > 0 && (
              <section style={{ border: `1px solid ${BORDER}`, borderRadius: 20, padding: 'clamp(12px, 2vw, 20px)', background: '#101311' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <Utensils size={22} color={ACCENT} />
                  <div><h3 style={{ margin: 0, fontSize: 19, letterSpacing: '-.02em' }}>Aliments détectés</h3><div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>Sélectionne un aliment pour le vérifier et l'ajouter seul.</div></div>
                </div>
                <div style={{ display: 'grid', gap: 7 }}>
                  {result.aliments.map((item: any, index: number) => (
                    <div key={`${item.nom || item.name || 'food'}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, background: SURFACE, border: `1px solid ${BORDER}` }}>
                      <div style={{ width: 38, height: 38, borderRadius: 11, background: '#28301D', display: 'grid', placeItems: 'center', color: ACCENT, flexShrink: 0 }}><Utensils size={18} /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 850, fontSize: 13, lineHeight: 1.4 }}>{item.nom || item.name || 'Aliment'}</div>
                        <div style={{ fontSize: 11, color: MUTED, marginTop: 3, lineHeight: 1.4 }}>{item.quantite || 'Quantité estimée'} · P {Number(item.protein || 0)} g · G {Number(item.carbs || 0)} g · L {Number(item.fat || 0)} g</div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 850, whiteSpace: 'nowrap', background: '#252A26', borderRadius: 99, padding: '7px 10px' }}>{Math.round(Number(item.kcal || item.calories || 0))} kcal</span>
                      <button type="button" onClick={() => addSingle(item)} disabled={adding} aria-label={`Vérifier et ajouter ${item.nom || item.name || 'cet aliment'}`} title="Vérifier cet aliment" style={{ width: 37, height: 37, borderRadius: 11, border: `1px solid ${BORDER}`, background: '#242924', color: ACCENT, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}><Plus size={19} /></button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div ref={reviewRef} style={{ scrollMarginTop: 16 }}>
              {review ? (
                <MealReview key={review.food_name + review.calories} estimate={review} busy={adding} dark onCancel={() => setReview(null)} onConfirm={values => { void saveReviewed(values); }} />
              ) : (
                <div style={{ border: `1px solid ${ACCENT}`, borderRadius: 20, background: '#111611', padding: 'clamp(14px, 2vw, 22px)' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 6 }}>Vérifie et ajuste si nécessaire</div>
                  <div style={{ color: MUTED, fontSize: 12, marginBottom: 16 }}>Les valeurs sont estimées par l'IA. Rien n'est enregistré sans ta validation.</div>
                  <button type="button" onClick={addAll} disabled={adding} style={{ width: '100%', minHeight: 54, background: ACCENT, color: ON_ACCENT, border: 'none', borderRadius: 13, fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>Vérifier et ajouter le repas · {totalKcal} kcal</button>
                </div>
              )}
            </div>
            <button type="button" onClick={() => { resetScan(); cameraRef.current?.click(); }} style={{ width: '100%', minHeight: 46, background: SURFACE, color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><RefreshCw size={16} /> Nouvelle photo</button>
          </div>
        )}

        {!photoBase64 && !scanning && !result && (
          <div style={{ maxWidth: 650, margin: '12px auto 22px', border: `1px solid ${BORDER}`, borderRadius: 26, background: '#101411', padding: '28px clamp(16px, 4vw, 34px)' }}>
            <div style={{ display: 'grid', justifyItems: 'center', textAlign: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 58, height: 58, borderRadius: 18, background: '#202B17', color: ACCENT, border: '1px solid #3D501F', display: 'grid', placeItems: 'center' }}>
                <Camera size={27} />
              </div>
              <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: '-.04em' }}>Prends ton repas en photo</div>
              <div style={{ color: MUTED, maxWidth: 430, lineHeight: 1.55, fontSize: 13 }}>NOX identifie les aliments et estime les quantités et les valeurs nutritionnelles.</div>
            </div>
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 19, border: `1px solid ${BORDER}`, height: 205, background: '#242925', marginBottom: 14 }}>
              <img src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=85" alt="Exemple illustratif d'un repas photographié, non analysé" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 60px rgba(0,0,0,.24)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: 11, left: 12, background: 'rgba(8,10,9,.85)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '5px 9px', color: '#E4E9E4', fontSize: 11, fontWeight: 750 }}>Exemple de photo · non analysée</div>
              {[[8,9],[92,9],[8,91],[92,91]].map(([x,y],i) => <span key={i} style={{ position: 'absolute', left: x+'%', top: y+'%', width: 19, height: 19, borderLeft: i%2===0 ? `3px solid ${ACCENT}` : 'none', borderRight: i%2===1 ? `3px solid ${ACCENT}` : 'none', borderTop: i<2 ? `3px solid ${ACCENT}` : 'none', borderBottom: i>=2 ? `3px solid ${ACCENT}` : 'none', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />)}
            </div>
            <div style={{ display: 'grid', gap: 9 }}>
              <button type="button" onClick={() => cameraRef.current?.click()} style={{ minHeight: 58, border: 'none', borderRadius: 15, background: ACCENT, color: ON_ACCENT, fontWeight: 900, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer' }}><Camera size={19} /> Prendre une photo</button>
              <button type="button" onClick={() => galleryRef.current?.click()} style={{ minHeight: 54, border: `1px solid ${BORDER}`, borderRadius: 15, background: SURFACE, color: TEXT, fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer' }}><ImagePlus size={18} /> Choisir dans la galerie</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '18px 0', color: MUTED, fontSize: 11, fontWeight: 800 }}><span style={{ height: 1, background: BORDER, flex: 1 }} />OU<span style={{ height: 1, background: BORDER, flex: 1 }} /></div>
            <button type="button" onClick={() => navigate('/fuel?scan=barcode')} style={{ width: '100%', minHeight: 66, border: `1px solid ${BORDER}`, borderRadius: 15, background: SURFACE, color: TEXT, display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', padding: '12px 17px', cursor: 'pointer' }}>
              <ScanLine size={23} color={ACCENT} />
              <span style={{ flex: 1 }}><strong style={{ display: 'block', fontSize: 14 }}>Scanner un code-barres</strong><span style={{ display: 'block', color: MUTED, fontSize: 12, marginTop: 4 }}>Pour ajouter un produit emballé</span></span>
              <span style={{ color: MUTED, fontSize: 24 }}>›</span>
            </button>
          </div>
        )}
        {!photoBase64 && !scanning && !result && (
          <div style={{ maxWidth: 790, margin: '0 auto 22px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 16 }}>
            {[
              ['✦', 'Analyse par IA', 'Identification des aliments'],
              ['▥', 'Valeurs nutritionnelles', 'Calories et macronutriments'],
              ['✓', 'Tu gardes le contrôle', 'Corrige avant d’enregistrer'],
            ].map(([symbol, title, description]) => (
              <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <div style={{ width: 37, height: 37, flexShrink: 0, borderRadius: 13, display: 'grid', placeItems: 'center', background: '#1B2515', color: ACCENT, fontSize: 22 }}>{symbol}</div>
                <div><div style={{ color: TEXT, fontSize: 12, fontWeight: 850 }}>{title}</div><div style={{ color: MUTED, fontSize: 11, marginTop: 4 }}>{description}</div></div>
              </div>
            ))}
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
        {photoBase64 && !scanning && !result ? (

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
