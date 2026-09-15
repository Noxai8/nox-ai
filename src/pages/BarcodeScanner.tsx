import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

export default function BarcodeScanner({ onAdd, selectedMeal, onClose }: { onAdd: (entry: any) => void; selectedMeal: string; onClose: () => void }) {
  const { user } = useAuth();
  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qty, setQty] = useState('100');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const search = async (code: string) => {
    if (!code || code.length < 8) return;
    setLoading(true);
    setError('');
    setProduct(null);
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
      const data = await res.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        const per100 = p.nutriments || {};
        setProduct({
          name: p.product_name_fr || p.product_name || 'Produit inconnu',
          brand: p.brands || '',
          image: p.image_front_small_url || null,
          per100g: {
            kcal: Math.round(per100['energy-kcal_100g'] || per100['energy_100g'] / 4.184 || 0),
            protein: Math.round((per100['proteins_100g'] || 0) * 10) / 10,
            carbs: Math.round((per100['carbohydrates_100g'] || 0) * 10) / 10,
            fat: Math.round((per100['fat_100g'] || 0) * 10) / 10,
          },
          serving: p.serving_size || '100g',
        });
      } else {
        setError('Produit non trouvé. Essaie de saisir manuellement.');
      }
    } catch {
      setError('Erreur réseau. Vérifie ta connexion.');
    }
    setLoading(false);
  };

  const add = async () => {
    if (!product) return;
    const ratio = (parseFloat(qty) || 100) / 100;
    const entry = {
      user_id: user!.id,
      meal_type: selectedMeal,
      food_name: `${product.name}${product.brand ? ` (${product.brand})` : ''} - ${qty}g`,
      calories: Math.round(product.per100g.kcal * ratio),
      protein: Math.round(product.per100g.protein * ratio * 10) / 10,
      carbs: Math.round(product.per100g.carbs * ratio * 10) / 10,
      fat: Math.round(product.per100g.fat * ratio * 10) / 10,
      created_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('food_entries').insert(entry);
    if (!error) {
      onAdd(entry);
      onClose();
    }
  };

  const ratio = (parseFloat(qty) || 100) / 100;

  return (
    <div style={{ padding: '0 0 20px' }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 16 }}>🔍 SCAN CODE-BARRES</div>

      <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>Entre le code-barres (EAN-13) :</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          ref={inputRef}
          value={barcode}
          onChange={e => setBarcode(e.target.value.replace(/\D/g, ''))}
          onKeyDown={e => e.key === 'Enter' && search(barcode)}
          placeholder="ex: 3017620422003"
          type="tel"
          maxLength={14}
          style={{ flex: 1, padding: '12px 14px', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontSize: 16, fontFamily: 'monospace', letterSpacing: '.05em', outline: 'none', boxSizing: 'border-box' }}
        />
        <button onClick={() => search(barcode)} disabled={loading || barcode.length < 8}
          style={{ padding: '12px 16px', background: ACCENT, border: 'none', borderRadius: 12, color: '#000', fontWeight: 900, fontSize: 13, cursor: 'pointer', touchAction: 'manipulation', flexShrink: 0 }}>
          {loading ? '...' : 'OK'}
        </button>
      </div>

      {error && <div style={{ fontSize: 13, color: '#ff8888', marginBottom: 12 }}>{error}</div>}

      {product && (
        <div>
          <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: 16, marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
              {product.image && <img src={product.image} style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover' }} alt="" />}
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{product.name}</div>
                {product.brand && <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{product.brand}</div>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 14 }}>
              {[
                { label: 'Calories', val: Math.round(product.per100g.kcal * ratio), color: ACCENT },
                { label: 'Protéines', val: Math.round(product.per100g.protein * ratio * 10) / 10 + 'g', color: '#fff' },
                { label: 'Glucides', val: Math.round(product.per100g.carbs * ratio * 10) / 10 + 'g', color: '#8da0ff' },
                { label: 'Lipides', val: Math.round(product.per100g.fat * ratio * 10) / 10 + 'g', color: '#ff806b' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ background: '#0d0d0d', borderRadius: 10, padding: '10px 4px', textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color }}>{val}</div>
                  <div style={{ fontSize: 9, color: '#555', marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>

            <div>
              <label style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>Quantité (g)</label>
              <input value={qty} onChange={e => setQty(e.target.value)} type="number" min="1"
                style={{ width: '100%', padding: '12px 14px', background: '#0d0d0d', border: '1px solid ' + BORDER, borderRadius: 10, color: '#fff', fontSize: 18, fontWeight: 700, textAlign: 'center', boxSizing: 'border-box', outline: 'none' }} />
            </div>
          </div>

          <button
            onTouchEnd={e => { e.preventDefault(); add(); }}
            onClick={add}
            style={{ width: '100%', padding: 18, background: ACCENT, border: 'none', borderRadius: 14, color: '#000', fontWeight: 900, fontSize: 16, cursor: 'pointer', touchAction: 'manipulation' }}>
            ✓ AJOUTER {Math.round(product.per100g.kcal * ratio)} KCAL
          </button>
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 11, color: '#333', lineHeight: 1.5 }}>
        Source : Open Food Facts · Base de données mondiale ouverte
      </div>
    </div>
  );
}
