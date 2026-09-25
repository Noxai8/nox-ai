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
type Step = 'mode' | 'setup' | 'budget' | 'prefs' | 'review' | 'generating' | 'list' | 'recipes' | 'recipe' | 'shopping' | 'done';
type Profile = { goal_type?:string; diet_preferences?:string[] };
type Target = { calories?:number; protein_g?:number; carbs_g?:number; fat_g?:number };
type GroceryItem = { id:string; name:string; qty:string; category:string; note?:string; checked?:boolean; price?:number|null };
type Recipe = {
  id:string; title:string; description:string; minutes:number; difficulty:string;
  calories:number; protein:number; carbs:number; fat:number;
  ingredients:{name:string; qty:string}[]; steps:string[];
  tip?:string; variation?:string; imageUrl?:string;
  category:'Petit-déjeuner'|'Plat'|'Dessert & collation';
};

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
  const [budget,setBudget] = useState('120');
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
  const [recipes,setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe,setSelectedRecipe] = useState<Recipe|null>(null);
  const [recipesLoading,setRecipesLoading] = useState(false);
  const [recipesError,setRecipesError] = useState('');
  const [activeRecipeCategory,setActiveRecipeCategory] = useState<'Petit-déjeuner'|'Plat'|'Dessert & collation'>('Petit-déjeuner');

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

  const generateRecipeImage=async(recipe:Recipe)=>{
    try{
      const {data,error:invokeError}=await supabase.functions.invoke('generate-recipe-image',{
        body:{
          title:recipe.title,
          description:recipe.description,
          ingredients:recipe.ingredients
        }
      });
      if(invokeError||!data?.imageUrl)return null;
      return String(data.imageUrl);
    }catch{
      return null;
    }
  };

  const generateRecipes=async(list:GroceryItem[]=items)=>{
    if(!list.length)return;
    setRecipesLoading(true); setRecipesError('');
    try{
      const groceryText=list.map(x=>`${x.name} (${x.qty})`).join(', ');
      const fridgeContext=mode==='complete'?(fridgeText.trim()||'aucun aliment renseigné'):'frigo vide';

      const prompt=`Tu es le chef nutrition NOXAI.
Crée un MINI LIVRET DE 15 IDÉES DE RECETTES personnalisées:
- exactement 5 "Petit-déjeuner"
- exactement 5 "Plat"
- exactement 5 "Dessert & collation"

BASE ALIMENTAIRE
COURSES DISPONIBLES:
${groceryText}

CONTENU DU FRIGO DÉCLARÉ PAR L'UTILISATEUR:
${fridgeContext}

Utilise EN PRIORITÉ les courses ET les aliments du frigo. Ne prétends jamais qu'un aliment est disponible s'il n'apparaît ni dans les courses ni dans le frigo. Tu peux seulement ajouter sel, poivre, eau et épices basiques.

PROFIL UTILISATEUR
- Objectif: ${goal}
- Alimentation: ${diet}
- Nombre de personnes: ${people}
- Allergies/intolérances à exclure ABSOLUMENT: ${allAllergies.join(', ')||'aucune'}
- Aliments refusés: ${dislikes||'aucun'}
- Aliments appréciés: ${likes||'non renseigné'}
- Cible quotidienne: ${target.calories||'non renseignée'} kcal
- Protéines quotidiennes: ${target.protein_g||'non renseigné'} g
- Glucides quotidiens: ${target.carbs_g||'non renseigné'} g
- Lipides quotidiens: ${target.fat_g||'non renseigné'} g

SÉCURITÉ ET RÉGIME
Respecte STRICTEMENT le régime alimentaire, les allergies/intolérances et les aliments refusés.
Si le profil est vegan, aucun ingrédient animal.
Si le profil est végétarien, aucune viande ni poisson.
Si le profil est halal, aucun porc et aucun ingrédient explicitement non halal.
Si le profil est sans gluten ou sans lactose, exclure les ingrédients incompatibles.
En cas de doute sur un ingrédient potentiellement allergène ou incompatible, NE L'UTILISE PAS.

OBJECTIF NUTRITIONNEL
Toutes les calories et macros sont PAR PORTION.
Adapte chaque catégorie à l'objectif et aux cibles quotidiennes:
- Petit-déjeuner: rassasiant et cohérent avec la journée, avec protéines/fibres quand possible.
- Plat: repas principal équilibré, avec protéines, fibres/légumes et glucides/lipides adaptés à l'objectif.
- Dessert & collation: portion raisonnable et cohérente avec l'objectif; pas de dessert hypercalorique gratuit.
Pour perte de gras/sèche: satiété, protéines, fibres et densité calorique maîtrisée.
Pour maintien/recomposition: équilibre global et protéines suffisantes.
Pour prise de muscle/force/performance: protéines suffisantes et énergie/glucides adaptés.
Ne mets jamais toute la cible calorique quotidienne dans une seule recette.

RÈGLES
- exactement 15 recettes au total;
- exactement 5 recettes par catégorie;
- catégories autorisées UNIQUEMENT: "Petit-déjeuner", "Plat", "Dessert & collation";
- recettes différentes et réalistes;
- 5 à 35 minutes;
- quantités d'ingrédients pour ${people} personne(s);
- macros estimées réalistes PAR PORTION;
- aucune image, aucune URL;
- retourne UNIQUEMENT un tableau JSON valide, sans markdown.

Format exact:
[{"category":"Petit-déjeuner","title":"...","description":"...","minutes":10,"difficulty":"Facile","calories":400,"protein":25,"carbs":45,"fat":12,"ingredients":[{"name":"...","qty":"..."}],"steps":["..."],"tip":"...","variation":"..."}]`;

      const {data,error:invokeError}=await supabase.functions.invoke('generate-recipes',{body:{prompt}});
      if(invokeError)throw new Error(invokeError.message||'Génération du livret impossible');

      const direct=Array.isArray(data)?data:(Array.isArray(data?.recipes)?data.recipes:null);
      let parsed:any[]=direct||[];
      if(!parsed.length){
        const raw=data?.content?.[0]?.text||data?.data?.content?.[0]?.text||data?.text||data?.result||'';
        const cleaned=String(raw).replace(/```json/gi,'').replace(/```/g,'').trim();
        const a=cleaned.indexOf('['),b=cleaned.lastIndexOf(']');
        if(a<0||b<=a)throw new Error('Réponse livret invalide');
        parsed=JSON.parse(cleaned.slice(a,b+1));
      }

      const allowed=['Petit-déjeuner','Plat','Dessert & collation'] as const;
      const normalizeCategory=(value:any):Recipe['category']=>{
        const v=norm(String(value||''));
        if(v.includes('petit'))return 'Petit-déjeuner';
        if(v.includes('dessert')||v.includes('collation'))return 'Dessert & collation';
        return 'Plat';
      };

      const mapped:Recipe[]=parsed.map((r:any,i:number)=>({
        id:`recipe-${Date.now()}-${i}`,
        category:normalizeCategory(r.category),
        title:String(r.title||`Recette ${i+1}`),
        description:String(r.description||'Une idée NOXAI avec tes ingrédients.'),
        minutes:Number(r.minutes)||20,
        difficulty:String(r.difficulty||'Facile'),
        calories:Number(r.calories)||0,
        protein:Number(r.protein)||0,
        carbs:Number(r.carbs)||0,
        fat:Number(r.fat)||0,
        ingredients:Array.isArray(r.ingredients)?r.ingredients.map((x:any)=>({name:String(x.name||''),qty:String(x.qty||'')})).filter((x:any)=>x.name):[],
        steps:Array.isArray(r.steps)?r.steps.map((x:any)=>String(x)).filter(Boolean):[],
        tip:r.tip?String(r.tip):'Prépare les ingrédients avant de commencer.',
        variation:r.variation?String(r.variation):'Adapte les quantités à ton objectif.'
      }));

      const next:Recipe[]=allowed.flatMap(category=>mapped.filter(r=>r.category===category).slice(0,5));
      if(allowed.some(category=>next.filter(r=>r.category===category).length<5)){
        throw new Error('NOXAI n’a pas reçu 5 idées dans chaque catégorie. Réessaie.');
      }

      // Les 15 recettes sont disponibles immédiatement côté état, puis les images
      // partent en parallèle. Une carte n’apparaît que lorsque SON image est prête.
      setRecipes(next);
      setActiveRecipeCategory('Petit-déjeuner');
      setRecipesLoading(false);

      const IMAGE_CONCURRENCY=3;
      let imageCursor=0;
      let imageFailures=0;

      const imageWorker=async()=>{
        while(true){
          const index=imageCursor++;
          if(index>=next.length)return;

          const recipe=next[index];
          const imageUrl=await generateRecipeImage(recipe);

          if(!imageUrl){
            imageFailures++;
            continue;
          }

          setRecipes(current=>current.map(r=>
            r.id===recipe.id?{...r,imageUrl}:r
          ));
        }
      };

      await Promise.all(
        Array.from(
          {length:Math.min(IMAGE_CONCURRENCY,next.length)},
          ()=>imageWorker()
        )
      );

      if(imageFailures>0){
        setRecipesError(`${imageFailures} photo${imageFailures>1?'s':''} n’a${imageFailures>1?'ont':''} pas pu être générée${imageFailures>1?'s':''}. Tu peux relancer le livret.`);
      }
    }catch(e:any){
      setRecipes([]);
      setRecipesError(e?.message||'Impossible de générer le livret.');
    }finally{
      setRecipesLoading(false);
    }
  };

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

      // Dès que la liste de courses existe, on prépare les recettes en arrière-plan.
      // generateRecipes lance ensuite immédiatement l'image de chaque recette créée.
      void generateRecipes(finalItems);
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
      setup:'mode', budget:'setup', prefs:'budget', review:'prefs', list:'review', recipes:'list', recipe:'recipes', shopping:'list', done:'shopping'
    };
    if(step==='mode') navigate(-1);
    else if(previous[step]) setStep(previous[step]!);
  };

  return <div className={`qg step-${step}`}>
    <style>{`
      *{box-sizing:border-box}body{margin:0;background:#F7F8F2}
      button,input,textarea{font:inherit}
      .qg{min-height:100dvh;background:#F7F8F2;color:#0E100F;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}
      .head{position:sticky;top:0;z-index:30;background:rgba(247,248,242,.96);backdrop-filter:blur(18px);border-bottom:1px solid #E6E8E1}
      .headin,.main{max-width:430px;margin:auto}.headin{padding:15px 18px 12px}.main{padding:22px 20px 112px}

      /* ÉCRAN 1 DESKTOP — vraie largeur de la maquette */
      @media(min-width:700px){
        .step-mode .headin{max-width:760px;padding:17px 24px 14px}
        .step-mode .main{max-width:760px;padding:30px 24px 130px}
        .step-mode .modeProgress{margin:2px 0 46px}
        .step-mode .modeIntro{margin-bottom:36px}
        .step-mode .modeIntro h1{font-size:48px}
        .step-mode .modeIntro p{max-width:500px;font-size:16px}
        .step-mode .modeChoices{grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
        .step-mode .modeCard{
          min-height:310px;
          padding:20px;
          grid-template-columns:1fr;
          grid-template-rows:150px auto;
          gap:18px;
          align-items:start
        }
        .step-mode .modeVisual{height:150px}
        .step-mode .modeCopy{padding:0 34px 0 2px}
        .step-mode .modeCopy strong{font-size:24px}
        .step-mode .modeCopy .modeSub{font-size:16px}
        .step-mode .modeCopy p{font-size:12px;max-width:270px}
        .step-mode .modeBenefit{font-size:9px}
        .step-mode .profileHint{margin:28px 0 10px}
        .step-mode .fridgeEntry{max-width:100%;margin-top:18px}
        .step-mode .footerIn{max-width:712px}
        .step-mode .modeFooter .primary{height:62px}
      }
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

      .budgetHero{background:#EAF7E5;border:1px solid #D5EAD0;border-radius:20px;padding:16px;margin-bottom:17px}.budgetHeroTop{display:flex;justify-content:space-between;align-items:end}.budgetHero strong{font-size:28px}.budgetHero small{font-size:9px;color:#687268}.budgetLine{height:7px;background:#D7E3D4;border-radius:99px;margin-top:11px;overflow:hidden}.budgetLine div{height:100%;background:#64B846;border-radius:99px}
      .actions{display:grid;gap:9px;margin:18px 0}.actionMain,.actionAlt{min-height:53px;border-radius:16px;font-weight:950;font-size:11px}.actionMain{border:0;background:#0E100F;color:#c8ff00}.actionAlt{border:1px solid #DDE1DA;background:#fff;color:#0E100F}
      .recipeBookTabs{display:flex;gap:7px;overflow-x:auto;margin:16px 0 18px;padding-bottom:3px}.recipeBookTabs button{white-space:nowrap;border:1px solid #DDE1DA;background:#fff;border-radius:999px;padding:10px 13px;font-size:9px;font-weight:900;color:#656B66}.recipeBookTabs button.on{background:#0E100F;color:#fff;border-color:#0E100F}.recipeGrid{display:grid;gap:14px}.recipeCard{border:1px solid #E1E4DD;background:#fff;border-radius:22px;overflow:hidden;text-align:left;padding:0;box-shadow:0 8px 28px rgba(14,16,15,.035)}.recipeVisual{height:155px;background:radial-gradient(circle at 30% 30%,#55734A 0,#263824 36%,#111712 100%);position:relative;overflow:hidden}.recipeVisual.empty:before{content:'✦';position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:52px;color:#c8ff00}.recipeVisual.empty:after{content:'IMAGE EN PRÉPARATION';position:absolute;bottom:12px;left:14px;color:#fff;font-size:8px;font-weight:900;letter-spacing:.12em;background:rgba(0,0,0,.38);padding:7px 9px;border-radius:999px}.recipeVisual img{width:100%;height:100%;display:block;object-fit:cover}.recipeBody{padding:15px}.recipeBody b{font-size:16px}.recipeBody p{font-size:10px;color:#777D78;line-height:1.45;margin:6px 0 11px}.recipeMeta{display:flex;gap:6px;flex-wrap:wrap}.recipeMeta span{background:#F3F5F0;border-radius:9px;padding:7px 9px;font-size:8px;font-weight:850}
      .recipeDetail{margin:-6px 0 0}.dishPhoto{height:270px;border-radius:24px;background:radial-gradient(circle at 35% 28%,#5E7D50 0,#314A2B 35%,#151C16 72%);position:relative;overflow:hidden;box-shadow:0 14px 38px rgba(14,16,15,.10);display:grid;place-items:center}.dishPhoto.empty:before{content:'✦';font-size:76px;font-weight:950;color:#c8ff00}.dishPhoto.empty:after{content:'IMAGE EN PRÉPARATION';position:absolute;left:18px;top:18px;color:#fff;font-size:9px;font-weight:900;letter-spacing:.12em;background:rgba(0,0,0,.45);padding:8px 11px;border-radius:999px}.dishPhoto img{width:100%;height:100%;display:block;object-fit:cover}.dishBadges{position:absolute;left:14px;right:14px;bottom:14px;display:flex;gap:7px;z-index:2}.dishBadges span{background:rgba(20,20,20,.72);color:#fff;padding:8px 10px;border-radius:10px;font-size:8px;font-weight:850;backdrop-filter:blur(8px)}.recipeTag{display:inline-flex;background:#DFF4D9;color:#26752A;border-radius:999px;padding:7px 11px;font-size:9px;font-weight:950;margin:18px 0 9px}.recipeTitle{font-size:34px;line-height:1;letter-spacing:-.05em;margin:0 0 8px}.recipeDesc{font-size:14px;color:#707670;line-height:1.45;margin:0 0 17px}.macroGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:14px 0}.macro{background:#fff;border:1px solid #E3E6DF;border-radius:15px;padding:12px 5px;text-align:center}.macro b{display:block;font-size:13px}.macro small{font-size:7px;color:#858B85}.recipePanel{background:#fff;border:1px solid #E3E6DF;border-radius:20px;padding:17px;margin-top:12px}.sectionTitle{font-size:15px;font-weight:950;margin:0 0 10px}.ingredientRow{display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid #ECEEE8;font-size:10px}.ingredientRow:last-child{border-bottom:0}.ingredientName{display:flex;align-items:center;gap:9px}.ingredientDot{width:25px;height:25px;border-radius:8px;background:#F0F5EB;display:grid;place-items:center;font-size:11px}.steps{display:grid;gap:12px}.stepRow{display:grid;grid-template-columns:28px 1fr;gap:10px;align-items:start;font-size:10px;line-height:1.55}.stepNum{width:28px;height:28px;border-radius:50%;background:#D9F7D5;color:#1E6827;display:grid;place-items:center;font-weight:950}.tipBox{border-radius:18px;padding:15px;margin-top:11px;font-size:10px;line-height:1.5}.tipBox.green{background:#F0FAEF}.tipBox.warm{background:#FBF7EF}.tipBox b{display:block;font-size:11px;margin-bottom:4px}.recipeActions{display:grid;grid-template-columns:1fr;gap:8px;margin-top:16px}.recipeActions button{min-height:54px;border-radius:16px;font-size:10px;font-weight:950}.recipeActions .black{border:0;background:#0E100F;color:#c8ff00}.recipeActions .white{border:1px solid #DDE1DA;background:#fff;color:#0E100F}
      /* LIVRET — RAPIDE + PROGRESSIF */
      .bookHero{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:18px}.bookHero h1{font-size:34px;margin-bottom:7px}.bookHero p{margin:0;color:#777D78;font-size:12px;line-height:1.45}.bookCount{flex:0 0 auto;width:82px;height:82px;border-radius:24px;background:#0E100F;color:#fff;display:grid;place-items:center;align-content:center}.bookCount strong{font-size:27px;line-height:1;color:#C8FF00}.bookCount span{font-size:8px;margin-top:5px;color:#C8CDC8}.bookLoading{display:flex;align-items:center;gap:13px;background:#fff;border:1px solid #E1E4DD;border-radius:20px;padding:17px;margin:18px 0}.bookSpark{width:45px;height:45px;border-radius:14px;background:#E9FFC4;display:grid;place-items:center;font-size:22px}.bookLoading div{display:grid;gap:3px}.bookLoading b{font-size:12px}.bookLoading small{font-size:9px;color:#7A807A}.bookProgress{background:#fff;border:1px solid #E1E4DD;border-radius:20px;padding:16px;margin:16px 0 18px}.bookProgressTop{display:flex;justify-content:space-between;align-items:center;font-size:11px}.bookProgressTop span{font-weight:950}.bookProgressBar{height:7px;background:#E8EBE4;border-radius:99px;overflow:hidden;margin:10px 0 7px}.bookProgressBar i{display:block;height:100%;background:#91D10E;border-radius:99px;transition:width .35s ease}.bookProgress small{font-size:9px;color:#7B817B}.recipeBookTabs button{display:flex;align-items:center;gap:6px}.recipeBookTabs button span{font-size:8px;opacity:.7}.recipeCategoryPill{position:absolute;left:12px;top:12px;background:rgba(14,16,15,.78);color:#fff;border-radius:999px;padding:7px 9px;font-size:8px;font-weight:900;backdrop-filter:blur(8px)}.recipeSkeleton{border:1px solid #E1E4DD;background:#fff;border-radius:22px;overflow:hidden}.skeletonPhoto{height:155px;background:linear-gradient(110deg,#EEF0EA 25%,#F7F8F4 42%,#EEF0EA 60%);background-size:240% 100%;animation:noxShimmer 1.2s linear infinite;display:grid;place-items:center}.skeletonPhoto span{width:42px;height:42px;border-radius:50%;background:#E5F8C0;display:grid;place-items:center}.skeletonBody{padding:15px;display:grid;gap:8px}.skeletonBody i{display:block;height:10px;border-radius:99px;background:#ECEFE9}.skeletonBody i:nth-child(1){width:72%}.skeletonBody i:nth-child(2){width:94%}.skeletonBody i:nth-child(3){width:55%}@keyframes noxShimmer{to{background-position:-140% 0}}
      @media(min-width:760px){.qg.step-recipes .headin,.qg.step-recipes .main{max-width:900px}.qg.step-recipes .main{padding-left:28px;padding-right:28px}.qg.step-recipes .recipeGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.qg.step-recipes .recipeVisual,.qg.step-recipes .skeletonPhoto{height:210px}.qg.step-recipes .bookHero h1{font-size:46px}}
      .shopTop{margin-bottom:20px}.shopProgress{display:flex;justify-content:space-between;font-size:10px;font-weight:850;margin-bottom:8px}.doneScreen{min-height:72vh;display:flex;flex-direction:column;justify-content:center;text-align:center}.doneCheck{width:100px;height:100px;border-radius:50%;background:#DFFFAD;display:grid;place-items:center;margin:0 auto 22px;font-size:43px;font-weight:950}.doneScreen h1{font-size:30px}.doneScreen .actions{margin-top:24px}

      /* ÉCRAN 1 — MAQUETTE PREMIUM */
      .modeProgress{margin-bottom:34px}
      .modeProgressTop{display:flex;align-items:center;justify-content:space-between;margin-bottom:11px}
      .modeProgressTop b{font-size:11px;letter-spacing:.08em;color:#78A516}
      .modeProgressTop span{font-size:10px;color:#8A8F8A}
      .modeTrack{height:6px;background:#E7E9E3;border-radius:99px;overflow:hidden}
      .modeTrack span{display:block;width:20%;height:100%;background:#93D315;border-radius:99px}
      .modeIntro{text-align:center;margin-bottom:30px}
      .modeIntro h1{font-size:38px;letter-spacing:-.055em;margin-bottom:10px}
      .modeIntro p{max-width:340px;margin:0 auto;color:#777D78;font-size:14px;line-height:1.55}
      .modeChoices{display:grid;gap:13px}
      .modeCard{width:100%;min-height:174px;border:1px solid #E0E3DC;background:#fff;border-radius:25px;padding:17px;display:grid;grid-template-columns:112px 1fr;gap:15px;align-items:center;text-align:left;position:relative;overflow:hidden}
      .modeCard.on{border:2px solid #91D10E;background:linear-gradient(110deg,#FBFFE9,#F7FFE0)}
      .modeVisual{height:122px;border-radius:20px;background:#F3F5F0;display:grid;place-items:center;position:relative;overflow:hidden}
      .modeVisual.emptyFridge:before{content:'';width:54px;height:86px;border:2px solid #B7BDB7;border-radius:7px;background:linear-gradient(90deg,#FDFEFC 0 74%,#E7EAE6 74%);box-shadow:0 9px 18px rgba(14,16,15,.10)}
      .modeVisual.emptyFridge:after{content:'';position:absolute;width:37px;height:1px;background:#C8CDC8;box-shadow:0 -19px 0 #C8CDC8,0 19px 0 #C8CDC8}
      .modeVisual.stocked{background:linear-gradient(145deg,#EEF3E8,#FAFBF8)}
      .modeFood{font-size:34px;letter-spacing:-9px;transform:translateX(-5px)}
      .modeCopy{padding-right:22px}
      .modeCopy strong{display:block;font-size:20px;letter-spacing:-.025em;margin-bottom:5px}
      .modeCopy .modeSub{display:block;font-size:14px;color:#303530;margin-bottom:7px}
      .modeCopy p{margin:0;color:#7C827D;font-size:10px;line-height:1.45}
      .modeBenefit{display:inline-flex;align-items:center;gap:6px;margin-top:12px;background:#F4F5F1;border-radius:999px;padding:7px 10px;font-size:8px;color:#555B56}
      .modeCard.on .modeBenefit{background:#EAFBC0;color:#354512}
      .modeSelect{position:absolute;right:15px;top:15px;width:29px;height:29px;border-radius:50%;border:1.5px solid #B8BDB8;background:#fff;display:grid;place-items:center;font-size:13px}
      .modeCard.on .modeSelect{background:#0E100F;border-color:#0E100F;color:#c8ff00}
      .fridgeEntry{margin-top:12px;background:#fff;border:1px solid #E1E4DD;border-radius:20px;padding:15px}
      .profileHint{display:flex;align-items:center;justify-content:center;gap:9px;margin:22px 0 8px;color:#363B37;font-size:11px}
      .profileHintIcon{width:27px;height:27px;border:1px solid #DDE1DA;border-radius:50%;display:grid;place-items:center;font-size:13px;flex:0 0 auto}
      .profileHint b{font-weight:900}
      @media(max-width:380px){
        .modeCard{grid-template-columns:92px 1fr;padding:14px;gap:12px}
        .modeVisual{height:108px}
        .modeCopy strong{font-size:17px}
        .modeIntro h1{font-size:34px}
      }


      /* ÉCRAN 1 — MOBILE FINAL */
      @media(max-width:699px){
      .modeProgress{margin:4px 0 38px}
      .modeProgressTop{margin-bottom:10px}
      .modeProgressTop b{font-size:12px;font-weight:900;letter-spacing:.06em;color:#75A915}
      .modeProgressTop span{font-size:11px;color:#858A85}
      .modeTrack{height:6px;background:transparent;display:grid;grid-template-columns:repeat(5,1fr);gap:4px;overflow:visible}
      .modeTrack:before,.modeTrack:after{content:'';display:block;background:#E4E7E1;border-radius:99px}
      .modeTrack span{width:auto;height:6px;background:#91D10E;border-radius:99px}
      .modeTrack{background:linear-gradient(90deg,transparent 0)}
      .modeTrack span{grid-column:1}
      .modeTrack:before{grid-column:2/4;grid-row:1}
      .modeTrack:after{grid-column:4/6;grid-row:1}

      .modeIntro{text-align:center;margin:0 0 31px}
      .modeIntro h1{font-size:39px;line-height:1.02;letter-spacing:-.055em;margin:0 0 12px;font-weight:800}
      .modeIntro p{max-width:355px;margin:0 auto;color:#747A75;font-size:15px;line-height:1.48}

      .modeChoices{display:grid;gap:15px}
      .modeCard{
        width:100%;min-height:194px;border:1px solid #DEE2DB;background:#fff;border-radius:26px;
        padding:17px 18px;display:grid;grid-template-columns:145px minmax(0,1fr);gap:18px;
        align-items:center;text-align:left;position:relative;overflow:hidden
      }
      .modeCard.on{border:2px solid #82C600;background:linear-gradient(112deg,#FBFFE8 0%,#F8FFE7 100%)}
      .modeVisual{height:156px;border-radius:21px;background:#F4F6F1;display:grid;place-items:center;position:relative;overflow:hidden}
      .modeVisual.emptyFridge:before{
        content:'';width:73px;height:112px;border:2px solid #B8BDB8;border-radius:8px;
        background:linear-gradient(90deg,#FCFDFB 0 72%,#E8EBE7 72%);box-shadow:0 10px 20px rgba(12,15,12,.10)
      }
      .modeVisual.emptyFridge:after{
        content:'';position:absolute;width:50px;height:1px;background:#C8CDC8;
        box-shadow:0 -25px 0 #C8CDC8,0 25px 0 #C8CDC8
      }
      .modeVisual.stocked{background:linear-gradient(145deg,#F1F5EC,#FAFBF8)}
      .modeFood{font-size:44px;letter-spacing:-11px;transform:translateX(-6px)}

      .modeCopy{padding:3px 26px 2px 0;min-width:0}
      .modeCopy strong{display:block;font-size:21px;line-height:1.1;letter-spacing:-.035em;margin-bottom:7px;font-weight:900}
      .modeCopy .modeSub{display:block;font-size:16px;line-height:1.2;color:#222724;margin-bottom:10px}
      .modeCopy p{margin:0;color:#767C77;font-size:11px;line-height:1.48}
      .modeBenefit{
        display:inline-flex;align-items:center;gap:6px;margin-top:13px;background:#F3F4F1;border-radius:999px;
        padding:8px 11px;font-size:9px;line-height:1.2;color:#555B56;max-width:100%
      }
      .modeCard.on .modeBenefit{background:#E9FBB7;color:#354711}
      .modeSelect{
        position:absolute;right:16px;top:16px;width:34px;height:34px;border-radius:50%;
        border:2px solid #B9BEB9;background:#fff;display:grid;place-items:center;font-size:15px
      }
      .modeCard.on .modeSelect{background:#0D0F0E;border-color:#0D0F0E;color:#C8FF00}

      .fridgeEntry{margin-top:14px;background:#fff;border:1px solid #E0E3DD;border-radius:22px;padding:16px}
      .profileHint{display:flex;align-items:center;justify-content:center;gap:10px;margin:25px 0 7px;color:#292E2A;font-size:12px}
      .profileHintIcon{width:31px;height:31px;border:1px solid #DCE0DA;border-radius:50%;display:grid;place-items:center;font-size:14px;flex:0 0 auto}
      .profileHint b{font-weight:900}
      .modeFooter .primary{height:62px;border-radius:19px;font-size:13px}

      @media(max-width:520px){
        .modeCard{grid-template-columns:132px minmax(0,1fr);gap:15px;min-height:184px;padding:15px}
        .modeVisual{height:146px}
        .modeCopy strong{font-size:19px}
        .modeCopy .modeSub{font-size:15px}
        .modeIntro h1{font-size:37px}
      }
      @media(max-width:420px){
        .modeCard{grid-template-columns:118px minmax(0,1fr);gap:13px}
        .modeVisual{height:138px}
        .modeCopy{padding-right:20px}
        .modeCopy strong{font-size:18px}
        .modeCopy .modeSub{font-size:14px}
        .modeBenefit{font-size:8px;padding:7px 9px}
      }
      }


      /* BUDGET — BAROMÈTRE */
      .budgetMeterCard{margin-top:24px;background:#fff;border:1px solid #E0E3DD;border-radius:24px;padding:22px 20px}
      .budgetMeterTop{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
      .budgetMeterValue{font-size:44px;line-height:1;font-weight:950;letter-spacing:-.055em;margin-top:10px}
      .budgetMeterPeople{background:#F2F4EF;border-radius:999px;padding:8px 11px;font-size:10px;font-weight:850;white-space:nowrap}
      .budgetRange{-webkit-appearance:none;appearance:none;width:100%;height:8px;border-radius:99px;outline:none;margin:30px 0 12px;background:linear-gradient(90deg,#9ADE18 0%,#9ADE18 var(--budget-fill),#E6E9E3 var(--budget-fill),#E6E9E3 100%)}
      .budgetRange::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:30px;height:30px;border-radius:50%;background:#0D0F0E;border:6px solid #C8FF00;box-shadow:0 4px 12px rgba(0,0,0,.18);cursor:pointer}
      .budgetRange::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:#0D0F0E;border:6px solid #C8FF00;box-shadow:0 4px 12px rgba(0,0,0,.18);cursor:pointer}
      .budgetScale{display:flex;justify-content:space-between;color:#8A908B;font-size:9px;font-weight:800}
      .budgetMeterHint{margin-top:22px;background:#F6F8F2;border-radius:16px;padding:14px 15px;display:grid;gap:4px}
      .budgetMeterHint b{font-size:12px}
      .budgetMeterHint span{font-size:10px;color:#747A75;line-height:1.45}


      /* WIZARD 1→5 — FINAL SIMPLE MOCKUP */
      .wizardProgress{margin:7px 0 34px}
      .wizardProgressLabel{font-size:11px;color:#79B600;letter-spacing:.02em;margin-bottom:10px}
      .wizardSegments{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
      .wizardSegments span{height:6px;border-radius:99px;background:#E2E5DF}
      .wizardSegments span.on{background:#86CF00}
      .wizardIntro{margin-bottom:26px}
      .wizardIntro h1{margin:0 0 8px;font-size:34px;line-height:1.02;letter-spacing:-.05em;font-weight:950}
      .wizardIntro p{margin:0;color:#737973;font-size:14px;line-height:1.45}
      .simpleChoices{display:grid;gap:12px}
      .simpleChoice{width:100%;min-height:96px;border:1px solid #DDE1DA;border-radius:18px;background:#fff;padding:17px 18px;display:flex;align-items:center;justify-content:space-between;gap:16px;text-align:left}
      .simpleChoice.on{border:1.5px solid #84C900;background:linear-gradient(110deg,#FAFFE8,#F5FFDA)}
      .choiceCopy{display:grid;gap:5px}
      .choiceCopy strong{font-size:17px;letter-spacing:-.02em}
      .choiceCopy small{font-size:12px;color:#747A75;line-height:1.4}
      .choiceRadio{width:28px;height:28px;border-radius:50%;border:1.5px solid #AEB4AE;background:#fff;display:grid;place-items:center;flex:0 0 auto;font-size:13px;font-weight:950}
      .simpleChoice.on .choiceRadio,.durationChoices button.on .choiceRadio{background:#0E100F;border-color:#0E100F;color:#C8FF00}
      .wizardCard{margin-top:12px;background:#fff;border:1px solid #E0E3DD;border-radius:19px;padding:18px}
      .compactCard{margin-top:14px}
      .wizardProfile{text-align:center;color:#666C67;font-size:10px;line-height:1.4;margin:22px 0 6px}
      .durationChoices{display:grid;gap:9px;margin-top:12px}
      .durationChoices button{border:1px solid #DFE2DC;background:#fff;border-radius:15px;padding:15px 14px;display:flex;align-items:center;justify-content:space-between;text-align:left}
      .durationChoices button.on{border-color:#84C900;background:#F8FFE7}
      .durationChoices strong{font-size:15px}
      .peopleCard{display:flex;align-items:center;justify-content:space-between;gap:18px}
      .peopleTitle{display:block;font-size:16px;margin-top:7px}
      .peopleControl{display:flex;align-items:center;gap:14px}
      .peopleControl button{width:38px;height:38px;border-radius:50%;border:1px solid #D8DCD6;background:#F7F8F5;font-size:21px}
      .peopleControl b{min-width:18px;text-align:center;font-size:18px}
      .budgetMockCard{background:#fff;border:1px solid #E0E3DD;border-radius:20px;padding:28px 20px 20px;text-align:center}
      .budgetBig{font-size:43px;line-height:1;font-weight:950;letter-spacing:-.055em;margin:4px 0 8px}
      .budgetRange{margin:30px 0 11px}
      .budgetScale{font-size:10px}
      .budgetStatus{margin-top:24px;background:#F5F7F0;border-radius:15px;padding:14px;display:flex;align-items:center;gap:13px;text-align:left}
      .budgetStatus>span:last-child{display:grid;gap:3px}
      .budgetStatus b{font-size:12px}
      .budgetStatus small{font-size:9px;color:#6F756F;line-height:1.4}
      .statusBars{width:32px;height:30px;display:flex;align-items:flex-end;gap:3px;justify-content:center}
      .statusBars i{display:block;width:5px;border:2px solid #0E100F;background:#C8FF00;border-radius:2px}
      .statusBars i:nth-child(1){height:9px}.statusBars i:nth-child(2){height:17px}.statusBars i:nth-child(3){height:25px}
      .prefsCard{display:grid;gap:20px}
      .prefBlock{display:grid;gap:9px}
      .readonlyPref{border:1px solid #E0E3DD;border-radius:13px;background:#FAFBF8;padding:13px 14px;font-size:12px;color:#555B56}
      .cleanChips{gap:7px}
      .cleanChips .chip{font-size:10px;padding:8px 10px;background:#fff}
      .cleanChips .chip.on{background:#EFFFBA;border-color:#84C900;color:#263500}
      .prefsCard .input{border-radius:13px;background:#fff;font-size:12px;padding:13px 14px}
      .recapCard{background:#fff;border:1px solid #E0E3DD;border-radius:18px;padding:3px 16px}
      .recapCard .reviewRow{padding:14px 0;border-bottom:1px solid #ECEEE9}
      .recapCard .reviewRow:last-child{border-bottom:0}
      .readyCard{margin-top:16px;background:linear-gradient(105deg,#F7FFD9,#EDFFC0);border-radius:16px;padding:17px 18px;display:grid;gap:5px}
      .readyCard b{font-size:13px}
      .readyCard span{font-size:10px;color:#69705F;line-height:1.45}
      @media(min-width:700px){
        .qg.step-mode .headin,.qg.step-mode .main,
        .qg.step-setup .headin,.qg.step-setup .main,
        .qg.step-budget .headin,.qg.step-budget .main,
        .qg.step-prefs .headin,.qg.step-prefs .main,
        .qg.step-review .headin,.qg.step-review .main{max-width:480px!important}
      }


      /* ===== MAQUETTE APPROUVÉE — OVERRIDES FINAUX ===== */
      .qg.step-mode,.qg.step-setup,.qg.step-budget,.qg.step-prefs,.qg.step-review{
        background:#F5F6EE;
      }
      .qg.step-mode .head,.qg.step-setup .head,.qg.step-budget .head,.qg.step-prefs .head,.qg.step-review .head{
        background:#F5F6EE;border-bottom:0;position:relative;backdrop-filter:none;
      }
      .qg.step-mode .headin,.qg.step-setup .headin,.qg.step-budget .headin,.qg.step-prefs .headin,.qg.step-review .headin,
      .qg.step-mode .main,.qg.step-setup .main,.qg.step-budget .main,.qg.step-prefs .main,.qg.step-review .main{
        width:min(100%,430px)!important;max-width:430px!important;margin:0 auto!important;
      }
      .qg.step-mode .headin,.qg.step-setup .headin,.qg.step-budget .headin,.qg.step-prefs .headin,.qg.step-review .headin{
        padding:22px 22px 8px!important;
      }
      .qg.step-mode .main,.qg.step-setup .main,.qg.step-budget .main,.qg.step-prefs .main,.qg.step-review .main{
        padding:18px 22px 122px!important;
      }
      .qg.step-mode .top,.qg.step-setup .top,.qg.step-budget .top,.qg.step-prefs .top,.qg.step-review .top{
        grid-template-columns:42px 1fr 42px;
      }
      .qg.step-mode .back,.qg.step-setup .back,.qg.step-budget .back,.qg.step-prefs .back,.qg.step-review .back{
        border:0;background:transparent;font-size:30px;
      }
      .qg.step-mode .nox,.qg.step-setup .nox,.qg.step-budget .nox,.qg.step-prefs .nox,.qg.step-review .nox{
        width:42px;height:42px;border-radius:50%;font-size:11px;
      }
      .qg.step-mode .title,.qg.step-setup .title,.qg.step-budget .title,.qg.step-prefs .title,.qg.step-review .title{
        font-size:16px;font-weight:900;
      }
      .qg.step-mode .subtitle,.qg.step-setup .subtitle,.qg.step-budget .subtitle,.qg.step-prefs .subtitle,.qg.step-review .subtitle{
        display:none;
      }

      .wizardProgress{margin:10px 0 42px!important}
      .wizardProgressLabel{font-size:11px!important;color:#77A916!important;font-weight:950!important;margin-bottom:11px!important}
      .wizardSegments{gap:5px!important}
      .wizardSegments span{height:5px!important;background:#E0E3DA!important}
      .wizardSegments span.on{background:#88CB11!important}

      .wizardIntro{text-align:center!important;margin-bottom:31px!important}
      .wizardIntro h1{font-size:39px!important;line-height:1!important;letter-spacing:-.055em!important;font-weight:900!important;margin-bottom:11px!important}
      .wizardIntro p{font-size:13px!important;line-height:1.5!important;color:#7A807A!important;max-width:320px!important;margin:0 auto!important}

      .simpleChoices{gap:14px!important}
      .simpleChoice{
        min-height:112px!important;border-radius:22px!important;padding:20px!important;
        border:1px solid #DDE1D8!important;background:#fff!important;
        box-shadow:0 8px 26px rgba(20,24,18,.025)!important;
      }
      .simpleChoice.on{
        border:2px solid #8ACB10!important;
        background:linear-gradient(110deg,#FBFFE9 0%,#F4FFD8 100%)!important;
      }
      .choiceCopy strong{font-size:18px!important;font-weight:900!important}
      .choiceCopy small{font-size:11px!important;color:#737A73!important;max-width:250px!important}
      .choiceRadio{width:30px!important;height:30px!important}
      .simpleChoice.on .choiceRadio,.durationChoices button.on .choiceRadio{
        background:#0E100F!important;color:#C8FF00!important;border-color:#0E100F!important;
      }

      .wizardCard,.budgetMockCard,.recapCard{
        border-radius:22px!important;border:1px solid #DEE2D9!important;
        box-shadow:0 8px 28px rgba(20,24,18,.025)!important;
      }
      .wizardCard{padding:20px!important}
      .durationChoices{gap:10px!important}
      .durationChoices button{
        min-height:58px!important;border-radius:16px!important;padding:0 16px!important;
      }
      .durationChoices button.on{background:#F5FFD9!important;border:2px solid #8ACB10!important}
      .peopleCard{margin-top:14px!important;min-height:86px!important}
      .peopleControl button{width:40px!important;height:40px!important;background:#fff!important}
      .peopleControl b{font-size:20px!important}

      .budgetMockCard{padding:34px 22px 22px!important}
      .budgetBig{font-size:48px!important;margin-bottom:14px!important}
      .budgetRange{height:7px!important;margin:30px 0 12px!important}
      .budgetRange::-webkit-slider-thumb{
        width:29px!important;height:29px!important;background:#0E100F!important;
        border:6px solid #C8FF00!important;
      }
      .budgetScale{font-size:10px!important;color:#818781!important}
      .budgetStatus{margin-top:25px!important;background:#F1F4EB!important;border-radius:16px!important;padding:15px!important}

      .prefsCard{gap:22px!important}
      .prefBlock{gap:10px!important}
      .readonlyPref,.prefsCard .input{min-height:48px!important;border-radius:14px!important;background:#FBFCF8!important}
      .cleanChips .chip{padding:9px 12px!important;border-radius:999px!important}
      .cleanChips .chip.on{background:#E9FFAA!important;border-color:#88CB11!important;color:#1D2A00!important}

      .recapCard{padding:4px 18px!important}
      .recapCard .reviewRow{padding:16px 0!important;font-size:11px!important}
      .readyCard{border-radius:18px!important;padding:18px!important;background:#EEFFC2!important}

      .wizardProfile{font-size:10px!important;margin:25px 0 8px!important;color:#676D67!important}

      .qg.step-mode .footer,.qg.step-setup .footer,.qg.step-budget .footer,.qg.step-prefs .footer,.qg.step-review .footer{
        background:linear-gradient(180deg,rgba(245,246,238,0),#F5F6EE 28%)!important;
      }
      .qg.step-mode .footerIn,.qg.step-setup .footerIn,.qg.step-budget .footerIn,.qg.step-prefs .footerIn,.qg.step-review .footerIn{
        max-width:386px!important;
      }
      .qg.step-mode .primary,.qg.step-setup .primary,.qg.step-budget .primary,.qg.step-prefs .primary,.qg.step-review .primary{
        height:59px!important;border-radius:18px!important;background:#0E100F!important;color:#C8FF00!important;
        font-size:12px!important;letter-spacing:.01em!important;
      }

      @media(min-width:700px){
        .qg.step-mode,.qg.step-setup,.qg.step-budget,.qg.step-prefs,.qg.step-review{
          padding:34px 0!important;
        }
        .qg.step-mode .head,.qg.step-setup .head,.qg.step-budget .head,.qg.step-prefs .head,.qg.step-review .head,
        .qg.step-mode .main,.qg.step-setup .main,.qg.step-budget .main,.qg.step-prefs .main,.qg.step-review .main{
          background:#F5F6EE!important;
        }
      }



      /* PREMIUM LIVRET MOCKUP — FINAL */
      .step-recipes .headin,.step-recipes .main{max-width:1480px!important}
      .step-recipes .main{padding:24px 30px 90px}
      .premiumBook{width:100%}
      .bookJourney{display:flex;justify-content:center;align-items:center;gap:18px;color:#7C817D;font-size:12px;margin:0 0 28px}
      .bookJourney strong{color:#0E100F;border-bottom:2px solid #8FD314;padding-bottom:7px}
      .bookTop{display:grid;grid-template-columns:minmax(0,1.8fr) minmax(330px,.8fr);gap:34px;align-items:start;margin-bottom:28px}
      .bookIntro h1{font-size:40px;line-height:1.02;letter-spacing:-.045em;margin:0 0 8px}
      .bookIntro>p{font-size:14px;color:#747A75;margin:0;max-width:760px}
      .bookBenefits{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-top:28px}
      .bookBenefits>span{display:grid;grid-template-columns:42px 1fr;grid-template-rows:auto auto;column-gap:10px;align-items:center}
      .bookBenefits i{grid-row:1/3;width:42px;height:42px;border-radius:50%;background:#EFF9DA;display:grid;place-items:center;font-style:normal;font-size:19px}
      .bookBenefits b{font-size:11px}.bookBenefits small{font-size:9px;color:#7C827D}
      .bookGeneration{background:linear-gradient(110deg,#F3FFE2,#EDF8D8);border-radius:18px;padding:23px;display:grid;grid-template-columns:44px 1fr;gap:14px}
      .generationSpark{font-size:28px}.generationCopy{display:grid;grid-template-columns:1fr auto;gap:7px 12px;align-items:center}
      .generationCopy>b{font-size:13px}.generationCopy>span{grid-column:1/3;color:#747A75;font-size:10px;line-height:1.4}
      .generationLine{height:10px;border-radius:99px;background:#DDE7C9;overflow:hidden}.generationLine i{display:block;height:100%;background:#A8E925;border-radius:99px;transition:.35s}
      .generationCopy>strong{font-size:11px;white-space:nowrap}
      .bookToolbar{display:flex;justify-content:space-between;align-items:center;margin:14px 0 18px}
      .premiumTabs{display:flex;gap:9px;flex-wrap:wrap}.premiumTabs button{border:1px solid #DDE1DA;background:#fff;border-radius:999px;padding:10px 17px;font-size:10px;font-weight:850}.premiumTabs button.on{background:#0E100F;color:#fff;border-color:#0E100F}.premiumTabs span{opacity:.7}
      .bookWorkspace{display:grid;grid-template-columns:1fr;gap:20px;align-items:start}.bookWorkspace.hasPanel{grid-template-columns:minmax(0,1fr) 420px}
      .premiumRecipeGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}
      .premiumRecipeCard,.premiumSkeleton{min-width:0;border:1px solid #DDE1DA;background:#fff;border-radius:15px;overflow:hidden;text-align:left;padding:0;box-shadow:0 4px 15px rgba(14,16,15,.035)}
      .premiumRecipeCard{cursor:pointer;transition:transform .18s,border-color .18s,box-shadow .18s}.premiumRecipeCard:hover{transform:translateY(-2px);box-shadow:0 10px 25px rgba(14,16,15,.08)}.premiumRecipeCard.selected{border-color:#9BD91B}
      .premiumRecipePhoto{height:190px;position:relative;overflow:hidden;background:#EFF1EC}.premiumRecipePhoto img{width:100%;height:100%;object-fit:cover;display:block}
      .premiumPill{position:absolute;left:11px;top:11px;padding:6px 10px;border-radius:999px;font-size:8px;font-weight:950;background:#F4B8EA}.premiumPill.green{background:#B9F04B}
      .recipeHeart{position:absolute;right:11px;top:9px;color:#fff;font-size:25px;text-shadow:0 1px 8px rgba(0,0,0,.35)}
      .premiumRecipeBody{padding:12px 13px 14px}.premiumRecipeBody h3{font-size:14px;margin:0 0 9px;letter-spacing:-.02em}.premiumRecipeBody p{font-size:9px;color:#777D78;line-height:1.45;margin:10px 0 0}
      .premiumMeta{display:flex;gap:12px;flex-wrap:wrap;font-size:8px;font-weight:800;color:#3F4540}
      .premiumSkeleton{background:#F0F1ED}.premiumSkeletonPhoto{height:190px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:7px;background:linear-gradient(110deg,#ECEDE9,#F7F7F4,#ECEDE9);background-size:200% 100%;animation:noxShimmer 1.5s infinite}.premiumSkeletonPhoto>span{font-size:25px}.premiumSkeletonPhoto b{background:#F8FAF2;border-radius:999px;padding:7px 11px;font-size:8px}.premiumSkeletonPhoto small{font-size:8px;color:#7B807B}.premiumSkeletonBody{padding:14px}.premiumSkeletonBody i{display:block;height:9px;border-radius:99px;background:#E2E4DF;margin-bottom:8px}.premiumSkeletonBody i:nth-child(2){width:70%}.premiumSkeletonBody i:nth-child(3){width:45%}
      @keyframes noxShimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
      .recipeSidePanel{position:sticky;top:92px;background:#fff;border:1px solid #DDE1DA;border-radius:17px;overflow:hidden;box-shadow:0 12px 35px rgba(14,16,15,.06);max-height:calc(100vh - 112px);overflow-y:auto}
      .sidePhoto{height:235px}.sidePhoto img{width:100%;height:100%;object-fit:cover;display:block}.sideContent{padding:17px}
      .sideBadges{display:flex;gap:6px;flex-wrap:wrap}.sideBadges span{background:#F1F3EF;border-radius:999px;padding:6px 9px;font-size:8px;font-weight:850}.sideBadges .sideCategory{background:#B9F04B}
      .sideContent h2{font-size:22px;letter-spacing:-.035em;margin:10px 0 4px}.sideContent>p{font-size:10px;line-height:1.45;color:#6E746F;margin:0 0 13px}
      .sideMacros{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.sideMacros span{border:1px solid #E4E7E1;border-radius:11px;padding:9px 4px;text-align:center}.sideMacros b{display:block;font-size:11px}.sideMacros small{font-size:6px;color:#7D837E}
      .sideContent h4{font-size:11px;margin:16px 0 7px}.sideIngredients>div{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid #ECEEE9;font-size:9px}.sideIngredients>div b{white-space:nowrap}
      .sideSteps{display:grid;gap:8px}.sideSteps>div{display:grid;grid-template-columns:22px 1fr;gap:8px;align-items:start;font-size:9px;line-height:1.45}.sideSteps>div>b{width:22px;height:22px;border-radius:50%;background:#A8E925;display:grid;place-items:center}
      .sideTip{background:#F1FBDC;border-radius:12px;padding:12px;margin-top:14px;display:grid;gap:5px}.sideTip b{font-size:9px}.sideTip span{font-size:8px;line-height:1.45;color:#5E655F}
      .bookBottomAction{max-width:420px;margin:28px auto 0}
      @media(max-width:1180px){.bookWorkspace.hasPanel{grid-template-columns:minmax(0,1fr) 360px}.premiumRecipeGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:899px){
        .step-recipes .main{padding:20px 16px 95px}.bookJourney{display:none}.bookTop{grid-template-columns:1fr;gap:18px}.bookIntro h1{font-size:32px}.bookBenefits{grid-template-columns:repeat(2,1fr);gap:12px}.bookGeneration{padding:17px}.bookWorkspace.hasPanel{grid-template-columns:1fr}.recipeSidePanel{display:none}.premiumRecipeGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.premiumRecipePhoto,.premiumSkeletonPhoto{height:180px}
      }
      @media(max-width:560px){.premiumRecipeGrid{grid-template-columns:1fr}.bookBenefits{grid-template-columns:1fr 1fr}.premiumRecipePhoto,.premiumSkeletonPhoto{height:220px}.premiumTabs{flex-wrap:nowrap;overflow-x:auto;width:100%;padding-bottom:3px}.premiumTabs button{white-space:nowrap}.generationCopy{grid-template-columns:1fr auto}}


      /* PREMIUM GENERATING — UI ONLY */
      .step-generating .headin,.step-generating .main{max-width:1180px!important}
      .step-generating .main{padding:34px 28px 90px}
      .premiumGenerating{max-width:980px;margin:0 auto;text-align:center}
      .genBadge{display:inline-flex;align-items:center;background:#F0FADB;color:#60920B;border-radius:999px;padding:10px 17px;font-size:10px;font-weight:950;letter-spacing:.025em;margin:2px 0 20px}
      .premiumGenerating>h1{font-size:42px;line-height:1;letter-spacing:-.045em;margin:0 0 10px;color:#0E100F}
      .genLead{max-width:650px;margin:0 auto 28px;color:#777D78;font-size:14px;line-height:1.5}
      .genPremiumCard{background:#fff;border:1px solid #E3E6E0;border-radius:19px;padding:25px 30px 20px;text-align:left;box-shadow:0 12px 35px rgba(14,16,15,.045)}
      .genPremiumRows{position:relative}
      .genPremiumRows:before{content:"";position:absolute;left:18px;top:22px;bottom:22px;width:2px;background:#E7EAE4}
      .genPremiumRow{position:relative;display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:16px;align-items:center;min-height:69px}
      .genState{position:relative;z-index:1;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:#F4F5F2;border:2px solid #9CA29D;color:#777D78;font-size:18px;font-weight:950}
      .genPremiumRow.done .genState{background:#9DDF19;border-color:#9DDF19;color:#fff}
      .genPremiumRow.active .genState{background:#F3FBDC;border-color:#CBEF82;color:#151A15;animation:genPulse 1.2s ease-in-out infinite}
      .genRowCopy{display:flex;flex-direction:column;gap:4px}.genRowCopy b{font-size:14px;color:#111411}.genRowCopy span{font-size:11px;color:#818782}
      .genRowStatus{font-size:10px;font-weight:800;color:#919692}.genPremiumRow.done .genRowStatus,.genPremiumRow.active .genRowStatus{color:#6B9E13}
      .genPremiumProgress{display:grid;grid-template-columns:1fr auto;gap:18px;align-items:center;margin-top:15px}
      .genProgressTrack{height:11px;background:#E7EAE5;border-radius:999px;overflow:hidden}.genProgressTrack i{display:block;height:100%;background:#9DDF19;border-radius:999px;transition:width .45s ease}
      .genPremiumProgress>b{font-size:11px;color:#69706A;white-space:nowrap}
      .genSummary{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:20px;text-align:left}
      .genSummary>div{background:#fff;border:1px solid #E3E6E0;border-radius:15px;padding:15px 17px;display:flex;align-items:center;gap:13px}
      .genSummaryIcon{width:39px;height:39px;flex:0 0 39px;border-radius:11px;background:#EFFAD9;display:grid;place-items:center;font-size:17px;font-weight:950}
      .genSummary p{margin:0;display:flex;flex-direction:column;gap:3px}.genSummary b{font-size:13px}.genSummary small{font-size:9px;color:#818782}
      .genTip{margin-top:16px;background:#F1F9E2;border-radius:15px;padding:15px 20px;display:flex;align-items:center;gap:13px;text-align:left}
      .genTip>span{width:34px;height:34px;border-radius:50%;background:#A4E41F;display:grid;place-items:center;font-size:15px}
      .genTip>div{display:flex;flex-direction:column;gap:3px}.genTip b{font-size:11px}.genTip small{font-size:9px;color:#727972}
      @keyframes genPulse{50%{transform:scale(.9);opacity:.65}}
      @media(max-width:700px){
        .step-generating .main{padding:25px 16px 80px}.premiumGenerating>h1{font-size:32px}.genLead{font-size:12px;margin-bottom:20px}
        .genPremiumCard{padding:18px 16px}.genPremiumRow{grid-template-columns:34px 1fr;gap:12px;min-height:67px}.genState{width:34px;height:34px}.genPremiumRows:before{left:16px}.genRowStatus{display:none}
        .genSummary{grid-template-columns:1fr;gap:9px}.genSummary>div{padding:12px 14px}.genTip{padding:13px 15px}
      }

    `}</style>

    <header className="head"><div className="headin"><div className="top">
      <button className="back" onClick={back}>‹</button>
      <div><div className="title">Course rapide</div><div className="subtitle">Ta liste adaptée par NOXAI</div></div>
      <div className="nox">NOX</div>
    </div></div></header>

    <main className="main">
      {['mode','setup','budget','prefs','review'].includes(step)&&(()=>{
        const wizardIndex=({mode:1,setup:2,budget:3,prefs:4,review:5} as Record<string,number>)[step]||1;
        return <div className="wizardProgress">
          <div className="wizardProgressLabel"><b>ÉTAPE {wizardIndex} / 5</b></div>
          <div className="wizardSegments">{[1,2,3,4,5].map(n=><span key={n} className={n<=wizardIndex?'on':''}/>)}</div>
        </div>
      })()}

      {step==='mode'&&<>
        <section className="wizardIntro">
          <h1>On part de quoi ?</h1>
          <p>Choisis comment NOX doit préparer tes courses.</p>
        </section>

        <div className="simpleChoices">
          <button className={`simpleChoice ${mode==='empty'?'on':''}`} onClick={()=>setMode('empty')}>
            <span className="choiceCopy"><strong>Frigo vide</strong><small>NOX crée toute ta liste de courses.</small></span>
            <span className="choiceRadio">{mode==='empty'?'✓':''}</span>
          </button>
          <button className={`simpleChoice ${mode==='complete'?'on':''}`} onClick={()=>setMode('complete')}>
            <span className="choiceCopy"><strong>Compléter mon frigo</strong><small>NOX achète uniquement ce qui manque.</small></span>
            <span className="choiceRadio">{mode==='complete'?'✓':''}</span>
          </button>
        </div>

        {mode==='complete'&&<div className="wizardCard compactCard">
          <div className="label">CE QUE TU AS DÉJÀ</div>
          <textarea className="input" value={fridgeText} onChange={e=>setFridgeText(e.target.value)} placeholder="Ex. riz, tomates, yaourts…"/>
        </div>}

        <div className="wizardProfile">Adapté automatiquement à ton profil NOX · <b>{goal}</b>{diet!=='Non renseigné'?` · ${diet}`:''}</div>
        <Footer next={()=>setStep('setup')} label="CONTINUER →"/>
      </>}

      {step==='setup'&&<>
        <section className="wizardIntro">
          <h1>Pour combien ?</h1>
          <p>Choisis la durée et le nombre de personnes.</p>
        </section>

        <div className="wizardCard">
          <div className="label">DURÉE DES COURSES</div>
          <div className="durationChoices">
            {[3,5,7].map(d=><button key={d} className={days===d?'on':''} onClick={()=>setDays(d)}>
              <strong>{d} jours</strong>
              <span className="choiceRadio">{days===d?'✓':''}</span>
            </button>)}
          </div>
        </div>

        <div className="wizardCard peopleCard">
          <div><div className="label">PERSONNES</div><strong className="peopleTitle">{people} personne{people>1?'s':''}</strong></div>
          <div className="peopleControl"><button onClick={()=>setPeople(Math.max(1,people-1))}>−</button><b>{people}</b><button onClick={()=>setPeople(Math.min(10,people+1))}>+</button></div>
        </div>

        <div className="wizardProfile">Les quantités seront adaptées automatiquement.</div>
        <Footer next={()=>setStep('budget')} label="CONTINUER →"/>
      </>}

      {step==='budget'&&<>
        <section className="wizardIntro">
          <h1>Quel est ton budget ?</h1>
          <p>Définis le budget maximum pour ces courses.</p>
        </section>

        <div className="budgetMockCard">
          <div className="budgetBig">{Math.round(Number.isFinite(budgetNumber)&&budgetNumber>0?budgetNumber:120).toLocaleString('fr-FR')} €</div>
          <input
            className="budgetRange"
            type="range"
            min="10"
            max="10000"
            step="10"
            value={Number.isFinite(budgetNumber)&&budgetNumber>0?Math.min(10000,Math.max(10,budgetNumber)):120}
            onChange={e=>setBudget(e.currentTarget.value)}
            style={{'--budget-fill':`${(((Number.isFinite(budgetNumber)&&budgetNumber>0?Math.min(10000,Math.max(10,budgetNumber)):120)-10)/9990)*100}%`} as React.CSSProperties}
          />
          <div className="budgetScale"><span>10 €</span><span>10 000 €</span></div>
          <div className="budgetStatus">
            <span className="statusBars"><i/><i/><i/></span>
            <span><b>{budgetNumber<50?'Budget serré':budgetNumber<150?'Budget équilibré':budgetNumber<500?'Budget confortable':'Budget large'}</b><small>NOX adaptera les quantités et les choix à ce maximum.</small></span>
          </div>
        </div>

        <div className="wizardProfile">Estimation NOXAI · ce ne sont pas des prix magasin.</div>
        <Footer next={()=>setStep('prefs')} label="CONTINUER →" disabled={!canContinueSetup}/>
      </>}

      {step==='prefs'&&<>
        <section className="wizardIntro">
          <h1>Des préférences ?</h1>
          <p>Indique ce qu’il faut prendre en compte.</p>
        </section>

        <div className="wizardCard prefsCard">
          <div className="prefBlock">
            <div className="label">RÉGIME ALIMENTAIRE</div>
            <div className="readonlyPref">{diet}</div>
          </div>
          <div className="prefBlock">
            <div className="label">ALLERGIES OU INTOLÉRANCES</div>
            <div className="chips cleanChips">{ALLERGIES.map(a=><button key={a} className={`chip ${allergies.includes(a)?'on':''}`} onClick={()=>toggleAllergy(a)}>{allergies.includes(a)?'✓ ':''}{a}</button>)}</div>
            <input className="input" value={otherAllergy} onChange={e=>setOtherAllergy(e.target.value)} placeholder="Autre allergie (optionnel)"/>
          </div>
          <div className="prefBlock">
            <div className="label">ALIMENTS À PRIVILÉGIER</div>
            <input className="input" value={likes} onChange={e=>setLikes(e.target.value)} placeholder="Ex. poulet, riz, brocoli…"/>
          </div>
          <div className="prefBlock">
            <div className="label">ALIMENTS À ÉVITER</div>
            <input className="input" value={dislikes} onChange={e=>setDislikes(e.target.value)} placeholder="Ex. poisson…"/>
          </div>
        </div>

        <div className="wizardProfile">Adapté automatiquement à ton profil NOX.</div>
        <Footer next={()=>setStep('review')} label="CONTINUER →"/>
      </>}

      {step==='review'&&<>
        <section className="wizardIntro">
          <h1>Récapitulatif</h1>
          <p>Vérifie tes choix avant de générer ta liste de courses.</p>
        </section>

        <div className="recapCard">
          <Row l="Mode" v={mode==='empty'?'Frigo vide':'Compléter mon frigo'}/>
          <Row l="Durée" v={`${days} jours`}/>
          <Row l="Personnes" v={String(people)}/>
          <Row l="Budget" v={`${budgetNumber.toLocaleString('fr-FR')} €`}/>
          <Row l="Régime" v={diet}/>
          <Row l="Allergies" v={allAllergies.join(', ')||'Aucune'}/>
          <Row l="À privilégier" v={likes||'Non renseigné'}/>
        </div>

        <div className="readyCard"><b>Tout est prêt !</b><span>NOX va générer une liste personnalisée avec des recettes adaptées.</span></div>
        <Footer next={generate} label="GÉNÉRER MA LISTE →"/>
      </>}

      {step==='generating'&&<div className="premiumGenerating">
        <div className="genBadge">✦ &nbsp; NOX ANALYSE TES DONNÉES</div>
        <h1>NOX prépare ta liste…</h1>
        <p className="genLead">Analyse de ton profil, de ton budget et de tes préférences pour créer une liste de courses personnalisée.</p>

        <div className="genPremiumCard">
          <div className="genPremiumRows">
            {[
              ['Analyse du profil NOX','Objectifs, préférences, allergies…'],
              ['Calcul des quantités','Adaptées à tes besoins'],
              ['Vérification des contraintes','Budget, préférences et disponibilités'],
              ['Optimisation du budget','Meilleures alternatives et équilibres'],
              ['Création de la liste','Derniers ajustements…']
            ].map(([title,sub],i)=>{
              const done=genStage>i;
              const active=genStage===i;
              return <div className={`genPremiumRow ${done?'done':''} ${active?'active':''}`} key={title}>
                <div className="genState">{done?'✓':active?'◌':'○'}</div>
                <div className="genRowCopy"><b>{title}</b><span>{sub}</span></div>
                <div className="genRowStatus">{done?'Terminé':active?'En cours…':'En attente'}</div>
              </div>
            })}
          </div>
          <div className="genPremiumProgress">
            <div className="genProgressTrack"><i style={{width:`${Math.min(100,genStage*20)}%`}}/></div>
            <b>{Math.min(5,genStage)} / 5 étapes</b>
          </div>
        </div>

        <div className="genSummary">
          <div><span className="genSummaryIcon">♙</span><p><b>{people} personne{people>1?'s':''}</b><small>Repas adaptés à ton profil</small></p></div>
          <div><span className="genSummaryIcon">▣</span><p><b>{days} jours</b><small>Menus variés et équilibrés</small></p></div>
          <div><span className="genSummaryIcon">€</span><p><b>~ {budgetNumber.toLocaleString('fr-FR')} €</b><small>Budget optimisé</small></p></div>
        </div>

        <div className="genTip"><span>✦</span><div><b>NOX optimise ta liste</b><small>Quantités, préférences et budget sont pris en compte automatiquement.</small></div></div>
      </div>}

      {step==='list'&&<>
        {error?<div className="warning"><b>La liste n’a pas pu être générée.</b><br/>{error}</div>:budgetNotice?<div className="budgetAlert"><div className="budgetAlertTop"><span className="budgetX">×</span><div><b>Budget très serré</b><p>{budgetNotice}</p></div></div><div className="budgetActions"><button onClick={()=>setBudget(String(Math.ceil(totalKnown)))}>UTILISER LE BUDGET NÉCESSAIRE · {Math.ceil(totalKnown)} €</button>{days>3&&<button onClick={()=>{setDays(days===7?5:3);setStep('review');}}>RÉDUIRE LA DURÉE · {days===7?5:3} JOURS</button>}<button onClick={()=>setStep('budget')}>MODIFIER MON BUDGET</button></div></div>:<div className="success"><b>✓ Liste générée</b><br/>{days} jours · {people} personne{people>1?'s':''}</div>}
        <div className="listTitle">Ma liste de courses</div><div className="listMeta">{items.length} produits · total estimé ≈ {totalKnown.toFixed(2)} € · budget {budgetNumber.toFixed(2)} €</div><div className="budgetHero"><div className="budgetHeroTop"><div><small>TOTAL ESTIMÉ</small><br/><strong>≈ {totalKnown.toFixed(2)} €</strong></div><small>Budget · {budgetNumber.toFixed(2)} €</small></div><div className="budgetLine"><div style={{width:`${Math.min(100,(totalKnown/Math.max(1,budgetNumber))*100)}%`}}/></div></div>
        <div className="catTabs"><button className={activeCategory==='Tous'?'on':''} onClick={()=>setActiveCategory('Tous')}>Tous ({items.length})</button>{grouped.map(g=><button key={g.category} className={activeCategory===g.category?'on':''} onClick={()=>setActiveCategory(g.category)}>{g.category} ({g.items.length})</button>)}</div>
        {grouped.filter(g=>activeCategory==='Tous'||g.category===activeCategory).map(g=><div className="group" key={g.category}><div className="groupHead"><b>{g.category}</b><span>{g.items.length} produits</span></div><div className="items">{g.items.map(it=><button className="item" key={it.id} onClick={()=>setItems(xs=>xs.map(x=>x.id===it.id?{...x,checked:!x.checked}:x))}><span><b style={{textDecoration:it.checked?'line-through':'none'}}>{it.name}</b><small>{it.qty}{it.note?` · ${it.note}`:''}</small></span><span className="price">{typeof it.price==='number'?`≈ ${it.price.toFixed(2)} €`:'—'}</span><span className={`check ${it.checked?'y':''}`}>{it.checked?'✓':''}</span></button>)}</div></div>)}
        {!error&&items.length>0&&<div className="actions">
          <button className="actionMain" onClick={async()=>{setStep('recipes');if(!recipes.length&&!recipesLoading)await generateRecipes(items);}}>VOIR MES RECETTES →</button>
          <button className="actionAlt" onClick={()=>setStep('shopping')}>COMMENCER MES COURSES</button>
        </div>}
      </>}

      {step==='recipes'&&(()=>{
        const readyCount=recipes.filter(r=>!!r.imageUrl).length;
        const filtered=recipes.filter(r=>r.category===activeRecipeCategory);
        const visible=filtered.filter(r=>!!r.imageUrl);
        const panelRecipe=selectedRecipe?.imageUrl ? selectedRecipe : visible[0] || null;
        const progressPct=Math.max(4,(readyCount/15)*100);

        const openRecipe=(r:Recipe)=>{
          setSelectedRecipe(r);
          if(window.innerWidth<900)setStep('recipe');
        };

        return <div className="premiumBook">
          <div className="bookJourney">
            <span>1. Paramètres</span><b>›</b><span>2. Liste de courses</span><b>›</b><strong>3. Ton livret</strong>
          </div>

          <div className="bookTop">
            <div className="bookIntro">
              <div className="eyebrow">TON LIVRET NOXAI</div>
              <h1>15 recettes avec tes ingrédients</h1>
              <p>Des idées simples, équilibrées et gourmandes, adaptées à tes courses, ton profil et tes objectifs.</p>
              <div className="bookBenefits">
                <span><i>♨</i><b>15 recettes</b><small>100% personnalisées</small></span>
                <span><i>⌁</i><b>Équilibrées</b><small>et gourmandes</small></span>
                <span><i>◷</i><b>Simples et rapides</b><small>au quotidien</small></span>
                <span><i>♡</i><b>Zéro gaspillage</b><small>avec tes ingrédients</small></span>
              </div>
            </div>

            <div className="bookGeneration">
              <div className="generationSpark">✦</div>
              <div className="generationCopy">
                <b>{readyCount===15?'Ton livret est prêt':'Génération en cours...'}</b>
                <span>{readyCount===15?'Tes 15 recettes et leurs photos sont disponibles.':'Les recettes et leurs photos apparaissent au fur et à mesure.'}</span>
                <div className="generationLine"><i style={{width:`${progressPct}%`}}/></div>
                <strong>{readyCount} / 15 prêtes</strong>
              </div>
            </div>
          </div>

          {recipesError&&<div className="warning">{recipesError}<div className="actions"><button className="actionMain" onClick={()=>generateRecipes(items)}>RELANCER LE LIVRET</button></div></div>}

          <div className="bookToolbar">
            <div className="premiumTabs">
              {(['Petit-déjeuner','Plat','Dessert & collation'] as const).map(category=>{
                const ready=recipes.filter(r=>r.category===category&&!!r.imageUrl).length;
                const label=category==='Petit-déjeuner'?'Petit-déjeuner':category==='Plat'?'Plats':'Desserts & collations';
                return <button key={category} className={activeRecipeCategory===category?'on':''} onClick={()=>setActiveRecipeCategory(category)}>{label} <span>({ready}/5)</span></button>
              })}
            </div>
          </div>

          <div className={`bookWorkspace ${panelRecipe?'hasPanel':''}`}>
            <div className="premiumRecipeGrid">
              {visible.map(r=><button key={r.id} className={`premiumRecipeCard ${panelRecipe?.id===r.id?'selected':''}`} onClick={()=>openRecipe(r)}>
                <div className="premiumRecipePhoto">
                  <img src={r.imageUrl} alt={r.title}/>
                  <span className={`premiumPill ${r.category==='Plat'?'green':'pink'}`}>{r.category==='Dessert & collation'?'Dessert':r.category}</span>
                  <span className="recipeHeart">♡</span>
                </div>
                <div className="premiumRecipeBody">
                  <h3>{r.title}</h3>
                  <div className="premiumMeta"><span>◷ {r.minutes} min</span><span>▥ {r.calories} kcal</span><span>♧ {r.protein} g</span></div>
                  <p>{r.description}</p>
                </div>
              </button>)}

              {Array.from({length:Math.max(0,5-visible.length)}).map((_,i)=><div className="premiumSkeleton" key={`premium-skeleton-${activeRecipeCategory}-${i}`}>
                <div className="premiumSkeletonPhoto"><span>✦</span><b>Bientôt disponible</b><small>Photo en cours de génération</small></div>
                <div className="premiumSkeletonBody"><i/><i/><i/></div>
              </div>)}
            </div>

            {panelRecipe&&<aside className="recipeSidePanel">
              <div className="sidePhoto"><img src={panelRecipe.imageUrl} alt={panelRecipe.title}/></div>
              <div className="sideContent">
                <div className="sideBadges"><span className="sideCategory">{panelRecipe.category}</span><span>✎ {panelRecipe.difficulty}</span><span>◷ {panelRecipe.minutes} min</span></div>
                <h2>{panelRecipe.title}</h2>
                <p>{panelRecipe.description}</p>
                <div className="sideMacros">
                  <span><b>{panelRecipe.calories}</b><small>kcal</small></span>
                  <span><b>{panelRecipe.protein} g</b><small>protéines</small></span>
                  <span><b>{panelRecipe.carbs} g</b><small>glucides</small></span>
                  <span><b>{panelRecipe.fat} g</b><small>lipides</small></span>
                </div>
                <h4>Ingrédients ({people} personne{people>1?'s':''})</h4>
                <div className="sideIngredients">{panelRecipe.ingredients.map((x,i)=><div key={`${x.name}-${i}`}><span>{x.name}</span><b>{x.qty}</b></div>)}</div>
                <h4>Étapes</h4>
                <div className="sideSteps">{panelRecipe.steps.map((x,i)=><div key={i}><b>{i+1}</b><span>{x}</span></div>)}</div>
                <div className="sideTip"><b>💡 Conseil NOXAI</b><span>{panelRecipe.tip}</span></div>
              </div>
            </aside>}
          </div>

          <div className="actions bookBottomAction"><button className="actionAlt" onClick={()=>setStep('shopping')}>PASSER EN MODE COURSES</button></div>
        </div>
      })()}
      {step==='recipe'&&selectedRecipe&&<>
        <div className="recipeDetail">
          <div className={`dishPhoto ${selectedRecipe.imageUrl?'':'empty'}`}>
            {selectedRecipe.imageUrl&&<img src={selectedRecipe.imageUrl} alt={selectedRecipe.title}/>}
            <div className="dishBadges"><span>◷ {selectedRecipe.minutes} min</span><span>{selectedRecipe.difficulty}</span><span>{people} portion{people>1?'s':''}</span></div>
          </div>
          <span className="recipeTag">{selectedRecipe.category}</span>
          <h1 className="recipeTitle">{selectedRecipe.title}</h1>
          <p className="recipeDesc">{selectedRecipe.description}</p>

          <div className="macroGrid">
            <div className="macro"><b>{selectedRecipe.calories}</b><small>KCAL</small></div>
            <div className="macro"><b>{selectedRecipe.protein} g</b><small>PROTÉINES</small></div>
            <div className="macro"><b>{selectedRecipe.carbs} g</b><small>GLUCIDES</small></div>
            <div className="macro"><b>{selectedRecipe.fat} g</b><small>LIPIDES</small></div>
          </div>

          <div className="recipePanel">
            <div className="sectionTitle">Ingrédients ({people} portion{people>1?'s':''})</div>
            {selectedRecipe.ingredients.map((x,i)=><div className="ingredientRow" key={`${x.name}-${i}`}><span className="ingredientName"><span className="ingredientDot">•</span><b>{x.name}</b></span><span>{x.qty}</span></div>)}
          </div>

          <div className="recipePanel">
            <div className="sectionTitle">Étapes de préparation</div>
            <div className="steps">{selectedRecipe.steps.map((x,i)=><div className="stepRow" key={i}><span className="stepNum">{i+1}</span><span>{x}</span></div>)}</div>
          </div>

          <div className="tipBox green"><b>Astuce NOXAI</b>{selectedRecipe.tip}</div>
          <div className="tipBox warm"><b>Variante</b>{selectedRecipe.variation}</div>

          <div className="recipeActions">
            <button className="black" onClick={()=>setStep('shopping')}>COMMENCER MES COURSES →</button>
            <button className="white" onClick={()=>setStep('recipes')}>VOIR LES AUTRES RECETTES</button>
          </div>
        </div>
      </>}

      {step==='shopping'&&<>
        <div className="shopTop"><div className="eyebrow">MODE COURSES</div><h1>Mes courses</h1><div className="shopProgress"><span>{items.filter(x=>x.checked).length} / {items.length} produits</span><span>{progress}%</span></div><div className="budgetLine"><div style={{width:`${progress}%`}}/></div></div>
        {grouped.map(g=><div className="group" key={g.category}><div className="groupHead"><b>{g.category}</b><span>{g.items.length} produits</span></div><div className="items">{g.items.map(it=><button className="item" key={it.id} onClick={()=>setItems(xs=>xs.map(x=>x.id===it.id?{...x,checked:!x.checked}:x))}><span><b style={{textDecoration:it.checked?'line-through':'none'}}>{it.name}</b><small>{it.qty}</small></span><span className="price">≈ {(it.price||0).toFixed(2)} €</span><span className={`check ${it.checked?'y':''}`}>{it.checked?'✓':''}</span></button>)}</div></div>)}
        <div className="footer"><div className="footerIn"><button className="secondary" onClick={()=>setStep('list')}>‹</button><button className="primary" disabled={progress<100} onClick={()=>setStep('done')}>{progress<100?`${progress}% COCHÉ`:'TERMINER MES COURSES →'}</button></div></div>
      </>}

      {step==='done'&&<div className="doneScreen"><div className="doneCheck">✓</div><h1>Courses terminées !</h1><p className="lead" style={{textAlign:'center'}}>{items.length} produits · ≈ {totalKnown.toFixed(2)} €<br/>Ton frigo est prêt pour environ {days} jours.</p><div className="actions"><button className="actionMain" onClick={()=>setStep('recipes')}>VOIR MES RECETTES</button><button className="actionAlt" onClick={()=>{setItems(xs=>xs.map(x=>({...x,checked:false})));setStep('shopping')}}>REFAIRE CETTE LISTE</button><button className="actionAlt" onClick={()=>navigate('/fuel')}>RETOUR À NUTRITION</button></div></div>}

    </main>
  </div>;
}

function Row({l,v}:{l:string;v:string}){return <div className="reviewRow"><span>{l}</span><b>{v}</b></div>}
function Footer({next,label,disabled=false}:{next:()=>void;label:string;disabled?:boolean}){
  return <div className="footer"><div className="footerIn"><button className="primary" disabled={disabled} onClick={next}>{label}</button></div></div>;
}
