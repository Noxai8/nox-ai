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

type Mode = 'empty' | 'complete';
type Step = 'mode' | 'setup' | 'store' | 'prefs' | 'review' | 'generating' | 'list';
type Store = { chain:string; city:string };
type Profile = { goal_type?:string; diet_preferences?:string[] };
type Target = { calories?:number; protein_g?:number; carbs_g?:number; fat_g?:number };
type GroceryItem = { id:string; name:string; qty:string; category:string; note?:string; checked?:boolean; price?:number|null; priceSource?:string };

const ALLERGIES = ['Arachides','Fruits à coque','Lait','Œufs','Gluten','Soja','Poisson','Crustacés','Sésame','Moutarde'];
const CATEGORIES = ['Fruits & légumes','Protéines','Féculents','Produits frais','Épicerie','Petit-déjeuner','Autres'];
const STORES = ['Carrefour','E.Leclerc','Intermarché','Auchan','Lidl','Aldi','Monoprix','Franprix','Système U','Autre'];

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
  const [allergies,setAllergies] = useState<string[]>([]);
  const [otherAllergy,setOtherAllergy] = useState('');
  const [likes,setLikes] = useState('');
  const [dislikes,setDislikes] = useState('');
  const [fridgeText,setFridgeText] = useState('');
  const [items,setItems] = useState<GroceryItem[]>([]);
  const [error,setError] = useState('');
  const [genStage,setGenStage] = useState(0);

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

  const toggleAllergy=(a:string)=>setAllergies(p=>p.includes(a)?p.filter(x=>x!==a):[...p,a]);

  const generate=async()=>{
    setStep('generating'); setGenStage(0); setError('');
    const timers=[400,900,1450,2000].map((ms,i)=>window.setTimeout(()=>setGenStage(i+1),ms));

    try{
      const {data:{session}}=await supabase.auth.getSession();

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

      const resp=await fetch(`${FN}/generate-groceries`,{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${session?.access_token||''}`},
        body:JSON.stringify({prompt})
      });
      if(!resp.ok) throw new Error(`Génération impossible (${resp.status})`);

      const data=await resp.json();
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
    const order:Step[]=['mode','setup','store','prefs','review'];
    const i=order.indexOf(step);
    if(step==='mode') navigate(-1);
    else if(i>0) setStep(order[i-1]);
    else if(step==='list') setStep('review');
  };

  return <div className="qg">
    <style>{`
      *{box-sizing:border-box}body{margin:0}
      .qg{min-height:100vh;background:${BG};color:${DARK};font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;padding-bottom:32px}
      .head{position:sticky;top:0;z-index:20;background:rgba(247,248,242,.94);backdrop-filter:blur(15px);border-bottom:1px solid ${BORDER}}
      .headin,.main{max-width:720px;margin:auto}.headin{padding:14px 16px}.main{padding:16px}
      .top{display:grid;grid-template-columns:44px 1fr 44px;align-items:center}.back,.nox{width:42px;height:42px;border-radius:14px;border:1px solid ${BORDER};background:#fff;font-size:23px}.nox{display:grid;place-items:center;background:${DARK};color:${ACCENT};font-size:14px;font-weight:950}
      .title{text-align:center;font-weight:950;font-size:18px}.subtitle{text-align:center;color:${MUTED};font-size:10px;margin-top:2px}
      .card{background:${SURFACE};border:1px solid ${BORDER};border-radius:20px;padding:17px;margin-bottom:12px}
      h1{font-size:27px;line-height:1.08;letter-spacing:-.045em;margin:4px 0 8px}h2{font-size:17px;margin:0 0 5px}.muted{color:${MUTED};font-size:12px;line-height:1.5}
      .modeGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}.mode{border:1.5px solid ${BORDER};background:#fff;border-radius:19px;padding:20px 15px;text-align:left;min-height:150px}.mode.active{border-color:#9ed600;background:#f8ffe7}.modeIcon{width:42px;height:42px;border-radius:13px;background:#efffd1;display:grid;place-items:center;font-weight:950;margin-bottom:18px}
      .mode b{display:block;font-size:15px;margin-bottom:6px}.mode span{font-size:11px;color:${MUTED};line-height:1.4}
      .primary{width:100%;border:0;border-radius:16px;padding:17px;background:${ACCENT};font-weight:950;font-size:14px;margin-top:4px}.primary:disabled{background:#e2e5dc;color:#999}
      .label{font-size:11px;font-weight:900;margin:0 0 8px}.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.choice{border:1px solid ${BORDER};background:#fff;border-radius:14px;padding:13px 8px;font-weight:850}.choice.active{background:${DARK};color:${ACCENT};border-color:${DARK}}
      .counter{display:flex;align-items:center;justify-content:space-between;background:#f7f8f4;border-radius:15px;padding:10px}.counter button{width:40px;height:40px;border:1px solid ${BORDER};border-radius:12px;background:#fff;font-size:20px}.counter b{font-size:20px}
      .profile{background:${DARK};color:#fff}.profile .muted{color:#aaa}.facts{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}.fact{padding:8px 10px;border-radius:999px;background:#252825;color:#ddd;font-size:10px}.fact strong{color:${ACCENT}}
      .stores{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.store{border:1px solid ${BORDER};background:#fff;border-radius:15px;padding:14px;text-align:left;font-weight:900}.store.active{border:2px solid ${ACCENT};background:#fbfff0}
      .chips{display:flex;gap:7px;flex-wrap:wrap}.chip{border:1px solid ${BORDER};background:#fff;border-radius:999px;padding:9px 11px;font-size:11px;font-weight:800}.chip.active{background:${DARK};color:${ACCENT}}
      .row{display:flex;justify-content:space-between;gap:15px;padding:10px 0;border-bottom:1px solid ${BORDER};font-size:12px}.row:last-child{border:0}.row span{color:${MUTED}}.row b{text-align:right}
      .warning{background:#fff8e8;border:1px solid #efd69c;color:#74561f;border-radius:14px;padding:12px;font-size:11px;line-height:1.45;margin-bottom:12px}
      .gen{min-height:65vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}.pulse{width:140px;height:140px;border-radius:50%;background:#edffb3;display:grid;place-items:center;font-size:25px;font-weight:950;animation:pulse 1.2s infinite}.genrows{width:100%;max-width:390px;margin-top:18px}.genrow{padding:9px;text-align:left;color:${MUTED};font-size:11px}.done{color:${DARK};font-weight:800}
      .listhead{background:${DARK};color:#fff;border-radius:20px;padding:18px;margin-bottom:12px}.lime{color:${ACCENT}}.bar{height:6px;background:#333;border-radius:99px;overflow:hidden;margin-top:13px}.bar div{height:100%;background:${ACCENT}}
      .item{width:100%;border:0;border-top:1px solid ${BORDER};background:transparent;padding:13px 0;display:flex;align-items:center;gap:10px;text-align:left}.check{width:24px;height:24px;border:1px solid #ccc;border-radius:8px;display:grid;place-items:center;flex:0 0 24px}.check.y{background:${ACCENT};border-color:${DARK}}
      @keyframes pulse{50%{transform:scale(1.04)}} @media(max-width:430px){.main{padding:13px}.modeGrid{grid-template-columns:1fr}.mode{min-height:auto}.grid3{grid-template-columns:repeat(3,1fr)}}
    `}</style>

    <header className="head"><div className="headin"><div className="top">
      <button className="back" onClick={back}>‹</button>
      <div><div className="title">Course rapide</div><div className="subtitle">Ta liste adaptée par NOXAI</div></div>
      <div className="nox">NOX</div>
    </div></div></header>

    <main className="main">
      {step==='mode' && <>
        <div className="card">
          <div style={{fontSize:10,fontWeight:950,color:'#779600',letterSpacing:'.12em'}}>COURSES NOXAI</div>
          <h1>On part de quoi ?</h1>
          <div className="muted">NOX connaît déjà ton objectif et tes besoins. Dis-lui simplement si tu pars de zéro ou si tu veux compléter ce que tu as.</div>
          <div className="modeGrid">
            <button className={`mode ${mode==='empty'?'active':''}`} onClick={()=>setMode('empty')}>
              <div className="modeIcon">0</div><b>Frigo vide</b><span>Créer toutes les courses nécessaires pour les prochains jours.</span>
            </button>
            <button className={`mode ${mode==='complete'?'active':''}`} onClick={()=>setMode('complete')}>
              <div className="modeIcon">+</div><b>Compléter mon frigo</b><span>Tenir compte de ce que tu as déjà et acheter seulement ce qui manque.</span>
            </button>
          </div>
        </div>
        <div className="card profile">
          <h2>Profil NOX utilisé</h2>
          <div className="muted">{loadingProfile?'Chargement de ton profil…':'Ces données viennent de ton inscription. Tu ne les renseignes pas une deuxième fois.'}</div>
          {!loadingProfile && <div className="facts">
            <div className="fact"><strong>Objectif</strong> · {goal}</div>
            <div className="fact"><strong>Alimentation</strong> · {diet}</div>
            {target.calories&&<div className="fact"><strong>{target.calories}</strong> kcal/j</div>}
            {target.protein_g&&<div className="fact"><strong>{target.protein_g} g</strong> protéines</div>}
          </div>}
        </div>
        <button className="primary" onClick={()=>setStep('setup')}>CONTINUER</button>
      </>}

      {step==='setup' && <>
        <div className="card"><h1>Pour combien ?</h1><div className="muted">Ces informations servent réellement à calculer les quantités et à respecter ton budget.</div></div>
        <div className="card"><div className="label">DURÉE</div><div className="grid3">{[3,5,7].map(d=><button key={d} className={`choice ${days===d?'active':''}`} onClick={()=>setDays(d)}>{d} jours</button>)}</div></div>
        <div className="card"><div className="label">PERSONNES</div><div className="counter"><button onClick={()=>setPeople(Math.max(1,people-1))}>−</button><b>{people}</b><button onClick={()=>setPeople(Math.min(10,people+1))}>+</button></div></div>
        <div className="card"><div className="label">BUDGET MAXIMUM</div><input style={inputStyle} inputMode="decimal" value={budget} onChange={e=>setBudget(e.target.value.replace(/[^\d,.]/g,''))} placeholder="Ex. 70"/><div className="muted" style={{marginTop:8}}>NOX essaiera de construire la liste dans cette enveloppe. Les prix ne seront jamais inventés.</div></div>
        {mode==='complete'&&<div className="card"><div className="label">CE QUE TU AS DÉJÀ</div><textarea style={{...inputStyle,minHeight:105,resize:'vertical'}} value={fridgeText} onChange={e=>setFridgeText(e.target.value)} placeholder="Ex. 6 œufs, riz, 2 yaourts, tomates…"/><div className="muted" style={{marginTop:8}}>Tu pourras ensuite remplacer ce champ par les données automatiques de Frigo IA.</div></div>}
        <button className="primary" disabled={!canContinueSetup} onClick={()=>setStep('store')}>CHOISIR LE MAGASIN</button>
      </>}

      {step==='store' && <>
        <div className="card"><h1>Ton magasin</h1><div className="muted">Choisis l’enseigne et indique ta ville ou ta zone. Le magasin précis sera nécessaire pour des prix locaux fiables.</div></div>
        <div className="stores">{STORES.map(s=><button key={s} className={`store ${store.chain===s?'active':''}`} onClick={()=>setStore(p=>({...p,chain:s}))}>{s}</button>)}</div>
        <div className="card" style={{marginTop:12}}><div className="label">VILLE / ZONE</div><input style={inputStyle} value={store.city} onChange={e=>setStore(p=>({...p,city:e.target.value}))} placeholder="Ex. Toul, Nancy, Paris 15e…"/></div>
        <button className="primary" onClick={()=>setStep('prefs')}>CONTINUER</button>
      </>}

      {step==='prefs' && <>
        <div className="card"><h1>Sécurité & goûts</h1><div className="muted">Tout ce que tu renseignes ici apparaît dans le récapitulatif avant génération.</div></div>
        <div className="card"><div className="label">ALLERGIES / INTOLÉRANCES</div><div className="chips">{ALLERGIES.map(a=><button key={a} className={`chip ${allergies.includes(a)?'active':''}`} onClick={()=>toggleAllergy(a)}>{allergies.includes(a)?'✓ ':''}{a}</button>)}</div><input style={{...inputStyle,marginTop:12}} value={otherAllergy} onChange={e=>setOtherAllergy(e.target.value)} placeholder="Autre : céleri, sulfites…"/></div>
        <div className="warning">Pour les produits emballés, l’étiquette du fabricant reste la référence pour les allergènes et les traces éventuelles.</div>
        <div className="card"><div className="label">ALIMENTS QUE TU AIMES</div><input style={inputStyle} value={likes} onChange={e=>setLikes(e.target.value)} placeholder="Poulet, riz, banane…"/></div>
        <div className="card"><div className="label">ALIMENTS QUE TU NE VEUX PAS</div><input style={inputStyle} value={dislikes} onChange={e=>setDislikes(e.target.value)} placeholder="Champignons, avocat…"/></div>
        <button className="primary" onClick={()=>setStep('review')}>VOIR LE RÉCAPITULATIF</button>
      </>}

      {step==='review' && <>
        <div className="card"><h1>Tout est pris en compte</h1><div className="muted">Vérifie ce que NOX va utiliser avant de générer tes courses.</div></div>
        <div className="card">
          <Row l="Mode" v={mode==='empty'?'Frigo vide':'Compléter mon frigo'}/>
          <Row l="Objectif NOX" v={goal}/><Row l="Alimentation" v={diet}/>
          <Row l="Durée" v={`${days} jours`}/><Row l="Foyer" v={`${people} personne${people>1?'s':''}`}/>
          <Row l="Budget maximum" v={`${budgetNumber.toFixed(2)} €`}/><Row l="Magasin" v={`${store.chain}${store.city?` · ${store.city}`:''}`}/>
          <Row l="Allergies" v={allAllergies.join(', ')||'Aucune renseignée'}/>
          <Row l="Aimés" v={likes||'Non renseigné'}/><Row l="Refusés" v={dislikes||'Aucun'}/>
          {mode==='complete'&&<Row l="Déjà dans le frigo" v={fridgeText||'Non renseigné'}/>}
        </div>
        <button className="primary" onClick={generate}>GÉNÉRER MES COURSES</button>
      </>}

      {step==='generating'&&<div className="gen"><div className="pulse">NOX</div><h1>Construction de ta liste</h1><div className="muted">Profil, contraintes, quantités et budget sont analysés ensemble.</div><div className="genrows">{['Profil NOX chargé','Allergies et préférences vérifiées','Quantités calculées','Budget pris en compte','Liste finalisée'].map((x,i)=><div key={x} className={`genrow ${genStage>i?'done':''}`}>{genStage>i?'✓':'○'}　{x}</div>)}</div></div>}

      {step==='list'&&<>
        <div className="listhead"><div className="lime" style={{fontSize:10,fontWeight:950}}>LISTE NOXAI</div><h1 style={{marginBottom:4}}>{days} jours · {people} pers.</h1><div style={{fontSize:11,color:'#aaa'}}>{store.chain}{store.city?` · ${store.city}`:''} · budget {budgetNumber.toFixed(2)} €</div><div className="bar"><div style={{width:`${progress}%`}}/></div></div>
        {error&&<div className="warning"><b>La liste n’a pas pu être générée.</b><br/>{error}</div>}
        {!error&&pricedCount===0&&<div className="warning"><b>Prix magasin :</b> aucune source de prix réelle n’est encore connectée. NOX n’affiche donc aucun faux prix.</div>}
        {pricedCount>0&&<div className="card"><Row l="Prix connus" v={`${totalKnown.toFixed(2)} €`}/><Row l="Budget" v={`${budgetNumber.toFixed(2)} €`}/><Row l="Produits avec prix fiable" v={`${pricedCount} / ${items.length}`}/></div>}
        {allAllergies.length>0&&<div className="warning"><b>Allergies prises en compte :</b> {allAllergies.join(' · ')}</div>}
        {grouped.map(g=><div className="card" key={g.category} style={{padding:'4px 15px'}}><h2 style={{padding:'13px 0 8px'}}>{g.category}</h2>{g.items.map((it,i)=><button className="item" key={it.id} onClick={()=>setItems(xs=>xs.map(x=>x.id===it.id?{...x,checked:!x.checked}:x))} style={{borderTop:i?`1px solid ${BORDER}`:'none'}}><span className={`check ${it.checked?'y':''}`}>{it.checked?'✓':''}</span><span style={{flex:1}}><b style={{fontSize:12,textDecoration:it.checked?'line-through':'none'}}>{it.name}</b>{it.note&&<small style={{display:'block',color:'#8c7446',marginTop:3}}>{it.note}</small>}</span><span style={{textAlign:'right'}}><b style={{display:'block',fontSize:11}}>{it.qty}</b><small style={{color:MUTED}}>{typeof it.price==='number'?`${it.price.toFixed(2)} €`:'Prix indisponible'}</small></span></button>)}</div>)}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><button className="choice" onClick={()=>setStep('review')}>Modifier</button><button className="choice active" onClick={generate}>Régénérer</button></div>
      </>}
    </main>
  </div>;
}

function Row({l,v}:{l:string;v:string}){return <div className="row"><span>{l}</span><b>{v}</b></div>}
