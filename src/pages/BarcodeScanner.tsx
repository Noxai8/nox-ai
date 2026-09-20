import { useEffect, useRef, useState } from 'react';
import { ScanLine, Search, X, Check, AlertTriangle } from 'lucide-react';
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

export default function BarcodeScanner({ onAdd, selectedMeal, onClose }: Props) {
  const { user } = useAuth();
  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [qty, setQty] = useState('100');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const search = async (rawCode: string) => {
    const code = rawCode.replace(/\D/g, '').trim();
    if (code.length < 8) {
      setError('Entre un code-barres valide.');
      return;
    }

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
        setError('Produit non trouvé. Tu peux l’ajouter manuellement.');
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

    const { error: insertError } = await supabase.from('food_entries').insert(entry);

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
          marginBottom: 20,
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.08em' }}>
            ALIMENT
          </div>
          <div style={{ fontSize: 23, fontWeight: 950, letterSpacing: '-.04em', marginTop: 3 }}>
            Scanner un code-barres
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
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
          background: SURFACE,
          border: `1px solid ${BORDER}`,
          borderRadius: 22,
          padding: 16,
          boxShadow: '0 6px 24px rgba(20,20,20,.035)',
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 17,
            background: '#EEF0E8',
            display: 'grid',
            placeItems: 'center',
            marginBottom: 15,
          }}
        >
          <ScanLine size={24} strokeWidth={2.4} />
        </div>

        <div style={{ fontSize: 13, fontWeight: 850, marginBottom: 5 }}>
          Code EAN / UPC
        </div>
        <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.45, marginBottom: 13 }}>
          Entre les chiffres sous le code-barres. La lecture caméra sera ajoutée dans l’étape scanner dédiée.
        </div>

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
              cursor: loading || barcode.length < 8 ? 'default' : 'pointer',
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
                <div style={{ fontSize: 16, fontWeight: 900 }}>{product.name}</div>
                {product.brand && (
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>{product.brand}</div>
                )}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    marginTop: 7,
                    color: product.per100g.kcal > 0 ? '#536000' : '#A53B2F',
                    fontSize: 10,
                    fontWeight: 850,
                  }}
                >
                  {product.per100g.kcal > 0 ? <Check size={13} /> : <AlertTriangle size={13} />}
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
                ['Protéines', Math.round(product.per100g.protein * ratio * 10) / 10, 'g'],
                ['Glucides', Math.round(product.per100g.carbs * ratio * 10) / 10, 'g'],
                ['Lipides', Math.round(product.per100g.fat * ratio * 10) / 10, 'g'],
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
                    <span style={{ fontSize: 8, marginLeft: 2, color: MUTED }}>{unit}</span>
                  </div>
                  <div style={{ fontSize: 8.5, color: MUTED, marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 10, color: MUTED, fontWeight: 850, marginBottom: 8 }}>
                PORTION
              </div>

              <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4 }}>
                {portions.map((portion) => (
                  <button
                    key={`${portion.label}-${portion.g}`}
                    type="button"
                    onClick={() => setQty(String(portion.g))}
                    style={{
                      flexShrink: 0,
                      border: `1px solid ${Math.round(quantity) === portion.g ? '#A7D900' : BORDER}`,
                      background: Math.round(quantity) === portion.g ? ACCENT : '#FAFBF7',
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

              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 10 }}>
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
                <div style={{ fontSize: 12, color: MUTED, fontWeight: 800 }}>g</div>
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
              : `Ajouter · ${Math.round(product.per100g.kcal * ratio)} kcal`}
          </button>
        </div>
      )}

      <div style={{ marginTop: 15, fontSize: 10, color: '#9A9D96', lineHeight: 1.5 }}>
        Informations produit fournies par Open Food Facts. Vérifie l’étiquette si les données semblent incomplètes.
      </div>
    </div>
  );
}
