import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';

const STEPS = [
  'Analyse de ton objectif...',
  'Construction de ton entraînement...',
  'Sélection des exercices...',
  'Calcul de ta progression...',
  'Estimation de tes besoins nutritionnels...',
];

const PROGRAMS: Record<string, any> = {
  'Perdre du gras': {
    name: 'Programme Perte de Gras — Phase 1',
    splits: {
      3: [
        { name: 'Full Body A', exercises: [
          { name: 'Squat', muscle: 'Quadriceps', sets: 3, reps: '10-12', rest: 90 },
          { name: 'Développé couché', muscle: 'Pectoraux', sets: 3, reps: '10-12', rest: 90 },
          { name: 'Rowing haltère', muscle: 'Dos', sets: 3, reps: '10-12', rest: 60 },
          { name: 'Gainage', muscle: 'Abdominaux', sets: 3, reps: '30-45s', rest: 45 },
        ]},
        { name: 'Full Body B', exercises: [
          { name: 'Soulevé de terre roumain', muscle: 'Ischio-jambiers', sets: 3, reps: '10-12', rest: 90 },
          { name: 'Tractions assistées', muscle: 'Dos', sets: 3, reps: '8-10', rest: 90 },
          { name: 'Dips', muscle: 'Triceps', sets: 3, reps: '10-12', rest: 60 },
          { name: 'Fentes', muscle: 'Quadriceps', sets: 3, reps: '10-12', rest: 60 },
        ]},
        { name: 'Full Body C', exercises: [
          { name: 'Hip thrust', muscle: 'Fessiers', sets: 4, reps: '12-15', rest: 90 },
          { name: 'Développé militaire', muscle: 'Épaules', sets: 3, reps: '10-12', rest: 90 },
          { name: 'Curl haltères', muscle: 'Biceps', sets: 3, reps: '12-15', rest: 60 },
          { name: 'Crunch', muscle: 'Abdominaux', sets: 3, reps: '15-20', rest: 45 },
        ]},
      ],
      4: [
        { name: 'Haut du corps A', exercises: [
          { name: 'Développé couché', muscle: 'Pectoraux', sets: 4, reps: '10-12', rest: 90 },
          { name: 'Rowing barre', muscle: 'Dos', sets: 4, reps: '10-12', rest: 90 },
          { name: 'Développé militaire', muscle: 'Épaules', sets: 3, reps: '10-12', rest: 60 },
          { name: 'Curl haltères', muscle: 'Biceps', sets: 3, reps: '12-15', rest: 60 },
          { name: 'Triceps poulie', muscle: 'Triceps', sets: 3, reps: '12-15', rest: 60 },
        ]},
        { name: 'Bas du corps A', exercises: [
          { name: 'Squat', muscle: 'Quadriceps', sets: 4, reps: '10-12', rest: 90 },
          { name: 'Soulevé de terre roumain', muscle: 'Ischio-jambiers', sets: 3, reps: '10-12', rest: 90 },
          { name: 'Leg press', muscle: 'Quadriceps', sets: 3, reps: '12-15', rest: 75 },
          { name: 'Mollets debout', muscle: 'Mollets', sets: 4, reps: '15-20', rest: 45 },
        ]},
        { name: 'Haut du corps B', exercises: [
          { name: 'Tractions', muscle: 'Dos', sets: 4, reps: '6-10', rest: 90 },
          { name: 'Écarté haltères', muscle: 'Pectoraux', sets: 3, reps: '12-15', rest: 60 },
          { name: 'Élévations latérales', muscle: 'Épaules', sets: 4, reps: '15-20', rest: 45 },
          { name: 'Dips', muscle: 'Triceps', sets: 3, reps: '10-12', rest: 60 },
        ]},
        { name: 'Bas du corps B', exercises: [
          { name: 'Hip thrust', muscle: 'Fessiers', sets: 4, reps: '12-15', rest: 90 },
          { name: 'Fentes marchées', muscle: 'Quadriceps', sets: 3, reps: '12-15', rest: 75 },
          { name: 'Leg curl couché', muscle: 'Ischio-jambiers', sets: 3, reps: '12-15', rest: 60 },
          { name: 'Gainage latéral', muscle: 'Abdominaux', sets: 3, reps: '30s', rest: 45 },
        ]},
      ],
    },
  },
  'Prendre du muscle': {
    name: 'Programme Prise de Muscle — Phase 1',
    splits: {
      3: [
        { name: 'Full Body A', exercises: [
          { name: 'Squat', muscle: 'Quadriceps', sets: 4, reps: '6-8', rest: 120 },
          { name: 'Développé couché', muscle: 'Pectoraux', sets: 4, reps: '6-8', rest: 120 },
          { name: 'Tractions lestées', muscle: 'Dos', sets: 4, reps: '6-8', rest: 120 },
          { name: 'Développé militaire', muscle: 'Épaules', sets: 3, reps: '8-10', rest: 90 },
        ]},
        { name: 'Full Body B', exercises: [
          { name: 'Soulevé de terre', muscle: 'Dos', sets: 4, reps: '4-6', rest: 180 },
          { name: 'Dips lestés', muscle: 'Triceps', sets: 4, reps: '6-8', rest: 120 },
          { name: 'Rowing haltère', muscle: 'Dos', sets: 4, reps: '8-10', rest: 90 },
          { name: 'Leg press', muscle: 'Quadriceps', sets: 4, reps: '8-10', rest: 90 },
        ]},
        { name: 'Full Body C', exercises: [
          { name: 'Hip thrust', muscle: 'Fessiers', sets: 4, reps: '8-10', rest: 90 },
          { name: 'Curl haltères', muscle: 'Biceps', sets: 4, reps: '8-10', rest: 75 },
          { name: 'Écarté incliné', muscle: 'Pectoraux', sets: 3, reps: '10-12', rest: 75 },
          { name: 'Extension triceps', muscle: 'Triceps', sets: 3, reps: '10-12', rest: 60 },
        ]},
      ],
    },
  },
};

