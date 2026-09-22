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
type Step = 'mode' | 'setup' | 'budget' | 'store' | 'prefs' | 'review' | 'generating' | 'list';
type Store = { chain:string; city:string };
type Profile = { goal_type?:string; diet_preferences?:string[] };
type Target = { calories?:number; protein_g?:number; carbs_g?:number; fat_g?:number };
type GroceryItem = { id:string; name:string; qty:string; category:string; note?:string; checked?:boolean; price?:number|null; priceSource?:string; imageUrl?:string; barcode?:string; brand?:string; priceDate?:string };

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


const norm=(v:string)=>v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();

const importantWords=(v:string)=>norm(v).split(' ').filter(w=>w.length>2&&!['frais','fraiche','frais','complet','completes','bio'].includes(w));

async function findProduct(name:string){
  try{
    const wanted=importantWords(name);
    const u=`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(name)}&search_simple=1&action=process&json=1&page_size=20&fields=code,product_name,generic_name,brands,image_url,image_front_small_url`;
    const r=await fetch(u); if(!r.ok)return null;
    const d=await r.json(), ps=Array.isArray(d?.products)?d.products:[];
    const ranked=ps.filter((p:any)=>p?.code).map((p:any)=>{
      const label=norm(`${p.product_name||''} ${p.generic_name||''}`);
      const matched=wanted.filter(w=>label.includes(w)).length;
      const coverage=wanted.length?matched/wanted.length:0;
      return {p,coverage};
    }).filter((x:any)=>x.coverage>=0.8).sort((a:any,b:any)=>b.coverage-a.coverage);
    const p=ranked[0]?.p; if(!p)return null;
    return {
      barcode:String(p.code),
      imageUrl:String(p.image_front_small_url||p.image_url||''),
      brand:String(p.brands||'')
    };
  }catch{return null}
}

const sameChain=(chain:string, location:any)=>{
  const wanted=norm(chain.replace('Carrefour Market','Carrefour').replace('E.Leclerc','Leclerc'));
  const hay=norm(`${location?.osm_brand||''} ${location?.osm_name||''} ${location?.osm_display_name||''}`);
  if(wanted==='carrefour') return hay.includes('carrefour');
  if(wanted==='leclerc') return hay.includes('leclerc');
  if(wanted==='super u') return hay.includes('super u')||hay.includes('hyper u')||hay.includes('u express');
  return hay.includes(wanted);
};

async function findPrice(barcode:string,chain:string,city:string){
  try{
    const r=await fetch(`https://prices.openfoodfacts.org/api/v1/prices?product_code=${encodeURIComponent(barcode)}&size=100&order_by=-date`);
    if(!r.ok)return null;
    const d=await r.json();
    const rows=Array.isArray(d?.items)?d.items:[];
    const valid=rows.filter((x:any)=>typeof x?.price==='number'&&String(x?.currency||'EUR')==='EUR'&&sameChain(chain,x?.location||{}));
    if(!valid.length)return null;

    // La ville est prioritaire, mais on ne jette plus tous les prix de l'enseigne
    // si Open Prices n'a pas encore de relevé dans cette ville.
    const cityN=norm(city);
    const local=cityN?valid.filter((x:any)=>{
      const l=x?.location||{};
      return norm(`${l.osm_address_city||''} ${l.osm_display_name||''}`).includes(cityN);
    }):[];
    const hit=(local.length?local:valid)[0];

    return {
      price:Number(hit.price),
      priceSource:local.length?'Open Prices · magasin local':'Open Prices · enseigne',
      priceDate:String(hit.date||'')
    };
  }catch{return null}
}

