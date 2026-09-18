import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, Apple, Barcode, Camera, ChevronLeft, Dumbbell, QrCode, ScanLine, Snowflake, Utensils } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const ACCENT='#B7FF00', BLACK='#0A0A0A', MUTED='#777', BORDER='#E8E8E8';
const MEALS=['Petit-déjeuner','Déjeuner','Dîner','Snacks'];
type ScanMode='meal'|'barcode'|'qr'|'menu'|'fridge'|'equipment'|'cardio';

const MODES:{id:ScanMode;label:string;detail:string;icon:any}[]=[
 {id:'meal',label:'Repas',detail:'Aliments, portions et macros',icon:Utensils},
 {id:'barcode',label:'Code-barres',detail:'Produit emballé',icon:Barcode},
 {id:'qr',label:'QR code',detail:'Contenu NOX compatible',icon:QrCode},
 {id:'menu',label:'Menu',detail:'Plats et estimation nutritionnelle',icon:Apple},
 {id:'fridge',label:'Frigo',detail:'Ingrédients et idées de repas',icon:Snowflake},
 {id:'equipment',label:'Machine',detail:'Identifier et expliquer une machine',icon:Dumbbell},
 {id:'cardio',label:'Écran cardio',detail:'Lire durée, distance, calories…',icon:Activity},
];

