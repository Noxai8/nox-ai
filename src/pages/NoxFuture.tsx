import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Check, ChevronRight, ImagePlus, Lock, RotateCcw, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#C8FF00';
const BG = '#F7F8F4';
const WHITE = '#FFFFFF';
const BLACK = '#0B0B0B';
const MUTED = '#777D74';
const BORDER = '#E7EAE2';

type Step = 'intro' | 'consent' | 'photo' | 'goal' | 'generating' | 'result';

export default function NoxFuture() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const onboardingFlow = Boolean((location.state as any)?.onboarding);

  const [step, setStep] = useState<Step>(onboardingFlow ? 'consent' : 'intro');
  const [profile, setProfile] = useState<any>(null);
  const [photos, setPhotos] = useState<{ face?: string; side?: string; back?: string }>({});
  const [angle, setAngle] = useState<'face'|'side'|'back'>('face');
  const [goal, setGoal] = useState('');
  const [projection, setProjection] = useState<any>(null);
  const [error, setError] = useState('');
  const [credits, setCredits] = useState({ used: 0, max: 1, canGenerate: true });

  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream|null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState<0 | 5 | 10>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(({data}) => {
      setProfile(data);
      const plan = data?.subscription_plan || 'free';
      const max = ({free:1,nox:1,pro:999,ultra:999} as Record<string,number>)[plan] || 1;
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      supabase.from('future_you_generations').select('id,prompt,projection_text,created_at').eq('user_id',user.id).gte('created_at',monthStart)
        .then(({data: rows}) => {
          const used=rows?.length||0;
          setCredits({used,max,canGenerate:max>=999||used<max});
        });
    });
  },[user]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(t=>t.stop());
    if (countdownIntervalRef.current !== null) window.clearInterval(countdownIntervalRef.current);
  },[]);

  const stopCamera=()=>{
    if(countdownIntervalRef.current!==null){
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current=null;
    }
    setCountdown(null);
    streamRef.current?.getTracks().forEach(t=>t.stop());
    streamRef.current=null;
    setCameraOpen(false);
  };

  const openCamera=async(a:'face'|'side'|'back')=>{
    setAngle(a); setError('');
    try{
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1080},height:{ideal:1440}},audio:false});
      streamRef.current=stream; setCameraOpen(true);
      setTimeout(()=>{if(videoRef.current){videoRef.current.srcObject=stream; videoRef.current.play().catch(()=>{});}},50);
    }catch{
      inputRef.current?.click();
    }
  };

  const capture=()=>{
    const v=videoRef.current;
    if(!v?.videoWidth) return;
    const c=document.createElement('canvas');
    c.width=v.videoWidth;c.height=v.videoHeight;
    c.getContext('2d')?.drawImage(v,0,0,c.width,c.height);
    setPhotos(p=>({...p,[angle]:c.toDataURL('image/jpeg',.86)}));
    stopCamera();
  };

  const triggerCapture=()=>{
    if(countdown!==null) return;
    if(timerSeconds===0){
      capture();
      return;
    }

    let remaining=timerSeconds;
    setCountdown(remaining);
    countdownIntervalRef.current=window.setInterval(()=>{
      remaining-=1;
      if(remaining<=0){
        if(countdownIntervalRef.current!==null) window.clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current=null;
        setCountdown(null);
        capture();
      }else{
        setCountdown(remaining);
      }
    },1000);
  };

  const importPhoto=(e:ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0]; if(!f)return;
    const reader=new FileReader();
    reader.onload=()=>setPhotos(p=>({...p,[angle]:String(reader.result)}));
    reader.readAsDataURL(f); e.target.value='';
  };

  const generate=async()=>{
    if(!user||!goal.trim())return;
    setError('');setStep('generating');
    try{
      const {data:{session}}=await supabase.auth.getSession();
      const prompt=`Tu es NOX. Crée une projection visuelle illustrative cohérente avec l'objectif déclaré.
Conserve l'identité, le visage, la carnation, les cheveux, la pose et les proportions générales de la personne.
Les changements corporels doivent rester modérés et plausibles. Ne garantis aucun résultat ni délai.
Objectif principal : ${profile?.goal_type||'transformation physique'}
Description de l'utilisateur : ${goal}
Réponds avec un JSON court contenant titre, tagline et message_coach.`;

      const response=await fetch('https://zpxrsmnpcyzafawlweyl.supabase.co/functions/v1/nox-future',{
        method:'POST',
        headers:{'Content-Type':'application/json',...(session?.access_token?{Authorization:`Bearer ${session.access_token}`}:{})},
        body:JSON.stringify({
          prompt,
          photos,
          source_image:photos.face||photos.side||photos.back||null,
          goal_description:goal,
          objective:profile?.goal_type||'transformation physique',
          request_visual_projection:Boolean(photos.face||photos.side||photos.back),
        }),
      });
      const data=await response.json().catch(()=>null);
      if(!response.ok) throw new Error(data?.error?.message||data?.error||`Erreur serveur (${response.status})`);

      const text=data?.data?.content?.[0]?.text||data?.content?.[0]?.text||data?.text||'';
      let parsed:any={};
      try{const m=text.match(/\{[\s\S]*\}/);parsed=m?JSON.parse(m[0]):{};}catch{}
      parsed.projected_image=data?.projected_image||data?.image_url||data?.output_image||data?.data?.projected_image||data?.data?.image_url||null;
      parsed.titre=parsed.titre||'TON NOX FUTURE';
      parsed.tagline=parsed.tagline||'Une vision possible de ton objectif.';
      parsed.message_coach=parsed.message_coach||'Cette projection est un repère visuel. Le programme NOX sera construit autour de ton profil, de tes contraintes et de ton objectif.';
      setProjection(parsed);

      // Sauvegarder génération complète — texte + photo + objectif
      const sourcePhoto = photos.face || photos.side || photos.back || null;
      const {error:saveError}=await supabase.from('future_you_generations').insert({
        user_id: user.id,
        source_photo_url: sourcePhoto ? sourcePhoto.slice(0,2000) : null,
        generated_image_url: null,
        projection_months: 3,
        prompt: goal,
        projection_text: typeof parsed === 'string' ? parsed : JSON.stringify(parsed),
        status: 'completed',
        created_at: new Date().toISOString(),
      });
      if(saveError) console.warn('NOX Future : historique non sauvegardé', saveError);
      setCredits(c=>({...c,used:c.used+1,canGenerate:c.max>=999||c.used+1<c.max}));
      setStep('result');
    }catch(e:any){
      console.error('NOX Future generation error:',e);
      setError(e?.message||'La génération a échoué. Réessaie.');
      setStep('goal');
    }
  };

  const continueFlow=()=> navigate('/generate-program',{state:{fromFuture:true,goalDescription:goal}});

  return <div style={{minHeight:'100dvh',background:BG,color:BLACK,paddingBottom:onboardingFlow?24:86}}>
    <input ref={inputRef} type="file" accept="image/*" hidden onChange={importPhoto}/>

    {cameraOpen&&<div style={{position:'fixed',inset:0,zIndex:999,background:'#000',display:'flex',flexDirection:'column'}}>
      <div style={{padding:18,display:'flex',justifyContent:'space-between',color:'#fff'}}><b>PHOTO {angle==='face'?'DE FACE':angle==='side'?'DE PROFIL':'DE DOS'}</b><button onClick={stopCamera} style={closeBtn}>×</button></div>
      <div style={{flex:1,margin:'0 14px',borderRadius:24,overflow:'hidden',position:'relative'}}>
        <video ref={videoRef} muted playsInline style={{width:'100%',height:'100%',objectFit:'cover',transform:'scaleX(-1)'}}/>
        <div style={{position:'absolute',inset:'7% 17%',border:'1px solid rgba(255,255,255,.4)',borderRadius:80}}/>
        {countdown!==null&&<div style={{position:'absolute',inset:0,display:'grid',placeItems:'center',background:'rgba(0,0,0,.22)',color:'#fff',fontSize:'clamp(90px,30vw,160px)',fontWeight:950,textShadow:'0 4px 30px rgba(0,0,0,.35)'}}>{countdown}</div>}
      </div>
      <div style={{padding:18}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
          {([0,5,10] as const).map(seconds=><button key={seconds} onClick={()=>setTimerSeconds(seconds)} disabled={countdown!==null}
            style={{minHeight:42,borderRadius:13,border:`1px solid ${timerSeconds===seconds?ACCENT:'#333'}`,background:timerSeconds===seconds?ACCENT:'#171717',color:timerSeconds===seconds?BLACK:'#fff',fontSize:11,fontWeight:900}}>
            {seconds===0?'DIRECT':`${seconds} SEC`}
          </button>)}
        </div>
        <button onClick={triggerCapture} disabled={countdown!==null} style={primary(countdown===null)}>
          {countdown!==null?`PHOTO DANS ${countdown}...`:'PRENDRE LA PHOTO'} <Camera size={18}/>
        </button>
      </div>
    </div>}

    <Top step={step} back={()=>setStep(step==='photo'?'consent':step==='goal'?'photo':'intro')}/>

    <main style={{maxWidth:560,margin:'0 auto',padding:'28px 20px'}}>
      {step==='intro'&&<>
        <Eyebrow>NOX FUTURE</Eyebrow>
        <Title>Vois où tu veux aller.</Title>
        <Text>Une photo actuelle, ton objectif, puis une projection IA illustrative. NOX construit ensuite le chemin autour de ton profil.</Text>
        <div style={{background:BLACK,borderRadius:30,padding:24,color:'#fff',margin:'30px 0'}}>
          <Sparkles size={28} color={ACCENT}/>
          <h2 style={{fontSize:24,lineHeight:1.05,margin:'18px 0 10px'}}>TON OBJECTIF.<br/>VISUALISÉ.</h2>
          <p style={{color:'#999',fontSize:13,lineHeight:1.6,margin:0}}>La projection n’est pas une prédiction. Elle représente une possibilité visuelle liée à l’objectif que tu décris.</p>
        </div>
        {!credits.canGenerate?<div style={notice}>Tu as utilisé ta projection disponible ce mois-ci.</div>:<button onClick={()=>setStep('consent')} style={primary(true)}>CRÉER MON NOX FUTURE <ChevronRight size={18}/></button>}
      </>}

      {step==='consent'&&<>
        <Eyebrow>CONFIDENTIALITÉ</Eyebrow><Title>Ta photo. Ton choix.</Title>
        <Text>La photo est utilisée pour générer ta projection NOX Future. La projection reste illustrative et ne garantit pas ton apparence future.</Text>
        <div style={{display:'grid',gap:10,margin:'26px 0'}}>
          <Info icon={<Lock size={17}/>} title="Utilisation ciblée">Ta photo peut être envoyée au service NOX Future pour produire la projection.</Info>
          <Info icon={<Sparkles size={17}/>} title="Projection illustrative">Le résultat réel dépend de nombreux facteurs et peut être différent.</Info>
        </div>
        <button onClick={()=>setStep('photo')} style={primary(true)}>J’ACCEPTE — CONTINUER <ChevronRight size={18}/></button>
      </>}

      {step==='photo'&&<>
        <Eyebrow>TA PHOTO ACTUELLE</Eyebrow><Title>Ton point de départ.</Title>
        <Text>Pour la projection visuelle, ajoute au minimum une photo de face, en pied, nette et bien éclairée.</Text>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:9,margin:'26px 0 14px'}}>
          {(['face','side','back'] as const).map((a,i)=><PhotoCard key={a} label={['FACE','PROFIL','DOS'][i]} src={photos[a]} onClick={()=>openCamera(a)}/>)}
        </div>
        <button onClick={()=>{setAngle('face');inputRef.current?.click();}} style={secondary}><ImagePlus size={16}/> IMPORTER DEPUIS LE TÉLÉPHONE</button>
        <div style={{height:12}}/>
        <button onClick={()=>setStep('goal')} disabled={!photos.face} style={primary(Boolean(photos.face))}>CONTINUER <ChevronRight size={18}/></button>
      </>}

      {step==='goal'&&<>
        <Eyebrow>TON PHYSIQUE IDÉAL</Eyebrow><Title>Décris la direction.</Title>
        <Text>Décris ce que tu souhaites améliorer. NOX utilisera ce texte comme direction visuelle, pas comme une promesse de résultat.</Text>
        <textarea value={goal} onChange={e=>setGoal(e.target.value)} placeholder="Ex. Je souhaite une silhouette plus athlétique, davantage de définition au niveau du haut du corps et une taille plus affinée..."
          style={{width:'100%',minHeight:170,boxSizing:'border-box',border:`1.5px solid ${BORDER}`,borderRadius:22,background:WHITE,padding:18,font:'inherit',fontSize:15,lineHeight:1.55,outline:'none',resize:'vertical'}}/>
        <div style={{display:'flex',gap:7,flexWrap:'wrap',margin:'12px 0 24px'}}>
          {['Plus athlétique','Plus musclé','Plus défini','Taille plus affinée'].map(x=><button key={x} onClick={()=>setGoal(g=>g?`${g}, ${x.toLowerCase()}`:x)} style={chip}>+ {x}</button>)}
        </div>
        {error&&<div style={{...notice,color:'#A52116',background:'#FFF1EF',borderColor:'#FFD4CE'}}>{error}</div>}
        <button onClick={generate} disabled={!goal.trim()} style={primary(Boolean(goal.trim()))}>GÉNÉRER MON NOX FUTURE <Sparkles size={18}/></button>
      </>}

      {step==='generating'&&<div style={{paddingTop:70,textAlign:'center'}}>
        <div style={{width:72,height:72,borderRadius:24,background:BLACK,color:ACCENT,display:'grid',placeItems:'center',margin:'0 auto 24px'}}><Sparkles size={30}/></div>
        <Eyebrow>INTELLIGENCE NOX</Eyebrow><Title>Création en cours.</Title>
        <Text>Analyse de ta photo, compréhension de ton objectif et génération de ta projection.</Text>
        {['Analyse de la photo','Compréhension de ton objectif','Création de la projection'].map((x,i)=><div key={x} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 0',borderBottom:`1px solid ${BORDER}`,fontSize:13,fontWeight:750}}><Check size={16} color={i===0?'#78A000':'#B8BDB4'}/>{x}</div>)}
      </div>}

      {step==='result'&&projection&&<>
        <Eyebrow>TON NOX FUTURE</Eyebrow><Title>La destination.</Title>
        <Text>{projection.tagline}</Text>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,margin:'25px 0'}}>
          <ResultImage src={photos.face} label="AUJOURD’HUI"/>
          <ResultImage src={projection.projected_image} label="PROJECTION IA" accent/>
        </div>
        <div style={{background:WHITE,border:`1px solid ${BORDER}`,borderRadius:22,padding:18,marginBottom:12}}>
          <Eyebrow>MESSAGE NOX</Eyebrow><div style={{fontSize:14,lineHeight:1.65,fontWeight:650}}>{projection.message_coach}</div>
        </div>
        <div style={notice}>Projection IA illustrative et non garantie. Elle représente un scénario visuel possible ; ton évolution réelle peut être différente.</div>
        <button onClick={continueFlow} style={{...primary(true),marginTop:18}}>CONSTRUIRE LE CHEMIN <ChevronRight size={18}/></button>
        {!onboardingFlow&&<button onClick={()=>{setProjection(null);setGoal('');setPhotos({});setStep('consent')}} style={{...secondary,marginTop:10}}><RotateCcw size={16}/> NOUVELLE PROJECTION</button>}
      </>}
    </main>
    {!onboardingFlow&&step!=='generating'&&<BottomNav active="future"/>}
  </div>;
}

