import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, BellOff, Check, Share } from 'lucide-react';
import { BottomNav } from './Home';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { currentSubscription, disablePushOnThisDevice, enablePushOnThisDevice, pushSupport } from '../lib/push';

const BG = '#090B0A';
const CARD = '#232624';
const CARD2 = '#191C1A';
const BORDER = '#4A4F4B';
const SOFT = '#343835';
const WHITE = '#FFFFFF';
const SEC = '#A5AAA6';
const MUTED = '#747A76';
const LIME = '#C8FF00';

type Prefs = {
  enabled: boolean;
  morning: boolean; morning_time: string;
  evening: boolean; evening_time: string;
  habits_check: boolean;
  weekly: boolean;
  quiet_start: string; quiet_end: string;
  max_per_day: number;
  nudge_nutrition: boolean;
  nudge_movement: boolean;
  nudge_mission: boolean;
  nudge_goals: boolean;
};

const DEFAULTS: Prefs = {
  enabled: true, morning: true, morning_time: '08:30', evening: true, evening_time: '21:00',
  habits_check: false, weekly: true, quiet_start: '22:30', quiet_end: '07:30', max_per_day: 2,
  nudge_nutrition: true, nudge_movement: true, nudge_mission: true, nudge_goals: true,
};

const hhmm = (t: string) => t.slice(0, 5);

