import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from '../components/BottomNav';

const ACCENT='#B7FF00', BORDER='#EAEAEA', MUTED='#777';
type Item={id:string;name:string;done:boolean};

export default function ShoppingList(){
  const {user}=useAuth(); const navigate=useNavigate();
  const key=user?'nox_shopping_list_'+user.id:'nox_shopping_list';
  const [items,setItems]=useState<Item[]>([]); const [name,setName]=useState('');
  useEffect(()=>{if(!user)return;try{setItems(JSON.parse(localStorage.getItem(key)||'[]'))}catch{setItems([])}},[user,key]);
  const save=(next:Item[])=>{setItems(next);localStorage.setItem(key,JSON.stringify(next))};
  const add=()=>{const value=name.trim();if(!value)return;save([...items,{id:crypto.randomUUID(),name:value,done:false}]);setName('')};
  const remaining=useMemo(()=>items.filter(i=>!i.done).length,[items]);
  return <div style={{minHeight:'100vh',background:'#F7F7F7',color:'#0A0A0A',paddingBottom:100}}>
    <main style={{maxWidth:560,margin:'0 auto',padding:'20px 18px'}}>
      <header style={{display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>navigate('/fuel')} style={{width:40,height:40,border:'1px solid '+BORDER,borderRadius:13,background:'#fff',display:'grid',placeItems:'center'}}><ChevronLeft size={19}/></button>
        <div><div style={{fontSize:10,fontWeight:900,letterSpacing:'.12em',color:MUTED}}>NUTRITION · NOX</div><h1 style={{fontSize:26,margin:'3px 0 0',letterSpacing:'-.04em'}}>LISTE DE COURSES</h1></div>
      </header>
      <div style={{marginTop:20,background:'#0A0A0A',color:'#fff',borderRadius:20,padding:18}}>
        <ShoppingCart size={22} color={ACCENT}/><div style={{fontSize:24,fontWeight:950,marginTop:12}}>{remaining}</div><div style={{fontSize:11,color:'#999'}}>ARTICLE{remaining!==1?'S':''} À PRENDRE</div>
        <div style={{fontSize:10.5,color:'#777',lineHeight:1.45,marginTop:10}}>Ta liste reste privée sur cet appareil. Tu peux l’utiliser avec ton Meal Planner et tes recettes.</div>
      </div>
      <div style={{display:'flex',gap:8,marginTop:14}}>
        <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')add()}} placeholder="Ajouter un aliment ou produit" style={{flex:1,minWidth:0,padding:'13px 14px',border:'1px solid '+BORDER,borderRadius:13,background:'#fff',fontSize:13,outline:0}}/>
        <button onClick={add} aria-label="Ajouter" style={{width:48,border:0,borderRadius:13,background:ACCENT,display:'grid',placeItems:'center'}}><Plus size={20}/></button>
      </div>
      <div style={{marginTop:14,background:'#fff',border:'1px solid '+BORDER,borderRadius:18,overflow:'hidden'}}>
        {items.length===0?<div style={{padding:24,fontSize:12,color:MUTED,textAlign:'center'}}>Ta liste est vide. Ajoute ce qu’il te faut pour tes prochains repas.</div>:items.map((item,i)=><div key={item.id} style={{display:'flex',alignItems:'center',gap:11,padding:'13px 14px',borderBottom:i<items.length-1?'1px solid '+BORDER:'none'}}>
          <button onClick={()=>save(items.map(x=>x.id===item.id?{...x,done:!x.done}:x))} style={{width:28,height:28,borderRadius:9,border:'1px solid '+(item.done?ACCENT:BORDER),background:item.done?ACCENT:'#fff',display:'grid',placeItems:'center'}}>{item.done&&<Check size={15}/>}</button>
          <div style={{flex:1,fontSize:13,fontWeight:800,textDecoration:item.done?'line-through':'none',color:item.done?'#999':'#111'}}>{item.name}</div>
          <button onClick={()=>save(items.filter(x=>x.id!==item.id))} aria-label="Supprimer" style={{border:0,background:'transparent',color:'#999'}}><Trash2 size={16}/></button>
        </div>)}
      </div>
      {items.some(i=>i.done)&&<button onClick={()=>save(items.filter(i=>!i.done))} style={{width:'100%',marginTop:10,padding:12,border:'1px solid '+BORDER,borderRadius:12,background:'#fff',fontSize:10,fontWeight:900}}>SUPPRIMER LES ARTICLES COCHÉS</button>}
    </main>
    <BottomNav active="fuel"/>
  </div>
}