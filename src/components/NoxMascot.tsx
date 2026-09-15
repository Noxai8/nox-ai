import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const ACCENT = '#c8ff00';

const MESSAGES = {
  default: [
    "Allez, on lâche rien aujourd'hui 💪",
    "Tu es plus fort que tes excuses.",
    "Chaque série compte. Chaque repas compte.",
    "La régularité bat le talent. Toujours.",
    "Aujourd'hui tu poses les fondations de demain.",
  ],
  training: [
    "C'est en salle que ça se passe. Let's go ⚡",
    "Chaque kilo de plus c'est une victoire.",
    "Pas de douleur, pas de progrès. Tu sais ce qu'il te reste à faire.",
    "Aujourd'hui tu bats ton record d'hier.",
  ],
  nutrition: [
    "La nutrition c'est 70% du boulot. Mange bien.",
    "Tes muscles se construisent à table autant qu'en salle.",
    "Protéines, protéines, protéines. T'as compris le message ?",
    "Un bon repas c'est un entraînement invisible.",
  ],
  rest: [
    "Repos aujourd'hui = performance demain. C'est scientifique.",
    "Le muscle se construit pendant la récup, pas pendant l'effort.",
    "Profite de cette journée. Tu l'as mérité.",
    "Récupère bien. NOX surveille ta trajectoire.",
  ],
  streak: [
    "Streak en feu 🔥 Continue comme ça !",
    "La régularité est ta super-puissance.",
    "Chaque jour de suite t'éloigne de l'abandon.",
  ],
  pr: [
    "NOUVEAU RECORD 🏆 T'es en train de réécrire tes limites.",
    "PR battu. Le toi d'hier vient de perdre.",
    "Les records sont faits pour être battus. Tu l'as prouvé.",
  ],
};

export default function NoxMascot({ context = 'default', compact = false }: { context?: keyof typeof MESSAGES; compact?: boolean }) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(true);
  const [animState, setAnimState] = useState<'idle' | 'talk' | 'celebrate'>('idle');

  useEffect(() => {
    const msgs = MESSAGES[context] || MESSAGES.default;
    setMessage(msgs[Math.floor(Math.random() * msgs.length)]);
    setAnimState('talk');
    const t = setTimeout(() => setAnimState('idle'), 2000);
    return () => clearTimeout(t);
  }, [context]);

  if (!visible) return null;

  const size = compact ? 48 : 64;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      gap: 12,
      padding: compact ? '12px 16px' : '16px 20px',
      background: '#0d0d0d',
      border: '1px solid #1a1a1a',
      borderRadius: compact ? 14 : 20,
      position: 'relative',
    }}>
      {/* Mascotte SVG animée */}
      <div style={{ flexShrink: 0, position: 'relative' }}>
        <svg width={size} height={size} viewBox="0 0 64 64" style={{
          animation: animState === 'talk' ? 'mascotBob 0.3s ease infinite alternate' :
            animState === 'celebrate' ? 'mascotSpin 0.5s ease' : 'mascotFloat 3s ease-in-out infinite',
        }}>
          {/* Corps */}
          <rect x="16" y="24" width="32" height="28" rx="10" fill="#1a1a1a" stroke={ACCENT} strokeWidth="2" />
          {/* Tête */}
          <circle cx="32" cy="18" r="12" fill="#111" stroke={ACCENT} strokeWidth="2" />
          {/* Yeux */}
          <circle cx="27" cy="16" r="2.5" fill={ACCENT} />
          <circle cx="37" cy="16" r="2.5" fill={ACCENT} />
          {/* Pupilles */}
          <circle cx="28" cy="16.5" r="1" fill="#000" />
          <circle cx="38" cy="16.5" r="1" fill="#000" />
          {/* Bouche selon état */}
          {animState === 'celebrate' ? (
            <path d="M 26 22 Q 32 27 38 22" stroke={ACCENT} strokeWidth="2" fill="none" strokeLinecap="round" />
          ) : (
            <path d="M 27 21 Q 32 24 37 21" stroke={ACCENT} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          )}
          {/* Logo NOX sur le corps */}
          <text x="32" y="42" textAnchor="middle" fill={ACCENT} fontSize="8" fontWeight="900" letterSpacing="1">NOX</text>
          {/* Bras */}
          <rect x="6" y="28" width="10" height="5" rx="2.5" fill="#1a1a1a" stroke={ACCENT} strokeWidth="1.5" style={{ transformOrigin: '16px 30px', animation: animState === 'talk' ? 'armWave 0.4s ease infinite alternate' : 'none' }} />
          <rect x="48" y="28" width="10" height="5" rx="2.5" fill="#1a1a1a" stroke={ACCENT} strokeWidth="1.5" />
          {/* Jambes */}
          <rect x="22" y="50" width="8" height="10" rx="4" fill="#1a1a1a" stroke={ACCENT} strokeWidth="1.5" />
          <rect x="34" y="50" width="8" height="10" rx="4" fill="#1a1a1a" stroke={ACCENT} strokeWidth="1.5" />
          {/* Antenne */}
          <line x1="32" y1="6" x2="32" y2="1" stroke={ACCENT} strokeWidth="1.5" />
          <circle cx="32" cy="1" r="2" fill={ACCENT}>
            <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
          </circle>
        </svg>
        <style>{`
          @keyframes mascotFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
          @keyframes mascotBob { 0% { transform: scaleY(1); } 100% { transform: scaleY(0.95); } }
          @keyframes mascotSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          @keyframes armWave { 0% { transform: rotate(-15deg); } 100% { transform: rotate(15deg); } }
        `}</style>
      </div>

      {/* Bulle de message */}
      <div style={{ flex: 1 }}>
        <div style={{
          background: '#141414',
          border: '1px solid #222',
          borderRadius: '16px 16px 16px 4px',
          padding: compact ? '10px 14px' : '12px 16px',
          position: 'relative',
        }}>
          <div style={{ fontSize: compact ? 12 : 13, color: '#ccc', lineHeight: 1.5 }}>{message}</div>
        </div>
      </div>

      {/* Bouton fermer */}
      <button onClick={() => setVisible(false)}
        style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>
        ×
      </button>
    </div>
  );
}
