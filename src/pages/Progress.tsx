import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#B7FF00';
const BG = '#F6F7F2';
const SURFACE = '#FFFFFF';
const BORDER = '#E8EAE2';

type MainTab = 'timeline' | 'body' | 'training' | 'nutrition' | 'prs';

export default function Progress() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<MainTab>('timeline');

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [showPhotoAdd, setShowPhotoAdd] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoPose, setPhotoPose] = useState('front');
  const [photoDate, setPhotoDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [photoSuccess, setPhotoSuccess] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // Timeline
  const [events, setEvents] = useState<any[]>([]);

  // Body
  const [bodyLogs, setBodyLogs] = useState<any[]>([]);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [compareA, setCompareA] = useState<any>(null);
  const [compareB, setCompareB] = useState<any>(null);

  // Training
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [volumeData, setVolumeData] = useState<any[]>([]);

  // Nutrition
  const [nutritionWeeks, setNutritionWeeks] = useState<any[]>([]);

  // PRs
  const [prs, setPrs] = useState<any[]>([]);

  // Rapport
  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  useEffect(() => { if (user) loadAll(); }, [user]);

  useEffect(() => {
    if (searchParams.get('add') !== 'photo') return;
    setTab('body');
    setShowPhotoAdd(true);

    const next = new URLSearchParams(searchParams);
    next.delete('add');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    return () => {
      if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);


  const loadAll = async () => {
    const [
      { data: prof },
      { data: body },
      { data: bodyMeasure },
      { data: bodyPhotos },
      { data: wkts },
      { data: prData },
      { data: foodData },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle(),
      supabase.from('body_logs').select('*').eq('user_id', user!.id).order('created_at'),
      supabase.from('body_logs').select('chest_cm, waist_cm, hips_cm, arms_cm, thighs_cm, created_at').eq('user_id', user!.id).order('created_at'),
      supabase.from('body_photos').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
      supabase.from('workouts').select('*').eq('user_id', user!.id).eq('status', 'completed').order('created_at'),
      supabase.from('personal_records').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
      supabase.from('food_entries').select('calories, protein, created_at').eq('user_id', user!.id).order('created_at'),
    ]);

    setProfile(prof);
    setBodyLogs(body || []);
    const signedPhotos = await Promise.all(
      (bodyPhotos || []).map(async (photo: any) => {
        const storedValue = String(photo.photo_url || '');
        if (!storedValue || /^https?:\/\//i.test(storedValue)) {
          return { ...photo, display_url: storedValue };
        }

        const { data } = await supabase.storage
          .from('body-photos')
          .createSignedUrl(storedValue, 60 * 60);

        return { ...photo, display_url: data?.signedUrl || '' };
      }),
    );
    setPhotos(signedPhotos);
    setPrs(prData || []);

    // Build timeline unifiée
    const timelineEvents: any[] = [];
    (wkts || []).forEach(w => timelineEvents.push({ type: 'workout', date: w.created_at, label: w.program_name || 'Séance', icon: '🏋️', color: ACCENT }));
    (prData || []).forEach(p => timelineEvents.push({ type: 'pr', date: p.created_at, label: `PR ${p.exercise_name} — ${p.weight}kg×${p.reps}`, icon: '🏆', color: '#ffaa00' }));
    (body || []).forEach(b => b.weight && timelineEvents.push({ type: 'weight', date: b.created_at, label: `${b.weight}kg`, icon: '⚖️', color: '#4488ff' }));
    (bodyPhotos || []).forEach(p => timelineEvents.push({ type: 'photo', date: p.created_at, label: 'Photo de progression', icon: '📸', color: '#777B72' }));
    timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setEvents(timelineEvents.slice(0, 50));

    // Volume hebdo
    const weekVolumes: Record<string, number> = {};
    (wkts || []).forEach((w: any) => {
      const week = getWeekKey(new Date(w.created_at));
      weekVolumes[week] = (weekVolumes[week] || 0) + (w.total_volume || 0);
    });
    const volData = Object.entries(weekVolumes).slice(-8).map(([week, vol]) => ({ week, vol: Math.round(vol) }));
    setVolumeData(volData);

    // Nutrition par semaine
    const weekNutrition: Record<string, { kcal: number; protein: number; days: number }> = {};
    (foodData || []).forEach((f: any) => {
      const week = getWeekKey(new Date(f.created_at));
      if (!weekNutrition[week]) weekNutrition[week] = { kcal: 0, protein: 0, days: 0 };
      weekNutrition[week].kcal += f.calories || 0;
      weekNutrition[week].protein += f.protein || 0;
    });
    // Calculer moyennes
    const nutWeeks = Object.entries(weekNutrition).slice(-8).map(([week, data]) => ({
      week,
      avgKcal: Math.round(data.kcal / 7),
      avgProtein: Math.round(data.protein / 7),
    }));
    setNutritionWeeks(nutWeeks);

    setWorkouts(wkts || []);
  };

  const closePhotoAdd = () => {
    if (photoSaving) return;
    setShowPhotoAdd(false);
    setPhotoFile(null);
    setPhotoPreview('');
    setPhotoError('');
    setPhotoSuccess(false);
    setPhotoPose('front');
    setPhotoDate(new Date().toISOString().slice(0, 10));
  };

  const selectPhoto = (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('Choisis une image valide.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setPhotoError('La photo doit faire moins de 15 Mo.');
      return;
    }

    if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoError('');
    setPhotoSuccess(false);
  };

  const saveProgressPhoto = async () => {
    if (!user || !photoFile || photoSaving) return;

    setPhotoSaving(true);
    setPhotoError('');
    setPhotoSuccess(false);

    let filePath = '';

    try {
      const rawExt = photoFile.name.split('.').pop()?.toLowerCase() || '';
      const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(rawExt)
        ? rawExt
        : photoFile.type === 'image/png'
          ? 'png'
          : photoFile.type === 'image/webp'
            ? 'webp'
            : 'jpg';

      const uniqueId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      filePath = `${user.id}/${uniqueId}.${safeExt}`;

      const { error: uploadError } = await supabase.storage
        .from('body-photos')
        .upload(filePath, photoFile, {
          cacheControl: '3600',
          contentType: photoFile.type || 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('body_photos')
        .insert({
          user_id: user.id,
          photo_url: filePath,
          pose: photoPose,
          taken_at: photoDate,
        });

      if (insertError) {
        await supabase.storage.from('body-photos').remove([filePath]);
        throw insertError;
      }

      setPhotoSuccess(true);
      setTab('body');
      await loadAll();

      window.setTimeout(() => {
        closePhotoAdd();
      }, 650);
    } catch (error: any) {
      console.error('Progress photo upload:', error);
      setPhotoError(error?.message || "Impossible d'enregistrer la photo.");
    } finally {
      setPhotoSaving(false);
    }
  };

  const getWeekKey = (date: Date) => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  };

  const generateMonthlyReport = async () => {
    setReportLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const monthWorkouts = workouts.filter(w => w.created_at >= monthStart);
      const monthPRs = prs.filter(p => p.created_at >= monthStart);
      const startW = bodyLogs[0]?.weight;
      const endW = bodyLogs[bodyLogs.length - 1]?.weight;

      const prompt = `Génère un rapport mensuel de progression fitness concis et motivant.

DONNÉES DU MOIS :
- Séances complétées : ${monthWorkouts.length}
- Records personnels : ${monthPRs.length}
- Poids début : ${startW || 'N/A'}kg → fin : ${endW || 'N/A'}kg
- Évolution : ${startW && endW ? ((endW - startW) > 0 ? '+' : '') + (endW - startW).toFixed(1) + 'kg' : 'N/A'}
- Objectif : ${profile?.goal_type || 'transformation'}
- Volume total : ${workouts.filter(w => w.created_at >= monthStart).reduce((s, w) => s + (w.total_volume || 0), 0).toFixed(0)}kg

Réponds en 3-4 phrases : bilan factuel, point fort, conseil clé pour le mois prochain. Pas de markdown.`;

      const resp = await fetch('https://zpxrsmnpcyzafawlweyl.supabase.co/functions/v1/generate-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ prompt }),
      });
      const data = await resp.json();
      setReport(data?.content?.[0]?.text || data?.data?.content?.[0]?.text || '');
    } catch {}
    setReportLoading(false);
  };

  // Stats clés
  const totalWorkouts = workouts.length;
  const totalVolume = workouts.reduce((s, w) => s + (w.total_volume || 0), 0);
  const startWeight = bodyLogs[0]?.weight;
  const currentWeight = bodyLogs[bodyLogs.length - 1]?.weight;
  const weightDelta = startWeight && currentWeight ? (currentWeight - startWeight).toFixed(1) : null;
  const weekWorkouts = workouts.filter(w => new Date(w.created_at) > new Date(Date.now() - 7 * 86400000)).length;

  const TABS: [MainTab, string][] = [
    ['timeline', 'Timeline'],
    ['body', 'Corps'],
    ['training', 'Training'],
    ['nutrition', 'Nutrition'],
    ['prs', 'Records'],
  ];

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#090909', paddingBottom: 105 }}>
      {/* Header */}
      <div style={{ padding: '24px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 28, lineHeight: 1, fontWeight: 1000, letterSpacing: '-.07em', color: '#090909' }}>NOX</div>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: ACCENT }} />
            </div>
            <div style={{ fontSize: 10, color: '#9A9D96', fontWeight: 800, marginTop: 7, letterSpacing: '.08em' }}>PROGRÈS</div>
          </div>
          <button onClick={generateMonthlyReport} disabled={reportLoading}
            style={{ padding: '10px 14px', background: '#090909', border: 0, borderRadius: 20, color: '#fff', fontSize: 11, fontWeight: 850, cursor: 'pointer', touchAction: 'manipulation' }}>
            {reportLoading ? '...' : '📋 Rapport'}
          </button>
        </div>

        <div style={{ margin: '24px 0 18px' }}>
          <div style={{ fontSize: 13, color: '#777B72', fontWeight: 700 }}>Ton évolution en un coup d'œil</div>
          <h1 style={{ margin: '3px 0 0', fontSize: 34, lineHeight: 1, fontWeight: 950, letterSpacing: '-.055em', color: '#090909' }}>
            Progrès.
          </h1>
        </div>

        {/* Rapport mensuel */}
        {report && (
          <div style={{ background: ACCENT + '0d', border: '1px solid ' + ACCENT + '33', borderRadius: 20, padding: '12px 16px', marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: ACCENT, fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>📋 RAPPORT DU MOIS</div>
            <div style={{ fontSize: 13, color: '#343730', lineHeight: 1.6 }}>{report}</div>
            <button onClick={() => setReport(null)} style={{ marginTop: 8, background: 'none', border: 'none', color: '#8B8F86', cursor: 'pointer', fontSize: 11 }}>Fermer</button>
          </div>
        )}

        {/* Stats rapides */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, marginBottom: 0 }}>
          {[
            { label: 'Séances', value: totalWorkouts },
            { label: 'PR', value: prs.length },
            { label: 'Poids Δ', value: weightDelta ? (parseFloat(weightDelta) > 0 ? '+' : '') + weightDelta + 'kg' : '—' },
            { label: 'Volume', value: totalVolume > 1000 ? Math.round(totalVolume / 1000) + 't' : Math.round(totalVolume) + 'kg' },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: '10px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: ACCENT }}>{value}</div>
              <div style={{ fontSize: 9, color: '#8B8F86', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', background: '#ECEEE8', borderRadius: 16, padding: 4, marginBottom: 14 }}>
          {TABS.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding: '10px 15px', background: tab === id ? '#090909' : 'transparent', border: 'none', borderRadius: 12, color: tab === id ? '#fff' : '#777B72', fontSize: 11, fontWeight: 850, cursor: 'pointer', whiteSpace: 'nowrap', touchAction: 'manipulation' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 20px 0' }}>

        {/* ── TIMELINE ── */}
        {tab === 'timeline' && (
          <div>
            {events.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#8B8F86' }}>Pas encore de données — commence à t'entraîner !</div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 19, top: 0, bottom: 0, width: 1, background: BORDER }} />
                {events.map((e, i) => (
                  <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 16, position: 'relative' }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: SURFACE, border: '1px solid ' + e.color + '44', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16, zIndex: 1 }}>
                      {e.icon}
                    </div>
                    <div style={{ flex: 1, paddingTop: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#090909' }}>{e.label}</div>
                      <div style={{ fontSize: 10, color: '#8B8F86', marginTop: 2 }}>
                        {new Date(e.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CORPS ── */}
        {tab === 'body' && (
          <div>
            <div style={{ background: '#090909', borderRadius: 24, padding: 18, marginBottom: 18, color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.09em', color: '#777B72' }}>PHOTOS DE PROGRESSION</div>
                  <div style={{ fontSize: 20, fontWeight: 950, letterSpacing: '-.035em', marginTop: 4 }}>
                    {photos.length ? `${photos.length} photo${photos.length > 1 ? 's' : ''}` : 'Crée ton premier repère'}
                  </div>
                  <div style={{ fontSize: 11, color: '#8E918A', marginTop: 5, lineHeight: 1.45 }}>
                    Tes images restent dans ton espace privé.
                  </div>
                </div>
                <button
                  onClick={() => setShowPhotoAdd(true)}
                  style={{ flexShrink: 0, border: 0, borderRadius: 16, background: ACCENT, color: '#090909', padding: '12px 14px', fontSize: 11, fontWeight: 950, cursor: 'pointer' }}
                >
                  + Photo
                </button>
              </div>

              {photos.length > 0 && (
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 15, paddingBottom: 2 }}>
                  {photos.slice(0, 8).map((photo: any) => (
                    <img
                      key={photo.id}
                      src={photo.display_url || photo.photo_url}
                      alt="Progression"
                      style={{ width: 76, height: 96, borderRadius: 14, objectFit: 'cover', flexShrink: 0, background: '#1A1A1A' }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Évolution poids */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#8B8F86', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>ÉVOLUTION DU POIDS</div>
              {bodyLogs.length > 1 ? (
                <>
                  {/* Mini graphique SVG */}
                  <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 20, padding: 16, marginBottom: 12 }}>
                    <svg width="100%" height="80" viewBox={`0 0 ${bodyLogs.length * 30} 80`} preserveAspectRatio="none">
                      {bodyLogs.map((log, i) => {
                        const weights = bodyLogs.map(l => l.weight).filter(Boolean);
                        const minW = Math.min(...weights);
                        const maxW = Math.max(...weights);
                        const range = maxW - minW || 1;
                        const x = i * 30 + 15;
                        const y = 70 - ((log.weight - minW) / range) * 60;
                        return i > 0 ? (
                          <line key={i}
                            x1={(i-1)*30+15} y1={70-((bodyLogs[i-1].weight-minW)/range)*60}
                            x2={x} y2={y}
                            stroke={ACCENT} strokeWidth="2" />
                        ) : null;
                      })}
                      {bodyLogs.map((log, i) => {
                        const weights = bodyLogs.map(l => l.weight).filter(Boolean);
                        const minW = Math.min(...weights);
                        const maxW = Math.max(...weights);
                        const range = maxW - minW || 1;
                        const x = i * 30 + 15;
                        const y = 70 - ((log.weight - minW) / range) * 60;
                        return <circle key={i} cx={x} cy={y} r="3" fill={ACCENT} />;
                      })}
                    </svg>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: '#8B8F86' }}>{new Date(bodyLogs[0].created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                      <span style={{ fontSize: 12, fontWeight: 900, color: ACCENT }}>
                        {weightDelta && (parseFloat(weightDelta) > 0 ? '+' : '')}{weightDelta}kg
                      </span>
                      <span style={{ fontSize: 10, color: '#8B8F86' }}>Aujourd'hui</span>
                    </div>
                  </div>

                  {/* Comparateur avant/après photos */}
                  {photos.length >= 2 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, color: '#8B8F86', fontWeight: 800, textTransform: 'uppercase', marginBottom: 10 }}>COMPARATEUR AVANT / APRÈS</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 10, color: '#8B8F86', marginBottom: 4 }}>AVANT</div>
                          <select value={compareA?.id || ''} onChange={e => setCompareA(photos.find(p => p.id === e.target.value))}
                            style={{ width: '100%', padding: '8px', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 8, color: '#090909', fontSize: 12, marginBottom: 6 }}>
                            <option value="">Choisir...</option>
                            {photos.map(p => <option key={p.id} value={p.id}>{new Date(p.created_at).toLocaleDateString('fr-FR')}</option>)}
                          </select>
                          {compareA?.photo_url && <img src={compareA.display_url || compareA.photo_url} style={{ width: '100%', borderRadius: 16, objectFit: 'cover', aspectRatio: '3/4' }} alt="Avant" />}
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: '#8B8F86', marginBottom: 4 }}>APRÈS</div>
                          <select value={compareB?.id || ''} onChange={e => setCompareB(photos.find(p => p.id === e.target.value))}
                            style={{ width: '100%', padding: '8px', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 8, color: '#090909', fontSize: 12, marginBottom: 6 }}>
                            <option value="">Choisir...</option>
                            {photos.map(p => <option key={p.id} value={p.id}>{new Date(p.created_at).toLocaleDateString('fr-FR')}</option>)}
                          </select>
                          {compareB?.photo_url && <img src={compareB.display_url || compareB.photo_url} style={{ width: '100%', borderRadius: 16, objectFit: 'cover', aspectRatio: '3/4' }} alt="Après" />}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', color: '#8B8F86', padding: '20px 0', fontSize: 13 }}>
                  Enregistre ton poids dans Body pour voir l'évolution
                  <br />
                  <button onClick={() => navigate('/body')} style={{ marginTop: 12, padding: '8px 16px', background: ACCENT + '22', border: '1px solid ' + ACCENT + '44', borderRadius: 16, color: ACCENT, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Aller dans Body
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TRAINING ── */}
        {tab === 'training' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Séances totales', value: totalWorkouts, unit: '' },
                { label: 'Cette semaine', value: weekWorkouts, unit: '' },
                { label: 'Volume total', value: Math.round(totalVolume / 1000), unit: 'tonnes' },
                { label: 'Durée moy.', value: Math.round(workouts.reduce((s, w) => s + (w.duration_minutes || 0), 0) / Math.max(workouts.length, 1)), unit: 'min' },
              ].map(({ label, value, unit }) => (
                <div key={label} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 20, padding: 16 }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: ACCENT }}>{value}<span style={{ fontSize: 12, color: '#8B8F86' }}> {unit}</span></div>
                  <div style={{ fontSize: 11, color: '#8B8F86', fontWeight: 700, marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Volume hebdo */}
            {volumeData.length > 0 && (
              <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 20, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#8B8F86', fontWeight: 800, textTransform: 'uppercase', marginBottom: 12 }}>VOLUME HEBDOMADAIRE (kg)</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
                  {volumeData.map((d, i) => {
                    const maxVol = Math.max(...volumeData.map(v => v.vol), 1);
                    const h = Math.max(8, (d.vol / maxVol) * 72);
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: '100%', height: h, background: i === volumeData.length - 1 ? ACCENT : ACCENT + '44', borderRadius: '4px 4px 0 0' }} />
                        <div style={{ fontSize: 8, color: '#8B8F86' }}>{d.week.slice(5)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button onClick={() => navigate('/training-calendar')}
              style={{ width: '100%', padding: 14, background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 18, color: '#090909', fontWeight: 700, cursor: 'pointer', fontSize: 13, touchAction: 'manipulation' }}>
              📅 Voir le calendrier complet
            </button>
          </div>
        )}

        {/* ── NUTRITION ── */}
        {tab === 'nutrition' && (
          <div>
            {nutritionWeeks.length > 0 ? (
              <div>
                <div style={{ fontSize: 11, color: '#8B8F86', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>MOYENNES PAR SEMAINE</div>
                {nutritionWeeks.slice(-6).reverse().map((w, i) => (
                  <div key={i} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 18, padding: '12px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 12, color: '#8B8F86' }}>Sem. {w.week}</div>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 15, fontWeight: 900, color: ACCENT }}>{w.avgKcal}</div>
                        <div style={{ fontSize: 9, color: '#8B8F86' }}>kcal/j</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 15, fontWeight: 900, color: '#090909' }}>{w.avgProtein}g</div>
                        <div style={{ fontSize: 9, color: '#8B8F86' }}>prot/j</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#8B8F86', padding: '40px 0', fontSize: 13 }}>
                Commence à logger tes repas pour voir les moyennes
                <br />
                <button onClick={() => navigate('/fuel')} style={{ marginTop: 12, padding: '8px 16px', background: ACCENT + '22', border: '1px solid ' + ACCENT + '44', borderRadius: 16, color: ACCENT, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Aller dans Fuel
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── PERSONAL RECORDS ── */}
        {tab === 'prs' && (
          <div>
            {prs.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#8B8F86', padding: '40px 0', fontSize: 13 }}>
                Aucun record encore — fais ta première séance !
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 11, color: '#8B8F86', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>
                  {prs.length} RECORD{prs.length > 1 ? 'S' : ''} PERSONNELS
                </div>
                {/* Grouper par exercice */}
                {Object.entries(
                  prs.reduce((acc: any, pr: any) => {
                    const key = pr.exercise_name || 'Exercice';
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(pr);
                    return acc;
                  }, {})
                ).map(([exercise, records]: [string, any]) => (
                  <div key={exercise} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 20, padding: 16, marginBottom: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#090909', marginBottom: 10 }}>{exercise}</div>
                    {records.slice(0, 3).map((pr: any, i: number) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < records.length - 1 ? '1px solid ' + BORDER : 'none' }}>
                        <div style={{ fontSize: 13, color: i === 0 ? ACCENT : '#888', fontWeight: i === 0 ? 800 : 400 }}>
                          {i === 0 ? '🏆 ' : ''}{pr.weight}kg × {pr.reps} reps
                        </div>
                        <div style={{ fontSize: 11, color: '#8B8F86' }}>
                          {new Date(pr.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showPhotoAdd && (
        <div
          onClick={closePhotoAdd}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 500,
            background: 'rgba(0,0,0,.48)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 560,
              maxHeight: '92vh',
              overflowY: 'auto',
              background: '#fff',
              borderRadius: '28px 28px 0 0',
              padding: '10px 20px max(30px, env(safe-area-inset-bottom))',
              boxSizing: 'border-box',
              boxShadow: '0 -24px 80px rgba(0,0,0,.2)',
            }}
          >
            <div style={{ width: 42, height: 5, borderRadius: 99, background: '#D8DAD3', margin: '2px auto 20px' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div>
                <div style={{ fontSize: 10, color: '#8B8F86', fontWeight: 900, letterSpacing: '.1em' }}>PROGRESSION</div>
                <div style={{ fontSize: 27, fontWeight: 950, letterSpacing: '-.045em', marginTop: 3 }}>Ajouter une photo</div>
                <div style={{ fontSize: 11, color: '#8B8F86', marginTop: 5, lineHeight: 1.45 }}>
                  Stockée dans ton espace privé NOX.
                </div>
              </div>
              <button
                onClick={closePhotoAdd}
                disabled={photoSaving}
                aria-label="Fermer"
                style={{ width: 40, height: 40, borderRadius: 14, border: `1px solid ${BORDER}`, background: '#F5F6F1', fontSize: 20, cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                selectPhoto(e.target.files?.[0]);
                e.currentTarget.value = '';
              }}
              style={{ display: 'none' }}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                selectPhoto(e.target.files?.[0]);
                e.currentTarget.value = '';
              }}
              style={{ display: 'none' }}
            />

            {!photoPreview ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 22 }}>
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  style={{ minHeight: 128, border: 0, borderRadius: 22, background: '#090909', color: '#fff', padding: 16, textAlign: 'left', cursor: 'pointer' }}
                >
                  <div style={{ width: 42, height: 42, borderRadius: 14, display: 'grid', placeItems: 'center', background: ACCENT, color: '#090909', fontSize: 20 }}>📷</div>
                  <div style={{ fontSize: 15, fontWeight: 950, marginTop: 18 }}>Caméra</div>
                  <div style={{ fontSize: 10, color: '#8B8F86', marginTop: 4 }}>Prendre une photo maintenant</div>
                </button>

                <button
                  onClick={() => galleryInputRef.current?.click()}
                  style={{ minHeight: 128, border: `1px solid ${BORDER}`, borderRadius: 22, background: '#F8F9F5', color: '#090909', padding: 16, textAlign: 'left', cursor: 'pointer' }}
                >
                  <div style={{ width: 42, height: 42, borderRadius: 14, display: 'grid', placeItems: 'center', background: '#090909', color: ACCENT, fontSize: 20 }}>▣</div>
                  <div style={{ fontSize: 15, fontWeight: 950, marginTop: 18 }}>Galerie</div>
                  <div style={{ fontSize: 10, color: '#8B8F86', marginTop: 4 }}>Choisir une image existante</div>
                </button>
              </div>
            ) : (
              <div style={{ marginTop: 20 }}>
                <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', background: '#ECEEE8' }}>
                  <img src={photoPreview} alt="Aperçu" style={{ width: '100%', maxHeight: 430, display: 'block', objectFit: 'cover' }} />
                  <button
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview('');
                      setPhotoError('');
                    }}
                    disabled={photoSaving}
                    style={{ position: 'absolute', right: 12, top: 12, border: 0, borderRadius: 999, background: 'rgba(0,0,0,.72)', color: '#fff', padding: '8px 11px', fontSize: 10, fontWeight: 900, cursor: 'pointer' }}
                  >
                    Changer
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
                  <label style={{ display: 'block' }}>
                    <div style={{ fontSize: 10, fontWeight: 850, color: '#777B72', marginBottom: 6 }}>POSE</div>
                    <select
                      value={photoPose}
                      onChange={(e) => setPhotoPose(e.target.value)}
                      disabled={photoSaving}
                      style={{ width: '100%', height: 48, borderRadius: 15, border: `1px solid ${BORDER}`, background: '#F8F9F5', padding: '0 12px', color: '#090909', fontWeight: 800 }}
                    >
                      <option value="front">Face</option>
                      <option value="side">Profil</option>
                      <option value="back">Dos</option>
                    </select>
                  </label>

                  <label style={{ display: 'block' }}>
                    <div style={{ fontSize: 10, fontWeight: 850, color: '#777B72', marginBottom: 6 }}>DATE</div>
                    <input
                      type="date"
                      value={photoDate}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setPhotoDate(e.target.value)}
                      disabled={photoSaving}
                      style={{ width: '100%', height: 48, boxSizing: 'border-box', borderRadius: 15, border: `1px solid ${BORDER}`, background: '#F8F9F5', padding: '0 12px', color: '#090909', fontWeight: 800 }}
                    />
                  </label>
                </div>

                {photoError && (
                  <div style={{ marginTop: 12, padding: '11px 13px', borderRadius: 14, background: '#FFF1F1', color: '#A32929', fontSize: 11, fontWeight: 750 }}>
                    {photoError}
                  </div>
                )}

                {photoSuccess && (
                  <div style={{ marginTop: 12, padding: '11px 13px', borderRadius: 14, background: '#F1F9DF', color: '#314B00', fontSize: 11, fontWeight: 850 }}>
                    Photo enregistrée ✓
                  </div>
                )}

                <button
                  onClick={saveProgressPhoto}
                  disabled={photoSaving || !photoFile}
                  style={{
                    width: '100%',
                    marginTop: 14,
                    height: 54,
                    border: 0,
                    borderRadius: 18,
                    background: photoSaving ? '#D9DDD2' : ACCENT,
                    color: '#090909',
                    fontSize: 13,
                    fontWeight: 950,
                    cursor: photoSaving ? 'default' : 'pointer',
                  }}
                >
                  {photoSaving ? 'Enregistrement…' : 'Enregistrer la photo'}
                </button>
              </div>
            )}

            {photoError && !photoPreview && (
              <div style={{ marginTop: 12, padding: '11px 13px', borderRadius: 14, background: '#FFF1F1', color: '#A32929', fontSize: 11, fontWeight: 750 }}>
                {photoError}
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav active="progress" />
    </div>
  );
}
