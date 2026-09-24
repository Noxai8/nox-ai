import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';
import { ArrowLeft, ChevronRight, Plus } from 'lucide-react';

const ACCENT = '#C8FF00';
const BG     = '#F7F8F4';
const WHITE  = '#FFFFFF';
const BLACK  = '#0B0B0B';
const MUTED  = '#7A7F76';
const BORDER = '#E8EAE4';
const LIME   = '#F0FFD0';

// Muscles par exercice — sans images
const MUSCLE_MAP: Record<string, string> = {
  'bench': 'Pectoraux · Triceps · Epaules',
  'squat': 'Quadriceps · Fessiers · Ischio',
  'deadlift': 'Ischio · Lombaires · Fessiers',
  'press': 'Epaules · Triceps',
  'curl': 'Biceps · Avant-bras',
  'row': 'Dos · Biceps · Trapèzes',
  'pull': 'Dos · Biceps',
  'dip': 'Triceps · Pectoraux',
  'lunge': 'Quadriceps · Fessiers',
  'plank': 'Abdominaux · Core',
  'fly': 'Pectoraux',
  'raise': 'Epaules',
  'extension': 'Triceps',
  'pushdown': 'Triceps',
  'crunch': 'Abdominaux',
  'hip': 'Fessiers · Ischio',
  'calf': 'Mollets',
  'leg': 'Jambes',
};

function getMuscles(name: string): string {
  const lower = (name || '').toLowerCase();
  for (const [key, val] of Object.entries(MUSCLE_MAP)) {
    if (lower.includes(key)) return val;
  }
  return 'Musculation';
}

type View = 'program' | 'session' | 'exercise';

