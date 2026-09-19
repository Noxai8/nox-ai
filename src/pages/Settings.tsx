import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { getNoxHealthBridge, getNoxHealthBridgeStatus, NOX_HEALTH_DEFAULT_READ_TYPES, type NoxHealthPermission } from '../lib/noxHealthBridge';

const ACCENT = '#B7FF00';
const BG = '#F7F7F7';
const SURFACE = '#FFFFFF';
const BORDER = '#EAEAEA';

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{available:boolean;platform:'ios'|'android'|null;source:'apple_health'|'health_connect'|null}>({available:false,platform:null,source:null});
  const [healthPermissions, setHealthPermissions] = useState<NoxHealthPermission[]>([]);
  const [healthBusy, setHealthBusy] = useState(false);

  const refreshHealthBridge = async () => {
    const status = await getNoxHealthBridgeStatus();
    setHealthStatus(status);
    const bridge = getNoxHealthBridge();
    if (!status.available || !bridge) { setHealthPermissions([]); return; }
    try { setHealthPermissions(await bridge.getPermissions(NOX_HEALTH_DEFAULT_READ_TYPES)); } catch { setHealthPermissions([]); }
  };

  useEffect(() => { void refreshHealthBridge(); }, []);

  const requestHealthPermissions = async () => {
    const bridge = getNoxHealthBridge();
    if (!bridge || !healthStatus.available || healthBusy) return;
    setHealthBusy(true);
    try { setHealthPermissions(await bridge.requestPermissions(NOX_HEALTH_DEFAULT_READ_TYPES)); }
    finally { setHealthBusy(false); await refreshHealthBridge(); }
  };

  const healthGranted = healthPermissions.filter(p => p.read === 'granted').length;
  const nativeHealthLabel = healthStatus.source === 'apple_health' ? 'Apple Health / Apple Watch' : healthStatus.source === 'health_connect' ? 'Health Connect' : null;

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const Section = ({ title, children }: any) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12, padding: '0 20px' }}>{title}</div>
      <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, overflow: 'hidden', margin: '0 20px' }}>{children}</div>
    </div>
  );

  const Row = ({ icon, label, value, onClick, danger = false }: any) => (
    <button onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', background: 'none', border: 'none', borderBottom: '1px solid ' + BORDER, cursor: onClick ? 'pointer' : 'default', textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 14, color: danger ? '#D93025' : '#0A0A0A', fontWeight: 600 }}>{label}</span>
      </div>
      {value ? <span style={{ fontSize: 13, color: '#777' }}>{value}</span> : onClick ? <span style={{ color: '#999', fontSize: 16 }}>→</span> : null}
    </button>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 80 }}>
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid ' + BORDER }}>
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em' }}>Configuration</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#0A0A0A' }}>PARAMÈTRES</div>
      </div>

      <div style={{ paddingTop: 24 }}>
        <Section title="Compte">
          <Row icon="👤" label="Email" value={user?.email} />
          <Row icon="🔑" label="Changer le mot de passe" onClick={async () => { if (!user?.email) return; await supabase.auth.resetPasswordForEmail(user.email); window.alert("NOX t’a envoyé un lien de réinitialisation par e-mail."); }} />
        </Section>

        <Section title="App">
          <Row icon="☀️" label="Thème" value="Clair NOX" />
          <Row icon="🇫🇷" label="Langue" value="Français" />
          <Row icon="⚖️" label="Unités" value="Métriques (kg, cm)" />
        </Section>

        <Section title="Abonnement">
          <Row icon="⚡" label="Plan actuel" value="NOX Gratuit" />
          <Row icon="🚀" label="Passer à NOX+" onClick={() => navigate('/subscribe')} />
        </Section>

        <Section title="NOX Connect">
          {nativeHealthLabel ? (
            <>
              <Row icon={healthStatus.platform === 'ios' ? '🍎' : '🤖'} label={nativeHealthLabel} value={healthGranted > 0 ? `${healthGranted} autorisation(s) active(s)` : 'Disponible'} />
              <div style={{padding:'0 18px 14px'}}>
                <button onClick={() => void requestHealthPermissions()} disabled={healthBusy} style={{width:'100%',padding:12,border:0,borderRadius:11,background:ACCENT,color:'#0A0A0A',fontWeight:900,cursor:healthBusy?'wait':'pointer'}}>
                  {healthBusy ? 'AUTORISATION…' : healthGranted > 0 ? 'GÉRER LES AUTORISATIONS' : 'AUTORISER LA SYNCHRONISATION'}
                </button>
              </div>
            </>
          ) : (
            <div style={{padding:'15px 18px',fontSize:12,color:'#777',lineHeight:1.5}}>
              Bridge santé natif non détecté. Apple Health et Health Connect ne demandent aucune permission depuis la version web de NOX.
            </div>
          )}
          <Row icon="💠" label="Fitbit" value="OAuth à activer" onClick={() => navigate('/recovery')} />
          <Row icon="⚫" label="WHOOP" value="OAuth à activer" onClick={() => navigate('/recovery')} />
          <Row icon="⚖️" label="Balances connectées" value="Via Health / Fitbit" onClick={() => navigate('/body')} />
          <div style={{padding:'12px 18px',fontSize:10.5,color:'#777',lineHeight:1.5}}>
            NOX demande les permissions santé uniquement quand le bridge iOS/Android est réellement disponible. Chaque mesure importée conserve sa source et son identifiant externe pour permettre la déduplication.
          </div>
        </Section>

        <Section title="Données">
          <Row icon="📊" label="Mon bilan hebdo" onClick={() => navigate('/weekly-review')} />
          <Row icon="🌙" label="Sommeil & récupération" onClick={() => navigate('/recovery')} />
          <Row icon="🔔" label="Notifications" onClick={() => navigate('/notification-settings')} />
          <Row icon="🎯" label="Objectifs & calibration" onClick={() => navigate('/calibration')} />
          <Row icon="👥" label="Mode Partenaire" onClick={() => navigate('/partner')} />
          <Row icon="🏆" label="Mes achievements" onClick={() => navigate('/play')} />
        </Section>

        <Section title="Sécurité">
          <Row icon="🚪" label="Se déconnecter" onClick={logout} danger />
          <Row icon="🗑️" label="Supprimer mon compte" onClick={() => setShowDeleteConfirm(true)} danger />
        </Section>

        <Section title="Confidentialité"><Row icon="🔒" label="Centre de confidentialité" value="Données privées par défaut" /><Row icon="📤" label="Export de mes données" value="À venir" /></Section>

        <div style={{ padding: '16px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#777' }}>NOX · Version 1.0.0</div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Ton système d'exploitation physique</div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.9)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', border: '1px solid #EAEAEA', borderRadius: 20, padding: 28, maxWidth: 320, width: '100%' }}>
            <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#0A0A0A', textAlign: 'center', marginBottom: 12 }}>Supprimer le compte ?</div>
            <div style={{ fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 24, lineHeight: 1.5 }}>
              Toutes tes données seront supprimées définitivement. Cette action est irréversible.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: 14, background: '#F7F7F7', border: '1px solid ' + BORDER, borderRadius: 12, color: '#0A0A0A', fontWeight: 700, cursor: 'pointer' }}>ANNULER</button>
              <button onClick={async () => { window.alert('La suppression définitive du compte nécessite le service de suppression serveur NOX. Aucune donnée n’a été supprimée.'); setShowDeleteConfirm(false); }} style={{ flex: 1, padding: 14, background: '#ff4444', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 900, cursor: 'pointer' }}>SUPPRIMER</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="settings" />
    </div>
  );
}
