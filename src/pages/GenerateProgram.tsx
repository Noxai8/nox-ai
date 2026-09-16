@@ -1,287 +1,360 @@
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';

const STEPS = [
  'Analyse de ton profil...',
  'Définition de la stratégie...',
  'Sélection des exercices...',
  'Calcul du volume optimal...',
  'Logique de progression...',
  'Recommandations nutrition...',
  'Finalisation du programme...',
];

function getAvailableDays(profile: any): string[] {
  return Array.isArray(profile?.available_days)
    ? profile.available_days.filter((day: unknown) => typeof day === 'string' && day.trim().length > 0)
    : [];
}

export default function GenerateProgram() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [programName, setProgramName] = useState('');

  useEffect(() => {
    if (!user) return;

    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error: profileError }) => {
        if (profileError) {
          console.error(profileError);
          setError('Impossible de charger ton profil. Réessaie.');
          return;
        }

        if (!data) {
          setError('Ton profil est incomplet. Termine d’abord ton onboarding.');
          return;
        }

        setProfile(data);
      });
  }, [user]);

  useEffect(() => {
    if (!generating) return;

    const interval = setInterval(() => {
      setStepIdx(i => (i < STEPS.length - 1 ? i + 1 : i));
    }, 1200);

    return () => clearInterval(interval);
  }, [generating]);

  const generate = async () => {
    if (!user || !profile || generating) return;

    const availableDays = getAvailableDays(profile);
    const sessionCount = availableDays.length > 0 ? availableDays.length : 4;
    const sessionLength = Number(profile?.session_length_min) > 0
      ? Number(profile.session_length_min)
      : 60;

    setGenerating(true);
    setStepIdx(0);
    setError('');

    try {
      const prompt = `Tu es NOX, un coach IA expert en programmation sportive. Crée un programme d'entraînement COMPLET et DÉTAILLÉ.

PROFIL :
- Objectif : ${profile?.goal_type || 'transformation physique'}
- Niveau : ${profile?.experience_level || 'débutant'}
- Séances/semaine : ${sessionCount}
- Durée séance : ${sessionLength} min
- Jours dispo : ${availableDays.length > 0 ? availableDays.join(', ') : 'LUN, MER, VEN, SAM'}
- Équipement : ${profile?.equipment || 'salle complète'}
- Blessures : ${profile?.injuries || 'aucune'}
- Poids actuel : ${profile?.starting_weight_kg || '?'} kg
- Activité quotidienne : ${profile?.activity_level || 'modérée'}
- Motivation : ${profile?.motivation || 'améliorer mon physique'}

Génère un programme structuré. Réponds UNIQUEMENT en JSON valide :

{
  "name": "Nom du programme (ex: PROGRAMME FORCE & MASSE 4J)",
  "goal": "Description détaillée de l'objectif et de la stratégie (2-3 phrases)",
  "duration_weeks": 8,
  "session_length_min": ${sessionLength},
  "progression_notes": "Explication de la logique de progression (quand augmenter les charges, comment progresser)",
  "nutrition_notes": "Recommandations nutrition adaptées à l'objectif (calories, protéines, timing)",
  "sessions": [
    {
      "name": "NOM SÉANCE (ex: HAUT DU CORPS A - PUSH)",
      "day": "LUN",
      "focus": "Description courte du focus de la séance",
      "duration": ${sessionLength},
      "exercises": [
        {
          "name": "Nom exact de l'exercice",
          "muscles": "Muscles ciblés (ex: Pectoraux, Deltoïdes, Triceps)",
          "sets": "4",
          "reps": "6-8",
          "rest": "2-3 min",
          "weight_suggestion": "Charge suggérée ou % du max (ex: 70-80% 1RM)",
          "description": "Description technique complète du mouvement en 2-3 phrases",
          "instructions": "Étapes précises d'exécution",
          "order_index": 1
        }
      ]
    }
  ]
}

RÈGLES :
- ${sessionCount} séances par semaine exactement
- Adapte tous les exercices au matériel disponible
- Exercices polyarticulaires en premier (composés avant isolation)
- Volume adapté au niveau (débutant: 2-3 séries, intermédiaire: 3-4, avancé: 4-5)
- Inclus du cardio si objectif perte de poids
- Séances équilibrées push/pull/legs si possible
- Plages de reps adaptées à l'objectif (force: 3-6, hypertrophie: 8-12, endurance: 15-20)`;

      const { data: apiData, error: fnErr } = (await fetch('https://zpxrsmnpcyzafawlweyl.supabase.co/functions/v1/generate-program', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpweHJzbW5wY3l6YWZhd2x3ZXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNTI1MDAsImV4cCI6MjEwNDkyODUwMH0.h76-uAn6f4qwtxIOTUt3sSzMdOSg7BzMIRFkXZW6iq4' }, body: JSON.stringify({ prompt }) })).json();

      if (fnErr) {
        throw new Error(fnErr.message || 'Erreur serveur pendant la génération.');
- ${sessionCount} séances par semaine exactement.
- Crée une vraie stratégie de progression, pas une simple liste d'exercices.
- Adapte les exercices au matériel, au niveau, au temps disponible et aux blessures/contraintes déclarées.
- Ne force pas automatiquement un split push/pull/legs : choisis la structure la plus pertinente pour ${sessionCount} jours.
- Place les mouvements les plus techniques et exigeants avant les isolations, sauf justification.
- Le volume doit rester récupérable : débutant plutôt 2-3 séries de travail par exercice, intermédiaire 3-4 lorsque pertinent, avancé selon le besoin réel.
- Répartis volume et fréquence musculaire selon l'objectif et le niveau.
- Hypertrophie : ne limite pas tout à 8-12 reps ; adapte la plage à l'exercice.
- Force : reps plus basses surtout sur les mouvements principaux, plages modérées sur les accessoires.
- Perte de gras : la musculation reste prioritaire ; ajoute seulement un cardio raisonnable compatible avec la récupération.
- N'impose pas l'échec musculaire sur toutes les séries.
- La première semaine sert de calibration lorsque les charges réelles sont inconnues.
- Si aucune performance fiable n'est fournie, N'INVENTE PAS de charge en kg dans weight_suggestion. Indique une calibration permettant de terminer avec environ 2-3 répétitions en réserve.
- Dans progression_notes, impose une double progression : atteindre le haut de la plage de reps sur toutes les séries avec technique propre et environ 1-2 reps en réserve, puis augmenter légèrement la charge.
- Une seule mauvaise séance ne signifie pas stagnation.
- En cas de baisse répétée : vérifier récupération, sommeil, technique et adhérence avant d'ajuster charge, reps ou volume.
- progression_notes doit aussi expliquer quand réduire temporairement le volume/intensité si fatigue persistante ou performances durablement en baisse.
- Les descriptions techniques doivent être courtes, concrètes et sûres.
- Ne garantis aucun résultat physique ni délai.
- nutrition_notes reste général et n'invente pas une cible calorique précise si elle n'est pas fournie.`;

      const response = await fetch('https://zpxrsmnpcyzafawlweyl.supabase.co/functions/v1/generate-program', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpweHJzbW5wY3l6YWZhd2x3ZXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNTI1MDAsImV4cCI6MjEwNDkyODUwMH0.h76-uAn6f4qwtxIOTUt3sSzMdOSg7BzMIRFkXZW6iq4',
        },
        body: JSON.stringify({ prompt }),
      });

      let apiData: any;
      try {
        apiData = await response.json();
      } catch {
        throw new Error(`Réponse serveur illisible (${response.status})`);
      }

      if (!response.ok) {
        const serverMessage =
          apiData?.error?.message ||
          (typeof apiData?.error === 'string' ? apiData.error : '') ||
          `Erreur serveur (${response.status})`;
        throw new Error(serverMessage);
      }

      const text = apiData?.content?.[0]?.text;
      const text =
        apiData?.content?.[0]?.text ||
        apiData?.data?.content?.[0]?.text ||
        apiData?.text;
      if (typeof text !== 'string' || !text.trim()) {
        throw new Error('Le serveur a renvoyé une réponse vide.');
      }

      // Important : aucune donnée existante n'est modifiée avant cette validation.
      const clean = text.replace(/```json|```/g, '').trim();
      const start = clean.indexOf('{');
      const end = clean.lastIndexOf('}');
      if (start === -1) throw new Error('Format invalide');
      if (end <= start) throw new Error('Format JSON incomplet');
      const prog = JSON.parse(clean.slice(start, end + 1));
      if (!prog.sessions || !Array.isArray(prog.sessions)) throw new Error('Programme invalide');

      if (!prog || typeof prog !== 'object') throw new Error('Programme invalide');
      if (!Array.isArray(prog.sessions)) throw new Error('Programme sans séances');
      if (prog.sessions.length !== sessionCount) {
        throw new Error(`Le programme contient ${prog.sessions.length} séances au lieu de ${sessionCount}`);
      }

      prog.name = typeof prog.name === 'string' && prog.name.trim() ? prog.name.trim() : 'PROGRAMME NOX';
      prog.goal = typeof prog.goal === 'string' && prog.goal.trim() ? prog.goal.trim() : 'Progression personnalisée';
      prog.duration_weeks = Number.isFinite(Number(prog.duration_weeks))
        ? Math.min(12, Math.max(4, Number(prog.duration_weeks)))
        : 8;
      prog.session_length_min = sessionLength;

      prog.sessions.forEach((session: any, sessionIndex: number) => {
        if (!session?.name || typeof session.name !== 'string') {
          throw new Error(`Nom manquant pour la séance ${sessionIndex + 1}`);
        }
        if (!Array.isArray(session.exercises) || session.exercises.length < 3) {
          throw new Error(`La séance "${session.name}" contient trop peu d'exercices`);
        }

        session.duration = Number(session.duration) > 0 ? Number(session.duration) : sessionLength;

        session.exercises.forEach((exercise: any, exerciseIndex: number) => {
          if (!exercise?.name || typeof exercise.name !== 'string') {
            throw new Error(`Exercice invalide dans "${session.name}"`);
          }

          const sets = Number(exercise.sets);
          if (!Number.isFinite(sets) || sets < 1 || sets > 6) {
            throw new Error(`Nombre de séries invalide pour "${exercise.name}"`);
          }

          if (exercise.reps === undefined || exercise.reps === null || !String(exercise.reps).trim()) {
            throw new Error(`Répétitions manquantes pour "${exercise.name}"`);
          }

          exercise.order_index = exerciseIndex + 1;
        });
      });

      // Sauvegarder d'abord le nouveau programme.
      // Si cette insertion échoue, l'ancien programme reste intact.
      const { data: insertedProgram, error: insertError } = await supabase
        .from('workout_programs')
        .insert({
          user_id: user.id,
          name: prog.name,
          description: prog.goal,
          goal: prog.goal,
          days_per_week: sessionCount,
          duration_weeks: prog.duration_weeks,
          is_active: true,
          program_json: prog,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insertError || !insertedProgram?.id) {
        throw new Error(insertError?.message || 'Impossible de sauvegarder le nouveau programme.');
      }

      // Le nouveau programme existe réellement : on peut maintenant désactiver les anciens.
      const { error: deactivateError } = await supabase
        .from('workout_programs')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .neq('id', insertedProgram.id)
        .eq('is_active', true);

      if (deactivateError) {
        // On ne supprime pas le nouveau programme : l'utilisateur ne perd rien.
        // On signale le problème afin qu'il puisse réessayer / que NOX puisse le corriger.
        console.error('Programme créé mais anciens programmes non désactivés:', deactivateError);
      }

      setProgramName(prog.name);
      setDone(true);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message?.includes('séances') ||
        err?.message?.includes('exercice') ||
        err?.message?.includes('JSON')
          ? `Le programme généré n'était pas exploitable : ${err.message} Réessaie.`
          : 'Erreur lors de la génération. Réessaie.',
      );
      const message =
        typeof err?.message === 'string' && err.message.trim()
          ? err.message.trim()
          : 'Erreur inconnue';
      setError(`Impossible de générer un programme exploitable : ${message}. Réessaie.`);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (!profile || generating || done || error) return;

    const timer = setTimeout(() => {
      void generate();
    }, 800);

    return () => clearTimeout(timer);
  }, [profile, generating, done, error]);

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 72, marginBottom: 24 }}>⚡</div>
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.15em', marginBottom: 12 }}>Prêt</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-.02em', marginBottom: 8 }}>TON PLAN EST PRÊT</div>
        <div style={{ fontSize: 15, color: ACCENT, fontWeight: 700, marginBottom: 32 }}>{programName}</div>
        <div style={{ fontSize: 14, color: '#555', marginBottom: 40, lineHeight: 1.6, maxWidth: 300 }}>
          Programme complet avec descriptions détaillées et schémas pour chaque exercice.
          Programme structuré avec progression, volume et consignes adaptés à ton profil.
        </div>
        <button
          onClick={() => navigate('/program')}
          style={{ width: '100%', maxWidth: 320, padding: 18, background: ACCENT, border: 'none', borderRadius: 16, color: '#000', fontWeight: 900, fontSize: 16, cursor: 'pointer', marginBottom: 12 }}
        >
          VOIR MON PROGRAMME →
        </button>
        <button
          onClick={() => navigate('/home')}
          style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14 }}
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 56, marginBottom: 32, animation: 'pulse 1.5s ease-in-out infinite' }}>🧠</div>
      <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.15em', marginBottom: 12 }}>NOX Intelligence</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: '-.02em', marginBottom: 40 }}>
        CONSTRUCTION DU PROGRAMME...
      </div>

      <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 48 }}>
        {STEPS.map((step, i) => (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: i <= stepIdx ? 1 : 0.2, transition: 'opacity .4s' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: i < stepIdx ? ACCENT : i === stepIdx ? ACCENT + '44' : '#1a1a1a', border: '2px solid ' + (i <= stepIdx ? ACCENT : '#1a1a1a'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .4s' }}>
              {i < stepIdx ? <span style={{ fontSize: 12 }}>✓</span> : i === stepIdx ? <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT, animation: 'pulse 1s infinite' }} /> : null}
            </div>
            <div style={{ fontSize: 13, color: i === stepIdx ? '#fff' : i < stepIdx ? ACCENT : '#333', fontWeight: i === stepIdx ? 700 : 400, textAlign: 'left' }}>
              {step}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ background: '#ff444422', border: '1px solid #ff4444', borderRadius: 14, padding: 16, color: '#ff8888', fontSize: 13, marginBottom: 16, maxWidth: 320 }}>
          {error}
          <button
            onClick={() => void generate()}
            disabled={generating}
            style={{ display: 'block', margin: '12px auto 0', padding: '8px 20px', background: '#ff4444', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 800, cursor: generating ? 'default' : 'pointer', opacity: generating ? 0.6 : 1 }}
          >
            {generating ? 'GÉNÉRATION...' : 'RÉESSAYER'}
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: .6; transform: scale(0.95); }
        }
      `}</style>
    </div>
  );
}
