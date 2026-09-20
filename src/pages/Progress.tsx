import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [tab, setTab] = useState<MainTab>('timeline');
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
    setPhotos(bodyPhotos || []);
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
              style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: '2px solid ' + (tab === id ? ACCENT : 'transparent'), color: tab === id ? ACCENT : '#555', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', touchAction: 'manipulation' }}>
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
                          {compareA?.photo_url && <img src={compareA.photo_url} style={{ width: '100%', borderRadius: 16, objectFit: 'cover', aspectRatio: '3/4' }} alt="Avant" />}
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: '#8B8F86', marginBottom: 4 }}>APRÈS</div>
                          <select value={compareB?.id || ''} onChange={e => setCompareB(photos.find(p => p.id === e.target.value))}
                            style={{ width: '100%', padding: '8px', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 8, color: '#090909', fontSize: 12, marginBottom: 6 }}>
                            <option value="">Choisir...</option>
                            {photos.map(p => <option key={p.id} value={p.id}>{new Date(p.created_at).toLocaleDateString('fr-FR')}</option>)}
                          </select>
                          {compareB?.photo_url && <img src={compareB.photo_url} style={{ width: '100%', borderRadius: 16, objectFit: 'cover', aspectRatio: '3/4' }} alt="Après" />}
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

      <BottomNav active="progress" />
    </div>
  );
}
