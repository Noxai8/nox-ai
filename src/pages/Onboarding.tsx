import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#222';

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ height: 2, background: '#1a1a1a', borderRadius: 1, marginBottom: 32 }}>
      <div style={{ height: '100%', background: ACCENT, borderRadius: 1, width: `${(step / total) * 100}%`, transition: 'width .3s ease' }} />
    </div>
  );
}

function OptionCard({ label, selected, onClick, emoji, desc }: any) {
  return (
    <button onClick={onClick} style={{
      background: selected ? 'rgba(200,255,0,0.08)' : SURFACE,
      border: `1.5px solid ${selected ? ACCENT : BORDER}`,
      borderRadius: 14, padding: '16px 20px', textAlign: 'left', cursor: 'pointer', width: '100%',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      {emoji && <span style={{ fontSize: 20 }}>{emoji}</span>}
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: selected ? ACCENT : '#fff' }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: '#444', marginTop: 2 }}>{desc}</div>}
      </div>
    </button>
  );
}

const TOTAL_STEPS = 12;

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<any>({
    goal: '', motivation: '', date_of_birth: '', height_cm: '',
    starting_weight_kg: '', target_weight: '', level: '',
    experience_level: '', location: '', equipment: [],
    sessions_per_week: '', session_length_min: '', available_days: [],
    diet_description: '', activity_level: '', target_date: '',
    sex: '', injuries: '',
  });

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setStep(s => Math.max(s - 1, 1));
  const set = (key: string, val: any) => setData((d: any) => ({ ...d, [key]: val }));

  const finish = async () => {
    if (!user) return;
    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      display_name: user.email?.split('@')[0],
      motivation: data.motivation,
      date_of_birth: data.date_of_birth || null,
      height_cm: Number(data.height_cm) || null,
      starting_weight_kg: Number(data.starting_weight_kg) || null,
      level: data.goal,
      experience_level: data.experience_level,
      equipment: data.equipment,
      available_days: data.available_days,
      session_length_min: Number(data.session_length_min) || 60,
      diet_description: data.diet_description,
      activity_level: data.activity_level,
      injuries: data.injuries,
      sex: data.sex,
      units: 'metric',
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    });

    // Sauvegarder l'objectif
    await supabase.from('goals').upsert({
      user_id: user.id,
      goal_type: data.goal,
      target_weight_kg: Number(data.target_weight) || null,
      target_date: data.target_date || null,
      sessions_per_week: Number(data.sessions_per_week) || 3,
      created_at: new Date().toISOString(),
    });

    navigate('/generate-program');
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '24px', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ paddingTop: 20 }}>
        <ProgressBar step={step} total={TOTAL_STEPS} />

        {step === 1 && (
          <div>
            <div style={{ fontSize: 13, color: '#444', marginBottom: 8 }}>≈ 3 minutes</div>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 12, letterSpacing: '-.025em' }}>CONSTRUISONS<br />TON NOX</h2>
            <p style={{ fontSize: 15, color: '#666', lineHeight: 1.6, marginBottom: 40 }}>Pour construire ton plan, NOX doit comprendre ton corps, ton objectif et ton mode de vie.</p>
            <button onClick={next} style={{ background: ACCENT, color: BG, border: 'none', borderRadius: 14, padding: '18px', fontSize: 15, fontWeight: 900, cursor: 'pointer', width: '100%' }}>CONTINUER</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 24 }}>Quel est ton objectif principal ?</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
              {[
                { label: 'Perdre du gras', emoji: '🔥' },
                { label: 'Prendre du muscle', emoji: '💪' },
                { label: 'Recomposition corporelle', emoji: '⚡' },
                { label: 'Devenir plus fort', emoji: '🏋️' },
                { label: 'Améliorer mes performances', emoji: '🎯' },
                { label: 'Maintenir mon physique', emoji: '✅' },
              ].map(o => <OptionCard key={o.label} {...o} selected={data.goal === o.label} onClick={() => set('goal', o.label)} />)}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={back} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px', fontSize: 14, color: '#fff', cursor: 'pointer', flex: 1 }}>Retour</button>
              <button onClick={next} disabled={!data.goal} style={{ background: data.goal ? ACCENT : '#1a1a1a', color: data.goal ? BG : '#333', border: 'none', borderRadius: 14, padding: '16px', fontSize: 14, fontWeight: 900, cursor: 'pointer', flex: 2 }}>Continuer</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 24 }}>Ton profil physique</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
              {[
                { key: 'date_of_birth', label: 'Date de naissance', type: 'date', placeholder: '' },
                { key: 'height_cm', label: 'Taille (cm)', type: 'number', placeholder: '178' },
                { key: 'starting_weight_kg', label: 'Poids actuel (kg)', type: 'number', placeholder: '80' },
                ...(data.goal === 'Perdre du gras' || data.goal === 'Prendre du muscle' ? [{ key: 'target_weight', label: 'Poids cible (kg)', type: 'number', placeholder: '73' }] : []),
              ].map(field => (
                <div key={field.key}>
                  <label style={{ fontSize: 12, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 8 }}>{field.label}</label>
                  <input value={data[field.key]} onChange={e => set(field.key, e.target.value)} type={field.type} placeholder={field.placeholder}
                    style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px', fontSize: 15, color: '#fff', outline: 'none', width: '100%' }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={back} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px', fontSize: 14, color: '#fff', cursor: 'pointer', flex: 1 }}>Retour</button>
              <button onClick={next} style={{ background: ACCENT, color: BG, border: 'none', borderRadius: 14, padding: '16px', fontSize: 14, fontWeight: 900, cursor: 'pointer', flex: 2 }}>Continuer</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 24 }}>Ton niveau</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
              {[
                { label: 'Débutant', desc: 'Je commence ou reprends', emoji: '🌱', val: 'beginner' },
                { label: 'Intermédiaire', desc: '6 mois à 2 ans', emoji: '⚡', val: 'intermediate' },
                { label: 'Avancé', desc: '2 ans et plus', emoji: '🔥', val: 'advanced' },
              ].map(o => (
                <OptionCard key={o.val} label={o.label} desc={o.desc} emoji={o.emoji} selected={data.experience_level === o.val} onClick={() => set('experience_level', o.val)} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={back} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px', fontSize: 14, color: '#fff', cursor: 'pointer', flex: 1 }}>Retour</button>
              <button onClick={next} disabled={!data.experience_level} style={{ background: data.experience_level ? ACCENT : '#1a1a1a', color: data.experience_level ? BG : '#333', border: 'none', borderRadius: 14, padding: '16px', fontSize: 14, fontWeight: 900, cursor: 'pointer', flex: 2 }}>Continuer</button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 24 }}>Où t'entraînes-tu ?</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
              {[
                { label: 'Salle de sport', emoji: '🏋️' },
                { label: 'Maison', emoji: '🏠' },
                { label: 'Extérieur', emoji: '🌿' },
                { label: 'Plusieurs lieux', emoji: '📍' },
              ].map(o => <OptionCard key={o.label} {...o} selected={data.location === o.label} onClick={() => set('location', o.label)} />)}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={back} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px', fontSize: 14, color: '#fff', cursor: 'pointer', flex: 1 }}>Retour</button>
              <button onClick={next} disabled={!data.location} style={{ background: data.location ? ACCENT : '#1a1a1a', color: data.location ? BG : '#333', border: 'none', borderRadius: 14, padding: '16px', fontSize: 14, fontWeight: 900, cursor: 'pointer', flex: 2 }}>Continuer</button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 24 }}>Tes disponibilités</h2>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 12 }}>Séances par semaine</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[2,3,4,5,6].map(n => (
                  <button key={n} onClick={() => set('sessions_per_week', n)} style={{
                    flex: 1, padding: '14px 0', background: data.sessions_per_week === n ? ACCENT : SURFACE,
                    border: `1px solid ${data.sessions_per_week === n ? ACCENT : BORDER}`,
                    borderRadius: 12, fontSize: 16, fontWeight: 800, color: data.sessions_per_week === n ? BG : '#fff', cursor: 'pointer',
                  }}>{n}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 32 }}>
              <label style={{ fontSize: 13, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 12 }}>Durée par séance</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[30,45,60,75,90].map(d => (
                  <button key={d} onClick={() => set('session_length_min', d)} style={{
                    padding: '12px 16px', background: data.session_length_min === d ? ACCENT : SURFACE,
                    border: `1px solid ${data.session_length_min === d ? ACCENT : BORDER}`,
                    borderRadius: 12, fontSize: 13, fontWeight: 700, color: data.session_length_min === d ? BG : '#fff', cursor: 'pointer',
                  }}>{d} min</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={back} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px', fontSize: 14, color: '#fff', cursor: 'pointer', flex: 1 }}>Retour</button>
              <button onClick={next} disabled={!data.sessions_per_week || !data.session_length_min} style={{ background: data.sessions_per_week && data.session_length_min ? ACCENT : '#1a1a1a', color: data.sessions_per_week && data.session_length_min ? BG : '#333', border: 'none', borderRadius: 14, padding: '16px', fontSize: 14, fontWeight: 900, cursor: 'pointer', flex: 2 }}>Continuer</button>
            </div>
          </div>
        )}

        {step === 7 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 24 }}>Quels jours ?</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 32 }}>
              {['LUN','MAR','MER','JEU','VEN','SAM','DIM'].map(day => {
                const selected = data.available_days.includes(day);
                return (
                  <button key={day} onClick={() => set('available_days', selected ? data.available_days.filter((d: string) => d !== day) : [...data.available_days, day])} style={{
                    padding: '14px 0', background: selected ? ACCENT : SURFACE,
                    border: `1px solid ${selected ? ACCENT : BORDER}`, borderRadius: 12,
                    fontSize: 11, fontWeight: 800, color: selected ? BG : '#555', cursor: 'pointer',
                  }}>{day}</button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={back} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px', fontSize: 14, color: '#fff', cursor: 'pointer', flex: 1 }}>Retour</button>
              <button onClick={next} disabled={data.available_days.length === 0} style={{ background: data.available_days.length > 0 ? ACCENT : '#1a1a1a', color: data.available_days.length > 0 ? BG : '#333', border: 'none', borderRadius: 14, padding: '16px', fontSize: 14, fontWeight: 900, cursor: 'pointer', flex: 2 }}>Continuer</button>
            </div>
          </div>
        )}

        {step === 8 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 24 }}>Ton alimentation</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
              {[
                { label: 'Très structurée', emoji: '📊' },
                { label: 'Plutôt correcte', emoji: '✅' },
                { label: 'Irrégulière', emoji: '🎲' },
                { label: 'Je ne sais pas vraiment', emoji: '🤔' },
              ].map(o => <OptionCard key={o.label} {...o} selected={data.diet_description === o.label} onClick={() => set('diet_description', o.label)} />)}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={back} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px', fontSize: 14, color: '#fff', cursor: 'pointer', flex: 1 }}>Retour</button>
              <button onClick={next} disabled={!data.diet_description} style={{ background: data.diet_description ? ACCENT : '#1a1a1a', color: data.diet_description ? BG : '#333', border: 'none', borderRadius: 14, padding: '16px', fontSize: 14, fontWeight: 900, cursor: 'pointer', flex: 2 }}>Continuer</button>
            </div>
          </div>
        )}

        {step === 9 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 24 }}>Ton quotidien</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
              {[
                { label: 'Principalement assis', emoji: '💻', val: 'sedentary' },
                { label: 'Modérément actif', emoji: '🚶', val: 'lightly_active' },
                { label: 'Actif', emoji: '🏃', val: 'active' },
                { label: 'Très actif', emoji: '⚡', val: 'very_active' },
              ].map(o => <OptionCard key={o.val} label={o.label} emoji={o.emoji} selected={data.activity_level === o.val} onClick={() => set('activity_level', o.val)} />)}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={back} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px', fontSize: 14, color: '#fff', cursor: 'pointer', flex: 1 }}>Retour</button>
              <button onClick={next} disabled={!data.activity_level} style={{ background: data.activity_level ? ACCENT : '#1a1a1a', color: data.activity_level ? BG : '#333', border: 'none', borderRadius: 14, padding: '16px', fontSize: 14, fontWeight: 900, cursor: 'pointer', flex: 2 }}>Continuer</button>
            </div>
          </div>
        )}

        {step === 10 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Blessures ou limitations ?</h2>
            <p style={{ fontSize: 14, color: '#555', marginBottom: 24 }}>NOX adaptera ton programme en conséquence.</p>
            <textarea value={data.injuries} onChange={e => set('injuries', e.target.value)} rows={4}
              placeholder="Ex: douleur genou droit, épaule fragile... ou aucune"
              style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px', fontSize: 14, color: '#fff', outline: 'none', width: '100%', resize: 'none', marginBottom: 32 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={back} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px', fontSize: 14, color: '#fff', cursor: 'pointer', flex: 1 }}>Retour</button>
              <button onClick={next} style={{ background: ACCENT, color: BG, border: 'none', borderRadius: 14, padding: '16px', fontSize: 14, fontWeight: 900, cursor: 'pointer', flex: 2 }}>Continuer</button>
            </div>
          </div>
        )}

        {step === 11 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Date cible</h2>
            <p style={{ fontSize: 14, color: '#555', marginBottom: 24 }}>NOX analysera si ta trajectoire est réaliste.</p>
            <input type="date" value={data.target_date} onChange={e => set('target_date', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px', fontSize: 15, color: '#fff', outline: 'none', width: '100%', marginBottom: 24 }} />
            {data.target_date && (() => {
              const weeks = Math.round((new Date(data.target_date).getTime() - Date.now()) / (7 * 24 * 3600 * 1000));
              const diff = Math.abs(Number(data.starting_weight_kg) - Number(data.target_weight || data.starting_weight_kg));
              const weeklyRate = weeks > 0 && diff > 0 ? diff / weeks : 0;
              let status = '🟢'; let msg = 'OBJECTIF RÉALISTE';
              if (weeklyRate > 1.2) { status = '🔴'; msg = 'OBJECTIF À AJUSTER'; }
              else if (weeklyRate > 0.8) { status = '🟠'; msg = 'OBJECTIF AMBITIEUX'; }
              return (
                <div style={{ background: '#111', border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16, marginBottom: 24 }}>
                  <span style={{ fontSize: 20 }}>{status}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginLeft: 10 }}>{msg}</span>
                  {weeks > 0 && <div style={{ fontSize: 12, color: '#444', marginTop: 6 }}>{weeks} semaines</div>}
                </div>
              );
            })()}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={back} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px', fontSize: 14, color: '#fff', cursor: 'pointer', flex: 1 }}>Retour</button>
              <button onClick={next} disabled={!data.target_date} style={{ background: data.target_date ? ACCENT : '#1a1a1a', color: data.target_date ? BG : '#333', border: 'none', borderRadius: 14, padding: '16px', fontSize: 14, fontWeight: 900, cursor: 'pointer', flex: 2 }}>Continuer</button>
            </div>
          </div>
        )}

        {step === 12 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 8 }}>TON OBJECTIF NOX</h2>
            <p style={{ fontSize: 14, color: '#555', marginBottom: 24 }}>Voilà ce que NOX a compris.</p>
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, marginBottom: 32 }}>
              {[
                ['Objectif', data.goal],
                ['Poids actuel', data.starting_weight_kg + ' kg'],
                ['Poids cible', data.target_weight ? data.target_weight + ' kg' : '—'],
                ['Niveau', data.experience_level],
                ['Lieu', data.location],
                ['Séances/semaine', data.sessions_per_week],
                ['Durée', data.session_length_min + ' min'],
                ['Jours', data.available_days.join(', ')],
              ].map(([k, v]) => (
                <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1a1a1a', fontSize: 14 }}>
                  <span style={{ color: '#555' }}>{k}</span>
                  <span style={{ color: '#fff', fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>
            <button onClick={finish} style={{ background: ACCENT, color: BG, border: 'none', borderRadius: 14, padding: '18px', fontSize: 15, fontWeight: 900, cursor: 'pointer', width: '100%' }}>
              CONSTRUIRE MON PLAN
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
