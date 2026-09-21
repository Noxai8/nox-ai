import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const ACCENT = '#c8ff00';
const BG = '#F7F8F2';
const SURFACE = '#FFFFFF';
const BORDER = '#E6E8E1';
const DARK = '#0E100F';
const MUTED = '#777D78';
const FN = 'https://zpxrsmnpcyzafawlweyl.supabase.co/functions/v1';

type Goal = 'Perte de poids' | 'Maintien' | 'Prise de masse' | 'Manger équilibré';
type Diet = 'Classique' | 'Végétarien' | 'Vegan' | 'Pescétarien' | 'Halal' | 'Sans porc';
type Budget = 'Éco' | 'Équilibré' | 'Confort';
type Step = 'profile' | 'store' | 'prefs' | 'generating' | 'list';
type Prefs = { goal: Goal; people:number; days:number; budget:Budget; diet:Diet; allergies:string[]; dislikes:string[]; likes:string[] };
type Store = { chain:string; city:string; label:string };
type GroceryItem = { id:string; name:string; qty:string; category:string; note?:string; checked?:boolean };

const ALLERGIES = ['Arachides','Fruits à coque','Lait','Œufs','Gluten','Soja','Poisson','Crustacés','Sésame','Moutarde'];
const DIETS: Diet[] = ['Classique','Végétarien','Vegan','Pescétarien','Halal','Sans porc'];
const CATEGORIES = ['Fruits & légumes','Protéines','Féculents','Produits frais','Épicerie','Petit-déjeuner','Autres'];

const STORES = [
  { name:'Carrefour', domain:'carrefour.fr', mark:'◆', brand:'#0067b1' },
  { name:'E.Leclerc', domain:'e.leclerc', mark:'L', brand:'#0874bd' },
  { name:'Intermarché', domain:'intermarche.com', mark:'Inter', brand:'#e21b2d' },
  { name:'Auchan', domain:'auchan.fr', mark:'A', brand:'#e30613' },
  { name:'Lidl', domain:'lidl.fr', mark:'L', brand:'#0050aa' },
  { name:'Aldi', domain:'aldi.fr', mark:'A', brand:'#001e50' },
  { name:'Monoprix', domain:'monoprix.fr', mark:'MONOPRIX', brand:'#e31b23' },
  { name:'Franprix', domain:'franprix.fr', mark:'franprix', brand:'#ef4b23' },
  { name:'Système U', domain:'magasins-u.com', mark:'U', brand:'#00a5c8' },
];

const fallbackItems:GroceryItem[] = [
  {id:'1',name:'Blanc de poulet',qty:'1,2 kg',category:'Protéines'},
  {id:'2',name:'Œufs',qty:'12',category:'Protéines'},
  {id:'3',name:'Saumon',qty:'400 g',category:'Protéines'},
  {id:'4',name:'Riz',qty:'1 kg',category:'Féculents'},
  {id:'5',name:'Flocons d’avoine',qty:'500 g',category:'Petit-déjeuner'},
  {id:'6',name:'Brocoli',qty:'600 g',category:'Fruits & légumes'},
  {id:'7',name:'Bananes',qty:'7',category:'Fruits & légumes'},
  {id:'8',name:'Pommes',qty:'6',category:'Fruits & légumes'},
  {id:'9',name:'Skyr nature',qty:'7 pots',category:'Produits frais'},
  {id:'10',name:'Huile d’olive',qty:'1 bouteille',category:'Épicerie'},
];

const inputStyle:React.CSSProperties={width:'100%',boxSizing:'border-box',padding:'15px 16px',border:`1px solid ${BORDER}`,borderRadius:16,background:'#FAFBF7',color:DARK,fontSize:14,outline:'none'};
const roundBtn:React.CSSProperties={width:42,height:42,borderRadius:14,border:`1px solid ${BORDER}`,background:'#fff',fontSize:24,fontWeight:900,cursor:'pointer'};

