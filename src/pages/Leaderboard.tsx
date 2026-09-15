import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'xp' | 'workouts' | 'streak' | 'prs'>('xp');
  const [players, setPlayers] = useState<any[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => { if (user) load(); }, [user, tab]);

  const load = async () => {
    setLoading(true);

    const { data: me } = await supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle();
    setMyProfile(me);
    setInviteCode(user!.id.slice(0, 8).toUpperCase());

    // Récupérer les stats selon l'onglet
    let query = supabase.from('profiles').select('id, display_name, xp, streak_days, level');

    if (tab === 'xp') query = query.order('xp', { ascending: false }).limit(50);
    else if (tab === 'streak') query = query.order('streak_days', { ascending: false }).limit(50);

    const { data: allProfiles } = await query;

    if (tab === 'workouts' || tab === 'prs') {
      // Compter séances ou PR pour chaque joueur
      const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const table = tab === 'workouts' ? 'workouts' : 'personal_records';
      const filter = tab === 'workouts' ? { status: 'completed' } : {};

      const enriched = await Promise.all((allProfiles || []).map(async (p: any) => {
        let q = supabase.from(table).select('id', { count: 'exact' }).eq('user_id', p.id);
        if (tab === 'workouts') q = q.eq('status', 'completed').gte('created_at', weekStart);
        const { count } = await q;
        return { ...p, score: count || 0 };
      }));
      const sorted = enriched.sort((a, b) => b.score - a.score);
      setPlayers(sorted);
      const myIdx = sorted.findIndex((p: any) => p.id === user!.id);
      setMyRank(myIdx >= 0 ? myIdx + 1 : null);
    } else {
      const list = allProfiles || [];
      setPlayers(list);
      const myIdx = list.findIndex((p: any) => p.id === user!.id);
      setMyRank(myIdx >= 0 ? myIdx + 1 : null);
    }

    setLoading(false);
  };

  const getScore = (p: any) => {
    if (tab === 'xp') return (p.xp || 0) + ' XP';
    if (tab === 'streak') return (p.streak_days || 0) + 'j 🔥';
    if (tab === 'workouts') return (p.score || 0) + ' séances';
    if (tab === 'prs') return (p.score || 0) + ' PR';
    return '';
  };

  const getScoreValue = (p: any) => {
    if (tab === 'xp') return p.xp || 0;
    if (tab === 'streak') return p.streak_days || 0;
    return p.score || 0;
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(`Rejoins-moi sur NOX ! Mon code : ${inviteCode} — noxai.fr`);
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 80 }}>
      <div style={{ padding: '24px 20px 0', borderBottom: '1px solid ' + BORDER }}>
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>Compétition</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 16 }}>CLASSEMENT</div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12 }}>
          {[
            { id: 'xp', label: '⚡ XP' },
            { id: 'streak', label: '🔥 Streak' },
            { id: 'workouts', label: '🏋️ Séances/sem' },
            { id: 'prs', label: '🏆 Records' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              style={{ padding: '8px 14px', borderRadius: 20, border: '1px solid ' + (tab === t.id ? ACCENT : BORDER), background: tab === t.id ? ACCENT + '22' : 'transparent', color: tab === t.id ? ACCENT : '#555', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, touchAction: 'manipulation' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 20px 0' }}>
        {/* Mon rang */}
        {myRank && myProfile && (
          <div style={{ background: ACCENT + '11', border: '1px solid ' + ACCENT + '33', borderRadius: 14, padding: '14px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: ACCENT, fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>TON CLASSEMENT</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>#{myRank}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>{myProfile.display_name}</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: ACCENT }}>{getScore(myProfile)}</div>
            </div>
          </div>
        )}

        {/* Top 3 podium */}
        {!loading && players.length >= 3 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'flex-end' }}>
            {[1, 0, 2].map(i => {
              const p = players[i];
              const heights = [120, 150, 100];
              const h = heights[i === 0 ? 1 : i === 1 ? 0 : 2];
              return (
                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 20 }}>{MEDALS[i]}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: p?.id === user?.id ? ACCENT : '#fff', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p?.display_name?.split(' ')[0] || 'NOX'}
                  </div>
                  <div style={{ background: i === 0 ? ACCENT + '33' : SURFACE, border: '1px solid ' + (i === 0 ? ACCENT + '66' : BORDER), borderRadius: '10px 10px 0 0', height: h, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: i === 0 ? ACCENT : '#fff' }}>{getScore(p)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Liste complète */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#555' }}>Chargement...</div>
        ) : (
          <div>
            <div style={{ fontSize: 11, color: '#555', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>
              CLASSEMENT COMPLET · {players.length} joueurs
            </div>
            {players.map((p: any, i: number) => (
              <div key={p.id} style={{ background: p.id === user?.id ? ACCENT + '11' : SURFACE, border: '1px solid ' + (p.id === user?.id ? ACCENT + '44' : BORDER), borderRadius: 12, padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 28, textAlign: 'center', fontSize: i < 3 ? 20 : 13, fontWeight: 900, color: i < 3 ? '#fff' : '#555', flexShrink: 0 }}>
                  {i < 3 ? MEDALS[i] : `#${i + 1}`}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: p.id === user?.id ? ACCENT : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.display_name || 'Athlète NOX'} {p.id === user?.id ? '(toi)' : ''}
                  </div>
                  <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{p.level || 'Novice'}</div>
                </div>

                {/* Barre de progression relative */}
                <div style={{ width: 80, marginRight: 8 }}>
                  <div style={{ height: 4, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: Math.round((getScoreValue(p) / Math.max(getScoreValue(players[0]), 1)) * 100) + '%', background: p.id === user?.id ? ACCENT : '#333', borderRadius: 2 }} />
                  </div>
                </div>

                <div style={{ fontSize: 14, fontWeight: 900, color: p.id === user?.id ? ACCENT : '#fff', flexShrink: 0 }}>
                  {getScore(p)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Inviter des amis */}
        <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: 16, marginTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 8 }}>INVITER DES AMIS</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ flex: 1, background: '#0d0d0d', border: '1px solid #222', borderRadius: 10, padding: '10px 14px', fontSize: 16, fontWeight: 900, color: ACCENT, letterSpacing: '.1em' }}>
              {inviteCode}
            </div>
            <button onClick={copyInvite}
              style={{ padding: '10px 16px', background: ACCENT, border: 'none', borderRadius: 10, color: '#000', fontWeight: 800, fontSize: 13, cursor: 'pointer', touchAction: 'manipulation' }}>
              COPIER
            </button>
          </div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 8 }}>Partage ce code pour que tes amis rejoignent NOX et apparaissent dans le classement</div>
        </div>
      </div>

      <BottomNav active="play" />
    </div>
  );
}
