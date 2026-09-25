import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { requirePlan, corsHeaders } from '../_shared/requirePlan.ts'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Verrou serveur — Pro requis (génération programme IA)
  const check = await requirePlan(req, 'pro')
  if (check instanceof Response) return check

  try {
    const body = await req.json()
    const prompt = body?.prompt
    if (!prompt || typeof prompt !== 'string') {
      return jsonResponse({ error: 'Prompt manquant.' }, 400)
    }

    const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY')
    if (!ANTHROPIC_KEY) return jsonResponse({ error: 'No API key' }, 500)

    // Appel Claude avec retry x2
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (response.ok) {
        const data = await response.json()
        return jsonResponse(data)
      }

      if (attempt === 0) await new Promise(r => setTimeout(r, 1000))
    }

    return jsonResponse({ error: 'Service IA indisponible. Réessaie dans quelques instants.' }, 503)
  } catch (err: any) {
    return jsonResponse({ error: err.message || 'Erreur interne.' }, 500)
  }
})
