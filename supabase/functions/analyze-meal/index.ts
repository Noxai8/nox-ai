import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { base64, mime } = await req.json()
    if (!base64) return new Response(JSON.stringify({ error: 'No image' }), { status: 400, headers: corsHeaders })

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
        model: 'claude-opus-4-5',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mime || 'image/jpeg', data: base64 },
            },
            {
              type: 'text',
              text: `Tu es un nutritionniste expert. Analyse cette photo de repas.

Réponds UNIQUEMENT en JSON valide :
{
  "description": "Description courte du repas",
  "aliments": [
    { "nom": "Aliment", "quantite": "150g", "kcal": 200, "protein": 20, "carbs": 15, "fat": 5 }
  ],
  "total": { "kcal": 500, "protein": 40, "carbs": 30, "fat": 15 },
  "fiabilite": "haute",
  "note": "Remarque si besoin"
}`,
            },
          ],
        }),
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'API error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const text = data.content?.[0]?.text || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return new Response(JSON.stringify({ error: 'No JSON in response' }), { status: 500, headers: corsHeaders })

    const parsed = JSON.parse(jsonMatch[0])

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
