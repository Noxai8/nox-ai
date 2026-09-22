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
type Step = 'mode' | 'setup' | 'budget' | 'prefs' | 'review' | 'generating' | 'list';
type Profile = { goal_type?:string; diet_preferences?:string[] };
type Target = { calories?:number; protein_g?:number; carbs_g?:number; fat_g?:number };
type GroceryItem = { id:string; name:string; qty:string; category:string; note?:string; checked?:boolean; price?:number|null };

const ALLERGIES = ['Arachides','Fruits à coque','Lait','Œufs','Gluten','Soja','Poisson','Crustacés','Sésame','Moutarde'];
const CATEGORIES = ['Fruits & légumes','Protéines','Féculents','Produits frais','Épicerie','Petit-déjeuner','Autres'];
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


const norm=(v:string)=>v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();

function firstNumber(qty:string){
  const m=String(qty).replace(',','.').match(/\d+(?:\.\d+)?/);
  return m?Number(m[0]):1;
}
type PriceRule={keys:string[];kg?:number;litre?:number;unit?:number;pack?:number};
const PRICE_RULES:PriceRule[]=[
 {keys:['banane'],kg:2.0},{keys:['pomme de terre'],kg:2.2},{keys:['pomme'],kg:2.8},{keys:['brocoli'],kg:2.4},
 {keys:['haricot vert'],kg:3.2},{keys:['tomate'],kg:2.7},{keys:['carotte'],kg:1.8},{keys:['oignon'],kg:1.8},
 {keys:['salade','laitue'],unit:1.5},{keys:['oeuf'],unit:.28},{keys:['poulet'],kg:9.5},{keys:['thon'],pack:1.7},
 {keys:['saumon'],kg:18},{keys:['riz'],kg:2.2},{keys:['pate'],kg:1.6},{keys:['pain'],pack:2.0},
 {keys:['lait'],litre:1.25},{keys:['yaourt'],unit:.45},{keys:['fromage blanc'],kg:3.5},{keys:['fromage'],kg:10},
 {keys:['huile'],litre:10},{keys:['miel'],kg:12},{keys:['sauce tomate'],pack:1.8},{keys:['avoine','flocon'],kg:3},
 {keys:['lentille','pois chiche'],kg:3}
];
function estimatePrice(name:string,qty:string){
  const n=norm(name), q=norm(qty), num=firstNumber(qty);
  const r=PRICE_RULES.find(x=>x.keys.some(k=>n.includes(k)));
  if(!r)return Math.max(.79,Math.round(2.5*100)/100);
  let v=2.5;
  if((q.includes(' kg')||q.endsWith('kg'))&&r.kg)v=num*r.kg;
  else if((q.includes(' g')||q.endsWith('g'))&&r.kg)v=(num/1000)*r.kg;
  else if((q.includes('litre')||q.includes(' litre')||q.endsWith(' l'))&&r.litre)v=num*r.litre;
  else if(q.includes('ml')&&r.litre)v=(num/1000)*r.litre;
  else if((q.includes('unite')||q.includes('oeuf')||q.includes('pot'))&&r.unit)v=num*r.unit;
  else if((q.includes('boite')||q.includes('paquet')||q.includes('sachet')||q.includes('bocal'))&&r.pack)v=num*r.pack;
  else if(r.kg)v=num*r.kg;
  else if(r.litre)v=num*r.litre;
  else if(r.unit)v=num*r.unit;
  else if(r.pack)v=num*r.pack;
  return Math.max(.69,Math.round(v*100)/100);
}
function enrich(items:GroceryItem[]){
  return items.map(it=>({
    ...it,
    price:estimatePrice(it.name,it.qty)
  }));
}
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
  const [allergies,setAllergies] = useState<string[]>([]);
  const [otherAllergy,setOtherAllergy] = useState('');
  const [likes,setLikes] = useState('');
  const [dislikes,setDislikes] = useState('');
  const [fridgeText,setFridgeText] = useState('');
  const [items,setItems] = useState<GroceryItem[]>([]);
  const [error,setError] = useState('');
  const [budgetNotice,setBudgetNotice] = useState('');
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
      if(saved.allergies) setAllergies(saved.allergies);
      if(saved.otherAllergy) setOtherAllergy(saved.otherAllergy);
      if(saved.likes) setLikes(saved.likes);
      if(saved.dislikes) setDislikes(saved.dislikes);
    }catch{}
  },[]);

  useEffect(()=>{
    try{
      localStorage.setItem('noxai_quick_groceries_v4',JSON.stringify({
        people,days,budget,allergies,otherAllergy,likes,dislikes
      }));
    }catch{}
  },[people,days,budget,allergies,otherAllergy,likes,dislikes]);

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
    setStep('generating'); setGenStage(0); setError(''); setBudgetNotice('');
    const timers=[400,900,1450,2000].map((ms,i)=>window.setTimeout(()=>setGenStage(i+1),ms));
    try{
      const basePrompt=`Tu construis une liste de courses NOXAI.
MODE: ${mode==='empty'?'FRIGO VIDE : créer toutes les courses nécessaires':'COMPLÉTER LE FRIGO : ne proposer que ce qui manque'}.
PROFIL DÉJÀ ENREGISTRÉ: objectif=${goal}; alimentation=${diet}.
CIBLE NUTRITIONNELLE: ${target.calories||'non renseignée'} kcal/j; protéines=${target.protein_g||'non renseigné'} g; glucides=${target.carbs_g||'non renseigné'} g; lipides=${target.fat_g||'non renseigné'} g.
FOYER: ${people} personne(s). DURÉE: ${days} jours.
BUDGET MAXIMUM STRICT: ${budgetNumber.toFixed(2)} €.
ALLERGIES/INTOLÉRANCES À EXCLURE: ${allAllergies.join(', ')||'aucune renseignée'}.
ALIMENTS AIMÉS: ${likes||'non renseignés'}.
ALIMENTS REFUSÉS: ${dislikes||'aucun renseigné'}.
CONTENU DU FRIGO DÉCLARÉ: ${mode==='complete'?(fridgeText||'aucun aliment renseigné'):'frigo vide'}.

Contraintes:
- respecte impérativement allergies, régime, durée, foyer et cible nutritionnelle;
- LE TOTAL DOIT RESTER SOUS LE BUDGET MAXIMUM. Privilégie marques distributeur, aliments simples, saisonniers et économiques;
- adapte surtout les quantités et remplace les aliments chers par des équivalents nutritionnels moins chers;
- en mode compléter, évite les aliments déjà présents en quantité suffisante;
- les prix affichés sont uniquement des estimations NOXAI servant à respecter le budget, jamais des prix magasin;
- pour les produits transformés, ajoute si nécessaire "Vérifier l'étiquette/allergènes".
Repères de prix pour optimiser le budget: bananes 2€/kg, pommes 2.8€/kg, légumes 1.8-3.2€/kg, poulet 9.5€/kg, œufs 0.28€/unité, thon 1.7€/boîte, riz 2.2€/kg, pâtes 1.6€/kg, lait 1.25€/L, yaourt 0.45€/pot, pain 2€/paquet, huile d'olive 10€/L.

Retourne UNIQUEMENT un tableau JSON. Le nombre de produits doit s'adapter au budget :
[{"name":"...","qty":"...","category":"Fruits & légumes|Protéines|Féculents|Produits frais|Épicerie|Petit-déjeuner|Autres","note":""}]`;

      const parseList=(raw:string):GroceryItem[]=>{
        const cleaned=raw.replace(/```json/gi,'').replace(/```/g,'').trim();
        const a=cleaned.indexOf('['), b=cleaned.lastIndexOf(']');
        if(a<0||b<=a)throw new Error('Réponse IA invalide');
        const parsed=JSON.parse(cleaned.slice(a,b+1));
        return parsed.filter((x:any)=>x?.name&&x?.qty).slice(0,30).map((x:any,i:number)=>({
          id:`ai-${Date.now()}-${i}`,name:String(x.name),qty:String(x.qty),
          category:CATEGORIES.includes(x.category)?x.category:'Autres',
          note:x.note?String(x.note):'',
          price:null,
          checked:false
        }));
      };

      let finalItems:GroceryItem[]=[];
      let previousTotal=0;
      for(let attempt=0;attempt<3;attempt++){
        const correction=attempt===0?'':`

CORRECTION BUDGET OBLIGATOIRE — MODE ÉCONOMIQUE:
La tentative précédente coûtait environ ${previousTotal.toFixed(2)} €, donc dépassait le maximum de ${budgetNumber.toFixed(2)} €.
Refais toute la liste en visant réellement ${Math.max(1,budgetNumber*0.92).toFixed(2)} € maximum pour garder une marge.
Priorité absolue aux aliments économiques compatibles avec le profil: féculents simples, légumineuses, œufs si autorisés, légumes/fruits économiques, conserves ou surgelés simples.
Supprime les produits non essentiels, remplace les aliments chers par des équivalents nutritionnels moins coûteux et réduis les quantités sans prétendre couvrir les besoins si ce n'est pas possible.
Tu peux retourner moins de 14 produits si le budget l'exige.
Ne dépasse jamais le budget et n'invente aucun prix magasin.`;
        const {data,error:invokeError}=await supabase.functions.invoke('generate-groceries',{body:{prompt:basePrompt+correction}});
        if(invokeError)throw new Error(invokeError.message||'Génération impossible');
        if(!data)throw new Error('Aucune réponse de generate-groceries');
        const raw=data?.content?.[0]?.text||data?.data?.content?.[0]?.text||data?.text||'';
        const clean=parseList(raw);
        if(!clean.length)throw new Error('Liste vide');
        finalItems=enrich(clean);
        previousTotal=finalItems.reduce((sum,it)=>sum+(it.price||0),0);
        if(previousTotal<=budgetNumber)break;
      }

      if(previousTotal>budgetNumber){
        setBudgetNotice(`Budget très serré : NOX n'a pas trouvé une sélection complète sous ${budgetNumber.toFixed(2)} €. La meilleure sélection trouvée est estimée à ${previousTotal.toFixed(2)} €. Tu peux garder cette liste, réduire la durée ou augmenter le budget.`);
      }
      setItems(finalItems);
    }catch(e:any){
      setError(e?.message||"Impossible de générer la liste.");
    }finally{
      timers.forEach(clearTimeout); setGenStage(5);
      window.setTimeout(()=>setStep('list'),450);
    }
  };
  const totalKnown = useMemo(
    () => items.reduce((sum, item) => sum + (typeof item.price === 'number' ? item.price : 0), 0),
    [items]
  );

  const grouped = useMemo(
    () => CATEGORIES
      .map(category => ({
        category,
        items: items.filter(item => item.category === category)
      }))
      .filter(group => group.items.length > 0),
    [items]
  );

  const progress = items.length
    ? Math.round((items.filter(item => item.checked).length / items.length) * 100)
    : 0;

  const back=()=>{
    const previous:Partial<Record<Step,Step>> = {
      setup:'mode', budget:'setup', prefs:'budget', review:'prefs', list:'review'
    };
    if(step==='mode') navigate(-1);
    else if(previous[step]) setStep(previous[step]!);
  };

  return <div className="qg">
    <style>{`
      *{box-sizing:border-box}body{margin:0;background:#F7F8F2}
      button,input,textarea{font:inherit}
      .qg{min-height:100dvh;background:#F7F8F2;color:#0E100F;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}
      .head{position:sticky;top:0;z-index:30;background:rgba(247,248,242,.96);backdrop-filter:blur(18px);border-bottom:1px solid #E6E8E1}
      .headin,.main{max-width:430px;margin:auto}.headin{padding:15px 18px 12px}.main{padding:22px 20px 112px}
      .top{display:grid;grid-template-columns:44px 1fr 44px;align-items:center}.back,.nox{width:42px;height:42px;border-radius:14px;border:1px solid #E2E5DE;background:#fff}
      .back{font-size:27px}.nox{display:grid;place-items:center;background:#0E100F;color:#c8ff00;border-color:#0E100F;font-size:13px;font-weight:950}
      .title{text-align:center;font-size:17px;font-weight:900}.subtitle{text-align:center;color:#8B908B;font-size:10px;margin-top:2px}
      .progressTop{display:flex;justify-content:space-between;align-items:center;margin:4px 0 10px;color:#8B908B;font-size:10px;font-weight:800}
      .progressTrack{height:5px;border-radius:99px;background:#E5E7E0;overflow:hidden;margin-bottom:28px}.progressFill{height:100%;background:#0E100F;border-radius:99px;transition:.25s}
      .eyebrow{font-size:10px;font-weight:950;letter-spacing:.12em;color:#7B9D17;margin-bottom:8px}
      h1{font-size:31px;line-height:1.03;letter-spacing:-.045em;margin:0 0 9px}.lead{font-size:13px;line-height:1.5;color:#777D78;margin:0 0 26px}
      .choiceGrid{display:grid;gap:11px}.choice{width:100%;border:1px solid #E1E4DD;background:#fff;border-radius:22px;padding:19px;text-align:left;min-height:126px;position:relative}
      .choice.on{border:2px solid #A7D72E;background:#F7FFE5}.choiceIcon{width:42px;height:42px;border-radius:13px;background:#F1F4EC;display:grid;place-items:center;font-size:19px;margin-bottom:17px}.choice.on .choiceIcon{background:#EAFEAD}
      .choice b{display:block;font-size:18px;margin-bottom:6px}.choice span{font-size:11px;color:#7E837E;line-height:1.45}.tick{position:absolute;right:15px;top:15px;width:25px;height:25px;border-radius:50%;background:#0E100F;color:#c8ff00;display:grid;place-items:center;font-size:12px}
      .card{background:#fff;border:1px solid #E1E4DD;border-radius:22px;padding:18px;margin-bottom:12px}.label{font-size:10px;font-weight:950;letter-spacing:.03em;margin-bottom:10px}
      .dayGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.day{border:1px solid #E1E4DD;background:#fff;border-radius:15px;padding:15px 8px;font-weight:900}.day.on{background:#0E100F;color:#c8ff00;border-color:#0E100F}
      .people{height:70px;background:#F7F8F4;border-radius:17px;display:grid;grid-template-columns:52px 1fr 52px;align-items:center;text-align:center}.round{width:42px;height:42px;margin:auto;border:1px solid #E1E4DD;border-radius:13px;background:#fff;font-size:22px}.people strong{font-size:25px}
      .money{position:relative}.money input,.input{width:100%;border:1px solid #E1E4DD;background:#fff;border-radius:18px;padding:17px;outline:0;font-size:16px}.money input{padding-right:50px;font-size:27px;font-weight:900}.money span{position:absolute;right:19px;top:18px;font-size:24px;font-weight:900}
      .budgetHints{display:flex;gap:7px;margin-top:10px}.budgetHints button{border:1px solid #E1E4DD;background:#fff;border-radius:999px;padding:8px 13px;font-size:10px;font-weight:850}.budgetHints button.on{background:#0E100F;color:#c8ff00;border-color:#0E100F}
      .search{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #E1E4DD;border-radius:15px;padding:0 13px;height:47px;margin-bottom:13px}.search input{width:100%;border:0;outline:0;background:transparent}
      .storeGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.storeTile{height:105px;border:1px solid #E1E4DD;background:#fff;border-radius:17px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;position:relative}.storeTile.on{border:2px solid #A7D72E;background:#FBFFF1}.brand{width:43px;height:43px;border-radius:12px;background:#F5F6F2;display:grid;place-items:center;font-size:18px;font-weight:950}.storeTile b{font-size:9px}
      .chips{display:flex;gap:7px;flex-wrap:wrap}.chip{border:1px solid #E1E4DD;background:#fff;border-radius:999px;padding:9px 11px;font-size:10px;font-weight:800}.chip.on{background:#0E100F;color:#c8ff00;border-color:#0E100F}
      textarea.input{min-height:86px;resize:vertical}.profileBox{background:#101210;color:#fff;border-radius:20px;padding:17px;margin-bottom:13px}.profileBox small{color:#9DA19D}.profileBox b{color:#c8ff00}
      .review{background:#fff;border:1px solid #E1E4DD;border-radius:21px;padding:5px 17px}.reviewRow{display:flex;justify-content:space-between;gap:16px;padding:14px 0;border-bottom:1px solid #ECEEE8;font-size:11px}.reviewRow:last-child{border:0}.reviewRow span{color:#818681}.reviewRow b{text-align:right}
      .footer{position:fixed;left:0;right:0;bottom:0;z-index:25;padding:12px 20px max(12px,env(safe-area-inset-bottom));background:linear-gradient(180deg,rgba(247,248,242,0),#F7F8F2 26%)}
      .footerIn{max-width:390px;margin:auto;display:flex;gap:9px}.primary,.secondary{height:55px;border-radius:17px;font-weight:950;font-size:12px}.primary{border:0;background:#0E100F;color:#c8ff00;flex:1}.primary:disabled{opacity:.35}.secondary{width:55px;border:1px solid #E1E4DD;background:#fff}
      .gen{min-height:67vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}.genIcon{width:112px;height:112px;border-radius:50%;background:#E9FFC4;display:grid;place-items:center;font-size:44px;margin-bottom:22px}.gen h1{font-size:25px}.genRows{width:100%;margin-top:18px;text-align:left}.genRow{padding:9px 0;color:#8B908B;font-size:11px}.genRow.done{color:#0E100F;font-weight:800}.genBar{width:100%;height:7px;background:#E2E5DE;border-radius:99px;overflow:hidden;margin-top:16px}.genBar div{height:100%;background:#A7D72E}
      .success,.warning{border-radius:17px;padding:14px;margin-bottom:16px;font-size:11px}.success{background:#EEFFE5;border:1px solid #D3EFC4}.warning{background:#FFF8E8;border:1px solid #EED49B;color:#765820}
      .budgetAlert{background:#FFF3F1;border:1px solid #F0C3BC;border-radius:20px;padding:16px;margin-bottom:16px}.budgetAlertTop{display:flex;gap:11px;align-items:flex-start}.budgetX{width:28px;height:28px;flex:0 0 28px;border-radius:50%;background:#D94B3D;color:#fff;display:grid;place-items:center;font-weight:950}.budgetAlert b{font-size:12px}.budgetAlert p{font-size:10px;line-height:1.5;color:#765B56;margin:5px 0 0}.budgetActions{display:grid;gap:7px;margin-top:13px}.budgetActions button{min-height:43px;border-radius:13px;border:1px solid #E2C8C3;background:#fff;color:#0E100F;font-size:10px;font-weight:900}.budgetActions button:first-child{background:#0E100F;color:#c8ff00;border-color:#0E100F}
      .listTitle{font-size:27px;font-weight:950}.listMeta{color:#7E837E;font-size:10px;margin:4px 0 14px}.catTabs{display:flex;gap:7px;overflow:auto;scrollbar-width:none;margin-bottom:15px}.catTabs button{white-space:nowrap;border:1px solid #E1E4DD;background:#fff;border-radius:999px;padding:9px 12px;font-size:9px}.catTabs button.on{background:#0E100F;color:#fff}
      .group{margin:15px 0}.groupHead{display:flex;align-items:center;margin-bottom:8px}.groupHead b{font-size:14px}.groupHead span{margin-left:auto;color:#8B908B;font-size:9px}.items{background:#fff;border:1px solid #E7E9E3;border-radius:17px;overflow:hidden}.item{width:100%;display:grid;grid-template-columns:1fr auto 22px;gap:9px;align-items:center;text-align:left;border:0;border-bottom:1px solid #ECEEE8;background:#fff;padding:12px}.item:last-child{border-bottom:0}.foodImg{width:46px;height:46px;border-radius:12px;background:#F4F5F1;object-fit:contain;display:block}.foodImgEmpty{width:46px;height:46px;border-radius:12px;background:#F4F5F1}.item em{display:block;color:#789315;font-size:8px;font-style:normal;font-weight:800;margin-top:4px}.item b{font-size:11px}.item small{display:block;color:#8B908B;font-size:9px;margin-top:2px}.price{font-size:9px;font-weight:900}.check{width:20px;height:20px;border:1.5px solid #AEB3AE;border-radius:6px;display:grid;place-items:center}.check.y{background:#c8ff00;border-color:#0E100F}
    `}</style>

    <header className="head"><div className="headin"><div className="top">
      <button className="back" onClick={back}>‹</button>
      <div><div className="title">Course rapide</div><div className="subtitle">Ta liste adaptée par NOXAI</div></div>
      <div className="nox">NOX</div>
    </div></div></header>

    <main className="main">
      {!['generating','list'].includes(step)&&<>
        <div className="progressTop"><span>COURSES NOXAI</span><span>{({mode:1,setup:2,budget:3,prefs:4,review:5} as any)[step]} / 5</span></div>
        <div className="progressTrack"><div className="progressFill" style={{width:`${((({mode:1,setup:2,budget:3,prefs:4,review:5} as any)[step]||1)/5)*100}%`}}/></div>
      </>}

      {step==='mode'&&<>
        <div className="eyebrow">ÉTAPE 1</div><h1>On part de quoi ?</h1>
        <p className="lead">Dis à NOX si tu pars de zéro ou si tu veux simplement compléter ce que tu as déjà.</p>
        <div className="choiceGrid">
          <button className={`choice ${mode==='empty'?'on':''}`} onClick={()=>setMode('empty')}><span className="choiceIcon">○</span>{mode==='empty'&&<i className="tick">✓</i>}<b>Frigo vide</b><span>Créer toutes les courses nécessaires pour les prochains jours.</span></button>
          <button className={`choice ${mode==='complete'?'on':''}`} onClick={()=>setMode('complete')}><span className="choiceIcon">＋</span>{mode==='complete'&&<i className="tick">✓</i>}<b>Compléter mon frigo</b><span>Tenir compte de ce que tu as déjà et acheter uniquement ce qui manque.</span></button>
        </div>
        {mode==='complete'&&<div className="card" style={{marginTop:12}}><div className="label">CE QUE TU AS DÉJÀ</div><textarea className="input" value={fridgeText} onChange={e=>setFridgeText(e.target.value)} placeholder="Ex. 6 œufs, riz, tomates, yaourts…"/></div>}
        <div className="profileBox" style={{marginTop:13}}><small>Profil NOX utilisé automatiquement</small><div style={{marginTop:7}}><b>{goal}</b> · {diet}</div></div>
        <Footer next={()=>setStep('setup')} label="CONTINUER"/>
      </>}

      {step==='setup'&&<>
        <div className="eyebrow">ÉTAPE 2</div><h1>Pour combien ?</h1><p className="lead">NOX ajuste les quantités selon la durée et le nombre de personnes.</p>
        <div className="card"><div className="label">DURÉE</div><div className="dayGrid">{[3,5,7].map(d=><button key={d} className={`day ${days===d?'on':''}`} onClick={()=>setDays(d)}>{d} jours</button>)}</div></div>
        <div className="card"><div className="label">PERSONNES</div><div className="people"><button className="round" onClick={()=>setPeople(Math.max(1,people-1))}>−</button><strong>{people}</strong><button className="round" onClick={()=>setPeople(Math.min(10,people+1))}>+</button></div></div>
        <Footer next={()=>setStep('budget')} label="CONTINUER"/>
      </>}

      {step==='budget'&&<>
        <div className="eyebrow">ÉTAPE 3</div><h1>Ton budget maximum</h1><p className="lead">Indique l’enveloppe à ne pas dépasser. NOX cherchera la liste la plus cohérente avec ce montant.</p>
        <div className="card"><div className="label">BUDGET POUR {days} JOURS</div><div className="money"><input type="text" inputMode="decimal" autoComplete="off" value={budget} onChange={e=>setBudget(e.currentTarget.value.replace(/[^0-9,.]/g,''))} onInput={e=>setBudget((e.currentTarget as HTMLInputElement).value.replace(/[^0-9,.]/g,''))} placeholder="50"/><span>€</span></div><div className="budgetHints">{[20,40,60,80].map(v=><button type="button" key={v} className={budgetNumber===v?'on':''} onClick={()=>setBudget(String(v))}>{v} €</button>)}</div></div>
        <p className="lead" style={{fontSize:11}}>Les prix affichés sont des estimations NOXAI utilisées pour construire une liste cohérente sans dépasser ton budget.</p>
        <Footer next={()=>setStep('prefs')} label="CONTINUER" disabled={!canContinueSetup}/>
      </>}

      {step==='prefs'&&<>
        <div className="eyebrow">ÉTAPE 4</div><h1>Tes préférences</h1><p className="lead">On exclut ce qui ne te convient pas et on privilégie les aliments que tu apprécies.</p>
        <div className="card"><div className="label">ALLERGIES ET INTOLÉRANCES</div><div className="chips">{ALLERGIES.map(a=><button key={a} className={`chip ${allergies.includes(a)?'on':''}`} onClick={()=>toggleAllergy(a)}>{allergies.includes(a)?'✓ ':''}{a}</button>)}</div><input className="input" style={{marginTop:12}} value={otherAllergy} onChange={e=>setOtherAllergy(e.target.value)} placeholder="Autre allergie…"/></div>
        <div className="card"><div className="label">ALIMENTS AIMÉS</div><input className="input" value={likes} onChange={e=>setLikes(e.target.value)} placeholder="Poulet, riz, tomates…"/></div>
        <div className="card"><div className="label">ALIMENTS REFUSÉS</div><input className="input" value={dislikes} onChange={e=>setDislikes(e.target.value)} placeholder="Poisson…"/></div>
        <Footer next={()=>setStep('review')} label="VOIR LE RÉCAPITULATIF"/>
      </>}

      {step==='review'&&<>
        <div className="eyebrow">ÉTAPE 5</div><h1>Tout est prêt</h1><p className="lead">Vérifie les informations utilisées par NOX avant de générer ta liste.</p>
        <div className="review">
          <Row l="Mode" v={mode==='empty'?'Frigo vide':'Compléter mon frigo'}/><Row l="Durée" v={`${days} jours`}/><Row l="Personnes" v={String(people)}/><Row l="Budget maximum" v={`${budgetNumber.toFixed(2)} €`}/><Row l="Objectif NOX" v={goal}/><Row l="Régime" v={diet}/><Row l="Allergies" v={allAllergies.join(', ')||'Aucune'}/>
        </div>
        <Footer next={generate} label="✦  GÉNÉRER MA LISTE"/>
      </>}

      {step==='generating'&&<div className="gen"><div className="genIcon">✦</div><h1>NOX prépare ta liste…</h1><p className="lead" style={{textAlign:'center'}}>Analyse de ton profil, de ton budget et de tes préférences.</p><div className="genRows">{['Analyse du profil NOX','Calcul des quantités','Vérification des contraintes','Optimisation du budget','Finalisation'].map((x,i)=><div key={x} className={`genRow ${genStage>i?'done':''}`}>{genStage>i?'✓':'○'} &nbsp; {x}</div>)}</div><div className="genBar"><div style={{width:`${Math.min(100,genStage*20)}%`}}/></div></div>}

      {step==='list'&&<>
        {error?<div className="warning"><b>La liste n’a pas pu être générée.</b><br/>{error}</div>:budgetNotice?<div className="budgetAlert"><div className="budgetAlertTop"><span className="budgetX">×</span><div><b>Budget très serré</b><p>{budgetNotice}</p></div></div><div className="budgetActions"><button onClick={()=>setBudget(String(Math.ceil(totalKnown)))}>UTILISER LE BUDGET NÉCESSAIRE · {Math.ceil(totalKnown)} €</button>{days>3&&<button onClick={()=>{setDays(days===7?5:3);setStep('review');}}>RÉDUIRE LA DURÉE · {days===7?5:3} JOURS</button>}<button onClick={()=>setStep('budget')}>MODIFIER MON BUDGET</button></div></div>:<div className="success"><b>✓ Liste générée</b><br/>{days} jours · {people} personne{people>1?'s':''}</div>}
        <div className="listTitle">Ma liste de courses</div><div className="listMeta">{items.length} produits · total estimé ≈ {totalKnown.toFixed(2)} € · budget {budgetNumber.toFixed(2)} €</div>
        <div className="catTabs"><button className={activeCategory==='Tous'?'on':''} onClick={()=>setActiveCategory('Tous')}>Tous ({items.length})</button>{grouped.map(g=><button key={g.category} className={activeCategory===g.category?'on':''} onClick={()=>setActiveCategory(g.category)}>{g.category} ({g.items.length})</button>)}</div>
        {grouped.filter(g=>activeCategory==='Tous'||g.category===activeCategory).map(g=><div className="group" key={g.category}><div className="groupHead"><b>{g.category}</b><span>{g.items.length} produits</span></div><div className="items">{g.items.map(it=><button className="item" key={it.id} onClick={()=>setItems(xs=>xs.map(x=>x.id===it.id?{...x,checked:!x.checked}:x))}><span><b style={{textDecoration:it.checked?'line-through':'none'}}>{it.name}</b><small>{it.qty}{it.note?` · ${it.note}`:''}</small></span><span className="price">{typeof it.price==='number'?`≈ ${it.price.toFixed(2)} €`:'—'}</span><span className={`check ${it.checked?'y':''}`}>{it.checked?'✓':''}</span></button>)}</div></div>)}
        <div className="footer"><div className="footerIn"><button className="secondary" onClick={()=>setStep('review')}>‹</button><button className="primary" onClick={()=>navigate('/fuel')}>{progress===100?'TERMINÉ ✓':`${progress}% COCHÉ`}</button></div></div>
      </>}
    </main>
  </div>;
}

function Row({l,v}:{l:string;v:string}){return <div className="reviewRow"><span>{l}</span><b>{v}</b></div>}
function Footer({next,label,disabled=false}:{next:()=>void;label:string;disabled?:boolean}){
  return <div className="footer"><div className="footerIn"><button className="primary" disabled={disabled} onClick={next}>{label}</button></div></div>;
}
