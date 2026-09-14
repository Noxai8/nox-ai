import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

export default function Program() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [program, setProgram] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: prog } = await supabase.from('programs').select('*').eq('user_id', user.id).eq('active', true).maybeSingle();
      if (prog) {
        setProgram(prog);
        const { data: sess } = await supabase.from('program_sessions')
          .select('*, program_exercises(*)')
          .eq('program_id', prog.id)
          .order('order_index');
        setSessions(sess || []);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return <div style={{ minHeight: '100vh', background: '#0a0a0a' }} />;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: 90 }}>
      <div style={{ padding: '24px 20px 0' }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 4, letterSpacing: '-.025em' }}>
          {program?.name || 'Mon Programme'}
        </h1>
        <div style={{ fontSize: 13, color: '#444', marginBottom: 28 }}>
          {program?.goal} · {program?.sessions_per_week} séances/semaine
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sessions.map((sess, i) => (
            <div key={sess.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>{sess.day_of_week || `Séance ${i+1}`}</div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: '#fff' }}>{sess.name}</div>
                </div>
                <button onClick={() => navigate(`/training/${sess.id}`)}
                  style={{ background: ACCENT, color: '#0a0a0a', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>
                  START
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(sess.program_exercises || []).slice(0, 4).map((ex: any) => (
                  <span key={ex.id} style={{ background: '#1a1a1a', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: '#555', fontWeight: 600 }}>
                    {ex.name}
                  </span>
                ))}
                {(sess.program_exercises?.length || 0) > 4 && (
                  <span style={{ background: '#1a1a1a', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: '#555' }}>
                    +{sess.program_exercises.length - 4}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <BottomNav active="training" />
    </div>
  );
}
