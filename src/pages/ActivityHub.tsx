import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Bike, ChevronRight, Dumbbell, Flame, Footprints, MapPin, Pencil, ScanLine, Timer, Trash2, Watch, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from '../components/BottomNav';

const ACCENT='#B7FF00', BLACK='#0A0A0A', MUTED='#777', BORDER='#EAEAEA';
type Range='day'|'week'|'month'|'year';
const RANGES:{id:Range;label:string;days:number}[]=[
  {id:'day',label:'Jour',days:1},{id:'week',label:'Semaine',days:7},{id:'month',label:'Mois',days:30},{id:'year',label:'Année',days:365},
];

function normalizeType(value:string){
  return String(value||'other').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')||'other';
}
function sourceLabel(value:any){
  const s=String(value||'manual');
  const labels:Record<string,string>={manual:'Manuel',machine_scan:'Scan machine',apple_health:'Apple Health',apple_watch:'Apple Watch',health_connect:'Health Connect',fitbit:'Fitbit',whoop:'WHOOP',garmin:'Garmin',nox_band:'NOX Band'};
  return labels[s]||s.replaceAll('_',' ');
}
function activityTime(a:any){return new Date(a.performed_at||a.created_at).getTime()}
function isLikelyDuplicate(a:any,b:any){
  const extA=String(a.external_id||a.source_record_id||'').trim(), extB=String(b.external_id||b.source_record_id||'').trim();
  if(extA&&extB&&extA===extB)return true;
  const dt=Math.abs(activityTime(a)-activityTime(b));
  const sameType=normalizeType(a.activity_type)===normalizeType(b.activity_type);
  const da=Math.abs(Number(a.duration_minutes||0)-Number(b.duration_minutes||0));
  const distA=Number(a.distance_km||0),distB=Number(b.distance_km||0);
  const kcalA=Number(a.calories_burned||0),kcalB=Number(b.calories_burned||0);
  const durationClose=da<=Math.max(2,Math.round(Math.max(Number(a.duration_minutes||0),Number(b.duration_minutes||0))*.08));
  const distanceClose=!distA||!distB||Math.abs(distA-distB)<=Math.max(.2,Math.max(distA,distB)*.05);
  const kcalClose=!kcalA||!kcalB||Math.abs(kcalA-kcalB)<=Math.max(25,Math.max(kcalA,kcalB)*.12);
  return sameType&&durationClose&&distanceClose&&kcalClose&&dt<=30*60*1000;
}
function dedupe(rows:any[]){
  const sorted=[...rows].sort((a,b)=>activityTime(b)-activityTime(a));
  const kept:any[]=[]; let duplicates=0;
  for(const row of sorted){if(kept.some(existing=>isLikelyDuplicate(row,existing))){duplicates++;continue}kept.push(row)}
  return {rows:kept,duplicates};
}

