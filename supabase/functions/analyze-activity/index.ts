import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { requirePlan, corsHeaders } from '../_shared/requirePlan.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Verrou serveur — Pro requis
  const check = await requirePlan(req, 'pro')
  if (check instanceof Response) return check

  try {
    const { image } = await req.json()
    if (!image || typeof image !== 'string') {
      return new Response(JSON.stringify({ error: 'Image manquante.' }), { status: 400, headers: corsHeaders })
    }

    const match = image.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i)
    if (!match) {
      return new Response(JSON.stringify({ error: 'Format image invalide.' }), { status: 400, headers: corsHeaders })
    }
    const mime   = match[1] === 'image/jpg' ? 'image/jpeg' : match[1]
    const base64 = match[2]

    const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY')
    if (!ANTHROPIC_KEY) return new Response(JSON.stringify({ error: 'No API key' }), { status: 500, headers: corsHeaders })

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mime, data: base64 } },
            { type: 'text', text: 'Analyse cette image d\'activité physique. Retourne un JSON : {"activity":"...","duration_min":0,"intensity":"faible|modérée|intense","calories_burned":0,"notes":"..."}' }
          ]
        }]
      }),
    })

    const data = await response.json()
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: corsHeaders
    })
  }
})
