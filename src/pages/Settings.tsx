import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const BG = '#F6F7F2';
const SURFACE = '#FFFFFF';
const BORDER = '#E8E8E3';
const DARK = '#111';

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [exporting, setExporting] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [editName, setEditName] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      .then(({ data }) => { setProfile(data); setDisplayName(data?.display_name || ''); });
  }, [user]);

  const saveName = async () => {
    setSaving(true);
    await supabase.from('profiles').update({ display_name: displayName.trim() }).eq('id', user!.id);
    setSaving(false); setEditName(false);
  };

  const exportData = async () => {
    setExporting(true);
    const [{ data: prof }, { data: wkts }, { data: food }, { data: body }, { data: prs }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle(),
      supabase.from('workouts').select('*').eq('user_id', user!.id),
      supabase.from('food_entries').select('*').eq('user_id', user!.id),
      supabase.from('body_logs').select('*').eq('user_id', user!.id),
      supabase.from('personal_records').select('*').eq('user_id', user!.id),
    ]);
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), profile: prof, workouts: wkts, food_entries: food, body_logs: body, personal_records: prs }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `nox-export-${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url); setExporting(false);
  };

  const deleteAccount = async () => {
    if (deleteInput !== 'SUPPRIMER') return;
    await Promise.all([
      supabase.from('food_entries').delete().eq('user_id', user!.id),
      supabase.from('workouts').delete().eq('user_id', user!.id),
      supabase.from('body_logs').delete().eq('user_id', user!.id),
      supabase.from('personal_records').delete().eq('user_id', user!.id),
      supabase.from('profiles').delete().eq('id', user!.id),
    ]);
    await supabase.auth.signOut(); navigate('/');
  };

  const Section = ({ title, children }: any) => (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10, padding: '0 4px' }}>{title}</div>
      <div style={{ background: SURFACE, borderRadius: 18, overflow: 'hidden', border: '1px solid ' + BORDER }}>{children}</div>
    </div>
  );

  const Row = ({ icon, label, value, onClick, danger = false, last = false }: any) => (
    <button onClick={onClick}
      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', background: 'none', border: 'none', borderBottom: last ? 'none' : '1px solid ' + BORDER, cursor: onClick ? 'pointer' : 'default', textAlign: 'left', touchAction: 'manipulation' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 22, width: 28, textAlign: 'center' }}>{icon}</span>
        <span style={{ fontSize: 16, color: danger ? '#ff4444' : DARK, fontWeight: 600 }}>{label}</span>
      </div>
      {value
        ? <span style={{ fontSize: 14, color: '#999', maxWidth: 160, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
        : onClick ? <span style={{ color: '#ccc', fontSize: 18 }}>›</span> : null}
    </button>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ background: SURFACE, borderBottom: '1px solid ' + BORDER, padding: '28px 24px 20px' }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: DARK }}>Reglages</div>
        <div style={{ fontSize: 14, color: '#999', marginTop: 4 }}>Compte, programme et preferences</div>
      </div>

      <div style={{ padding: '24px 20px 0' }}>

        <Section title="Mon compte">
          {editName ? (
            <div style={{ padding: '16px 20px', borderBottom: '1px solid ' + BORDER }}>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                style={{ width: '100%', padding: '14px 16px', background: BG, border: '1px solid ' + BORDER, borderRadius: 12, color: DARK, fontSize: 16, marginBottom: 10, outline: 'none', boxSizing: 'border-box' as const }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEditName(false)}
                  style={{ flex: 1, padding: 12, background: 'transparent', border: '1px solid ' + BORDER, borderRadius: 10, color: '#888', fontSize: 14, cursor: 'pointer' }}>Annuler</button>
                <button onClick={saveName}
                  style={{ flex: 2, padding: 12, background: DARK, border: 'none', borderRadius: 10, color: ACCENT, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>{saving ? '...' : 'Sauvegarder'}</button>
              </div>
            </div>
          ) : (
            <Row icon="👤" label="Nom" value={profile?.display_name || 'Non defini'} onClick={() => setEditName(true)} />
          )}
          <Row icon="📧" label="Email" value={user?.email} />
          <Row icon="🎯" label="Mon objectif" value={profile?.goal_type || '—'} onClick={() => navigate('/onboarding')} last />
        </Section>

        <Section title="Programme et entrainement">
          <Row icon="📋" label="Mon programme" onClick={() => navigate('/program')} />
          <Row icon="📅" label="Calendrier Training" onClick={() => navigate('/training-calendar')} />
          <Row icon="🔄" label="Reprogrammer ma semaine" onClick={() => navigate('/reschedule')} last />
        </Section>

        <Section title="Nutrition">
          <Row icon="📔" label="Journal alimentaire" onClick={() => navigate('/fuel')} />
          <Row icon="🧑‍🍳" label="Mes recettes" onClick={() => navigate('/recipes')} />
          <Row icon="📅" label="Planifier ma semaine" onClick={() => navigate('/meal-planner')} />
          <Row icon="🧺" label="Garde-manger" onClick={() => navigate('/pantry')} last />
        </Section>

        <Section title="Suivi">
          <Row icon="🌙" label="Sommeil" onClick={() => navigate('/sleep')} />
          <Row icon="😊" label="Humeur" onClick={() => navigate('/mood')} />
          <Row icon="📈" label="Mes progres" onClick={() => navigate('/progress')} />
          <Row icon="🔮" label="NOX Future" onClick={() => navigate('/future')} last />
        </Section>

        <Section title="Gamification">
          <Row icon="🏅" label="Play et badges" onClick={() => navigate('/play')} />
          <Row icon="🏆" label="Classement" onClick={() => navigate('/leaderboard')} last />
        </Section>

        <Section title="Notifications">
          <Row icon="🔔" label="Preferences notifications" onClick={() => navigate('/notification-settings')} last />
        </Section>

        <Section title="Abonnement">
          <Row icon="⭐" label="Plan actuel" value={profile?.subscription_plan || 'Gratuit'} />
          <Row icon="🚀" label="Passer a NOX Pro" onClick={() => navigate('/subscribe')} last />
        </Section>

        <Section title="Confidentialite et donnees">
          <Row icon="🔒" label="Politique de confidentialite" onClick={() => setShowPrivacy(true)} />
          <Row icon="📦" label={exporting ? 'Export en cours...' : 'Exporter mes donnees'} onClick={exportData} />
          <Row icon="🚪" label="Se deconnecter" onClick={async () => { await supabase.auth.signOut(); navigate('/'); }} last />
        </Section>

        <Section title="Zone de danger">
          <Row icon="🗑️" label="Supprimer mon compte" onClick={() => setShowDelete(true)} danger last />
        </Section>

        <div style={{ textAlign: 'center', padding: '8px 0 20px', color: '#ccc', fontSize: 13 }}>
          NOX AI · v1.0.0 · noxai.fr
        </div>
      </div>

      {/* Modal confidentialite */}
      {showPrivacy && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: SURFACE, borderRadius: '20px 20px 0 0', padding: 28, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: DARK, marginBottom: 16 }}>Confidentialite</div>
            {[
              { t: 'Donnees collectees', d: 'Uniquement les donnees que tu entres : poids, repas, seances, humeur. Aucune collecte automatique sans action explicite.' },
              { t: 'Stockage', d: 'Tes donnees sont stockees sur Supabase (AWS Europe). Jamais vendues a des tiers.' },
              { t: 'Intelligence artificielle', d: 'Tes donnees sont envoyees a Claude (Anthropic) uniquement lors des analyses. Anthropic ne conserve pas tes donnees apres le traitement.' },
              { t: 'Tes droits', d: 'Tu peux exporter toutes tes donnees ou supprimer ton compte et toutes tes donnees a tout moment.' },
            ].map(({ t, d }) => (
              <div key={t} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: DARK, marginBottom: 4 }}>{t}</div>
                <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>{d}</div>
              </div>
            ))}
            <button onClick={() => setShowPrivacy(false)}
              style={{ width: '100%', padding: 16, background: DARK, border: 'none', borderRadius: 14, color: ACCENT, fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 8 }}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Modal suppression */}
      {showDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: SURFACE, borderRadius: '20px 20px 0 0', padding: 28 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#ff4444', marginBottom: 8 }}>Supprimer mon compte</div>
            <div style={{ fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: 20 }}>
              Action irreversible. Toutes tes donnees seront definitvement supprimees : seances, repas, poids, photos, records.
            </div>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 8 }}>Tape <strong style={{ color: DARK }}>SUPPRIMER</strong> pour confirmer :</div>
            <input value={deleteInput} onChange={e => setDeleteInput(e.target.value)} placeholder="SUPPRIMER"
              style={{ width: '100%', padding: '14px 16px', background: BG, border: '1px solid #ff444444', borderRadius: 12, color: DARK, fontSize: 16, marginBottom: 16, outline: 'none', boxSizing: 'border-box' as const }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowDelete(false); setDeleteInput(''); }}
                style={{ flex: 1, padding: 16, background: 'transparent', border: '1px solid ' + BORDER, borderRadius: 14, color: DARK, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={deleteAccount} disabled={deleteInput !== 'SUPPRIMER'}
                style={{ flex: 2, padding: 16, background: deleteInput === 'SUPPRIMER' ? '#ff4444' : '#eee', border: 'none', borderRadius: 14, color: deleteInput === 'SUPPRIMER' ? '#fff' : '#ccc', fontWeight: 900, fontSize: 15, cursor: deleteInput === 'SUPPRIMER' ? 'pointer' : 'not-allowed' }}>
                SUPPRIMER
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="settings" />
    </div>
  );
}
