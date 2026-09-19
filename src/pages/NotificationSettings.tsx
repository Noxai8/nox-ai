import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestNotificationPermission, registerServiceWorker, scheduleWorkoutReminder, scheduleStreakReminder } from '../lib/notifications';
import { BottomNav } from '../components/BottomNav';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const ACCENT = '#B7FF00';
const BG = '#F7F7F7';
const SURFACE = '#FFFFFF';
const BORDER = '#EAEAEA';

export default function NotificationSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [prefs, setPrefs] = useState({ workout: true, streak: true, weekly: true, future: true, meal: false, water: false, steps: false, pr: true, sync: true });
  const [workoutHour, setWorkoutHour] = useState('9');
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    setPermission(Notification.permission as NotificationPermission);
    if (user) supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(({ data }) => setProfile(data));
  }, [user]);

  const enable = async () => {
    const granted = await requestNotificationPermission();
    setPermission(granted ? 'granted' : 'denied');
    if (granted) await registerServiceWorker();
  };

  const save = async () => {
    if (permission !== 'granted') return;
    if (prefs.workout && profile) {
      const sessions = profile.available_days || [];
      scheduleWorkoutReminder('Séance du jour', parseInt(workoutHour));
    }
    if (prefs.streak && profile?.streak_days > 0) {
      scheduleStreakReminder(profile.streak_days);
    }
    await supabase.from('profiles').update({ notification_prefs: prefs }).eq('id', user!.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const notifications = [
    { key: 'workout', icon: '🏋️', title: 'Séance du jour', desc: 'Rappel quotidien à l\'heure choisie' },
    { key: 'streak', icon: '🔥', title: 'Streak en danger', desc: 'Alerte à 20h si tu n\'as pas encore bougé' },
    { key: 'weekly', icon: '📊', title: 'Bilan hebdomadaire', desc: 'Dimanche soir — ton review est prêt' },
    { key: 'meal', icon: '🍽️', title: 'Repas non enregistré', desc: 'Rappel de suivi nutrition quand tu le souhaites' },
    { key: 'water', icon: '💧', title: 'Hydratation', desc: 'Rappel pour enregistrer ton eau' },
    { key: 'steps', icon: '👟', title: 'Objectif activité', desc: 'Quand tu approches de ton objectif quotidien' },
    { key: 'pr', icon: '🏆', title: 'Nouveau record', desc: 'Quand NOX détecte un PR enregistré' },
    { key: 'sync', icon: '⌚', title: 'Synchronisation appareil', desc: 'Alerte en cas de problème de synchronisation' },
    { key: 'future', icon: '📈', title: 'Trajectoire mise à jour', desc: 'Quand de nouvelles données modifient ta tendance' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 40 }}>
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid ' + BORDER }}>
        <button onClick={() => navigate('/settings')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14, marginBottom: 12 }}>← Retour</button>
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em' }}>Notifications</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#0A0A0A' }}>ALERTES NOX</div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        {permission !== 'granted' ? (
          <div style={{ background: ACCENT + '11', border: '1px solid ' + ACCENT + '33', borderRadius: 16, padding: 24, marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0A0A0A', marginBottom: 8 }}>Activer les notifications</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 20, lineHeight: 1.5 }}>
              NOX te prévient pour tes séances, ton streak et tes bilans hebdo.
            </div>
            {permission === 'denied' ? (
              <div style={{ fontSize: 13, color: '#ff6666' }}>Notifications bloquées — active-les dans les paramètres de ton navigateur.</div>
            ) : (
              <button onClick={enable}
                style={{ padding: '14px 32px', background: ACCENT, border: 'none', borderRadius: 12, color: '#000', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
                ACTIVER LES NOTIFICATIONS
              </button>
            )}
          </div>
        ) : (
          <div style={{ background: ACCENT + '11', border: '1px solid ' + ACCENT + '33', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <span style={{ fontSize: 13, color: ACCENT, fontWeight: 700 }}>Notifications activées</span>
          </div>
        )}

        {/* Préférences */}
        <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
          {notifications.map((notif, i) => (
            <div key={notif.key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderBottom: i < notifications.length - 1 ? '1px solid ' + BORDER : 'none' }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{notif.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A' }}>{notif.title}</div>
                <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{notif.desc}</div>
              </div>
              <button onClick={() => setPrefs(p => ({ ...p, [notif.key]: !p[notif.key as keyof typeof p] }))}
                style={{ width: 48, height: 26, borderRadius: 13, background: prefs[notif.key as keyof typeof prefs] ? ACCENT : '#DADADA', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: prefs[notif.key as keyof typeof prefs] ? 25 : 3, transition: 'left .2s' }} />
              </button>
            </div>
          ))}
        </div>

        {/* Heure séance */}
        {prefs.workout && (
          <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>HEURE DE RAPPEL SÉANCE</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['7', '8', '9', '12', '17', '18'].map(h => (
                <button key={h} onClick={() => setWorkoutHour(h)}
                  style={{ flex: 1, padding: '10px 0', background: workoutHour === h ? ACCENT : '#FFFFFF', border: '1px solid ' + (workoutHour === h ? ACCENT : BORDER), borderRadius: 10, color: workoutHour === h ? '#000' : '#666', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
                  {h}h
                </button>
              ))}
            </div>
          </div>
        )}

        <button onClick={save} disabled={permission !== 'granted'}
          style={{ width: '100%', padding: 16, background: permission === 'granted' ? ACCENT : '#E2E2E2', border: 'none', borderRadius: 14, color: permission === 'granted' ? '#000' : '#333', fontWeight: 900, fontSize: 14, cursor: permission === 'granted' ? 'pointer' : 'not-allowed' }}>
          {saved ? '✓ ENREGISTRÉ' : 'ENREGISTRER LES PRÉFÉRENCES'}
        </button>
      </div>
      <BottomNav active="settings" />
    </div>
  );
}