export default function Program() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [program,   setProgram]   = useState<any>(null);
  const [loading,   setLoading]   = useState(true);
  const [view,      setView]      = useState<View>('program');
  const [selSession, setSelSession] = useState<any>(null);
  const [selEx,      setSelEx]    = useState<any>(null);
  const [filter,    setFilter]    = useState('Tous');
  const [profile,   setProfile]   = useState<any>(null);

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    setLoading(true);
    const [{ data: prog }, { data: prof }] = await Promise.all([
      supabase.from('workout_programs').select('*').eq('user_id', user!.id).eq('is_active', true).maybeSingle(),
      supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle(),
    ]);
    setProgram(prog); setProfile(prof); setLoading(false);
  };

  const sessions = program?.program_json?.sessions || [];
  const dayNames = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const todayName = dayNames[new Date().getDay()];
  const todaySession = sessions.find((s: any) =>
    String(s?.day || '').toLowerCase().includes(todayName.toLowerCase().slice(0,3))
  );

  // VUE EXERCISE
  if (view === 'exercise' && selEx) {
    const muscles = getMuscles(selEx.name);
    const tips: string[] = [
      'Garde le dos droit et les abdos contractes tout au long du mouvement.',
      'Controle la phase descendante — 2 secondes en descente minimum.',
      'Respire : expire a l\'effort, inspire au retour.',
      'Si la technique se degrade, reduis la charge.',
    ];
    return (
      <div style={{ minHeight: '100vh', background: BG, color: BLACK, paddingBottom: 110 }}>
        <div style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
          <header style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={() => setView('session')} style={{ width: 40, height: 40, borderRadius: 14, border: `1px solid ${BORDER}`, background: WHITE, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <ArrowLeft size={18} />
            </button>
            <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.1em' }}>TECHNIQUE</div>
          </header>
          <main style={{ padding: '24px 20px 0' }}>
            <h1 style={{ margin: '0 0 6px', fontSize: 32, lineHeight: .95, fontWeight: 950, letterSpacing: '-.04em' }}>{selEx.name}</h1>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 24 }}>{muscles}</div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'SERIES', v: selEx.sets || '3' },
                { label: 'REPS', v: selEx.reps || '8-12' },
                { label: 'REPOS', v: selEx.rest || '90s' },
              ].map(({ label, v }) => (
                <div key={label} style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '14px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 950, color: BLACK }}>{v}</div>
                  <div style={{ fontSize: 9, color: MUTED, fontWeight: 700, marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Zone typographique à la place de l'image */}
            <div style={{ background: BLACK, borderRadius: 24, padding: 28, marginBottom: 20, minHeight: 160, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.12em' }}>EXECUTION</div>
              <div>
                <div style={{ fontSize: 36, fontWeight: 950, color: WHITE, lineHeight: .95, letterSpacing: '-.04em' }}>
                  {selEx.sets || 3} × {selEx.reps || '8-12'}
                </div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>{muscles}</div>
              </div>
              <div style={{ display: 'inline-block', padding: '6px 12px', background: ACCENT, borderRadius: 20, fontSize: 11, fontWeight: 900, color: BLACK, alignSelf: 'flex-start' }}>
                Repos {selEx.rest || '90s'}
              </div>
            </div>

            {/* Conseils technique */}
            <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.1em', marginBottom: 12 }}>POINTS CLES</div>
            {tips.map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: i < tips.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                <div style={{ width: 24, height: 24, borderRadius: 8, background: LIME, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 900, color: '#687600', flexShrink: 0 }}>{i+1}</div>
                <div style={{ fontSize: 13, color: BLACK, lineHeight: 1.55 }}>{tip}</div>
              </div>
            ))}

            {selEx.note && (
              <div style={{ marginTop: 16, background: LIME, border: '1px solid #DDF59C', borderRadius: 16, padding: '12px 16px', fontSize: 13, color: '#456000', lineHeight: 1.55 }}>
                {selEx.note}
              </div>
            )}
          </main>
        </div>
        <BottomNav active="training" />
      </div>
    );
  }

  // VUE SESSION
  if (view === 'session' && selSession) {
    const exos = selSession.exercises || [];
    const isToday = todaySession === selSession;
    return (
      <div style={{ minHeight: '100vh', background: BG, color: BLACK, paddingBottom: 110 }}>
        <div style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
          <header style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={() => setView('program')} style={{ width: 40, height: 40, borderRadius: 14, border: `1px solid ${BORDER}`, background: WHITE, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <ArrowLeft size={18} />
            </button>
            <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.1em' }}>SÉANCE</div>
          </header>
          <main style={{ padding: '24px 20px 0' }}>
            {/* Hero séance */}
            <div style={{ background: BLACK, borderRadius: 28, padding: 22, marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.12em', marginBottom: 8 }}>
                {isToday ? "AUJOURD'HUI" : (selSession.day || '').toUpperCase()}
              </div>
              <h1 style={{ margin: '0 0 6px', fontSize: 32, lineHeight: .95, fontWeight: 950, color: WHITE, letterSpacing: '-.04em' }}>
                {selSession.name}
              </h1>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
                {exos.length} exercices · {selSession.duration || program?.program_json?.session_length_min || 60} min
              </div>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>OBJECTIF DE CETTE SÉANCE</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: WHITE, lineHeight: 1.4 }}>
                {selSession.objective || selSession.focus || `Développer ${getMuscles(selSession.name || '')}.`}
              </div>
            </div>

            {/* Liste exercices — sans images */}
            <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.1em', marginBottom: 12 }}>
              {exos.length} EXERCICE{exos.length > 1 ? 'S' : ''}
            </div>
            {exos.map((ex: any, i: number) => (
              <button key={i} onClick={() => { setSelEx(ex); setView('exercise'); }} style={{
                width: '100%', background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 18,
                padding: '16px 18px', marginBottom: 10, textAlign: 'left', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                boxSizing: 'border-box',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 9, background: BG, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 900, color: MUTED, flexShrink: 0 }}>{i+1}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: BLACK }}>{ex.name}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginLeft: 38 }}>
                    <span style={{ fontSize: 11, color: MUTED }}>{ex.sets || 3} × {ex.reps || '8-12'}</span>
                    <span style={{ fontSize: 11, color: '#C4C7C0' }}>·</span>
                    <span style={{ fontSize: 11, color: MUTED }}>{getMuscles(ex.name)}</span>
                  </div>
                </div>
                <ChevronRight size={16} color={MUTED} />
              </button>
            ))}

            {/* CTA COMMENCER */}
            <button
              onClick={() => {
                const idx = sessions.findIndex((s: any) => s === selSession);
                navigate(`/training/${selSession.id || idx}`);
              }}
              style={{
                width: '100%', padding: '18px 0', background: ACCENT, border: 0,
                borderRadius: 20, color: BLACK, fontSize: 14, fontWeight: 950,
                cursor: 'pointer', marginTop: 8, letterSpacing: '.02em',
              }}
            >
              COMMENCER →
            </button>
          </main>
        </div>
        <BottomNav active="training" />
      </div>
    );
  }

  // VUE PROGRAMME (liste)
  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'grid', placeItems: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: '-.04em', color: BLACK }}>NOX<span style={{ color: '#9ED100' }}>.</span></div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, color: BLACK, paddingBottom: 110 }}>
      <div style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
        <header style={{ padding: '22px 20px 0' }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.12em', marginBottom: 6 }}>ENTRAÎNEMENT</div>
          <h1 style={{ margin: '0 0 28px', fontSize: 36, lineHeight: .95, fontWeight: 950, letterSpacing: '-.05em' }}>
            BOUGE POUR<br />TON OBJECTIF.
          </h1>
        </header>

        <main style={{ padding: '0 20px' }}>

          {/* PAS DE PROGRAMME */}
          {!program && (
            <div style={{ background: BLACK, borderRadius: 24, padding: 24, marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.12em', marginBottom: 8 }}>PROGRAMME</div>
              <div style={{ fontSize: 22, fontWeight: 950, color: WHITE, lineHeight: 1.05, marginBottom: 12 }}>
                Pas encore de<br />programme généré.
              </div>
              <button onClick={() => navigate('/generate-program')} style={{
                padding: '12px 20px', background: ACCENT, border: 0, borderRadius: 14,
                color: BLACK, fontWeight: 900, fontSize: 13, cursor: 'pointer',
              }}>
                CRÉER MON PROGRAMME
              </button>
            </div>
          )}

          {/* SÉANCE DU JOUR */}
          {program && todaySession && (
            <div style={{ background: BLACK, borderRadius: 24, padding: 22, marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: '.12em', marginBottom: 8 }}>AUJOURD'HUI</div>
              <div style={{ fontSize: 26, fontWeight: 950, color: WHITE, lineHeight: 1.0, letterSpacing: '-.03em', marginBottom: 6 }}>
                {todaySession.name}
              </div>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
                {todaySession.exercises?.length || 0} exercices · {todaySession.duration || program?.program_json?.session_length_min || 60} min
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setSelSession(todaySession); setView('session'); }} style={{
                  flex: 1, padding: '12px 0', background: 'transparent', border: '1px solid #333',
                  borderRadius: 14, color: WHITE, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>
                  Voir la séance
                </button>
                <button onClick={() => {
                  const idx = sessions.findIndex((s: any) => s === todaySession);
                  navigate(`/training/${todaySession.id || idx}`);
                }} style={{
                  flex: 2, padding: '12px 0', background: ACCENT, border: 0,
                  borderRadius: 14, color: BLACK, fontSize: 13, fontWeight: 900, cursor: 'pointer',
                }}>
                  COMMENCER →
                </button>
              </div>
            </div>
          )}

          {/* REPOS */}
          {program && !todaySession && (
            <div style={{ background: LIME, border: '1px solid #DDF59C', borderRadius: 24, padding: 22, marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: '#687600', letterSpacing: '.12em', marginBottom: 8 }}>AUJOURD'HUI</div>
              <div style={{ fontSize: 26, fontWeight: 950, color: BLACK, lineHeight: 1.0, marginBottom: 6 }}>JOUR DE REPOS.</div>
              <div style={{ fontSize: 13, color: '#69715F' }}>La récupération fait partie de l'entraînement.</div>
            </div>
          )}

          {/* TOUTES LES SÉANCES */}
          {program && sessions.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.1em', marginBottom: 12 }}>
                MON PROGRAMME · {sessions.length} SÉANCE{sessions.length > 1 ? 'S' : ''}
              </div>
              {sessions.map((session: any, i: number) => {
                const isToday = session === todaySession;
                return (
                  <button key={i} onClick={() => { setSelSession(session); setView('session'); }} style={{
                    width: '100%', background: WHITE, border: `1px solid ${isToday ? ACCENT : BORDER}`,
                    borderRadius: 20, padding: '16px 18px', marginBottom: 10,
                    textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        {isToday && (
                          <div style={{ padding: '2px 8px', background: ACCENT, borderRadius: 20, fontSize: 9, fontWeight: 900, color: BLACK }}>
                            AUJOURD'HUI
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>
                          {String(session.day || `Jour ${i+1}`).toUpperCase()}
                        </div>
                      </div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: BLACK, marginBottom: 4 }}>{session.name}</div>
                      <div style={{ fontSize: 12, color: MUTED }}>
                        {session.exercises?.length || 0} exercices
                        {session.focus ? ` · ${session.focus}` : ''}
                      </div>
                    </div>
                    <ChevronRight size={18} color={MUTED} />
                  </button>
                );
              })}
            </>
          )}

          {/* LIENS UTILES */}
          <div style={{ marginTop: 6 }}>
            {[
              { label: 'Calendrier d\'entraînement', path: '/training-calendar' },
              { label: 'Modifier le programme',      path: '/generate-program' },
            ].map(({ label, path }) => (
              <button key={label} onClick={() => navigate(path)} style={{
                width: '100%', background: 'transparent', border: `1px solid ${BORDER}`,
                borderRadius: 16, padding: '14px 18px', marginBottom: 10,
                textAlign: 'left', cursor: 'pointer', display: 'flex',
                justifyContent: 'space-between', alignItems: 'center',
                boxSizing: 'border-box',
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: BLACK }}>{label}</span>
                <ChevronRight size={16} color={MUTED} />
              </button>
            ))}
          </div>
        </main>
      </div>
      <BottomNav active="training" />
    </div>
  );
}
