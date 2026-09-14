import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

type Step = 'intro' | 'consent' | 'photo' | 'goal_desc' | 'generating' | 'result';

export default function NoxFuture() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('intro');
  const [photos, setPhotos] = useState<{ face?: string; side?: string; back?: string }>({});
  const [currentAngle, setCurrentAngle] = useState<'face' | 'side' | 'back'>('face');
  const [goalDesc, setGoalDesc] = useState('');
  const [projection, setProjection] = useState<string | null>(null);
  const [projectionText, setProjectionText] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(({ data }) => setProfile(data));
    // Load existing projection
    supabase.from('future_you_generations').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => {
        if (data?.result_text) {
          setProjectionText(data.result_text);
          if (data.result_image_url) setProjection(data.result_image_url);
        }
      });
  }, [user]);

  const handlePhoto = (angle: 'face' | 'side' | 'back') => {
    setCurrentAngle(angle);
    fileRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotos(p => ({ ...p, [currentAngle]: reader.result as string }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const generate = async () => {
    setStep('generating');
    setError('');
    try {
      // Build context
      const ctx = {
        profile: {
          objective: profile?.goal_type || 'transformation physique',
          current_weight: profile?.starting_weight_kg,
          experience: profile?.experience_level,
          activity: profile?.activity_level,
        },
        goal_description: goalDesc,
        has_photos: Object.keys(photos).length > 0,
      };

      // Call Claude API to generate projection text
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `Tu es NOX, un coach IA de transformation physique ultra-premium et motivant.

Profil utilisateur :
- Objectif : ${ctx.profile.objective}
- Poids actuel : ${ctx.profile.current_weight || '?'} kg
- Niveau : ${ctx.profile.experience || 'débutant'}
- Activité : ${ctx.profile.activity || 'modérée'}
- Description de l'objectif : ${goalDesc}

Génère une projection personnalisée, motivante et réaliste de leur transformation physique si ils restent constants pendant 90 jours. 

Réponds en JSON uniquement avec ce format exact :
{
  "titre": "TON NOX FUTURE",
  "tagline": "Une phrase courte et percutante",
  "en_30_jours": "Description des changements visibles à 30 jours",
  "en_60_jours": "Description des changements à 60 jours",
  "en_90_jours": "Description des changements à 90 jours (objectif)",
  "chiffres_cles": ["Résultat 1", "Résultat 2", "Résultat 3"],
  "message_coach": "Message motivant personnalisé du Coach NOX",
  "avertissement": "Projection indicative. Les résultats varient selon la régularité et la génétique."
}`
          }]
        })
      });

      const data = await response.json();
      const text = data.content?.[0]?.text || '{}';
      let parsed: any = {};
      try {
        const clean = text.replace(/```json|```/g, '').trim();
        parsed = JSON.parse(clean);
      } catch {
        parsed = { titre: 'TON NOX FUTURE', tagline: 'Ta transformation commence maintenant.', message_coach: text };
      }

      const resultText = JSON.stringify(parsed);
      setProjectionText(resultText);

      // Save to DB
      await supabase.from('future_you_generations').insert({
        user_id: user!.id,
        result_text: resultText,
        goal_description: goalDesc,
        created_at: new Date().toISOString(),
      });

      setStep('result');
    } catch (err: any) {
      setError('Erreur lors de la génération. Réessaie.');
      setStep('goal_desc');
    }
  };

  const AngleCard = ({ angle, label, icon }: { angle: 'face' | 'side' | 'back'; label: string; icon: string }) => (
    <button onClick={() => handlePhoto(angle)}
      style={{ flex: 1, aspectRatio: '3/4', background: photos[angle] ? 'transparent' : SURFACE, border: '2px dashed ' + (photos[angle] ? ACCENT : BORDER), borderRadius: 16, cursor: 'pointer', overflow: 'hidden', position: 'relative', padding: 0 }}>
      {photos[angle] ? (
        <img src={photos[angle]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
          <div style={{ fontSize: 32 }}>{icon}</div>
          <div style={{ fontSize: 12, color: '#555', fontWeight: 700 }}>{label}</div>
          <div style={{ fontSize: 10, color: '#333' }}>Appuyer pour ajouter</div>
        </div>
      )}
      {photos[angle] && (
        <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: ACCENT, color: '#000', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 800 }}>✓ {label}</div>
        </div>
      )}
    </button>
  );

  // Parse projection
  let proj: any = {};
  try { proj = JSON.parse(projectionText); } catch {}

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 80 }}>
      <input ref={fileRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={handleFileChange} />

      {/* INTRO */}
      {step === 'intro' && (
        <div style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>🔮</div>
          <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.15em', marginBottom: 12 }}>Intelligence NOX</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: '-.02em', lineHeight: 1.1, marginBottom: 16 }}>
            NOX<br />FUTURE
          </div>
          <div style={{ fontSize: 16, color: '#555', lineHeight: 1.6, marginBottom: 40, maxWidth: 300, margin: '0 auto 40px' }}>
            Découvre ce que tu peux devenir si tu restes constants. NOX projette ta transformation sur 90 jours.
          </div>

          {projectionText && (
            <div style={{ background: SURFACE, border: '1px solid ' + ACCENT + '44', borderRadius: 16, padding: 16, marginBottom: 24, textAlign: 'left' }}>
              <div style={{ fontSize: 12, color: ACCENT, fontWeight: 800, marginBottom: 8 }}>✓ Projection existante</div>
              <div style={{ fontSize: 13, color: '#fff' }}>{proj.tagline || 'Ta projection est prête.'}</div>
              <button onClick={() => setStep('result')} style={{ marginTop: 12, background: ACCENT, color: '#000', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>VOIR MA PROJECTION →</button>
            </div>
          )}

          <button onClick={() => setStep('consent')} style={{ width: '100%', padding: 18, background: ACCENT, border: 'none', borderRadius: 16, color: '#000', fontWeight: 900, fontSize: 16, cursor: 'pointer', maxWidth: 320 }}>
            CRÉER MA PROJECTION
          </button>
        </div>
      )}

      {/* CONSENT */}
      {step === 'consent' && (
        <div style={{ padding: '40px 24px' }}>
          <button onClick={() => setStep('intro')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14, marginBottom: 24 }}>← Retour</button>
          <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Confidentialité</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 24 }}>TES PHOTOS SONT PRIVÉES</div>
          {[
            { icon: '🔒', text: 'Tes photos restent strictement privées et ne sont jamais partagées' },
            { icon: '🤖', text: 'Elles sont analysées par l\'IA uniquement pour générer ta projection' },
            { icon: '🗑️', text: 'Tu peux supprimer tes données à tout moment depuis les paramètres' },
            { icon: '🚫', text: 'Tes photos ne servent jamais à entraîner un modèle IA sans ton accord' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ fontSize: 24, flexShrink: 0 }}>{icon}</div>
              <div style={{ fontSize: 14, color: '#888', lineHeight: 1.5 }}>{text}</div>
            </div>
          ))}
          <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 32, fontSize: 12, color: '#555', lineHeight: 1.5 }}>
            Les photos sont facultatives. Tu peux générer ta projection en décrivant simplement ton objectif.
          </div>
          <button onClick={() => setStep('photo')} style={{ width: '100%', padding: 18, background: ACCENT, border: 'none', borderRadius: 16, color: '#000', fontWeight: 900, fontSize: 16, cursor: 'pointer' }}>
            J'ACCEPTE — CONTINUER
          </button>
        </div>
      )}

      {/* PHOTO */}
      {step === 'photo' && (
        <div style={{ padding: '40px 24px' }}>
          <button onClick={() => setStep('consent')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14, marginBottom: 24 }}>← Retour</button>
          <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Optionnel</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 8 }}>AJOUTE TES PHOTOS</div>
          <div style={{ fontSize: 14, color: '#555', marginBottom: 24, lineHeight: 1.5 }}>
            Les photos permettent une projection plus précise. Debout, bonne lumière, tenue ajustée.
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            <AngleCard angle="face" label="Face" icon="👤" />
            <AngleCard angle="side" label="Profil" icon="🚶" />
            <AngleCard angle="back" label="Dos" icon="🔄" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={() => setStep('goal_desc')} style={{ width: '100%', padding: 18, background: ACCENT, border: 'none', borderRadius: 16, color: '#000', fontWeight: 900, fontSize: 16, cursor: 'pointer' }}>
              {Object.keys(photos).length > 0 ? `CONTINUER AVEC ${Object.keys(photos).length} PHOTO(S)` : 'CONTINUER SANS PHOTO'}
            </button>
          </div>
        </div>
      )}

      {/* GOAL DESC */}
      {step === 'goal_desc' && (
        <div style={{ padding: '40px 24px' }}>
          <button onClick={() => setStep('photo')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14, marginBottom: 24 }}>← Retour</button>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 8 }}>DÉCRIS TON OBJECTIF</div>
          <div style={{ fontSize: 14, color: '#555', marginBottom: 24, lineHeight: 1.5 }}>
            Dis à NOX exactement ce que tu veux atteindre. Plus c'est précis, plus la projection sera personnalisée.
          </div>

          <div style={{ background: SURFACE, borderRadius: 16, border: '1px solid ' + BORDER, padding: 4, marginBottom: 16 }}>
            <textarea value={goalDesc} onChange={e => setGoalDesc(e.target.value)}
              placeholder="Ex: Je veux perdre 10kg de graisse et voir mes abdos. Je veux avoir un physique sec et musclé, comme un athlète. J'ai 3 mois pour y arriver et je suis prêt à tout donner..."
              style={{ width: '100%', minHeight: 150, background: 'transparent', border: 'none', color: '#fff', fontSize: 15, padding: '16px', resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6, fontFamily: 'inherit' }} />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
            {['Perdre du gras', 'Prendre du muscle', 'Abdos visibles', 'Corps athlétique', 'Être sec et défini', 'Plus de force'].map(s => (
              <button key={s} onClick={() => setGoalDesc(p => p ? p + ', ' + s.toLowerCase() : s)}
                style={{ padding: '8px 14px', background: 'transparent', border: '1px solid ' + BORDER, borderRadius: 20, color: '#555', fontSize: 12, cursor: 'pointer' }}>
                + {s}
              </button>
            ))}
          </div>

          {error && <div style={{ background: '#ff4444' + '22', border: '1px solid #ff4444', borderRadius: 12, padding: 14, color: '#ff4444', fontSize: 13, marginBottom: 16 }}>{error}</div>}

          <button onClick={generate} disabled={!goalDesc.trim()}
            style={{ width: '100%', padding: 18, background: goalDesc.trim() ? ACCENT : '#1a1a1a', border: 'none', borderRadius: 16, color: goalDesc.trim() ? '#000' : '#333', fontWeight: 900, fontSize: 16, cursor: goalDesc.trim() ? 'pointer' : 'not-allowed' }}>
            GÉNÉRER MA PROJECTION →
          </button>
        </div>
      )}

      {/* GENERATING */}
      {step === 'generating' && (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 24, animation: 'spin 2s linear infinite' }}>🔮</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 16 }}>NOX ANALYSE...</div>
          {['Analyse de ton profil...', 'Construction de ta trajectoire...', 'Projection sur 90 jours...', 'Finalisation de ta vision...'].map((msg, i) => (
            <div key={msg} style={{ fontSize: 14, color: i === 0 ? ACCENT : '#333', marginBottom: 8, transition: 'color 1s' }}>{msg}</div>
          ))}
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* RESULT */}
      {step === 'result' && (
        <div style={{ padding: '24px 20px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.15em', marginBottom: 8 }}>Intelligence NOX</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-.02em' }}>{proj.titre || 'TON NOX FUTURE'}</div>
            <div style={{ fontSize: 16, color: ACCENT, fontWeight: 700, marginTop: 8 }}>{proj.tagline || ''}</div>
          </div>

          {/* Photo if exists */}
          {photos.face && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <img src={photos.face} style={{ width: '100%', borderRadius: 16, aspectRatio: '3/4', objectFit: 'cover' }} />
                <div style={{ fontSize: 12, color: '#555', marginTop: 8, fontWeight: 700 }}>AUJOURD'HUI</div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: SURFACE, borderRadius: 16, border: '2px dashed ' + ACCENT + '44', aspectRatio: '3/4', textAlign: 'center', padding: 16 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🔮</div>
                <div style={{ fontSize: 13, color: ACCENT, fontWeight: 800 }}>OBJECTIF</div>
                <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>Projection IA — 90 jours</div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div style={{ marginBottom: 24 }}>
            {[
              { day: 'J+30', content: proj.en_30_jours, color: '#4488ff' },
              { day: 'J+60', content: proj.en_60_jours, color: '#ffaa00' },
              { day: 'J+90', content: proj.en_90_jours, color: ACCENT },
            ].filter(t => t.content).map(({ day, content, color }) => (
              <div key={day} style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: color + '22', border: '2px solid ' + color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 900, color }}>{day}</span>
                  </div>
                  <div style={{ width: 2, flex: 1, background: '#1a1a1a', margin: '8px 0' }} />
                </div>
                <div style={{ flex: 1, paddingTop: 8 }}>
                  <div style={{ fontSize: 14, color: '#ccc', lineHeight: 1.6 }}>{content}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Key numbers */}
          {proj.chiffres_cles && (
            <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 16 }}>RÉSULTATS PROJETÉS</div>
              {proj.chiffres_cles.map((c: string, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT, flexShrink: 0 }} />
                  <div style={{ fontSize: 14, color: '#ccc' }}>{c}</div>
                </div>
              ))}
            </div>
          )}

          {/* Coach message */}
          {proj.message_coach && (
            <div style={{ background: ACCENT + '11', border: '1px solid ' + ACCENT + '44', borderRadius: 16, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: ACCENT, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>MESSAGE DE TON COACH NOX</div>
              <div style={{ fontSize: 14, color: '#ccc', lineHeight: 1.6, fontStyle: 'italic' }}>"{proj.message_coach}"</div>
            </div>
          )}

          {/* Disclaimer */}
          <div style={{ fontSize: 11, color: '#333', textAlign: 'center', lineHeight: 1.5, marginBottom: 24 }}>
            {proj.avertissement || 'Projection visuelle indicative générée par IA. Les résultats réels dépendent de ta régularité, ta génétique et ton mode de vie.'}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={() => { setPhotos({}); setGoalDesc(''); setStep('consent'); }}
              style={{ width: '100%', padding: 16, background: ACCENT, border: 'none', borderRadius: 14, color: '#000', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
              NOUVELLE PROJECTION
            </button>
            <button onClick={() => setStep('intro')}
              style={{ width: '100%', padding: 16, background: 'transparent', border: '1px solid ' + BORDER, borderRadius: 14, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              RETOUR À L'ACCUEIL
            </button>
          </div>
        </div>
      )}

      <BottomNav active="future" />
    </div>
  );
}
