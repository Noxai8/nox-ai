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

type Mode = 'empty' | 'complete';
type Step = 'mode' | 'setup' | 'store' | 'prefs' | 'review' | 'generating' | 'list';
type Store = { chain:string; city:string };
type Profile = { goal_type?:string; diet_preferences?:string[] };
type Target = { calories?:number; protein_g?:number; carbs_g?:number; fat_g?:number };
type GroceryItem = { id:string; name:string; qty:string; category:string; note?:string; checked?:boolean; price?:number|null; priceSource?:string };

const ALLERGIES = ['Arachides','Fruits à coque','Lait','Œufs','Gluten','Soja','Poisson','Crustacés','Sésame','Moutarde'];
const CATEGORIES = ['Fruits & légumes','Protéines','Féculents','Produits frais','Épicerie','Petit-déjeuner','Autres'];
const STORES = [
  {name:'Carrefour', mark:'◆', brand:'#0050AA'},
  {name:'E.Leclerc', mark:'L', brand:'#1476D4'},
  {name:'Intermarché', mark:'IM', brand:'#E30613'},
  {name:'Auchan', mark:'A', brand:'#E30613'},
  {name:'Lidl', mark:'L', brand:'#0050AA'},
  {name:'Aldi', mark:'A', brand:'#0050AA'},
  {name:'Super U', mark:'U', brand:'#E30613'},
  {name:'Monoprix', mark:'M', brand:'#E30613'},
  {name:'Franprix', mark:'F', brand:'#F05A28'},
  {name:'Netto', mark:'N', brand:'#E30613'},
  {name:'Carrefour Market', mark:'◆', brand:'#0050AA'},
  {name:'Match', mark:'M', brand:'#218B3A'},
  {name:'Grand Frais', mark:'GF', brand:'#D4A900'},
  {name:'Casino', mark:'C', brand:'#D71920'},
  {name:'Autre', mark:'+', brand:'#111111'},
];

const GOAL_LABELS:Record<string,string> = {
  perdre_gras:'Perdre du gras', prendre_muscle:'Prendre du muscle',
  recomposition:'Recomposition', force:'Force', performance:'Performance', maintien:'Maintien'
};
const DIET_LABELS:Record<string,string> = {
  omnivore:'Omnivore', vegetarien:'Végétarien', vegan:'Vegan',
  sans_gluten:'Sans gluten', sans_lactose:'Sans lactose',
  halal:'Halal', casher:'Casher', keto:'Kéto'
};

const inputStyle:React.CSSProperties = {
  width:'100%', boxSizing:'border-box', padding:'15px 16px',
  border:`1px solid ${BORDER}`, borderRadius:16, background:'#FAFBF7',
  color:DARK, fontSize:15, outline:'none'
};

