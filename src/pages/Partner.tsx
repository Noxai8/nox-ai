import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, ChevronRight, Copy, QrCode, UserPlus, Users, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from '../components/BottomNav';

const ACCENT='#B7FF00', BG='#F7F7F7', BORDER='#EAEAEA', MUTED='#777';

export default function Partner(){
  const {user}=useAuth(); const navigate=useNavigate(); const {code}=useParams();
  const [me,setMe]=useState<any>(null); const [friends,setFriends]=useState<any[]>([]);
  const [incoming,setIncoming]=useState<any[]>([]); const [preview,setPreview]=useState<any>(null);
  const [input,setInput]=useState(''); const [message,setMessage]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  const myCode=user?.id.slice(0,8).toUpperCase()||'';

  useEffect(()=>{if(user)void load()},[user]);
  useEffect(()=>{if(user&&code)void lookup(code)},[user,code]);

  const profileById=async(id:string)=>{const {data}=await supabase.rpc('nox_friend_profile',{code:id.slice(0,8)});return data?.[0]||null};

  const load=async()=>{
    if(!user)return;
    const [{data:p},{data:links},{data:reqs}]=await Promise.all([
      supabase.from('profiles').select('id, display_name, xp, streak_days').eq('id',user.id).maybeSingle(),
      supabase.from('friendships').select('*').or(`user_id.eq.${user.id},friend_id.eq.${user.id}`).order('created_at',{ascending:false}),
      supabase.from('friend_requests').select('*').eq('receiver_id',user.id).eq('status','pending').order('created_at',{ascending:false})
    ]);
    setMe(p);
    const friendIds=(links||[]).map((x:any)=>x.user_id===user.id?x.friend_id:x.user_id);
    const friendProfiles=await Promise.all(friendIds.map(profileById)); setFriends(friendProfiles.filter(Boolean));
    const requests=await Promise.all((reqs||[]).map(async(x:any)=>({...x,sender:await profileById(x.sender_id)}))); setIncoming(requests);
  };

  const lookup=async(raw:string)=>{
    if(!user)return; setError(''); setMessage(''); setPreview(null);
    const clean=raw.replace(/[^a-zA-Z0-9-]/g,'').slice(0,8).toUpperCase();
    if(clean.length<8){setError('Code ami incomplet.');return}
    const {data,error:e}=await supabase.rpc('nox_friend_profile',{code:clean});
    const found=data?.[0]; if(e||!found||found.id===user.id){setError(found?.id===user.id?'C’est ton propre code.':'Profil NOX introuvable.');return}
    setPreview(found);
  };

  const sendRequest=async()=>{
    if(!user||!preview||busy)return; setBusy(true); setError('');
    const already=friends.some(f=>f.id===preview.id); if(already){setError('Cette personne est déjà dans tes amis.');setBusy(false);return}
    const {error:e}=await supabase.from('friend_requests').insert({sender_id:user.id,receiver_id:preview.id,status:'pending'});
    if(e)setError(e.code==='23505'?'Une demande est déjà en attente.':e.message);
    else {setMessage('Demande d’ami envoyée.');setPreview(null);setInput('');}
    setBusy(false);
  };

  const respond=async(id:string,accept:boolean)=>{
    setBusy(true); setError('');
    const {error:e}=accept?await supabase.rpc('nox_accept_friend_request',{request_id:id}):await supabase.from('friend_requests').update({status:'declined',responded_at:new Date().toISOString()}).eq('id',id);
    if(e)setError(e.message); else await load(); setBusy(false);
  };

  const removeFriend=async(id:string)=>{const {error:e}=await supabase.rpc('nox_remove_friend',{friend:id});if(e)setError(e.message);else await load()};

  const copyInvite=async()=>{
    const value=`nox://friend/${myCode}`; try{if(navigator.share)await navigator.share({title:'Ajoute-moi sur NOX',text:`Ajoute-moi sur NOX : ${value}`});else await navigator.clipboard.writeText(value);setMessage('Invitation prête.');}catch{}
  };

  return <div style={{minHeight:'100vh',background:BG,color:'#0A0A0A',paddingBottom:100}}>
    <main style={{maxWidth:560,margin:'0 auto',padding:'24px 18px'}}>
      <div style={{fontSize:10,fontWeight:950,letterSpacing:'.12em',color:MUTED}}>NOX · SOCIAL</div>
      <h1 style={{fontSize:31,letterSpacing:'-.045em',margin:'7px 0 5px'}}>AMIS</h1>
      <p style={{fontSize:12,color:MUTED,lineHeight:1.5,margin:'0 0 18px'}}>Ajoute des amis sans exposer ton poids, ta nutrition, tes photos ou ta récupération.</p>

      <section style={{background:'#0A0A0A',color:'#fff',borderRadius:20,padding:18}}>
        <div style={{fontSize:10,color:ACCENT,fontWeight:950}}>TON INVITATION NOX</div>
        <div style={{fontSize:25,fontWeight:950,letterSpacing:'.12em',marginTop:7}}>{myCode}</div>
        <div style={{fontSize:10,color:'#999',marginTop:5}}>nox://friend/{myCode}</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:14}}>
          <button onClick={copyInvite} style={{border:0,borderRadius:11,background:ACCENT,padding:11,fontWeight:950}}><Copy size={15} style={{verticalAlign:'middle',marginRight:6}}/>PARTAGER</button>
          <button onClick={()=>navigate('/food-scan',{state:{scanMode:'qr'}})} style={{border:'1px solid #333',borderRadius:11,background:'#151515',color:'#fff',padding:11,fontWeight:900}}><QrCode size={15} style={{verticalAlign:'middle',marginRight:6}}/>SCANNER</button>
        </div>
      </section>

      <section style={{background:'#fff',border:'1px solid '+BORDER,borderRadius:18,padding:16,marginTop:12}}>
        <div style={{fontSize:12,fontWeight:950}}>AJOUTER UN AMI</div>
        <div style={{display:'flex',gap:8,marginTop:10}}><input value={input} onChange={e=>setInput(e.target.value.toUpperCase())} maxLength={8} placeholder="CODE AMI" style={{flex:1,minWidth:0,border:'1px solid '+BORDER,borderRadius:11,background:'#F7F7F7',padding:'12px',fontWeight:850,letterSpacing:'.08em'}}/><button onClick={()=>void lookup(input)} style={{border:0,borderRadius:11,background:ACCENT,padding:'0 15px',fontWeight:950}}>VOIR</button></div>
      </section>

      {preview&&<section style={{background:'#fff',border:'1px solid '+ACCENT,borderRadius:18,padding:16,marginTop:12}}>
        <div style={{fontSize:10,color:MUTED,fontWeight:900}}>PROFIL NOX</div><div style={{fontSize:19,fontWeight:950,marginTop:4}}>{preview.display_name||'Membre NOX'}</div>
        <div style={{fontSize:11,color:MUTED,marginTop:4}}>{preview.xp||0} XP · streak {preview.streak_days||0}</div>
        <button disabled={busy} onClick={()=>void sendRequest()} style={{width:'100%',border:0,borderRadius:11,background:ACCENT,padding:12,fontWeight:950,marginTop:12}}><UserPlus size={16} style={{verticalAlign:'middle',marginRight:6}}/>ENVOYER UNE DEMANDE</button>
      </section>}

      {incoming.length>0&&<section style={{marginTop:22}}><div style={{fontSize:12,fontWeight:950}}>DEMANDES REÇUES · {incoming.length}</div>{incoming.map(r=><div key={r.id} style={{display:'flex',alignItems:'center',gap:10,background:'#fff',border:'1px solid '+BORDER,borderRadius:15,padding:13,marginTop:8}}><div style={{flex:1}}><div style={{fontSize:13,fontWeight:900}}>{r.sender?.display_name||'Membre NOX'}</div><div style={{fontSize:10,color:MUTED,marginTop:2}}>veut t’ajouter à ses amis</div></div><button disabled={busy} onClick={()=>void respond(r.id,true)} style={{width:36,height:36,border:0,borderRadius:10,background:ACCENT}}><Check size={17}/></button><button disabled={busy} onClick={()=>void respond(r.id,false)} style={{width:36,height:36,border:'1px solid '+BORDER,borderRadius:10,background:'#fff'}}><X size={17}/></button></div>)}</section>}

      <section style={{marginTop:22}}><div style={{display:'flex',alignItems:'center',gap:7,fontSize:12,fontWeight:950}}><Users size={17}/>MES AMIS · {friends.length}</div>
        {friends.length===0?<div style={{background:'#fff',border:'1px solid '+BORDER,borderRadius:16,padding:18,color:MUTED,fontSize:12,marginTop:9}}>Aucun ami ajouté pour le moment.</div>:friends.map(f=><div key={f.id} style={{display:'flex',alignItems:'center',gap:10,background:'#fff',border:'1px solid '+BORDER,borderRadius:15,padding:14,marginTop:8}}><div style={{flex:1}}><div style={{fontSize:14,fontWeight:900}}>{f.display_name||'Membre NOX'}</div><div style={{fontSize:10,color:MUTED,marginTop:3}}>{f.xp||0} XP · streak {f.streak_days||0}</div></div><button onClick={()=>void removeFriend(f.id)} style={{border:0,background:'transparent',fontSize:10,color:MUTED}}>RETIRER</button><ChevronRight size={16}/></div>)}
      </section>
      {me&&<div style={{fontSize:9.5,color:'#999',lineHeight:1.45,marginTop:16}}>Profil social minimal uniquement. Les données sensibles restent privées par défaut.</div>}
      {message&&<div style={{marginTop:12,fontSize:11,fontWeight:800,color:'#5D8200'}}>{message}</div>}
      {error&&<div style={{marginTop:12,fontSize:11,fontWeight:800,color:'#C33'}}>{error}</div>}
    </main><BottomNav active="play"/>
  </div>;
}
