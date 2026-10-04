import { useState } from 'react';
import { Check, Copy, KeyRound } from 'lucide-react';

// Outil interne : génère une paire de clés VAPID (Web Push) dans le navigateur.
// WebCrypto, courbe P-256. Rien n'est envoyé : les clés n'existent que sur cet écran.

const b64url = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  bytes.forEach(b => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export default function VapidKeys() {
  const [keys, setKeys] = useState<{ publicKey: string; privateKey: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState('');

  const generate = async () => {
    try {
      const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
      const rawPublic = await crypto.subtle.exportKey('raw', pair.publicKey);
      const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
      setKeys({ publicKey: b64url(rawPublic), privateKey: jwk.d as string });
    } catch {
      setError('Ton navigateur ne permet pas de générer les clés. Essaie avec Chrome ou Safari à jour.');
    }
  };

  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1800);
  };

  const box: React.CSSProperties = { background: '#232624', border: '1px solid #4A4F4B', borderRadius: 20, padding: 20, marginBottom: 14 };
  const btn = (primary: boolean): React.CSSProperties => ({
    width: '100%', padding: 16, border: primary ? 0 : '1px solid #414642', borderRadius: 14, cursor: 'pointer',
    background: primary ? '#C8FF00' : '#191C1A', color: primary ? '#090B0A' : '#FFFFFF', fontWeight: 800, fontSize: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  });

  const KeyBlock = ({ step, name, value, secret }: { step: string; name: string; value: string; secret?: boolean }) => (
    <div style={box}>
      <div style={{ color: '#747A76', fontSize: 11, fontWeight: 900, letterSpacing: '.09em', marginBottom: 6 }}>{step}</div>
      <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 10 }}>{name}</div>
      <div style={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all', color: '#A5AAA6', background: '#191C1A', borderRadius: 12, padding: 12, marginBottom: 12, userSelect: secret ? 'none' : 'text' }}>
        {secret ? '•'.repeat(43) + '  (masquée : utilise le bouton Copier)' : value}
      </div>
      <button style={btn(true)} onClick={() => copy(name, value)}>
        {copied === name ? <><Check size={16} /> Copié</> : <><Copy size={16} /> Copier</>}
      </button>
      {secret && <div style={{ marginTop: 10, color: '#E9C2C2', fontSize: 12, lineHeight: 1.5 }}>Secret : à coller uniquement dans Supabase. Ne l’envoie jamais à personne.</div>}
    </div>
  );

  return (
    <div style={{ minHeight: '100dvh', background: '#090B0A', color: '#FFFFFF' }}>
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '44px 16px 60px', boxSizing: 'border-box' }}>
        <KeyRound size={26} color="#C8FF00" />
        <h1 style={{ margin: '12px 0 8px', fontSize: 'clamp(28px,5vw,38px)', fontWeight: 850, letterSpacing: '-.04em' }}>Clés de notifications</h1>
        <p style={{ color: '#A5AAA6', fontSize: 14, lineHeight: 1.55, margin: '0 0 22px' }}>
          Les codes sont créés dans ton navigateur. Rien n’est envoyé ni enregistré : si tu quittes la page, ils disparaissent.
        </p>

        {error && <div style={{ ...box, color: '#E9C2C2' }}>{error}</div>}

        {!keys ? (
          <button style={btn(true)} onClick={generate}><KeyRound size={16} /> Générer mes clés</button>
        ) : (
          <>
            <KeyBlock step="À COLLER DANS SUPABASE  ·  ET À M’ENVOYER" name="VAPID_PUBLIC_KEY" value={keys.publicKey} />
            <KeyBlock step="À COLLER DANS SUPABASE UNIQUEMENT" name="VAPID_PRIVATE_KEY" value={keys.privateKey} secret />
            <div style={box}>
              <div style={{ color: '#747A76', fontSize: 11, fontWeight: 900, letterSpacing: '.09em', marginBottom: 6 }}>À COLLER DANS SUPABASE</div>
              <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 6 }}>VAPID_SUBJECT</div>
              <div style={{ color: '#A5AAA6', fontSize: 13 }}>mailto: suivi de ton email, par exemple <b style={{ color: '#FFFFFF' }}>mailto:contact@noxai.fr</b></div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
