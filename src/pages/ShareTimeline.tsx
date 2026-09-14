import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';

export default function ShareTimeline() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    const [
      { data: profile },
      { data: workouts },
      { data: prs },
      { data: bodyLogs },
      { data: projections },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle(),
      supabase.from('workouts').select('id, created_at').eq('user_id', user!.id).eq('status', 'completed').order('created_at'),
      supabase.from('personal_records').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
      supabase.from('body_logs').select('weight, created_at').eq('user_id', user!.id).order('created_at'),
      supabase.from('future_you_generations').select('*').eq('user_id', user!.id).order('created_at'),
    ]);

    const startWeight = bodyLogs?.[0]?.weight;
    const currentWeight = bodyLogs?.[bodyLogs.length - 1]?.weight;
    const daysSinceStart = workouts?.length > 0
      ? Math.floor((Date.now() - new Date(workouts[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    setData({
      name: profile?.display_name?.split(' ')[0] || 'NOX',
      goal: profile?.goal_type || 'transformation',
      days: daysSinceStart,
      workouts: workouts?.length || 0,
      prs: prs?.length || 0,
      startWeight,
      currentWeight,
      weightDelta: startWeight && currentWeight ? (currentWeight - startWeight).toFixed(1) : null,
      xp: profile?.xp || 0,
      streak: profile?.streak_days || 0,
      originalProjection: projections?.[0] || null,
      latestProjection: projections?.[projections.length - 1] || null,
    });
  };

  const generateImage = async () => {
    if (!data || !canvasRef.current) return;
    setGenerating(true);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    canvas.width = 1080;
    canvas.height = 1920;

    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, 1080, 1920);

    // Grid lines subtiles
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      ctx.beginPath(); ctx.moveTo(0, i * 100); ctx.lineTo(1080, i * 100); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i * 60, 0); ctx.lineTo(i * 60, 1920); ctx.stroke();
    }

    // NOX Logo
    ctx.fillStyle = ACCENT;
    ctx.font = 'bold 48px system-ui';
    ctx.letterSpacing = '8px';
    ctx.fillText('NOX', 80, 120);

    ctx.fillStyle = '#333';
    ctx.font = '24px system-ui';
    ctx.fillText('AI FITNESS SYSTEM', 80, 160);

    // Séparateur
    ctx.fillStyle = ACCENT;
    ctx.fillRect(80, 185, 920, 2);

    // Nom + jours
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 72px system-ui';
    ctx.fillText(data.name.toUpperCase(), 80, 310);

    ctx.fillStyle = '#555';
    ctx.font = '28px system-ui';
    ctx.fillText(`JOUR ${data.days} · ${data.goal.toUpperCase()}`, 80, 360);

    // Stats principales - 4 blocs
    const statBlocks = [
      { label: 'SÉANCES', value: String(data.workouts), color: ACCENT },
      { label: 'RECORDS', value: String(data.prs), color: '#fff' },
      { label: 'ÉVOLUTION', value: data.weightDelta ? (parseFloat(data.weightDelta) > 0 ? '+' : '') + data.weightDelta + 'kg' : '—', color: data.weightDelta && parseFloat(data.weightDelta) < 0 ? ACCENT : '#ff6644' },
      { label: 'XP', value: String(data.xp), color: '#4488ff' },
    ];

    statBlocks.forEach((stat, i) => {
      const x = 80 + (i % 2) * 460;
      const y = 440 + Math.floor(i / 2) * 200;

      ctx.fillStyle = '#111';
      roundRect(ctx, x, y, 420, 160, 20);
      ctx.fill();

      ctx.strokeStyle = stat.color + '44';
      ctx.lineWidth = 2;
      roundRect(ctx, x, y, 420, 160, 20);
      ctx.stroke();

      ctx.fillStyle = stat.color;
      ctx.font = 'bold 56px system-ui';
      ctx.fillText(stat.value, x + 24, y + 80);

      ctx.fillStyle = '#555';
      ctx.font = '20px system-ui';
      ctx.fillText(stat.label, x + 24, y + 115);
    });

    // Graphique poids si données
    if (data.startWeight && data.currentWeight) {
      ctx.fillStyle = '#111';
      roundRect(ctx, 80, 880, 920, 220, 20);
      ctx.fill();

      ctx.fillStyle = '#555';
      ctx.font = '20px system-ui';
      ctx.fillText('ÉVOLUTION DU POIDS', 110, 925);

      ctx.fillStyle = ACCENT;
      ctx.font = 'bold 28px system-ui';
      ctx.fillText(`${data.startWeight}kg → ${data.currentWeight}kg`, 110, 970);

      const delta = parseFloat(data.weightDelta!);
      ctx.fillStyle = delta < 0 ? ACCENT : '#ff6644';
      ctx.font = 'bold 42px system-ui';
      ctx.fillText((delta > 0 ? '+' : '') + data.weightDelta + ' kg', 110, 1050);
    }

    // Section FUTURE si projection existante
    if (data.originalProjection) {
      let projData: any = {};
      try { projData = JSON.parse(data.originalProjection.result_text); } catch {}

      ctx.fillStyle = '#111';
      roundRect(ctx, 80, 1130, 920, 300, 20);
      ctx.fill();

      ctx.strokeStyle = ACCENT + '33';
      ctx.lineWidth = 1;
      roundRect(ctx, 80, 1130, 920, 300, 20);
      ctx.stroke();

      ctx.fillStyle = ACCENT;
      ctx.font = 'bold 22px system-ui';
      ctx.fillText('NOX FUTURE · PROJECTION ORIGINALE', 110, 1180);

      ctx.fillStyle = '#888';
      ctx.font = '24px system-ui';
      const tagline = projData.tagline || 'Ma transformation projetée';
      wrapText(ctx, tagline, 110, 1230, 860, 36);

      if (projData.en_90_jours) {
        ctx.fillStyle = '#555';
        ctx.font = '20px system-ui';
        wrapText(ctx, 'J+90 : ' + projData.en_90_jours, 110, 1320, 860, 30);
      }
    }

    // Streak badge
    if (data.streak > 0) {
      ctx.fillStyle = '#ff660022';
      roundRect(ctx, 80, 1460, 300, 80, 16);
      ctx.fill();
      ctx.fillStyle = '#ff6600';
      ctx.font = 'bold 32px system-ui';
      ctx.fillText(`🔥 ${data.streak} jours`, 110, 1510);
    }

    // Footer
    ctx.fillStyle = ACCENT;
    ctx.fillRect(80, 1800, 920, 2);

    ctx.fillStyle = '#333';
    ctx.font = '24px system-ui';
    ctx.fillText('nox-ai-five.vercel.app · Données réelles · ' + new Date().toLocaleDateString('fr-FR'), 80, 1860);

    ctx.fillStyle = '#555';
    ctx.font = '20px system-ui';
    ctx.fillText('Projection indicative générée par IA — résultats variables', 80, 1900);

    setImageUrl(canvas.toDataURL('image/png', 0.95));
    setGenerating(false);
  };

  const download = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `nox-timeline-${data?.name?.toLowerCase()}-jour${data?.days}.png`;
    a.click();
  };

  const share = async () => {
    if (!imageUrl) return;
    try {
      const blob = await (await fetch(imageUrl)).blob();
      const file = new File([blob], 'nox-timeline.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Ma transformation NOX', text: `Jour ${data?.days} avec NOX — ${data?.workouts} séances · ${data?.prs} records` });
      } else {
        download();
      }
    } catch { download(); }
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 40 }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid #1a1a1a' }}>
        <button onClick={() => navigate('/future')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14, marginBottom: 12 }}>← Retour</button>
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em' }}>Partage</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>MA TIMELINE NOX</div>
        <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>Carte vérifiable avec tes vraies données attachées.</div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        {data && !imageUrl && (
          <>
            {/* Preview données */}
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 16, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 16 }}>CONTENU DE LA CARTE</div>
              {[
                { label: 'Nom', value: data.name },
                { label: 'Jours avec NOX', value: data.days },
                { label: 'Séances complétées', value: data.workouts },
                { label: 'Records personnels', value: data.prs },
                { label: 'Évolution poids', value: data.weightDelta ? (parseFloat(data.weightDelta) > 0 ? '+' : '') + data.weightDelta + 'kg' : 'Non renseigné' },
                { label: 'XP total', value: data.xp },
                { label: 'Projection FUTURE', value: data.originalProjection ? '✓ Incluse' : 'Non générée' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1a1a1a' }}>
                  <span style={{ fontSize: 13, color: '#555' }}>{label}</span>
                  <span style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>{value}</span>
                </div>
              ))}
            </div>

            <button onClick={generateImage} disabled={generating}
              style={{ width: '100%', padding: 18, background: ACCENT, border: 'none', borderRadius: 14, color: '#000', fontWeight: 900, fontSize: 15, cursor: 'pointer', marginBottom: 12 }}>
              {generating ? 'GÉNÉRATION...' : '🎨 GÉNÉRER MA CARTE'}
            </button>
          </>
        )}

        {imageUrl && (
          <>
            <img src={imageUrl} style={{ width: '100%', borderRadius: 16, marginBottom: 16 }} alt="Timeline NOX" />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setImageUrl(null); }}
                style={{ flex: 1, padding: 14, background: '#111', border: '1px solid #1a1a1a', borderRadius: 12, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                REFAIRE
              </button>
              <button onClick={download}
                style={{ flex: 1, padding: 14, background: '#111', border: '1px solid #1a1a1a', borderRadius: 12, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                ⬇️ TÉLÉCHARGER
              </button>
              <button onClick={share}
                style={{ flex: 2, padding: 14, background: ACCENT, border: 'none', borderRadius: 12, color: '#000', fontWeight: 900, cursor: 'pointer' }}>
                📤 PARTAGER
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let cy = y;
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = word + ' ';
      cy += lineHeight;
    } else { line = test; }
  }
  ctx.fillText(line, x, cy);
}
