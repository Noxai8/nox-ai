import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Bell, ChevronRight, CreditCard, Dumbbell, HelpCircle, LogOut,
  Shield, Sparkles, Target, Trophy, UserRound, Utensils, Weight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#C8FF00';
const BG = '#F7F8F4';
const WHITE = '#FFFFFF';
const BLACK = '#0B0B0B';
const MUTED = '#7A7F76';
const BORDER = '#E8EAE4';
const SOFT_LIME = '#F0FFD0';

const LEVELS = [
  { level: 1, name: 'NOVICE', minXp: 0 },
  { level: 2, name: 'DÉBUTANT', minXp: 200 },
  { level: 3, name: 'ATHLÈTE', minXp: 600 },
  { level: 4, name: 'PERFORMER', minXp: 1200 },
  { level: 5, name: 'ÉLITE', minXp: 2500 },
  { level: 6, name: 'LÉGENDE NOX', minXp: 5000 },
];

function getLevel(xp: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXp) return LEVELS[i];
  }
  return LEVELS[0];
}

function getNextLevel(xp: number) {
  return LEVELS.find((level) => level.minXp > xp) || null;
}

function goalLabel(goal?: string) {
  if (goal === 'perdre_gras') return 'Perte de gras';
  if (goal === 'prendre_muscle') return 'Prise de muscle';
  if (goal === 'recomposition') return 'Recomposition corporelle';
  if (goal === 'force') return 'Gain de force';
  if (goal === 'performance') return 'Performance';
  if (goal === 'maintien') return 'Maintien';
  return 'Définir ma direction';
}

