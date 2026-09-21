import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const ACCENT = '#c8ff00';
const BG = '#F6F7F2';
const SURFACE = '#FFFFFF';
const BORDER = '#E8E8E3';
const DARK = '#111111';
const FN = 'https://zpxrsmnpcyzafawlweyl.supabase.co/functions/v1';

type Goal = 'Perte de poids' | 'Maintien' | 'Prise de masse' | 'Manger équilibré';
type Diet = 'Classique' | 'Végétarien' | 'Vegan' | 'Pescétarien' | 'Halal' | 'Sans porc';
type Budget = 'Éco' | 'Équilibré' | 'Confort';
type Step = 'setup' | 'store' | 'generating' | 'list';

type Prefs = {
  goal: Goal;
  people: number;
  days: number;
  budget: Budget;
  diet: Diet;
  allergies: string[];
  dislikes: string[];
  likes: string[];
};

type Store = { chain: string; city: string; label: string };
type GroceryItem = { id: string; name: string; qty: string; category: string; note?: string; checked?: boolean };

const ALLERGIES = ['Arachides','Fruits à coque','Lait','Œufs','Gluten','Soja','Poisson','Crustacés','Sésame','Moutarde'];
const DIETS: Diet[] = ['Classique','Végétarien','Vegan','Pescétarien','Halal','Sans porc'];
const CHAINS = ['Carrefour','E.Leclerc','Intermarché','Auchan','Lidl','Aldi','Monoprix','Franprix','Autre'];
const CATEGORIES = ['Fruits & légumes','Protéines','Féculents','Produits frais','Épicerie','Petit-déjeuner','Autres'];

const fallbackItems: GroceryItem[] = [
  { id:'1', name:'Blanc de poulet', qty:'1,2 kg', category:'Protéines' },
  { id:'2', name:'Œufs', qty:'12', category:'Protéines' },
  { id:'3', name:'Saumon', qty:'400 g', category:'Protéines' },
  { id:'4', name:'Riz', qty:'1 kg', category:'Féculents' },
  { id:'5', name:'Flocons d’avoine', qty:'500 g', category:'Petit-déjeuner' },
  { id:'6', name:'Brocoli', qty:'600 g', category:'Fruits & légumes' },
  { id:'7', name:'Bananes', qty:'7', category:'Fruits & légumes' },
  { id:'8', name:'Pommes', qty:'6', category:'Fruits & légumes' },
  { id:'9', name:'Skyr nature', qty:'7 pots', category:'Produits frais' },
  { id:'10', name:'Huile d’olive', qty:'1 bouteille', category:'Épicerie' },
];

const pill = (active=false): React.CSSProperties => ({
  border: `1px solid ${active ? DARK : BORDER}`, background: active ? DARK : SURFACE,
  color: active ? ACCENT : '#555', borderRadius: 999, padding: '10px 13px', fontSize: 12,
  fontWeight: 800, cursor: 'pointer', touchAction: 'manipulation'
});

