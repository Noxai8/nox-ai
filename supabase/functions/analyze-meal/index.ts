import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

async function requirePro(req: Request): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'UNAUTHENTICATED' }), { status: 401, headers: corsHeaders })
  }
  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: 'UNAUTHENTICATED' }), { status: 401, headers: corsHeaders })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: profile } = await admin.from('profiles').select('subscription_plan, trial_ends_at').eq('id', user.id).maybeSingle()
  const plan = profile?.subscription_plan
  const trialActive = profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date()
  const isPro = trialActive || plan === 'pro' || plan === 'nox' || plan === 'pro_plus' || plan === 'ultra'
  if (!isPro) return new Response(JSON.stringify({ error: 'PRO_REQUIRED' }), { status: 403, headers: corsHeaders })
  return { userId: user.id }
}

type AnalyzeMode = 'meal' | 'fridge'

function promptFor(mode: AnalyzeMode) {
  if (mode === 'fridge') {
    return `Tu analyses une photo de réfrigérateur ou de provisions pour une application de nutrition.

Règles importantes :
- Identifie uniquement ce qui est raisonnablement visible. N'invente aucun aliment caché.
- Si un produit est incertain, indique une confiance faible.
- N'invente pas de poids précis à partir d'une photo.
- Utilise une quantité visuelle approximative courte si utile.
- "etat" doit être :
  - "utilisable" si les aliments visibles permettent raisonnablement de construire au moins un repas équilibré ;
  - "insuffisant" si quelques aliments sont présents mais qu'il manque des éléments importants ;
  - "peu_adapte" si les aliments visibles sont surtout peu adaptés à un plan nutritionnel cohérent ;
  - "vide" si aucun aliment exploitable n'est visible.
- Ne génère PAS de recette ni de plan repas ici.
- Les catégories autorisées sont : "proteine", "feculent", "legume", "fruit", "produit_laitier", "matiere_grasse", "boisson", "condiment", "autre".
- Réponds UNIQUEMENT avec un JSON valide.
- Aucun markdown.
- Aucun texte avant ou après le JSON.

Format exact :
{
  "mode": "fridge",
  "etat": "utilisable",
  "resume": "Résumé très court de ce qui est visible",
  "aliments": [
    {
      "nom": "Œufs",
      "quantite_estimee": "environ 6",
      "categorie": "proteine",
      "confiance": "haute"
    }
  ],
  "manques": ["légumes"],
  "fiabilite": "haute",
  "note": "Courte remarque utile"
}`
  }

  return `Tu analyses la photo d'un repas pour une application de nutrition.

Règles :
- Identifie les aliments visibles.
- Estime les portions uniquement à partir de ce qui est visible.
- Estime les calories, protéines, glucides et lipides.
- Les valeurs nutritionnelles sont des estimations.
- N'invente pas une précision impossible à déduire de l'image.
- Réponds UNIQUEMENT avec un JSON valide.
- Aucun markdown.
- Aucun texte avant ou après le JSON.

Format exact :
{
  "mode": "meal",
  "description": "Nom court du repas",
  "aliments": [
    {
      "nom": "aliment",
      "quantite": "150 g",
      "kcal": 200,
      "protein": 20,
      "carbs": 15,
      "fat": 5
    }
  ],
  "total": {
    "kcal": 500,
    "protein": 40,
    "carbs": 30,
    "fat": 15
  },
  "fiabilite": "haute",
  "note": "Courte remarque sur l'estimation"
}`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Méthode non autorisée.' }), { status: 405, headers: jsonHeaders })

  const check = await requirePro(req)
  if (check instanceof Response) return check

  try {
    let body: any
    try { body = await req.json() } catch {
      return new Response(JSON.stringify({ error: 'Body JSON invalide.' }), { status: 400, headers: jsonHeaders })
    }

    const receivedImage =
      typeof body?.base64 === 'string' ? body.base64 :
      typeof body?.image === 'string' ? body.image :
      typeof body?.imageBase64 === 'string' ? body.imageBase64 :
      typeof body?.photoBase64 === 'string' ? body.photoBase64 : ''

    let mime = typeof body?.mime === 'string' ? body.mime : typeof body?.mimeType === 'string' ? body.mimeType : 'image/jpeg'
    const mode: AnalyzeMode = body?.mode === 'fridge' ? 'fridge' : 'meal'

    if (!receivedImage) {
      return new Response(JSON.stringify({ error: 'Image manquante.', receivedFields: Object.keys(body ?? {}) }), { status: 400, headers: jsonHeaders })
    }

    let cleanBase64 = receivedImage
    const dataUrlMatch = receivedImage.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s)
    if (dataUrlMatch) { mime = dataUrlMatch[1]; cleanBase64 = dataUrlMatch[2] }
    cleanBase64 = cleanBase64.replace(/\s/g, '')

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedMimes.includes(mime)) return new Response(JSON.stringify({ error: `Format image non pris en charge : ${mime}` }), { status: 400, headers: jsonHeaders })
    if (cleanBase64.length < 100) return new Response(JSON.stringify({ error: 'Image vide ou invalide.' }), { status: 400, headers: jsonHeaders })

    const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
    if (!ANTHROPIC_KEY) return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY manquante.' }), { status: 500, headers: jsonHeaders })

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-workspace-id': 'wrkspc_01L3cb9d5iNZv6pGhXFb1jW2',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: mode === 'fridge' ? 1800 : 1200,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: mime, data: cleanBase64 } },
          { type: 'text', text: promptFor(mode) }
        ]}],
      }),
    })

    const rawResponse = await response.text()
    let anthropicData: any = null
    try { anthropicData = JSON.parse(rawResponse) } catch {
      return new Response(JSON.stringify({ error: 'Réponse Anthropic invalide.' }), { status: 502, headers: jsonHeaders })
    }

    if (!response.ok) return new Response(JSON.stringify({ error: anthropicData?.error?.message ?? `Erreur Anthropic (${response.status})` }), { status: 502, headers: jsonHeaders })

    const text = anthropicData?.content?.filter((i: any) => i?.type === 'text')?.map((i: any) => i?.text ?? '')?.join('\n')?.trim() ?? ''
    if (!text) return new Response(JSON.stringify({ error: 'Aucune analyse retournée par l\'IA.' }), { status: 502, headers: jsonHeaders })

    let parsed: any = null
    try { parsed = JSON.parse(text) } catch {
      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim()
      try { parsed = JSON.parse(cleaned) } catch {
        const start = cleaned.indexOf('{'), end = cleaned.lastIndexOf('}')
        if (start !== -1 && end > start) try { parsed = JSON.parse(cleaned.slice(start, end + 1)) } catch { parsed = null }
      }
    }
    if (!parsed) return new Response(JSON.stringify({ error: 'JSON IA invalide.' }), { status: 502, headers: jsonHeaders })

    if (mode === 'fridge') {
      const allowedStates = new Set(['utilisable', 'insuffisant', 'peu_adapte', 'vide'])
      if (!allowedStates.has(parsed?.etat) || !Array.isArray(parsed?.aliments)) {
        return new Response(JSON.stringify({ error: 'Analyse du frigo incomplète.' }), { status: 502, headers: jsonHeaders })
      }
      return new Response(JSON.stringify(parsed), { status: 200, headers: jsonHeaders })
    }

    if (!parsed?.total || !Array.isArray(parsed?.aliments)) {
      return new Response(JSON.stringify({ error: 'Analyse du repas incomplète.' }), { status: 502, headers: jsonHeaders })
    }

    parsed.total = { kcal: Number(parsed.total?.kcal) || 0, protein: Number(parsed.total?.protein) || 0, carbs: Number(parsed.total?.carbs) || 0, fat: Number(parsed.total?.fat) || 0 }
    parsed.aliments = parsed.aliments.map((a: any) => ({ nom: typeof a?.nom === 'string' ? a.nom : 'Aliment', quantite: typeof a?.quantite === 'string' ? a.quantite : '', kcal: Number(a?.kcal) || 0, protein: Number(a?.protein) || 0, carbs: Number(a?.carbs) || 0, fat: Number(a?.fat) || 0 }))
    if (typeof parsed.description !== 'string') parsed.description = 'Repas analysé'
    if (typeof parsed.fiabilite !== 'string') parsed.fiabilite = 'moyenne'
    if (typeof parsed.note !== 'string') parsed.note = ''
    parsed.mode = 'meal'

    return new Response(JSON.stringify(parsed), { status: 200, headers: jsonHeaders })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'Erreur serveur pendant l\'analyse.' }), { status: 500, headers: jsonHeaders })
  }
})