export default function ActivityHub(){
  const {user}=useAuth(); const navigate=useNavigate();
  const [activities,setActivities]=useState<any[]>([]); const [workouts,setWorkouts]=useState<any[]>([]);
  const [loading,setLoading]=useState(true); const [range,setRange]=useState<Range>('week'); const [filter,setFilter]=useState('all');
  const [selected,setSelected]=useState<any|null>(null); const [editing,setEditing]=useState(false); const [error,setError]=useState('');
  const [edit,setEdit]=useState({activity_type:'',duration_minutes:'',distance_km:'',calories_burned:'',notes:''});

  const load=async()=>{if(!user)return;setLoading(true);setError('');
    const [a,w]=await Promise.all([
      supabase.from('activity_logs').select('*').eq('user_id',user.id).order('performed_at',{ascending:false}).limit(2000),
      supabase.from('workouts').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(1000),
    ]);
    if(a.error)setError(a.error.message); if(w.error)setError(prev=>prev||w.error!.message);
    setActivities(a.data||[]);setWorkouts(w.data||[]);setLoading(false);
  };
  useEffect(()=>{void load()},[user]);

  const consolidated=useMemo(()=>dedupe(activities),[activities]);
  const cutoff=Date.now()-(RANGES.find(r=>r.id===range)?.days||7)*86400000;
  const ranged=consolidated.rows.filter(a=>activityTime(a)>=cutoff);
  const types=useMemo(()=>Array.from(new Set(consolidated.rows.map(a=>normalizeType(a.activity_type)))).sort(),[consolidated.rows]);
  const visible=ranged.filter(a=>filter==='all'||normalizeType(a.activity_type)===filter);
  const rangeWorkouts=workouts.filter(w=>(w.status==='completed'||w.completed_at)&&new Date(w.completed_at||w.created_at).getTime()>=cutoff);
  const minutes=Math.round(visible.reduce((s,a)=>s+Number(a.duration_minutes||0),0));
  const distance=visible.reduce((s,a)=>s+Number(a.distance_km||0),0);
  const calories=Math.round(visible.reduce((s,a)=>s+Number(a.calories_burned||0),0));
  const steps=Math.round(visible.reduce((s,a)=>s+Number(a.steps||0),0));
  const sources=useMemo(()=>Array.from(new Set(consolidated.rows.map(a=>String(a.source||'manual')))),[consolidated.rows]);

  const openDetail=(a:any)=>{setSelected(a);setEditing(false);setEdit({activity_type:String(a.activity_type||''),duration_minutes:String(a.duration_minutes||''),distance_km:a.distance_km==null?'':String(a.distance_km),calories_burned:a.calories_burned==null?'':String(a.calories_burned),notes:String(a.notes||'')})};
  const saveEdit=async()=>{if(!user||!selected)return;const duration=Number(edit.duration_minutes);if(!edit.activity_type.trim()||!Number.isFinite(duration)||duration<=0){setError('Type et durée valide requis.');return}
    const {error:e}=await supabase.from('activity_logs').update({activity_type:normalizeType(edit.activity_type),duration_minutes:Math.round(duration),distance_km:edit.distance_km===''?null:Number(edit.distance_km),calories_burned:edit.calories_burned===''?null:Math.round(Number(edit.calories_burned)),notes:edit.notes.trim()||null}).eq('id',selected.id).eq('user_id',user.id);
    if(e){setError(e.message);return}setSelected(null);setEditing(false);await load();
  };
  const remove=async()=>{if(!user||!selected)return;const {error:e}=await supabase.from('activity_logs').delete().eq('id',selected.id).eq('user_id',user.id);if(e){setError(e.message);return}setSelected(null);await load()};

  const Metric=({icon:Icon,label,value}:{icon:any,label:string,value:string})=><div style={{background:'#fff',border:'1px solid '+BORDER,borderRadius:18,padding:14}}><Icon size={17}/><div style={{fontSize:20,fontWeight:950,marginTop:11}}>{value}</div><div style={{fontSize:10,color:MUTED,marginTop:2}}>{label}</div></div>;

  return <div style={{minHeight:'100vh',background:'#F7F7F7',color:BLACK,paddingBottom:110}}>
    <main style={{maxWidth:560,margin:'0 auto',padding:'24px 18px'}}>
      <div style={{fontSize:10,fontWeight:900,letterSpacing:'.12em',color:MUTED}}>NOX · ACTIVITÉ</div>
      <h1 style={{fontSize:34,lineHeight:1,letterSpacing:'-.05em',margin:'8px 0 7px'}}>TOUTE TON ACTIVITÉ.<br/>UN SEUL ENDROIT.</h1>
      <p style={{margin:'0 0 18px',fontSize:12.5,color:MUTED,lineHeight:1.5}}>Activités, Training et données synchronisées sont consolidés sans double comptage.</p>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5,background:'#ECECEC',padding:4,borderRadius:14}}>
        {RANGES.map(r=><button key={r.id} onClick={()=>setRange(r.id)} style={{border:0,borderRadius:10,padding:'9px 3px',background:range===r.id?BLACK:'transparent',color:range===r.id?'#fff':MUTED,fontSize:10,fontWeight:900}}>{r.label}</button>)}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginTop:12}}>
        <Metric icon={Timer} label="Minutes actives" value={loading?'—':String(minutes)}/>
        <Metric icon={Flame} label="Calories enregistrées" value={loading?'—':String(calories)}/>
        <Metric icon={MapPin} label="Distance" value={loading?'—':distance.toFixed(1)+' km'}/>
        <Metric icon={Dumbbell} label="Séances terminées" value={loading?'—':String(rangeWorkouts.length)}/>
        {steps>0&&<Metric icon={Footprints} label="Pas importés" value={steps.toLocaleString('fr-FR')}/>}
      </div>

      <div style={{marginTop:12,background:BLACK,color:'#fff',borderRadius:18,padding:15}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:12}}><div><div style={{fontSize:10,color:ACCENT,fontWeight:950}}>NOX HEALTH ENGINE</div><div style={{fontSize:15,fontWeight:950,marginTop:3}}>CONSOLIDATION ACTIVE</div></div><div style={{textAlign:'right',fontSize:10,color:'#999'}}>{consolidated.duplicates} doublon(s)<br/>écarté(s)</div></div>
        <div style={{fontSize:10,color:'#888',lineHeight:1.45,marginTop:9}}>Les statistiques utilisent une seule occurrence des sessions similaires. Les données originales restent dans leur source.</div>
      </div>

      <button onClick={()=>navigate('/program')} style={{width:'100%',marginTop:12,border:0,borderRadius:18,background:'#fff',padding:15,display:'flex',alignItems:'center',gap:12,textAlign:'left'}}><span style={{width:40,height:40,borderRadius:13,background:ACCENT,display:'grid',placeItems:'center'}}><Dumbbell size={20}/></span><div style={{flex:1}}><b>Training NOX</b><div style={{fontSize:10.5,color:MUTED,marginTop:3}}>Programme, séances et performances</div></div><ChevronRight size={18}/></button>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginTop:9}}>
        <button onClick={()=>navigate('/body?add=activity')} style={{border:'1px solid '+BORDER,borderRadius:16,background:'#fff',padding:14,textAlign:'left'}}><Activity size={19}/><div style={{fontWeight:900,marginTop:9,fontSize:12}}>Ajouter</div></button>
        <button onClick={()=>navigate('/food-scan',{state:{scanMode:'cardio'}})} style={{border:'1px solid '+BORDER,borderRadius:16,background:'#fff',padding:14,textAlign:'left'}}><ScanLine size={19}/><div style={{fontWeight:900,marginTop:9,fontSize:12}}>Scanner cardio</div></button>
      </div>

      <div style={{marginTop:24,fontSize:10,fontWeight:950,letterSpacing:'.1em',color:MUTED}}>FILTRES</div>
      <div style={{display:'flex',gap:6,overflowX:'auto',padding:'9px 0 2px'}}>
        <button onClick={()=>setFilter('all')} style={{whiteSpace:'nowrap',border:'1px solid '+(filter==='all'?BLACK:BORDER),background:filter==='all'?BLACK:'#fff',color:filter==='all'?'#fff':BLACK,borderRadius:99,padding:'7px 11px',fontSize:10,fontWeight:850}}>Tout</button>
        {types.map(t=><button key={t} onClick={()=>setFilter(t)} style={{whiteSpace:'nowrap',border:'1px solid '+(filter===t?BLACK:BORDER),background:filter===t?BLACK:'#fff',color:filter===t?'#fff':BLACK,borderRadius:99,padding:'7px 11px',fontSize:10,fontWeight:850}}>{t.replaceAll('_',' ')}</button>)}
      </div>

      <div style={{marginTop:20,display:'flex',justifyContent:'space-between',alignItems:'end'}}><div style={{fontSize:13,fontWeight:950}}>HISTORIQUE</div><div style={{fontSize:10,color:MUTED}}>{visible.length} activité(s)</div></div>
      <div style={{marginTop:9,background:'#fff',border:'1px solid '+BORDER,borderRadius:18,overflow:'hidden'}}>
        {visible.length===0?<div style={{padding:22,color:MUTED,fontSize:12}}>Aucune activité sur cette période.</div>:visible.map((a,i)=><button key={a.id||i} onClick={()=>openDetail(a)} style={{width:'100%',border:0,borderBottom:i<visible.length-1?'1px solid '+BORDER:'none',background:'#fff',padding:'14px 15px',display:'flex',alignItems:'center',gap:11,textAlign:'left'}}>
          <span style={{width:38,height:38,borderRadius:12,background:'#F3F3F3',display:'grid',placeItems:'center'}}>{normalizeType(a.activity_type).includes('cycl')?<Bike size={18}/>:<Footprints size={18}/>}</span>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:12.5,fontWeight:900,textTransform:'capitalize'}}>{String(a.activity_type||'Activité').replaceAll('_',' ')}</div><div style={{fontSize:10,color:MUTED,marginTop:3}}>{new Date(a.performed_at||a.created_at).toLocaleDateString('fr-FR')} · {Math.round(Number(a.duration_minutes||0))} min · {sourceLabel(a.source)}</div></div><ChevronRight size={16}/>
        </button>)}
      </div>

      <div style={{marginTop:20,fontSize:10,fontWeight:950,letterSpacing:'.1em',color:MUTED}}>SOURCES</div>
      <div style={{marginTop:8,background:'#fff',border:'1px solid '+BORDER,borderRadius:18,padding:15}}>
        {sources.map(s=><div key={s} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',fontSize:11}}><b>{sourceLabel(s)}</b><span style={{color:MUTED}}>{consolidated.rows.filter(a=>String(a.source||'manual')===s).length}</span></div>)}
        <button onClick={()=>navigate('/settings')} style={{width:'100%',marginTop:8,border:0,borderRadius:12,background:'#F3F3F3',padding:11,display:'flex',alignItems:'center',gap:9,textAlign:'left'}}><Watch size={17}/><span style={{flex:1,fontSize:11,fontWeight:900}}>Gérer NOX Connect</span><ChevronRight size={16}/></button>
        <div style={{fontSize:9.5,color:MUTED,lineHeight:1.45,marginTop:9}}>Les imports automatiques apparaissent ici dès qu’un connecteur NOX Connect est réellement activé.</div>
      </div>
      {error&&<div style={{marginTop:12,padding:11,borderRadius:12,background:'#FFF0F0',color:'#A33',fontSize:11}}>{error}</div>}
    </main>

    {selected&&<div style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,.55)',display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
      <div style={{width:'100%',maxWidth:560,maxHeight:'88vh',overflowY:'auto',background:'#fff',borderRadius:'22px 22px 0 0',padding:'20px 20px max(24px,env(safe-area-inset-bottom))'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><div style={{fontSize:10,color:MUTED,fontWeight:900}}>DÉTAIL ACTIVITÉ</div><div style={{fontSize:20,fontWeight:950,marginTop:3,textTransform:'capitalize'}}>{String(selected.activity_type||'Activité').replaceAll('_',' ')}</div></div><button onClick={()=>setSelected(null)} style={{border:0,background:'#F3F3F3',width:36,height:36,borderRadius:12}}><X size={18}/></button></div>
        {!editing?<>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:16}}>
            <Metric icon={Timer} label="Minutes" value={String(Math.round(Number(selected.duration_minutes||0)))}/>
            <Metric icon={Flame} label="Calories" value={selected.calories_burned==null?'—':String(Math.round(Number(selected.calories_burned)))}/>
            <Metric icon={MapPin} label="Distance" value={selected.distance_km==null?'—':Number(selected.distance_km).toFixed(1)+' km'}/>
            <Metric icon={Watch} label="Source" value={sourceLabel(selected.source)}/>
          </div>
          <div style={{fontSize:11,color:MUTED,lineHeight:1.5,marginTop:13}}>{new Date(selected.performed_at||selected.created_at).toLocaleString('fr-FR')}{selected.notes?' · '+selected.notes:''}</div>
          <div style={{display:'flex',gap:8,marginTop:16}}><button onClick={()=>setEditing(true)} style={{flex:1,border:'1px solid '+BORDER,borderRadius:12,background:'#fff',padding:12,fontWeight:900}}><Pencil size={15} style={{verticalAlign:'middle',marginRight:6}}/>MODIFIER</button><button onClick={()=>void remove()} style={{border:0,borderRadius:12,background:'#FFF0F0',color:'#B22',padding:'12px 16px',fontWeight:900}}><Trash2 size={15}/></button></div>
        </>:<>
          <div style={{display:'grid',gap:9,marginTop:16}}>
            {([['activity_type','Type'],['duration_minutes','Durée (min)'],['distance_km','Distance (km)'],['calories_burned','Calories'],['notes','Notes']] as const).map(([key,label])=><label key={key} style={{fontSize:9.5,color:MUTED,fontWeight:850}}>{label.toUpperCase()}<input value={edit[key]} onChange={e=>setEdit(p=>({...p,[key]:e.target.value}))} type={key==='activity_type'||key==='notes'?'text':'number'} style={{width:'100%',boxSizing:'border-box',marginTop:5,border:'1px solid '+BORDER,borderRadius:11,padding:12,fontSize:13}}/></label>)}
          </div>
          <div style={{display:'flex',gap:8,marginTop:15}}><button onClick={()=>setEditing(false)} style={{flex:1,border:'1px solid '+BORDER,borderRadius:12,background:'#fff',padding:12,fontWeight:850}}>ANNULER</button><button onClick={()=>void saveEdit()} style={{flex:2,border:0,borderRadius:12,background:ACCENT,padding:12,fontWeight:950}}>ENREGISTRER</button></div>
        </>}
      </div>
    </div>}
    <BottomNav active="activity"/>
  </div>;
}