function Top({step,back}:{step:Step;back:()=>void}){
  if(step==='generating'||step==='result'||step==='intro')return <div style={{height:20}}/>;
  return <header style={{maxWidth:560,margin:'0 auto',padding:'20px 20px 0'}}><button onClick={back} style={{width:42,height:42,borderRadius:14,border:`1px solid ${BORDER}`,background:WHITE,display:'grid',placeItems:'center'}}><ArrowLeft size={18}/></button></header>;
}
function Eyebrow({children}:{children:ReactNode}){return <div style={{fontSize:10,fontWeight:950,letterSpacing:'.13em',color:'#949A90',marginBottom:10}}>{children}</div>}
function Title({children}:{children:ReactNode}){return <h1 style={{fontSize:'clamp(36px,10vw,48px)',lineHeight:.94,letterSpacing:'-.06em',margin:0,fontWeight:950}}>{children}</h1>}
function Text({children}:{children:ReactNode}){return <p style={{color:MUTED,fontSize:14,lineHeight:1.65,margin:'16px 0 0'}}>{children}</p>}
function Info({icon,title,children}:{icon:ReactNode;title:string;children:ReactNode}){return <div style={{display:'flex',gap:13,background:WHITE,border:`1px solid ${BORDER}`,borderRadius:18,padding:16}}><div style={{width:36,height:36,borderRadius:12,background:'#F0FFD0',display:'grid',placeItems:'center',flexShrink:0}}>{icon}</div><div><b style={{fontSize:13}}>{title}</b><div style={{fontSize:12,color:MUTED,lineHeight:1.5,marginTop:3}}>{children}</div></div></div>}
function PhotoCard({label,src,onClick}:{label:string;src?:string;onClick:()=>void}){return <button onClick={onClick} style={{aspectRatio:'3/4',border:`1.5px ${src?'solid':'dashed'} ${src?BLACK:'#CED2C9'}`,borderRadius:20,overflow:'hidden',padding:0,background:WHITE,position:'relative'}}>{src?<img src={src} alt={label} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<div style={{height:'100%',display:'grid',placeItems:'center'}}><div><Camera size={22}/><div style={{fontSize:9,fontWeight:900,marginTop:8}}>{label}</div></div></div>}</button>}
function ResultImage({src,label,accent=false}:{src?:string;label:string;accent?:boolean}){return <div><div style={{aspectRatio:'3/4',borderRadius:22,overflow:'hidden',background:'#ECEEE8',border:`2px solid ${accent?ACCENT:'transparent'}`}}>{src?<img src={src} alt={label} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<div style={{height:'100%',display:'grid',placeItems:'center',padding:14,textAlign:'center',fontSize:11,color:MUTED}}>Image indisponible</div>}</div><div style={{fontSize:9,fontWeight:950,letterSpacing:'.08em',textAlign:'center',marginTop:8,color:accent?'#779C00':MUTED}}>{label}</div></div>}
const primary=(enabled:boolean):CSSProperties=>({width:'100%',minHeight:60,border:0,borderRadius:18,padding:'0 18px',background:enabled?ACCENT:'#E1E4DD',color:enabled?BLACK:'#9EA39B',fontWeight:950,fontSize:13,display:'flex',alignItems:'center',justifyContent:'space-between',cursor:enabled?'pointer':'not-allowed'});
const secondary:CSSProperties={width:'100%',minHeight:52,border:`1px solid ${BORDER}`,borderRadius:16,padding:'0 16px',background:WHITE,color:BLACK,fontWeight:850,fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',gap:8};
const chip:CSSProperties={border:`1px solid ${BORDER}`,borderRadius:999,background:WHITE,padding:'9px 12px',fontSize:11,fontWeight:750,color:'#555'};
const notice:CSSProperties={padding:14,borderRadius:16,background:'#F0FFD0',border:'1px solid #DDF49B',fontSize:11,lineHeight:1.55,color:'#596600'};
const closeBtn:CSSProperties={width:38,height:38,borderRadius:20,border:'1px solid #333',background:'#171717',color:'#fff',fontSize:22};
