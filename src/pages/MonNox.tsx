import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight, Crown, Dumbbell, Flame, Infinity as InfinityIcon, Leaf, LockKeyhole, Medal, MessageCircle, Shield, Trophy, Utensils } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';
import NoxCompanion from '../components/NoxCompanion';
import { usePlan } from '../lib/usePlan';

const BG = '#090B0A';
const CARD = '#232624';
const CARD2 = '#191C1A';
const WHITE = '#FFFFFF';
const LIME = '#C8FF00';
const SECONDARY = '#A5AAA6';
const MUTED = '#747A76';
const BORDER = '#4A4F4B';

type MainTab = 'coach' | 'memoire' | 'progres' | 'rangs';
type MemoryTab = 'sait' | 'observe' | 'ne-sait-pas';


const RANK_NAMES = ['Éveil','Impulsion','Focus','Discipline','Équilibre','Résilience','Progression','Ascension','Dépassement','Maîtrise','Alignement','Influence','Rayonnement','Excellence','Légende','Vision','Impact','Élite','Transcendance','NOX Ultime'];

function xpNeeded(level: number) { return level >= 100 ? 0 : Math.round(260 + level * 22 + Math.pow(level, 1.42) * 7); }
function totalXpTo(level: number) { let x=0; for(let i=1;i<level;i++) x += xpNeeded(i); return x; }
function levelFromXp(xp:number){ let level=1, left=Math.max(0,xp); while(level<100 && left>=xpNeeded(level)){ left-=xpNeeded(level); level++; } return level; }
function RankMedal({rank, unlocked=true, active=false}:{rank:number;unlocked?:boolean;active?:boolean}) {
  return <div style={{width:72,height:72,borderRadius:24,display:'grid',placeItems:'center',position:'relative',background:unlocked?(rank===20?'radial-gradient(circle,#FFE58B,#8C6200)':'radial-gradient(circle,#DFFF69,#26310C)'):'linear-gradient(145deg,#292D2A,#111311)',border:`1px solid ${active?LIME:unlocked?'#718A20':BORDER}`,color:unlocked?(rank===20?'#241A00':LIME):'#555B56',boxShadow:active?'0 0 0 3px rgba(200,255,0,.08)':'none'}}>{rank===20?<Crown size={31}/>:<Shield size={31}/>}<span style={{position:'absolute',bottom:-7,minWidth:25,height:18,padding:'0 4px',borderRadius:99,display:'grid',placeItems:'center',background:unlocked?(rank===20?'#E5B93F':LIME):'#292D2A',color:unlocked?BG:MUTED,fontSize:9,fontWeight:950,border:`2px solid ${BG}`}}>{rank}</span></div>
}

function getNoxStage(days: number): number {
  if (days >= 365) return 5;
  if (days >= 90)  return 4;
  if (days >= 30)  return 3;
  if (days >= 7)   return 2;
  return 1;
}

function getStageLabel(stage: number) {
  return ['', 'Graine', 'Éveil', 'Explorateur', 'Éclairé', 'Maître NOX'][stage] || 'Graine';
}

function getNextMilestone(days: number): { label: string; target: number } {
  if (days < 7)   return { label: '7 jours', target: 7 };
  if (days < 30)  return { label: '30 jours', target: 30 };
  if (days < 90)  return { label: '90 jours', target: 90 };
  if (days < 365) return { label: '1 an', target: 365 };
  return { label: 'Maîtrise complète', target: 365 };
}

