import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, Apple, Barcode, Camera, ChevronLeft, Dumbbell, QrCode, Refrigerator, ScanLine, Utensils, X, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const LIME='#B7FF00', BLACK='#090909', MUTED='#777', BORDER='#EAEAEA';
const MEALS=['Petit-déjeuner','Déjeuner','Dîner','Snacks'];
type ScanMode='meal'|'barcode'|'qr'|'equipment'|'cardio'|'menu'|'fridge';
const MODES:{id:ScanMode;label:string;detail:string;icon:any;accent:string}[]=[
 {id:'meal',label:'Scanner nourriture',detail:'Repas, plat, aliment',icon:Utensils,accent:'#24D66F'},
 {id:'barcode',label:'Scanner code-barres',detail:'Produit alimentaire',icon:Barcode,accent:'#A95CFF'},
 {id:'qr',label:'Scanner QR code',detail:'Recette, programme, ami, challenge…',icon:QrCode,accent:'#238CFF'},
 {id:'equipment',label:'Scanner une machine',detail:'Machine de musculation',icon:Dumbbell,accent:'#FF4E9A'},
 {id:'cardio',label:'Scanner un écran cardio',detail:'Tapis, vélo, rameur…',icon:Activity,accent:'#FF8A00'},
 {id:'menu',label:'Scanner un menu',detail:'Restaurant, livraison',icon:ScanLine,accent:'#FF8A00'},
 {id:'fridge',label:'Scanner mon frigo',detail:'Ingrédients et idées de repas',icon:Refrigerator,accent:'#18B8D8'},
];
const COPY:Record<ScanMode,{title:string;hint:string}> = {
 meal:{title:'Scanner nourriture',hint:'Place ton repas dans le cadre'},
 barcode:{title:'Scanner code-barres',hint:'Place le code-barres dans le cadre'},
 qr:{title:'Scanner QR code',hint:'Place le QR code dans le cadre'},
 equipment:{title:'Scanner une machine',hint:'Prends une photo de la machine entière'},
 cardio:{title:'Scanner un écran cardio',hint:'Cadre les chiffres affichés par la machine'},
 menu:{title:'Scanner un menu',hint:'Cadre le menu pour que le texte soit lisible'},
 fridge:{title:'Scanner mon frigo',hint:'Prends une photo claire des ingrédients visibles'},
};

