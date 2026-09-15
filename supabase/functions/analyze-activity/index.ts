import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function dataUrlParts(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i)
  if (!match) throw new Error('Format image invalide.')
  return { mime: match[1] === 'image/jpg' ? 'image/jpeg' : match[1], base64: match[2] }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { image } = await req.json()
    if (!image || typeof image !== 'string') throw new Error('Image manquante.')

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? ''
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY manquante.')

    const parsed = dataUrlParts(image)

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        input: [{
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `Analyse uniquement l'écran de cette machine cardio.
Retourne UNIQUEMENT un objet JSON valide, sans markdown :
{
  "activity_type": "tapis|vélo|elliptique|rameur|stepper|autre",
  "duration_minutes": number|null,
  "calories_burned": number|null,
  "distance_km": number|null,
  "notes": ""
}
Règles :
- Recopie seulement les valeurs réellement visibles.
- N'invente jamais une donnée absente ou illisible : utilise null.
- Convertis la durée en minutes.
- Convertis la distance en kilomètres si l'unité affichée permet de le faire.
- Les calories sont celles affichées par la machine, pas une estimation recalculée.`,
            },
            {
              type: 'input_image',
              image_url: `data:${parsed.mime};base64,${parsed.base64}`,
            },
          ],
        }],
        max_output_tokens: 300,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data?.error?.message || `OpenAI API ${response.status}`)
    }

    const text =
      data?.output_text ||
      data?.output?.flatMap((item: any) => item?.content || [])
        ?.find((item: any) => item?.type === 'output_text')?.text ||
      ''

    const cleaned = String(text).replace(/```json/gi, '').replace(/```/g, '').trim()
    const activity = JSON.parse(cleaned)

    return new Response(JSON.stringify({ activity }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('ANALYZE_ACTIVITY_ERROR', err)
    return new Response(JSON.stringify({ error: err?.message || 'Analyse impossible.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
