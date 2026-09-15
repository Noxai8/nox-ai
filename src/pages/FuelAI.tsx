import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

type Mode = 'menu' | 'fridge' | 'meals' | 'grocery' | 'tips';

export default function FuelAI() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>('menu');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [budget, setBudget] = useState('');
  const [people, setPeople] = useState('1');
  const [days, setDays] = useState('7');
  const [goal, setGoal] = useState('');

  const callAI = async (prompt: string) => {
    const { data, error } = await supabase.functions.invoke('generate-program', { body: { prompt } });
    if (error) throw error;
    return data?.content?.[0]?.text || '';
  };

  const analyzeFridge = async (base64: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-meal', {
        body: {
          base64,
          mime: 'image/jpeg',
          prompt: `Tu es un chef nutritionniste. Analyse ce frigo/placard et propose 3 idées de repas sains avec ce qui est visible.

Réponds en JSON :
{
  "ingredients_detectes": ["liste des aliments visibles"],
  "repas": [
    {
      "nom": "Nom du plat",
      "temps": "20 min",
      "difficulte": "Facile",
      "calories_approx": 450,
      "protein_approx": 35,
      "ingredients_utilises": ["ingrédient 1", "ingrédient 2"],
      "ingredients_manquants": ["ce qui manque"],
      "recette_rapide": "Instructions en 3 étapes courtes",
      "pourquoi_sain": "Explication nutrition courte"
    }
  ]
}`
        }
      });
      if (error) throw error;
      const text = data?.content?.[0]?.text || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) setResult({ type: 'fridge', data: JSON.parse(match[0]) });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const generateMeals = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle();
      const text = await callAI(`Tu es un chef nutritionniste et coach fitness. Génère un plan de repas sur 3 jours.

PROFIL :
- Objectif : ${profile?.goal_type || goal || 'perte de poids'}
- Budget : ${budget ? budget + '€/semaine' : 'économique'}
- Personnes : ${people}
- Restrictions : aucune

Réponds en JSON :
{
  "objectif_calorique": 2200,
  "objectif_proteines": 160,
  "jours": [
    {
      "jour": "Lundi",
      "repas": [
        {
          "moment": "Petit-déjeuner",
          "nom": "Nom du plat",
          "calories": 400,
          "proteines": 30,
          "ingredients": ["ingrédient 1"],
          "preparation": "Rapide description",
          "cout_approx": 2.5
        }
      ],
      "total_calories": 2200,
      "total_proteines": 160
    }
  ],
  "conseil_chef": "Conseil nutrition personnalisé"
}`);
      const match = text.match(/\{[\s\S]*\}/);
      if (match) setResult({ type: 'meals', data: JSON.parse(match[0]) });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const generateGrocery = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle();
      const text = await callAI(`Tu es un expert en nutrition sportive et courses alimentaires. Génère une liste de courses optimisée.

PROFIL :
- Objectif : ${profile?.goal_type || goal || 'transformation physique'}
- Budget total : ${budget || '80'}€ pour ${days} jours
- Personnes : ${people}
- Poids : ${profile?.starting_weight_kg || 75}kg

Réponds en JSON :
{
  "budget_total": ${budget || 80},
  "budget_utilise": 75,
  "economies": "Conseils pour économiser",
  "categories": [
    {
      "nom": "Protéines",
      "emoji": "🥩",
      "items": [
        {
          "produit": "Blanc de poulet",
          "quantite": "1kg",
          "prix_approx": 8,
          "proteines_pour_100g": 23,
          "pourquoi": "Protéine économique et maigre"
        }
      ],
      "sous_total": 25
    }
  ],
  "conseils_achats": ["Conseil 1", "Conseil 2"],
  "meal_prep_tip": "Conseil pour préparer les repas à l'avance"
}`);
      const match = text.match(/\{[\s\S]*\}/);
      if (match) setResult({ type: 'grocery', data: JSON.parse(match[0]) });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const generateTips = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle();
      const text = await callAI(`Tu es un nutritionniste coach. Donne 6 astuces nutrition concrètes et personnalisées.

PROFIL :
- Objectif : ${profile?.goal_type || 'transformation'}
- Niveau : ${profile?.experience_level || 'débutant'}
- Poids : ${profile?.starting_weight_kg || 75}kg

Réponds en JSON :
{
  "astuces": [
    {
      "titre": "Titre court",
      "emoji": "💡",
      "conseil": "Conseil concret en 2-3 phrases",
      "action": "Action immédiate à faire aujourd'hui",
      "impact": "fort / moyen / subtil"
    }
  ],
  "erreur_commune": "L'erreur n°1 que tu dois éviter",
  "secret_chef": "Une astuce de chef pour rendre tes repas plus sains et délicieux"
}`);
      const match = text.match(/\{[\s\S]*\}/);
      if (match) setResult({ type: 'tips', data: JSON.parse(match[0]) });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const max = 800;
      let { width, height } = img;
      if (width > max || height > max) {
        if (width > height) { height = Math.round(height * max / width); width = max; }
        else { width = Math.round(width * max / height); height = max; }
      }
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      setPhoto(dataUrl);
      analyzeFridge(dataUrl.split(',')[1]);
      URL.revokeObjectURL(url);
    };
    img.src = url;
    e.target.value = '';
  };

  const MenuCard = ({ id, icon, title, desc, onClick }: any) => (
    <button onClick={onClick}
      style={{ width: '100%', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: '18px 20px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10, touchAction: 'manipulation' }}>
      <div style={{ fontSize: 36, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 12, color: '#555', lineHeight: 1.4 }}>{desc}</div>
      </div>
      <div style={{ color: '#333', fontSize: 18, flexShrink: 0 }}>→</div>
    </button>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 80 }}>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} />

      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid ' + BORDER }}>
        {mode !== 'menu' && (
          <button onClick={() => { setMode('menu'); setResult(null); setPhoto(null); }}
            style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14, marginBottom: 12, display: 'block' }}>← Retour</button>
        )}
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em' }}>Intelligence NOX</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>
          {mode === 'menu' ? 'FUEL IA' : mode === 'fridge' ? '🧊 ANALYSE FRIGO' : mode === 'meals' ? '🍽️ PLAN REPAS' : mode === 'grocery' ? '🛒 LISTE DE COURSES' : '💡 ASTUCES NUTRITION'}
        </div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>

        {/* MENU */}
        {mode === 'menu' && (
          <>
            <MenuCard icon="🧊" title="Analyse mon frigo" desc="Photo de ton frigo → NOX propose des repas sains avec ce que t'as" onClick={() => { setMode('fridge'); }} />
            <MenuCard icon="🍽️" title="Plan de repas" desc="NOX génère un plan 3 jours adapté à ton objectif et budget" onClick={() => setMode('meals')} />
            <MenuCard icon="🛒" title="Liste de courses" desc="Budget + objectifs → liste optimisée avec prix approximatifs" onClick={() => setMode('grocery')} />
            <MenuCard icon="💡" title="Astuces nutrition" desc="Conseils personnalisés pour booster tes résultats avec la nutrition" onClick={() => { setMode('tips'); generateTips(); }} />
          </>
        )}

        {/* FRIGO */}
        {mode === 'fridge' && !result && (
          <div style={{ textAlign: 'center', paddingTop: 40 }}>
            {photo ? (
              <>
                <img src={photo} style={{ width: '100%', borderRadius: 16, marginBottom: 20, maxHeight: 300, objectFit: 'cover' }} alt="" />
                {loading && (
                  <div style={{ padding: '24px 0' }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', marginBottom: 8 }}>NOX ANALYSE TON FRIGO...</div>
                    <div style={{ fontSize: 13, color: '#555' }}>Détection des aliments et suggestions de repas</div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ fontSize: 64, marginBottom: 16 }}>🧊</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 8 }}>PHOTO DE TON FRIGO</div>
                <div style={{ fontSize: 14, color: '#555', marginBottom: 32, lineHeight: 1.5, maxWidth: 300, margin: '0 auto 32px' }}>
                  Ouvre ton frigo, prends une photo et NOX te propose 3 repas sains avec ce que t'as
                </div>
                <button onClick={() => fileRef.current?.click()}
                  style={{ width: '100%', padding: 18, background: ACCENT, border: 'none', borderRadius: 14, color: '#000', fontWeight: 900, fontSize: 15, cursor: 'pointer', touchAction: 'manipulation' }}>
                  📸 PHOTOGRAPHIER MON FRIGO
                </button>
              </>
            )}
          </div>
        )}

        {/* RÉSULTAT FRIGO */}
        {mode === 'fridge' && result?.type === 'fridge' && (
          <div>
            {photo && <img src={photo} style={{ width: '100%', borderRadius: 14, marginBottom: 16, maxHeight: 200, objectFit: 'cover' }} alt="" />}
            <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#555', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>DÉTECTÉ DANS TON FRIGO</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {result.data.ingredients_detectes?.map((ing: string) => (
                  <span key={ing} style={{ background: '#1a1a1a', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: '#ccc' }}>{ing}</span>
                ))}
              </div>
            </div>

            <div style={{ fontSize: 13, fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>3 REPAS QUE TU PEUX FAIRE</div>
            {result.data.repas?.map((repas: any, i: number) => (
              <div key={i} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: 18, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>{repas.nom}</div>
                    <div style={{ fontSize: 12, color: '#555', marginTop: 3 }}>{repas.temps} · {repas.difficulte}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: ACCENT }}>{repas.calories_approx} kcal</div>
                    <div style={{ fontSize: 11, color: '#555' }}>~{repas.protein_approx}g protéines</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#888', lineHeight: 1.6, marginBottom: 10 }}>{repas.recette_rapide}</div>
                <div style={{ fontSize: 12, color: ACCENT + 'cc' }}>✓ {repas.pourquoi_sain}</div>
                {repas.ingredients_manquants?.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#ff6600' }}>
                    Manque : {repas.ingredients_manquants.join(', ')}
                  </div>
                )}
              </div>
            ))}

            <button onClick={() => { setPhoto(null); setResult(null); fileRef.current?.click(); }}
              style={{ width: '100%', padding: 14, background: 'transparent', border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>
              📸 Nouveau scan
            </button>
          </div>
        )}

        {/* PLAN REPAS */}
        {mode === 'meals' && !result && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>Budget hebdo (€) — optionnel</label>
              <input value={budget} onChange={e => setBudget(e.target.value)} type="number" placeholder="ex: 80"
                style={{ width: '100%', padding: '14px 16px', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontSize: 16, boxSizing: 'border-box', outline: 'none' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>Objectif spécifique — optionnel</label>
              <input value={goal} onChange={e => setGoal(e.target.value)} placeholder="ex: perdre du gras, prendre du muscle..."
                style={{ width: '100%', padding: '14px 16px', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
            </div>
            <button onClick={generateMeals} disabled={loading}
              style={{ width: '100%', padding: 18, background: ACCENT, border: 'none', borderRadius: 14, color: '#000', fontWeight: 900, fontSize: 15, cursor: 'pointer', touchAction: 'manipulation' }}>
              {loading ? 'GÉNÉRATION...' : '🍽️ GÉNÉRER MON PLAN REPAS'}
            </button>
          </div>
        )}

        {/* RÉSULTAT PLAN REPAS */}
        {mode === 'meals' && result?.type === 'meals' && (
          <div>
            <div style={{ background: ACCENT + '11', border: '1px solid ' + ACCENT + '33', borderRadius: 14, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: ACCENT, fontWeight: 800, marginBottom: 4 }}>OBJECTIF QUOTIDIEN</div>
              <div style={{ fontSize: 14, color: '#ccc' }}>{result.data.objectif_calorique} kcal · {result.data.objectif_proteines}g protéines</div>
              {result.data.conseil_chef && <div style={{ fontSize: 12, color: '#888', marginTop: 6, fontStyle: 'italic' }}>"{result.data.conseil_chef}"</div>}
            </div>
            {result.data.jours?.map((jour: any) => (
              <div key={jour.jour} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: '#fff', marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{jour.jour}</span>
                  <span style={{ color: '#555', fontWeight: 400, fontSize: 12 }}>{jour.total_calories} kcal · {jour.total_proteines}g prot.</span>
                </div>
                {jour.repas?.map((repas: any, i: number) => (
                  <div key={i} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '12px 16px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em' }}>{repas.moment}</div>
                      <div style={{ fontSize: 12, color: '#555' }}>~{repas.cout_approx}€</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{repas.nom}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{repas.calories} kcal · {repas.proteines}g prot.</div>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{repas.preparation}</div>
                  </div>
                ))}
              </div>
            ))}
            <button onClick={() => setResult(null)}
              style={{ width: '100%', padding: 14, background: 'transparent', border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              Regénérer
            </button>
          </div>
        )}

        {/* LISTE DE COURSES */}
        {mode === 'grocery' && !result && (
          <div>
            {[
              { key: 'budget', label: 'Budget total (€)', placeholder: 'ex: 80', type: 'number', val: budget, set: setBudget },
              { key: 'days', label: 'Pour combien de jours', placeholder: 'ex: 7', type: 'number', val: days, set: setDays },
              { key: 'people', label: 'Nombre de personnes', placeholder: 'ex: 1', type: 'number', val: people, set: setPeople },
            ].map(({ key, label, placeholder, type, val, set }) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>{label}</label>
                <input value={val} onChange={e => set(e.target.value)} type={type} placeholder={placeholder}
                  style={{ width: '100%', padding: '14px 16px', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontSize: 16, boxSizing: 'border-box', outline: 'none' }} />
              </div>
            ))}
            <button onClick={generateGrocery} disabled={loading}
              style={{ width: '100%', padding: 18, background: ACCENT, border: 'none', borderRadius: 14, color: '#000', fontWeight: 900, fontSize: 15, cursor: 'pointer', touchAction: 'manipulation' }}>
              {loading ? 'GÉNÉRATION...' : '🛒 GÉNÉRER MA LISTE DE COURSES'}
            </button>
          </div>
        )}

        {/* RÉSULTAT LISTE COURSES */}
        {mode === 'grocery' && result?.type === 'grocery' && (
          <div>
            <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: '14px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', marginBottom: 4 }}>BUDGET ESTIMÉ</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: ACCENT }}>{result.data.budget_utilise}€ <span style={{ fontSize: 13, color: '#555' }}>/ {result.data.budget_total}€</span></div>
              </div>
              {result.data.economies && (
                <div style={{ fontSize: 12, color: '#888', maxWidth: 150, textAlign: 'right', lineHeight: 1.4 }}>{result.data.economies}</div>
              )}
            </div>

            {result.data.categories?.map((cat: any) => (
              <div key={cat.nom} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{cat.emoji} {cat.nom}</div>
                  <div style={{ fontSize: 13, color: ACCENT, fontWeight: 700 }}>~{cat.sous_total}€</div>
                </div>
                {cat.items?.map((item: any, i: number) => (
                  <div key={i} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '12px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{item.produit}</div>
                      <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{item.quantite} · {item.pourquoi}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#fff', flexShrink: 0, marginLeft: 12 }}>~{item.prix_approx}€</div>
                  </div>
                ))}
              </div>
            ))}

            {result.data.conseils_achats && (
              <div style={{ background: ACCENT + '0a', border: '1px solid ' + ACCENT + '22', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: ACCENT, fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>💡 CONSEILS ACHATS</div>
                {result.data.conseils_achats.map((c: string, i: number) => (
                  <div key={i} style={{ fontSize: 13, color: '#ccc', marginBottom: 6, display: 'flex', gap: 8 }}>
                    <span style={{ color: ACCENT }}>•</span>{c}
                  </div>
                ))}
              </div>
            )}

            {result.data.meal_prep_tip && (
              <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 13, color: '#888', lineHeight: 1.5 }}>
                🥡 <strong style={{ color: '#fff' }}>Meal prep :</strong> {result.data.meal_prep_tip}
              </div>
            )}

            <button onClick={() => setResult(null)}
              style={{ width: '100%', padding: 14, background: 'transparent', border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              Modifier les paramètres
            </button>
          </div>
        )}

        {/* ASTUCES */}
        {mode === 'tips' && loading && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💡</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>NOX PRÉPARE TES ASTUCES...</div>
          </div>
        )}

        {mode === 'tips' && result?.type === 'tips' && (
          <div>
            {result.data.erreur_commune && (
              <div style={{ background: '#ff444411', border: '1px solid #ff444433', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#ff6666', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>❌ ERREUR À ÉVITER</div>
                <div style={{ fontSize: 14, color: '#ccc' }}>{result.data.erreur_commune}</div>
              </div>
            )}

            {result.data.astuces?.map((astuce: any, i: number) => (
              <div key={i} style={{ background: SURFACE, border: '1px solid ' + (astuce.impact === 'fort' ? ACCENT + '44' : BORDER), borderRadius: 16, padding: 18, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 24 }}>{astuce.emoji}</span>
                  <div style={{ fontSize: 15, fontWeight: 900, color: '#fff' }}>{astuce.titre}</div>
                  {astuce.impact === 'fort' && <span style={{ fontSize: 10, background: ACCENT + '22', color: ACCENT, borderRadius: 20, padding: '3px 10px', fontWeight: 800 }}>IMPACT FORT</span>}
                </div>
                <div style={{ fontSize: 13, color: '#888', lineHeight: 1.6, marginBottom: 10 }}>{astuce.conseil}</div>
                <div style={{ fontSize: 12, color: ACCENT, fontWeight: 700 }}>→ {astuce.action}</div>
              </div>
            ))}

            {result.data.secret_chef && (
              <div style={{ background: 'linear-gradient(135deg, #1a1a1a, #111)', border: '1px solid #333', borderRadius: 16, padding: 18, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#ffaa00', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>👨‍🍳 SECRET DU CHEF</div>
                <div style={{ fontSize: 14, color: '#ccc', lineHeight: 1.6, fontStyle: 'italic' }}>"{result.data.secret_chef}"</div>
              </div>
            )}

            <button onClick={() => { setResult(null); generateTips(); }}
              style={{ width: '100%', padding: 14, background: 'transparent', border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              Nouvelles astuces
            </button>
          </div>
        )}
      </div>

      <BottomNav active="fuel" />
    </div>
  );
}