async function findPriceByName(name:string,chain:string,city:string){
  try{
    // Secours: cherche dans les prix récents de l'enseigne quand le code-barres
    // choisi par Open Food Facts n'a aucun relevé de prix.
    const r=await fetch(`https://prices.openfoodfacts.org/api/v1/prices?size=100&order_by=-date`);
    if(!r.ok)return null;
    const d=await r.json(), rows=Array.isArray(d?.items)?d.items:[];
    const wanted=importantWords(name);
    const candidates=rows.filter((x:any)=>{
      if(typeof x?.price!=='number'||String(x?.currency||'EUR')!=='EUR'||!sameChain(chain,x?.location||{})) return false;
      const label=norm(`${x?.product_name||''} ${x?.product?.product_name||''}`);
      const matched=wanted.filter(w=>label.includes(w)).length;
      return wanted.length>0 && matched/wanted.length>=0.8;
    });
    if(!candidates.length)return null;
    const cityN=norm(city);
    const local=cityN?candidates.filter((x:any)=>norm(`${x?.location?.osm_address_city||''} ${x?.location?.osm_display_name||''}`).includes(cityN)):[];
    const hit=(local.length?local:candidates)[0];
    return {
      price:Number(hit.price),
      priceSource:local.length?'Open Prices · magasin local':'Open Prices · enseigne',
      priceDate:String(hit.date||''),
      barcode:String(hit.product_code||hit?.product?.code||''),
      imageUrl:String(hit?.product?.image_url||''),
      brand:String(hit?.product?.brands||'')
    };
  }catch{return null}
}

