import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from '../components/BottomNav';

const ACCENT = '#B7FF00';
const BG = '#F7F7F7';
const SURFACE = '#FFFFFF';
const BORDER = '#EAEAEA';

type Mode = 'menu' | 'grocery' | 'tips' | 'dinner' | 'quick';

export default function FuelAI() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('menu');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [budget, setBudget] = useState('');
  const [people, setPeople] = useState('1');
  const [days, setDays] = useState('7');
  const [goal, setGoal] = useState('');
  const [error, setError] = useState('');
  const [command, setCommand] = useState('');


  const loadNutritionContext = async () => {
    if (!user) throw new Error('Utilisateur non connecté.');

    const [profileResult, targetResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('nutrition_targets').select('calories, protein, carbs, fat').eq('user_id', user.id).maybeSingle(),
    ]);

    if (profileResult.error) throw profileResult.error;
    if (targetResult.error) throw targetResult.error;

    const profile = profileResult.data || null;
    const target = targetResult.data || null;

    return {
      profile,
      target,
      profileGoal: profile?.goal_type || profile?.goal || profile?.objective || goal || 'transformation physique',
      calories: Number(target?.calories || 0) > 0 ? Number(target.calories) : null,
      protein: Number(target?.protein || 0) > 0 ? Number(target.protein) : null,
      carbs: Number(target?.carbs || 0) > 0 ? Number(target.carbs) : null,
      fat: Number(target?.fat || 0) > 0 ? Number(target.fat) : null,
    };
  };

  const callAI = async (prompt: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Session expirée. Reconnecte-toi pour continuer.');
    const response = await fetch('https://zpxrsmnpcyzafawlweyl.supabase.co/functions/v1/generate-program', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) throw new Error(`Service NOX indisponible (${response.status}).`);

    const payload = await response.json();
    if (payload?.error) throw new Error(typeof payload.error === 'string' ? payload.error : 'Erreur du service NOX.');

    return payload?.data?.content?.[0]?.text || payload?.content?.[0]?.text || payload?.text || '';
  };

  const parseAIJson = (text: string) => {
    const cleaned = String(text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("NOX n'a pas renvoyé un résultat exploitable. Réessaie.");
    return JSON.parse(match[0]);
  };

  const generateDinner = async (question = 'Que puis-je manger ce soir ?') => {
    if (!user) return;
    setLoading(true); setResult(null); setError('');
    try {
      const today = new Date(); today.setHours(0,0,0,0);
      const [ctx, entriesResult] = await Promise.all([
        loadNutritionContext(),
        supabase.from('food_entries').select('calories, protein, carbs, fat, food_name').eq('user_id', user.id).gte('created_at', today.toISOString()),
      ]);
      if (entriesResult.error) throw entriesResult.error;
      const used=(entriesResult.data||[]).reduce((a:any,e:any)=>({calories:a.calories+Number(e.calories||0),protein:a.protein+Number(e.protein||0),carbs:a.carbs+Number(e.carbs||0),fat:a.fat+Number(e.fat||0)}),{calories:0,protein:0,carbs:0,fat:0});
      const remaining={calories:ctx.calories==null?null:Math.max(0,ctx.calories-used.calories),protein:ctx.protein==null?null:Math.max(0,ctx.protein-used.protein),carbs:ctx.carbs==null?null:Math.max(0,ctx.carbs-used.carbs),fat:ctx.fat==null?null:Math.max(0,ctx.fat-used.fat)};
      const text=await callAI(`Tu es la couche d'intelligence nutritionnelle de NOX. Réponds à la demande: "${question}".
Objectif: ${ctx.profileGoal}. Restant aujourd'hui: ${remaining.calories??'inconnu'} kcal, ${remaining.protein??'inconnu'} g protéines, ${remaining.carbs??'inconnu'} g glucides, ${remaining.fat??'inconnu'} g lipides.
Propose 3 options de repas réalistes alignées avec les macros restantes. N'invente pas de cible absente. Les valeurs sont des estimations et doivent être présentées comme telles. Réponds uniquement en JSON valide:
{"resume":"phrase courte","options":[{"nom":"repas","kcal":500,"protein":35,"carbs":50,"fat":15,"pourquoi":"raison courte"}]}`);
      setResult({type:'dinner',data:parseAIJson(text),remaining});
    } catch(e:any){setError(e?.message||'Impossible de préparer des suggestions.')} finally {setLoading(false);}
  };

  const runQuickCommand = async () => {
    const q=command.trim(); if(!q)return;
    const lower=q.toLowerCase();
    if(lower.includes('manger')||lower.includes('repas')||lower.includes('macro')){setMode('dinner');await generateDinner(q);return;}
    if(lower.includes('courses')){setMode('grocery');setResult(null);return;}
    if(lower.includes('semaine')||lower.includes('plan')){navigate('/meal-planner');return;}
    if(lower.includes('scanner')||lower.includes('scan')){navigate('/food-scan');return;}
    if(lower.includes('replan')||lower.includes('décal')||lower.includes('report')){navigate('/reschedule');return;}
    setMode('tips'); await generateTips();
  };

  const generateGrocery = async () => {
    if (!user) return;
    setLoading(true);
    setResult(null);
    setError('');

    try {
      const ctx = await loadNutritionContext();
      const profile = ctx.profile;
      const profileGoal = ctx.profileGoal;
      const calories = ctx.calories;
      const protein = ctx.protein;

      const text = await callAI(`Tu es la couche d'analyse nutritionnelle de NOX. Génère une liste de courses concrète, réaliste et cohérente avec l'objectif de l'utilisateur.

PROFIL :
- Objectif : ${profileGoal}
- Budget total : ${budget || '80'}€ pour ${days || '7'} jours
- Personnes : ${people || '1'}
- Poids : ${profile?.starting_weight_kg || profile?.weight || 75} kg
- Cible calorique : ${calories ? calories + ' kcal/jour' : 'non disponible'}
- Cible protéines : ${protein ? protein + ' g/jour' : 'non disponible'}

RÈGLES :
- Les cibles calories/protéines ci-dessus viennent de nutrition_targets, la source de vérité de NOX. Ne les recalcule pas et ne les remplace pas par une estimation.
- Si une cible est indisponible, n'en invente pas une.
- Adapte les aliments et quantités à l'objectif (perte de poids, maintien ou prise de muscle).
- Priorise des aliments simples et accessibles.
- Respecte autant que possible le budget indiqué.
- Les prix sont seulement des estimations : ne prétends pas connaître les prix exacts du magasin.
- Regroupe les produits par catégories.
- Donne des quantités réellement utilisables pour la durée et le nombre de personnes.
- Réponds uniquement en JSON valide, sans markdown.

FORMAT :
{
  "budget_total": ${budget || 80},
  "budget_utilise": 75,
  "economies": "Conseil court",
  "categories": [
    {
      "nom": "Protéines",
      "emoji": "P",
      "items": [
        {
          "produit": "Blanc de poulet",
          "quantite": "1 kg",
          "prix_approx": 8,
          "proteines_pour_100g": 23,
          "pourquoi": "Riche en protéines"
        }
      ],
      "sous_total": 25
    }
  ],
  "conseils_achats": ["Conseil 1", "Conseil 2"],
  "meal_prep_tip": "Conseil de préparation"
}`);

      setResult({ type: 'grocery', data: parseAIJson(text) });
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Impossible de générer la liste de courses.');
    } finally {
      setLoading(false);
    }
  };

  const generateTips = async () => {
    if (!user) return;
    setLoading(true);
    setResult(null);
    setError('');

    try {
      const since = new Date();
      since.setDate(since.getDate() - 7);

      const [ctx, entriesResult] = await Promise.all([
        loadNutritionContext(),
        supabase.from('food_entries')
          .select('calories, protein, carbs, fat, created_at')
          .eq('user_id', user.id)
          .gte('created_at', since.toISOString())
          .order('created_at', { ascending: false }),
      ]);

      if (entriesResult.error) throw entriesResult.error;

      const profile = ctx.profile;
      const entries = entriesResult.data || [];

      const daily = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>();
      (entries || []).forEach((entry: any) => {
        const day = String(entry.created_at || '').slice(0, 10);
        if (!day) return;
        const current = daily.get(day) || { calories: 0, protein: 0, carbs: 0, fat: 0 };
        current.calories += Number(entry.calories) || 0;
        current.protein += Number(entry.protein) || 0;
        current.carbs += Number(entry.carbs) || 0;
        current.fat += Number(entry.fat) || 0;
        daily.set(day, current);
      });

      const trackedDays = [...daily.values()];
      const avg = trackedDays.length
        ? trackedDays.reduce((acc, d) => ({
            calories: acc.calories + d.calories / trackedDays.length,
            protein: acc.protein + d.protein / trackedDays.length,
            carbs: acc.carbs + d.carbs / trackedDays.length,
            fat: acc.fat + d.fat / trackedDays.length,
          }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
        : null;

      const profileGoal = ctx.profileGoal;
      const calorieTarget = ctx.calories;
      const proteinTarget = ctx.protein;

      const text = await callAI(`Tu es la couche d'analyse nutritionnelle de NOX. Donne 6 repères concrets et personnalisés. Ne donne pas de diagnostic médical et n'invente aucune donnée absente.

PROFIL :
- Objectif : ${profileGoal}
- Niveau : ${profile?.experience_level || 'non renseigné'}
- Poids : ${profile?.starting_weight_kg || profile?.weight || 'non renseigné'} kg
- Cible calories : ${calorieTarget ? calorieTarget + ' kcal/jour' : 'non disponible'}
- Cible protéines : ${proteinTarget ? proteinTarget + ' g/jour' : 'non disponible'}

IMPORTANT :
- Ces cibles viennent de nutrition_targets. Ne les recalcule pas et ne propose pas une cible concurrente.
- Si une cible est absente, n'en invente pas une.

JOURNAL DES 7 DERNIERS JOURS :
- Jours réellement renseignés : ${trackedDays.length}
- Moyenne calories sur jours renseignés : ${avg ? Math.round(avg.calories) + ' kcal' : 'pas assez de données'}
- Moyenne protéines : ${avg ? Math.round(avg.protein) + ' g' : 'pas assez de données'}
- Moyenne glucides : ${avg ? Math.round(avg.carbs) + ' g' : 'pas assez de données'}
- Moyenne lipides : ${avg ? Math.round(avg.fat) + ' g' : 'pas assez de données'}

RÈGLES :
- Les conseils doivent servir directement l'objectif.
- Si le journal contient peu de données, dis-le implicitement et privilégie des actions simples au lieu d'inventer une analyse.
- Ne recommande pas de restriction extrême.
- Chaque action doit être faisable aujourd'hui.
- Réponds uniquement en JSON valide, sans markdown.

FORMAT :
{
  "astuces": [
    {
      "titre": "Titre court",
      "emoji": "•",
      "conseil": "Conseil concret en 2-3 phrases",
      "action": "Action immédiate",
      "impact": "fort"
    }
  ],
  "erreur_commune": "L'erreur prioritaire à éviter selon ce profil",
  "secret_chef": "Astuce pratique pour rendre l'alimentation plus simple"
}`);

      setResult({ type: 'tips', data: parseAIJson(text) });
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Impossible de générer les astuces nutrition.');
    } finally {
      setLoading(false);
    }
  };

  const MenuCard = ({ id, icon, title, desc, onClick }: any) => (
    <button onClick={onClick}
      style={{ width: '100%', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: '18px 20px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10, touchAction: 'manipulation' }}>
      <div style={{ fontSize: 36, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: '#0A0A0A', marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 12, color: '#555', lineHeight: 1.4 }}>{desc}</div>
      </div>
      <div style={{ color: '#333', fontSize: 18, flexShrink: 0 }}>→</div>
    </button>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 80 }}>
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid ' + BORDER }}>
        {mode !== 'menu' && (
          <button onClick={() => { setMode('menu'); setResult(null); setError(''); }}
            style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14, marginBottom: 12, display: 'block' }}>← Retour</button>
        )}
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em' }}>Intelligence NOX</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#0A0A0A' }}>
          {mode === 'menu' ? 'NUTRITION NOX' : mode === 'grocery' ? '🛒 LISTE DE COURSES' : '💡 ASTUCES NUTRITION'}
        </div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>

        {error && (
          <div style={{ background: '#ff444411', border: '1px solid #ff444433', borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#ff7777', marginBottom: 4 }}>NOX N'A PAS PU TERMINER</div>
            <div style={{ fontSize: 12, color: '#aaa', lineHeight: 1.5 }}>{error}</div>
          </div>
        )}

        {/* MENU */}
        {mode === 'menu' && (
          <>
            <div style={{background:'#0A0A0A',borderRadius:16,padding:14,marginBottom:12}}>
              <div style={{fontSize:10,color:ACCENT,fontWeight:900,letterSpacing:'.1em'}}>QUICK COMMAND</div>
              <div style={{display:'flex',gap:8,marginTop:9}}><input value={command} onChange={e=>setCommand(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void runQuickCommand()}} placeholder="Ex : Que puis-je manger ce soir ?" style={{flex:1,minWidth:0,border:'1px solid #2A2A2A',borderRadius:11,background:'#171717',color:'#fff',padding:'11px 12px',outline:0}}/><button onClick={()=>void runQuickCommand()} style={{border:0,borderRadius:11,background:ACCENT,color:'#000',fontWeight:900,padding:'0 13px'}}>GO</button></div>
            </div>
            <MenuCard icon="🌙" title="Que puis-je manger ce soir ?" desc="3 idées selon ce qu’il te reste aujourd’hui en calories et macros" onClick={() => { setMode('dinner'); void generateDinner(); }} />
            <MenuCard icon="🔎" title="Recherche & commandes" desc="Repas, scan, planification, replanification ou analyse depuis une seule commande" onClick={() => document.querySelector<HTMLInputElement>('input[placeholder^="Ex :"]')?.focus()} />
            <MenuCard icon="🔄" title="Replanifier ma semaine" desc="Décale intelligemment une séance quand ton planning change" onClick={() => navigate('/reschedule')} />
            <MenuCard icon="📊" title="Synthèse hebdomadaire" desc="Tendances, changements et priorités à partir de tes données" onClick={() => navigate('/weekly-review')} />
            <MenuCard icon="🧊" title="Scanner mon frigo" desc="Passe par NOX Scan pour identifier les ingrédients et obtenir des idées de repas" onClick={() => navigate('/food-scan', { state: { scanMode: 'fridge' } })} />
            <MenuCard icon="🍽️" title="Plan de repas" desc="Construis ta semaine alimentaire selon ton objectif" onClick={() => navigate('/meal-planner')} />
            <MenuCard icon="🛒" title="Liste de courses" desc="Budget + objectifs → liste optimisée avec prix approximatifs" onClick={() => setMode('grocery')} />
            <MenuCard icon="💡" title="Astuces nutrition" desc="Repères personnalisés à partir de ta cible et de ton suivi récent" onClick={() => { setMode('tips'); generateTips(); }} />
          <MenuCard icon="⏱️" title="Jeûne intermittent" desc="Suivi optionnel du jeûne + hydratation" onClick={() => navigate('/fasting')} />
          <MenuCard icon="😊" title="Humeur & bien-être" desc="Journal quotidien humeur, sommeil, fatigue et récupération" onClick={() => navigate('/mood')} />
          <MenuCard icon="👨‍🍳" title="Mes recettes" desc="Créer et sauvegarder tes propres recettes réutilisables" onClick={() => navigate('/recipes')} />
          <MenuCard icon="📅" title="Planifier mes repas" desc="Organise ta semaine alimentaire à l'avance" onClick={() => navigate('/meal-planner')} />
          </>
        )}

        {mode === 'dinner' && (
          <div>
            {loading && <div style={{padding:'50px 0',textAlign:'center',fontWeight:900}}>NOX ANALYSE TA JOURNÉE...</div>}
            {!loading && result?.type==='dinner' && <div>
              <div style={{fontSize:13,color:'#666',lineHeight:1.5,marginBottom:12}}>{result.data.resume}</div>
              {result.data.options?.map((o:any,i:number)=><div key={i} style={{background:'#fff',border:'1px solid '+BORDER,borderRadius:16,padding:16,marginBottom:10}}><div style={{fontWeight:950,fontSize:15}}>{o.nom}</div><div style={{fontSize:11,color:'#777',marginTop:5}}>≈ {o.kcal} kcal · {o.protein} g prot. · {o.carbs} g gluc. · {o.fat} g lip.</div><div style={{fontSize:12,color:'#555',marginTop:8,lineHeight:1.45}}>{o.pourquoi}</div></div>)}
              <div style={{fontSize:10,color:'#888',lineHeight:1.45}}>Suggestions basées sur les entrées enregistrées aujourd’hui. Les valeurs restent estimatives.</div>
            </div>}
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
                  style={{ width: '100%', padding: '14px 16px', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, color: '#0A0A0A', fontSize: 16, boxSizing: 'border-box', outline: 'none' }} />
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
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0A0A0A' }}>{cat.emoji} {cat.nom}</div>
                  <div style={{ fontSize: 13, color: ACCENT, fontWeight: 700 }}>~{cat.sous_total}€</div>
                </div>
                {cat.items?.map((item: any, i: number) => (
                  <div key={i} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '12px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A' }}>{item.produit}</div>
                      <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{item.quantite} · {item.pourquoi}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#0A0A0A', flexShrink: 0, marginLeft: 12 }}>~{item.prix_approx}€</div>
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
                🥡 <strong style={{ color: '#0A0A0A' }}>Meal prep :</strong> {result.data.meal_prep_tip}
              </div>
            )}

            <button onClick={() => setResult(null)}
              style={{ width: '100%', padding: 14, background: 'transparent', border: '1px solid ' + BORDER, borderRadius: 12, color: '#0A0A0A', fontWeight: 700, cursor: 'pointer' }}>
              Modifier les paramètres
            </button>
          </div>
        )}

        {/* ASTUCES */}
        {mode === 'tips' && loading && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💡</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#0A0A0A' }}>NOX PRÉPARE TES ASTUCES...</div>
          </div>
        )}

        {mode === 'tips' && !loading && !result && !error && (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#0A0A0A', marginBottom: 8 }}>TES CONSEILS SONT PRÊTS À ÊTRE GÉNÉRÉS</div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 18 }}>NOX utilise ton objectif et ton journal alimentaire récent.</div>
            <button onClick={generateTips} style={{ width: '100%', padding: 16, background: ACCENT, border: 'none', borderRadius: 14, color: '#000', fontWeight: 900, cursor: 'pointer' }}>
              GÉNÉRER MES ASTUCES
            </button>
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
                  <div style={{ fontSize: 15, fontWeight: 900, color: '#0A0A0A' }}>{astuce.titre}</div>
                  {astuce.impact === 'fort' && <span style={{ fontSize: 10, background: ACCENT + '22', color: ACCENT, borderRadius: 20, padding: '3px 10px', fontWeight: 800 }}>IMPACT FORT</span>}
                </div>
                <div style={{ fontSize: 13, color: '#888', lineHeight: 1.6, marginBottom: 10 }}>{astuce.conseil}</div>
                <div style={{ fontSize: 12, color: ACCENT, fontWeight: 700 }}>→ {astuce.action}</div>
              </div>
            ))}

            {result.data.secret_chef && (
              <div style={{ background: '#FFFFFF', border: '1px solid #EAEAEA', borderRadius: 16, padding: 18, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#ffaa00', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>👨‍🍳 SECRET DU CHEF</div>
                <div style={{ fontSize: 14, color: '#ccc', lineHeight: 1.6, fontStyle: 'italic' }}>"{result.data.secret_chef}"</div>
              </div>
            )}

            <button onClick={() => { setResult(null); generateTips(); }}
              style={{ width: '100%', padding: 14, background: 'transparent', border: '1px solid ' + BORDER, borderRadius: 12, color: '#0A0A0A', fontWeight: 700, cursor: 'pointer' }}>
              Nouvelles astuces
            </button>
          </div>
        )}
      </div>

      <BottomNav active="fuel" />
    </div>
  );
}
