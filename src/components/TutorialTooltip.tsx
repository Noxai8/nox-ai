import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const ACCENT = '#c8ff00';

// Toutes les infobulles tutoriel par page
export const TUTORIALS: Record<string, { title: string; desc: string; icon: string }> = {
  home: {
    icon: '⚡',
    title: 'Bienvenue sur NOX',
    desc: 'Voici ton tableau de bord. Tu vois ton NOX Score, ta séance du jour, tes calories et tes stats de la semaine. Tape "Morning Brief" pour un message personnalisé de ton coach IA.',
  },
  program: {
    icon: '📋',
    title: 'Ton programme',
    desc: 'NOX a généré un programme sur mesure. Clique sur une séance pour la démarrer. Appuie sur un exercice pour voir la technique détaillée avec démo.',
  },
  training: {
    icon: '🏋️',
    title: 'Séance live',
    desc: 'Entre ton poids et tes reps, puis valide. NOX détecte automatiquement tes records et ajuste tes charges semaine après semaine.',
  },
  fuel: {
    icon: '🥗',
    title: 'Journal alimentaire',
    desc: 'Scanne tes repas en photo, entre un code-barres ou cherche un aliment. NOX calcule tes macros et ton objectif calorique selon ta vraie biologie.',
  },
  coach: {
    icon: '🤖',
    title: 'Coach IA',
    desc: 'Ton coach connaît tout de toi — séances, poids, calories, humeur. Pose-lui n\'importe quelle question sur ton entraînement ou ta nutrition.',
  },
  body: {
    icon: '📊',
    title: 'Suivi corporel',
    desc: 'Enregistre ton poids et tes mensurations régulièrement. NOX trace ton évolution et calcule ton TDEE réel sur la durée.',
  },
  future: {
    icon: '🔮',
    title: 'NOX Future',
    desc: 'Envoie une photo de toi et décris ton objectif. L\'IA projette à quoi tu ressembleras dans 30, 60 et 90 jours si tu restes constant.',
  },
  play: {
    icon: '🏅',
    title: 'Gamification',
    desc: 'Gagne de l\'XP à chaque séance, PR et check-in. Débloque des badges, monte en niveau et grimpe dans le classement.',
  },
  'weekly-review': {
    icon: '📋',
    title: 'Bilan hebdomadaire',
    desc: 'Chaque semaine, NOX analyse tes progrès et propose d\'adapter ton programme. Tu valides ou ignores les changements — tu restes maître.',
  },
  'fuel-ai': {
    icon: '🧊',
    title: 'Fuel IA',
    desc: 'Analyse ton frigo en photo, génère un plan repas selon ton budget, ou obtiens une liste de courses optimisée. L\'IA nutritionniste de NOX.',
  },
};

interface Props {
  page: keyof typeof TUTORIALS;
}

export default function TutorialTooltip({ page }: Props) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);

  const tutorial = TUTORIALS[page];

  useEffect(() => {
    if (!user || !tutorial) return;
    // Vérifier si l'utilisateur est nouveau (compte < 7 jours) et n'a pas vu ce tooltip
    const key = `nox_tutorial_${page}_${user.id}`;
    const seen = localStorage.getItem(key);
    if (seen) return;

    // Vérifier si le compte est nouveau
    supabase.from('profiles').select('created_at, onboarding_completed').eq('id', user.id).maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const daysSince = Math.floor((Date.now() - new Date(data.created_at).getTime()) / 86400000);
        if (daysSince <= 30 && data.onboarding_completed) {
          setTimeout(() => setVisible(true), 800); // Délai léger pour laisser la page charger
        }
      });
  }, [user, page]);

  const dismiss = () => {
    const key = `nox_tutorial_${page}_${user!.id}`;
    localStorage.setItem(key, '1');
    setVisible(false);
  };

  if (!visible || !tutorial) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 90,
      left: 16,
      right: 16,
      zIndex: 500,
      maxWidth: 480,
      margin: '0 auto',
      background: '#0d0d0d',
      border: '1px solid ' + ACCENT + '44',
      borderRadius: 18,
      padding: '16px 20px',
      boxShadow: '0 8px 32px rgba(0,0,0,.6), 0 0 0 1px ' + ACCENT + '22',
      animation: 'slideUp .3s ease',
    }}>
      <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ fontSize: 28, flexShrink: 0 }}>{tutorial.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: ACCENT, marginBottom: 4 }}>{tutorial.title}</div>
          <div style={{ fontSize: 12, color: '#aaa', lineHeight: 1.6 }}>{tutorial.desc}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button onClick={dismiss}
          style={{ flex: 1, padding: '10px 0', background: 'transparent', border: '1px solid #1a1a1a', borderRadius: 10, color: '#555', fontSize: 12, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>
          Fermer
        </button>
        <button onClick={dismiss}
          style={{ flex: 2, padding: '10px 0', background: ACCENT, border: 'none', borderRadius: 10, color: '#000', fontSize: 12, fontWeight: 900, cursor: 'pointer', touchAction: 'manipulation' }}>
          J'ai compris ✓
        </button>
      </div>

      {/* Badge "Nouveau" */}
      <div style={{ position: 'absolute', top: -8, right: 16, background: ACCENT, color: '#000', fontSize: 9, fontWeight: 900, padding: '3px 8px', borderRadius: 20, letterSpacing: '.06em' }}>
        GUIDE
      </div>
    </div>
  );
}
