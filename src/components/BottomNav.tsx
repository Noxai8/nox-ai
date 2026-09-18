import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Apple,
  BarChart3,
  Camera,
  Dumbbell,
  Droplets,
  House,
  Plus,
  Ruler,
  Scale,
  ScanLine,
  Utensils,
} from 'lucide-react';

const ACCENT = '#B7FF00';
const BLACK = '#0A0A0A';
const MUTED = '#8A8A8A';

export function BottomNav({ active }: { active: string }) {
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);

  const items = [
    { id: 'home', label: "Aujourd’hui", icon: House, path: '/home' },
    { id: 'nutrition', label: 'Nutrition', icon: Apple, path: '/fuel' },
    { id: 'add', label: '+', icon: Plus, path: '' },
    { id: 'activity', label: 'Activité', icon: Activity, path: '/activity' },
    { id: 'progress', label: 'Progrès', icon: BarChart3, path: '/body' },
  ];

  const actions = [
    { label: 'Repas', icon: Utensils, path: '/fuel?add=meal' },
    { label: 'Scanner', icon: ScanLine, path: '/food-scan' },
    { label: 'Aliment', icon: Apple, path: '/fuel?add=food' },
    { label: 'Eau', icon: Droplets, path: '/fuel?add=water' },
    { label: 'Poids', icon: Scale, path: '/body?add=weight' },
    { label: 'Activité', icon: Activity, path: '/activity?add=activity' },
    { label: 'Entraînement', icon: Dumbbell, path: '/program' },
    { label: 'Mensuration', icon: Ruler, path: '/body?add=measurement' },
    { label: 'Photo de progression', icon: Camera, path: '/body?add=photo' },
  ];

  return (
    <>
      {showAdd && (
        <div
          onClick={() => setShowAdd(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 190, background: 'rgba(0,0,0,.42)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{ width: '100%', maxWidth: 560, background: '#fff', borderRadius: '26px 26px 0 0', padding: '10px 18px max(104px, calc(92px + env(safe-area-inset-bottom)))', boxShadow: '0 -20px 50px rgba(0,0,0,.16)' }}
          >
            <div style={{ width: 42, height: 4, borderRadius: 99, background: '#D8D8D8', margin: '2px auto 18px' }} />
            <div style={{ color: BLACK, fontSize: 20, fontWeight: 950, letterSpacing: '-.03em' }}>AJOUTER</div>
            <div style={{ color: MUTED, fontSize: 12, marginTop: 4, marginBottom: 16 }}>Enregistre quelque chose en quelques secondes.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 9 }}>
              {actions.map(({ label, icon: Icon, path }) => (
                <button
                  key={label}
                  onClick={() => { setShowAdd(false); navigate(path); }}
                  style={{ minHeight: 92, borderRadius: 18, border: '1px solid #ECECEC', background: '#F8F8F8', color: BLACK, cursor: 'pointer', padding: '12px 7px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 9 }}
                >
                  <span style={{ width: 38, height: 38, borderRadius: 13, background: ACCENT, display: 'grid', placeItems: 'center' }}><Icon size={19} /></span>
                  <span style={{ fontSize: 10.5, fontWeight: 850, lineHeight: 1.15 }}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 0, zIndex: 200, width: '100%', maxWidth: 560, background: 'rgba(255,255,255,.96)', backdropFilter: 'blur(18px)', borderTop: '1px solid #ECECEC', padding: '7px 8px max(9px, env(safe-area-inset-bottom))' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', alignItems: 'end' }}>
          {items.map(({ id, label, icon: Icon, path }) => {
            const selected = active === id;
            const central = id === 'add';
            return (
              <button
                key={id}
                aria-label={central ? 'Ajouter' : label}
                onClick={() => central ? setShowAdd(true) : navigate(path)}
                style={{ border: 0, background: 'transparent', color: selected ? BLACK : '#777', cursor: 'pointer', minWidth: 0, padding: central ? '0 0 2px' : '7px 0 2px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
              >
                <span style={{ width: central ? 48 : 30, height: central ? 48 : 30, marginTop: central ? -20 : 0, borderRadius: central ? 16 : 10, background: central ? ACCENT : selected ? '#F0F0F0' : 'transparent', color: BLACK, display: 'grid', placeItems: 'center', boxShadow: central ? '0 8px 22px rgba(0,0,0,.16)' : 'none' }}>
                  <Icon size={central ? 26 : 19} strokeWidth={central ? 2.8 : selected ? 2.5 : 2} />
                </span>
                <span style={{ fontSize: central ? 9 : 9.5, fontWeight: 850, whiteSpace: 'nowrap' }}>{central ? 'Ajouter' : label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
