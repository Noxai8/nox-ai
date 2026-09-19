import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from '../components/BottomNav';

const ACCENT = '#B7FF00';
const BG = '#F7F7F7';
const SURFACE = '#FFFFFF';
const BORDER = '#EAEAEA';

export default function Partner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myProfile, setMyProfile] = useState<any>(null);
  const [partnerCode, setPartnerCode] = useState('');
  const [partner, setPartner] = useState<any>(null);
  const [partnerStats, setPartnerStats] = useState<any>(null);
  const [myStats, setMyStats] = useState<any>(null);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [challenge, setChallenge] = useState<'workouts'|'streak'|'prs'>('workouts');

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle();
    setMyProfile(profile);

    // Générer un code partenaire unique basé sur l'ID
    const code = user!.id.slice(0, 8).toUpperCase();
    setPartnerCode(code);

    // Charger mes stats
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: workouts }, { data: prs }] = await Promise.all([
      supabase.from('workouts').select('id').eq('user_id', user!.id).eq('status', 'completed').gte('created_at', weekStart),
      supabase.from('personal_records').select('id').eq('user_id', user!.id),
    ]);
    setMyStats({
      weekWorkouts: workouts?.length || 0,
      totalPRs: prs?.length || 0,
      streak: profile?.streak_days || 0,
      xp: profile?.xp || 0,
    });

    // Charger le partenaire si déjà connecté
    if (profile?.partner_id) {
      loadPartner(profile.partner_id);
    }
  };

  const loadPartner = async (partnerId: string) => {
    const { data: p } = await supabase.from('profiles').select('*').eq('id', partnerId).maybeSingle();
    if (!p) return;
    setPartner(p);

    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: workouts }, { data: prs }] = await Promise.all([
      supabase.from('workouts').select('id').eq('user_id', partnerId).eq('status', 'completed').gte('created_at', weekStart),
      supabase.from('personal_records').select('id').eq('user_id', partnerId),
    ]);
    setPartnerStats({
      weekWorkouts: workouts?.length || 0,
      totalPRs: prs?.length || 0,
      streak: p?.streak_days || 0,
      xp: p?.xp || 0,
    });
  };

  const connectPartner = async () => {
    setError('');
    if (!input.trim()) return;
    const code = input.trim().toUpperCase();

    // Trouver le partenaire par son code (les 8 premiers chars de l'ID)
    const { data: allProfiles } = await supabase.from('profiles').select('id, display_name, xp, streak_days');
    const found = allProfiles?.find((p: any) => p.id.slice(0, 8).toUpperCase() === code && p.id !== user!.id);

    if (!found) {
      setError('Code invalide. Vérifie le code de ton ami.');
      return;
    }

    // Connecter mutuellement
    await Promise.all([
      supabase.from('profiles').update({ partner_id: found.id }).eq('id', user!.id),
      supabase.from('profiles').update({ partner_id: user!.id }).eq('id', found.id),
    ]);

    setInput('');
    loadPartner(found.id);
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(partnerCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareInvite = async () => {
    const text = `Rejoins-moi sur NOX avec mon code ami : ${partnerCode}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Invitation NOX', text });
      else await navigator.clipboard.writeText(text);
      setShareMessage(navigator.share ? 'Invitation prête à être partagée.' : 'Invitation copiée.');
    } catch {}
    setTimeout(() => setShareMessage(''), 2200);
  };

  const shareSelected = async (kind:'workout'|'pr') => {
    if (!myStats) return;
    const text = kind==='workout'
      ? `NOX · J’ai terminé ${myStats.weekWorkouts} séance(s) sur les 7 derniers jours.`
      : `NOX · J’ai enregistré ${myStats.totalPRs} record(s) personnel(s).`;
    try {
      if (navigator.share) await navigator.share({ title: kind==='workout'?'Workout NOX':'PR NOX', text });
      else await navigator.clipboard.writeText(text);
      setShareMessage('Partage préparé — aucune donnée privée incluse.');
    } catch {}
    setTimeout(() => setShareMessage(''), 2200);
  };

  const StatRow = ({ label, mine, theirs }: { label: string; mine: number; theirs: number }) => {
    const iWin = mine >= theirs;
    return (
      <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: iWin ? '#5D8200' : '#0A0A0A' }}>{mine}</div>
            <div style={{ fontSize: 11, color: '#555' }}>Toi</div>
          </div>
          <div style={{ fontSize: 18, color: '#333', fontWeight: 900 }}>VS</div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: !iWin ? '#5D8200' : '#0A0A0A' }}>{theirs}</div>
            <div style={{ fontSize: 11, color: '#555' }}>{partner?.display_name?.split(' ')[0] || 'Partenaire'}</div>
          </div>
        </div>
        {/* Barre comparative */}
        <div style={{ marginTop: 10, height: 4, background: '#EAEAEA', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: Math.round((mine / Math.max(mine + theirs, 1)) * 100) + '%', background: ACCENT, borderRadius: 2, transition: 'width .5s' }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 80 }}>
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid ' + BORDER }}>
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em' }}>Social · optionnel</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#0A0A0A' }}>CHALLENGES AMIS</div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>

        <div style={{background:'#0A0A0A',color:'#fff',borderRadius:18,padding:18,marginBottom:16}}>
          <div style={{fontSize:10,color:ACCENT,fontWeight:950,letterSpacing:'.1em'}}>NOX SOCIAL</div>
          <div style={{fontSize:19,fontWeight:950,marginTop:5}}>Partage seulement ce que tu choisis.</div>
          <div style={{fontSize:11,color:'#AAA',lineHeight:1.5,marginTop:6}}>Profil minimal, amis, challenges et partages sélectionnés. Poids, nutrition, photos et récupération restent privés par défaut.</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:14}}>
            <button onClick={()=>navigate('/share-timeline')} style={{border:0,borderRadius:11,background:ACCENT,color:'#000',padding:11,fontWeight:900,fontSize:10,cursor:'pointer'}}>PARTAGER MA PROGRESSION</button>
            <button onClick={()=>navigate('/food-scan',{state:{scanMode:'qr'}})} style={{border:'1px solid #333',borderRadius:11,background:'#151515',color:'#fff',padding:11,fontWeight:900,fontSize:10,cursor:'pointer'}}>SCANNER UNE INVITATION QR</button>
          </div>
        </div>

        <div style={{background:SURFACE,border:'1px solid '+BORDER,borderRadius:16,padding:16,marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:950}}>SOCIAL NOX</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:11}}>
            <button onClick={shareInvite} style={{background:'#F7F7F7',border:0,borderRadius:11,padding:'11px',fontSize:10.5,fontWeight:900,textAlign:'left',cursor:'pointer'}}>Inviter un ami</button>
            <button onClick={()=>navigate('/food-scan',{state:{scanMode:'qr'}})} style={{background:'#F7F7F7',border:0,borderRadius:11,padding:'11px',fontSize:10.5,fontWeight:900,textAlign:'left',cursor:'pointer'}}>Scanner invitation QR</button>
            <button onClick={()=>void shareSelected('workout')} style={{background:'#F7F7F7',border:0,borderRadius:11,padding:'11px',fontSize:10.5,fontWeight:900,textAlign:'left',cursor:'pointer'}}>Partager un workout</button>
            <button onClick={()=>void shareSelected('pr')} style={{background:'#F7F7F7',border:0,borderRadius:11,padding:'11px',fontSize:10.5,fontWeight:900,textAlign:'left',cursor:'pointer'}}>Partager un PR</button>
          </div>
          {shareMessage&&<div style={{fontSize:10,color:'#5D8200',fontWeight:800,marginTop:10}}>{shareMessage}</div>}
          <div style={{fontSize:10,color:'#888',lineHeight:1.45,marginTop:11}}>Les partages contiennent uniquement l’élément choisi. Poids, nutrition, photos, récupération et autres données sensibles restent exclus.</div>
        </div>

        {/* Mon code */}
        <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>TON CODE</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: ACCENT, letterSpacing: '.1em', flex: 1 }}>{partnerCode}</div>
            <button onClick={copyCode}
              style={{ padding: '10px 16px', background: copied ? ACCENT : 'transparent', border: '1px solid ' + (copied ? ACCENT : BORDER), borderRadius: 10, color: '#000', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
              {copied ? '✓ COPIÉ' : 'COPIER'}
            </button>
          </div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 8 }}>Partage uniquement ce code. Tes données sensibles restent privées.</div>
          <button onClick={shareInvite} style={{width:'100%',marginTop:11,padding:11,border:0,borderRadius:10,background:'#0A0A0A',color:'#fff',fontWeight:900,fontSize:11,cursor:'pointer'}}>INVITER UN AMI</button>
        </div>

        {/* Connecter un partenaire */}
        {!partner && (
          <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0A0A0A', marginBottom: 12 }}>AJOUTER UN AMI</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                value={input} onChange={e => setInput(e.target.value.toUpperCase())}
                placeholder="CODE AMI"
                maxLength={8}
                style={{ flex: 1, padding: '12px 14px', background: '#F7F7F7', border: '1px solid ' + BORDER, borderRadius: 10, color: '#0A0A0A', fontSize: 14, fontFamily: 'monospace', letterSpacing: '.1em', outline: 'none' }}
              />
              <button onClick={connectPartner}
                style={{ padding: '12px 16px', background: ACCENT, border: 'none', borderRadius: 10, color: '#000', fontWeight: 900, fontSize: 13, cursor: 'pointer' }}>
                LIER
              </button>
            </div>
            {error && <div style={{ fontSize: 12, color: '#ff4444', marginTop: 8 }}>{error}</div>}
          </div>
        )}

        {/* Stats comparaison */}
        {partner && partnerStats && myStats && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, textAlign: 'center', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '12px 8px' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0A0A0A' }}>{myProfile?.display_name?.split(' ')[0] || 'Toi'}</div>
                <div style={{ fontSize: 11, color: ACCENT, marginTop: 2 }}>{myStats.xp} XP</div>
              </div>
              <div style={{ fontSize: 20, color: '#333', fontWeight: 900 }}>⚡</div>
              <div style={{ flex: 1, textAlign: 'center', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '12px 8px' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0A0A0A' }}>{partner?.display_name?.split(' ')[0] || 'Partenaire'}</div>
                <div style={{ fontSize: 11, color: ACCENT, marginTop: 2 }}>{partnerStats.xp} XP</div>
              </div>
            </div>

            <div style={{background:SURFACE,border:'1px solid '+BORDER,borderRadius:16,padding:16,marginBottom:14}}>
              <div style={{fontSize:10,fontWeight:900,color:'#777',letterSpacing:'.08em'}}>CHALLENGE ACTIF · 7 JOURS</div>
              <div style={{fontSize:17,fontWeight:950,marginTop:5}}>Choisis ce que vous suivez</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:7,marginTop:12}}>
                {([['workouts','Séances'],['streak','Streak'],['prs','PR']] as const).map(([id,label])=><button key={id} onClick={()=>setChallenge(id)} style={{padding:'10px 6px',borderRadius:10,border:'1px solid '+(challenge===id?ACCENT:BORDER),background:challenge===id?ACCENT:'#fff',fontWeight:900,fontSize:10,cursor:'pointer'}}>{label}</button>)}
              </div>
              <div style={{fontSize:11,color:'#777',lineHeight:1.45,marginTop:10}}>Challenge privé entre vous deux. NOX affiche uniquement la métrique choisie.</div>
            </div>

            {challenge==='workouts'&&<StatRow label="Challenge · séances cette semaine" mine={myStats.weekWorkouts} theirs={partnerStats.weekWorkouts} />}
            {challenge==='streak'&&<StatRow label="Challenge · streak actuel" mine={myStats.streak} theirs={partnerStats.streak} />}
            {challenge==='prs'&&<StatRow label="Challenge · records personnels" mine={myStats.totalPRs} theirs={partnerStats.totalPRs} />}
            <div style={{marginTop:12,fontSize:10,color:'#888',lineHeight:1.45}}>Les challenges sont facultatifs et n’exposent pas ton poids, ta nutrition, tes photos ou tes données de récupération.</div>

            <button onClick={async () => {
              await supabase.from('profiles').update({ partner_id: null }).eq('id', user!.id);
              setPartner(null); setPartnerStats(null);
            }} style={{ width: '100%', marginTop: 16, padding: 12, background: 'transparent', border: '1px solid ' + BORDER, borderRadius: 12, color: '#777', fontSize: 12, cursor: 'pointer' }}>
              Déconnecter ce partenaire
            </button>
          </>
        )}
      </div>

      <BottomNav active="play" />
    </div>
  );
}