export default function QuickGroceries() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('setup');
  const [prefs, setPrefs] = useState<Prefs>({ goal:'Manger équilibré', people:1, days:7, budget:'Équilibré', diet:'Classique', allergies:[], dislikes:[], likes:[] });
  const [store, setStore] = useState<Store>({ chain:'Carrefour', city:'', label:'' });
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [error, setError] = useState('');
  const [likesText, setLikesText] = useState('');
  const [dislikesText, setDislikesText] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('noxai_quick_groceries');
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed?.prefs) { setPrefs(parsed.prefs); setLikesText((parsed.prefs.likes || []).join(', ')); setDislikesText((parsed.prefs.dislikes || []).join(', ')); }
      if (parsed?.store) setStore(parsed.store);
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('noxai_quick_groceries', JSON.stringify({ prefs, store })); } catch {}
  }, [prefs, store]);

  const toggleAllergy = (a:string) => setPrefs(p => ({ ...p, allergies: p.allergies.includes(a) ? p.allergies.filter(x=>x!==a) : [...p.allergies,a] }));

  const parseList = (text:string) => text.split(',').map(x=>x.trim()).filter(Boolean).slice(0,12);

  const safeFallback = () => {
    const banned = prefs.allergies.map(a=>a.toLowerCase());
    const diet = prefs.diet;
    return fallbackItems.filter(i => {
      const n = i.name.toLowerCase();
      if (banned.includes('œufs') && n.includes('œuf')) return false;
      if (banned.includes('lait') && (n.includes('skyr') || n.includes('lait') || n.includes('yaourt'))) return false;
      if (banned.includes('gluten') && (n.includes('avoine') || n.includes('pain') || n.includes('pâtes'))) return false;
      if ((diet==='Végétarien'||diet==='Vegan') && (n.includes('poulet')||n.includes('saumon'))) return false;
      if (diet==='Vegan' && (n.includes('œuf')||n.includes('skyr'))) return false;
      return true;
    }).map((x,i)=>({ ...x, id:`fallback-${i}` }));
  };

  const extractJSON = (text:string) => {
    const cleaned = text.replace(/```json/gi,'').replace(/```/g,'').trim();
    const a = cleaned.indexOf('['), b = cleaned.lastIndexOf(']');
    if (a < 0 || b <= a) throw new Error('Réponse IA invalide');
    return JSON.parse(cleaned.slice(a,b+1));
  };

  const generate = async () => {
    setStep('generating'); setError('');
    const likes = parseList(likesText); const dislikes = parseList(dislikesText);
    const nextPrefs = { ...prefs, likes, dislikes };
    setPrefs(nextPrefs);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const prompt = `Tu génères une liste de courses nutritionnelle pour NOXAI.\nOBJECTIF: ${nextPrefs.goal}. PERSONNES: ${nextPrefs.people}. DURÉE: ${nextPrefs.days} jours. BUDGET: ${nextPrefs.budget}. RÉGIME: ${nextPrefs.diet}. MAGASIN: ${store.chain}. VILLE/ZONE: ${store.city || 'non précisée'}. ALIMENTS AIMÉS: ${likes.join(', ') || 'aucun renseigné'}. ALIMENTS À ÉVITER: ${dislikes.join(', ') || 'aucun'}. ALLERGIES/INTOLÉRANCES: ${nextPrefs.allergies.join(', ') || 'aucune renseignée'}.\nRÈGLE DE SÉCURITÉ ABSOLUE: n'inclus aucun aliment manifestement incompatible avec les allergies indiquées. Pour les produits transformés dont la composition dépend de la marque, ajoute note="Vérifier l’étiquette/allergènes en magasin" au lieu de prétendre qu'ils sont sûrs. N'invente ni prix, ni stock, ni référence magasin. Adapte seulement les types de produits au format d'enseigne et au budget.\nRetourne UNIQUEMENT un tableau JSON de 14 à 24 objets: [{"name":"...","qty":"...","category":"Fruits & légumes|Protéines|Féculents|Produits frais|Épicerie|Petit-déjeuner|Autres","note":"..."}]. Quantités réalistes pour ${nextPrefs.people} personne(s) et ${nextPrefs.days} jours.`;
      const resp = await fetch(`${FN}/generate-program`, { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${session?.access_token || ''}`}, body:JSON.stringify({prompt}) });
      if (!resp.ok) throw new Error(`Génération impossible (${resp.status})`);
      const data = await resp.json();
      const text = data?.content?.[0]?.text || data?.data?.content?.[0]?.text || data?.text || '';
      const parsed = extractJSON(text);
      const clean:GroceryItem[] = parsed.filter((x:any)=>x?.name && x?.qty).slice(0,30).map((x:any,i:number)=>({ id:`ai-${Date.now()}-${i}`, name:String(x.name), qty:String(x.qty), category:CATEGORIES.includes(x.category)?x.category:'Autres', note:x.note?String(x.note):'', checked:false }));
      if (!clean.length) throw new Error('Liste vide');
      setItems(clean); setStep('list');
    } catch (e:any) {
      setItems(safeFallback()); setError("L’IA n’a pas répondu : une liste de base a été créée. Tu peux la modifier."); setStep('list');
    }
  };

  const progress = items.length ? Math.round(items.filter(i=>i.checked).length/items.length*100) : 0;
  const grouped = useMemo(() => CATEGORIES.map(category => ({ category, items: items.filter(i=>i.category===category) })).filter(g=>g.items.length), [items]);

  return <div style={{minHeight:'100vh',background:BG,color:DARK,paddingBottom:40}}>
    <style>{`
      @keyframes noxPulse { 0%,100% { transform:scale(1); box-shadow:0 0 0 10px rgba(200,255,0,.08) } 50% { transform:scale(1.08); box-shadow:0 0 0 22px rgba(200,255,0,.02) } }
      @keyframes noxShimmer { 0% { transform:translateX(-120%) } 100% { transform:translateX(320%) } }
      @keyframes noxRise { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
      @keyframes noxCheck { 0% { transform:scale(.7) } 60% { transform:scale(1.15) } 100% { transform:scale(1) } }
    `}</style>
    <div style={{position:'sticky',top:0,zIndex:20,background:'rgba(246,247,242,.94)',backdropFilter:'blur(14px)',borderBottom:`1px solid ${BORDER}`,padding:'14px 18px'}}>
      <div style={{maxWidth:720,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
        <button onClick={()=> step==='setup' ? navigate(-1) : setStep(step==='list'?'store':'setup')} style={{border:'none',background:SURFACE,width:40,height:40,borderRadius:14,fontSize:20,cursor:'pointer'}}>‹</button>
        <div style={{textAlign:'center'}}><div style={{fontWeight:950,fontSize:17}}>Course rapide <span style={{color:'#7a8a00'}}>✦</span></div><div style={{fontSize:10,color:'#999',marginTop:2}}>NOXAI fait la liste avec toi</div></div>
        <div style={{width:40,height:40,borderRadius:14,background:DARK,color:ACCENT,display:'grid',placeItems:'center',fontWeight:950}}>N</div>
      </div>
    </div>

    <main style={{maxWidth:720,margin:'0 auto',padding:'18px'}}>
      {step==='setup' && <>
        <section style={{background:'linear-gradient(145deg,#111,#202020)',borderRadius:24,padding:22,color:'#fff',marginBottom:14,overflow:'hidden',position:'relative'}}>
          <div style={{fontSize:11,color:ACCENT,fontWeight:900,letterSpacing:'.12em'}}>COURSES INTELLIGENTES</div>
          <div style={{fontSize:29,fontWeight:950,lineHeight:1.05,marginTop:9,maxWidth:420}}>Une liste pensée pour toi, pas une liste générique.</div>
          <div style={{fontSize:12,color:'#bbb',lineHeight:1.55,marginTop:10,maxWidth:500}}>Objectif, budget, régime, goûts et allergies sont pris en compte avant de générer les courses.</div>
        </section>

        <Card title="Ton objectif" sub="NOX adapte les quantités et le type d’aliments.">
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{(['Perte de poids','Maintien','Prise de masse','Manger équilibré'] as Goal[]).map(x=><button key={x} onClick={()=>setPrefs(p=>({...p,goal:x}))} style={pill(prefs.goal===x)}>{x}</button>)}</div>
        </Card>

        <Card title="Pour combien de temps ?" sub="Choisis le nombre de personnes et la durée.">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <Counter label="Personnes" value={prefs.people} min={1} max={8} onChange={v=>setPrefs(p=>({...p,people:v}))}/>
            <Counter label="Jours" value={prefs.days} min={3} max={14} onChange={v=>setPrefs(p=>({...p,days:v}))}/>
          </div>
        </Card>

        <Card title="Budget" sub="Pas de faux prix : le budget influence les choix, pas un total inventé.">
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>{(['Éco','Équilibré','Confort'] as Budget[]).map(x=><button key={x} onClick={()=>setPrefs(p=>({...p,budget:x}))} style={pill(prefs.budget===x)}>{x}</button>)}</div>
        </Card>

        <Card title="Alimentation" sub="Choisis le cadre alimentaire principal.">
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{DIETS.map(x=><button key={x} onClick={()=>setPrefs(p=>({...p,diet:x}))} style={pill(prefs.diet===x)}>{x}</button>)}</div>
        </Card>

        <Card title="Allergies & intolérances" sub="Contrainte prioritaire. NOX exclut les aliments manifestement incompatibles.">
          <div style={{background:'#fff7e8',border:'1px solid #f3dfb5',borderRadius:14,padding:12,fontSize:11,color:'#765b24',lineHeight:1.5,marginBottom:12}}>⚠ Pour un produit emballé, vérifie toujours l’étiquette et les mentions « traces de ». La liste ne remplace pas les informations allergènes du fabricant.</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{ALLERGIES.map(x=><button key={x} onClick={()=>toggleAllergy(x)} style={{...pill(prefs.allergies.includes(x)),background:prefs.allergies.includes(x)?'#241b16':SURFACE,color:prefs.allergies.includes(x)?'#ffd9c8':'#555'}}>{prefs.allergies.includes(x)?'✓ ':''}{x}</button>)}</div>
        </Card>

        <Card title="Tes goûts" sub="Sépare les aliments par des virgules.">
          <input value={likesText} onChange={e=>setLikesText(e.target.value)} placeholder="J’aime : poulet, banane, riz..." style={inputStyle}/>
          <input value={dislikesText} onChange={e=>setDislikesText(e.target.value)} placeholder="Je n’aime pas : champignons, avocat..." style={{...inputStyle,marginTop:9}}/>
        </Card>

        <Primary onClick={()=>setStep('store')}>CONTINUER · CHOISIR MON MAGASIN →</Primary>
      </>}

      {step==='store' && <>
        <div style={{marginBottom:18}}><div style={{fontSize:28,fontWeight:950,letterSpacing:'-.04em'}}>Où fais-tu tes courses ?</div><div style={{fontSize:13,color:'#777',marginTop:6,lineHeight:1.5}}>On adapte la sélection au type d’enseigne. Les stocks et prix réels nécessitent les données du magasin et ne sont pas inventés.</div></div>
        <Card title="Enseigne" sub="Choisis ton magasin habituel.">
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8}}>{CHAINS.map(x=><button key={x} onClick={()=>setStore(s=>({...s,chain:x}))} style={{...pill(store.chain===x),borderRadius:14,padding:'14px 6px'}}>{x}</button>)}</div>
        </Card>
        <Card title="Ville ou zone" sub="Ex. Paris 15e, Lyon, Lille... Cela donne du contexte à la génération.">
          <input value={store.city} onChange={e=>setStore(s=>({...s,city:e.target.value}))} placeholder="Ma ville / mon quartier" style={inputStyle}/>
        </Card>
        <div style={{background:'#efffd1',border:'1px solid #deefb4',borderRadius:18,padding:15,marginBottom:14}}><div style={{fontSize:12,fontWeight:900}}>Résumé</div><div style={{fontSize:12,color:'#657044',marginTop:6,lineHeight:1.55}}>{prefs.days} jours · {prefs.people} pers. · {prefs.goal} · {prefs.budget} · {prefs.diet}{prefs.allergies.length?` · Sans ${prefs.allergies.join(', ')}`:''}</div></div>
        <Primary onClick={generate}>✦ GÉNÉRER MES COURSES</Primary>
      </>}

      {step==='generating' && <div style={{minHeight:'65vh',display:'grid',placeItems:'center',textAlign:'center'}}><div style={{animation:'noxRise .35s ease both'}}><div style={{width:84,height:84,borderRadius:'50%',background:DARK,color:ACCENT,display:'grid',placeItems:'center',fontSize:34,fontWeight:950,margin:'0 auto 18px',animation:'noxPulse 1.15s ease-in-out infinite'}}>✦</div><div style={{fontSize:25,fontWeight:950}}>NOX prépare tes courses</div><div style={{fontSize:13,color:'#777',marginTop:8}}>Objectif · préférences · allergies · magasin</div><div style={{width:210,height:7,background:'#e7e7e1',borderRadius:99,overflow:'hidden',margin:'20px auto',position:'relative'}}><div style={{position:'absolute',inset:0,width:'42%',background:ACCENT,borderRadius:99,animation:'noxShimmer 1.15s ease-in-out infinite'}}/></div><div style={{fontSize:11,color:'#999'}}>Construction d’une liste compatible avec ton profil…</div></div></div>}

      {step==='list' && <>
        <section style={{background:DARK,borderRadius:24,padding:20,color:'#fff',marginBottom:14}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start'}}><div><div style={{fontSize:11,color:ACCENT,fontWeight:900}}>LISTE NOXAI</div><div style={{fontSize:25,fontWeight:950,marginTop:5}}>{prefs.days} jours · {prefs.people} pers.</div><div style={{fontSize:12,color:'#aaa',marginTop:6}}>{store.chain}{store.city?` · ${store.city}`:''} · {prefs.budget}</div></div><div style={{fontSize:27,fontWeight:950,color:ACCENT}}>{progress}%</div></div>
          <div style={{height:8,background:'#333',borderRadius:99,overflow:'hidden',marginTop:16}}><div style={{height:'100%',width:`${progress}%`,background:ACCENT,borderRadius:99,transition:'width .25s'}}/></div>
        </section>
        {error && <div style={{background:'#fff6df',border:'1px solid #f2dfaa',borderRadius:16,padding:13,fontSize:11,color:'#735c25',marginBottom:12}}>{error}</div>}
        {prefs.allergies.length>0 && <div style={{background:'#fff',border:'1px solid #ffd8cb',borderRadius:16,padding:14,marginBottom:12}}><div style={{fontSize:12,fontWeight:900}}>⚠ Allergies prises en compte</div><div style={{fontSize:11,color:'#777',marginTop:4}}>{prefs.allergies.join(' · ')} — vérifie l’étiquette des produits emballés.</div></div>}
        {grouped.map((group,groupIndex)=><section key={group.category} style={{animation:`noxRise .35s ease ${groupIndex*.06}s both`,background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:20,padding:'4px 15px',marginBottom:12}}><div style={{padding:'14px 2px 9px',fontSize:13,fontWeight:950}}>{group.category}</div>{group.items.map((item,idx)=><button key={item.id} onClick={()=>setItems(xs=>xs.map(x=>x.id===item.id?{...x,checked:!x.checked}:x))} style={{width:'100%',display:'flex',gap:12,alignItems:'center',padding:'13px 2px',border:'none',borderTop:idx?`1px solid ${BORDER}`:'none',background:'transparent',textAlign:'left',cursor:'pointer'}}><div style={{width:24,height:24,borderRadius:8,border:`1.5px solid ${item.checked?DARK:'#ccc'}`,background:item.checked?ACCENT:SURFACE,animation:item.checked?'noxCheck .22s ease':'none',display:'grid',placeItems:'center',fontWeight:950,flexShrink:0}}>{item.checked?'✓':''}</div><div style={{minWidth:0,flex:1}}><div style={{fontSize:13,fontWeight:850,textDecoration:item.checked?'line-through':'none',opacity:item.checked ? .55 : 1}}>{item.name}</div>{item.note&&<div style={{fontSize:10,color:'#9a7540',marginTop:3}}>{item.note}</div>}</div><div style={{fontSize:12,color:'#777',fontWeight:800,flexShrink:0}}>{item.qty}</div></button>)}</section>)}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginTop:16}}><button onClick={()=>setStep('setup')} style={{padding:14,borderRadius:14,border:`1px solid ${BORDER}`,background:SURFACE,fontWeight:850,cursor:'pointer'}}>Modifier</button><button onClick={generate} style={{padding:14,borderRadius:14,border:'none',background:DARK,color:ACCENT,fontWeight:900,cursor:'pointer'}}>↻ Régénérer</button></div>
        {progress===100 && <div style={{textAlign:'center',padding:'28px 10px 10px'}}><div style={{width:66,height:66,borderRadius:'50%',background:ACCENT,display:'grid',placeItems:'center',fontSize:30,fontWeight:950,margin:'0 auto'}}>✓</div><div style={{fontSize:22,fontWeight:950,marginTop:12}}>Courses terminées !</div><div style={{fontSize:12,color:'#888',marginTop:5}}>Ta liste est complète.</div></div>}
      </>}
    </main>
  </div>;
}

function Card({title,sub,children}:{title:string;sub?:string;children:React.ReactNode}) { return <section style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:20,padding:17,marginBottom:12}}><div style={{fontSize:15,fontWeight:950}}>{title}</div>{sub&&<div style={{fontSize:11,color:'#888',lineHeight:1.45,marginTop:4,marginBottom:13}}>{sub}</div>}{children}</section> }
function Counter({label,value,min,max,onChange}:{label:string;value:number;min:number;max:number;onChange:(v:number)=>void}) { return <div style={{background:BG,borderRadius:16,padding:12}}><div style={{fontSize:11,color:'#777',fontWeight:800,marginBottom:9}}>{label}</div><div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><button onClick={()=>onChange(Math.max(min,value-1))} style={roundBtn}>−</button><b style={{fontSize:22}}>{value}</b><button onClick={()=>onChange(Math.min(max,value+1))} style={roundBtn}>+</button></div></div> }
function Primary({onClick,children}:{onClick:()=>void;children:React.ReactNode}) { return <button onClick={onClick} style={{width:'100%',padding:17,border:'none',borderRadius:16,background:ACCENT,color:DARK,fontWeight:950,fontSize:13,cursor:'pointer',boxShadow:'0 10px 24px rgba(200,255,0,.18)'}}>{children}</button> }
const inputStyle:React.CSSProperties={width:'100%',boxSizing:'border-box',padding:'13px 14px',border:`1px solid ${BORDER}`,borderRadius:13,background:BG,color:DARK,fontSize:13,outline:'none'};
const roundBtn:React.CSSProperties={width:34,height:34,borderRadius:11,border:`1px solid ${BORDER}`,background:SURFACE,fontSize:20,fontWeight:800,cursor:'pointer'};
