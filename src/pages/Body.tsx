import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';
import TutorialTooltip from '../components/TutorialTooltip';

const ACCENT = '#B7FF00';
const BG = '#F6F7F2';
const SURFACE = '#FFFFFF';
const BORDER = '#E8EAE2';

type Tab = 'progress' | 'activity' | 'photos';
type ActivityMode = 'manual' | 'scan' | 'confirm';

type ActivityForm = {
  activity_type: string;
  duration_minutes: string;
  calories_burned: string;
  distance_km: string;
  notes: string;
};

const EMPTY_ACTIVITY: ActivityForm = {
  activity_type: '',
  duration_minutes: '',
  calories_burned: '',
  distance_km: '',
  notes: '',
};

function parseOptionalNumber(value: string): number | null {
  const raw = String(value || '').trim().replace(',', '.');
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseJsonObject(raw: string): any | null {
  const cleaned = String(raw || '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]); } catch { return null; }
  }
}

export default function Body() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('progress');
  const [logs, setLogs] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ weight: '', chest_cm: '', waist_cm: '', hips_cm: '', arms_cm: '', thighs_cm: '', notes: '' });
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
const [bodyPhotos, setBodyPhotos] = useState<any[]>([]);
const [photoUploading, setPhotoUploading] = useState(false);
const photoInputRef = useRef<HTMLInputElement>(null);

  const [showActivity, setShowActivity] = useState(false);
  const [activityMode, setActivityMode] = useState<ActivityMode>('manual');
  const [activityForm, setActivityForm] = useState<ActivityForm>(EMPTY_ACTIVITY);
  const [activitySource, setActivitySource] = useState<'manual' | 'scan'>('manual');
  const [activityError, setActivityError] = useState('');
  const [activitySuccess, setActivitySuccess] = useState(false);
  const [activitySaving, setActivitySaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (user) void load(); }, [user]);

  useEffect(() => {
    const add = searchParams.get('add');
    if (!add) return;

    if (add === 'weight' || add === 'measurements') {
      setTab('progress');
      setSaveError('');
      setSaveSuccess(false);
      setShowAdd(true);
    } else if (add === 'activity') {
      setTab('activity');
      openManualActivity();
    }

    const next = new URLSearchParams(searchParams);
    next.delete('add');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);


  const load = async () => {
    if (!user) return;
    setLoading(true);

    const [bodyResult, activityResult] = await Promise.all([
      supabase.from('body_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('activity_logs').select('*').eq('user_id', user.id).order('performed_at', { ascending: false }).limit(50),
    ]);

    if (bodyResult.error) {
      console.error('BODY_LOAD_ERROR', bodyResult.error);
      setSaveError(bodyResult.error.message);
    } else {
      setLogs(bodyResult.data || []);
    }

    if (activityResult.error) {
      console.error('ACTIVITY_LOAD_ERROR', activityResult.error);
      setActivityError(
        activityResult.error.message.includes('activity_logs')
          ? "Le suivi d'activité n'est pas encore initialisé dans Supabase."
          : activityResult.error.message,
      );
    } else {
      setActivities(activityResult.data || []);
    }

    setLoading(false);
  };

  const save = async () => {
    if (!user || saving) return;
    setSaveError('');
    setSaveSuccess(false);

    const keys = ['weight', 'chest_cm', 'waist_cm', 'hips_cm', 'arms_cm', 'thighs_cm'] as const;
    if (!keys.some(key => form[key].trim() !== '')) {
      setSaveError('Ajoute au moins ton poids ou une mesure.');
      return;
    }

    const parsed: Record<string, number | null> = {};
    for (const key of keys) {
      const raw = form[key].trim().replace(',', '.');
      if (!raw) { parsed[key] = null; continue; }
      const value = Number(raw);
      if (!Number.isFinite(value) || value <= 0) {
        setSaveError('Vérifie les valeurs saisies : elles doivent être supérieures à 0.');
        return;
      }
      parsed[key] = value;
    }

    try {
      setSaving(true);
      const { error } = await supabase.from('body_logs').insert({
        user_id: user.id,
        weight: parsed.weight,
        chest_cm: parsed.chest_cm,
        waist_cm: parsed.waist_cm,
        hips_cm: parsed.hips_cm,
        arms_cm: parsed.arms_cm,
        thighs_cm: parsed.thighs_cm,
        notes: form.notes.trim() || null,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;

      await load();
      setSaveSuccess(true);
      setForm({ weight: '', chest_cm: '', waist_cm: '', hips_cm: '', arms_cm: '', thighs_cm: '', notes: '' });
      window.setTimeout(() => {
        setShowAdd(false);
        setSaveSuccess(false);
      }, 650);
    } catch (error: any) {
      console.error('BODY_CHECKIN_SAVE_ERROR', error);
      setSaveError(error?.message || "Impossible d'enregistrer le check-in. Réessaie.");
    } finally {
      setSaving(false);
    }
  };

  const openManualActivity = () => {
    setActivityForm(EMPTY_ACTIVITY);
    setActivitySource('manual');
    setActivityMode('manual');
    setActivityError('');
    setActivitySuccess(false);
    setScanPreview(null);
    setShowActivity(true);
  };

  const openScanActivity = () => {
    setActivityForm(EMPTY_ACTIVITY);
    setActivitySource('scan');
    setActivityMode('scan');
    setActivityError('');
    setActivitySuccess(false);
    setScanPreview(null);
    setShowActivity(true);
  };

  const scanMachine = async (file: File) => {
    if (!user || scanning) return;
    setActivityError('');
    setScanning(true);

    try {
      if (!file.type.startsWith('image/')) throw new Error('Sélectionne une photo de l’écran de la machine.');
      if (file.size > 8 * 1024 * 1024) throw new Error('La photo est trop lourde. Maximum 8 Mo.');

      const preview = URL.createObjectURL(file);
      setScanPreview(previous => {
        if (previous?.startsWith('blob:')) URL.revokeObjectURL(previous);
        return preview;
      });

      const reader = new FileReader();
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Impossible de lire la photo.'));
        reader.readAsDataURL(file);
      });

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Session expirée. Reconnecte-toi puis réessaie.');

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-activity`;
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ image: imageBase64 }),
      });

      const raw = await response.text();
      let payload: any = null;
      try { payload = JSON.parse(raw); } catch { payload = null; }

      if (!response.ok) {
        throw new Error(payload?.error || `Analyse impossible (${response.status}).`);
      }

      const extracted = payload?.activity || parseJsonObject(payload?.text || payload?.content || raw);
      if (!extracted || typeof extracted !== 'object') {
        throw new Error("NOX n'a pas pu lire les données de la machine. Tu peux les saisir manuellement.");
      }

      setActivityForm({
        activity_type: String(extracted.activity_type || extracted.type || ''),
        duration_minutes: extracted.duration_minutes != null ? String(extracted.duration_minutes) : '',
        calories_burned: extracted.calories_burned != null ? String(extracted.calories_burned) : '',
        distance_km: extracted.distance_km != null ? String(extracted.distance_km) : '',
        notes: String(extracted.notes || ''),
      });
      setActivitySource('scan');
      setActivityMode('confirm');
    } catch (error: any) {
      console.error('ACTIVITY_SCAN_ERROR', error);
      setActivityError(error?.message || "Impossible d'analyser la machine.");
    } finally {
      setScanning(false);
      if (scanInputRef.current) scanInputRef.current.value = '';
    }
  };

  const validateActivity = () => {
    setActivityError('');
    const duration = parseOptionalNumber(activityForm.duration_minutes);
    const calories = parseOptionalNumber(activityForm.calories_burned);
    const distance = parseOptionalNumber(activityForm.distance_km);

    if (!activityForm.activity_type.trim()) {
      setActivityError("Indique le type d'activité.");
      return false;
    }
    if (duration === null || duration <= 0 || duration > 1440) {
      setActivityError('Entre une durée valide entre 1 et 1440 minutes.');
      return false;
    }
    if (calories !== null && (calories < 0 || calories > 10000)) {
      setActivityError('Vérifie les calories affichées.');
      return false;
    }
    if (distance !== null && (distance < 0 || distance > 1000)) {
      setActivityError('Vérifie la distance affichée.');
      return false;
    }
    return true;
  };

  const saveActivity = async () => {
    if (!user || activitySaving || !validateActivity()) return;

    const duration = parseOptionalNumber(activityForm.duration_minutes)!;
    const calories = parseOptionalNumber(activityForm.calories_burned);
    const distance = parseOptionalNumber(activityForm.distance_km);

    try {
      setActivitySaving(true);
      setActivityError('');

      const { error } = await supabase.from('activity_logs').insert({
        user_id: user.id,
        activity_type: activityForm.activity_type.trim(),
        duration_minutes: Math.round(duration),
        calories_burned: calories === null ? null : Math.round(calories),
        distance_km: distance,
        source: activitySource,
        notes: activityForm.notes.trim() || null,
        performed_at: new Date().toISOString(),
      });

      if (error) throw error;

      await load();
      setActivitySuccess(true);
      window.setTimeout(() => {
        setShowActivity(false);
        setActivitySuccess(false);
        setActivityForm(EMPTY_ACTIVITY);
        setScanPreview(previous => {
          if (previous?.startsWith('blob:')) URL.revokeObjectURL(previous);
          return null;
        });
      }, 650);
    } catch (error: any) {
      console.error('ACTIVITY_SAVE_ERROR', error);
      setActivityError(error?.message || "Impossible d'enregistrer l'activité.");
    } finally {
      setActivitySaving(false);
    }
  };

  const deleteActivity = async (id: string) => {
    if (!user) return;
    setActivityError('');
    const { error } = await supabase.from('activity_logs').delete().eq('id', id).eq('user_id', user.id);
    if (error) {
      setActivityError(error.message);
      return;
    }
    await load();
  };

  const getRangeData = () => {
    const now = Date.now();
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return logs.filter(l => new Date(l.created_at).getTime() > cutoff).reverse();
  };

  const rangeData = getRangeData();
  const weightLogs = rangeData.filter(l => Number.isFinite(Number(l.weight)) && Number(l.weight) > 0);
  const latest = logs.find(l => Number.isFinite(Number(l.weight)) && Number(l.weight) > 0);
  const oldest = weightLogs[0];
  const delta = latest && oldest && latest.id !== oldest.id
    ? (Number(latest.weight) - Number(oldest.weight)).toFixed(1)
    : null;

  const todayKey = new Date().toLocaleDateString('en-CA');
  const todayActivities = activities.filter(activity =>
    new Date(activity.performed_at).toLocaleDateString('en-CA') === todayKey,
  );
  const todayCalories = todayActivities.reduce((sum, activity) => sum + (Number(activity.calories_burned) || 0), 0);
  const todayMinutes = todayActivities.reduce((sum, activity) => sum + (Number(activity.duration_minutes) || 0), 0);

  const MiniChart = () => {
    if (weightLogs.length < 2) return null;
    const weights = weightLogs.map(l => l.weight);
    const min = Math.min(...weights) - 1;
    const max = Math.max(...weights) + 1;
    const W = 300, H = 80;
    const points = weightLogs.map((l, i) => {
      const x = (i / (weightLogs.length - 1)) * W;
      const y = H - ((l.weight - min) / (max - min)) * H;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 80 }}>
        <polyline points={points} fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {weightLogs.map((l, i) => {
          const x = (i / (weightLogs.length - 1)) * W;
          const y = H - ((l.weight - min) / (max - min)) * H;
          return <circle key={i} cx={x} cy={y} r="3" fill={ACCENT} />;
        })}
      </svg>
    );
  };

  const activityInput = (key: keyof ActivityForm, label: string, unit?: string, placeholder = '') => (
    <label style={{ display: 'block', background: '#F7F8F4', border: `1px solid ${BORDER}`, borderRadius: 14, padding: 12 }}>
      <div style={{ fontSize: 9.5, color: '#777', fontWeight: 850, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 5 }}>
        <input
          value={activityForm[key]}
          onChange={e => setActivityForm(p => ({ ...p, [key]: e.target.value }))}
          placeholder={placeholder}
          type={key === 'activity_type' || key === 'notes' ? 'text' : 'number'}
          inputMode={key === 'activity_type' || key === 'notes' ? undefined : 'decimal'}
          style={{ width: '100%', minWidth: 0, border: 0, outline: 0, background: 'transparent', color: '#090909', fontSize: 16, fontWeight: 850 }}
        />
        {unit && <span style={{ color: '#555', fontSize: 10 }}>{unit}</span>}
      </div>
    </label>
  );

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'grid', placeItems: 'center' }}>
        <div style={{ color: '#090909', fontWeight: 950, letterSpacing: '.1em' }}>NOX <span style={{ color: ACCENT }}>●</span></div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#090909', paddingBottom: 100 }}>
      <main style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
        <header style={{ padding: '24px 20px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 28, lineHeight: 1, fontWeight: 1000, letterSpacing: '-.07em' }}>NOX</div>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: ACCENT }} />
              </div>
              <div style={{ fontSize: 10, color: '#999D95', fontWeight: 850, textTransform: 'uppercase', letterSpacing: '.1em', marginTop: 7 }}>CORPS & ACTIVITÉ</div>
            </div>
            <button onClick={() => setShowAdd(true)} style={{ border: 0, borderRadius: 13, background: ACCENT, color: '#050505', padding: '11px 15px', fontSize: 11, fontWeight: 950, letterSpacing: '.04em', cursor: 'pointer' }}>+ CHECK-IN</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', background: '#EDEEE9', padding: 4, borderRadius: 15, marginTop: 20 }}>
            {([
              ['progress', 'PROGRESSION'],
              ['activity', 'ACTIVITÉ'],
              ['photos', 'PHOTOS'],
            ] as [Tab, string][]).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                border: 0, borderRadius: 11, padding: '10px 3px', cursor: 'pointer',
                background: tab === id ? '#FFFFFF' : 'transparent',
                color: tab === id ? '#090909' : '#777B72', fontSize: 9.5, fontWeight: 900, letterSpacing: '.035em'
              }}>{label}</button>
            ))}
          </div>
        </header>

        <section style={{ padding: 20 }}>
          {tab === 'progress' && (
            <>
              {latest ? (
                <div style={{ background: '#090909', border: `1px solid ${BORDER}`, borderRadius: 22, padding: 20, marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#777', fontWeight: 850, letterSpacing: '.09em' }}>POIDS ACTUEL</div>
                      <div style={{ fontSize: 42, fontWeight: 950, letterSpacing: '-.055em', lineHeight: 1.05, marginTop: 6 }}>
                        {Number(latest.weight)}<span style={{ fontSize: 15, color: '#777', marginLeft: 5 }}>kg</span>
                      </div>
                    </div>
                    {delta !== null && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 9.5, color: '#666', fontWeight: 850, letterSpacing: '.08em' }}>ÉVOLUTION</div>
                        <div style={{ marginTop: 6, fontSize: 20, fontWeight: 950, color: parseFloat(delta) <= 0 ? ACCENT : '#ff785f' }}>
                          {parseFloat(delta) > 0 ? '+' : ''}{delta} kg
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6, margin: '22px 0 15px' }}>
                    {(['7d', '30d', '90d'] as const).map(r => (
                      <button key={r} onClick={() => setRange(r)} style={{
                        flex: 1, borderRadius: 9, padding: '7px 0', cursor: 'pointer',
                        border: `1px solid ${range === r ? 'rgba(200,255,0,.28)' : BORDER}`,
                        background: range === r ? 'rgba(200,255,0,.08)' : '#0c0c0c',
                        color: range === r ? ACCENT : '#666', fontSize: 10.5, fontWeight: 850
                      }}>{r}</button>
                    ))}
                  </div>

                  <div style={{ borderRadius: 15, padding: '12px 10px 4px', background: '#F7F8F4', border: `1px solid ${BORDER}` }}>
                    {weightLogs.length >= 2 ? <MiniChart /> : (
                      <div style={{ height: 80, display: 'grid', placeItems: 'center', color: '#555', fontSize: 11.5 }}>Encore un check-in pour afficher ta courbe</div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ borderRadius: 22, border: `1px solid ${BORDER}`, background: SURFACE, padding: '42px 22px', textAlign: 'center', marginBottom: 14 }}>
                  <div style={{ width: 52, height: 52, margin: '0 auto 16px', borderRadius: 16, background: 'rgba(200,255,0,.08)', border: '1px solid rgba(200,255,0,.16)', display: 'grid', placeItems: 'center', color: ACCENT, fontSize: 22 }}>+</div>
                  <div style={{ fontSize: 18, fontWeight: 950 }}>COMMENCE TON SUIVI</div>
                  <div style={{ color: '#777', fontSize: 12.5, lineHeight: 1.55, margin: '8px auto 18px', maxWidth: 300 }}>Ajoute ton premier check-in pour construire ta courbe de progression.</div>
                  <button onClick={() => setShowAdd(true)} style={{ border: 0, borderRadius: 12, background: ACCENT, color: '#050505', padding: '12px 17px', fontWeight: 950, cursor: 'pointer' }}>AJOUTER MON POIDS</button>
                </div>
              )}

              {logs.filter(l => l.weight).length > 0 && (
                <>
                  <div style={{ fontSize: 10.5, color: '#777', fontWeight: 900, letterSpacing: '.09em', margin: '21px 2px 10px' }}>HISTORIQUE</div>
                  {logs.filter(l => l.weight).slice(0, 10).map(log => (
                    <div key={log.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 15, padding: '14px 15px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 950 }}>{log.weight} <span style={{ fontSize: 11, color: '#666' }}>kg</span></div>
                        <div style={{ fontSize: 10.5, color: '#666', marginTop: 4 }}>{new Date(log.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      </div>
                      {log.notes && <div style={{ fontSize: 11, color: '#777', maxWidth: 150, textAlign: 'right', lineHeight: 1.4 }}>{log.notes}</div>}
                    </div>
                  ))}
                </>
              )}

              <div style={{ fontSize: 10.5, color: '#777', fontWeight: 900, letterSpacing: '.09em', margin: '22px 2px 10px' }}>MENSURATIONS</div>
              {logs.filter(l => l.waist_cm || l.chest_cm).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '55px 20px', borderRadius: 22, background: SURFACE, border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 18, fontWeight: 950 }}>MESURE TON ÉVOLUTION</div>
                  <div style={{ fontSize: 12.5, color: '#777', lineHeight: 1.55, margin: '9px auto 20px', maxWidth: 310 }}>Le poids ne raconte pas tout. Ajoute tes mensurations pour mieux suivre ta transformation.</div>
                  <button onClick={() => setShowAdd(true)} style={{ border: 0, borderRadius: 12, background: ACCENT, color: '#050505', padding: '12px 17px', fontWeight: 950, cursor: 'pointer' }}>AJOUTER DES MESURES</button>
                </div>
              ) : logs.filter(l => l.waist_cm || l.chest_cm).slice(0, 5).map(log => (
                <div key={log.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 16, marginBottom: 11 }}>
                  <div style={{ fontSize: 10.5, color: '#666', fontWeight: 850, marginBottom: 12 }}>{new Date(log.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
                    {[
                      { key: 'chest_cm', label: 'Poitrine' },
                      { key: 'waist_cm', label: 'Taille' },
                      { key: 'hips_cm', label: 'Hanches' },
                      { key: 'arms_cm', label: 'Bras' },
                      { key: 'thighs_cm', label: 'Cuisses' },
                    ].filter(m => log[m.key]).map(({ key, label }) => (
                      <div key={key} style={{ background: '#F7F8F4', border: `1px solid ${BORDER}`, borderRadius: 13, padding: 13 }}>
                        <div style={{ fontSize: 18, fontWeight: 950 }}>{log[key]} <span style={{ fontSize: 10, color: '#666' }}>cm</span></div>
                        <div style={{ fontSize: 9.5, color: '#777', marginTop: 4, textTransform: 'uppercase', fontWeight: 800 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === 'activity' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10, marginBottom: 12 }}>
                <div style={{ borderRadius: 18, padding: 17, background: SURFACE, border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 9.5, color: '#666', fontWeight: 900, letterSpacing: '.08em' }}>AUJOURD'HUI</div>
                  <div style={{ fontSize: 28, fontWeight: 950, marginTop: 6 }}>{Math.round(todayMinutes)} <span style={{ fontSize: 11, color: '#666' }}>min</span></div>
                </div>
                <div style={{ borderRadius: 18, padding: 17, background: SURFACE, border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 9.5, color: '#666', fontWeight: 900, letterSpacing: '.08em' }}>MACHINE / EST.</div>
                  <div style={{ fontSize: 28, fontWeight: 950, marginTop: 6, color: ACCENT }}>{Math.round(todayCalories)} <span style={{ fontSize: 11, color: '#666' }}>kcal</span></div>
                </div>
              </div>

              <div style={{ borderRadius: 18, padding: 15, background: 'rgba(200,255,0,.05)', border: '1px solid rgba(200,255,0,.16)', color: '#aaa', fontSize: 11.5, lineHeight: 1.55, marginBottom: 16 }}>
                Les calories d’activité sont des estimations de machine ou de saisie. NOX les suit séparément et <strong style={{ color: '#fff' }}>ne les rajoute pas automatiquement à ta cible Fuel</strong>.
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                <button onClick={openManualActivity} style={{ border: 0, borderRadius: 16, background: ACCENT, color: '#050505', padding: 15, fontSize: 11.5, fontWeight: 950, cursor: 'pointer' }}>+ SAISIR UNE ACTIVITÉ</button>
                <button onClick={openScanActivity} style={{ borderRadius: 16, border: `1px solid ${BORDER}`, background: SURFACE, color: '#090909', padding: 15, fontSize: 11.5, fontWeight: 950, cursor: 'pointer' }}>SCANNER L'ÉCRAN D'UNE MACHINE</button>
              </div>

              {activityError && !showActivity && (
                <div role="alert" style={{ marginTop: 14, borderRadius: 12, padding: '10px 12px', background: 'rgba(255,95,95,.08)', border: '1px solid rgba(255,95,95,.22)', color: '#ff8a8a', fontSize: 11.5 }}>{activityError}</div>
              )}

              <div style={{ fontSize: 10.5, color: '#777', fontWeight: 900, letterSpacing: '.09em', margin: '24px 2px 10px' }}>HISTORIQUE ACTIVITÉ</div>
              {activities.length === 0 ? (
                <div style={{ borderRadius: 18, padding: '35px 20px', background: SURFACE, border: `1px solid ${BORDER}`, textAlign: 'center', color: '#666', fontSize: 12 }}>Aucune activité enregistrée.</div>
              ) : activities.slice(0, 20).map(activity => (
                <div key={activity.id} style={{ borderRadius: 16, padding: 15, background: SURFACE, border: `1px solid ${BORDER}`, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 950, fontSize: 15 }}>{activity.activity_type}</div>
                      <div style={{ color: '#666', fontSize: 10.5, marginTop: 4 }}>
                        {new Date(activity.performed_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} · {activity.source === 'scan' ? 'scan machine' : 'saisie manuelle'}
                      </div>
                    </div>
                    <button onClick={() => void deleteActivity(activity.id)} aria-label="Supprimer l'activité" style={{ border: 0, background: 'transparent', color: '#555', cursor: 'pointer', fontSize: 18 }}>×</button>
                  </div>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12, fontSize: 12, fontWeight: 850 }}>
                    <span>{activity.duration_minutes} min</span>
                    {activity.calories_burned != null && <span style={{ color: ACCENT }}>{activity.calories_burned} kcal</span>}
                    {activity.distance_km != null && <span>{Number(activity.distance_km).toFixed(2)} km</span>}
                  </div>
                  {activity.notes && <div style={{ color: '#777', fontSize: 11, lineHeight: 1.45, marginTop: 9 }}>{activity.notes}</div>}
                </div>
              ))}
            </>
          )}

          {tab === 'photos' && (
            <div>
              {/* Upload */}
              <div style={{ marginBottom: 16 }}>
                <input ref={photoInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file || !user) return;
                    setPhotoUploading(true);
                    try {
                      const ext = file.name.split('.').pop() || 'jpg';
                      const path = `${user.id}/${Date.now()}.${ext}`;
                      const { error: upErr } = await supabase.storage.from('body-photos').upload(path, file, { upsert: false });
                      if (upErr) throw upErr;
                      const { data: { publicUrl } } = supabase.storage.from('body-photos').getPublicUrl(path);
                      await supabase.from('body_photos').insert({
                        user_id: user.id,
                        photo_url: publicUrl,
                        storage_path: path,
                        created_at: new Date().toISOString(),
                      });
                      await loadPhotos();
                    } catch (err: any) {
                      alert('Erreur upload : ' + err.message);
                    }
                    setPhotoUploading(false);
                    e.target.value = '';
                  }} />
                <button onClick={() => photoInputRef.current?.click()} disabled={photoUploading}
                  style={{ width: '100%', padding: 16, background: photoUploading ? SURFACE : ACCENT, border: 'none', borderRadius: 14, color: photoUploading ? '#555' : '#000', fontWeight: 900, fontSize: 14, cursor: 'pointer', touchAction: 'manipulation', marginBottom: 8 }}>
                  {photoUploading ? '⏳ Upload en cours...' : '📸 AJOUTER UNE PHOTO'}
                </button>
                <div style={{ fontSize: 11, color: '#555', textAlign: 'center' }}>Tes photos sont privées — stockées sur ton compte uniquement</div>
              </div>

              {/* Galerie */}
              {bodyPhotos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#555' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
                  <div style={{ fontSize: 14 }}>Pas encore de photos</div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>Ajoute ta première photo de progression</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {bodyPhotos.map((p: any) => (
                    <div key={p.id} style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', aspectRatio: '3/4', background: SURFACE }}>
                      <img src={p.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,.8)', padding: '20px 10px 10px' }}>
                        <div style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>
                          {new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <button onClick={async () => {
                        await supabase.storage.from('body-photos').remove([p.storage_path]);
                        await supabase.from('body_photos').delete().eq('id', p.id);
                        await loadPhotos();
                      }}
                        style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,.6)', border: 'none', color: '#fff', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.48)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 560, background: '#FFFFFF', border: `1px solid ${BORDER}`, borderBottom: 0, borderRadius: '24px 24px 0 0', padding: '10px 20px calc(24px + env(safe-area-inset-bottom))', maxHeight: 'calc(100dvh - 16px)', overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', boxSizing: 'border-box' }}>
            <div style={{ width: 38, height: 4, background: '#2b2b2b', borderRadius: 999, margin: '2px auto 17px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 10, color: ACCENT, fontWeight: 900, letterSpacing: '.1em' }}>BODY</div>
                <div style={{ fontSize: 19, fontWeight: 950, marginTop: 3 }}>NOUVEAU CHECK-IN</div>
              </div>
              <button onClick={() => setShowAdd(false)} style={{ width: 36, height: 36, borderRadius: 12, border: `1px solid ${BORDER}`, background: '#F4F5F0', color: '#090909', fontSize: 21, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
              {[
                { key: 'weight', label: 'Poids', unit: 'kg', placeholder: '80.5' },
                { key: 'chest_cm', label: 'Poitrine', unit: 'cm', placeholder: '—' },
                { key: 'waist_cm', label: 'Taille', unit: 'cm', placeholder: '—' },
                { key: 'hips_cm', label: 'Hanches', unit: 'cm', placeholder: '—' },
                { key: 'arms_cm', label: 'Bras', unit: 'cm', placeholder: '—' },
                { key: 'thighs_cm', label: 'Cuisses', unit: 'cm', placeholder: '—' },
              ].map(({ key, label, unit, placeholder }) => (
                <label key={key} style={{ display: 'block', background: '#F7F8F4', border: `1px solid ${BORDER}`, borderRadius: 14, padding: 12 }}>
                  <div style={{ fontSize: 9.5, color: '#777', fontWeight: 850, textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: 5 }}>
                    <input value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} type="number" inputMode="decimal" style={{ width: '100%', minWidth: 0, border: 0, outline: 0, background: 'transparent', color: '#090909', fontSize: 18, fontWeight: 900 }} />
                    <span style={{ color: '#555', fontSize: 10 }}>{unit}</span>
                  </div>
                </label>
              ))}
            </div>

            <label style={{ display: 'block', marginTop: 10 }}>
              <div style={{ fontSize: 9.5, color: '#777', fontWeight: 850, textTransform: 'uppercase', marginBottom: 6 }}>Note</div>
              <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Comment tu te sens aujourd'hui ?" type="text" style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${BORDER}`, outline: 0, background: '#F7F8F4', color: '#090909', borderRadius: 14, padding: '13px 14px', fontSize: 13 }} />
            </label>

            {saveError && <div role="alert" style={{ marginTop: 12, borderRadius: 12, padding: '10px 12px', background: 'rgba(255,95,95,.08)', border: '1px solid rgba(255,95,95,.22)', color: '#ff8a8a', fontSize: 11.5, lineHeight: 1.45 }}>{saveError}</div>}
            {saveSuccess && <div style={{ marginTop: 12, borderRadius: 12, padding: '10px 12px', background: 'rgba(200,255,0,.08)', border: '1px solid rgba(200,255,0,.22)', color: ACCENT, fontSize: 11.5, fontWeight: 850 }}>Check-in enregistré ✓</div>}
            <button onClick={save} disabled={saving} style={{ position: 'sticky', bottom: 0, zIndex: 2, width: '100%', border: 0, borderRadius: 14, background: saving ? '#2a2a2a' : ACCENT, color: saving ? '#777' : '#050505', padding: 15, marginTop: 16, fontSize: 12, fontWeight: 950, letterSpacing: '.04em', cursor: saving ? 'wait' : 'pointer', boxShadow: '0 -10px 24px rgba(255,255,255,.92)' }}>{saving ? 'ENREGISTREMENT...' : 'ENREGISTRER LE CHECK-IN'}</button>
          </div>
        </div>
      )}

      {showActivity && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.48)', backdropFilter: 'blur(8px)', zIndex: 210, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 560, background: '#FFFFFF', border: `1px solid ${BORDER}`, borderBottom: 0, borderRadius: '24px 24px 0 0', padding: '10px 20px max(24px, env(safe-area-inset-bottom))', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ width: 38, height: 4, background: '#2b2b2b', borderRadius: 999, margin: '2px auto 17px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 10, color: ACCENT, fontWeight: 900, letterSpacing: '.1em' }}>NOX ACTIVITY</div>
                <div style={{ fontSize: 19, fontWeight: 950, marginTop: 3 }}>
                  {activityMode === 'scan' ? 'SCANNER UNE MACHINE' : activityMode === 'confirm' ? 'CONFIRMER LES DONNÉES' : 'NOUVELLE ACTIVITÉ'}
                </div>
              </div>
              <button onClick={() => setShowActivity(false)} style={{ width: 36, height: 36, borderRadius: 12, border: `1px solid ${BORDER}`, background: '#F4F5F0', color: '#090909', fontSize: 21, cursor: 'pointer' }}>×</button>
            </div>

            {activityMode === 'scan' && (
              <>
                <div style={{ borderRadius: 18, padding: '24px 18px', border: '1px dashed #333', background: SURFACE, textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 950 }}>PHOTO DE L'ÉCRAN</div>
                  <div style={{ color: '#777', fontSize: 12, lineHeight: 1.55, margin: '8px auto 17px', maxWidth: 340 }}>
                    Cadre l’écran pour que la durée, les calories et la distance soient lisibles. NOX te demandera toujours de confirmer avant d’enregistrer.
                  </div>
                  <input ref={scanInputRef} type="file" accept="image/*" capture="environment" onChange={e => e.target.files?.[0] && void scanMachine(e.target.files[0])} style={{ display: 'none' }} />
                  <button disabled={scanning} onClick={() => scanInputRef.current?.click()} style={{ border: 0, borderRadius: 13, background: scanning ? '#2a2a2a' : ACCENT, color: scanning ? '#777' : '#050505', padding: '13px 18px', fontWeight: 950, cursor: scanning ? 'wait' : 'pointer' }}>
                    {scanning ? 'ANALYSE EN COURS...' : 'PRENDRE / CHOISIR UNE PHOTO'}
                  </button>
                </div>
                {scanPreview && <img src={scanPreview} alt="Écran de machine à confirmer" style={{ width: '100%', maxHeight: 230, objectFit: 'contain', borderRadius: 16, marginTop: 12, background: '#050505' }} />}
              </>
            )}

            {(activityMode === 'manual' || activityMode === 'confirm') && (
              <>
                {activityMode === 'confirm' && (
                  <div style={{ borderRadius: 13, padding: '11px 12px', marginBottom: 12, background: 'rgba(200,255,0,.06)', border: '1px solid rgba(200,255,0,.18)', color: '#aaa', fontSize: 11.5, lineHeight: 1.5 }}>
                    Données lues par IA. <strong style={{ color: '#fff' }}>Vérifie et corrige chaque valeur</strong> avant l’enregistrement.
                  </div>
                )}
                <div style={{ display: 'grid', gap: 10 }}>
                  {activityInput('activity_type', "Type d'activité", undefined, 'Tapis, vélo, elliptique…')}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
                    {activityInput('duration_minutes', 'Durée', 'min', '30')}
                    {activityInput('calories_burned', 'Calories estimées', 'kcal', '250')}
                    {activityInput('distance_km', 'Distance', 'km', '5.2')}
                  </div>
                  {activityInput('notes', 'Note', undefined, 'Optionnel')}
                </div>
                <div style={{ color: '#666', fontSize: 10.5, lineHeight: 1.5, marginTop: 12 }}>
                  Les calories affichées par les machines restent des estimations. Elles sont conservées comme données d’activité, pas comme calories automatiquement “à manger”.
                </div>
                <button onClick={() => void saveActivity()} disabled={activitySaving} style={{ width: '100%', border: 0, borderRadius: 14, background: activitySaving ? '#2a2a2a' : ACCENT, color: activitySaving ? '#777' : '#050505', padding: 15, marginTop: 16, fontSize: 12, fontWeight: 950, cursor: activitySaving ? 'wait' : 'pointer' }}>
                  {activitySaving ? 'ENREGISTREMENT...' : activityMode === 'confirm' ? 'CONFIRMER ET ENREGISTRER' : "ENREGISTRER L'ACTIVITÉ"}
                </button>
              </>
            )}

            {activityError && <div role="alert" style={{ marginTop: 12, borderRadius: 12, padding: '10px 12px', background: 'rgba(255,95,95,.08)', border: '1px solid rgba(255,95,95,.22)', color: '#ff8a8a', fontSize: 11.5, lineHeight: 1.45 }}>{activityError}</div>}
            {activitySuccess && <div style={{ marginTop: 12, borderRadius: 12, padding: '10px 12px', background: 'rgba(200,255,0,.08)', border: '1px solid rgba(200,255,0,.22)', color: ACCENT, fontSize: 11.5, fontWeight: 850 }}>Activité enregistrée ✓</div>}
          </div>
        </div>
      )}

      <BottomNav active="progress" />
      <TutorialTooltip page="body" />
    </div>
  );
}