export default function MonNox() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { isPro } = usePlan();
  const [mainTab,       setMainTab]       = useState<MainTab>('progres');
  const [tab,           setTab]           = useState<MemoryTab>('sait');
  const [observedDays,  setObservedDays]  = useState(0);
  const [totalPulses,   setTotalPulses]   = useState(0);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [avgSleep,      setAvgSleep]      = useState<number | null>(null);
  const [avgEnergy,     setAvgEnergy]     = useState<number | null>(null);
  const [avgBody,       setAvgBody]       = useState<number | null>(null);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => { if (user) void load(); }, [user]);

  const load = async () => {
    const [
      { count: closures },
      { count: pulses },
      { count: workouts },
      { data: pulseData },
    ] = await Promise.all([
      supabase.from('daily_closures').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
      supabase.from('daily_pulses').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
      supabase.from('workouts').select('id', { count: 'exact', head: true }).eq('user_id', user!.id).eq('status', 'completed'),
      supabase.from('daily_pulses').select('sleep_score, energy_score, body_score').eq('user_id', user!.id).order('date', { ascending: false }).limit(14),
    ]);

    setObservedDays(closures ?? 0);
    setTotalPulses(pulses ?? 0);
    setTotalWorkouts(workouts ?? 0);

    if (pulseData && pulseData.length >= 3) {
      const avg = (key: 'sleep_score' | 'energy_score' | 'body_score') =>
        Math.round((pulseData.reduce((s, r) => s + Number(r[key]), 0) / pulseData.length) * 10) / 10;
      setAvgSleep(avg('sleep_score'));
      setAvgEnergy(avg('energy_score'));
      setAvgBody(avg('body_score'));
    }

    setLoading(false);
  };

  const stage     = getNoxStage(observedDays);
  const milestone = getNextMilestone(observedDays);
  const progress  = Math.min(100, Math.round((observedDays / milestone.target) * 100));
  const earnedXp = observedDays * 35 + totalPulses * 12 + totalWorkouts * 45;
  const rawLevel = levelFromXp(earnedXp);
  // Garde-fou : le palier 100 ne peut jamais être atteint avant 365 journées validées.
  const calendarCap = Math.min(100, Math.max(1, Math.floor((observedDays / 365) * 99) + 1));
  const noxLevel = Math.min(rawLevel, calendarCap);
  const noxRank = Math.min(20, Math.ceil(noxLevel / 5));
  const rankStep = ((noxLevel - 1) % 5) + 1;
  const xpIntoLevel = Math.max(0, earnedXp - totalXpTo(noxLevel));
  const nextXp = xpNeeded(noxLevel);
  const xpPct = noxLevel >= 100 ? 100 : Math.min(100, Math.round((xpIntoLevel / Math.max(1,nextXp)) * 100));

  // Mémoire — contenu déterministe selon vraies données
  const saitItems: string[] = [
    totalPulses >= 1  ? `Tu as renseigné ton état ${totalPulses} fois.` : '',
    totalWorkouts >= 1 ? `Tu as complété ${totalWorkouts} séance${totalWorkouts > 1 ? 's' : ''}.` : '',
    observedDays >= 7  ? `Tu utilises NOX depuis ${observedDays} jours.` : '',
    avgSleep !== null  ? `Ton sommeil moyen (14 j) : ${avgSleep}/5.` : '',
    avgEnergy !== null ? `Ton énergie moyenne (14 j) : ${avgEnergy}/5.` : '',
  ].filter(Boolean);

  const observeItems: string[] = [
    avgBody !== null ? `Ton état physique moyen sur les 14 derniers Pulse : ${avgBody}/5.` : '',
  ].filter(Boolean);

  const neSaitPasItems: string[] = [
    totalPulses < 14   ? 'Tes rythmes de sommeil sur la durée.' : '',
    totalWorkouts < 10 ? 'Tes préférences d\'exercice réelles.' : '',
    'La relation éventuelle entre ta nutrition et ton énergie.',
    observedDays < 30  ? 'Tes tendances hebdomadaires.' : '',
    'L\'impact éventuel des horaires de repas sur ton sommeil.',
  ].filter(Boolean);

  const tabs: { id: MemoryTab; label: string; color: string; items: string[] }[] = [
    { id: 'sait',        label: 'Sait',            color: LIME,     items: saitItems },
    { id: 'observe',     label: 'Observe',          color: '#FFD93D', items: observeItems },
    { id: 'ne-sait-pas', label: 'Ne sait pas encore', color: MUTED, items: neSaitPasItems },
  ];

  const activeTab = tabs.find(t => t.id === tab)!;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'grid', placeItems: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 950, color: WHITE }}>NOX<span style={{ color: LIME }}>.</span></div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, color: WHITE, paddingBottom: 'calc(160px + env(safe-area-inset-bottom))' }}>
      <main style={{ width: '100%', maxWidth: 760, margin: '0 auto', padding: '38px 16px 0', boxSizing: 'border-box' }}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(34px,5vw,46px)', fontWeight: 850, letterSpacing: '-.04em', lineHeight: .98 }}>Mon NOX</h1>
          <p style={{ margin: '10px 0 0', color: SECONDARY, fontSize: 14, lineHeight: 1.5 }}>
            {observedDays > 0 ? `${observedDays} journée${observedDays !== 1 ? 's' : ''} observée${observedDays !== 1 ? 's' : ''}` : "NOX commence à apprendre comment tu fonctionnes."}
          </p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: 5, background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 16, marginBottom: 18 }}>
          {([['progres','Progression'],['rangs','Rangs'],['memoire','Mémoire'],['coach','NOXI']] as [MainTab,string][]).map(([id,label]) => (
            <button key={id} onClick={() => setMainTab(id)} style={{ border: 0, borderRadius: 12, padding: '11px 8px', background: mainTab === id ? LIME : 'transparent', color: mainTab === id ? BG : SECONDARY, fontWeight: 850, fontSize: 13, cursor: 'pointer' }}>{label}</button>
          ))}
        </div>

        {mainTab === 'coach' && (
          <>
            <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20, marginBottom: 18 }}>
              <div style={{ fontSize: 25, fontWeight: 850, letterSpacing: '-.03em', lineHeight: 1.08, maxWidth: 520 }}>Dis-moi ce qui te préoccupe aujourd'hui.</div>
              <div style={{ color: SECONDARY, fontSize: 14, marginTop: 8 }}>Je t'aide à avancer.</div>
              <button onClick={() => navigate(isPro ? '/coach' : '/subscribe')} style={{ width: '100%', marginTop: 20, padding: '14px 14px 14px 16px', background: CARD2, border: '1px solid #414642', borderRadius: 14, color: SECONDARY, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left', fontSize: 14 }}>
                <span>{isPro ? 'Pose ta question...' : 'Coach conversationnel · Pro'}</span>
                <span style={{ width: 34, height: 34, borderRadius: 999, background: LIME, color: BG, display: 'grid', placeItems: 'center', flexShrink: 0 }}><ArrowRight size={18} strokeWidth={2.5}/></span>
              </button>
            </section>

            <section style={{ marginBottom: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                {[
                  { label: 'Nutrition', path: '/fuel', icon: Utensils },
                  { label: 'Mouvement', path: '/movement', icon: Dumbbell },
                  { label: 'Récupération', path: '/recovery', icon: Leaf },
                  { label: 'Parler à NOX', path: isPro ? '/coach' : '/subscribe', icon: MessageCircle },
                ].map(({label,path,icon:Icon}) => (
                  <button key={label} onClick={() => navigate(path)} style={{ minHeight: 76, padding: 16, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, color: WHITE, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', fontWeight: 800 }}>
                    <Icon size={19} color={LIME}/><span>{label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 18, fontWeight: 850 }}>Idées du jour</div>
                {isPro && <button onClick={() => navigate('/coach')} style={{ background: 'transparent', border: 0, color: LIME, fontWeight: 800, cursor: 'pointer' }}>Voir tout →</button>}
              </div>
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, overflow: 'hidden' }}>
                {["Comment améliorer mon énergie ?", 'Planifier ma semaine', 'Gérer une journée difficile'].map((label, i, arr) => (
                  <button key={label} onClick={() => navigate(isPro ? '/coach' : '/subscribe')} style={{ width: '100%', padding: '17px 18px', background: 'transparent', border: 0, borderBottom: i < arr.length - 1 ? '1px solid #414642' : 'none', color: WHITE, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left', fontSize: 14, fontWeight: 700 }}>
                    <span>{label}</span><ChevronRight size={18} color={MUTED}/>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {mainTab === 'memoire' && (
          <>
            <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20, marginBottom: 14 }}>
              <div style={{ fontSize: 20, fontWeight: 850, marginBottom: 6 }}>Ce que NOX comprend de toi</div>
              <div style={{ fontSize: 13, color: SECONDARY, lineHeight: 1.5 }}>Uniquement à partir des données réellement enregistrées.</div>
            </section>
            <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 18 }}>
                {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '10px 6px', borderRadius: 12, border: `1px solid ${tab === t.id ? LIME : '#414642'}`, background: tab === t.id ? CARD2 : 'transparent', color: tab === t.id ? WHITE : MUTED, fontSize: 10, fontWeight: 850, cursor: 'pointer', lineHeight: 1.25 }}>{t.label}</button>)}
              </div>
              <div style={{ fontSize: 10, color: MUTED, fontWeight: 850, letterSpacing: '.08em', marginBottom: 10 }}>CONFIANCE · {tab === 'sait' ? 'ÉLEVÉE' : tab === 'observe' ? 'MODÉRÉE' : 'FAIBLE'}</div>
              {activeTab.items.length ? activeTab.items.map((item,i) => <div key={i} style={{ padding: '13px 0', borderTop: i ? '1px solid #414642' : 'none', color: SECONDARY, fontSize: 14, lineHeight: 1.5 }}>{item}</div>) : <div style={{ color: MUTED, fontSize: 14, lineHeight: 1.5 }}>Je n'ai pas encore assez d'historique pour afficher quelque chose ici.</div>}
            </section>
          </>
        )}

        {mainTab === 'progres' && (
          <>
            <section style={{background:'radial-gradient(circle at 50% 8%,rgba(200,255,0,.11),transparent 35%),linear-gradient(160deg,#171B18,#0F1210)',border:`1px solid ${BORDER}`,borderRadius:26,padding:24,textAlign:'center',marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'center',padding:'8px 0 18px'}}><RankMedal rank={noxRank} active /></div>
              <div style={{fontSize:10,color:LIME,fontWeight:950,letterSpacing:'.1em'}}>RANG {noxRank} · PALIER {rankStep}/5</div>
              <div style={{fontSize:28,fontWeight:950,letterSpacing:'-.04em',marginTop:6}}>{RANK_NAMES[noxRank-1]}</div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:22,fontSize:11,fontWeight:850}}><span>Palier {noxLevel}/100</span><span style={{color:LIME}}>{xpPct}%</span></div>
              <div style={{height:8,background:'#292E2A',borderRadius:99,overflow:'hidden',marginTop:9}}><div style={{width:`${xpPct}%`,height:'100%',background:LIME,borderRadius:99}} /></div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:8,color:MUTED,fontSize:10}}><span>{noxLevel>=100?'Sommet atteint':`${xpIntoLevel.toLocaleString('fr-FR')} / ${nextXp.toLocaleString('fr-FR')} XP`}</span><span>{noxLevel<100?`${Math.max(0,nextXp-xpIntoLevel).toLocaleString('fr-FR')} XP restants`:'NOX Ultime'}</span></div>
            </section>

            <section style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:18}}>
              {[['Jours validés',observedDays],['Séances',totalWorkouts],['Rangs franchis',Math.max(0,noxRank-1)]].map(([label,value])=><div key={String(label)} style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:18,padding:'15px 8px',textAlign:'center'}}><strong style={{display:'block',fontSize:21}}>{value}</strong><span style={{display:'block',fontSize:9,color:MUTED,marginTop:4}}>{label}</span></div>)}
            </section>

            <section style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:22,padding:19,marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><div style={{fontSize:9,color:MUTED,fontWeight:900,letterSpacing:'.1em'}}>TA ROUTE</div><div style={{fontSize:18,fontWeight:900,marginTop:4}}>Ce qui te fait progresser</div></div><Trophy size={20} color={LIME}/></div>
              <div style={{display:'grid',gap:7,marginTop:15}}>
                {[['Entraînements complétés',totalWorkouts,Dumbbell],['Pulse renseignés',totalPulses,Flame],['Journées clôturées',observedDays,Leaf]].map(([label,value,Icon]:any)=><div key={label} style={{padding:13,borderRadius:14,background:CARD2,display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:11}}><span style={{display:'flex',alignItems:'center',gap:9,color:SECONDARY}}><Icon size={17} color={LIME}/>{label}</span><b>{value}</b></div>)}
              </div>
              <div style={{fontSize:10,color:MUTED,lineHeight:1.5,marginTop:12}}>XP v1 calculée uniquement avec les actions réellement enregistrées ci-dessus. Aucun clic vide ne donne d'XP.</div>
            </section>

            <section style={{padding:18,border:'1px solid rgba(200,255,0,.28)',borderRadius:22,background:'linear-gradient(120deg,rgba(200,255,0,.08),rgba(200,255,0,.01))',display:'flex',alignItems:'center',gap:14,marginBottom:8}}>
              <div style={{width:48,height:48,borderRadius:15,display:'grid',placeItems:'center',background:'#242D16',color:LIME}}><Crown size={26}/></div>
              <div style={{flex:1}}><div style={{fontSize:9,color:LIME,fontWeight:950,letterSpacing:'.1em'}}>PALIER 100 · NOX ULTIME</div><strong style={{display:'block',fontSize:17,marginTop:4}}>La récompense ultime.</strong><span style={{display:'block',fontSize:10,color:MUTED,marginTop:5}}>Un parcours long, exigeant et régulier.</span></div>
            </section>
            <section style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
              <div style={{padding:15,border:`1px solid ${BORDER}`,borderRadius:18,background:CARD,display:'flex',gap:10}}><InfinityIcon size={22} color={LIME}/><span><b style={{display:'block',fontSize:11}}>NOX AI gratuit à vie</b><small style={{display:'block',color:MUTED,fontSize:9,marginTop:4}}>Récompense du Palier 100.</small></span></div>
              <div style={{padding:15,border:`1px solid ${BORDER}`,borderRadius:18,background:CARD,display:'flex',gap:10}}><Medal size={22} color={LIME}/><span><b style={{display:'block',fontSize:11}}>Médaille NOX Ultime</b><small style={{display:'block',color:MUTED,fontSize:9,marginTop:4}}>Récompense physique du sommet.</small></span></div>
            </section>
            <div style={{display:'flex',gap:8,padding:12,color:MUTED,fontSize:9,lineHeight:1.45}}><LockKeyhole size={15} style={{flexShrink:0}}/><span>Le Palier 100 est verrouillé par conception : impossible avant au moins 365 journées validées. Aucun achat d'XP.</span></div>

            <button onClick={() => navigate('/weekly-review')} style={{ width:'100%', padding:'18px 20px', background:CARD, border:`1px solid ${BORDER}`, borderRadius:20, color:WHITE, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', marginBottom:10, textAlign:'left' }}><span><strong style={{display:'block',fontSize:15}}>Bilan hebdomadaire</strong><span style={{display:'block',color:SECONDARY,fontSize:12,marginTop:4}}>Ce que tes données permettent réellement d'observer.</span></span><ChevronRight size={19} color={MUTED}/></button>
            <button onClick={() => navigate('/future')} style={{ width:'100%', padding:'18px 20px', background:CARD, border:`1px solid ${BORDER}`, borderRadius:20, color:WHITE, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', textAlign:'left' }}><span><strong style={{display:'block',fontSize:15}}>NOX Future</strong><span style={{display:'block',color:SECONDARY,fontSize:12,marginTop:4}}>Scénarios illustratifs selon les données disponibles.</span></span><ChevronRight size={19} color={MUTED}/></button>
          </>
        )}
        {mainTab === 'rangs' && (
          <>
            <section style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:22,padding:20,marginBottom:10}}><div style={{fontSize:10,color:LIME,fontWeight:950,letterSpacing:'.1em'}}>20 RANGS · 100 PALIERS</div><div style={{fontSize:24,fontWeight:950,letterSpacing:'-.04em',marginTop:6}}>Ton parcours NOX</div><div style={{fontSize:12,color:SECONDARY,lineHeight:1.5,marginTop:6}}>Chaque rang contient cinq paliers. Un rang acquis ne se perd jamais.</div></section>
            <section style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8}}>
              {RANK_NAMES.map((name,index)=>{const r=index+1;const unlocked=r<=noxRank;const active=r===noxRank;return <div key={name} style={{minHeight:137,padding:'15px 7px',border:`1px solid ${active?LIME:BORDER}`,borderRadius:18,background:active?'linear-gradient(160deg,rgba(200,255,0,.08),#111412)':CARD2,display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',gap:9}}><RankMedal rank={r} unlocked={unlocked} active={active}/><strong style={{fontSize:10}}>{name}</strong><span style={{fontSize:8,color:MUTED}}>{r===20?'Palier 100':`Paliers ${(r-1)*5+1}–${r*5}`}</span>{!unlocked&&<LockKeyhole size={12} color={MUTED}/>}</div>})}
            </section>
          </>
        )}

      </main>
      <BottomNav active="mon-nox" />
    </div>
  );
}
