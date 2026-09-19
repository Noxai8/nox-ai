import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

const CATEGORIES = ['Tous', 'Protéines', 'Féculents', 'Légumes', 'Fruits', 'Laitiers', 'Condiments', 'Boissons', 'Autre'];

export default function Pantry() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [cat, setCat] = useState('Tous');
  const [form, setForm] = useState({ name: '', quantity: '', unit: 'g', category: 'Protéines', expiry: '', calories_per_100g: '', protein_per_100g: '' });
  const [saving, setSaving] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    const { data } = await supabase.from('pantry_items')
      .select('*').eq('user_id', user!.id).order('expiry_date', { ascending: true, nullsFirst: false });
    setItems(data || []);

    // Alertes expiration dans les 3 prochains jours
    const soon = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const expiring = (data || []).filter(i => i.expiry_date && i.expiry_date <= soon && i.expiry_date >= today);
    setAlerts(expiring);
  };

  const save = async () => {
    if (!form.name) return;
    setSaving(true);
    await supabase.from('pantry_items').insert({
      user_id: user!.id,
      name: form.name,
      quantity: parseFloat(form.quantity) || null,
      unit: form.unit,
      category: form.category,
      expiry_date: form.expiry || null,
      calories_per_100g: parseFloat(form.calories_per_100g) || null,
      protein_per_100g: parseFloat(form.protein_per_100g) || null,
      created_at: new Date().toISOString(),
    });
    setForm({ name: '', quantity: '', unit: 'g', category: 'Protéines', expiry: '', calories_per_100g: '', protein_per_100g: '' });
    setSaving(false);
    setShowAdd(false);
    load();
  };

  const deleteItem = async (id: string) => {
    await supabase.from('pantry_items').delete().eq('id', id);
    load();
  };

  const useItem = async (item: any) => {
    // Ajouter au journal Fuel
    if (item.calories_per_100g && item.quantity) {
      const ratio = item.quantity / 100;
      await supabase.from('food_entries').insert({
        user_id: user!.id,
        meal_type: 'Déjeuner',
        food_name: item.name + ' (garde-manger)',
        calories: Math.round(item.calories_per_100g * ratio),
        protein: Math.round((item.protein_per_100g || 0) * ratio * 10) / 10,
        carbs: 0, fat: 0,
        created_at: new Date().toISOString(),
      });
    }
    navigate('/fuel');
  };

  const filtered = cat === 'Tous' ? items : items.filter(i => i.category === cat);

  const getDaysUntilExpiry = (date: string) => {
    const days = Math.floor((new Date(date).getTime() - Date.now()) / 86400000);
    return days;
  };

  const getExpiryColor = (date: string) => {
    const days = getDaysUntilExpiry(date);
    if (days < 0) return '#ff4444';
    if (days <= 1) return '#ff6600';
    if (days <= 3) return '#ffaa00';
    return '#555';
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 90 }}>
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid ' + BORDER }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 22, marginBottom: 12, display: 'block' }}>←</button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em' }}>Nutrition</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>GARDE-MANGER</div>
          </div>
          <button onClick={() => setShowAdd(true)}
            style={{ background: ACCENT, color: '#000', border: 'none', borderRadius: 12, padding: '10px 16px', fontWeight: 800, fontSize: 13, cursor: 'pointer', touchAction: 'manipulation' }}>
            + AJOUTER
          </button>
        </div>
      </div>

      <div style={{ padding: '16px 20px 0' }}>
        {/* Alertes expiration */}
        {alerts.length > 0 && (
          <div style={{ background: '#ff660011', border: '1px solid #ff660033', borderRadius: 14, padding: '12px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#ff6600', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>⚠️ EXPIRE BIENTÔT</div>
            {alerts.map(a => (
              <div key={a.id} style={{ fontSize: 13, color: '#ccc', marginBottom: 4 }}>
                {a.name} · expire {new Date(a.expiry_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Aliments', value: items.length },
            { label: 'Expire bientôt', value: alerts.length, color: alerts.length > 0 ? '#ff6600' : '#fff' },
            { label: 'Catégories', value: new Set(items.map(i => i.category)).size },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '12px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: (color as string) || '#fff' }}>{value}</div>
              <div style={{ fontSize: 10, color: '#555', fontWeight: 700 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Filtre catégories */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 12 }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCat(c)}
              style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid ' + (cat === c ? ACCENT : BORDER), background: cat === c ? ACCENT + '22' : 'transparent', color: cat === c ? ACCENT : '#555', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', touchAction: 'manipulation' }}>
              {c}
            </button>
          ))}
        </div>

        {/* Liste */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#555' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🧺</div>
            <div style={{ fontSize: 14 }}>Garde-manger vide — ajoute tes aliments</div>
          </div>
        ) : (
          filtered.map(item => (
            <div key={item.id} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: '14px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{item.name}</div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>
                  {item.quantity && `${item.quantity}${item.unit}`}
                  {item.category && ` · ${item.category}`}
                  {item.calories_per_100g && ` · ${item.calories_per_100g} kcal/100g`}
                </div>
                {item.expiry_date && (
                  <div style={{ fontSize: 11, color: getExpiryColor(item.expiry_date), marginTop: 2, fontWeight: 700 }}>
                    {getDaysUntilExpiry(item.expiry_date) < 0 ? '❌ Périmé' :
                     getDaysUntilExpiry(item.expiry_date) === 0 ? '⚠️ Expire aujourd\'hui' :
                     `📅 Expire dans ${getDaysUntilExpiry(item.expiry_date)}j`}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {item.calories_per_100g && (
                  <button onClick={() => useItem(item)}
                    style={{ padding: '6px 10px', background: ACCENT + '22', border: '1px solid ' + ACCENT + '44', borderRadius: 8, color: ACCENT, fontSize: 11, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>
                    +Fuel
                  </button>
                )}
                <button onClick={() => deleteItem(item.id)}
                  style={{ padding: '6px 10px', background: 'transparent', border: '1px solid #333', borderRadius: 8, color: '#555', fontSize: 12, cursor: 'pointer', touchAction: 'manipulation' }}>
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal ajout */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.9)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: '#0d0d0d', borderRadius: '20px 20px 0 0', padding: 24, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 20 }}>Ajouter un aliment</div>
            {[
              { label: 'Nom *', key: 'name', type: 'text', placeholder: 'ex: Blanc de poulet' },
              { label: 'Quantité', key: 'quantity', type: 'number', placeholder: '500' },
              { label: 'Date d\'expiration', key: 'expiry', type: 'date', placeholder: '' },
              { label: 'Calories/100g', key: 'calories_per_100g', type: 'number', placeholder: '165' },
              { label: 'Protéines/100g', key: 'protein_per_100g', type: 'number', placeholder: '31' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>{label}</label>
                <input value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  type={type} placeholder={placeholder}
                  style={{ width: '100%', padding: '12px 14px', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 10, color: '#fff', fontSize: 14, boxSizing: 'border-box' as const, outline: 'none' }} />
              </div>
            ))}

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>Catégorie</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {CATEGORIES.slice(1).map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, category: c }))}
                    style={{ padding: '6px 12px', borderRadius: 20, border: '1px solid ' + (form.category === c ? ACCENT : BORDER), background: form.category === c ? ACCENT + '22' : 'transparent', color: form.category === c ? ACCENT : '#555', fontSize: 11, cursor: 'pointer', touchAction: 'manipulation' }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowAdd(false)}
                style={{ flex: 1, padding: 14, background: 'transparent', border: '1px solid ' + BORDER, borderRadius: 12, color: '#555', fontWeight: 700, cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={save} disabled={!form.name || saving}
                style={{ flex: 2, padding: 14, background: form.name ? ACCENT : '#1a1a1a', border: 'none', borderRadius: 12, color: form.name ? '#000' : '#333', fontWeight: 900, cursor: form.name ? 'pointer' : 'not-allowed', touchAction: 'manipulation' as const }}>
                {saving ? '...' : 'AJOUTER'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="fuel" />
    </div>
  );
}
