import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Apple,
  BarChart3,
  Camera,
  Dumbbell,
  Droplets,
  House,
  Plus,
  Ruler,
  Scale,
  Search,
  ScanLine,
  Utensils,
} from 'lucide-react';

const ACCENT = '#B7FF00';
const BLACK = '#0A0A0A';
const MUTED = '#8A8A8A';

export function BottomNav({ active }: { active: string }) {
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');

  const items = [
    { id: 'home', label: "Aujourd’hui", icon: House, path: '/home' },
    { id: 'nutrition', label: 'Nutrition', icon: Apple, path: '/fuel' },
    { id: 'add', label: '+', icon: Plus, path: '' },
    { id: 'activity', label: 'Activité', icon: Activity, path: '/activity' },
    { id: 'progress', label: 'Progrès', icon: BarChart3, path: '/body' },
  ];

  const commands = [
    { label: 'Aujourd’hui', detail: 'Voir ma journée', path: '/home' },
    { label: 'Ajouter un repas', detail: 'Nutrition', path: '/fuel?add=meal' },
    { label: 'Scanner', detail: 'Nourriture, QR, machine, cardio…', path: '/food-scan' },
    { label: 'Ajouter de l’eau', detail: 'Hydratation', path: '/fuel?add=water' },
    { label: 'Ajouter mon poids', detail: 'Progrès', path: '/body?add=weight' },
    { label: 'Ajouter une activité', detail: 'Activité', path: '/activity?add=activity' },
    { label: 'Lancer un entraînement', detail: 'Training NOX', path: '/program' },
    { label: 'Ajouter une mensuration', detail: 'Progrès', path: '/body?add=measurement' },
    { label: 'Photo de progression', detail: 'Progrès', path: '/body?add=photo' },
    { label: 'Plan repas', detail: 'Planifier ma semaine', path: '/meal-planner' },
    { label: 'Recettes', detail: 'Nutrition', path: '/recipes' },
    { label: 'Liste de courses', detail: 'Nutrition', path: '/shopping-list' },
    { label: 'Jeûne', detail: 'Suivi optionnel', path: '/fasting' },
    { label: 'Bilan hebdomadaire', detail: 'Weekly Review', path: '/weekly-review' },
    { label: 'Progression', detail: 'XP, streaks et badges', path: '/play' },
    { label: 'Apps et appareils', detail: 'NOX Connect', path: '/settings' },
    { label: 'Notifications', detail: 'Préférences', path: '/notification-settings' },
  ];
  const normalized=query.trim().toLowerCase();
  const visibleCommands=commands.filter(c=>!normalized||(c.label+' '+c.detail).toLowerCase().includes(normalized)).slice(0,8);

  const actions = [
    { label: 'Repas', icon: Utensils, path: '/fuel?add=meal' },
    { label: 'Scanner', icon: ScanLine, path: '/food-scan' },
    { label: 'Aliment', icon: Apple, path: '/fuel?add=food' },
    { label: 'Eau', icon: Droplets, path: '/fuel?add=water' },
    { label: 'Poids', icon: Scale, path: '/body?add=weight' },
    { label: 'Activité', icon: Activity, path: '/activity?add=activity' },
    { label: 'Entraînement', icon: Dumbbell, path: '/program' },
    { label: 'Mensuration', icon: Ruler, path: '/body?add=measurement' },
    { label: 'Photo de progression', icon: Camera, path: '/body?add=photo' },
  ];

  return (
    <>
      {showSearch && (
        <div onClick={() => setShowSearch(false)} style={{ position:'fixed', inset:0, zIndex:210, background:'rgba(0,0,0,.42)', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:'max(22px, env(safe-area-inset-top))' }}>
          <div onClick={e=>e.stopPropagation()} style={{width:'calc(100% - 24px)',maxWidth:536,background:'#fff',borderRadius:22,padding:14,boxShadow:'0 22px 60px rgba(0,0,0,.2)'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,border:'1px solid #E8E8E8',background:'#F7F7F7',borderRadius:15,padding:'0 13px'}}>
              <Search size={18}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher dans NOX ou lancer une action…" style={{flex:1,border:0,outline:0,background:'transparent',padding:'14px 0',fontSize:13,color:BLACK}}/>
              <button onClick={()=>{setQuery('');setShowSearch(false)}} style={{border:0,background:'transparent',fontSize:20,color:MUTED}}>×</button>
            </div>
            <div style={{fontSize:9.5,fontWeight:950,letterSpacing:'.1em',color:MUTED,margin:'15px 4px 7px'}}>{normalized?'RÉSULTATS':'COMMANDES RAPIDES'}</div>
            <div style={{maxHeight:'62vh',overflowY:'auto'}}>
              {visibleCommands.map(cmd=><button key={cmd.label} onClick={()=>{setShowSearch(false);setQuery('');navigate(cmd.path)}} style={{width:'100%',border:0,borderBottom:'1px solid #F0F0F0',background:'#fff',padding:'12px 6px',display:'flex',alignItems:'center',gap:11,textAlign:'left',cursor:'pointer'}}>
                <span style={{width:34,height:34,borderRadius:11,background:ACCENT,display:'grid',placeItems:'center',flexShrink:0}}><Search size={15}/></span>
                <span style={{flex:1}}><span style={{display:'block',fontSize:12.5,fontWeight:900,color:BLACK}}>{cmd.label}</span><span style={{display:'block',fontSize:10.5,color:MUTED,marginTop:2}}>{cmd.detail}</span></span><span style={{fontSize:17,color:'#AAA'}}>›</span>
              </button>)}
              {!visibleCommands.length&&<div style={{padding:24,textAlign:'center',fontSize:12,color:MUTED}}>Aucun raccourci NOX trouvé.</div>}
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div
          onClick={() => setShowAdd(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 190, background: 'rgba(0,0,0,.42)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{ width: '100%', maxWidth: 560, background: '#fff', borderRadius: '26px 26px 0 0', padding: '10px 18px max(104px, calc(92px + env(safe-area-inset-bottom)))', boxShadow: '0 -20px 50px rgba(0,0,0,.16)' }}
          >
            <div style={{ width: 42, height: 4, borderRadius: 99, background: '#D8D8D8', margin: '2px auto 18px' }} />
            <div style={{ color: BLACK, fontSize: 20, fontWeight: 950, letterSpacing: '-.03em' }}>AJOUTER</div>
            <div style={{ color: MUTED, fontSize: 12, marginTop: 4, marginBottom: 12 }}>Enregistre quelque chose en quelques secondes.</div>
            <button onClick={()=>{setShowAdd(false);setShowSearch(true)}} style={{width:'100%',border:'1px solid #E8E8E8',background:'#F7F7F7',borderRadius:14,padding:'11px 13px',marginBottom:12,display:'flex',alignItems:'center',gap:9,color:BLACK,fontSize:11.5,fontWeight:850}}><Search size={17}/> Rechercher ou lancer une commande</button>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 9 }}>
              {actions.map(({ label, icon: Icon, path }) => (
                <button
                  key={label}
                  onClick={() => { setShowAdd(false); navigate(path); }}
                  style={{ minHeight: 92, borderRadius: 18, border: '1px solid #ECECEC', background: '#F8F8F8', color: BLACK, cursor: 'pointer', padding: '12px 7px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 9 }}
                >
                  <span style={{ width: 38, height: 38, borderRadius: 13, background: ACCENT, display: 'grid', placeItems: 'center' }}><Icon size={19} /></span>
                  <span style={{ fontSize: 10.5, fontWeight: 850, lineHeight: 1.15 }}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 0, zIndex: 200, width: '100%', maxWidth: 560, background: 'rgba(255,255,255,.96)', backdropFilter: 'blur(18px)', borderTop: '1px solid #ECECEC', padding: '7px 8px max(9px, env(safe-area-inset-bottom))' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', alignItems: 'end' }}>
          {items.map(({ id, label, icon: Icon, path }) => {
            const selected = active === id;
            const central = id === 'add';
            return (
              <button
                key={id}
                aria-label={central ? 'Ajouter' : label}
                onClick={() => central ? setShowAdd(true) : navigate(path)}
                style={{ border: 0, background: 'transparent', color: selected ? BLACK : '#777', cursor: 'pointer', minWidth: 0, padding: central ? '0 0 2px' : '7px 0 2px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
              >
                <span style={{ width: central ? 48 : 30, height: central ? 48 : 30, marginTop: central ? -20 : 0, borderRadius: central ? 16 : 10, background: central ? ACCENT : selected ? '#F0F0F0' : 'transparent', color: BLACK, display: 'grid', placeItems: 'center', boxShadow: central ? '0 8px 22px rgba(0,0,0,.16)' : 'none' }}>
                  <Icon size={central ? 26 : 19} strokeWidth={central ? 2.8 : selected ? 2.5 : 2} />
                </span>
                <span style={{ fontSize: central ? 9 : 9.5, fontWeight: 850, whiteSpace: 'nowrap' }}>{central ? 'Ajouter' : label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
