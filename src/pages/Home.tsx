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
      path: '/fuel',
    },
    {
      label: 'Scanner',
      sub: 'Photo ou code-barres',
      icon: ScanLine,
      path: '/food-scan',
    },
    {
      label: 'Aliment',
      sub: 'Recherche rapide',
      icon: Apple,
      path: '/fuel',
    },
    {
      label: 'Eau',
      sub: 'Hydratation',
      icon: Droplets,
      path: '/fuel',
    },
    {
      label: 'Poids',
      sub: 'Nouvelle mesure',
      icon: Scale,
      path: '/body?add=weight',
    },
    {
      label: 'Activité',
      sub: 'Ajouter une activité',
      icon: Activity,
      path: '/body?add=activity',
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
      label: 'Photo',
      sub: 'Photo de progression',
      icon: Camera,
      path: '/progress?add=photo',
    },
  ];

  const go = (path: string) => {
    setShowAdd(false);
    navigate(path);
  };

  const navItems = [
    {
      id: 'home',
      label: "Aujourd'hui",
      icon: HomeIcon,
      path: '/home',
    },
    {
      id: 'fuel',
      label: 'Nutrition',
      icon: Apple,
      path: '/fuel',
    },
    {
      id: 'activity',
      label: 'Activité',
      icon: Activity,
      path: '/program',
    },
    {
      id: 'progress',
      label: 'Progrès',
      icon: BarChart3,
      path: '/progress',
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
                      background:
                        action.label === 'Repas' ||
                        action.label === 'Scanner' ||
                        action.label === 'Entraînement'
                          ? '#090909'
                          : '#FAFBF7',
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
                        background:
                          action.label === 'Repas' ||
                          action.label === 'Scanner' ||
                          action.label === 'Entraînement'
                            ? ACCENT
                            : BLACK,
                        color:
                          action.label === 'Repas' ||
                          action.label === 'Scanner' ||
                          action.label === 'Entraînement'
                            ? BLACK
                            : ACCENT,
                        marginBottom: 12,
                      }}
                    >
                      <Icon size={19} />
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        color:
                          action.label === 'Repas' ||
                          action.label === 'Scanner' ||
                          action.label === 'Entraînement'
                            ? '#FFFFFF'
                            : BLACK,
                        fontWeight: 900,
                      }}
                    >
                      {action.label}
                    </div>

                    <div
                      style={{
                        fontSize: 9.5,
                        lineHeight: 1.3,
                        color:
                          action.label === 'Repas' ||
                          action.label === 'Scanner' ||
                          action.label === 'Entraînement'
                            ? '#777B72'
                            : '#9A9D96',
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
  const [todayEntries, setTodayEntries] = useState<any[]>([]);
  const [targets, setTargets] = useState<any>(null);
  const [workoutCount, setWorkoutCount] = useState(0);
  const [prs, setPrs] = useState(0);
  const [bodyLog, setBodyLog] = useState<any>(null);

  const [brief, setBrief] = useState<string | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);

  const [greeting, setGreeting] = useState('Bonjour');
  const [timeSlot, setTimeSlot] =
    useState<'morning' | 'afternoon' | 'evening' | 'night'>('morning');

  useEffect(() => {
    const hour = new Date().getHours();

    if (hour < 12) {
      setGreeting('Bonjour');
      setTimeSlot('morning');
    } else if (hour < 17) {
      setGreeting('Bon après-midi');
      setTimeSlot('afternoon');
    } else if (hour < 21) {
      setGreeting('Bonsoir');
      setTimeSlot('evening');
    } else {
      setGreeting('Bonne nuit');
      setTimeSlot('night');
    }
  }, []);

  useEffect(() => {
    if (user) loadAll();
  }, [user]);

  const loadAll = async () => {
    if (!user) return;

    const now = new Date();

    const localDate =
      `${now.getFullYear()}-` +
      `${String(now.getMonth() + 1).padStart(2, '0')}-` +
      `${String(now.getDate()).padStart(2, '0')}`;

    const startOfDay = new Date(
      `${localDate}T00:00:00`,
    ).toISOString();

    const endOfDay = new Date(
      `${localDate}T23:59:59`,
    ).toISOString();

    const weekStart = new Date(
      Date.now() - 7 * 86400000,
    ).toISOString();

    const [
      { data: prof },
      { data: prog },
      { data: entries },
      { data: tgts },
      { data: workouts },
      { data: prData },
      { data: body },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(),

      supabase
        .from('workout_programs')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle(),

      supabase
        .from('food_entries')
        .select('calories, protein, carbs, fat, food_name')
        .eq('user_id', user.id)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay),

      supabase
        .from('nutrition_targets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(),

      supabase
        .from('workouts')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', weekStart),

      supabase
        .from('personal_records')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', weekStart),

      supabase
        .from('body_logs')
        .select('weight, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1),
    ]);

    setProfile(prof);
    setProgram(prog);
    setTodayEntries(entries || []);
    setTargets(tgts);
    setWorkoutCount(workouts?.length || 0);
    setPrs(prData?.length || 0);
    setBodyLog(body?.[0] || null);
  };

  /* Nutrition */

  const todayKcal = todayEntries.reduce(
    (sum, entry) => sum + Number(entry.calories || 0),
    0,
  );

  const todayProtein = todayEntries.reduce(
    (sum, entry) => sum + Number(entry.protein || 0),
    0,
  );

  const todayCarbs = todayEntries.reduce(
    (sum, entry) => sum + Number(entry.carbs || 0),
    0,
  );

  const todayFat = todayEntries.reduce(
    (sum, entry) => sum + Number(entry.fat || 0),
    0,
  );

  const targetKcal = Number(targets?.calories || 2200);
  const targetProtein = Number(targets?.protein || 160);
  const targetCarbs = Number(targets?.carbs || 220);
  const targetFat = Number(targets?.fat || 70);

  const kcalLeft = Math.max(
    0,
    Math.round(targetKcal - todayKcal),
  );

  const kcalPct = clamp(
    (todayKcal / Math.max(targetKcal, 1)) * 100,
  );

  /* Score */

  const noxScore = Math.min(
    100,
    Math.round(
      Math.min(workoutCount / 3, 1) * 40 +
        Math.min(kcalPct / 100, 1) * 30 +
        (profile?.streak_days > 0
          ? Math.min(profile.streak_days / 7, 1) * 30
          : 0),
    ),
  );

  /* Training */

  const sessions = program?.program_json?.sessions || [];

  const todayIndex = new Date().getDay();

  const dayNames = [
    'Dimanche',
    'Lundi',
    'Mardi',
    'Mercredi',
    'Jeudi',
    'Vendredi',
    'Samedi',
  ];

  const todaySession =
    sessions.find((session: any) =>
      session.day
        ?.toLowerCase()
        .includes(
          dayNames[todayIndex]
            .toLowerCase()
            .slice(0, 3),
        ),
    ) || sessions[0];

  /* Brief */

  const generateBrief = async () => {
    setLoadingBrief(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        setLoadingBrief(false);
        return;
      }

      const evening =
        timeSlot === 'evening' ||
        timeSlot === 'night';

      const prompt = evening
        ? `Tu es NOX. Génère un Evening Recap personnalisé en 2-3 phrases maximum.
Calories : ${todayKcal}/${targetKcal}.
Protéines : ${Math.round(todayProtein)}/${targetProtein}g.
Séances cette semaine : ${workoutCount}.
Streak : ${profile?.streak_days || 0} jours.
Objectif : ${profile?.goal_type || 'transformation'}.
Réponse directe et utile. Pas de markdown.`
        : `Tu es NOX. Génère un Morning Brief personnalisé en 2-3 phrases maximum.
Prénom : ${profile?.display_name?.split(' ')[0] || 'Athlète'}.
Objectif : ${profile?.goal_type || 'transformation'}.
Séance du jour : ${todaySession?.name || 'Repos'}.
Streak : ${profile?.streak_days || 0} jours.
Réponse directe et motivante. Pas de markdown.`;

      const response = await fetch(
        'https://zpxrsmnpcyzafawlweyl.supabase.co/functions/v1/generate-program',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ prompt }),
        },
      );

      const data = await response.json();

      const text =
        data?.content?.[0]?.text ||
        data?.data?.content?.[0]?.text ||
        '';

      if (text) setBrief(text.slice(0, 240));
    } catch (error) {
      console.error('NOX brief:', error);
    } finally {
      setLoadingBrief(false);
    }
  };

  const name =
    profile?.display_name?.split(' ')[0] ||
    profile?.first_name ||
    '';

  const dateLabel = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  const weight = bodyLog?.weight
    ? `${Number(bodyLog.weight).toFixed(1)} kg`
    : '—';

  const circumference = 2 * Math.PI * 50;
  const dashOffset =
    circumference -
    (circumference * kcalPct) / 100;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: BG,
        color: BLACK,
        paddingBottom: 105,
      }}
    >
      <main
        style={{
          width: '100%',
          maxWidth: 560,
          margin: '0 auto',
        }}
      >
        {/* HEADER */}

        <header
          style={{
            padding: '24px 20px 18px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    lineHeight: 1,
                    fontWeight: 1000,
                    letterSpacing: '-.07em',
                  }}
                >
                  NOX
                </div>

                <div
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: ACCENT,
                  }}
                />
              </div>

              <div
                style={{
                  color: '#A0A39B',
                  fontSize: 10,
                  fontWeight: 750,
                  marginTop: 7,
                  textTransform: 'capitalize',
                }}
              >
                {dateLabel}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
              }}
            >
              <div
                style={{
                  height: 42,
                  padding: '0 13px',
                  borderRadius: 14,
                  background: '#fff',
                  border: `1px solid ${BORDER}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Flame
                  size={17}
                  fill={ACCENT}
                  color={BLACK}
                />

                <strong style={{ fontSize: 13 }}>
                  {profile?.streak_days || 0}
                </strong>
              </div>

              <button
                onClick={() => navigate('/profile')}
                style={{
                  width: 42,
                  height: 42,
                  border: 0,
                  borderRadius: 14,
                  background: BLACK,
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <CircleUserRound size={21} />
              </button>
            </div>
          </div>

          <div style={{ marginTop: 28 }}>
            <div
              style={{
                fontSize: 13,
                color: MUTED,
                fontWeight: 700,
              }}
            >
              {greeting}{name ? `, ${name}` : ''}
            </div>

            <h1
              style={{
                fontSize: 33,
                lineHeight: 1.02,
                margin: '4px 0 0',
                fontWeight: 950,
                letterSpacing: '-.055em',
              }}
            >
              Ton progrès,
              <br />
              aujourd'hui.
            </h1>
          </div>
        </header>

        <section style={{ padding: '0 20px' }}>

          {/* CALORIES HERO */}

          <button
            onClick={() => navigate('/fuel')}
            style={{
              width: '100%',
              border: 0,
              background: BLACK,
              borderRadius: 28,
              padding: 20,
              color: '#fff',
              textAlign: 'left',
              cursor: 'pointer',
              boxShadow: '0 16px 35px rgba(0,0,0,.12)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 850,
                    letterSpacing: '.1em',
                    color: '#777',
                  }}
                >
                  ÉNERGIE DU JOUR
                </div>

                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 900,
                    marginTop: 4,
                  }}
                >
                  Calories
                </div>
              </div>

              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  background: '#171717',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <ChevronRight
                  size={17}
                  color="#777"
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                marginTop: 18,
              }}
            >
              <div
                style={{
                  width: 122,
                  height: 122,
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                <svg
                  width="122"
                  height="122"
                  viewBox="0 0 122 122"
                  style={{
                    transform: 'rotate(-90deg)',
                  }}
                >
                  <circle
                    cx="61"
                    cy="61"
                    r="50"
                    fill="none"
                    stroke="#242424"
                    strokeWidth="10"
                  />

                  <circle
                    cx="61"
                    cy="61"
                    r="50"
                    fill="none"
                    stroke={ACCENT}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    style={{
                      transition:
                        'stroke-dashoffset .5s ease',
                    }}
                  />
                </svg>

                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'grid',
                    placeItems: 'center',
                    textAlign: 'center',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 27,
                        lineHeight: 1,
                        fontWeight: 950,
                        letterSpacing: '-.05em',
                      }}
                    >
                      {kcalLeft}
                    </div>

                    <div
                      style={{
                        fontSize: 8.5,
                        fontWeight: 800,
                        color: '#777',
                        marginTop: 6,
                      }}
                    >
                      RESTANTES
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 31,
                    fontWeight: 950,
                    lineHeight: 1,
                    letterSpacing: '-.055em',
                  }}
                >
                  {Math.round(todayKcal)}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: '#777',
                    marginTop: 5,
                  }}
                >
                  sur {targetKcal} kcal
                </div>

                <div
                  style={{
                    marginTop: 15,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    borderRadius: 999,
                    padding: '7px 10px',
                    background: ACCENT,
                    color: BLACK,
                    fontSize: 9.5,
                    fontWeight: 900,
                  }}
                >
                  <Zap
                    size={13}
                    fill={BLACK}
                  />
                  {Math.round(kcalPct)}% de l'objectif
                </div>
              </div>
            </div>

            <div
              style={{
                height: 1,
                background: '#202020',
                margin: '21px 0 16px',
              }}
            />

            <div
              style={{
                display: 'flex',
                gap: 16,
              }}
            >
              <Macro
                label="Protéines"
                value={todayProtein}
                target={targetProtein}
              />

              <Macro
                label="Glucides"
                value={todayCarbs}
                target={targetCarbs}
              />

              <Macro
                label="Lipides"
                value={todayFat}
                target={targetFat}
              />
            </div>
          </button>

          {/* SECTION TITLE */}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              margin: '25px 2px 12px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 19,
                  fontWeight: 950,
                  letterSpacing: '-.035em',
                }}
              >
                Aujourd'hui
              </div>

              <div
                style={{
                  fontSize: 10,
                  color: '#A0A39B',
                  marginTop: 3,
                }}
              >
                Ton activité en un coup d'œil
              </div>
            </div>

            <button
              onClick={() => navigate('/settings')}
              style={{
                width: 37,
                height: 37,
                borderRadius: 12,
                border: `1px solid ${BORDER}`,
                background: '#fff',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
              }}
            >
              <Settings size={17} />
            </button>
          </div>

          {/* DAILY CARDS */}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(2, minmax(0,1fr))',
              gap: 10,
            }}
          >
            <MetricCard
              icon={Footprints}
              label="Pas"
              value="—"
              sub="Connecte une source d'activité"
              onClick={() => navigate('/progress')}
            />

            <MetricCard
              icon={Droplets}
              label="Eau"
              value="—"
              sub="Objectif quotidien"
              onClick={() => navigate('/fuel')}
            />

            <MetricCard
              icon={Dumbbell}
              label="Entraînement"
              value={`${workoutCount}`}
              sub="séances ces 7 derniers jours"
              dark
              onClick={() => navigate('/program')}
            />

            <MetricCard
              icon={Moon}
              label="Sommeil"
              value="—"
              sub="Données à connecter"
              onClick={() => navigate('/sleep')}
            />

            <MetricCard
              icon={Scale}
              label="Poids"
              value={weight}
              sub="Dernière mesure"
              onClick={() => navigate('/body')}
            />

            <MetricCard
              icon={Sparkles}
              label="Daily Score"
              value={`${noxScore}`}
              sub={`Streak ${profile?.streak_days || 0} j · ${prs} PR`}
              onClick={() => navigate('/progress')}
            />
          </div>

          {/* TRAINING */}

          <div
            style={{
              marginTop: 26,
              marginBottom: 12,
              fontSize: 19,
              fontWeight: 950,
              letterSpacing: '-.035em',
            }}
          >
            Entraînement
          </div>

          <button
            onClick={() => navigate('/program')}
            style={{
              width: '100%',
              border: 0,
              borderRadius: 25,
              background: '#fff',
              padding: 18,
              textAlign: 'left',
              cursor: 'pointer',
              boxShadow:
                '0 5px 24px rgba(20,20,20,.045)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 18,
                  background: ACCENT,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <Dumbbell
                  size={24}
                  strokeWidth={2.5}
                />
              </div>

              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontSize: 9.5,
                    color: '#92968D',
                    fontWeight: 850,
                  }}
                >
                  {todaySession
                    ? 'SÉANCE DU JOUR'
                    : 'RÉCUPÉRATION'}
                </div>

                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 950,
                    letterSpacing: '-.025em',
                    marginTop: 3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {todaySession?.name ||
                    'Jour de repos'}
                </div>

                <div
                  style={{
                    fontSize: 10.5,
                    color: '#9A9D96',
                    marginTop: 4,
                  }}
                >
                  {todaySession
                    ? `${todaySession.exercises?.length || 0} exercices · Prêt à commencer`
                    : 'Récupère et prépare la prochaine séance'}
                </div>
              </div>

              <ChevronRight
                size={20}
                color="#B9BCB4"
              />
            </div>
          </button>

          {/* NOX INTELLIGENCE */}

          <div
            style={{
              marginTop: 12,
            }}
          >
            <button
              onClick={
                brief
                  ? () => setBrief(null)
                  : generateBrief
              }
              disabled={loadingBrief}
              style={{
                width: '100%',
                border: 0,
                borderRadius: 25,
                background: ACCENT,
                padding: 18,
                color: BLACK,
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 13,
                }}
              >
                <div
                  style={{
                    width: 45,
                    height: 45,
                    borderRadius: 15,
                    background: BLACK,
                    color: ACCENT,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Sparkles size={21} />
                </div>

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 950,
                      letterSpacing: '.08em',
                    }}
                  >
                    NOX INTELLIGENCE
                  </div>

                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 950,
                      marginTop: 3,
                    }}
                  >
                    {loadingBrief
                      ? 'Analyse en cours…'
                      : brief
                        ? 'Ton résumé du jour'
                        : timeSlot === 'evening' ||
                            timeSlot === 'night'
                          ? 'Voir mon Evening Recap'
                          : 'Voir mon Morning Brief'}
                  </div>
                </div>

                <ChevronRight size={19} />
              </div>

              {brief && (
                <div
                  style={{
                    borderTop:
                      '1px solid rgba(0,0,0,.12)',
                    marginTop: 15,
                    paddingTop: 14,
                    fontSize: 12,
                    fontWeight: 650,
                    lineHeight: 1.55,
                  }}
                >
                  {brief}
                </div>
              )}
            </button>
          </div>

          {/* WEEK */}

          <div
            style={{
              margin: '26px 2px 12px',
              fontSize: 19,
              fontWeight: 950,
              letterSpacing: '-.035em',
            }}
          >
            Cette semaine
          </div>

          <div
            style={{
              background: '#fff',
              border: `1px solid ${BORDER}`,
              borderRadius: 25,
              padding: 18,
              marginBottom: 22,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3,1fr)',
              }}
            >
              {[
                [
                  workoutCount,
                  'Séances',
                ],
                [
                  prs,
                  'Records',
                ],
                [
                  `${profile?.streak_days || 0}j`,
                  'Streak',
                ],
              ].map(([value, label], index) => (
                <div
                  key={String(label)}
                  style={{
                    textAlign: 'center',
                    borderRight:
                      index < 2
                        ? `1px solid ${BORDER}`
                        : 'none',
                  }}
                >
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 950,
                      letterSpacing: '-.04em',
                    }}
                  >
                    {value}
                  </div>

                  <div
                    style={{
                      color: '#9A9D96',
                      fontSize: 9.5,
                      fontWeight: 800,
                      marginTop: 4,
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() =>
                navigate('/weekly-review')
              }
              style={{
                width: '100%',
                marginTop: 17,
                border: 0,
                borderRadius: 15,
                padding: 13,
                background: '#F3F4EF',
                color: BLACK,
                fontSize: 11,
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              Voir mon bilan hebdomadaire →
            </button>
          </div>
        </section>
      </main>

      <TutorialTooltip page="home" />
      <BottomNav active="home" />
    </div>
  );
}