export default function QuickGroceries(){
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step,setStep] = useState<Step>('mode');
  const [mode,setMode] = useState<Mode>('empty');
  const [profile,setProfile] = useState<Profile>({});
  const [target,setTarget] = useState<Target>({});
  const [loadingProfile,setLoadingProfile] = useState(true);

  const [people,setPeople] = useState(1);
  const [days,setDays] = useState(7);
  const [budget,setBudget] = useState('');
  const [store,setStore] = useState<Store>({chain:'Carrefour',city:''});
  const [storeSearch,setStoreSearch] = useState('');
  const [allergies,setAllergies] = useState<string[]>([]);
  const [otherAllergy,setOtherAllergy] = useState('');
  const [likes,setLikes] = useState('');
  const [dislikes,setDislikes] = useState('');
  const [fridgeText,setFridgeText] = useState('');
  const [items,setItems] = useState<GroceryItem[]>([]);
  const [error,setError] = useState('');
  const [genStage,setGenStage] = useState(0);
  const [activeCategory,setActiveCategory] = useState('Tous');

  useEffect(()=>{
    if(!user) return;
    (async()=>{
      setLoadingProfile(true);
      const [{data:p},{data:t}] = await Promise.all([
        supabase.from('profiles').select('goal_type,diet_preferences').eq('id',user.id).maybeSingle(),
        supabase.from('nutrition_targets').select('calories,protein_g,carbs_g,fat_g').eq('user_id',user.id).eq('is_active',true).maybeSingle()
      ]);
      if(p) setProfile(p);
      if(t) setTarget(t);
      setLoadingProfile(false);
    })();
  },[user]);

  useEffect(()=>{
    try{
      const saved=JSON.parse(localStorage.getItem('noxai_quick_groceries_v4')||'{}');
      if(saved.people) setPeople(saved.people);
      if(saved.days) setDays(saved.days);
      if(saved.budget) setBudget(saved.budget);
      if(saved.store) setStore(saved.store);
      if(saved.allergies) setAllergies(saved.allergies);
      if(saved.otherAllergy) setOtherAllergy(saved.otherAllergy);
      if(saved.likes) setLikes(saved.likes);
      if(saved.dislikes) setDislikes(saved.dislikes);
    }catch{}
  },[]);

  useEffect(()=>{
    try{
      localStorage.setItem('noxai_quick_groceries_v4',JSON.stringify({
        people,days,budget,store,allergies,otherAllergy,likes,dislikes
      }));
    }catch{}
  },[people,days,budget,store,allergies,otherAllergy,likes,dislikes]);

  const allAllergies = useMemo(()=>{
    const extra=otherAllergy.split(',').map(x=>x.trim()).filter(Boolean);
    return [...new Set([...allergies,...extra])];
  },[allergies,otherAllergy]);

  const diet = (profile.diet_preferences||[]).map(x=>DIET_LABELS[x]||x).join(', ') || 'Non renseigné';
  const goal = GOAL_LABELS[profile.goal_type||''] || profile.goal_type || 'Profil NOX';
  const budgetNumber = Number(String(budget).replace(',','.'));
  const canContinueSetup = people>0 && days>0 && Number.isFinite(budgetNumber) && budgetNumber>0;

  const filteredStores = STORES.filter(s =>
    s.name.toLowerCase().includes(storeSearch.trim().toLowerCase())
  );

  const toggleAllergy=(a:string)=>setAllergies(p=>p.includes(a)?p.filter(x=>x!==a):[...p,a]);

  const generate=async()=>{
    setStep('generating'); setGenStage(0); setError('');
    const timers=[400,900,1450,2000].map((ms,i)=>window.setTimeout(()=>setGenStage(i+1),ms));

    try{
      const prompt=`Tu construis une liste de courses NOXAI.
MODE: ${mode==='empty'?'FRIGO VIDE : créer toutes les courses nécessaires':'COMPLÉTER LE FRIGO : ne proposer que ce qui manque'}.
PROFIL DÉJÀ ENREGISTRÉ: objectif=${goal}; alimentation=${diet}.
CIBLE NUTRITIONNELLE: ${target.calories||'non renseignée'} kcal/j; protéines=${target.protein_g||'non renseigné'} g; glucides=${target.carbs_g||'non renseigné'} g; lipides=${target.fat_g||'non renseigné'} g.
FOYER: ${people} personne(s). DURÉE: ${days} jours.
BUDGET MAXIMUM: ${budgetNumber.toFixed(2)} €.
ENSEIGNE: ${store.chain}. ZONE: ${store.city||'non précisée'}.
ALLERGIES/INTOLÉRANCES À EXCLURE: ${allAllergies.join(', ')||'aucune renseignée'}.
ALIMENTS AIMÉS: ${likes||'non renseignés'}.
ALIMENTS REFUSÉS: ${dislikes||'aucun renseigné'}.
CONTENU DU FRIGO DÉCLARÉ: ${mode==='complete'?(fridgeText||'aucun aliment renseigné'):'frigo vide'}.

Contraintes:
- respecte impérativement allergies, régime, budget, durée, foyer et cible nutritionnelle;
- en mode compléter, évite d'ajouter les aliments déjà présents en quantité suffisante;
- privilégie des aliments simples et cohérents avec l'enseigne choisie;
- n'invente JAMAIS un prix, une promotion, un stock ou une référence magasin;
- le champ price doit être null si aucun vrai prix n'a été fourni par une source de prix externe;
- pour les produits transformés, ajoute si nécessaire "Vérifier l'étiquette/allergènes".

Retourne UNIQUEMENT un tableau JSON de 14 à 30 objets:
[{"name":"...","qty":"...","category":"Fruits & légumes|Protéines|Féculents|Produits frais|Épicerie|Petit-déjeuner|Autres","note":"","price":null}]`;

      const { data, error: invokeError } = await supabase.functions.invoke('generate-groceries', {
        body: { prompt }
      });

      if (invokeError) {
        console.error('generate-groceries invoke error:', invokeError);
        throw new Error(invokeError.message || 'Génération impossible');
      }

      if (!data) throw new Error('Aucune réponse de generate-groceries');
      const raw=data?.content?.[0]?.text||data?.data?.content?.[0]?.text||data?.text||'';
      const cleaned=raw.replace(/```json/gi,'').replace(/```/g,'').trim();
      const a=cleaned.indexOf('['), b=cleaned.lastIndexOf(']');
      if(a<0||b<=a) throw new Error('Réponse IA invalide');
      const parsed=JSON.parse(cleaned.slice(a,b+1));

      const clean:GroceryItem[]=parsed
        .filter((x:any)=>x?.name&&x?.qty)
        .slice(0,30)
        .map((x:any,i:number)=>({
          id:`ai-${Date.now()}-${i}`,
          name:String(x.name),
          qty:String(x.qty),
          category:CATEGORIES.includes(x.category)?x.category:'Autres',
          note:x.note?String(x.note):'',
          price:typeof x.price==='number'?x.price:null,
          checked:false
        }));

      if(!clean.length) throw new Error('Liste vide');
      setItems(clean);
    }catch(e:any){
      setError(e?.message||"Impossible de générer la liste.");
      setItems([]);
    }finally{
      timers.forEach(clearTimeout);
      setGenStage(5);
      window.setTimeout(()=>setStep('list'),450);
    }
  };

  const grouped=useMemo(()=>CATEGORIES.map(category=>({
    category,items:items.filter(i=>i.category===category)
  })).filter(g=>g.items.length),[items]);

  const totalKnown=items.reduce((s,i)=>s+(typeof i.price==='number'?i.price:0),0);
  const pricedCount=items.filter(i=>typeof i.price==='number').length;
  const progress=items.length?Math.round(items.filter(i=>i.checked).length/items.length*100):0;

  const back=()=>{
    if(step==='mode'||step==='setup'||step==='prefs') navigate(-1);
    else if(step==='store'||step==='review') setStep('mode');
    else if(step==='list') setStep('review');
  };

  return <div className="qg">
    <style>{`
      *{box-sizing:border-box}body{margin:0;background:#f7f7f2}
      button,input,textarea{font:inherit}
      .qg{min-height:100vh;background:#fafaf6;color:#0b0c0b;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;padding-bottom:96px}
      .head{position:sticky;top:0;z-index:30;background:rgba(250,250,246,.96);backdrop-filter:blur(18px);border-bottom:1px solid #ecece6}
      .headin,.main{max-width:430px;margin:auto}.headin{padding:16px 18px 13px}.main{padding:18px}
      .top{display:grid;grid-template-columns:44px 1fr 44px;align-items:center}.back,.nox{width:42px;height:42px;border-radius:13px;border:1px solid #e4e5df;background:#fff}.back{font-size:28px;line-height:1}.nox{display:grid;place-items:center;background:#0d0e0d;color:#c8ff00;font-size:13px;font-weight:950}
      .title{text-align:center;font-size:17px;font-weight:900}.subtitle{text-align:center;color:#858984;font-size:10px;margin-top:2px}
      h1{font-size:30px;line-height:1.03;letter-spacing:-.045em;margin:0}h2{margin:0;font-size:18px;letter-spacing:-.02em}.muted{color:#737873;font-size:12px;line-height:1.45}.label{font-size:10px;font-weight:900;letter-spacing:.02em;margin-bottom:7px}
      .hero{display:flex;gap:14px;align-items:center;margin:8px 0 18px}.heroIcon{width:58px;height:58px;border-radius:17px;background:linear-gradient(145deg,#eaff9d,#dfff72);display:grid;place-items:center;font-size:29px;flex:0 0 58px}.hero h1{font-size:29px;margin-bottom:5px}
      .seg{display:grid;grid-template-columns:1fr 1fr;border:1px solid #e5e6e0;border-radius:18px;background:#fff;padding:3px;margin-bottom:18px}.seg button{border:0;border-radius:15px;background:transparent;padding:13px 10px;text-align:left}.seg button.active{background:#0d0e0d;color:#fff}.seg b{display:block;font-size:12px}.seg span{font-size:9px;color:#8a8e89}.seg .active span{color:#b8bbb7}
      .formCard{background:#fff;border:1px solid #e5e6e0;border-radius:20px;overflow:hidden;margin-bottom:12px;box-shadow:0 4px 18px rgba(0,0,0,.018)}
      .fieldRow{min-height:72px;display:grid;grid-template-columns:38px 1fr auto;align-items:center;gap:10px;padding:11px 14px;border-bottom:1px solid #ecece7}.fieldRow:last-child{border-bottom:0}.fieldIcon{width:34px;height:34px;border-radius:11px;background:#f4f5f1;display:grid;place-items:center;font-size:16px;font-weight:900}.fieldRow small{display:block;color:#858984;font-size:9px;margin-bottom:3px}.fieldRow b{font-size:12px}.arrow{font-size:20px}.inlineInput{width:100%;border:0;outline:0;background:transparent;color:#0b0c0b;font-weight:800;font-size:13px;padding:0}
      .days{display:flex;gap:4px}.mini{border:1px solid #e3e4de;background:#fff;border-radius:10px;padding:7px 8px;font-size:10px;font-weight:850}.mini.on{background:#0d0e0d;color:#c8ff00;border-color:#0d0e0d}
      .chips{display:flex;gap:6px;flex-wrap:wrap}.chip{border:1px solid #e2e4de;background:#f8f9f5;border-radius:999px;padding:7px 9px;font-size:9px;font-weight:750}.chip.active{background:#0d0e0d;color:#c8ff00;border-color:#0d0e0d}
      .subCard{background:#fff;border:1px solid #e5e6e0;border-radius:20px;padding:15px;margin-bottom:12px}.input{width:100%;border:1px solid #e3e4de;background:#fafbf7;border-radius:14px;padding:13px;outline:0;font-size:12px}
      .primary{width:100%;border:0;border-radius:16px;background:#0d0e0d;color:#c8ff00;padding:17px;font-size:13px;font-weight:950}.stickyCTA{position:sticky;bottom:12px;z-index:20;box-shadow:0 12px 28px rgba(0,0,0,.18)}
      .storeTitle{text-align:center;font-size:17px;font-weight:900;margin:3px 0 16px}.search{height:45px;border:1px solid #e4e5df;background:#fff;border-radius:13px;display:flex;align-items:center;gap:8px;padding:0 12px;margin-bottom:13px}.search input{border:0;outline:0;width:100%;background:transparent;font-size:11px}.storeGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.storeTile{height:101px;position:relative;border:1px solid #e5e6e0;background:#fff;border-radius:15px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px}.storeTile.active{border:1.5px solid #65c52d}.storeTile b{font-size:9px}.brandMark{width:45px;height:45px;border-radius:12px;background:#f7f7f4;display:grid;place-items:center;font-weight:950;font-size:18px}.selectedTick{position:absolute;right:6px;top:6px;width:21px;height:21px;border-radius:50%;background:#5abb37;color:#fff;display:grid;place-items:center;font-size:11px}.info{display:flex;gap:10px;background:#edffe6;border:1px solid #d5efca;border-radius:15px;padding:13px;margin:13px 0}.infoIcon{width:29px;height:29px;border-radius:50%;background:#39a94e;color:#fff;display:grid;place-items:center;flex:0 0 29px}.info b{font-size:10px;display:block}.info small{font-size:9px;color:#697068;line-height:1.35;display:block;margin-top:3px}
      .reviewTop{background:#efffe7;border:1px solid #d6efca;border-radius:16px;padding:14px;margin-bottom:13px}.reviewTop b{font-size:12px}.reviewTop span{display:block;color:#697068;font-size:10px;margin-top:3px}.reviewRow{display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid #ecece7;font-size:11px}.reviewRow:last-child{border:0}.reviewRow span{color:#7d827d}.reviewRow b{text-align:right}
      .gen{min-height:68vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:left}.bag{width:128px;height:128px;border-radius:50%;background:#e9ffc9;display:grid;place-items:center;font-size:52px;margin-bottom:24px}.gen h1{text-align:center;font-size:24px;margin-bottom:18px}.genrows{width:100%;max-width:330px}.genrow{font-size:12px;padding:8px 0;color:#777}.genrow.done{color:#222}.genbar{height:8px;background:#e7e8e3;border-radius:99px;overflow:hidden;margin-top:24px;width:100%;max-width:330px}.genbar div{height:100%;background:#62c52f;transition:.3s}.tip{max-width:330px;margin-top:28px;border:1px solid #e7e7e1;border-radius:16px;padding:14px;font-size:10px;color:#777}
      .success{display:flex;gap:10px;align-items:center;background:#efffe7;border:1px solid #d4efc7;border-radius:15px;padding:12px;margin-bottom:17px}.successIcon{width:35px;height:35px;border-radius:50%;background:#31a94c;color:#fff;display:grid;place-items:center;font-weight:900}.success b{font-size:11px;display:block}.success small{font-size:9px;color:#697068}
      .listTitle{font-size:25px;font-weight:950;letter-spacing:-.035em}.listMeta{font-size:11px;color:#737873;margin:4px 0 13px}.catTabs{display:flex;gap:7px;overflow:auto;padding-bottom:8px;margin-bottom:6px;scrollbar-width:none}.catTabs button{white-space:nowrap;border:1px solid #e3e4de;background:#fff;border-radius:999px;padding:9px 12px;font-size:9px}.catTabs button.on{background:#0d0e0d;color:#fff;border-color:#0d0e0d}
      .group{margin:12px 0 18px}.groupHead{display:flex;align-items:center;gap:8px;margin-bottom:7px}.groupIcon{width:31px;height:31px;border-radius:11px;background:#a8f58e;display:grid;place-items:center}.groupHead b{font-size:14px}.groupHead span{margin-left:auto;color:#7d827d;font-size:9px}.items{background:#fff;border-radius:16px;overflow:hidden}.item{width:100%;border:0;border-bottom:1px solid #ecece7;background:#fff;padding:10px 12px;display:grid;grid-template-columns:1fr auto 22px;align-items:center;gap:8px;text-align:left}.item:last-child{border-bottom:0}.item b{font-size:11px}.item small{display:block;color:#838783;font-size:9px;margin-top:2px}.price{font-size:10px;font-weight:850}.check{width:20px;height:20px;border:1.5px solid #aeb3ae;border-radius:5px;display:grid;place-items:center;font-size:10px}.check.y{background:#c8ff00;border-color:#111}
      .bottomTotal{position:sticky;bottom:10px;background:#101110;color:#fff;border-radius:17px;padding:12px 13px;display:flex;align-items:center;justify-content:space-between;gap:10px;box-shadow:0 12px 30px rgba(0,0,0,.2)}.bottomTotal b{font-size:14px}.bottomTotal small{display:block;color:#bbb;font-size:9px}.bottomTotal button{border:0;background:#c8ff00;border-radius:13px;padding:13px 15px;font-weight:900;font-size:10px}
      .warning{background:#fff8e8;border:1px solid #efd69c;color:#74561f;border-radius:14px;padding:12px;font-size:10px;line-height:1.4;margin-bottom:12px}
      @media(min-width:700px){.headin,.main{max-width:430px}}
    `}</style>

    <header className="head"><div className="headin"><div className="top">
      <button className="back" onClick={back}>‹</button>
      <div><div className="title">Course rapide</div><div className="subtitle">Ta liste adaptée par NOXAI</div></div>
      <div className="nox">NOX</div>
    </div></div></header>

    <main className="main">
      {(step==='mode'||step==='setup'||step==='prefs')&&<>
        <div className="hero">
          <div className="heroIcon">🛒</div>
          <div><h1>Course rapide</h1><div className="muted">Une liste de courses personnalisée,<br/>adaptée à ton programme et à ton budget.</div></div>
        </div>

        <div className="seg">
          <button className={mode==='empty'?'active':''} onClick={()=>setMode('empty')}><b>🛒 &nbsp; Frigo vide</b><span>Liste complète</span></button>
          <button className={mode==='complete'?'active':''} onClick={()=>setMode('complete')}><b>▣ &nbsp; Compléter le frigo</b><span>Seulement le nécessaire</span></button>
        </div>

        <div className="formCard">
          <div className="fieldRow" onClick={()=>setStep('store')}><span className="fieldIcon">▥</span><div><small>Magasin</small><b>{store.chain}</b></div><span className="arrow">›</span></div>
          <div className="fieldRow"><span className="fieldIcon">€</span><div><small>Budget maximum</small><input className="inlineInput" inputMode="decimal" value={budget} onChange={e=>setBudget(e.target.value.replace(/[^\d,.]/g,''))} placeholder="20"/></div><b>€</b></div>
          <div className="fieldRow"><span className="fieldIcon">□</span><div><small>Nombre de jours</small><b>{days} jours</b></div><div className="days">{[3,5,7].map(d=><button key={d} className={`mini ${days===d?'on':''}`} onClick={()=>setDays(d)}>{d}</button>)}</div></div>
          <div className="fieldRow"><span className="fieldIcon">♙</span><div><small>Nombre de personnes</small><b>{people} personne{people>1?'s':''}</b></div><div className="days"><button className="mini" onClick={()=>setPeople(Math.max(1,people-1))}>−</button><button className="mini" onClick={()=>setPeople(Math.min(10,people+1))}>+</button></div></div>
          <div className="fieldRow"><span className="fieldIcon">♜</span><div><small>Objectif nutritionnel</small><b>{goal}</b></div><span className="arrow">›</span></div>
          <div className="fieldRow"><span className="fieldIcon">◇</span><div><small>Régime alimentaire</small><b>{diet}</b></div><span className="arrow">›</span></div>
        </div>

        {mode==='complete'&&<div className="subCard"><div className="label">CE QUE TU AS DÉJÀ</div><textarea className="input" style={{minHeight:70,resize:'vertical'}} value={fridgeText} onChange={e=>setFridgeText(e.target.value)} placeholder="6 œufs, riz, tomates…"/></div>}

        <div className="subCard">
          <div className="label">ALLERGIES ET INTOLÉRANCES</div>
          <div className="chips">{ALLERGIES.map(a=><button key={a} className={`chip ${allergies.includes(a)?'active':''}`} onClick={()=>toggleAllergy(a)}>{allergies.includes(a)?'✓ ':''}{a}</button>)}</div>
          <input className="input" style={{marginTop:9}} value={otherAllergy} onChange={e=>setOtherAllergy(e.target.value)} placeholder="Autre allergie…"/>
        </div>

        <div className="formCard">
          <div className="fieldRow"><span className="fieldIcon">♡</span><div><small>Aliments aimés</small><input className="inlineInput" value={likes} onChange={e=>setLikes(e.target.value)} placeholder="Poulet, riz, tomates…"/></div><span className="arrow">›</span></div>
          <div className="fieldRow"><span className="fieldIcon">⊘</span><div><small>Aliments refusés</small><input className="inlineInput" value={dislikes} onChange={e=>setDislikes(e.target.value)} placeholder="Poisson…"/></div><span className="arrow">›</span></div>
        </div>

        <button className="primary stickyCTA" disabled={!canContinueSetup} onClick={()=>setStep('review')}>✦ &nbsp; GÉNÉRER MA LISTE DE COURSES</button>
      </>}

      {step==='store'&&<>
        <div className="storeTitle">Choisir un magasin</div>
        <div className="search"><span>⌕</span><input value={storeSearch} onChange={e=>setStoreSearch(e.target.value)} placeholder="Rechercher une enseigne…"/></div>
        <div className="storeGrid">{filteredStores.map(s=><button key={s.name} className={`storeTile ${store.chain===s.name?'active':''}`} onClick={()=>setStore(p=>({...p,chain:s.name}))}>{store.chain===s.name&&<span className="selectedTick">✓</span>}<span className="brandMark" style={{color:s.brand}}>{s.mark}</span><b>{s.name}</b></button>)}</div>
        <div className="info"><span className="infoIcon">✓</span><div><b>Prix réels et produits de ton magasin</b><small>NOXAI affiche uniquement les prix reliés à une source réelle. Sinon le prix reste indisponible.</small></div></div>
        <div className="subCard"><div className="label">VILLE / ZONE</div><input className="input" value={store.city} onChange={e=>setStore(p=>({...p,city:e.target.value}))} placeholder="Paris 15e, Toul, Nancy…"/></div>
        <button className="primary" onClick={()=>setStep('mode')}>CONTINUER</button>
      </>}

      {step==='review'&&<>
        <div className="reviewTop"><b>✓ &nbsp; Prêt à générer</b><span>{days} jours · {people} personne{people>1?'s':''} · {store.chain} · {budgetNumber.toFixed(2)} €</span></div>
        <h1 style={{fontSize:25,marginBottom:12}}>Vérifie ta liste</h1>
        <div className="subCard">
          <Row l="Mode" v={mode==='empty'?'Frigo vide':'Compléter le frigo'}/><Row l="Magasin" v={`${store.chain}${store.city?` · ${store.city}`:''}`}/><Row l="Budget" v={`${budgetNumber.toFixed(2)} €`}/><Row l="Durée" v={`${days} jours`}/><Row l="Personnes" v={`${people}`}/><Row l="Objectif" v={goal}/><Row l="Régime" v={diet}/><Row l="Allergies" v={allAllergies.join(', ')||'Aucune'}/>
        </div>
        <button className="primary" onClick={generate}>✦ &nbsp; GÉNÉRER MA LISTE</button>
      </>}

      {step==='generating'&&<div className="gen">
        <div className="bag">♧</div><h1>On prépare ta liste de courses…</h1>
        <div className="genrows">{['Analyse de ton programme','Sélection des produits adaptés','Vérification des contraintes','Optimisation selon ton budget','Finalisation de la liste…'].map((x,i)=><div key={x} className={`genrow ${genStage>i?'done':''}`}>{genStage>i?'✓':'○'} &nbsp; {x}</div>)}</div>
        <div className="genbar"><div style={{width:`${Math.min(100,genStage*20)}%`}}/></div>
        <div className="tip">💡 &nbsp; <b>Bon à savoir</b><br/>NOXAI privilégie des produits simples et cohérents avec ton profil. Aucun prix n’est inventé.</div>
      </div>}

      {step==='list'&&<>
        {!error&&<div className="success"><span className="successIcon">✓</span><div><b>Liste générée avec succès !</b><small>{days} jours · {people} personne{people>1?'s':''} · {store.chain} · budget {budgetNumber.toFixed(2)} €</small></div></div>}
        {error&&<div className="warning"><b>La liste n’a pas pu être générée.</b><br/>{error}</div>}
        <div className="listTitle">Ma liste de courses</div><div className="listMeta">{items.length} produits · {pricedCount?`${pricedCount} prix disponibles`:'prix magasin indisponibles'}</div>
        <div className="catTabs"><button className={activeCategory==='Tous'?'on':''} onClick={()=>setActiveCategory('Tous')}>Tous ({items.length})</button>{grouped.map(g=><button key={g.category} className={activeCategory===g.category?'on':''} onClick={()=>setActiveCategory(g.category)}>{g.category} ({g.items.length})</button>)}</div>
        {grouped.filter(g=>activeCategory==='Tous'||g.category===activeCategory).map(g=><div className="group" key={g.category}><div className="groupHead"><span className="groupIcon">♧</span><b>{g.category}</b><span>{g.items.length} produits</span></div><div className="items">{g.items.map(it=><button className="item" key={it.id} onClick={()=>setItems(xs=>xs.map(x=>x.id===it.id?{...x,checked:!x.checked}:x))}><span><b style={{textDecoration:it.checked?'line-through':'none'}}>{it.name}</b><small>{it.qty}{it.note?` · ${it.note}`:''}</small></span><span className="price">{typeof it.price==='number'?`${it.price.toFixed(2)} €`:'—'}</span><span className={`check ${it.checked?'y':''}`}>{it.checked?'✓':''}</span></button>)}</div></div>)}
        {!error&&<div className="bottomTotal"><div><b>{items.length} produits</b><small>{pricedCount?`Total connu ${totalKnown.toFixed(2)} €`:'Budget max '+budgetNumber.toFixed(2)+' €'}</small></div><button onClick={()=>setStep('review')}>Modifier</button></div>}
      </>}
    </main>
  </div>;
}

function Row({l,v}:{l:string;v:string}){return <div className="reviewRow"><span>{l}</span><b>{v}</b></div>}