export default function QuickGroceries(){
  const navigate=useNavigate();
  const { user }=useAuth();
  const [step,setStep]=useState<Step>('profile');
  const [prefs,setPrefs]=useState<Prefs>({goal:'Manger équilibré',people:1,days:7,budget:'Équilibré',diet:'Classique',allergies:[],dislikes:[],likes:[]});
  const [store,setStore]=useState<Store>({chain:'Carrefour',city:'',label:''});
  const [items,setItems]=useState<GroceryItem[]>([]);
  const [error,setError]=useState('');
  const [likesText,setLikesText]=useState('');
  const [dislikesText,setDislikesText]=useState('');
  const [genStage,setGenStage]=useState(0);

  useEffect(()=>{try{const saved=localStorage.getItem('noxai_quick_groceries');if(!saved)return;const p=JSON.parse(saved);if(p?.prefs){setPrefs(p.prefs);setLikesText((p.prefs.likes||[]).join(', '));setDislikesText((p.prefs.dislikes||[]).join(', '));}if(p?.store)setStore(p.store);}catch{}},[]);
  useEffect(()=>{try{localStorage.setItem('noxai_quick_groceries',JSON.stringify({prefs,store}));}catch{}},[prefs,store]);

  const toggleAllergy=(a:string)=>setPrefs(p=>({...p,allergies:p.allergies.includes(a)?p.allergies.filter(x=>x!==a):[...p.allergies,a]}));
  const parseList=(t:string)=>t.split(',').map(x=>x.trim()).filter(Boolean).slice(0,12);

  const safeFallback=()=>{
    const banned=prefs.allergies.map(a=>a.toLowerCase());
    return fallbackItems.filter(i=>{
      const n=i.name.toLowerCase();
      if(banned.includes('œufs')&&n.includes('œuf'))return false;
      if(banned.includes('lait')&&(n.includes('skyr')||n.includes('lait')||n.includes('yaourt')))return false;
      if(banned.includes('gluten')&&(n.includes('avoine')||n.includes('pain')||n.includes('pâtes')))return false;
      if((prefs.diet==='Végétarien'||prefs.diet==='Vegan')&&(n.includes('poulet')||n.includes('saumon')))return false;
      if(prefs.diet==='Vegan'&&(n.includes('œuf')||n.includes('skyr')))return false;
      return true;
    }).map((x,i)=>({...x,id:`fallback-${i}`}));
  };

  const extractJSON=(text:string)=>{const cleaned=text.replace(/```json/gi,'').replace(/```/g,'').trim();const a=cleaned.indexOf('['),b=cleaned.lastIndexOf(']');if(a<0||b<=a)throw new Error('Réponse IA invalide');return JSON.parse(cleaned.slice(a,b+1));};

  const generate=async()=>{
    setStep('generating'); setGenStage(0); setError('');
    const timers=[450,1050,1750].map((ms,i)=>window.setTimeout(()=>setGenStage(i+1),ms));
    const likes=parseList(likesText),dislikes=parseList(dislikesText);
    const nextPrefs={...prefs,likes,dislikes}; setPrefs(nextPrefs);
    try{
      const {data:{session}}=await supabase.auth.getSession();
      const prompt=`Tu génères une liste de courses nutritionnelle pour NOXAI.
OBJECTIF: ${nextPrefs.goal}. PERSONNES: ${nextPrefs.people}. DURÉE: ${nextPrefs.days} jours. BUDGET: ${nextPrefs.budget}. RÉGIME: ${nextPrefs.diet}. MAGASIN: ${store.chain}. VILLE/ZONE: ${store.city||'non précisée'}. ALIMENTS AIMÉS: ${likes.join(', ')||'aucun renseigné'}. ALIMENTS À ÉVITER: ${dislikes.join(', ')||'aucun'}. ALLERGIES/INTOLÉRANCES: ${nextPrefs.allergies.join(', ')||'aucune renseignée'}.
RÈGLE DE SÉCURITÉ ABSOLUE: n'inclus aucun aliment manifestement incompatible avec les allergies indiquées. Pour les produits transformés dont la composition dépend de la marque, ajoute note="Vérifier l’étiquette/allergènes en magasin". N'invente ni prix, ni stock, ni référence magasin.
Retourne UNIQUEMENT un tableau JSON de 14 à 24 objets: [{"name":"...","qty":"...","category":"Fruits & légumes|Protéines|Féculents|Produits frais|Épicerie|Petit-déjeuner|Autres","note":"..."}]. Quantités réalistes pour ${nextPrefs.people} personne(s) et ${nextPrefs.days} jours.`;
      const resp=await fetch(`${FN}/generate-program`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session?.access_token||''}`},body:JSON.stringify({prompt})});
      if(!resp.ok)throw new Error(`Génération impossible (${resp.status})`);
      const data=await resp.json();
      const text=data?.content?.[0]?.text||data?.data?.content?.[0]?.text||data?.text||'';
      const parsed=extractJSON(text);
      const clean:GroceryItem[]=parsed.filter((x:any)=>x?.name&&x?.qty).slice(0,30).map((x:any,i:number)=>({id:`ai-${Date.now()}-${i}`,name:String(x.name),qty:String(x.qty),category:CATEGORIES.includes(x.category)?x.category:'Autres',note:x.note?String(x.note):'',checked:false}));
      if(!clean.length)throw new Error('Liste vide');
      setItems(clean);
    }catch(e:any){
      setItems(safeFallback()); setError("L’IA n’a pas répondu : une liste de base a été créée.");
    }finally{
      timers.forEach(t=>clearTimeout(t)); setGenStage(4); window.setTimeout(()=>setStep('list'),550);
    }
  };

  const progress=items.length?Math.round(items.filter(i=>i.checked).length/items.length*100):0;
  const grouped=useMemo(()=>CATEGORIES.map(category=>({category,items:items.filter(i=>i.category===category)})).filter(g=>g.items.length),[items]);
  const visualStep=step==='profile'?1:step==='store'?2:step==='prefs'?3:4;

  const back=()=>{
    if(step==='profile')navigate(-1);
    else if(step==='store')setStep('profile');
    else if(step==='prefs')setStep('store');
    else if(step==='list')setStep('prefs');
  };

  return <div className="qg-root">
    <style>{`
      *{box-sizing:border-box} body{margin:0}
      .qg-root{min-height:100vh;background:${BG};color:${DARK};padding-bottom:34px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .qg-head{position:sticky;top:0;z-index:30;background:rgba(247,248,242,.92);backdrop-filter:blur(18px);border-bottom:1px solid rgba(230,232,225,.75)}
      .qg-headin{max-width:720px;margin:auto;padding:15px 18px 10px}
      .qg-top{display:grid;grid-template-columns:48px 1fr 48px;align-items:center}
      .qg-back,.qg-n{width:44px;height:44px;border:0;border-radius:15px;background:#fff;font-size:28px;display:grid;place-items:center}
      .qg-n{background:${DARK};color:${ACCENT};font-size:21px;font-weight:950}
      .qg-title{text-align:center;font-weight:950;font-size:19px;letter-spacing:-.03em}.qg-sub{text-align:center;color:#9a9d99;font-size:10px;margin-top:2px}
      .steps{display:grid;grid-template-columns:repeat(4,1fr);margin-top:14px;position:relative}.steps:before{content:"";position:absolute;left:11%;right:11%;top:14px;height:1px;background:#d8dcd5}
      .step{position:relative;text-align:center;z-index:1}.dot{width:29px;height:29px;border-radius:50%;margin:auto;background:#e5e7e3;display:grid;place-items:center;font-size:11px;font-weight:950}.step.on .dot{background:${ACCENT};color:#111}.step.done .dot{background:#45b52f;color:#fff}.sl{font-size:9px;margin-top:6px;color:#777;font-weight:700}.step.on .sl{color:#111;font-weight:950}
      .qg-main{max-width:720px;margin:auto;padding:18px}.card{background:#fff;border:1px solid ${BORDER};border-radius:22px;padding:17px;margin-bottom:12px;box-shadow:0 8px 30px rgba(25,35,20,.025)}
      .hero{min-height:300px;padding:28px 22px;display:flex;flex-direction:column;justify-content:space-between;background:radial-gradient(circle at 76% 48%,rgba(200,255,0,.25),transparent 27%),#fff}
      .hero h1{font-size:32px;line-height:1.02;letter-spacing:-.055em;margin:0;max-width:430px}.lime{color:#9ed000}.hero p{color:${MUTED};font-size:13px;line-height:1.55;max-width:350px}
      .mascot{font-size:86px;text-align:center;filter:drop-shadow(0 15px 18px rgba(0,0,0,.08));margin:8px 0}
      .benefits{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.benefit{background:#fff;border:1px solid ${BORDER};border-radius:17px;padding:14px 8px;text-align:center;font-size:10px;color:#666}.benefit b{display:block;color:#111;font-size:12px;margin-top:5px}
      .primary{width:100%;border:0;border-radius:17px;padding:17px;background:${ACCENT};color:#111;font-weight:950;font-size:14px;cursor:pointer;box-shadow:0 12px 26px rgba(181,230,0,.18)}
      .sectionTitle{display:flex;gap:12px;align-items:flex-start;margin-bottom:15px}.ico{width:42px;height:42px;border-radius:14px;background:#efffd1;display:grid;place-items:center;font-size:21px;flex:0 0 42px}.sectionTitle h2{font-size:18px;margin:1px 0 3px;letter-spacing:-.03em}.sectionTitle p{margin:0;color:#8b8f8a;font-size:11px;line-height:1.4}
      .stores{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.store{min-height:103px;border:1px solid ${BORDER};background:#fff;border-radius:16px;padding:10px 6px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;font-weight:800;font-size:10px;cursor:pointer}.store.active{border:2px solid ${ACCENT};background:#fbfff1}.brandLogo{min-height:42px;display:grid;place-items:center;font-size:14px;font-weight:950;letter-spacing:-.04em}
.store:nth-child(1) .brandLogo{font-size:11px}.store:nth-child(2) .brandLogo{font-size:12px}.store:nth-child(3) .brandLogo{font-style:italic}.store:nth-child(5) .brandLogo{background:#ffd500;border:5px solid #0050aa;border-radius:50%;width:48px;height:48px}.store:nth-child(6) .brandLogo{background:#001e50;color:#fff!important;padding:8px;border-bottom:4px solid #f05a28}.store:nth-child(9) .brandLogo{border:5px solid #00a5c8;border-radius:50%;width:48px;height:48px;font-size:22px}.brandFallback{height:48px;display:grid;place-items:center;font-size:18px;font-weight:950}
      .choiceGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.choice{border:1px solid ${BORDER};background:#fff;border-radius:15px;padding:13px 7px;font-weight:850;color:#555;cursor:pointer}.choice.active{background:${DARK};color:${ACCENT};border-color:${ACCENT}}
      .two{display:grid;grid-template-columns:1.3fr 1fr;gap:9px}.counter{background:#f7f8f4;border-radius:16px;padding:12px}.counterLabel{font-size:10px;color:#777;font-weight:800;margin-bottom:9px}.counterRow{display:flex;align-items:center;justify-content:space-between}.counterRow b{font-size:22px}
      .chips{display:flex;gap:7px;flex-wrap:wrap}.chip{border:1px solid ${BORDER};background:#fff;border-radius:999px;padding:10px 12px;font-size:11px;font-weight:800;color:#555}.chip.active{background:${DARK};color:${ACCENT};border-color:${DARK}}
      .warning{background:#fff8e9;border:1px solid #f2d89d;color:#7b5b20;border-radius:15px;padding:12px;font-size:10.5px;line-height:1.5;margin-bottom:12px}
      .gen{min-height:67vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.basket{width:190px;height:190px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,#eaff9e 0,#f3ffd5 55%,transparent 56%);font-size:28px;font-weight:950;letter-spacing:-.05em;animation:pulse 1.5s ease-in-out infinite}.gen h1{font-size:27px;margin:12px 0 5px}.gen p{font-size:12px;color:#777;line-height:1.5;max-width:330px}.genlist{width:100%;max-width:430px;margin-top:20px;text-align:left}.genrow{display:flex;align-items:center;gap:10px;padding:11px 2px;font-size:11px;color:#777}.status{width:24px;height:24px;border-radius:50%;border:2px solid #ddd;display:grid;place-items:center;font-size:11px;font-weight:950}.status.done{background:${ACCENT};border-color:${ACCENT};color:#111}.status.active{border-color:${ACCENT};animation:pulse .8s infinite}
      .listHead{background:${DARK};color:#fff;border-radius:22px;padding:19px;margin-bottom:12px}.bar{height:7px;background:#333;border-radius:99px;overflow:hidden;margin-top:14px}.bar>div{height:100%;background:${ACCENT};transition:.25s}
      .item{width:100%;border:0;border-top:1px solid ${BORDER};background:transparent;padding:13px 2px;display:flex;align-items:center;gap:11px;text-align:left}.check{width:24px;height:24px;border-radius:8px;border:1.5px solid #ccc;display:grid;place-items:center;flex:0 0 24px}.check.y{background:${ACCENT};border-color:${DARK}}
      @keyframes pulse{50%{transform:scale(1.045)}} @keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
      @media(max-width:430px){.qg-main{padding:14px}.hero h1{font-size:29px}.stores{gap:7px}.store{min-height:96px}.choice{font-size:11px}.qg-headin{padding-left:14px;padding-right:14px}}
    `}</style>

    <header className="qg-head"><div className="qg-headin">
      <div className="qg-top">
        <button className="qg-back" onClick={back}>‹</button>
        <div><div className="qg-title">Course rapide <span className="lime">✦</span></div><div className="qg-sub">NOXAI fait la liste avec toi</div></div>
        <div className="qg-n">N</div>
      </div>
      {step!=='list' && <Progress current={visualStep}/>}
    </div></header>

    <main className="qg-main">
      {step==='profile' && <>
        <section className="card" style={{background:'linear-gradient(135deg,#fff,#f4ffd9)',borderColor:'#dcefa3'}}>
          <div style={{fontSize:10,fontWeight:950,letterSpacing:'.12em',color:'#718800'}}>COURSES NOXAI</div>
          <div style={{fontSize:28,fontWeight:950,letterSpacing:'-.045em',marginTop:5}}>Préparons ta semaine</div>
          <div style={{fontSize:12,color:'#777',lineHeight:1.5,marginTop:5}}>NOX adapte la liste à ton objectif, ton foyer et ton budget.</div>
        </section>
        <Card><Title icon="◎" title="Ton objectif" sub="Il guide les quantités et l’équilibre de la liste."/>
          <div className="choiceGrid" style={{gridTemplateColumns:'repeat(2,1fr)'}}>{(['Perte de poids','Maintien','Prise de masse','Manger équilibré'] as Goal[]).map(x=><button key={x} className={`choice ${prefs.goal===x?'active':''}`} onClick={()=>setPrefs(p=>({...p,goal:x}))}>{x}</button>)}</div>
        </Card>
        <Card><Title icon="□" title="Durée & foyer" sub="Choisis la durée et le nombre de personnes."/>
          <div className="two"><div className="counter"><div className="counterLabel">Durée</div><div className="choiceGrid">{[3,5,7].map(d=><button key={d} className={`choice ${prefs.days===d?'active':''}`} onClick={()=>setPrefs(p=>({...p,days:d}))}>{d} j</button>)}</div></div><Counter label="Personnes" value={prefs.people} min={1} max={8} onChange={v=>setPrefs(p=>({...p,people:v}))}/></div>
        </Card>
        <Card><Title icon="€" title="Budget" sub="Le budget influence les choix, sans inventer de prix."/>
          <div className="choiceGrid">{(['Éco','Équilibré','Confort'] as Budget[]).map(x=><button key={x} className={`choice ${prefs.budget===x?'active':''}`} onClick={()=>setPrefs(p=>({...p,budget:x}))}>{x}</button>)}</div>
        </Card>
        <Primary onClick={()=>setStep('store')}>CHOISIR MON MAGASIN →</Primary>
      </>}

      {step==='store' && <>
        <Title icon="▣" title="Où fais-tu tes courses ?" sub="Choisis ton magasin habituel pour des produits disponibles près de chez toi."/>
        <div className="stores">
          {STORES.map(s=><button key={s.name} className={`store ${store.chain===s.name?'active':''}`} onClick={()=>setStore(x=>({...x,chain:s.name}))}>
            <div className="brandLogo" style={{color:s.brand}}>{s.name==='Carrefour'?'CARREFOUR':s.name==='E.Leclerc'?'E.LECLERC':s.name==='Intermarché'?'Intermarché':s.name==='Auchan'?'auchan':s.name==='Lidl'?'LIDL':s.name==='Aldi'?'ALDI':s.name==='Monoprix'?'MONOPRIX':s.name==='Franprix'?'franprix':'U'}</div>
            <span>{s.name}</span>
          </button>)}
        </div>
        <button className={`store ${store.chain==='Autre'?'active':''}`} onClick={()=>setStore(x=>({...x,chain:'Autre'}))} style={{width:'100%',minHeight:66,marginTop:9,flexDirection:'row',justifyContent:'flex-start',padding:'0 16px',fontSize:12}}>▣ <span style={{color:'#111'}}>Autre enseigne</span><span style={{marginLeft:'auto'}}>›</span></button>
        <div className="card" style={{marginTop:12}}><div style={{fontWeight:900,fontSize:13,marginBottom:8}}>Ville ou zone</div><input value={store.city} onChange={e=>setStore(s=>({...s,city:e.target.value}))} placeholder="Paris 15e, Lyon, Lille…" style={inputStyle}/></div>
        <Primary onClick={()=>setStep('prefs')}>Continuer　→</Primary>
      </>}

      {step==='prefs' && <>
        <Title icon="≡" title="Tes préférences" sub="Plus ta liste est précise, plus elle te correspond !"/>
        <Card><Title icon="□" title="Combien de temps ?" sub="Choisis la durée et le nombre de personnes."/>
          <div className="two">
            <div className="counter"><div className="counterLabel">▣　Durée</div><div className="choiceGrid">{[3,5,7].map(d=><button key={d} className={`choice ${prefs.days===d?'active':''}`} onClick={()=>setPrefs(p=>({...p,days:d}))}>{d} jours</button>)}</div></div>
            <Counter label="♙  Personnes" value={prefs.people} min={1} max={8} onChange={v=>setPrefs(p=>({...p,people:v}))}/>
          </div>
        </Card>
        <Card><Title icon="€" title="Quel budget ?" sub="Le budget guide les choix de produits. Aucun prix inventé."/>
          <div className="choiceGrid">{(['Éco','Équilibré','Confort'] as Budget[]).map((x,i)=><button key={x} className={`choice ${prefs.budget===x?'active':''}`} onClick={()=>setPrefs(p=>({...p,budget:x}))}>{x}</button>)}</div>
        </Card>
        <Card><Title icon="◇" title="Quel type d’alimentation ?" sub="Choisis le cadre alimentaire principal."/>
          <div className="choiceGrid">{DIETS.map((x,i)=><button key={x} className={`choice ${prefs.diet===x?'active':''}`} onClick={()=>setPrefs(p=>({...p,diet:x}))}>{x}</button>)}</div>
        </Card>
        <Card><Title icon="◈" title="Allergies & intolérances" sub="NOX exclut automatiquement les aliments incompatibles."/>
          <div className="warning">⚠ Pour un produit emballé, vérifie toujours l’étiquette et les mentions « traces de ». La liste ne remplace pas les informations allergènes du fabricant.</div>
          <div className="chips">{ALLERGIES.map(x=><button key={x} className={`chip ${prefs.allergies.includes(x)?'active':''}`} onClick={()=>toggleAllergy(x)}>{prefs.allergies.includes(x)?'✓ ':''}{x}</button>)}</div>
        </Card>
        <Card><Title icon="○" title="Tes goûts" sub="Facultatif — aide NOX à personnaliser davantage."/><input value={likesText} onChange={e=>setLikesText(e.target.value)} placeholder="J’aime : poulet, banane, riz…" style={inputStyle}/><input value={dislikesText} onChange={e=>setDislikesText(e.target.value)} placeholder="Je n’aime pas : champignons, avocat…" style={{...inputStyle,marginTop:8}}/></Card>
        <Primary onClick={generate}>Continuer　→</Primary>
      </>}

      {step==='generating' && <div className="gen">
        <div className="basket">NOX</div><h1>NOX prépare ta liste...</h1>
        <p>On sélectionne les meilleurs produits en fonction de ton profil, de ton budget et de tes préférences.</p>
        <div className="genlist">{['Analyse de tes préférences','Sélection des produits adaptés','Optimisation de la liste','Finalisation…'].map((x,i)=><div className="genrow" key={x}><span className={`status ${genStage>i?'done':genStage===i?'active':''}`}>{genStage>i?'✓':''}</span>{x}</div>)}</div>
        <div className="card" style={{width:'100%',maxWidth:430,marginTop:14,textAlign:'left',fontSize:11}}>✦ <b>Astuce</b><div style={{color:'#888',marginTop:3}}>Plus tu es précis dans tes préférences, plus ta liste sera personnalisée !</div></div>
      </div>}

      {step==='list' && <>
        <section className="listHead"><div style={{display:'flex',justifyContent:'space-between'}}><div><div style={{color:ACCENT,fontSize:10,fontWeight:950}}>LISTE NOXAI</div><div style={{fontSize:24,fontWeight:950,marginTop:4}}>{prefs.days} jours · {prefs.people} pers.</div><div style={{fontSize:11,color:'#aaa',marginTop:5}}>{store.chain}{store.city?` · ${store.city}`:''} · {prefs.budget}</div></div><b style={{color:ACCENT,fontSize:25}}>{progress}%</b></div><div className="bar"><div style={{width:`${progress}%`}}/></div></section>
        {error&&<div className="warning">{error}</div>}
        {prefs.allergies.length>0&&<div className="warning"><b>⚠ Allergies prises en compte :</b> {prefs.allergies.join(' · ')}. Vérifie l’étiquette des produits emballés.</div>}
        {grouped.map((g,gi)=><section className="card" key={g.category} style={{padding:'4px 15px',animation:`rise .35s ease ${gi*.05}s both`}}><div style={{padding:'14px 2px 9px',fontSize:14,fontWeight:950}}>{g.category}</div>{g.items.map((item,idx)=><button className="item" key={item.id} onClick={()=>setItems(xs=>xs.map(x=>x.id===item.id?{...x,checked:!x.checked}:x))} style={{borderTop:idx?`1px solid ${BORDER}`:'none'}}><span className={`check ${item.checked?'y':''}`}>{item.checked?'✓':''}</span><span style={{flex:1}}><b style={{fontSize:12,textDecoration:item.checked?'line-through':'none',opacity:item.checked?.55:1}}>{item.name}</b>{item.note&&<small style={{display:'block',color:'#9a7540',marginTop:3}}>{item.note}</small>}</span><b style={{fontSize:11,color:'#777'}}>{item.qty}</b></button>)}</section>)}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9}}><button className="choice" onClick={()=>setStep('prefs')}>Modifier</button><button className="choice active" onClick={generate}>↻ Régénérer</button></div>
      </>}
    </main>
  </div>;
}

function Progress({current}:{current:number}){const labels=['Profil','Magasin','Préférences','Génération'];return <div className="steps">{labels.map((l,i)=>{const n=i+1;return <div key={l} className={`step ${n===current?'on':''} ${n<current?'done':''}`}><div className="dot">{n<current?'✓':n}</div><div className="sl">{l}</div></div>})}</div>}
function Title({icon,title,sub}:{icon:string;title:string;sub:string}){return <div className="sectionTitle"><div className="ico">{icon}</div><div><h2>{title}</h2><p>{sub}</p></div></div>}
function Card({children}:{children:React.ReactNode}){return <section className="card">{children}</section>}
function Counter({label,value,min,max,onChange}:{label:string;value:number;min:number;max:number;onChange:(v:number)=>void}){return <div className="counter"><div className="counterLabel">{label}</div><div className="counterRow"><button style={roundBtn} onClick={()=>onChange(Math.max(min,value-1))}>−</button><b>{value}</b><button style={roundBtn} onClick={()=>onChange(Math.min(max,value+1))}>+</button></div></div>}
function Primary({onClick,children}:{onClick:()=>void;children:React.ReactNode}){return <button className="primary" onClick={onClick}>{children}</button>}