export default function FoodScan(){
 const {user}=useAuth(); const navigate=useNavigate(); const location=useLocation();
 const [mode,setMode]=useState<ScanMode|null>(null); const [meal,setMeal]=useState((location.state as any)?.meal||'Déjeuner');
 const [photo,setPhoto]=useState<string|null>(null); const [result,setResult]=useState<any>(null); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
 const input=useRef<HTMLInputElement>(null);

 const pick=(m:ScanMode)=>{setMode(m);setPhoto(null);setResult(null);setError('');setTimeout(()=>input.current?.click(),120)};
 const onPhoto=(e:React.ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{const data=String(reader.result);setPhoto(data);void analyze(data.split(',')[1]||'')};reader.readAsDataURL(file);e.target.value=''};
 const analyze=async(base64:string)=>{
  setBusy(true);setError('');setResult(null);
  if(mode!=='meal'){setResult({pending:true});setBusy(false);return;}
  try{
   const {data:{session}}=await supabase.auth.getSession();
   const resp=await fetch('https://zpxrsmnpcyzafawlweyl.supabase.co/functions/v1/analyze-meal',{method:'POST',headers:{'Content-Type':'application/json',...(session?.access_token?{Authorization:`Bearer ${session.access_token}`}:{})},body:JSON.stringify({base64,mime:'image/jpeg'})});
   if(!resp.ok)throw new Error('Analyse indisponible');
   const data=await resp.json(); if(data.error)throw new Error(data.error);setResult(data);
  }catch(e:any){setError(e.message||'Analyse impossible');}
  setBusy(false);
 };
 const addMeal=async()=>{if(!result||!user)return;const t=result.total||{};const {error:e}=await supabase.from('food_entries').insert({user_id:user.id,meal_type:meal,food_name:result.description||'Repas scanné',calories:Math.round(t.kcal??t.calories??0),protein:Number(t.protein||0),carbs:Number(t.carbs||0),fat:Number(t.fat||0),created_at:new Date().toISOString()});if(e)setError(e.message);else navigate('/fuel')};

 const pendingText:Record<Exclude<ScanMode,'meal'>,string>={
  barcode:'Le scanner code-barres est déjà disponible depuis Nutrition. Cette entrée universelle sera reliée au même moteur produit.',
  qr:'QR NOX est préparé pour les repas partagés, recettes, challenges, programmes et contenus compatibles.',
  menu:'Analyse de menu : la capture est prête. Le moteur devra renvoyer des estimations clairement identifiées comme telles.',
  fridge:'Scan frigo : la capture est prête pour transformer les ingrédients visibles en idées de repas adaptées.',
  equipment:'Scan machine : NOX devra identifier la machine, afficher sa confiance puis ouvrir la fiche canonique et sa démo HD. En cas de doute, aucune invention.',
  cardio:'Scan écran cardio : NOX devra extraire les valeurs visibles, puis demander confirmation avant enregistrement avec source machine_scan et anti-doublon.',
 };

 return <div style={{minHeight:'100vh',background:'#F7F7F7',color:BLACK,paddingBottom:30}}>
  <input ref={input} type="file" accept="image/*" capture="environment" onChange={onPhoto} style={{display:'none'}}/>
  <main style={{maxWidth:560,margin:'0 auto',padding:'20px 18px'}}>
   <button onClick={()=>navigate(-1)} style={{border:0,background:'transparent',padding:6,cursor:'pointer'}}><ChevronLeft/></button>
   <div style={{fontSize:10,fontWeight:900,letterSpacing:'.12em',color:MUTED,marginTop:12}}>NOX SCAN</div>
   <h1 style={{fontSize:34,letterSpacing:'-.05em',lineHeight:1,margin:'7px 0'}}>UNE CAMÉRA.<br/>PLUSIEURS ACTIONS.</h1>
   <p style={{fontSize:13,color:MUTED,lineHeight:1.5,margin:'0 0 18px'}}>Prends une photo. NOX transforme ce que tu vois en action exploitable dans ton suivi.</p>
   <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9}}>
    {MODES.map(({id,label,detail,icon:Icon})=><button key={id} onClick={()=>pick(id)} style={{minHeight:112,border:'1px solid '+(mode===id?BLACK:BORDER),borderRadius:19,background:'#fff',padding:15,textAlign:'left',cursor:'pointer'}}><span style={{width:38,height:38,borderRadius:13,background:mode===id?ACCENT:'#F1F1F1',display:'grid',placeItems:'center'}}><Icon size={19}/></span><div style={{fontWeight:950,marginTop:12}}>{label}</div><div style={{fontSize:10.5,color:MUTED,marginTop:3,lineHeight:1.3}}>{detail}</div></button>)}
   </div>
   {mode==='meal'&&<div style={{display:'flex',gap:7,overflowX:'auto',marginTop:15}}>{MEALS.map(m=><button key={m} onClick={()=>setMeal(m)} style={{whiteSpace:'nowrap',border:'1px solid '+(meal===m?BLACK:BORDER),borderRadius:99,background:meal===m?BLACK:'#fff',color:meal===m?'#fff':BLACK,padding:'8px 11px',fontSize:11,fontWeight:800}}>{m}</button>)}</div>}
   {photo&&<img src={photo} alt="Capture à analyser" style={{width:'100%',maxHeight:300,objectFit:'contain',background:'#fff',borderRadius:20,marginTop:15,border:'1px solid '+BORDER}}/>}
   {busy&&<div style={{padding:24,textAlign:'center',fontWeight:900}}>Analyse en cours…</div>}
   {error&&<div style={{marginTop:12,padding:13,borderRadius:13,background:'#fff0f0',color:'#b42318',fontSize:12}}>{error}</div>}
   {result&&!busy&&mode==='meal'&&<div style={{background:'#fff',border:'1px solid '+BORDER,borderRadius:20,padding:17,marginTop:14}}><div style={{fontSize:10,fontWeight:900,color:MUTED}}>REPAS DÉTECTÉ · {result.fiabilite||'à vérifier'}</div><div style={{fontSize:18,fontWeight:950,marginTop:5}}>{result.description||'Repas'}</div><div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginTop:15,textAlign:'center'}}>{[['kcal',Math.round(result.total?.kcal||0)],['prot.',Math.round(result.total?.protein||0)+'g'],['gluc.',Math.round(result.total?.carbs||0)+'g'],['lip.',Math.round(result.total?.fat||0)+'g']].map(([l,v])=><div key={String(l)} style={{background:'#F5F5F5',borderRadius:12,padding:'10px 3px'}}><b>{v}</b><div style={{fontSize:9,color:MUTED,marginTop:3}}>{l}</div></div>)}</div><button onClick={addMeal} style={{width:'100%',border:0,borderRadius:14,background:ACCENT,padding:15,fontWeight:950,marginTop:15,cursor:'pointer'}}>VÉRIFIER → AJOUTER AU JOURNAL</button></div>}
   {result&&!busy&&mode&&mode!=='meal'&&<div style={{background:'#fff',border:'1px solid '+BORDER,borderRadius:20,padding:18,marginTop:14}}><div style={{display:'flex',alignItems:'center',gap:9,fontWeight:950}}><ScanLine size={19}/> FLUX NOX SCAN PRÉPARÉ</div><p style={{fontSize:12,color:MUTED,lineHeight:1.55,marginBottom:0}}>{pendingText[mode as Exclude<ScanMode,'meal'>]}</p></div>}
   {mode&&<button onClick={()=>input.current?.click()} style={{width:'100%',border:0,borderRadius:16,background:BLACK,color:'#fff',padding:17,fontWeight:950,marginTop:15,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><Camera size={19}/> {photo?'REPRENDRE UNE PHOTO':'OUVRIR LA CAMÉRA'}</button>}
  </main>
 </div>
}