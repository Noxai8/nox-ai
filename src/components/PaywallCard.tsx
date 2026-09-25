import { useNavigate } from 'react-router-dom';

const ACCENT = '#C8FF00';
const BLACK  = '#0B0B0B';
const LIME   = '#F0FFD0';

interface Props {
  feature: string;
  description: string;
  compact?: boolean;
}

export default function PaywallCard({ feature, description, compact = false }: Props) {
  const navigate = useNavigate();

  if (compact) {
    return (
      <div style={{ background: LIME, border: '1px solid #DDF59C', borderRadius: 16, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 900, color: '#687600' }}>{feature} · NOX PRO</div>
          <div style={{ fontSize: 11, color: '#69715F', marginTop: 2 }}>{description}</div>
        </div>
        <button onClick={() => navigate('/subscribe')}
          style={{ padding: '8px 14px', background: BLACK, border: 0, borderRadius: 12, color: ACCENT, fontSize: 11, fontWeight: 900, cursor: 'pointer', flexShrink: 0, marginLeft: 12 }}>
          VOIR PRO
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: BLACK, borderRadius: 24, padding: 24, textAlign: 'center' }}>
      <div style={{ width: 52, height: 52, borderRadius: 18, background: ACCENT, display: 'grid', placeItems: 'center', margin: '0 auto 16px', fontSize: 24 }}>
        N
      </div>
      <div style={{ fontSize: 10, fontWeight: 900, color: '#888', letterSpacing: '.12em', marginBottom: 8 }}>NOX PRO</div>
      <div style={{ fontSize: 22, fontWeight: 950, color: '#fff', lineHeight: 1.05, letterSpacing: '-.03em', marginBottom: 8 }}>
        {feature}
      </div>
      <div style={{ fontSize: 13, color: '#888', lineHeight: 1.5, marginBottom: 20 }}>{description}</div>
      <button onClick={() => navigate('/subscribe')}
        style={{ width: '100%', padding: '16px 0', background: ACCENT, border: 0, borderRadius: 16, color: BLACK, fontWeight: 950, fontSize: 14, cursor: 'pointer' }}>
        PASSER À NOX PRO
      </button>
      <div style={{ marginTop: 12, fontSize: 11, color: '#666' }}>Essai gratuit 30 jours · Sans engagement</div>
    </div>
  );
}
