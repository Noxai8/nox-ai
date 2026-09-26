import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom'; 
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#C8FF00';
const BG = '#F7F8F4';
const WHITE  = '#FFFFFF';
const SURFACE = '#FFFFFF';
const BORDER = '#E8EAE4';
const BLACK  = '#0B0B0B';
const MUTED  = '#7A7F76';

export default function Progress() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<MainTab>('timeline');
  const [period, setPeriod] = useState('30 jours');

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
  // Mensurations
  const [measureLogs, setMeasureLogs] = useState<any[]>([]);
  // Exercice sélectionné pour la courbe
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [exerciseHistory, setExerciseHistory] = useState<any[]>([]);
  // Ghost Mode
  const [ghostMode, setGhostMode] = useState(false);
  const [ghostSession, setGhostSession] = useState<any>(null);

  // Rapport
  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [activeWeightIndex, setActiveWeightIndex] = useState<number | null>(null);

  useEffect(() => { if (user) loadAll(); }, [user]);

  // Préselectionne automatiquement la photo la plus ancienne en AVANT
  // et la plus récente en APRÈS. L'utilisateur peut ensuite les changer.
  useEffect(() => {
    if (photos.length < 2) return;
    const ordered = [...photos].sort((a: any, b: any) =>
      new Date(a.taken_at || a.created_at).getTime() - new Date(b.taken_at || b.created_at).getTime()
    );
    setCompareA(current => current && ordered.some((p: any) => p.id === current.id) ? current : ordered[0]);
    setCompareB(current => current && ordered.some((p: any) => p.id === current.id) ? current : ordered[ordered.length - 1]);
  }, [photos]);

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
      supabase.from('food_entries').select('calories, protein, carbs, fat, created_at').eq('user_id', user!.id).order('created_at'),
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

    // Nutrition par semaine — moyenne sur les jours réellement renseignés
    const weekNutrition: Record<string, { kcal: number; protein: number; carbs: number; fat: number; loggedDays: Set<string> }> = {};
    (foodData || []).forEach((f: any) => {
      if (!f.created_at) return;
      const date = new Date(f.created_at);
      const week = getWeekKey(date);
      const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (!weekNutrition[week]) weekNutrition[week] = { kcal: 0, protein: 0, carbs: 0, fat: 0, loggedDays: new Set<string>() };
      weekNutrition[week].kcal += Number(f.calories) || 0;
      weekNutrition[week].protein += Number(f.protein) || 0;
      weekNutrition[week].carbs += Number(f.carbs) || 0;
      weekNutrition[week].fat += Number(f.fat) || 0;
      weekNutrition[week].loggedDays.add(day);
    });
    const nutWeeks = Object.entries(weekNutrition).slice(-8).map(([week, data]) => {
      const daysLogged = data.loggedDays.size;
      return {
        week,
        avgKcal: daysLogged > 0 ? Math.round(data.kcal / daysLogged) : 0,
        avgProtein: daysLogged > 0 ? Math.round(data.protein / daysLogged) : 0,
        avgCarbs: daysLogged > 0 ? Math.round(data.carbs / daysLogged) : 0,
        avgFat: daysLogged > 0 ? Math.round(data.fat / daysLogged) : 0,
        daysLogged,
      };
    });
    setNutritionWeeks(nutWeeks);

    setWorkouts(wkts || []);

    // Mensurations depuis body_logs
    setMeasureLogs((body || []).filter((b: any) =>
      b.chest_cm || b.waist_cm || b.hips_cm || b.arms_cm || b.thighs_cm
    ));
  };

  // Charger l'historique d'un exercice pour la courbe
  const loadExerciseHistory = async (exerciseName: string) => {
    if (!exerciseName || !user) return;
    const { data } = await supabase
      .from('personal_records')
      .select('weight, reps, created_at')
      .eq('user_id', user.id)
      .eq('exercise_name', exerciseName)
      .order('created_at');
    setExerciseHistory(data || []);
  };

  // Ghost Mode — charger la session d'il y a 4 semaines
  const loadGhostSession = async (exerciseName: string) => {
    if (!exerciseName || !user) return;
    const fourWeeksAgo = new Date(Date.now() - 28 * 86400000).toISOString();
    const { data } = await supabase
      .from('personal_records')
      .select('weight, reps, created_at')
      .eq('user_id', user.id)
      .eq('exercise_name', exerciseName)
      .lte('created_at', fourWeeksAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setGhostSession(data);
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
    const mondayOffset = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - mondayOffset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
      const monthBodyLogs = bodyLogs.filter((b: any) => b.created_at >= monthStart && b.weight != null);
      const startW = monthBodyLogs[0]?.weight;
      const endW = monthBodyLogs[monthBodyLogs.length - 1]?.weight;

      const prompt = `Génère un rapport mensuel de progression fitness concis et motivant.

DONNÉES DU MOIS :
- Séances complétées : ${monthWorkouts.length}
- Records personnels : ${monthPRs.length}
- Poids début : ${startW || 'N/A'}kg → fin : ${endW || 'N/A'}kg
- Évolution : ${startW && endW ? ((endW - startW) > 0 ? '+' : '') + (endW - startW).toFixed(1) + 'kg' : 'N/A'}
- Objectif : ${profile?.goal_type || 'non renseigné'}
- Volume total : ${workouts.filter(w => w.created_at >= monthStart).reduce((s, w) => s + (w.total_volume || 0), 0).toFixed(0)}kg
- Jours de nutrition renseignés : ${nutritionWeeks.reduce((sum, w) => sum + (w.daysLogged || 0), 0)}
- Photos de progression : ${photos.length}
- Relevés de mensurations : ${measureLogs.length}

Réponds en 3-4 phrases : bilan factuel, tendance principale et prochaine action concrète. Pas de markdown.`;

      const resp = await fetch('https://zpxrsmnpcyzafawlweyl.supabase.co/functions/v1/nox-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          system: `Tu es NOX, le coach de progression fitness de l'utilisateur.

Ton rôle est d'analyser ses données de progression de manière factuelle, concise et actionnable.

Ne crée aucune donnée absente.
Ne fais aucune supposition sur des données non renseignées.
Réponds en français.
Pas de markdown.`,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        if (data?.error === 'PRO_REQUIRED') {
          setReport('Le rapport NOX est réservé aux abonnements Pro.');
          return;
        }
        throw new Error(data?.error || 'Impossible de générer le rapport NOX.');
      }

      const text = data?.content?.[0]?.text;
      if (!text) throw new Error('Réponse NOX vide.');
      setReport(text);
    } catch (err: unknown) {
      console.error('generateMonthlyReport:', err);
      setReport(err instanceof Error ? err.message : 'Impossible de générer le rapport.');
    } finally {
      setReportLoading(false);
    }
  };

  // Période active — toutes les synthèses principales utilisent la même fenêtre.
  const periodStart = (() => {
    if (period === 'Tout') return null;
    const d = new Date();
    if (period === '30 jours') d.setDate(d.getDate() - 30);
    if (period === '3 mois') d.setMonth(d.getMonth() - 3);
    if (period === '6 mois') d.setMonth(d.getMonth() - 6);
    return d;
  })();

  const inPeriod = (value?: string | null) =>
    !!value && (!periodStart || new Date(value).getTime() >= periodStart.getTime());

  const periodWorkouts = workouts.filter((w: any) => inPeriod(w.created_at));
  const periodPrs = prs.filter((p: any) => inPeriod(p.created_at));
  const allWeightLogs = bodyLogs.filter((b: any) => b.weight != null);
  const weightLogs = allWeightLogs.filter((b: any) => inPeriod(b.created_at));
  const periodEvents = events.filter((e: any) => inPeriod(e.date));

  const totalWorkouts = periodWorkouts.length;
  const totalVolume = periodWorkouts.reduce((sum: number, w: any) => sum + (Number(w.total_volume) || 0), 0);
  const startWeight = weightLogs[0]?.weight;
  const currentWeight = weightLogs[weightLogs.length - 1]?.weight;
  const weightDelta =
    startWeight != null && currentWeight != null && weightLogs.length > 1
      ? (Number(currentWeight) - Number(startWeight)).toFixed(1)
      : null;
  const weekWorkouts = workouts.filter(
    (w: any) => new Date(w.created_at).getTime() > Date.now() - 7 * 86400000,
  ).length;

  // Un record = un exercice distinct sur la période, pas une ligne brute de la table.
  const uniquePeriodRecords = new Set(
    periodPrs.map((p: any) => String(p.exercise_name || '').trim()).filter(Boolean),
  ).size;

  // Interprétation déterministe immédiate : pas d'attente IA pour comprendre la page.
  const progressInsight = (() => {
    if (!periodWorkouts.length && weightLogs.length < 2 && !periodPrs.length) {
      return {
        title: 'Ta progression commence maintenant.',
        body: 'Enregistre tes séances, ton poids et ta nutrition. NOX fera ressortir les tendances au fil du temps.',
      };
    }
    const parts: string[] = [];
    if (periodWorkouts.length) parts.push(`${periodWorkouts.length} séance${periodWorkouts.length > 1 ? 's' : ''}`);
    if (totalVolume > 0) parts.push(`${totalVolume >= 1000 ? (totalVolume / 1000).toFixed(1) + ' t' : Math.round(totalVolume) + ' kg'} de volume`);
    if (uniquePeriodRecords) parts.push(`${uniquePeriodRecords} exercice${uniquePeriodRecords > 1 ? 's' : ''} avec record`);
    return {
      title: 'Ta progression prend forme.',
      body: `${parts.join(' · ')} sur la période sélectionnée.${weightDelta != null ? ` Poids : ${Number(weightDelta) > 0 ? '+' : ''}${weightDelta} kg.` : ''}`,
    };
  })();

  type MainTab = 'timeline' | 'body' | 'training' | 'nutrition' | 'prs' | 'exercices';

  const TABS: [MainTab, string][] = [
    ['timeline', "Vue d'ensemble"],
    ['body', 'Corps'],
    ['training', 'Training'],
    ['nutrition', 'Nutrition'],
    ['prs', 'Records'],
    ['exercices', 'Exercices'],
  ];

  return (
    <div style={{ minHeight: '100vh', background: BG, color: BLACK, paddingBottom: 110 }}>
      {/* HEADER — DA PROGRÈS NOX */}
      <div style={{ padding: '24px 20px 0', maxWidth: 560, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 38, lineHeight: 1, fontWeight: 950, letterSpacing: '-.055em', color: BLACK }}>
              Progrès
            </h1>
            <div style={{ marginTop: 6, fontSize: 13, color: MUTED, lineHeight: 1.35 }}>
              Suis ce qui change réellement avec le temps.
            </div>
          </div>

          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            aria-label="Période"
            style={{
              height: 44,
              padding: '0 14px',
              borderRadius: 18,
              border: `1px solid ${BORDER}`,
              background: WHITE,
              color: BLACK,
              fontSize: 12,
              fontWeight: 800,
              outline: 'none',
            }}
          >
            <option>30 jours</option>
            <option>3 mois</option>
            <option>6 mois</option>
            <option>Tout</option>
          </select>
        </div>

        {/* INTERPRÉTATION / DÉMARRAGE */}
        <div style={{
          background: 'linear-gradient(135deg, #F0FFD0 0%, #FBFFE9 100%)',
          border: '1px solid #E1F5A5',
          borderRadius: 24,
          padding: '18px 18px 16px',
          marginBottom: 16,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr', gap: 13, alignItems: 'start' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 15, background: ACCENT,
              display: 'grid', placeItems: 'center', fontSize: 23, fontWeight: 950,
            }}>
              ↗
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 950, letterSpacing: '-.025em', marginBottom: 5 }}>
{progressInsight.title}
              </div>
              <div style={{ fontSize: 12, color: '#59604F', lineHeight: 1.5 }}>
{progressInsight.body}
              </div>
            </div>
          </div>

          {totalWorkouts === 0 ? (
            <button
              onClick={() => navigate('/training-calendar')}
              style={{
                width: '100%', height: 50, marginTop: 16, border: 0, borderRadius: 17,
                background: BLACK, color: WHITE, fontSize: 12, fontWeight: 950,
                cursor: 'pointer', letterSpacing: '.01em',
              }}
            >
              DÉMARRER UNE SÉANCE →
            </button>
          ) : (
            <button
              onClick={generateMonthlyReport}
              disabled={reportLoading}
              style={{
                width: '100%', height: 50, marginTop: 16, border: 0, borderRadius: 17,
                background: BLACK, color: WHITE, fontSize: 12, fontWeight: 950,
                cursor: 'pointer',
              }}
            >
              {reportLoading ? 'ANALYSE EN COURS…' : 'VOIR MON RAPPORT NOX →'}
            </button>
          )}
        </div>

        {report && (
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '16px 18px', marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: MUTED, fontWeight: 900, letterSpacing: '.1em', marginBottom: 8 }}>RAPPORT NOX</div>
            <div style={{ fontSize: 13, color: BLACK, lineHeight: 1.55 }}>{report}</div>
            <button onClick={() => setReport(null)} style={{ marginTop: 10, background: 'none', border: 0, padding: 0, color: MUTED, cursor: 'pointer', fontSize: 11 }}>
              Fermer
            </button>
          </div>
        )}

        {/* 4 CARTES DE SYNTHÈSE */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          {[
            { icon: '🏋', label: 'Séances', value: totalWorkouts, help: "Nombre d'entraînements enregistrés." },
            { icon: '●', label: 'Poids', value: currentWeight != null ? `${currentWeight} kg` : '—', help: 'Évolution de ton poids dans le temps.' },
            { icon: '▥', label: "Volume d'entraînement", value: totalVolume > 1000 ? `${(totalVolume / 1000).toFixed(1)} t` : `${Math.round(totalVolume)} kg`, help: 'Charge totale soulevée.' },
            { icon: '🏆', label: 'Records personnels', value: uniquePeriodRecords, help: 'Exercices avec un record sur la période.' },
          ].map(item => (
            <div key={item.label} style={{
              minHeight: 126,
              background: WHITE,
              border: `1px solid ${BORDER}`,
              borderRadius: 22,
              padding: '16px 16px 15px',
              boxSizing: 'border-box',
              boxShadow: '0 8px 26px rgba(20,25,15,.025)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 11, background: '#F2F3EF', display: 'grid', placeItems: 'center', fontSize: 15 }}>
                  {item.icon}
                </div>
                <div style={{ fontSize: 12, fontWeight: 850 }}>{item.label}</div>
              </div>
              <div style={{ fontSize: 27, fontWeight: 950, letterSpacing: '-.045em', lineHeight: 1 }}>{item.value}</div>
              <div style={{ fontSize: 10, color: MUTED, lineHeight: 1.35, marginTop: 8 }}>{item.help}</div>
            </div>
          ))}
        </div>

        {/* ONGLETS */}
        <div style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          paddingBottom: 4,
          scrollbarWidth: 'none',
        }}>
          {TABS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                flexShrink: 0,
                height: 40,
                padding: '0 15px',
                border: 0,
                borderRadius: 18,
                background: tab === id ? BLACK : '#ECEEE8',
                color: tab === id ? WHITE : '#555B52',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 20px 0', maxWidth: 560, margin: '0 auto' }}>

        {/* ── TIMELINE ── */}
        {tab === 'timeline' && (
          <div>
            {periodEvents.length === 0 ? (
              <div>
                <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 24, padding: 18, marginBottom: 12 }}>
                  <div style={{ fontSize: 18, fontWeight: 950, letterSpacing: '-.035em', marginBottom: 6 }}>Évolution sur {period === 'Tout' ? 'toute la période' : period}</div>
                  <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
                    Tes courbes apparaîtront ici dès que NOX aura suffisamment de données sur tes séances, ton poids ou ta nutrition.
                  </div>
                  <div style={{
                    marginTop: 14,
                    padding: '13px 14px',
                    borderRadius: 15,
                    background: '#F6F7F3',
                    color: MUTED,
                    fontSize: 11,
                    fontWeight: 750,
                    textAlign: 'center',
                  }}>
                    Pas encore assez de données pour tracer une tendance.
                  </div>
                </div>
                <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 22, padding: 17 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 13, background: '#F2F3EF', display: 'grid', placeItems: 'center', flexShrink: 0 }}>💡</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 4 }}>Astuces NOX</div>
                      <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.5 }}>
                        Plus tu enregistres de données, plus NOX peut identifier des tendances utiles.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 19, top: 0, bottom: 0, width: 1, background: BORDER }} />
                {periodEvents.map((e, i) => (
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
              {weightLogs.length > 1 ? (() => {
                const weights = weightLogs.map((l: any) => Number(l.weight)).filter((v: number) => Number.isFinite(v));
                const minW = Math.min(...weights);
                const maxW = Math.max(...weights);
                const spread = Math.max(maxW - minW, 1);
                const pad = Math.max(spread * 0.2, 1);
                const chartMin = minW - pad;
                const chartMax = maxW + pad;

                const W = 360;
                const H = 150;
                const left = 18;
                const right = 18;
                const top = 28;
                const bottom = 30;
                const plotW = W - left - right;
                const plotH = H - top - bottom;

                const pointAt = (log: any, i: number) => ({
                  x: left + (i / Math.max(weightLogs.length - 1, 1)) * plotW,
                  y: top + (1 - ((Number(log.weight) - chartMin) / (chartMax - chartMin))) * plotH,
                });

                const points = weightLogs.map((log: any, i: number) => {
                  const p = pointAt(log, i);
                  return `${p.x},${p.y}`;
                }).join(' ');

                const selectedIndex = activeWeightIndex != null && activeWeightIndex < weightLogs.length
                  ? activeWeightIndex
                  : weightLogs.length - 1;
                const selected = weightLogs[selectedIndex];
                const selectedPoint = pointAt(selected, selectedIndex);

                const selectNearest = (clientX: number, svg: SVGSVGElement) => {
                  const rect = svg.getBoundingClientRect();
                  if (!rect.width) return;
                  const localX = ((clientX - rect.left) / rect.width) * W;
                  const ratio = Math.max(0, Math.min(1, (localX - left) / plotW));
                  const index = Math.round(ratio * (weightLogs.length - 1));
                  setActiveWeightIndex(index);
                };

                return (
                  <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 20, padding: '14px 14px 12px', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                      <div>
                        <span style={{ fontSize: 22, fontWeight: 950, color: '#090909' }}>{Number(selected.weight)}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#8B8F86', marginLeft: 4 }}>kg</span>
                      </div>
                      <div style={{ fontSize: 10.5, fontWeight: 800, color: '#8B8F86' }}>
                        {new Date(selected.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>

                    <svg
                      width="100%"
                      viewBox={`0 0 ${W} ${H}`}
                      style={{ display: 'block', touchAction: 'pan-y', userSelect: 'none', cursor: 'crosshair' }}
                      onPointerDown={e => {
                        e.currentTarget.setPointerCapture?.(e.pointerId);
                        selectNearest(e.clientX, e.currentTarget);
                      }}
                      onPointerMove={e => {
                        if (e.buttons === 1 || e.pointerType === 'touch') {
                          selectNearest(e.clientX, e.currentTarget);
                        }
                      }}
                    >
                      {[0.25, 0.5, 0.75].map((ratio, i) => {
                        const y = top + ratio * plotH;
                        return (
                          <line
                            key={`grid-${i}`}
                            x1={left}
                            y1={y}
                            x2={W - right}
                            y2={y}
                            stroke="#E4E6DF"
                            strokeWidth="1"
                            strokeDasharray="4 6"
                          />
                        );
                      })}

                      <polyline
                        points={points}
                        fill="none"
                        stroke={ACCENT}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      <line
                        x1={selectedPoint.x}
                        y1={top}
                        x2={selectedPoint.x}
                        y2={H - bottom}
                        stroke="#B8BBB2"
                        strokeWidth="1"
                        strokeDasharray="3 5"
                      />

                      {weightLogs.map((log: any, i: number) => {
                        const p = pointAt(log, i);
                        const active = i === selectedIndex;
                        return (
                          <g key={log.id || i}>
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={active ? 6 : 4}
                              fill={ACCENT}
                              stroke={active ? '#090909' : ACCENT}
                              strokeWidth={active ? 2 : 0}
                            />
                          </g>
                        );
                      })}

                      <text x={left} y={H - 7} textAnchor="start" fill="#8B8F86" fontSize="9.5" fontWeight="700">
                        {new Date(weightLogs[0].created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </text>
                      <text x={W - right} y={H - 7} textAnchor="end" fill="#8B8F86" fontSize="9.5" fontWeight="700">
                        {new Date(weightLogs[weightLogs.length - 1].created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </text>
                    </svg>

                    <div style={{ textAlign: 'center', fontSize: 10, color: '#A0A39B', marginTop: 2 }}>
                      Glisse ton doigt sur la courbe pour parcourir tes pesées
                    </div>
                  </div>
                );
              })() : (
                <div style={{ textAlign: 'center', color: '#8B8F86', padding: '20px 0', fontSize: 13 }}>
                  {weightLogs.length === 1
                    ? 'Ajoute une deuxième pesée pour créer une courbe sur cette période.'
                    : "Enregistre ton poids dans Body pour voir l'évolution."}
                  <br />
                  <button onClick={() => navigate('/body')} style={{ marginTop: 12, padding: '8px 16px', background: ACCENT + '22', border: '1px solid ' + ACCENT + '44', borderRadius: 16, color: ACCENT, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Aller dans Body
                  </button>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#8B8F86', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>ÉVOLUTION DU POIDS</div>
              {weightLogs.length > 1 ? (
                <>
                  {/* Mini graphique SVG */}
                  <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 20, padding: 16, marginBottom: 12 }}>
                    <svg width="100%" height="80" viewBox={`0 0 ${weightLogs.length * 30} 80`} preserveAspectRatio="none">
                      {weightLogs.map((log, i) => {
                        const weights = weightLogs.map(l => l.weight).filter(Boolean);
                        const minW = Math.min(...weights);
                        const maxW = Math.max(...weights);
                        const range = maxW - minW || 1;
                        const x = i * 30 + 15;
                        const y = 70 - ((log.weight - minW) / range) * 60;
                        return i > 0 ? (
                          <line key={i}
                            x1={(i-1)*30+15} y1={70-((weightLogs[i-1].weight-minW)/range)*60}
                            x2={x} y2={y}
                            stroke={ACCENT} strokeWidth="2" />
                        ) : null;
                      })}
                      {weightLogs.map((log, i) => {
                        const weights = weightLogs.map(l => l.weight).filter(Boolean);
                        const minW = Math.min(...weights);
                        const maxW = Math.max(...weights);
                        const range = maxW - minW || 1;
                        const x = i * 30 + 15;
                        const y = 70 - ((log.weight - minW) / range) * 60;
                        return <circle key={i} cx={x} cy={y} r="3" fill={ACCENT} />;
                      })}
                    </svg>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: '#8B8F86' }}>{new Date(weightLogs[0].created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                      <span style={{ fontSize: 12, fontWeight: 900, color: ACCENT }}>
                        {weightDelta && (parseFloat(weightDelta) > 0 ? '+' : '')}{weightDelta}kg
                      </span>
                      <span style={{ fontSize: 10, color: '#8B8F86' }}>Aujourd'hui</span>
                    </div>
                  </div>

                </>
              ) : (
                <div style={{ textAlign: 'center', color: '#8B8F86', padding: '20px 0', fontSize: 13 }}>
                  {weightLogs.length === 1
                    ? 'Ajoute une deuxième pesée pour créer une courbe sur cette période.'
                    : "Enregistre ton poids dans Body pour voir l'évolution."}
                  <br />
                  <button onClick={() => navigate('/body')} style={{ marginTop: 12, padding: '8px 16px', background: ACCENT + '22', border: '1px solid ' + ACCENT + '44', borderRadius: 16, color: ACCENT, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Aller dans Body
                  </button>
                </div>
              )}
            </div>

            {photos.length >= 2 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: MUTED, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>
                  COMPARATEUR AVANT / APRÈS
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[['AVANT', compareA, setCompareA], ['APRÈS', compareB, setCompareB]].map(([label, value, setter]: any) => (
                    <div key={label}>
                      <div style={{ fontSize: 10, color: MUTED, marginBottom: 4 }}>{label}</div>
                      <select
                        value={value?.id || ''}
                        onChange={e => setter(photos.find((p: any) => p.id === e.target.value))}
                        style={{ width: '100%', padding: 8, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, color: BLACK, fontSize: 12, marginBottom: 6 }}
                      >
                        <option value="">Choisir...</option>
                        {photos.map((p: any) => <option key={p.id} value={p.id}>{new Date(p.taken_at || p.created_at).toLocaleDateString('fr-FR')}</option>)}
                      </select>
                      {value?.photo_url && <img src={value.display_url || value.photo_url} style={{ width: '100%', borderRadius: 16, objectFit: 'cover', aspectRatio: '3/4' }} alt={label} />}
                    </div>
                  ))}
                </div>

                {compareA && compareB && (() => {
                  const rawA = new Date(compareA.taken_at || compareA.created_at);
                  const rawB = new Date(compareB.taken_at || compareB.created_at);
                  const from = rawA <= rawB ? rawA : rawB;
                  const to = rawA <= rawB ? rawB : rawA;
                  const startMs = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
                  const endMs = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999).getTime();
                  const days = Math.max(0, Math.round((endMs - startMs) / 86400000));
                  const between = (value?: string | null) => {
                    if (!value) return false;
                    const t = new Date(value).getTime();
                    return t >= startMs && t <= endMs;
                  };

                  const compareWorkouts = workouts.filter((w: any) => between(w.created_at));
                  const compareVolume = compareWorkouts.reduce((sum: number, w: any) => sum + (Number(w.total_volume) || 0), 0);
                  const compareWeights = bodyLogs
                    .filter((b: any) => b.weight != null && between(b.created_at))
                    .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                  const compareMeasures = measureLogs
                    .filter((m: any) => between(m.created_at))
                    .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

                  const weightChange = compareWeights.length >= 2
                    ? Number(compareWeights[compareWeights.length - 1].weight) - Number(compareWeights[0].weight)
                    : null;

                  const measureNames: Record<string, string> = {
                    chest_cm: 'poitrine', waist_cm: 'taille', hips_cm: 'hanches', arms_cm: 'bras', thighs_cm: 'cuisses',
                  };
                  const measureChanges: string[] = [];
                  if (compareMeasures.length >= 2) {
                    const first = compareMeasures[0];
                    const last = compareMeasures[compareMeasures.length - 1];
                    Object.entries(measureNames).forEach(([key, label]) => {
                      if (first[key] == null || last[key] == null) return;
                      const delta = Number(last[key]) - Number(first[key]);
                      if (!Number.isFinite(delta) || Math.abs(delta) < 0.05) return;
                      measureChanges.push(`${label} ${delta > 0 ? '+' : ''}${delta.toFixed(1)} cm`);
                    });
                  }

                  const hasContext = compareWorkouts.length > 0 || weightChange != null || measureChanges.length > 0;
                  const facts: string[] = [];
                  if (weightChange != null) facts.push(`poids ${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} kg`);
                  if (measureChanges.length) facts.push(measureChanges.slice(0, 2).join(' · '));
                  if (compareWorkouts.length) facts.push(`${compareWorkouts.length} séance${compareWorkouts.length > 1 ? 's' : ''}`);
                  if (compareVolume > 0) facts.push(`${compareVolume >= 1000 ? (compareVolume / 1000).toFixed(1) + ' t' : Math.round(compareVolume) + ' kg'} de volume`);

                  return (
                    <div style={{ marginTop: 12, background: '#F0FFD0', border: '1px solid #E1F5A5', borderRadius: 18, padding: '14px 15px' }}>
                      <div style={{ fontSize: 10, fontWeight: 950, letterSpacing: '.09em', marginBottom: 6 }}>INTERPRÉTATION NOX</div>
                      <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 5 }}>
                        {days === 0 ? 'Deux repères le même jour.' : `${days} jour${days > 1 ? 's' : ''} entre tes deux repères.`}
                      </div>
                      <div style={{ fontSize: 11, color: '#59604F', lineHeight: 1.55 }}>
                        {hasContext
                          ? `Sur cette période : ${facts.join(' · ')}. Les photos servent de repère visuel ; NOX s'appuie sur tes données enregistrées pour contextualiser l'évolution.`
                          : `Tes deux photos sont bien enregistrées, mais NOX n'a pas encore assez de données entre ces dates pour interpréter l'évolution. Ajoute ton poids, tes mensurations ou tes séances pour obtenir un contexte fiable.`}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── MENSURATIONS ── */}
            {measureLogs.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#8B8F86', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>MENSURATIONS</div>
                {(() => {
                  const latest = measureLogs[measureLogs.length - 1];
                  const first = measureLogs[0];
                  const metrics = [
                    { key: 'chest_cm', label: 'Poitrine' },
                    { key: 'waist_cm', label: 'Taille' },
                    { key: 'hips_cm', label: 'Hanches' },
                    { key: 'arms_cm', label: 'Bras' },
                    { key: 'thighs_cm', label: 'Cuisses' },
                  ];
                  return (
                    <div style={{ background: '#fff', border: '1px solid #E8EAE2', borderRadius: 20, overflow: 'hidden' }}>
                      {metrics.filter(m => latest[m.key]).map((m, i) => {
                        const val = latest[m.key];
                        const initVal = first[m.key];
                        const delta = initVal ? (val - initVal).toFixed(1) : null;
                        const isPositive = delta && parseFloat(delta) > 0;
                        return (
                          <div key={m.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: i < metrics.length - 1 ? '1px solid #E8EAE2' : 'none' }}>
                            <div style={{ fontSize: 14, color: '#090909', fontWeight: 600 }}>{m.label}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {delta && (
                                <span style={{ fontSize: 11, color: isPositive ? '#ff6666' : '#44cc88', fontWeight: 700 }}>
                                  {isPositive ? '+' : ''}{delta} cm
                                </span>
                              )}
                              <span style={{ fontSize: 16, fontWeight: 900, color: '#090909' }}>{val} <span style={{ fontSize: 11, color: '#8B8F86' }}>cm</span></span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
                <button onClick={() => navigate('/body')} style={{ width: '100%', marginTop: 10, padding: '12px', background: '#F8F9F5', border: '1px solid #E8EAE2', borderRadius: 14, color: '#090909', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  Mettre a jour les mensurations
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── TRAINING ── */}
        {tab === 'training' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Séances totales', value: totalWorkouts, unit: '' },
                { label: 'Cette semaine', value: weekWorkouts, unit: '' },
                { label: 'Volume total', value: totalVolume >= 1000 ? (totalVolume / 1000).toFixed(1) : Math.round(totalVolume), unit: totalVolume >= 1000 ? 't' : 'kg' },
                { label: 'Durée moy.', value: periodWorkouts.length > 0 ? (Math.round(periodWorkouts.reduce((s: number, w: any) => s + (Number(w.duration_minutes) || Number(w.duration_min) || 45), 0) / periodWorkouts.length) || '—') : '—', unit: periodWorkouts.length > 0 ? 'min' : '' },
              ].map(({ label, value, unit }) => (
                <div key={label} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 20, padding: 16 }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: ACCENT }}>{value}<span style={{ fontSize: 12, color: '#8B8F86' }}> {unit}</span></div>
                  <div style={{ fontSize: 11, color: '#8B8F86', fontWeight: 700, marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* État vide */}
            {periodWorkouts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 0', color: MUTED, fontSize: 13 }}>
                Aucune séance sur cette période.
              </div>
            )}
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

        {/* ── EXERCICES + GHOST MODE ── */}
        {tab === 'exercices' && (
          <div>
            {/* Sélecteur exercice */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#8B8F86', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>CHOISIR UN EXERCICE</div>
              <select
                value={selectedExercise}
                onChange={e => {
                  setSelectedExercise(e.target.value);
                  loadExerciseHistory(e.target.value);
                  loadGhostSession(e.target.value);
                }}
                style={{ width: '100%', padding: '14px 16px', background: '#fff', border: '1px solid #E8EAE2', borderRadius: 14, color: '#090909', fontSize: 15, fontWeight: 700, outline: 'none' }}
              >
                <option value="">Sélectionner...</option>
                {[...new Set(prs.map((p: any) => p.exercise_name))].sort().map((name: any) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            {selectedExercise && exerciseHistory.length > 0 && (
              <>
                {/* Courbe de progression */}
                <div style={{ background: '#fff', border: '1px solid #E8EAE2', borderRadius: 20, padding: 16, marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#090909', marginBottom: 4 }}>{selectedExercise}</div>
                  <div style={{ fontSize: 11, color: '#8B8F86', marginBottom: 12 }}>Progression du poids max</div>
                  <svg width="100%" height="100" viewBox={`0 0 ${Math.max(exerciseHistory.length * 40, 280)} 100`} preserveAspectRatio="none">
                    {(() => {
                      const weights = exerciseHistory.map(e => e.weight).filter(Boolean);
                      const minW = Math.min(...weights);
                      const maxW = Math.max(...weights);
                      const range = maxW - minW || 1;
                      return exerciseHistory.map((e, i) => {
                        const x = i * 40 + 20;
                        const y = 85 - ((e.weight - minW) / range) * 70;
                        return (
                          <g key={i}>
                            {i > 0 && (
                              <line
                                x1={(i-1)*40+20} y1={85 - ((exerciseHistory[i-1].weight - minW) / range) * 70}
                                x2={x} y2={y}
                                stroke={ACCENT} strokeWidth="2.5" />
                            )}
                            <circle cx={x} cy={y} r="5" fill={ACCENT} />
                            <text x={x} y={y - 10} textAnchor="middle" fontSize="9" fill="#8B8F86">{e.weight}kg</text>
                          </g>
                        );
                      });
                    })()}
                  </svg>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: '#8B8F86' }}>{new Date(exerciseHistory[0].created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: ACCENT }}>
                      {(() => { const delta = Number(exerciseHistory[exerciseHistory.length - 1].weight) - Number(exerciseHistory[0].weight); return `${delta > 0 ? '+' : ''}${delta.toFixed(1)}kg`; })()}
                    </span>
                    <span style={{ fontSize: 10, color: '#8B8F86' }}>Aujourd'hui</span>
                  </div>
                </div>

                {/* GHOST MODE */}
                <div style={{ background: ghostMode ? '#090909' : '#F8F9F5', border: '1px solid ' + (ghostMode ? ACCENT + '44' : '#E8EAE2'), borderRadius: 20, padding: 18, marginBottom: 14, transition: 'all .2s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: ghostMode ? 14 : 0 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: ghostMode ? '#fff' : '#090909' }}>GHOST MODE</div>
                      <div style={{ fontSize: 11, color: '#8B8F86', marginTop: 2 }}>Compare-toi à un ancien repère (≥ 4 semaines)</div>
                    </div>
                    <button onClick={() => setGhostMode(g => !g)}
                      style={{ padding: '8px 16px', background: ghostMode ? ACCENT : '#090909', border: 'none', borderRadius: 20, color: ghostMode ? '#000' : '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer', touchAction: 'manipulation' }}>
                      {ghostMode ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {ghostMode && ghostSession && (
                    <div>
                      <div style={{ fontSize: 11, color: '#8B8F86', marginBottom: 10 }}>
                        Repère du {new Date(ghostSession.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div style={{ background: '#1a1a1a', borderRadius: 14, padding: '14px 16px', textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: '#8B8F86', marginBottom: 4 }}>TON FANTOME</div>
                          <div style={{ fontSize: 28, fontWeight: 950, color: '#555' }}>{ghostSession.weight}kg</div>
                          <div style={{ fontSize: 11, color: '#555' }}>× {ghostSession.reps} reps</div>
                        </div>
                        <div style={{ background: ACCENT + '11', border: '1px solid ' + ACCENT + '33', borderRadius: 14, padding: '14px 16px', textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: ACCENT, marginBottom: 4 }}>TOI AUJOURD'HUI</div>
                          <div style={{ fontSize: 28, fontWeight: 950, color: '#fff' }}>
                            {exerciseHistory[exerciseHistory.length - 1]?.weight}kg
                          </div>
                          <div style={{ fontSize: 11, color: '#8B8F86' }}>× {exerciseHistory[exerciseHistory.length - 1]?.reps} reps</div>
                        </div>
                      </div>
                      {(() => {
                        const current = exerciseHistory[exerciseHistory.length - 1]?.weight || 0;
                        const ghost = ghostSession.weight || 0;
                        const diff = (current - ghost).toFixed(1);
                        const won = current > ghost;
                        return (
                          <div style={{ marginTop: 12, padding: '10px 14px', background: won ? ACCENT + '22' : '#ff444422', borderRadius: 12, textAlign: 'center' }}>
                            <div style={{ fontSize: 14, fontWeight: 900, color: won ? ACCENT : '#ff6666' }}>
                              {won ? `+${diff}kg — Tu bats ton fantome !` : diff === '0.0' ? 'Egalite — Depasse-toi !' : `${diff}kg — Ton fantome te devance`}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {ghostMode && !ghostSession && (
                    <div style={{ marginTop: 12, fontSize: 12, color: '#8B8F86', textAlign: 'center' }}>
                      Pas de record assez ancien (4 semaines ou plus) pour cet exercice.
                    </div>
                  )}
                </div>

                {/* Historique détaillé */}
                <div style={{ fontSize: 11, color: '#8B8F86', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>HISTORIQUE</div>
                <div style={{ background: '#fff', border: '1px solid #E8EAE2', borderRadius: 20, overflow: 'hidden' }}>
                  {[...exerciseHistory].reverse().slice(0, 10).map((e: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: i < exerciseHistory.length - 1 ? '1px solid #E8EAE2' : 'none' }}>
                      <div style={{ fontSize: 12, color: '#8B8F86' }}>
                        {new Date(e.created_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: i === 0 ? ACCENT : '#090909' }}>
                        {e.weight}kg <span style={{ fontSize: 11, color: '#8B8F86', fontWeight: 400 }}>× {e.reps}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {selectedExercise && exerciseHistory.length === 0 && (
              <div style={{ textAlign: 'center', color: '#8B8F86', padding: '30px 0', fontSize: 13 }}>
                Pas encore de records pour cet exercice.
              </div>
            )}
            {!selectedExercise && (
              <div style={{ textAlign: 'center', color: '#8B8F86', padding: '30px 0', fontSize: 13 }}>
                Choisis un exercice pour voir sa progression.
              </div>
            )}
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
