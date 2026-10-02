import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight, Dumbbell, Leaf, MessageCircle, Utensils } from 'lucide-react';
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

type MainTab = 'coach' | 'memoire' | 'progres';
type MemoryTab = 'sait' | 'observe' | 'ne-sait-pas';

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
  const [mainTab,       setMainTab]       = useState<MainTab>('coach');
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
          {([['coach','Coach'],['memoire','Mémoire'],['progres','Progrès']] as [MainTab,string][]).map(([id,label]) => (
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
            <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'center', minHeight: 210, alignItems: 'center' }}><NoxCompanion observedDays={observedDays} size="lg" /></div>
              <div style={{ fontSize: 11, color: LIME, fontWeight: 850, letterSpacing: '.08em' }}>STADE {stage} · {getStageLabel(stage).toUpperCase()}</div>
              <div style={{ marginTop: 8, fontSize: 22, fontWeight: 850 }}>NOX évolue avec le temps observé.</div>
              <div style={{ color: SECONDARY, fontSize: 13, lineHeight: 1.5, marginTop: 6 }}>Jamais selon ta performance.</div>
              <div style={{ height: 5, background: CARD2, borderRadius: 999, overflow: 'hidden', marginTop: 18 }}><div style={{ width: `${progress}%`, height: '100%', background: LIME, borderRadius: 999 }} /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, color: MUTED, fontSize: 11 }}><span>{observedDays} jours observés</span><span>{milestone.label}</span></div>
            </section>

            <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20, marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 850, marginBottom: 16 }}>Évolution</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>{['J1','J7','J30','J90','1 an'].map((label,i) => { const thresholds=[1,7,30,90,365]; const reached=observedDays>=thresholds[i]; return <div key={label} style={{ textAlign:'center' }}><div style={{ width: 10,height:10,borderRadius:99,background:reached?LIME:'#414642',margin:'0 auto 8px' }}/><div style={{ fontSize:10,color:reached?WHITE:MUTED,fontWeight:800 }}>{label}</div></div> })}</div>
            </section>

            <button onClick={() => navigate('/weekly-review')} style={{ width:'100%', padding:'18px 20px', background:CARD, border:`1px solid ${BORDER}`, borderRadius:20, color:WHITE, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', marginBottom:10, textAlign:'left' }}><span><strong style={{display:'block',fontSize:15}}>Bilan hebdomadaire</strong><span style={{display:'block',color:SECONDARY,fontSize:12,marginTop:4}}>Ce que tes données permettent réellement d'observer.</span></span><ChevronRight size={19} color={MUTED}/></button>
            <button onClick={() => navigate('/future')} style={{ width:'100%', padding:'18px 20px', background:CARD, border:`1px solid ${BORDER}`, borderRadius:20, color:WHITE, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', textAlign:'left' }}><span><strong style={{display:'block',fontSize:15}}>NOX Future</strong><span style={{display:'block',color:SECONDARY,fontSize:12,marginTop:4}}>Scénarios illustratifs selon les données disponibles.</span></span><ChevronRight size={19} color={MUTED}/></button>
          </>
        )}
      </main>
      <BottomNav active="mon-nox" />
    </div>
  );
}
