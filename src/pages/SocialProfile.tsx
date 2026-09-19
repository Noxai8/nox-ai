import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

const LEVELS = [
  { level: 1, name: 'NOVICE', minXp: 0, color: '#555' },
  { level: 2, name: 'DÉBUTANT', minXp: 200, color: '#4488ff' },
  { level: 3, name: 'ATHLÈTE', minXp: 600, color: '#44cc88' },
  { level: 4, name: 'PERFORMER', minXp: 1200, color: '#ffaa00' },
  { level: 5, name: 'ÉLITE', minXp: 2500, color: '#ff4444' },
  { level: 6, name: 'LÉGENDE NOX', minXp: 5000, color: ACCENT },
];
function getLevel(xp: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) if (xp >= LEVELS[i].minXp) return LEVELS[i];
  return LEVELS[0];
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
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [shareMode, setShareMode] = useState<'workout' | 'pr' | 'profile' | null>(null);
  const [shareText, setShareText] = useState('');

  useEffect(() => { if (profileId) load(); }, [profileId]);

  const load = async () => {
    const weekStart = new Date(Date.now() - 7 * 86400000).toISOString();
    const [
      { data: prof },
      { data: workouts },
      { data: prs },
      { data: earned },
    ] = await Promise.all([
      supabase.from('profiles').select('display_name, goal_type, xp, streak_days, experience_level, created_at').eq('id', profileId!).maybeSingle(),
      supabase.from('workouts').select('id, created_at, program_name, duration_minutes').eq('user_id', profileId!).eq('status', 'completed').order('created_at', { ascending: false }).limit(5),
      supabase.from('personal_records').select('*').eq('user_id', profileId!).order('created_at', { ascending: false }).limit(10),
      supabase.from('user_achievements').select('achievement_id').eq('user_id', profileId!),
    ]);

    setProfile(prof);
    setRecentPRs(prs || []);
    setAchievements((earned || []).map(a => a.achievement_id));
    setStats({
      totalWorkouts: workouts?.length || 0,
      recentWorkouts: workouts || [],
      streak: prof?.streak_days || 0,
      xp: prof?.xp || 0,
      memberSince: prof?.created_at ? new Date(prof.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '—',
    });
    setShareUrl(`https://noxai.fr/profile/${profileId}`);
    setLoading(false);
  };

  const copyInvite = () => {
    const text = `Je m'entraîne avec NOX AI — rejoins-moi ! noxai.fr`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWorkout = async (workout: any) => {
    const text = `🏋️ Séance terminée avec NOX AI !\n${workout.program_name || 'Séance'} · ${workout.duration_minutes || '?'} min\n💪 noxai.fr`;
    setShareText(text);
    setShareMode('workout');
  };

  const sharePR = async (pr: any) => {
    const text = `🏆 Nouveau record personnel avec NOX AI !\n${pr.exercise_name} — ${pr.weight}kg × ${pr.reps} reps\n⚡ noxai.fr`;
    setShareText(text);
    setShareMode('pr');
  };

  const doShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ text: shareText, url: 'https://noxai.fr' }); }
      catch {}
    } else {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    setShareMode(null);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'grid', placeItems: 'center' }}>
      <div style={{ color: ACCENT, fontWeight: 900 }}>Chargement...</div>
    </div>
  );

  const level = getLevel(stats.xp);

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 90 }}>
      {/* Share modal */}
      {shareMode && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.9)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: '#0d0d0d', borderRadius: '20px 20px 0 0', padding: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 12 }}>
              {shareMode === 'workout' ? '📤 Partager la séance' : '📤 Partager le PR'}
            </div>
            <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 13, color: '#ccc', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {shareText}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShareMode(null)}
                style={{ flex: 1, padding: 14, background: 'transparent', border: '1px solid ' + BORDER, borderRadius: 12, color: '#555', fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
              <button onClick={doShare}
                style={{ flex: 2, padding: 14, background: ACCENT, border: 'none', borderRadius: 12, color: '#000', fontWeight: 900, cursor: 'pointer' }}>
                {copied ? '✓ Copié !' : '📤 PARTAGER'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header profil */}
      <div style={{ padding: '20px 20px 0' }}>
        {!isOwnProfile && (
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 22, marginBottom: 12, display: 'block' }}>←</button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          {/* Avatar */}
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: `linear-gradient(135deg, ${level.color}44, ${SURFACE})`, border: '2px solid ' + level.color + '44', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 28 }}>⚡</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>{profile?.display_name || 'Athlète NOX'}</div>
            <div style={{ fontSize: 12, color: level.color, fontWeight: 700, marginTop: 2 }}>Niv.{level.level} {level.name}</div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Membre depuis {stats.memberSince}</div>
          </div>
          {isOwnProfile && (
            <button onClick={copyInvite}
              style={{ padding: '8px 14px', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 10, color: '#888', fontSize: 12, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>
              {copied ? '✓' : '🔗 Inviter'}
            </button>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
          {[
            { label: 'XP', value: stats.xp?.toLocaleString() || '0' },
            { label: 'Séances', value: stats.totalWorkouts },
            { label: 'Streak', value: (stats.streak || 0) + 'j' },
            { label: 'Badges', value: achievements.length },
          ].map(({ label, value }, i) => (
            <div key={label} style={{ padding: '14px 0', textAlign: 'center', borderRight: i < 3 ? '1px solid ' + BORDER : 'none' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: ACCENT }}>{value}</div>
              <div style={{ fontSize: 9, color: '#555', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Objectif */}
        {profile?.goal_type && (
          <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>🎯</span>
            <span style={{ fontSize: 13, color: '#888' }}>Objectif : <strong style={{ color: '#fff' }}>{profile.goal_type}</strong></span>
          </div>
        )}

        {/* Séances récentes */}
        <div style={{ fontSize: 11, color: '#555', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>
          {isOwnProfile ? 'MES DERNIÈRES SÉANCES' : 'DERNIÈRES SÉANCES'}
        </div>
        {stats.recentWorkouts?.slice(0, 3).map((w: any) => (
          <div key={w.id} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '12px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{w.program_name || 'Séance'}</div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                {new Date(w.created_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                {w.duration_minutes ? ` · ${w.duration_minutes}min` : ''}
              </div>
            </div>
            {isOwnProfile && (
              <button onClick={() => shareWorkout(w)}
                style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #1a1a1a', borderRadius: 8, color: '#555', fontSize: 12, cursor: 'pointer', touchAction: 'manipulation' }}>
                📤
              </button>
            )}
          </div>
        ))}
        {stats.recentWorkouts?.length === 0 && (
          <div style={{ textAlign: 'center', color: '#333', padding: '20px 0', fontSize: 13 }}>Pas encore de séances</div>
        )}

        {/* PRs récents */}
        {recentPRs.length > 0 && (
          <>
            <div style={{ fontSize: 11, color: '#555', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10, marginTop: 20 }}>
              RECORDS PERSONNELS
            </div>
            {recentPRs.slice(0, 5).map((pr: any) => (
              <div key={pr.id} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '12px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{pr.exercise_name}</div>
                  <div style={{ fontSize: 12, color: ACCENT, marginTop: 2, fontWeight: 700 }}>{pr.weight}kg × {pr.reps} reps</div>
                </div>
                {isOwnProfile && (
                  <button onClick={() => sharePR(pr)}
                    style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #1a1a1a', borderRadius: 8, color: '#555', fontSize: 12, cursor: 'pointer', touchAction: 'manipulation' }}>
                    📤
                  </button>
                )}
              </div>
            ))}
          </>
        )}

        {/* QR Invitation */}
        {isOwnProfile && (
          <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: 16, marginTop: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#555', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>INVITE UN AMI</div>
            <div style={{ fontSize: 13, color: '#888', lineHeight: 1.6, marginBottom: 12 }}>
              Partage ton lien de profil NOX et défie tes amis dans le classement
            </div>
            <button onClick={copyInvite}
              style={{ width: '100%', padding: 14, background: ACCENT, border: 'none', borderRadius: 12, color: '#000', fontWeight: 900, fontSize: 14, cursor: 'pointer', touchAction: 'manipulation' }}>
              {copied ? '✓ LIEN COPIÉ !' : '🔗 COPIER MON LIEN DE PROFIL'}
            </button>
          </div>
        )}
      </div>

      <BottomNav active="play" />
    </div>
  );
}
