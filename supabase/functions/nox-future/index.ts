import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { requirePlan, corsHeaders } from '../_shared/requirePlan.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Verrou serveur — Pro requis (NOX Future)
  const check = await requirePlan(req, 'pro')
  if (check instanceof Response) return check

  try {
    const { prompt } = await req.json()
    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'Prompt manquant.' }), { status: 400, headers: corsHeaders })
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
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }]
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