export default function GenerateProgram() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const generate = async () => {
      if (!user) return;

      for (let i = 0; i < STEPS.length; i++) {
        setCurrentStep(i);
        await new Promise(r => setTimeout(r, 900));
      }

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (!profile) { navigate('/home'); return; }

      const goal = profile.level || 'Perdre du gras';
      const sessionsPerWeek = profile.session_length_min ? (profile.available_days?.length || 3) : 3;
      const splitKey = sessionsPerWeek >= 4 ? 4 : 3;

      const programTemplate = PROGRAMS[goal] || PROGRAMS['Perdre du gras'];
      const splits = programTemplate.splits[splitKey] || programTemplate.splits[3];

      // Construire le program_json
      const programJson = {
        goal,
        sessions_per_week: sessionsPerWeek,
        available_days: profile.available_days || [],
        sessions: splits.map((split: any, i: number) => ({
          ...split,
          day: (profile.available_days || [])[i] || null,
        })),
      };

      // Désactiver les anciens programmes
      await supabase.from('workout_programs').update({ is_active: false }).eq('user_id', user.id);

      // Créer le nouveau programme
      await supabase.from('workout_programs').insert({
        user_id: user.id,
        name: programTemplate.name,
        description: `Programme personnalisé NOX — ${goal}`,
        goal,
        days_per_week: sessionsPerWeek,
        duration_weeks: 8,
        program_json: programJson,
        is_active: true,
        created_at: new Date().toISOString(),
      });

      // Calculer TDEE
      const weight = Number(profile.starting_weight_kg) || 75;
      const heightCm = Number(profile.height_cm) || 175;
      const dob = profile.date_of_birth ? new Date(profile.date_of_birth) : null;
      const age = dob ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000)) : 25;
      const bmr = 10 * weight + 6.25 * heightCm - 5 * age + 5;
      const multipliers: Record<string, number> = { sedentary: 1.2, lightly_active: 1.375, active: 1.55, very_active: 1.725 };
      const tdee = Math.round(bmr * (multipliers[profile.activity_level] || 1.375));
      const protein = Math.round(weight * 1.8);
      const targetCalories = goal === 'Perdre du gras' ? tdee - 400 : goal === 'Prendre du muscle' ? tdee + 300 : tdee;

      await supabase.from('nutrition_targets').upsert({
        user_id: user.id,
        calories: targetCalories,
        protein,
        carbs: Math.round((targetCalories * 0.4) / 4),
        fat: Math.round((targetCalories * 0.25) / 9),
      }, { onConflict: 'user_id' });

      setDone(true);
    };
    generate();
  }, [user]);

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      {!done ? (
        <>
          <div style={{ width: 60, height: 60, borderRadius: '50%', border: `3px solid ${ACCENT}`, borderTopColor: 'transparent', animation: 'spin 1s linear infinite', marginBottom: 40 }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ fontSize: 14, color: i === currentStep ? ACCENT : i < currentStep ? '#333' : '#1a1a1a', fontWeight: i === currentStep ? 700 : 400, transition: 'all .3s' }}>
                {i < currentStep ? '✓ ' : i === currentStep ? '→ ' : '  '}{s}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div>
          <div style={{ fontSize: 56, marginBottom: 20 }}>⚡</div>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 8, letterSpacing: '-.025em' }}>TON PLAN EST PRÊT</h2>
          <p style={{ fontSize: 15, color: '#555', marginBottom: 40 }}>NOX a construit ton programme personnalisé.</p>
          <button onClick={() => navigate('/home')} style={{ background: ACCENT, color: BG, border: 'none', borderRadius: 14, padding: '18px 40px', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>
            DÉCOUVRIR MON PROGRAMME
          </button>
        </div>
      )}
    </div>
  );
}
