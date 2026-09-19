import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

type View = 'clients' | 'client_detail' | 'messages' | 'analytics';

export default function CoachDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('clients');
  const [clients, setClients] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [clientData, setClientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState('');
  const [message, setMessage] = useState('');
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => { if (user) { init(); } }, [user]);

  const init = async () => {
    // Générer un code coach unique
    setInviteCode(user!.id.slice(0, 8).toUpperCase() + '-COACH');
    await loadClients();
    setLoading(false);
  };

  const loadClients = async () => {
    // Chercher les profils qui ont ce coach_id
    const { data } = await supabase.from('profiles')
      .select('id, display_name, goal_type, xp, streak_days, experience_level, created_at, starting_weight_kg')
      .eq('coach_id', user!.id)
      .order('created_at', { ascending: false });
    setClients(data || []);
  };

  const loadClientData = async (clientId: string) => {
    const weekStart = new Date(Date.now() - 7 * 86400000).toISOString();
    const [
      { data: workouts },
      { data: prs },
      { data: body },
      { data: food },
      { data: mood },
    ] = await Promise.all([
      supabase.from('workouts').select('*').eq('user_id', clientId).eq('status', 'completed').order('created_at', { ascending: false }).limit(10),
      supabase.from('personal_records').select('*').eq('user_id', clientId).order('created_at', { ascending: false }).limit(5),
      supabase.from('body_logs').select('weight, created_at').eq('user_id', clientId).order('created_at', { ascending: false }).limit(10),
      supabase.from('food_entries').select('calories, protein, created_at').eq('user_id', clientId).gte('created_at', weekStart),
      supabase.from('mood_logs').select('mood_score, created_at').eq('user_id', clientId).gte('created_at', weekStart),
    ]);

    const weekWorkouts = (workouts || []).filter(w => new Date(w.created_at) >= new Date(weekStart));
    const avgKcal = food?.length ? Math.round(food.reduce((s, f) => s + f.calories, 0) / 7) : null;
    const avgMood = mood?.length ? Math.round(mood.reduce((s, m) => s + m.mood_score, 0) / mood.length * 10) / 10 : null;
    const currentWeight = body?.[0]?.weight;
    const startWeight = body?.[body.length - 1]?.weight;
    const weightDelta = currentWeight && startWeight ? (currentWeight - startWeight).toFixed(1) : null;

    setClientData({
      workouts: workouts || [],
      weekWorkouts: weekWorkouts.length,
      prs: prs || [],
      body: body || [],
      currentWeight,
      weightDelta,
      avgKcal,
      avgMood,
    });
  };

  const selectClient = async (client: any) => {
    setSelected(client);
    setView('client_detail');
    await loadClientData(client.id);
  };

  const generateInviteLink = () => {
    const link = `https://noxai.fr/join-coach/${inviteCode}`;
    navigator.clipboard.writeText(link);
    setSentMsg('Lien copié ! Envoie-le à ton client.');
    setTimeout(() => setSentMsg(''), 3000);
  };

  const sendNote = async () => {
    if (!message || !selected) return;
    setSending(true);
    // Sauvegarder un message coach → client
    await supabase.from('coach_messages').insert({
      coach_id: user!.id,
      client_id: selected.id,
      message,
      created_at: new Date().toISOString(),
    });
    setMessage('');
    setSending(false);
    setSentMsg('Message envoyé !');
    setTimeout(() => setSentMsg(''), 2000);
  };

  const loadAnalytics = async () => {
    setView('analytics');
    if (!clients.length) { setAnalytics({ empty: true }); return; }

    // Agrégats sur tous les clients
    const allStats = await Promise.all(clients.map(async c => {
      const weekStart = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: wkts } = await supabase.from('workouts').select('id').eq('user_id', c.id).eq('status', 'completed').gte('created_at', weekStart);
      return { name: c.display_name || 'Client', weekWorkouts: wkts?.length || 0, streak: c.streak_days || 0, xp: c.xp || 0 };
    }));

    setAnalytics({
      totalClients: clients.length,
      activeThisWeek: allStats.filter(s => s.weekWorkouts > 0).length,
      avgStreak: Math.round(allStats.reduce((s, c) => s + c.streak, 0) / clients.length),
      topClient: allStats.sort((a, b) => b.xp - a.xp)[0],
      clientStats: allStats,
    });
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'grid', placeItems: 'center' }}>
      <div style={{ color: ACCENT, fontWeight: 900 }}>NOX PRO</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 0', borderBottom: '1px solid ' + BORDER }}>
        {view !== 'clients' && (
          <button onClick={() => { setView('clients'); setSelected(null); setClientData(null); }}
            style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 22, marginBottom: 12, display: 'block' }}>←</button>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: ACCENT, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 800 }}>NOX PRO</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>
              {view === 'clients' ? 'DASHBOARD COACH' :
               view === 'client_detail' ? selected?.display_name || 'Client' :
               view === 'analytics' ? 'ANALYTICS' : 'MESSAGES'}
            </div>
          </div>
          {view === 'clients' && (
            <button onClick={loadAnalytics}
              style={{ padding: '8px 14px', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 10, color: '#888', fontSize: 12, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>
              📊 Stats
            </button>
          )}
        </div>

        {/* Tabs vue clients */}
        {view === 'clients' && (
          <div style={{ display: 'flex', gap: 6, paddingBottom: 12 }}>
            <div style={{ background: ACCENT + '22', border: '1px solid ' + ACCENT + '44', borderRadius: 20, padding: '5px 14px', fontSize: 11, color: ACCENT, fontWeight: 700 }}>
              {clients.length} client{clients.length > 1 ? 's' : ''}
            </div>
            <div style={{ background: '#4488ff22', border: '1px solid #4488ff44', borderRadius: 20, padding: '5px 14px', fontSize: 11, color: '#4488ff', fontWeight: 700 }}>
              {clients.filter(c => (c.streak_days || 0) > 0).length} actifs
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '16px 20px 0' }}>

        {/* ── VUE CLIENTS ── */}
        {view === 'clients' && (
          <div>
            {/* Inviter un client */}
            <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: 18, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 8 }}>📨 INVITER UN CLIENT</div>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 12 }}>
                Partage ton code coach — le client l'entre à l'inscription pour être lié à toi.
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1, background: '#0d0d0d', border: '1px solid #222', borderRadius: 10, padding: '10px 14px', fontSize: 15, fontWeight: 900, color: ACCENT, letterSpacing: '.08em' }}>
                  {inviteCode}
                </div>
                <button onClick={generateInviteLink}
                  style={{ padding: '10px 14px', background: ACCENT, border: 'none', borderRadius: 10, color: '#000', fontWeight: 800, fontSize: 12, cursor: 'pointer', touchAction: 'manipulation' }}>
                  COPIER
                </button>
              </div>
              {sentMsg && <div style={{ fontSize: 12, color: ACCENT, fontWeight: 700 }}>{sentMsg}</div>}
            </div>

            {/* Liste clients */}
            {clients.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#555' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
                <div style={{ fontSize: 14, marginBottom: 8 }}>Pas encore de clients</div>
                <div style={{ fontSize: 12 }}>Partage ton code coach pour les inviter</div>
              </div>
            ) : (
              clients.map(client => {
                const isActive = (client.streak_days || 0) > 0;
                return (
                  <button key={client.id} onClick={() => selectClient(client)}
                    style={{ width: '100%', background: SURFACE, border: '1px solid ' + (isActive ? ACCENT + '22' : BORDER), borderRadius: 14, padding: '14px 16px', marginBottom: 10, textAlign: 'left', cursor: 'pointer', touchAction: 'manipulation' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{client.display_name || 'Client sans nom'}</div>
                        <div style={{ fontSize: 12, color: '#555', marginTop: 3 }}>
                          {client.goal_type || '—'} · {client.experience_level || '—'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {isActive ? (
                          <div style={{ fontSize: 11, color: '#ff6600', fontWeight: 700 }}>🔥 {client.streak_days}j</div>
                        ) : (
                          <div style={{ fontSize: 11, color: '#333' }}>Inactif</div>
                        )}
                        <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{client.xp || 0} XP</div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* ── DÉTAIL CLIENT ── */}
        {view === 'client_detail' && selected && (
          <div>
            {/* Stats clés */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
              {[
                { label: 'Séances/sem', value: clientData?.weekWorkouts ?? '—', color: clientData?.weekWorkouts >= 3 ? ACCENT : '#fff' },
                { label: 'Poids actuel', value: clientData?.currentWeight ? clientData.currentWeight + 'kg' : '—', color: '#fff' },
                { label: 'Évolution', value: clientData?.weightDelta ? (parseFloat(clientData.weightDelta) > 0 ? '+' : '') + clientData.weightDelta + 'kg' : '—', color: '#fff' },
                { label: 'Humeur moy.', value: clientData?.avgMood ? clientData.avgMood + '/5' : '—', color: '#fff' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color }}>{value}</div>
                  <div style={{ fontSize: 9, color: '#555', fontWeight: 700, marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Calories semaine */}
            {clientData?.avgKcal && (
              <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: '#555', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>NUTRITION CETTE SEMAINE</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: ACCENT }}>{clientData.avgKcal} kcal/jour</div>
              </div>
            )}

            {/* Dernières séances */}
            {clientData?.workouts?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#555', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>DERNIÈRES SÉANCES</div>
                {clientData.workouts.slice(0, 5).map((w: any) => (
                  <div key={w.id} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '10px 14px', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{w.program_name || 'Séance'}</div>
                      <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                        {new Date(w.created_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {w.duration_minutes ? ` · ${w.duration_minutes}min` : ''}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: ACCENT }}>✓</div>
                  </div>
                ))}
              </div>
            )}

            {/* PRs récents */}
            {clientData?.prs?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#555', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>RECORDS RÉCENTS</div>
                {clientData.prs.map((pr: any) => (
                  <div key={pr.id} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '10px 14px', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{pr.exercise_name}</div>
                    <div style={{ fontSize: 13, color: ACCENT, fontWeight: 700 }}>{pr.weight}kg × {pr.reps}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Message coach */}
            <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#fff', marginBottom: 10 }}>💬 ENVOYER UN MESSAGE</div>
              <textarea value={message} onChange={e => setMessage(e.target.value)}
                placeholder={`Message pour ${selected.display_name || 'ton client'}...`}
                style={{ width: '100%', minHeight: 80, padding: '10px 12px', background: '#0d0d0d', border: '1px solid ' + BORDER, borderRadius: 10, color: '#fff', fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit', marginBottom: 10 }} />
              {sentMsg && <div style={{ fontSize: 12, color: ACCENT, marginBottom: 8 }}>{sentMsg}</div>}
              <button onClick={sendNote} disabled={!message || sending}
                style={{ width: '100%', padding: 12, background: message ? ACCENT : '#1a1a1a', border: 'none', borderRadius: 10, color: message ? '#000' : '#333', fontWeight: 800, fontSize: 13, cursor: message ? 'pointer' : 'not-allowed', touchAction: 'manipulation' as const }}>
                {sending ? 'Envoi...' : 'ENVOYER'}
              </button>
            </div>
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {view === 'analytics' && analytics && (
          <div>
            {analytics.empty ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#555' }}>Pas encore de clients à analyser</div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                  {[
                    { label: 'Clients total', value: analytics.totalClients, color: '#fff' },
                    { label: 'Actifs cette semaine', value: analytics.activeThisWeek, color: ACCENT },
                    { label: 'Streak moyen', value: analytics.avgStreak + 'j', color: '#ff6600' },
                    { label: 'Top client', value: analytics.topClient?.name || '—', color: ACCENT },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: 16, textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color }}>{value}</div>
                      <div style={{ fontSize: 10, color: '#555', fontWeight: 700, marginTop: 4 }}>{label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: 11, color: '#555', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>CLASSEMENT CLIENTS</div>
                {analytics.clientStats.sort((a: any, b: any) => b.weekWorkouts - a.weekWorkouts).map((c: any, i: number) => (
                  <div key={i} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '12px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontSize: 14, color: '#555', width: 20 }}>#{i + 1}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{c.name}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: c.weekWorkouts >= 3 ? ACCENT : '#fff' }}>{c.weekWorkouts} séances</div>
                        <div style={{ fontSize: 10, color: '#555' }}>cette semaine</div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <BottomNav active="settings" />
    </div>
  );
}
