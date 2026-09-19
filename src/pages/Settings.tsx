import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
        .then(({ data }) => { setProfile(data); setDisplayName(data?.display_name || ''); });
    }
  }, [user]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const saveName = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    await supabase.from('profiles').update({ display_name: displayName.trim() }).eq('id', user!.id);
    setSaving(false);
    setEditingName(false);
  };

  const exportData = async () => {
    setExporting(true);
    const [
      { data: prof },
      { data: workouts },
      { data: food },
      { data: body },
      { data: prs },
      { data: mood },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle(),
      supabase.from('workouts').select('*').eq('user_id', user!.id),
      supabase.from('food_entries').select('*').eq('user_id', user!.id),
      supabase.from('body_logs').select('*').eq('user_id', user!.id),
      supabase.from('personal_records').select('*').eq('user_id', user!.id),
      supabase.from('mood_logs').select('*').eq('user_id', user!.id),
    ]);

    const exportObj = {
      exported_at: new Date().toISOString(),
      profile: prof,
      workouts: workouts || [],
      food_entries: food || [],
      body_logs: body || [],
      personal_records: prs || [],
      mood_logs: mood || [],
    };

    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nox-data-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
    setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  const deleteAccount = async () => {
    if (deleteInput !== 'SUPPRIMER') return;
    // Supprimer les données utilisateur
    await Promise.all([
      supabase.from('food_entries').delete().eq('user_id', user!.id),
      supabase.from('workouts').delete().eq('user_id', user!.id),
      supabase.from('body_logs').delete().eq('user_id', user!.id),
      supabase.from('personal_records').delete().eq('user_id', user!.id),
      supabase.from('mood_logs').delete().eq('user_id', user!.id),
      supabase.from('profiles').delete().eq('id', user!.id),
    ]);
    await supabase.auth.signOut();
    navigate('/');
  };

  const Section = ({ title, children }: any) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10, padding: '0 20px' }}>{title}</div>
      <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, overflow: 'hidden', margin: '0 20px' }}>{children}</div>
    </div>
  );

  const Row = ({ icon, label, value, onClick, danger = false, last = false }: any) => (
    <button onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', background: 'none', border: 'none', borderBottom: last ? 'none' : '1px solid ' + BORDER, cursor: onClick ? 'pointer' : 'default', textAlign: 'left', touchAction: 'manipulation' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 14, color: danger ? '#ff4444' : '#fff', fontWeight: 600 }}>{label}</span>
      </div>
      {value ? <span style={{ fontSize: 12, color: '#555', maxWidth: 140, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span> : onClick ? <span style={{ color: '#333', fontSize: 16 }}>→</span> : null}
    </button>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 90 }}>
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid ' + BORDER }}>
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em' }}>Configuration</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>PARAMÈTRES</div>
      </div>

      <div style={{ paddingTop: 20 }}>

        {/* Profil */}
        <Section title="Profil">
          {editingName ? (
            <div style={{ padding: '14px 18px', borderBottom: '1px solid ' + BORDER }}>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: BG, border: '1px solid ' + BORDER, borderRadius: 10, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={() => setEditingName(false)} style={{ flex: 1, padding: 10, background: 'transparent', border: '1px solid ' + BORDER, borderRadius: 8, color: '#555', fontSize: 13, cursor: 'pointer' }}>Annuler</button>
                <button onClick={saveName} style={{ flex: 1, padding: 10, background: ACCENT, border: 'none', borderRadius: 8, color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{saving ? '...' : 'Sauvegarder'}</button>
              </div>
            </div>
          ) : (
            <Row icon="👤" label="Nom affiché" value={profile?.display_name || 'Non défini'} onClick={() => setEditingName(true)} />
          )}
          <Row icon="📧" label="Email" value={user?.email} />
          <Row icon="🎯" label="Objectif" value={profile?.goal_type || '—'} onClick={() => navigate('/onboarding')} />
          <Row icon="⚖️" label="Poids actuel" value={profile?.starting_weight_kg ? profile.starting_weight_kg + 'kg' : '—'} onClick={() => navigate('/body')} last />
        </Section>

        {/* Programme */}
        <Section title="Entraînement">
          <Row icon="📋" label="Mon programme" onClick={() => navigate('/program')} />
          <Row icon="📅" label="Calendrier Training" onClick={() => navigate('/training-calendar')} />
          <Row icon="🎯" label="Calibration RPE" onClick={() => navigate('/calibration')} />
          <Row icon="🔄" label="Reprogrammer ma semaine" onClick={() => navigate('/reschedule')} last />
        </Section>

        {/* Nutrition */}
        <Section title="Nutrition">
          <Row icon="🥗" label="Objectifs nutritionnels" onClick={() => navigate('/fuel')} />
          <Row icon="👨‍🍳" label="Mes recettes" onClick={() => navigate('/recipes')} />
          <Row icon="📅" label="Planifier mes repas" onClick={() => navigate('/meal-planner')} last />
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <Row icon="🔔" label="Préférences notifications" onClick={() => navigate('/notification-settings')} last />
        </Section>

        {/* Abonnement */}
        <Section title="Coach NOX Pro">
          <Row icon="👥" label="Dashboard Coach" onClick={() => navigate('/coach-dashboard')} />
          <Row icon="🔗" label="Mon code coach" value={user?.id.slice(0, 8).toUpperCase() + '-COACH'} last />
        </Section>

        <Section title="Abonnement">
          <Row icon="⭐" label="Plan actuel" value={profile?.subscription_plan || 'Free'} />
          <Row icon="🚀" label="Passer à NOX Pro" onClick={() => navigate('/subscribe')} last />
        </Section>

        {/* Confidentialité & Données */}
        <Section title="Confidentialité & Données">
          <Row icon="🔒" label="Politique de confidentialité" onClick={() => setShowPrivacy(true)} />
          <Row icon="📦" label={exported ? '✓ Export téléchargé' : exporting ? 'Export en cours...' : 'Exporter mes données'} onClick={exportData} />
          <Row icon="🚪" label="Se déconnecter" onClick={logout} last />
        </Section>

        {/* Danger zone */}
        <Section title="Zone de danger">
          <Row icon="🗑️" label="Supprimer mon compte" onClick={() => setShowDeleteConfirm(true)} danger last />
        </Section>

        {/* Version */}
        <div style={{ textAlign: 'center', padding: '0 0 20px', color: '#333', fontSize: 11 }}>
          NOX AI · v1.0.0 · noxai.fr
        </div>
      </div>

      {/* Modal Politique de confidentialité */}
      {showPrivacy && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.9)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: '#0d0d0d', borderRadius: '20px 20px 0 0', padding: 24, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', marginBottom: 16 }}>🔒 Confidentialité</div>
            <div style={{ fontSize: 13, color: '#888', lineHeight: 1.7 }}>
              <p><strong style={{ color: '#fff' }}>Données collectées</strong><br />NOX collecte uniquement les données que tu entres : poids, repas, séances, humeur. Aucune donnée n'est collectée sans ton action explicite.</p>
              <p style={{ marginTop: 12 }}><strong style={{ color: '#fff' }}>Stockage</strong><br />Tes données sont stockées sur Supabase (infrastructure AWS) en France/Europe. Elles ne sont jamais vendues à des tiers.</p>
              <p style={{ marginTop: 12 }}><strong style={{ color: '#fff' }}>IA</strong><br />Tes données sont envoyées à l'API Anthropic (Claude) uniquement lors des analyses. Anthropic ne conserve pas tes données au-delà du traitement de la requête.</p>
              <p style={{ marginTop: 12 }}><strong style={{ color: '#fff' }}>Tes droits</strong><br />Tu peux exporter toutes tes données (bouton ci-dessus) ou supprimer ton compte et toutes tes données à tout moment.</p>
            </div>
            <button onClick={() => setShowPrivacy(false)}
              style={{ width: '100%', marginTop: 16, padding: 14, background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Modal suppression compte */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.9)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: '#0d0d0d', borderRadius: '20px 20px 0 0', padding: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#ff4444', marginBottom: 8 }}>⚠️ Supprimer mon compte</div>
            <div style={{ fontSize: 13, color: '#888', lineHeight: 1.6, marginBottom: 16 }}>
              Cette action est irréversible. Toutes tes données (séances, repas, corps, PRs, photos) seront définitivement supprimées.
            </div>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>Tape <strong style={{ color: '#fff' }}>SUPPRIMER</strong> pour confirmer :</div>
            <input value={deleteInput} onChange={e => setDeleteInput(e.target.value)}
              placeholder="SUPPRIMER"
              style={{ width: '100%', padding: '12px 14px', background: '#111', border: '1px solid #ff444444', borderRadius: 10, color: '#fff', fontSize: 14, marginBottom: 14, outline: 'none', boxSizing: 'border-box' as const }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}
                style={{ flex: 1, padding: 14, background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={deleteAccount} disabled={deleteInput !== 'SUPPRIMER'}
                style={{ flex: 1, padding: 14, background: deleteInput === 'SUPPRIMER' ? '#ff4444' : '#1a1a1a', border: 'none', borderRadius: 12, color: deleteInput === 'SUPPRIMER' ? '#fff' : '#333', fontWeight: 900, cursor: deleteInput === 'SUPPRIMER' ? 'pointer' : 'not-allowed' }}>
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
