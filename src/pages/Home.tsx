import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import TutorialTooltip from '../components/TutorialTooltip';
import { useAuth } from '../lib/AuthContext';
import {
  Activity,
  Apple,
  BarChart3,
  Camera,
  ChevronRight,
  CircleUserRound,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  Home as HomeIcon,
  Moon,
  Plus,
  Ruler,
  Scale,
  ScanLine,
  Settings,
  Sparkles,
  Utensils,
  X,
  Zap,
} from 'lucide-react';

const ACCENT = '#B7FF00';
const BLACK = '#090909';
const BG = '#F6F7F2';
const MUTED = '#777B72';
const BORDER = '#E8EAE2';

type NavActive = 'home' | 'fuel' | 'activity' | 'progress';

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

/* ─────────────────────────────────────────────────────────────
   GLOBAL BOTTOM NAV
───────────────────────────────────────────────────────────── */

export function BottomNav({ active }: { active: NavActive | string }) {
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);

  const quickActions = [
    {
      label: 'Repas',
      sub: 'Ajouter un repas',
      icon: Utensils,
      path: '/fuel?add=meal',
    },
    {
      label: 'Scanner repas',
      sub: 'Analyser une photo',
      icon: Camera,
      path: '/fuel?add=photo',
    },
    {
      label: 'Code-barres',
      sub: 'Scanner un aliment',
      icon: ScanLine,
      path: '/fuel?add=barcode',
    },
    {
      label: 'Aliment',
      sub: 'Rechercher et ajouter',
      icon: Apple,
      path: '/fuel?add=food',
    },
    {
      label: 'Eau',
      sub: 'Hydratation',
      icon: Droplets,
      path: '/fuel?add=water',
    },
    {
      label: 'Poids',
      sub: 'Nouvelle mesure',
      icon: Scale,
      path: '/body?add=weight',
    },
    {
      label: 'Entraînement',
      sub: 'Lancer une séance',
      icon: Dumbbell,
      path: '/program',
    },
    {
      label: 'Mensuration',
      sub: 'Suivre ton corps',
      icon: Ruler,
      path: '/body?add=measurements',
    },
    {
      label: 'Jeûne',
      sub: 'Jeûne intermittent',
      icon: Moon,
      path: '/fasting',
    },
    {
      label: 'NOX Future',
      sub: 'Projection IA',
      icon: Sparkles,
      path: '/future',
    },
    {
      label: 'Courses',
      sub: 'Selon ton objectif',
      icon: Zap,
      path: '/meal-planner',
    },
  ];

  const go = (path: string) => {
    setShowAdd(false);
    navigate(path);
  };

  const navItems = [
    {
      id: 'home',
      label: "Accueil",
      icon: HomeIcon,
      path: '/home',
    },
    {
      id: 'fuel',
      label: 'Mon plan',
      icon: Apple,
      path: '/fuel',
    },
    {
      id: 'activity',
      label: 'Suivi',
      icon: Activity,
      path: '/progress',
    },
    {
      id: 'progress',
      label: 'Moi futur',
      icon: Sparkles,
      path: '/future',
    },
  ];

  const NavButton = ({
    item,
  }: {
    item: (typeof navItems)[number];
  }) => {
    const selected =
      active === item.id ||
      (item.id === 'fuel' && active === 'nutrition') ||
      (item.id === 'activity' && ['activity', 'training', 'program'].includes(active)) ||
      (item.id === 'progress' && ['progress', 'body'].includes(active));
    const Icon = item.icon;

    return (
      <button
        onClick={() => navigate(item.path)}
        style={{
          flex: 1,
          minWidth: 0,
          border: 0,
          background: 'transparent',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
          color: selected ? BLACK : '#999D95',
          cursor: 'pointer',
          padding: '7px 0 2px',
        }}
      >
        <Icon
          size={21}
          strokeWidth={selected ? 2.7 : 2}
        />

        <span
          style={{
            fontSize: 9,
            fontWeight: selected ? 900 : 750,
            whiteSpace: 'nowrap',
          }}
        >
          {item.label}
        </span>

        <div
          style={{
            width: selected ? 16 : 0,
            height: 3,
            borderRadius: 999,
            background: ACCENT,
            transition: 'width .2s ease',
          }}
        />
      </button>
    );
  };

  return (
    <>
      {showAdd && (
        <div
          onClick={() => setShowAdd(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: 'rgba(0,0,0,.45)',
            backdropFilter: 'blur(7px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 560,
              background: '#fff',
              borderRadius: '28px 28px 0 0',
              padding: '10px 20px max(32px, env(safe-area-inset-bottom))',
              boxSizing: 'border-box',
              maxHeight: '86vh',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              boxShadow: '0 -20px 70px rgba(0,0,0,.18)',
            }}
          >
            <div
              style={{
                width: 40,
                height: 5,
                borderRadius: 99,
                background: '#D8DAD3',
                margin: '2px auto 20px',
              }}
            />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 22,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#8B8E87',
                    fontWeight: 800,
                  }}
                >
                  AJOUT RAPIDE
                </div>

                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 950,
                    letterSpacing: '-.045em',
                    color: BLACK,
                    marginTop: 2,
                  }}
                >
                  Que veux-tu ajouter ?
                </div>
              </div>

              <button
                onClick={() => setShowAdd(false)}
                aria-label="Fermer"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  border: `1px solid ${BORDER}`,
                  background: '#F5F6F1',
                  color: BLACK,
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 10,
                paddingBottom: 4,
              }}
            >
              {quickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <button
                    key={action.label}
                    onClick={() => go(action.path)}
                    style={{
                      border: `1px solid ${BORDER}`,
                      background: '#FAFBF7',
                      borderRadius: 20,
                      minHeight: 112,
                      padding: 14,
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 13,
                        display: 'grid',
                        placeItems: 'center',
                        background: '#EEF0E8',
                        color: BLACK,
                        marginBottom: 12,
                      }}
                    >
                      <Icon size={19} />
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        color: BLACK,
                        fontWeight: 900,
                      }}
                    >
                      {action.label}
                    </div>

                    <div
                      style={{
                        fontSize: 9.5,
                        lineHeight: 1.3,
                        color: '#9A9D96',
                        marginTop: 3,
                      }}
                    >
                      {action.sub}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          position: 'fixed',
          zIndex: 200,
          left: '50%',
          bottom: 0,
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 560,
          boxSizing: 'border-box',
          background: 'rgba(255,255,255,.96)',
          backdropFilter: 'blur(20px)',
          borderTop: `1px solid ${BORDER}`,
          padding: '7px 12px max(9px, env(safe-area-inset-bottom))',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <NavButton item={navItems[0]} />
          <NavButton item={navItems[1]} />

          <div
            style={{
              flex: 0.9,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <button
              onClick={() => setShowAdd(true)}
              aria-label="Ajouter"
              style={{
                width: 52,
                height: 52,
                borderRadius: 18,
                border: 0,
                background: ACCENT,
                color: BLACK,
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                transform: 'translateY(-15px)',
                boxShadow: '0 9px 25px rgba(183,255,0,.35)',
              }}
            >
              <Plus size={28} strokeWidth={3} />
            </button>
          </div>

          <NavButton item={navItems[2]} />
          <NavButton item={navItems[3]} />
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   COMPONENTS
───────────────────────────────────────────────────────────── */

function Macro({
  label,
  value,
  target,
}: {
  label: string;
  value: number;
  target: number;
}) {
  const percentage = clamp((value / Math.max(target, 1)) * 100);

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: 18,
          fontWeight: 950,
          color: '#fff',
          letterSpacing: '-.03em',
        }}
      >
        {Math.round(value)}
        <span
          style={{
            fontSize: 10,
            color: '#777',
            marginLeft: 2,
          }}
        >
          /{target}g
        </span>
      </div>

      <div
        style={{
          height: 4,
          background: '#272727',
          borderRadius: 999,
          overflow: 'hidden',
          margin: '7px 0 5px',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            background: ACCENT,
            borderRadius: 999,
          }}
        />
      </div>

      <div
        style={{
          fontSize: 9,
          fontWeight: 750,
          color: '#777',
        }}
      >
        {label}
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  onClick,
  dark = false,
}: {
  icon: any;
  label: string;
  value: string;
  sub: string;
  onClick?: () => void;
  dark?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        minHeight: 142,
        borderRadius: 23,
        border: dark ? 0 : `1px solid ${BORDER}`,
        background: dark ? BLACK : '#fff',
        padding: 16,
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: dark ? 'none' : '0 5px 22px rgba(20,20,20,.035)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 13,
            background: dark ? ACCENT : '#F2F3EE',
            color: BLACK,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Icon size={19} strokeWidth={2.3} />
        </div>

        {onClick && (
          <ChevronRight
            size={17}
            color={dark ? '#555' : '#C1C4BC'}
          />
        )}
      </div>

      <div
        style={{
          marginTop: 20,
          color: dark ? '#fff' : BLACK,
          fontSize: 22,
          lineHeight: 1,
          fontWeight: 950,
          letterSpacing: '-.04em',
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: 7,
          fontSize: 10,
          fontWeight: 850,
          color: dark ? '#888' : '#7F837A',
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 3,
          fontSize: 9.5,
          color: dark ? '#555' : '#A6A9A2',
        }}
      >
        {sub}
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   HOME / AUJOURD'HUI
───────────────────────────────────────────────────────────── */

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<any>(null);
  const [program, setProgram] = useState<any>(null);
  const [targets, setTargets] = useState<any>(null);
  const [future, setFuture] = useState<any>(null);
  const [workoutCount, setWorkoutCount] = useState(0);

  useEffect(() => {
    if (user) loadAll();
  }, [user]);

  const loadAll = async () => {
    if (!user) return;
    const weekStart = new Date(Date.now() - 7 * 86400000).toISOString();

    const [{ data: prof }, { data: prog }, { data: tgts }, { data: futureData }, { data: workouts }] =
      await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('workout_programs').select('*').eq('user_id', user.id).eq('is_active', true).maybeSingle(),
        supabase.from('nutrition_targets').select('*').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('future_you_generations')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('workouts')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('created_at', weekStart),
      ]);

    setProfile(prof);
    setProgram(prog);
    setTargets(tgts);
    setFuture(futureData);
    setWorkoutCount(workouts?.length || 0);
  };

  const sessions = program?.program_json?.sessions || [];
  const dayNames = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const todayName = dayNames[new Date().getDay()];
  const todaySession =
    sessions.find((session: any) =>
      String(session?.day || '').toLowerCase().includes(todayName.toLowerCase().slice(0, 3)),
    ) || sessions[0];

  const firstName =
    profile?.first_name ||
    profile?.display_name?.split(' ')[0] ||
    user?.user_metadata?.first_name ||
    '';

  const dateLabel = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  const calories = Number(targets?.calories || 0);
  const protein = Number(targets?.protein || 0);
  const streak = Number(profile?.streak_days || 0);

  const createdAt = profile?.created_at ? new Date(profile.created_at).getTime() : Date.now();
  const journeyDay = Math.max(1, Math.floor((Date.now() - createdAt) / 86400000) + 1);
  const journeyWeek = Math.max(1, Math.min(12, Math.ceil(journeyDay / 7)));
  const journeyPct = clamp(Math.round((journeyDay / 84) * 100), 1, 100);

  const card = {
    background: '#fff',
    border: `1px solid ${BORDER}`,
    borderRadius: 24,
    boxShadow: '0 8px 30px rgba(20,20,20,.045)',
  };

  const pillar = (
    title: string,
    sub: string,
    Icon: any,
    path: string,
    tint: string,
  ) => (
    <button onClick={() => navigate(path)} style={{
      ...card, minHeight: 124, padding: 16, textAlign: 'left', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    }}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{width:40,height:40,borderRadius:14,background:tint,display:'grid',placeItems:'center'}}>
          <Icon size={20} strokeWidth={2.4}/>
        </div>
        <ChevronRight size={17} color="#B8BBB3"/>
      </div>
      <div>
        <div style={{fontSize:13,fontWeight:950}}>{title}</div>
        <div style={{fontSize:10,color:'#999D95',marginTop:4,lineHeight:1.35}}>{sub}</div>
      </div>
    </button>
  );

  return (
    <div style={{minHeight:'100vh',background:BG,color:BLACK,paddingBottom:110}}>
      <main style={{width:'100%',maxWidth:560,margin:'0 auto'}}>
        <header style={{
          padding:'24px 20px 22px',
          background:'linear-gradient(145deg,#fff 48%,#FFF4E6 100%)',
          borderBottomLeftRadius:30,borderBottomRightRadius:30,
        }}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{fontSize:30,fontWeight:1000,letterSpacing:'-.07em'}}>NOX</div>
              <div style={{width:9,height:9,borderRadius:'50%',background:ACCENT}}/>
            </div>
            <div style={{display:'flex',gap:9}}>
              <div style={{height:42,padding:'0 13px',borderRadius:14,background:'#fff',border:`1px solid ${BORDER}`,display:'flex',alignItems:'center',gap:6}}>
                <Flame size={17} fill={ACCENT}/><strong>{streak}</strong>
              </div>
              <button onClick={()=>navigate('/profile')} style={{width:42,height:42,border:0,borderRadius:14,background:BLACK,color:'#fff',display:'grid',placeItems:'center'}}>
                <CircleUserRound size={21}/>
              </button>
            </div>
          </div>

          <div style={{marginTop:30,fontSize:14,color:MUTED,fontWeight:700}}>
            Bonjour{firstName ? ` ${firstName}` : ''} 👋
          </div>
          <h1 style={{fontSize:35,lineHeight:1.02,margin:'5px 0 7px',fontWeight:1000,letterSpacing:'-.055em'}}>
            Jour {journeyDay} de ta transformation.
          </h1>
          <div style={{fontSize:12,color:'#8E928A'}}>Discipline aujourd’hui. Une meilleure version de toi demain.</div>
        </header>

        <section style={{padding:'18px 20px 0'}}>
          <div style={{...card,padding:20,background:'linear-gradient(145deg,#FFFFFF 60%,#FFF2DE 100%)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:9,fontSize:11,fontWeight:950}}>
                <span style={{width:32,height:32,borderRadius:12,background:'#EDFFD0',display:'grid',placeItems:'center'}}><Sparkles size={17}/></span>
                NOX TODAY
              </div>
              <div style={{fontSize:10,fontWeight:800,textTransform:'capitalize'}}>{dateLabel}</div>
            </div>
            <h2 style={{fontSize:29,lineHeight:1,letterSpacing:'-.05em',margin:'18px 0 8px',fontWeight:1000}}>Construire l’élan.</h2>
            <p style={{fontSize:12,lineHeight:1.55,color:'#6F736B',margin:'0 0 18px'}}>
              NOX organise ta journée autour d’actions simples et utiles pour avancer vers la version de toi que tu as choisie.
            </p>

            <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:9}}>
              {[
                [Dumbbell,'Bouger ton corps',todaySession ? `${todaySession.name} · ${todaySession.exercises?.length || 0} exercices` : 'Récupération active','/program'],
                [Apple,'Manger mieux',calories ? `${calories} kcal · ${protein} g protéines` : 'Ton plan nutritionnel','/fuel'],
                [Sparkles,'Habitude clé','Une action simple aujourd’hui','/habits'],
                [Moon,'Récupération','Prépare une bonne nuit','/sleep'],
              ].map(([Icon,title,sub,path]:any)=>(
                <button key={title} onClick={()=>navigate(path)} style={{border:0,borderRadius:18,background:'rgba(255,255,255,.82)',padding:13,textAlign:'left',cursor:'pointer'}}>
                  <Icon size={18}/>
                  <div style={{fontSize:11,fontWeight:950,marginTop:10}}>{title}</div>
                  <div style={{fontSize:9.5,color:'#979B93',marginTop:3,lineHeight:1.35}}>{sub}</div>
                </button>
              ))}
            </div>

            <button onClick={()=>navigate('/program')} style={{width:'100%',border:0,borderRadius:17,background:ACCENT,color:BLACK,padding:'15px 16px',fontSize:12,fontWeight:950,marginTop:14,cursor:'pointer'}}>
              Voir mon plan du jour →
            </button>
          </div>

          <button onClick={()=>navigate('/future')} style={{
            ...card,width:'100%',marginTop:14,padding:20,textAlign:'left',cursor:'pointer',
            background:'linear-gradient(135deg,#fff 52%,#EEF1E8 100%)',
          }}>
            <div style={{display:'flex',justifyContent:'space-between',gap:16}}>
              <div>
                <div style={{fontSize:22,fontWeight:1000,letterSpacing:'-.045em'}}>Mon NOX Future</div>
                <div style={{fontSize:11,color:'#969A92',marginTop:4}}>Visualise où tu vas. Garde le cap.</div>
              </div>
              <ChevronRight size={20}/>
            </div>
            <div style={{height:7,borderRadius:999,background:'#E8EAE3',overflow:'hidden',marginTop:20}}>
              <div style={{height:'100%',width:`${journeyPct}%`,background:ACCENT,borderRadius:999}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:9.5,color:'#858981',marginTop:7}}>
              <span>Semaine {journeyWeek} sur 12</span><span>{journeyPct}% du parcours</span>
            </div>
            <div style={{marginTop:17,padding:'14px 15px',borderRadius:17,background:'rgba(246,247,242,.9)',fontSize:12,fontStyle:'italic',lineHeight:1.5}}>
              « Une direction claire. Des actions cohérentes. Un parcours qui s’adapte à toi. »
            </div>
            {!future && <div style={{fontSize:9.5,color:'#A0A39B',marginTop:10}}>Ta projection NOX Future reste accessible ici.</div>}
          </button>

          <div style={{display:'flex',justifyContent:'space-between',alignItems:'end',margin:'25px 2px 12px'}}>
            <div>
              <div style={{fontSize:21,fontWeight:1000,letterSpacing:'-.04em'}}>Mes piliers aujourd’hui</div>
              <div style={{fontSize:10,color:'#9A9D96',marginTop:3}}>Ton équilibre, pas seulement ton entraînement.</div>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>
            {pillar('Entraînement', todaySession?.name || 'Mouvement du jour', Dumbbell, '/program', '#EEFFD2')}
            {pillar('Nutrition', calories ? `Repères : ${calories} kcal` : 'Plan alimentaire', Apple, '/fuel', '#FFF0EC')}
            {pillar('Habitudes', 'Focus du jour', Sparkles, '/habits', '#EDF7FF')}
            {pillar('Récupération', 'Sommeil & énergie', Moon, '/sleep', '#F1EDFF')}
          </div>

          <div style={{...card,marginTop:14,padding:18}}>
            <div style={{display:'flex',gap:13,alignItems:'flex-start'}}>
              <div style={{width:45,height:45,borderRadius:15,background:ACCENT,display:'grid',placeItems:'center',flexShrink:0}}>
                <Sparkles size={21}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:1000}}>NOX Intelligence</div>
                <div style={{fontSize:10.5,lineHeight:1.55,color:'#858981',marginTop:5}}>
                  Ton plan relie ton objectif, ton entraînement, ta nutrition et ton rythme de vie. À mesure que tu avances, NOX pourra ajuster le parcours avec tes nouvelles données.
                </div>
              </div>
            </div>
            <button onClick={()=>navigate('/ai-coach')} style={{width:'100%',marginTop:14,border:0,borderRadius:14,padding:12,background:'#F3F4EF',fontSize:10.5,fontWeight:900,cursor:'pointer'}}>
              Parler à NOX →
            </button>
          </div>

          <div style={{margin:'26px 2px 12px'}}>
            <div style={{fontSize:21,fontWeight:1000,letterSpacing:'-.04em'}}>Ce qui t’attend</div>
            <div style={{fontSize:10,color:'#9A9D96',marginTop:3}}>Des étapes, pas des promesses.</div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10,marginBottom:24}}>
            {[
              ['Semaine 1','Créer l’habitude'],
              ['Semaine 4','Observer et ajuster'],
              ['Semaine 8','Mesurer ton évolution'],
              ['Semaine 12','Comparer ton parcours'],
            ].map(([week,label],i)=>(
              <div key={week} style={{...card,padding:16,minHeight:100,background:i===0?'linear-gradient(145deg,#F5FFD9,#fff)':'#fff'}}>
                <div style={{fontSize:9.5,fontWeight:900,color:i===0?'#557900':'#9A9D96'}}>{week}</div>
                <div style={{fontSize:14,fontWeight:950,marginTop:18,lineHeight:1.2}}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{fontSize:9,color:'#A1A49D',textAlign:'center',paddingBottom:8}}>
            NOX accompagne ton parcours. Les résultats réels varient selon ta régularité, ton contexte et ton évolution.
          </div>
        </section>
      </main>

      <TutorialTooltip page="home" />
      <BottomNav active="home" />
    </div>
  );
}