export default function FoodScan(){
 const {user}=useAuth(); const navigate=useNavigate(); const location=useLocation();
 const requestedMode=(location.state as any)?.scanMode as ScanMode|undefined;
 const [mode,setMode]=useState<ScanMode|null>(requestedMode&&MODES.some(m=>m.id===requestedMode)?requestedMode:null); const [meal,setMeal]=useState((location.state as any)?.meal||'Déjeuner');
 const [photo,setPhoto]=useState<string|null>(null); const [result,setResult]=useState<any>(null); const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [barcodeManual,setBarcodeManual]=useState('');
 const input=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(requestedMode&&MODES.some(m=>m.id===requestedMode)){const timer=window.setTimeout(()=>input.current?.click(),180);return()=>window.clearTimeout(timer)}},[requestedMode]);
 const pick=(m:ScanMode)=>{setMode(m);setPhoto(null);setResult(null);setError('');setTimeout(()=>input.current?.click(),100)};
 const reset=()=>{setPhoto(null);setResult(null);setError('')};
 const onPhoto=(e:React.ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{const data=String(reader.result);setPhoto(data);void analyze(data.split(',')[1]||'')};reader.readAsDataURL(file);e.target.value=''};
 const lookupBarcode=async(code:string)=>{
  const clean=code.replace(/\D/g,'');
  if(!clean){setError('Entre un code-barres valide.');return}
  setBusy(true);setError('');setResult(null);
  try{const resp=await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(clean)}.json`);if(!resp.ok)throw new Error('Produit introuvable.');const data=await resp.json();const p=data?.product;if(!p)throw new Error('Produit introuvable dans Open Food Facts.');const n=p.nutriments||{};setResult({barcode:clean,description:p.product_name||p.generic_name||'Produit scanné',brand:p.brands||'',total:{kcal:Number(n['energy-kcal_100g']||0),protein:Number(n.proteins_100g||0),carbs:Number(n.carbohydrates_100g||0),fat:Number(n.fat_100g||0)}})}catch(e:any){setError(e.message||'Produit introuvable')}finally{setBusy(false)}
 };
 const analyze=async(base64:string)=>{
  setBusy(true);setError('');setResult(null);
  if(mode==='barcode'){
   try{
    if(!('BarcodeDetector' in window)) throw new Error("Le lecteur automatique n'est pas disponible sur cet appareil.");
    const blob=await (await fetch('data:image/jpeg;base64,'+base64)).blob();
    const bitmap=await createImageBitmap(blob);
    const detector=new (window as any).BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e']});
    const codes=await detector.detect(bitmap);
    const code=codes?.[0]?.rawValue;
    if(!code) throw new Error("Code-barres non détecté. Reprends la photo en cadrant uniquement le code.");
    await lookupBarcode(code);
   }catch(e:any){setError(e.message||"Lecture du code-barres impossible")}
   setBusy(false);return;
  }
  if(mode!=='meal'){setResult({pending:true});setBusy(false);return;}
  try{const {data:{session}}=await supabase.auth.getSession();const resp=await fetch('https://zpxrsmnpcyzafawlweyl.supabase.co/functions/v1/analyze-meal',{method:'POST',headers:{'Content-Type':'application/json',...(session?.access_token?{Authorization:`Bearer ${session.access_token}`}:{})},body:JSON.stringify({base64,mime:'image/jpeg'})});if(!resp.ok)throw new Error('Analyse indisponible');const data=await resp.json();if(data.error)throw new Error(data.error);setResult(data);}catch(e:any){setError(e.message||'Analyse impossible')}setBusy(false);
 };
 const addBarcode=async()=>{if(!result||!user)return;const t=result.total||{};const {error:e}=await supabase.from('food_entries').insert({user_id:user.id,meal_type:meal,food_name:result.description||'Produit scanné',calories:Math.round(t.kcal||0),protein:Number(t.protein||0),carbs:Number(t.carbs||0),fat:Number(t.fat||0),created_at:new Date().toISOString()});if(e)setError(e.message);else navigate('/fuel')};
 const addMeal=async()=>{if(!result||!user)return;const t=result.total||{};const {error:e}=await supabase.from('food_entries').insert({user_id:user.id,meal_type:meal,food_name:result.description||'Repas scanné',calories:Math.round(t.kcal??t.calories??0),protein:Number(t.protein||0),carbs:Number(t.carbs||0),fat:Number(t.fat||0),created_at:new Date().toISOString()});if(e)setError(e.message);else navigate('/fuel')};

 if(mode) return <div style={{minHeight:'100vh',background:BLACK,color:'#fff',display:'flex',flexDirection:'column'}}>
  <input ref={input} type="file" accept="image/*" capture="environment" onChange={onPhoto} style={{display:'none'}}/>
  <div style={{maxWidth:560,width:'100%',margin:'0 auto',minHeight:'100vh',display:'flex',flexDirection:'column',position:'relative',background:BLACK}}>
   <header style={{height:68,display:'grid',gridTemplateColumns:'48px 1fr 48px',alignItems:'center',padding:'0 14px',zIndex:2}}>
    <button onClick={()=>{setMode(null);reset()}} style={{border:0,background:'transparent',color:'#fff',display:'grid',placeItems:'center'}}><X size={24}/></button>
    <div style={{textAlign:'center',fontWeight:900,fontSize:14}}>{COPY[mode].title}</div><Zap size={19} style={{justifySelf:'center'}}/>
   </header>
   <div style={{flex:1,minHeight:460,position:'relative',overflow:'hidden',background:'#151515',display:'grid',placeItems:'center'}}>
    {photo?<img src={photo} alt="Scan NOX" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>:<div style={{textAlign:'center',color:'#555'}}><Camera size={54}/></div>}
    <div style={{position:'absolute',inset:'13% 9% 22%',border:'3px solid rgba(255,255,255,.9)',borderRadius:22,boxShadow:'0 0 0 999px rgba(0,0,0,.14)'}}/>
    <div style={{position:'absolute',bottom:28,left:20,right:20,textAlign:'center',fontSize:13,fontWeight:800,textShadow:'0 2px 8px #000'}}>{busy?'NOX analyse…':COPY[mode].hint}</div>
   </div>
   {mode==='meal'&&<div style={{display:'flex',gap:7,overflowX:'auto',padding:'11px 14px 0'}}>{MEALS.map(m=><button key={m} onClick={()=>setMeal(m)} style={{whiteSpace:'nowrap',border:'1px solid '+(meal===m?LIME:'#333'),borderRadius:99,background:meal===m?LIME:'#151515',color:meal===m?BLACK:'#aaa',padding:'7px 11px',fontSize:10,fontWeight:850}}>{m}</button>)}</div>}
   {mode==='barcode'&&<div style={{display:'flex',gap:8,padding:'11px 14px 0'}}><input value={barcodeManual} onChange={e=>setBarcodeManual(e.target.value)} inputMode="numeric" placeholder="EAN / UPC" style={{flex:1,minWidth:0,border:'1px solid #333',borderRadius:12,background:'#151515',color:'#fff',padding:'11px 12px',fontSize:12,outline:0}}/><button onClick={()=>void lookupBarcode(barcodeManual)} disabled={busy} style={{border:0,borderRadius:12,background:LIME,color:BLACK,padding:'0 14px',fontSize:10,fontWeight:950}}>RECHERCHER</button></div>}
      {error&&<div style={{margin:'10px 18px 0',padding:11,borderRadius:12,background:'#2b1010',color:'#ff8c8c',fontSize:11}}>{error}</div>}
   {result&&!busy&&mode==='meal'&&<div style={{background:'#fff',color:BLACK,borderRadius:'24px 24px 0 0',padding:'18px 18px 22px',marginTop:12}}>
    <div style={{fontSize:10,color:MUTED,fontWeight:900}}>RÉSULTAT · À VÉRIFIER</div><div style={{fontSize:19,fontWeight:950,marginTop:4}}>{result.description||'Repas détecté'}</div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginTop:13}}>{[['Calories',Math.round(result.total?.kcal||0)],['Protéines',Math.round(result.total?.protein||0)+'g'],['Glucides',Math.round(result.total?.carbs||0)+'g'],['Lipides',Math.round(result.total?.fat||0)+'g']].map(([l,v])=><div key={String(l)} style={{background:'#F6F6F6',borderRadius:12,padding:'10px 3px',textAlign:'center'}}><b style={{fontSize:15}}>{v}</b><div style={{fontSize:8.5,color:MUTED,marginTop:3}}>{l}</div></div>)}</div>
    <button onClick={addMeal} style={{width:'100%',border:0,borderRadius:12,background:LIME,padding:14,fontWeight:950,marginTop:14}}>AJOUTER À MA NUTRITION</button>
   </div>}
   {result&&!busy&&mode==='barcode'&&!result.pending&&<div style={{background:'#fff',color:BLACK,borderRadius:'24px 24px 0 0',padding:20,marginTop:12}}>
    <div style={{fontSize:10,color:MUTED,fontWeight:900}}>PRODUIT · À VÉRIFIER</div><div style={{fontSize:19,fontWeight:950,marginTop:4}}>{result.description}</div>{result.brand&&<div style={{fontSize:11,color:MUTED,marginTop:3}}>{result.brand}</div>}
    <div style={{fontSize:10,color:MUTED,marginTop:10}}>Valeurs pour 100 g · code {result.barcode}</div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginTop:10}}>{[['Calories',Math.round(result.total?.kcal||0)],['Protéines',Math.round(result.total?.protein||0)+'g'],['Glucides',Math.round(result.total?.carbs||0)+'g'],['Lipides',Math.round(result.total?.fat||0)+'g']].map(([l,v])=><div key={String(l)} style={{background:'#F6F6F6',borderRadius:12,padding:'10px 3px',textAlign:'center'}}><b style={{fontSize:15}}>{v}</b><div style={{fontSize:8.5,color:MUTED,marginTop:3}}>{l}</div></div>)}</div>
    <button onClick={addBarcode} style={{width:'100%',border:0,borderRadius:12,background:LIME,padding:14,fontWeight:950,marginTop:14}}>AJOUTER À MA NUTRITION</button>
   </div>}
   {result&&!busy&&mode!=='meal'&&mode!=='barcode'&&<div style={{background:'#fff',color:BLACK,borderRadius:'24px 24px 0 0',padding:20,marginTop:12}}><b>Scan capturé</b><div style={{fontSize:12,color:MUTED,lineHeight:1.5,marginTop:5}}>Le moteur {COPY[mode].title.toLowerCase()} sera branché ici. Aucune donnée n’est enregistrée sans vérification.</div></div>}
   <div style={{height:116,display:'grid',gridTemplateColumns:'1fr 90px 1fr',alignItems:'center',padding:'0 24px max(8px,env(safe-area-inset-bottom))'}}>
    <div/><button aria-label="Prendre la photo" onClick={()=>input.current?.click()} style={{width:72,height:72,borderRadius:'50%',background:'#fff',border:'5px solid #222',boxShadow:'0 0 0 3px #fff',justifySelf:'center',cursor:'pointer'}}/><button onClick={()=>{reset();input.current?.click()}} style={{border:0,background:'transparent',color:'#fff',fontSize:11,fontWeight:800}}>REPRENDRE</button>
   </div>
  </div>
 </div>;

 return <div style={{minHeight:'100vh',background:'#F7F7F7',color:BLACK,paddingBottom:30}}>
  <main style={{maxWidth:560,margin:'0 auto',padding:'18px'}}>
   <header style={{display:'grid',gridTemplateColumns:'44px 1fr 44px',alignItems:'center'}}><button onClick={()=>navigate(-1)} style={{border:0,background:'transparent',display:'grid',placeItems:'center'}}><ChevronLeft/></button><div style={{textAlign:'center',fontSize:24,fontWeight:950,letterSpacing:'-.05em'}}>NOX</div></header>
   <div style={{marginTop:24}}><h1 style={{fontSize:31,letterSpacing:'-.045em',margin:0}}>Scanner</h1><p style={{color:MUTED,fontSize:13,margin:'5px 0 18px'}}>Que veux-tu scanner ?</p></div>
   <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
    {MODES.slice(0,6).map(({id,label,detail,icon:Icon,accent})=><button key={id} onClick={()=>pick(id)} style={{minHeight:132,border:'1px solid '+BORDER,borderRadius:18,background:'#fff',padding:16,textAlign:'left',boxShadow:'0 5px 18px rgba(0,0,0,.035)',cursor:'pointer'}}><span style={{width:40,height:40,borderRadius:12,background:accent+'18',color:accent,display:'grid',placeItems:'center'}}><Icon size={21} strokeWidth={2.6}/></span><div style={{fontSize:13,fontWeight:950,lineHeight:1.15,marginTop:13}}>{label}</div><div style={{fontSize:10.5,color:MUTED,lineHeight:1.3,marginTop:4}}>{detail}</div></button>)}
   </div>
   {MODES.slice(6).map(({id,label,detail,icon:Icon,accent})=><button key={id} onClick={()=>pick(id)} style={{width:'100%',minHeight:76,border:'1px solid '+BORDER,borderRadius:18,background:'#fff',padding:'13px 16px',display:'flex',alignItems:'center',gap:13,textAlign:'left',boxShadow:'0 5px 18px rgba(0,0,0,.035)',marginTop:10,cursor:'pointer'}}><span style={{width:42,height:42,borderRadius:12,background:accent+'18',color:accent,display:'grid',placeItems:'center',flexShrink:0}}><Icon size={21}/></span><span><div style={{fontSize:13,fontWeight:950}}>{label}</div><div style={{fontSize:10.5,color:MUTED,marginTop:3}}>{detail}</div></span></button>)}
   <div style={{marginTop:22,padding:'14px 15px',borderRadius:16,background:BLACK,color:'#fff'}}><div style={{fontSize:10,fontWeight:950,letterSpacing:'.12em',color:LIME}}>NOX SCAN</div><div style={{fontSize:12,marginTop:5,lineHeight:1.45}}>Choisis le type de scan. NOX ouvre ensuite la caméra adaptée et te fait vérifier le résultat avant toute action.</div></div>
  </main>
 </div>
}