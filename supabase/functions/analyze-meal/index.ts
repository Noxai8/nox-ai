import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { requirePlan, corsHeaders } from '../_shared/requirePlan.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Verrou serveur — Pro requis (scan photo IA)
  const check = await requirePlan(req, 'pro')
  if (check instanceof Response) return check

  try {
    const { base64, mime, image } = await req.json()
    const imageData = base64 || (image?.split(',')[1])
    const mimeType  = mime || 'image/jpeg'

    if (!imageData) {
      return new Response(JSON.stringify({ error: 'Image manquante.' }), { status: 400, headers: corsHeaders })
    }

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
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageData } },
            { type: 'text', text: 'Analyse ce repas. Retourne un JSON unique : {"description":"...","total":{"kcal":0,"protein":0,"carbs":0,"fat":0},"interpretation":"..."}. Estimation honnête, sans inventer de précision.' }
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