export default function NotificationSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const support = pushSupport();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [deviceOn, setDeviceOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from('reminder_prefs').select('*').eq('user_id', user.id).maybeSingle();
      if (data) setPrefs({
        ...DEFAULTS, ...data,
        morning_time: hhmm(data.morning_time), evening_time: hhmm(data.evening_time),
        quiet_start: hhmm(data.quiet_start), quiet_end: hhmm(data.quiet_end),
      });
      setDeviceOn(!!(await currentSubscription()));
    })();
  }, [user]);

  const save = async (next: Prefs) => {
    setPrefs(next);
    if (!user) return;
    const { error } = await supabase.from('reminder_prefs').upsert({
      user_id: user.id, ...next,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    setMessage(error ? error.message : '');
  };

  const toggleDevice = async () => {
    if (!user || busy) return;
    setBusy(true); setMessage('');
    if (deviceOn) {
      await disablePushOnThisDevice();
      setDeviceOn(false);
    } else {
      const r = await enablePushOnThisDevice(user.id);
      if (r.ok) { setDeviceOn(true); await save(prefs); }
      else setMessage(r.reason === 'denied'
        ? 'Les notifications sont bloquées pour NOX. Autorise-les dans les réglages de ton navigateur ou de ton téléphone.'
        : `Impossible d’activer les rappels sur cet appareil (${r.reason}).`);
    }
    setBusy(false);
  };

  const sendTest = async () => {
    setBusy(true); setMessage('');
    const { data, error } = await supabase.functions.invoke('send-reminders', { body: { test: true } });
    setBusy(false);
    if (error) {
      const ctx = (error as any).context as Response | undefined;
      const status = ctx?.status;
      let detail = '';
      try { const b = await ctx?.json(); detail = b?.message || b?.error || ''; } catch { /* corps non JSON */ }
      setMessage(
        status === 404 ? 'Service introuvable (404) : la fonction send-reminders n’est pas encore en ligne dans Supabase.'
        : detail ? `Erreur du service${status ? ` (${status})` : ''} : ${detail}`
        : `Le service ne répond pas${status ? ` (code ${status})` : ''}. ${(error as any).message ?? ''}`.trim(),
      );
    }
    else setMessage(data?.sent ? 'Test envoyé. La notification devrait arriver dans quelques secondes.' : 'Aucun appareil actif trouvé pour ton compte.');
  };

  const card: React.CSSProperties = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20, marginBottom: 14 };
  const label: React.CSSProperties = { color: MUTED, fontSize: 11, fontWeight: 900, letterSpacing: '.09em', marginBottom: 12 };
  const time: React.CSSProperties = { padding: '10px 12px', borderRadius: 12, border: `1px solid ${SOFT}`, background: CARD2, color: WHITE, fontSize: 14, fontWeight: 800, colorScheme: 'dark' };

  const toggle = (on: boolean, onClick: () => void) => (
    <button onClick={onClick} aria-pressed={on}
      style={{ width: 50, height: 30, borderRadius: 999, border: 0, padding: 3, cursor: 'pointer', background: on ? LIME : SOFT, flexShrink: 0 }}>
      <span style={{ display: 'block', width: 24, height: 24, borderRadius: '50%', background: on ? BG : MUTED, transform: `translateX(${on ? 20 : 0}px)`, transition: 'transform .2s' }} />
    </button>
  );

  const row = (title: string, detail: string, on: boolean, onToggle: () => void, children?: React.ReactNode) => (
    <div key={title} style={{ padding: '14px 0', borderTop: `1px solid ${SOFT}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 900 }}>{title}</div>
          <div style={{ fontSize: 12, color: SEC, marginTop: 3, lineHeight: 1.45 }}>{detail}</div>
        </div>
        {toggle(on, onToggle)}
      </div>
      {on && children && <div style={{ marginTop: 10 }}>{children}</div>}
    </div>
  );

  return (
    <div style={{ minHeight: '100dvh', background: BG, color: WHITE, paddingBottom: 'calc(160px + env(safe-area-inset-bottom))' }}>
      <main style={{ width: '100%', maxWidth: 760, margin: '0 auto', padding: '0 16px', boxSizing: 'border-box' }}>
        <header style={{ paddingTop: 44, paddingBottom: 22, display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => navigate(-1)} aria-label="Retour"
            style={{ width: 42, height: 42, borderRadius: 14, border: `1px solid ${BORDER}`, background: CARD, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={18} color={WHITE} />
          </button>
          <div>
            <div style={{ color: MUTED, fontSize: 11, fontWeight: 900, letterSpacing: '.09em' }}>MOI</div>
            <h1 style={{ margin: 0, fontSize: 'clamp(30px,5vw,40px)', fontWeight: 850, letterSpacing: '-.04em', lineHeight: 1 }}>Rappels</h1>
          </div>
        </header>

        <p style={{ color: SEC, fontSize: 14, lineHeight: 1.55, margin: '0 0 20px' }}>
          NOXI te fait signe quand c’est utile, jamais plus de {prefs.max_per_day} fois par jour, et jamais pendant tes heures calmes.
          Un rappel ne nomme jamais une habitude.
        </p>

        {/* Appareil */}
        <section style={card}>
          <div style={label}>CET APPAREIL</div>
          {support === 'needs_install' ? (
            <div style={{ color: SEC, fontSize: 13, lineHeight: 1.6 }}>
              Sur iPhone, les rappels fonctionnent quand NOX est installé sur ton écran d’accueil :
              dans Safari, appuie sur <Share size={14} style={{ verticalAlign: '-2px' }} /> Partager, puis
              « Sur l’écran d’accueil ». Ouvre ensuite NOX depuis la nouvelle icône et reviens ici.
            </div>
          ) : support === 'unsupported' ? (
            <div style={{ color: SEC, fontSize: 13, lineHeight: 1.6 }}>Ce navigateur ne prend pas en charge les rappels. Essaie avec Chrome, Edge ou Safari à jour.</div>
          ) : (
            <button onClick={toggleDevice} disabled={busy}
              style={{ width: '100%', padding: 16, borderRadius: 14, border: deviceOn ? `1px solid ${SOFT}` : 0, cursor: 'pointer', fontWeight: 800, fontSize: 14,
                background: deviceOn ? CARD2 : LIME, color: deviceOn ? WHITE : BG, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {deviceOn ? <><BellOff size={16} /> Désactiver sur cet appareil</> : <><Bell size={16} /> Activer les rappels sur cet appareil</>}
            </button>
          )}
          {deviceOn && <div style={{ marginTop: 10, color: LIME, fontSize: 12, fontWeight: 800, display: 'flex', gap: 6, alignItems: 'center' }}><Check size={14} /> Rappels actifs sur cet appareil</div>}
          {deviceOn && (
            <button onClick={sendTest} disabled={busy}
              style={{ marginTop: 12, width: '100%', padding: 14, borderRadius: 14, border: `1px solid ${SOFT}`, background: CARD2, color: WHITE, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
              Envoyer un test
            </button>
          )}
          {message && <div style={{ marginTop: 10, color: message.startsWith('Test envoyé') ? LIME : '#E9C2C2', fontSize: 12, lineHeight: 1.5 }}>{message}</div>}
        </section>

        {/* Types de rappels */}
        <section style={card}>
          <div style={{ ...label, marginBottom: 2 }}>CE QUE NOXI PEUT TE RAPPELER</div>
          {row('Pulse du matin', 'Seulement si tu ne l’as pas encore fait.', prefs.morning, () => save({ ...prefs, morning: !prefs.morning }),
            <input type="time" value={prefs.morning_time} onChange={e => save({ ...prefs, morning_time: e.target.value })} style={time} />)}
          {row('Clôture du soir', 'Seulement si ta journée n’est pas encore clôturée. Elle indique ce qu’il reste, sans jamais nommer une habitude.', prefs.evening, () => save({ ...prefs, evening: !prefs.evening }),
            <input type="time" value={prefs.evening_time} onChange={e => save({ ...prefs, evening_time: e.target.value })} style={time} />)}
          {row('Point sur tes objectifs', 'En fin d’après-midi, si une habitude n’est pas encore notée. Message neutre.', prefs.habits_check, () => save({ ...prefs, habits_check: !prefs.habits_check }))}
          {row('Bilan de la semaine', 'Le dimanche, quand ton bilan est prêt.', prefs.weekly, () => save({ ...prefs, weekly: !prefs.weekly }))}
        </section>

        {/* Rappels selon ta journée : uniquement à partir de données réellement enregistrées */}
        <section style={card}>
          <div style={{ ...label, marginBottom: 2 }}>SELON TA JOURNÉE</div>
          <div style={{ color: SEC, fontSize: 12, lineHeight: 1.5, margin: '6px 0 4px' }}>
            NOXI regarde ce qui manque vraiment. Sans donnée, il te propose de compléter, il n’affirme jamais rien.
          </div>
          {row('Concentration', 'À 14 h si ta mission n’est pas commencée, à 19 h si elle n’est pas terminée.', prefs.nudge_mission, () => save({ ...prefs, nudge_mission: !prefs.nudge_mission }))}
          {row('Bouger', 'À 16 h, si tu as un objectif de pas : te propose de les saisir, ou une marche si tu es loin.', prefs.nudge_movement, () => save({ ...prefs, nudge_movement: !prefs.nudge_movement }))}
          {row('Nutrition', 'À 18 h, avec une cible calorique : t’invite à compléter tes repas, ou signale si ta journée est loin de ta zone.', prefs.nudge_nutrition, () => save({ ...prefs, nudge_nutrition: !prefs.nudge_nutrition }))}
          {row('Objectifs du jour', 'À 18 h 30, si un objectif de ta journée n’est pas noté. Sans jamais le nommer.', prefs.nudge_goals, () => save({ ...prefs, nudge_goals: !prefs.nudge_goals }))}
          <div style={{ color: MUTED, fontSize: 11, lineHeight: 1.5, marginTop: 8 }}>
            Toujours au moins 2 h entre deux rappels, jamais deux fois le même dans la journée, et une place gardée pour la clôture.
          </div>
        </section>

        {/* Limites */}
        <section style={card}>
          <div style={label}>LIMITES</div>
          <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 10 }}>Maximum par jour</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[1, 2, 3].map(n => (
              <button key={n} onClick={() => save({ ...prefs, max_per_day: n })}
                style={{ flex: 1, padding: 12, borderRadius: 12, cursor: 'pointer', fontWeight: 900,
                  border: `1px solid ${prefs.max_per_day === n ? LIME : SOFT}`, background: prefs.max_per_day === n ? 'rgba(200,255,0,.08)' : CARD2, color: prefs.max_per_day === n ? LIME : WHITE }}>
                {n}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 10 }}>Heures calmes</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ color: SEC, fontSize: 13 }}>De</span>
            <input type="time" value={prefs.quiet_start} onChange={e => save({ ...prefs, quiet_start: e.target.value })} style={time} />
            <span style={{ color: SEC, fontSize: 13 }}>à</span>
            <input type="time" value={prefs.quiet_end} onChange={e => save({ ...prefs, quiet_end: e.target.value })} style={time} />
          </div>
        </section>
      </main>
      <BottomNav active="moi" />
    </div>
  );
}