async function enrich(items:GroceryItem[],chain:string,city:string){
  const out:GroceryItem[]=[];
  for(let i=0;i<items.length;i+=4){
    const batch=await Promise.all(items.slice(i,i+4).map(async it=>{
      const p=await findProduct(it.name);
      let pr=p?.barcode?await findPrice(p.barcode,chain,city):null;
      if(!pr) pr=await findPriceByName(it.name,chain,city);
      return {
        ...it,
        barcode:pr?.barcode||p?.barcode,
        imageUrl:p?.imageUrl||pr?.imageUrl||'',
        brand:p?.brand||pr?.brand||'',
        price:pr?.price??null,
        priceSource:pr?.priceSource,
        priceDate:pr?.priceDate
      };
    }));
    out.push(...batch);
  }
  return out;
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
      setItems(await enrich(clean,store.chain,store.city));
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
    const previous:Partial<Record<Step,Step>> = {
      setup:'mode', budget:'setup', store:'budget', prefs:'store', review:'prefs', list:'review'
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
      .listTitle{font-size:27px;font-weight:950}.listMeta{color:#7E837E;font-size:10px;margin:4px 0 14px}.catTabs{display:flex;gap:7px;overflow:auto;scrollbar-width:none;margin-bottom:15px}.catTabs button{white-space:nowrap;border:1px solid #E1E4DD;background:#fff;border-radius:999px;padding:9px 12px;font-size:9px}.catTabs button.on{background:#0E100F;color:#fff}
      .group{margin:15px 0}.groupHead{display:flex;align-items:center;margin-bottom:8px}.groupHead b{font-size:14px}.groupHead span{margin-left:auto;color:#8B908B;font-size:9px}.items{background:#fff;border:1px solid #E7E9E3;border-radius:17px;overflow:hidden}.item{width:100%;display:grid;grid-template-columns:48px 1fr auto 22px;gap:9px;align-items:center;text-align:left;border:0;border-bottom:1px solid #ECEEE8;background:#fff;padding:12px}.item:last-child{border-bottom:0}.foodImg,.foodFallback{width:46px;height:46px;border-radius:12px;background:#F4F5F1;object-fit:contain}.foodFallback{display:grid;place-items:center;font-size:8px;font-weight:950;color:#9A9F99}.item em{display:block;color:#789315;font-size:8px;font-style:normal;font-weight:800;margin-top:4px}.item b{font-size:11px}.item small{display:block;color:#8B908B;font-size:9px;margin-top:2px}.price{font-size:9px;font-weight:900}.check{width:20px;height:20px;border:1.5px solid #AEB3AE;border-radius:6px;display:grid;place-items:center}.check.y{background:#c8ff00;border-color:#0E100F}
    `}</style>

    <header className="head"><div className="headin"><div className="top">
      <button className="back" onClick={back}>‹</button>
      <div><div className="title">Course rapide</div><div className="subtitle">Ta liste adaptée par NOXAI</div></div>
      <div className="nox">NOX</div>
    </div></div></header>

    <main className="main">
      {!['generating','list'].includes(step)&&<>
        <div className="progressTop"><span>COURSES NOXAI</span><span>{({mode:1,setup:2,budget:3,store:4,prefs:5,review:6} as any)[step]} / 6</span></div>
        <div className="progressTrack"><div className="progressFill" style={{width:`${((({mode:1,setup:2,budget:3,store:4,prefs:5,review:6} as any)[step]||1)/6)*100}%`}}/></div>
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
        <p className="lead" style={{fontSize:11}}>Les prix ne seront jamais inventés. Lorsqu’aucune source magasin fiable n’est disponible, NOX affiche « prix indisponible ».</p>
        <Footer next={()=>setStep('store')} label="CONTINUER" disabled={!canContinueSetup}/>
      </>}

      {step==='store'&&<>
        <div className="eyebrow">ÉTAPE 4</div><h1>Où fais-tu tes courses ?</h1><p className="lead">Choisis ton enseigne. La ville permet de mieux cibler les données magasin lorsqu’elles sont disponibles.</p>
        <div className="search"><span>⌕</span><input value={storeSearch} onChange={e=>setStoreSearch(e.target.value)} placeholder="Rechercher une enseigne…"/></div>
        <div className="storeGrid">{filteredStores.map(s=><button key={s.name} className={`storeTile ${store.chain===s.name?'on':''}`} onClick={()=>setStore(p=>({...p,chain:s.name}))}>{store.chain===s.name&&<i className="tick">✓</i>}<span className="brand" style={{color:s.brand}}>{s.mark}</span><b>{s.name}</b></button>)}</div>
        <div className="card" style={{marginTop:12}}><div className="label">VILLE / ZONE</div><input className="input" value={store.city} onChange={e=>setStore(p=>({...p,city:e.target.value}))} placeholder="Ex. Paris 15e, Nancy…"/></div>
        <Footer next={()=>setStep('prefs')} label="CONTINUER"/>
      </>}

      {step==='prefs'&&<>
        <div className="eyebrow">ÉTAPE 5</div><h1>Tes préférences</h1><p className="lead">On exclut ce qui ne te convient pas et on privilégie les aliments que tu apprécies.</p>
        <div className="card"><div className="label">ALLERGIES ET INTOLÉRANCES</div><div className="chips">{ALLERGIES.map(a=><button key={a} className={`chip ${allergies.includes(a)?'on':''}`} onClick={()=>toggleAllergy(a)}>{allergies.includes(a)?'✓ ':''}{a}</button>)}</div><input className="input" style={{marginTop:12}} value={otherAllergy} onChange={e=>setOtherAllergy(e.target.value)} placeholder="Autre allergie…"/></div>
        <div className="card"><div className="label">ALIMENTS AIMÉS</div><input className="input" value={likes} onChange={e=>setLikes(e.target.value)} placeholder="Poulet, riz, tomates…"/></div>
        <div className="card"><div className="label">ALIMENTS REFUSÉS</div><input className="input" value={dislikes} onChange={e=>setDislikes(e.target.value)} placeholder="Poisson…"/></div>
        <Footer next={()=>setStep('review')} label="VOIR LE RÉCAPITULATIF"/>
      </>}

      {step==='review'&&<>
        <div className="eyebrow">ÉTAPE 6</div><h1>Tout est prêt</h1><p className="lead">Vérifie les informations utilisées par NOX avant de générer ta liste.</p>
        <div className="review">
          <Row l="Mode" v={mode==='empty'?'Frigo vide':'Compléter mon frigo'}/><Row l="Durée" v={`${days} jours`}/><Row l="Personnes" v={String(people)}/><Row l="Budget maximum" v={`${budgetNumber.toFixed(2)} €`}/><Row l="Magasin" v={`${store.chain}${store.city?` · ${store.city}`:''}`}/><Row l="Objectif NOX" v={goal}/><Row l="Régime" v={diet}/><Row l="Allergies" v={allAllergies.join(', ')||'Aucune'}/>
        </div>
        <Footer next={generate} label="✦  GÉNÉRER MA LISTE"/>
      </>}

      {step==='generating'&&<div className="gen"><div className="genIcon">✦</div><h1>NOX prépare ta liste…</h1><p className="lead" style={{textAlign:'center'}}>Analyse de ton profil, de ton budget et de tes préférences.</p><div className="genRows">{['Analyse du profil NOX','Calcul des quantités','Vérification des contraintes','Optimisation du budget','Finalisation'].map((x,i)=><div key={x} className={`genRow ${genStage>i?'done':''}`}>{genStage>i?'✓':'○'} &nbsp; {x}</div>)}</div><div className="genBar"><div style={{width:`${Math.min(100,genStage*20)}%`}}/></div></div>}

      {step==='list'&&<>
        {!error?<div className="success"><b>✓ Liste générée</b><br/>{days} jours · {people} personne{people>1?'s':''} · {store.chain}</div>:<div className="warning"><b>La liste n’a pas pu être générée.</b><br/>{error}</div>}
        <div className="listTitle">Ma liste de courses</div><div className="listMeta">{items.length} produits · {pricedCount?`${pricedCount} prix réels trouvés chez ${store.chain}`:'aucun prix réel trouvé pour ce magasin'}</div>
        <div className="catTabs"><button className={activeCategory==='Tous'?'on':''} onClick={()=>setActiveCategory('Tous')}>Tous ({items.length})</button>{grouped.map(g=><button key={g.category} className={activeCategory===g.category?'on':''} onClick={()=>setActiveCategory(g.category)}>{g.category} ({g.items.length})</button>)}</div>
        {grouped.filter(g=>activeCategory==='Tous'||g.category===activeCategory).map(g=><div className="group" key={g.category}><div className="groupHead"><b>{g.category}</b><span>{g.items.length} produits</span></div><div className="items">{g.items.map(it=><button className="item" key={it.id} onClick={()=>setItems(xs=>xs.map(x=>x.id===it.id?{...x,checked:!x.checked}:x))}>{it.imageUrl?<img className="foodImg" src={it.imageUrl} alt="" loading="lazy"/>:<span className="foodFallback">NOX</span>}<span><b style={{textDecoration:it.checked?'line-through':'none'}}>{it.name}</b><small>{it.qty}{it.brand?` · ${it.brand}`:''}{it.note?` · ${it.note}`:''}</small>{it.priceSource&&<em>Prix relevé · {it.priceSource}{it.priceDate?` · ${it.priceDate}`:''}</em>}</span><span className="price">{typeof it.price==='number'?`${it.price.toFixed(2)} €`:'—'}</span><span className={`check ${it.checked?'y':''}`}>{it.checked?'✓':''}</span></button>)}</div></div>)}
        <div className="footer"><div className="footerIn"><button className="secondary" onClick={()=>setStep('review')}>‹</button><button className="primary" onClick={()=>navigate('/fuel')}>{progress===100?'TERMINÉ ✓':`${progress}% COCHÉ`}</button></div></div>
      </>}
    </main>
  </div>;
}

function Row({l,v}:{l:string;v:string}){return <div className="reviewRow"><span>{l}</span><b>{v}</b></div>}
function Footer({next,label,disabled=false}:{next:()=>void;label:string;disabled?:boolean}){
  return <div className="footer"><div className="footerIn"><button className="primary" disabled={disabled} onClick={next}>{label}</button></div></div>;
}
