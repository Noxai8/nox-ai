import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Bike, ChevronRight, Dumbbell, Flame, Footprints, MapPin, ScanLine, Timer, Watch } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from '../components/BottomNav';

const ACCENT='#B7FF00', BLACK='#0A0A0A', MUTED='#777', BORDER='#EAEAEA';

export default function ActivityHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activities,setActivities]=useState<any[]>([]);
  const [workouts,setWorkouts]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{ if(!user)return; (async()=>{
    const [a,w]=await Promise.all([
      supabase.from('activity_logs').select('*').eq('user_id',user.id).order('performed_at',{ascending:false}).limit(20),
      supabase.from('workouts').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(20),
    ]);
    setActivities(a.data||[]); setWorkouts(w.data||[]); setLoading(false);
  })(); },[user]);

  const today=new Date().toDateString();
  const todayActivities=activities.filter(a=>new Date(a.performed_at||a.created_at).toDateString()===today);
  const minutes=todayActivities.reduce((s,a)=>s+Number(a.duration_minutes||0),0);
  const distance=todayActivities.reduce((s,a)=>s+Number(a.distance_km||0),0);
  const calories=todayActivities.reduce((s,a)=>s+Number(a.calories_burned||0),0);
  const completed=workouts.filter(w=>w.status==='completed').length;

  const Metric=({icon:Icon,label,value}:{icon:any,label:string,value:string})=><div style={{background:'#fff',border:'1px solid '+BORDER,borderRadius:20,padding:16,minHeight:116}}><span style={{width:36,height:36,borderRadius:12,background:'#F3F3F3',display:'grid',placeItems:'center'}}><Icon size={18}/></span><div style={{fontSize:22,fontWeight:950,marginTop:15,letterSpacing:'-.03em'}}>{value}</div><div style={{fontSize:11,color:MUTED,marginTop:3}}>{label}</div></div>;

  return <div style={{minHeight:'100vh',background:'#F7F7F7',color:BLACK,paddingBottom:110}}>
    <main style={{maxWidth:560,margin:'0 auto',padding:'24px 18px'}}>
      <div style={{fontSize:10,fontWeight:900,letterSpacing:'.12em',color:MUTED}}>NOX · ACTIVITÉ</div>
      <h1 style={{fontSize:34,lineHeight:1,letterSpacing:'-.05em',margin:'8px 0 7px'}}>BOUGE. ENTRAÎNE-TOI.<br/>PROGRESSE.</h1>
      <p style={{margin:'0 0 22px',fontSize:13,color:MUTED,lineHeight:1.5}}>Ton activité quotidienne et tes entraînements NOX, réunis au même endroit.</p>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <Metric icon={Timer} label="Minutes actives aujourd’hui" value={loading?'—':String(Math.round(minutes))}/>
        <Metric icon={Flame} label="Calories actives enregistrées" value={loading?'—':String(Math.round(calories))}/>
        <Metric icon={MapPin} label="Distance enregistrée" value={loading?'—':distance.toFixed(1)+' km'}/>
        <Metric icon={Dumbbell} label="Séances terminées" value={loading?'—':String(completed)}/>
      </div>

      <button onClick={()=>navigate('/program')} style={{width:'100%',marginTop:14,border:0,borderRadius:20,background:BLACK,color:'#fff',padding:18,textAlign:'left',cursor:'pointer'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><span style={{width:42,height:42,borderRadius:14,background:ACCENT,color:BLACK,display:'grid',placeItems:'center'}}><Dumbbell size={21}/></span><ChevronRight/></div>
        <div style={{fontSize:19,fontWeight:950,marginTop:18}}>TRAINING NOX</div><div style={{fontSize:12,color:'#AAA',marginTop:5}}>Programme, séances, séries, répétitions, charges et historique.</div>
      </button>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:10}}>
        <button onClick={()=>navigate('/body?add=activity')} style={{border:'1px solid '+BORDER,borderRadius:18,background:'#fff',padding:16,textAlign:'left',cursor:'pointer'}}><Activity size={20}/><div style={{fontWeight:900,marginTop:12}}>Ajouter une activité</div><div style={{fontSize:11,color:MUTED,marginTop:4}}>Course, vélo, cardio…</div></button>
        <button onClick={()=>navigate('/food-scan',{state:{scanMode:'cardio'}})} style={{border:'1px solid '+BORDER,borderRadius:18,background:'#fff',padding:16,textAlign:'left',cursor:'pointer'}}><ScanLine size={20}/><div style={{fontWeight:900,marginTop:12}}>Scanner un écran cardio</div><div style={{fontSize:11,color:MUTED,marginTop:4}}>Passe par NOX Scan · tapis, vélo, rameur…</div></button>
      </div>

      <div style={{marginTop:24,fontSize:13,fontWeight:950}}>ACTIVITÉ RÉCENTE</div>
      <div style={{marginTop:10,background:'#fff',border:'1px solid '+BORDER,borderRadius:20,overflow:'hidden'}}>
        {activities.length===0?<div style={{padding:22,color:MUTED,fontSize:13}}>Aucune activité enregistrée pour le moment.</div>:activities.slice(0,6).map((a,i)=><div key={a.id||i} style={{padding:'15px 16px',borderBottom:i<Math.min(activities.length,6)-1?'1px solid '+BORDER:'none',display:'flex',alignItems:'center',gap:12}}><span style={{width:38,height:38,borderRadius:12,background:'#F3F3F3',display:'grid',placeItems:'center'}}>{String(a.activity_type||'').toLowerCase().includes('vélo')?<Bike size={18}/>:<Footprints size={18}/>}</span><div style={{flex:1}}><div style={{fontSize:13,fontWeight:850}}>{a.activity_type||'Activité'}</div><div style={{fontSize:11,color:MUTED,marginTop:3}}>{a.duration_minutes?Math.round(a.duration_minutes)+' min':''}{a.distance_km?' · '+Number(a.distance_km).toFixed(1)+' km':''}</div></div></div>)}
      </div>

      <button onClick={()=>navigate('/settings')} style={{width:'100%',marginTop:12,border:'1px solid '+BORDER,borderRadius:18,background:'#fff',padding:16,display:'flex',alignItems:'center',gap:12,cursor:'pointer',textAlign:'left'}}><Watch size={20}/><div style={{flex:1}}><div style={{fontWeight:900}}>Apps et appareils</div><div style={{fontSize:11,color:MUTED,marginTop:3}}>NOX Connect · synchronisation progressive</div></div><ChevronRight size={18}/></button>
    </main>
    <BottomNav active="activity"/>
  </div>;
}