export default function SocialProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { userId } = useParams();
  const profileId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;

  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>({});
  const [recentPRs, setRecentPRs] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (profileId) load();
  }, [profileId]);

  const load = async () => {
    setLoading(true);

    const [
      { data: prof },
      { data: workouts },
      { data: prs },
      { data: earned },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('display_name, goal_type, xp, streak_days, experience_level, created_at')
        .eq('id', profileId!)
        .maybeSingle(),
      supabase
        .from('workouts')
        .select('id, created_at, program_name, duration_minutes')
        .eq('user_id', profileId!)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('personal_records')
        .select('*')
        .eq('user_id', profileId!)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', profileId!),
    ]);

    setProfile(prof);
    setRecentPRs(prs || []);
    setAchievements((earned || []).map((a: any) => a.achievement_id));
    setStats({
      totalWorkouts: workouts?.length || 0,
      recentWorkouts: workouts || [],
      streak: prof?.streak_days || 0,
      xp: prof?.xp || 0,
      memberSince: prof?.created_at
        ? new Date(prof.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
        : '—',
    });

    setLoading(false);
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(`Je construis ma transformation avec NOX — noxai.fr`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const level = useMemo(() => getLevel(stats.xp || 0), [stats.xp]);
  const nextLevel = useMemo(() => getNextLevel(stats.xp || 0), [stats.xp]);

  const levelProgress = useMemo(() => {
    if (!nextLevel) return 100;
    const currentMin = level.minXp;
    const range = nextLevel.minXp - currentMin;
    return Math.max(0, Math.min(100, Math.round((((stats.xp || 0) - currentMin) / range) * 100)));
  }, [stats.xp, level, nextLevel]);

  const xpRemaining = nextLevel ? Math.max(0, nextLevel.minXp - (stats.xp || 0)) : 0;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'grid', placeItems: 'center' }}>
        <div style={{ color: BLACK, fontSize: 13, fontWeight: 900 }}>NOX prépare ton profil…</div>
      </div>
    );
  }

  /* Le profil public reste volontairement simple pour ne pas casser /profile/:userId. */
  if (!isOwnProfile) {
    return (
      <div style={{ minHeight: '100vh', background: BG, color: BLACK, padding: '28px 20px 60px' }}>
        <main style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
          <button
            onClick={() => navigate(-1)}
            style={{ border: 0, background: 'transparent', padding: 0, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
          >
            ← Retour
          </button>

          <div style={{ marginTop: 34, fontSize: 11, color: MUTED, fontWeight: 850, letterSpacing: '.1em' }}>
            PROFIL NOX
          </div>
          <h1 style={{ margin: '9px 0 0', fontSize: 42, lineHeight: .95, letterSpacing: '-.05em', fontWeight: 950 }}>
            {profile?.display_name || 'ATHLÈTE NOX'}
          </h1>
          <div style={{ marginTop: 12, color: MUTED, fontSize: 13 }}>
            Niveau {level.level} · {level.name}
          </div>

          <div style={{ marginTop: 28, background: BLACK, color: WHITE, borderRadius: 28, padding: 22 }}>
            <div style={{ color: ACCENT, fontSize: 11, fontWeight: 900, letterSpacing: '.09em' }}>
              PROGRESSION NOX
            </div>
            <div style={{ marginTop: 12, fontSize: 34, fontWeight: 950 }}>{stats.xp || 0} XP</div>
            <div style={{ marginTop: 5, color: '#A9ACA6', fontSize: 13 }}>
              {stats.totalWorkouts || 0} séances récentes · {achievements.length} badges
            </div>
          </div>

          {recentPRs.length > 0 && (
            <section style={{ marginTop: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', marginBottom: 10 }}>
                RECORDS RÉCENTS
              </div>
              {recentPRs.slice(0, 3).map((pr) => (
                <div key={pr.id} style={simpleCard}>
                  <strong>{pr.exercise_name}</strong>
                  <span style={{ color: MUTED, fontSize: 12 }}>{pr.weight} kg × {pr.reps}</span>
                </div>
              ))}
            </section>
          )}
        </main>
      </div>
    );
  }

  const menu = [
    { title: 'Corps & mesures', detail: 'Poids, mensurations, photos', icon: Weight, route: '/body' },
    { title: 'Nutrition', detail: 'Objectifs et préférences alimentaires', icon: Utensils, route: '/fuel' },
    { title: 'Entraînement', detail: 'Programme et niveau sportif', icon: Dumbbell, route: '/program' },
    { title: 'Notifications', detail: 'Rappels et préférences', icon: Bell, route: '/notification-settings' },
    { title: 'Abonnement', detail: 'NOX Pro et formule actuelle', icon: CreditCard, route: '/subscribe' },
    { title: 'Confidentialité', detail: 'Compte, données et sécurité', icon: Shield, route: '/settings' },
    { title: 'Aide', detail: 'Support et informations', icon: HelpCircle, route: '/settings' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: BG, color: BLACK, paddingBottom: 104 }}>
      <main style={{ width: '100%', maxWidth: 560, margin: '0 auto', padding: '30px 20px 48px', boxSizing: 'border-box' }}>
        <div style={{ fontSize: 11, fontWeight: 850, letterSpacing: '.12em', color: MUTED }}>MOI</div>

        <h1 style={{ margin: '9px 0 0', fontSize: 'clamp(42px,11vw,56px)', lineHeight: .92, letterSpacing: '-.055em', fontWeight: 950 }}>
          TOI.
        </h1>

        <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 58, height: 58, borderRadius: 20, background: BLACK, color: ACCENT, display: 'grid', placeItems: 'center' }}>
            <UserRound size={27} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-.025em' }}>
              {profile?.display_name || 'Athlète NOX'}
            </div>
            <div style={{ marginTop: 3, color: MUTED, fontSize: 12 }}>
              Membre depuis {stats.memberSince}
            </div>
          </div>
        </div>

        {/* Direction */}
        <section style={{ marginTop: 30, background: SOFT_LIME, borderRadius: 28, padding: 22 }}>
          <div style={{ fontSize: 10, fontWeight: 950, letterSpacing: '.1em' }}>TA DIRECTION</div>
          <div style={{ marginTop: 10, fontSize: 27, lineHeight: 1, fontWeight: 950, letterSpacing: '-.035em' }}>
            {goalLabel(profile?.goal_type).toUpperCase()}.
          </div>
          <div style={{ marginTop: 9, color: '#5D6548', fontSize: 13, lineHeight: 1.5 }}>
            NOX utilise cette direction pour personnaliser ton alimentation, ton entraînement et ses recommandations.
          </div>
          <button onClick={() => navigate('/future')} style={darkSmallButton}>
            VOIR MA DIRECTION NOX <ChevronRight size={16} />
          </button>
        </section>

        {/* XP / levels */}
        <section style={{ marginTop: 14, background: BLACK, color: WHITE, borderRadius: 28, padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
            <div>
              <div style={{ color: ACCENT, fontSize: 10, fontWeight: 950, letterSpacing: '.11em' }}>
                TA PROGRESSION NOX
              </div>
              <div style={{ marginTop: 10, fontSize: 30, lineHeight: 1, fontWeight: 950, letterSpacing: '-.035em' }}>
                NIV. {level.level} · {level.name}
              </div>
            </div>
            <div style={{ minWidth: 68, textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 950 }}>{stats.xp || 0}</div>
              <div style={{ color: '#9DA19A', fontSize: 10, fontWeight: 800 }}>XP</div>
            </div>
          </div>

          <div style={{ height: 9, marginTop: 20, background: '#282828', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${levelProgress}%`, height: '100%', background: ACCENT, borderRadius: 999, transition: 'width .25s ease' }} />
          </div>

          <div style={{ marginTop: 9, display: 'flex', justifyContent: 'space-between', gap: 12, color: '#A8AAA6', fontSize: 11 }}>
            <span>{level.minXp} XP</span>
            <span>{nextLevel ? `${xpRemaining} XP avant ${nextLevel.name}` : 'Palier maximal atteint'}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 20 }}>
            {[
              ['SÉANCES', stats.totalWorkouts || 0],
              ['SÉRIE', `${stats.streak || 0} j`],
              ['BADGES', achievements.length],
            ].map(([label, value]) => (
              <div key={label} style={{ background: '#171717', borderRadius: 17, padding: '13px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 950 }}>{value}</div>
                <div style={{ marginTop: 4, color: '#858983', fontSize: 9, fontWeight: 850 }}>{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Challenge: no fake reward/value invented */}
        <section style={{ marginTop: 14, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 28, padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Trophy size={17} />
            <div style={{ fontSize: 10, fontWeight: 950, letterSpacing: '.1em' }}>TON CHALLENGE</div>
          </div>
          <div style={{ marginTop: 12, fontSize: 22, lineHeight: 1.05, fontWeight: 950, letterSpacing: '-.03em' }}>
            CONTINUE À CONSTRUIRE TON NIVEAU.
          </div>
          <div style={{ marginTop: 8, color: MUTED, fontSize: 13, lineHeight: 1.5 }}>
            {nextLevel
              ? `Ton prochain palier est ${nextLevel.name}. Il te reste ${xpRemaining} XP à gagner grâce aux actions réellement récompensées par NOX.`
              : 'Tu as atteint le dernier palier actuel. Continue à faire progresser ta transformation.'}
          </div>
          <button onClick={() => navigate('/leaderboard')} style={outlineButton}>
            VOIR MES CHALLENGES <ChevronRight size={16} />
          </button>
        </section>

        {/* PR */}
        {recentPRs.length > 0 && (
          <section style={{ marginTop: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 950, letterSpacing: '.09em', marginBottom: 11 }}>
              DERNIERS RECORDS
            </div>
            {recentPRs.slice(0, 3).map((pr) => (
              <div key={pr.id} style={simpleCard}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 900 }}>{pr.exercise_name}</div>
                  <div style={{ marginTop: 3, color: MUTED, fontSize: 11 }}>
                    Record personnel
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 900 }}>{pr.weight} kg × {pr.reps}</div>
              </div>
            ))}
          </section>
        )}

        {/* Account / personal settings */}
        <section style={{ marginTop: 30 }}>
          <div style={{ fontSize: 11, fontWeight: 950, letterSpacing: '.09em', marginBottom: 11 }}>
            TON NOX
          </div>

          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 24, overflow: 'hidden' }}>
            {menu.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.title}
                  onClick={() => navigate(item.route)}
                  style={{
                    width: '100%',
                    minHeight: 70,
                    padding: '13px 15px',
                    border: 0,
                    borderBottom: index < menu.length - 1 ? `1px solid ${BORDER}` : 'none',
                    background: WHITE,
                    color: BLACK,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 13,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 13, background: BG, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Icon size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 900 }}>{item.title}</div>
                    <div style={{ marginTop: 3, color: MUTED, fontSize: 10.5 }}>{item.detail}</div>
                  </div>
                  <ChevronRight size={17} color={MUTED} />
                </button>
              );
            })}
          </div>
        </section>

        <section style={{ marginTop: 14 }}>
          <button onClick={copyInvite} style={{ ...outlineButton, width: '100%', justifyContent: 'space-between' }}>
            <span>{copied ? 'LIEN COPIÉ ✓' : 'INVITER UN AMI'}</span>
            <Sparkles size={16} />
          </button>
        </section>

        <section style={{ marginTop: 28 }}>
          <button
            onClick={logout}
            style={{
              width: '100%',
              minHeight: 54,
              border: `1px solid ${BORDER}`,
              borderRadius: 18,
              background: WHITE,
              color: BLACK,
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 850,
              cursor: 'pointer',
            }}
          >
            <span>DÉCONNEXION</span>
            <LogOut size={18} />
          </button>

          <button
            onClick={() => navigate('/settings')}
            style={{
              width: '100%',
              marginTop: 8,
              border: 0,
              background: 'transparent',
              color: '#A24A43',
              padding: 12,
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            GÉRER OU SUPPRIMER MON COMPTE
          </button>
        </section>
      </main>

      <BottomNav active="profile" />
    </div>
  );
}

const simpleCard = {
  background: WHITE,
  border: `1px solid ${BORDER}`,
  borderRadius: 20,
  padding: '15px 16px',
  marginBottom: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
} as const;

const darkSmallButton = {
  minHeight: 46,
  marginTop: 17,
  padding: '0 15px',
  border: 0,
  borderRadius: 15,
  background: BLACK,
  color: WHITE,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 11,
  fontWeight: 900,
  cursor: 'pointer',
} as const;

const outlineButton = {
  minHeight: 48,
  marginTop: 17,
  padding: '0 15px',
  border: `1px solid ${BORDER}`,
  borderRadius: 16,
  background: WHITE,
  color: BLACK,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 11,
  fontWeight: 900,
  cursor: 'pointer',
} as const;
