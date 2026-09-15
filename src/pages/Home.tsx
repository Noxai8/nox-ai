import { calculateNoxScore, calculateRealTDEE } from '../lib/noxBrain';
import NoxMascot from '../components/NoxMascot';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Apple,
  ArrowRight,
  BarChart3,
  Bot,
  CalendarDays,
  ChevronRight,
  Dumbbell,
  Flame,
  House,
  Medal,
  MoonStar,
  Play,
  ScanLine,
  Sparkles,
  Trophy,
  UserRound,
  WandSparkles,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const ACCENT = '#c8ff00';
const BG = '#070707';
const SURFACE = '#111111';
const SURFACE_2 = '#151515';
const BORDER = '#232323';
const MUTED = '#8b8b8b';
const TEXT = '#f7f7f7';

const cardStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(22,22,22,.98) 0%, rgba(15,15,15,.98) 100%)',
  border: `1px solid ${BORDER}`,
  borderRadius: 22,
  boxShadow: '0 12px 36px rgba(0,0,0,.22)',
};

export function BottomNav({ active }: { active: string }) {
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);

  const items = [
    { id: 'home', label: 'Home', icon: House, path: '/home' },
    { id: 'training', label: 'Train', icon: Dumbbell, path: '/program' },
    { id: 'fuel', label: 'Fuel', icon: Apple, path: '/fuel' },
    { id: 'coach', label: 'Coach', icon: Bot, path: '/coach' },
    { id: 'more', label: 'Plus', icon: null, path: '' },
  ];

  const moreItems = [
    { icon: BarChart3, label: 'Body', path: '/body' },
    { icon: WandSparkles, label: 'Future', path: '/future' },
    { icon: Medal, label: 'Play', path: '/play' },
    { icon: '🏆', label: 'Classement', path: '/leaderboard' },
    { icon: '🧊', label: 'Fuel IA', path: '/fuel-ai' },
    { icon: '👨‍🍳', label: 'Recettes', path: '/recipes' },
    { icon: '📅', label: 'Planifier', path: '/meal-planner' },
    { icon: '⏱️', label: 'Jeûne', path: '/fasting' },
    { icon: '😊', label: 'Humeur', path: '/mood' },
    { icon: '🌙', label: 'Recovery', path: '/recovery' },
    { icon: '📋', label: 'Bilan', path: '/weekly-review' },
    { icon: '👥', label: 'Partenaire', path: '/partner' },
    { icon: '📤', label: 'Timeline', path: '/share-timeline' },
    { icon: '⚙️', label: 'Réglages', path: '/settings' },
  ];

  return (
    <>
      {showMore && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.93)', zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
          onClick={() => setShowMore(false)}>
          <div style={{ background: '#0d0d0d', borderRadius: '20px 20px 0 0', padding: '20px 20px 90px', maxHeight: '75vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 16, fontWeight: 800 }}>TOUTES LES FONCTIONNALITÉS</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {moreItems.map(item => {
                const isString = typeof item.icon === 'string';
                return (
                  <button key={item.path} onClick={() => { navigate(item.path); setShowMore(false); }}
                    style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, padding: '14px 8px', textAlign: 'center', cursor: 'pointer', touchAction: 'manipulation' }}>
                    {isString
                      ? <div style={{ fontSize: 24, marginBottom: 6 }}>{item.icon as string}</div>
                      : (() => { const I = item.icon as any; return <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}><I size={24} color={ACCENT} /></div>; })()
                    }
                    <div style={{ fontSize: 10, color: '#888', fontWeight: 700 }}>{item.label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 0, width: '100%', maxWidth: 560, zIndex: 100, padding: '8px 10px max(10px, env(safe-area-inset-bottom))', background: 'rgba(7,7,7,.94)', backdropFilter: 'blur(18px)', borderTop: '1px solid rgba(255,255,255,.07)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 2, alignItems: 'end' }}>
          {items.map(item => {
            const selected = active === item.id || (item.id === 'more' && showMore);
            const Icon = item.icon;
            return (
              <button key={item.id}
                onClick={() => item.id === 'more' ? setShowMore(s => !s) : navigate(item.path)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '8px 0 3px', color: selected ? ACCENT : '#6f6f6f', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0, touchAction: 'manipulation' }}>
                <div style={{ width: 28, height: 28, borderRadius: 10, display: 'grid', placeItems: 'center', background: selected ? 'rgba(200,255,0,.11)' : 'transparent', border: '1px solid transparent' }}>
                  {Icon
                    ? <Icon size={18} strokeWidth={selected ? 2.4 : 1.9} />
                    : <span style={{ fontSize: 18 }}>☰</span>
                  }
                </div>
                <span style={{ fontSize: 8.5, lineHeight: 1, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', whiteSpace: 'nowrap', color: selected ? ACCENT : '#6f6f6f' }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}


function NoxScore({ score }: { score: number }) {
  const safe = Math.max(0, Math.min(100, score));
  const degrees = safe * 3.6;

  return (
    <div
      style={{
        width: 82,
        height: 82,
        borderRadius: '50%',
        padding: 5,
        background: `conic-gradient(${ACCENT} 0deg ${degrees}deg, #242424 ${degrees}deg 360deg)`,
        boxShadow: '0 0 28px rgba(200,255,0,.08)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: '#0b0b0b',
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: 24, lineHeight: 1, fontWeight: 950, color: TEXT }}>{safe}</div>
          <div
            style={{
              marginTop: 5,
              color: '#777',
              fontSize: 8.5,
              fontWeight: 850,
              textTransform: 'uppercase',
              letterSpacing: '.1em',
            }}
          >
            NOX Score
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  eyebrow,
  value,
  detail,
  onClick,
}: {
  icon: React.ElementType;
  eyebrow: string;
  value: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...cardStyle,
        minHeight: 132,
        padding: 16,
        textAlign: 'left',
        cursor: 'pointer',
        color: TEXT,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 11,
          background: 'rgba(200,255,0,.09)',
          color: ACCENT,
          marginBottom: 18,
        }}
      >
        <Icon size={17} strokeWidth={2.2} />
      </div>

      <div
        style={{
          fontSize: 10,
          color: '#777',
          textTransform: 'uppercase',
          letterSpacing: '.08em',
          fontWeight: 800,
        }}
      >
        {eyebrow}
      </div>
      <div style={{ fontSize: 22, color: TEXT, fontWeight: 950, marginTop: 3, letterSpacing: '-.03em' }}>{value}</div>
      <div style={{ fontSize: 11.5, color: MUTED, marginTop: 5 }}>{detail}</div>
    </button>
  );
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<any>(null);
  const [program, setProgram] = useState<any>(null);
  const [todaySession, setTodaySession] = useState<any>(null);
  const [todaySessionIdx, setTodaySessionIdx] = useState<number>(0);
  const [workoutCount, setWorkoutCount] = useState(0);
  const [prCount, setPrCount] = useState(0);
  const [weekWorkouts, setWeekWorkouts] = useState(0);
  const [todayKcal, setTodayKcal] = useState(0);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [xp, setXp] = useState(0);
  const [loading, setLoading] = useState(true);

  const days = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
  const todayDay = days[new Date().getDay()];
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const [
        { data: prof },
        { data: prog },
        { data: logs },
        { data: prs },
        { data: weekLogs },
        { data: fuel },
        { data: bodyLogs },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('workout_programs').select('*').eq('user_id', user.id).eq('is_active', true).maybeSingle(),
        supabase.from('workouts').select('id').eq('user_id', user.id).eq('status', 'completed'),
        supabase.from('personal_records').select('id').eq('user_id', user.id),
        supabase
          .from('workouts')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('created_at', weekStart),
        supabase
          .from('food_entries')
          .select('calories')
          .eq('user_id', user.id)
          .gte('created_at', today + 'T00:00:00'),
        supabase
          .from('body_logs')
          .select('weight')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      setProfile(prof);
      setProgram(prog);
      setWorkoutCount(logs?.length || 0);
      setPrCount(prs?.length || 0);
      setWeekWorkouts(weekLogs?.length || 0);
      setTodayKcal(fuel?.reduce((sum: number, item: any) => sum + (item.calories || 0), 0) || 0);
      setLatestWeight(bodyLogs?.[0]?.weight || null);
      setXp(prof?.xp || 0);

      if (prog?.program_json) {
        const sessions = prog.program_json.sessions || [];
        const found = sessions.find(
          (session: any) =>
            session.day === todayDay || (session.days && session.days.includes(todayDay)),
        );
        setTodaySession(found || null);
      }

      setLoading(false);
    };

    load();
  }, [user]);

  const isRestDay = !todaySession;

  const greet = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'BONJOUR';
    if (hour < 18) return 'BONNE APRÈS-MIDI';
    return 'BONSOIR';
  };

  const getNoxScore = () => {
    return calculateNoxScore({
      workoutCount,
      weekWorkouts,
      weekPlanned: profile?.available_days?.length || 4,
      prCount,
      hasWeight: !!latestWeight,
      hasFuel: todayKcal > 0,
      todayKcal,
      targetKcal: 2200,
      streak: profile?.streak_days || 0,
      xp,
    });
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: BG,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <Sparkles size={24} color={ACCENT} style={{ marginBottom: 10 }} />
          <div style={{ color: ACCENT, fontWeight: 950, letterSpacing: '.18em', fontSize: 14 }}>NOX</div>
        </div>
      </div>
    );
  }

  const noxScore = getNoxScore();
  const firstName = profile?.display_name?.split(' ')[0] || 'ATHLÈTE';
  const sessionGoal = program?.days_per_week || program?.program_json?.days_per_week || 3;
  const remainingKcal = Math.max(0, 2200 - todayKcal);

  return (
    <div style={{ minHeight: '100vh', background: BG, color: TEXT, paddingBottom: 104 }}>
      <main style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
        <header
          style={{
            padding: '22px 20px 18px',
            background:
              'radial-gradient(circle at 90% 0%, rgba(200,255,0,.065), transparent 32%), linear-gradient(180deg,#0b0b0b 0%,#070707 100%)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18 }}>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 10,
                  color: '#747474',
                  textTransform: 'uppercase',
                  letterSpacing: '.14em',
                  fontWeight: 800,
                }}
              >
                {greet()}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  marginTop: 5,
                  fontSize: 26,
                  lineHeight: 1.02,
                  fontWeight: 950,
                  letterSpacing: '-.035em',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{firstName}</span>
                <Sparkles size={20} color={ACCENT} fill="rgba(200,255,0,.13)" />
              </div>

              {profile?.streak_days > 0 && (
                <div
                  style={{
                    marginTop: 12,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    border: '1px solid rgba(255,138,55,.2)',
                    background: 'rgba(255,138,55,.07)',
                    borderRadius: 999,
                    padding: '7px 10px',
                    color: '#ff9b4a',
                    fontSize: 11,
                    fontWeight: 850,
                  }}
                >
                  <Flame size={14} fill="rgba(255,155,74,.25)" />
                  {profile.streak_days} jours de régularité
                </div>
              )}
            </div>

            <NoxScore score={noxScore} />
          </div>
        </header>

        <section style={{ padding: '0 20px 22px' }}>
          <div
            style={{
              ...cardStyle,
              overflow: 'hidden',
              position: 'relative',
              padding: 22,
              marginBottom: 14,
              borderColor: isRestDay ? BORDER : 'rgba(200,255,0,.22)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: 180,
                height: 180,
                borderRadius: '50%',
                right: -85,
                top: -90,
                background: isRestDay ? 'rgba(255,255,255,.025)' : 'rgba(200,255,0,.055)',
                filter: 'blur(4px)',
              }}
            />

            <div style={{ position: 'relative' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    fontSize: 10,
                    color: '#7c7c7c',
                    textTransform: 'uppercase',
                    letterSpacing: '.11em',
                    fontWeight: 850,
                  }}
                >
                  {isRestDay ? <MoonStar size={14} /> : <Activity size={14} color={ACCENT} />}
                  Aujourd'hui {isRestDay ? '' : `· ${todayDay}`}
                </div>

                {!isRestDay && (
                  <div
                    style={{
                      fontSize: 9,
                      textTransform: 'uppercase',
                      letterSpacing: '.08em',
                      fontWeight: 900,
                      color: ACCENT,
                      padding: '5px 8px',
                      border: '1px solid rgba(200,255,0,.22)',
                      background: 'rgba(200,255,0,.07)',
                      borderRadius: 999,
                    }}
                  >
                    Plan actif
                  </div>
                )}
              </div>

              <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: '-.035em', lineHeight: 1.05 }}>
                {isRestDay ? 'JOUR DE RÉCUPÉRATION' : todaySession?.name || 'SÉANCE DU JOUR'}
              </div>

              <div style={{ color: MUTED, fontSize: 13, lineHeight: 1.55, marginTop: 9 }}>
                {isRestDay
                  ? 'Aujourd’hui, priorité à la récupération. Mobilité légère, hydratation et sommeil pour repartir plus fort.'
                  : `${todaySession?.exercises?.length || 0} exercices · ${
                      todaySession?.duration || program?.program_json?.session_length_min || 60
                    } min · séance adaptée à ton plan.`}
              </div>

              {isRestDay ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginTop: 20 }}>
                  <button
                    onClick={() => navigate('/body')}
                    style={{
                      minHeight: 46,
                      borderRadius: 13,
                      border: '1px solid rgba(200,255,0,.2)',
                      background: 'rgba(200,255,0,.07)',
                      color: ACCENT,
                      fontWeight: 900,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '.05em',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 7,
                    }}
                  >
                    <ScanLine size={16} />
                    Body check
                  </button>

                  <button
                    onClick={() => navigate('/fuel')}
                    style={{
                      minHeight: 46,
                      borderRadius: 13,
                      border: `1px solid ${BORDER}`,
                      background: '#121212',
                      color: TEXT,
                      fontWeight: 900,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '.05em',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 7,
                    }}
                  >
                    <Apple size={16} />
                    Nutrition
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => navigate('/training/' + (todaySessionIdx ?? 0))}
                  style={{
                    width: '100%',
                    minHeight: 50,
                    marginTop: 20,
                    border: 'none',
                    borderRadius: 14,
                    background: ACCENT,
                    color: '#050505',
                    fontSize: 12,
                    fontWeight: 950,
                    textTransform: 'uppercase',
                    letterSpacing: '.06em',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 9,
                    boxShadow: '0 10px 28px rgba(200,255,0,.14)',
                  }}
                >
                  <Play size={16} fill="#050505" />
                  Commencer la séance
                </button>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              margin: '20px 2px 11px',
            }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: '-.02em' }}>Vue d'ensemble</div>
              <div style={{ marginTop: 3, fontSize: 11, color: '#727272' }}>Tes indicateurs utiles aujourd'hui</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
            <MetricCard
              icon={Dumbbell}
              eyebrow="Training"
              value={`${weekWorkouts}/${sessionGoal}`}
              detail={`${workoutCount} séances au total`}
              onClick={() => navigate('/program')}
            />
            <MetricCard
              icon={BarChart3}
              eyebrow="Body"
              value={latestWeight ? `${latestWeight} kg` : '—'}
              detail={latestWeight ? 'Dernier check-in' : 'Ajoute ton premier check-in'}
              onClick={() => navigate('/body')}
            />
            <MetricCard
              icon={Apple}
              eyebrow="Fuel"
              value={todayKcal ? `${todayKcal}` : '0'}
              detail={todayKcal ? `${remainingKcal} kcal restantes` : 'Commence ton suivi nutrition'}
              onClick={() => navigate('/fuel')}
            />
            <MetricCard
              icon={Trophy}
              eyebrow="Play"
              value={`${prCount} PR`}
              detail={`${xp} XP · progression NOX`}
              onClick={() => navigate('/play')}
            />
          </div>

          <button
            onClick={() => navigate('/future')}
            style={{
              ...cardStyle,
              width: '100%',
              marginTop: 12,
              padding: 0,
              overflow: 'hidden',
              textAlign: 'left',
              cursor: 'pointer',
              color: TEXT,
            }}
          >
            <div
              style={{
                minHeight: 150,
                position: 'relative',
                padding: 20,
                display: 'flex',
                alignItems: 'flex-end',
                background:
                  'radial-gradient(circle at 82% 35%, rgba(200,255,0,.16), transparent 24%), linear-gradient(135deg,#121212 0%,#0b0b0b 100%)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 18,
                  left: 20,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: ACCENT,
                  fontSize: 9.5,
                  fontWeight: 900,
                  letterSpacing: '.11em',
                  textTransform: 'uppercase',
                }}
              >
                <WandSparkles size={14} />
                Signature NOX
              </div>

              <div style={{ maxWidth: '78%' }}>
                <div style={{ fontSize: 21, fontWeight: 950, letterSpacing: '-.03em' }}>NOX FUTURE</div>
                <div style={{ fontSize: 12.5, color: '#969696', lineHeight: 1.5, marginTop: 6 }}>
                  Visualise une projection indicative de ta trajectoire et suis l’écart entre ton plan et ta réalité.
                </div>
              </div>

              <div
                style={{
                  position: 'absolute',
                  right: 18,
                  bottom: 18,
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: ACCENT,
                  color: '#050505',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <ArrowRight size={18} />
              </div>
            </div>
          </button>

          <div style={{ margin: '22px 2px 10px', fontSize: 11, fontWeight: 900, color: '#777', letterSpacing: '.09em', textTransform: 'uppercase' }}>
            Accès rapide
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 9 }}>
            {[
              { label: 'Programme', icon: CalendarDays, path: '/program' },
              { label: 'Coach IA', icon: Bot, path: '/coach' },
              { label: 'Profil', icon: UserRound, path: '/settings' },
            ].map(({ label, icon: Icon, path }) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                style={{
                  minHeight: 82,
                  borderRadius: 17,
                  border: `1px solid ${BORDER}`,
                  background: SURFACE,
                  color: TEXT,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 9,
                }}
              >
                <Icon size={18} color={ACCENT} />
                <span style={{ fontSize: 10.5, fontWeight: 850, color: '#b7b7b7' }}>{label}</span>
              </button>
            ))}
          </div>

          <div
            style={{
              marginTop: 16,
              padding: '14px 16px',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,.055)',
              background: 'rgba(255,255,255,.018)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Sparkles size={15} color={ACCENT} />
            <div style={{ flex: 1, fontSize: 11.5, lineHeight: 1.45, color: '#777' }}>
              Chaque donnée améliore les recommandations de NOX.
            </div>
            <ChevronRight size={16} color="#4a4a4a" />
          </div>
        </section>
      </main>

      <BottomNav active="home" />
    </div>
  );
}
