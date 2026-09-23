import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const jsonHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
      status: 405,
      headers: jsonHeaders,
    })
  }

  try {
    const body = await req.json().catch(() => null)
    const prompt = body?.prompt

    if (typeof prompt !== 'string' || !prompt.trim()) {
      return new Response(JSON.stringify({ error: 'Prompt manquant ou invalide' }), {
        status: 400,
        headers: jsonHeaders,
      })
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY nox ai')
    const workspaceId = 'wrkspc_01L3cb9d5iNZv6pGhXFb1jW2'

    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'Secret Anthropic introuvable' }), {
        status: 500,
        headers: jsonHeaders,
      })
    }

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'anthropic-workspace-id': workspaceId,
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    })

    const raw = await anthropicResponse.text()

    let anthropicData: any
    try {
      anthropicData = JSON.parse(raw)
    } catch {
      anthropicData = null
    }

    if (!anthropicResponse.ok) {
      console.error('Anthropic error', anthropicResponse.status, raw)

      return new Response(
        JSON.stringify({
          error: 'Erreur Anthropic',
          status: anthropicResponse.status,
          details: anthropicData ?? raw,
        }),
        {
          // Ne renvoie pas le 400 Anthropic tel quel au navigateur :
          // la requête envoyée par QuickGroceries est valide.
          status: 502,
          headers: jsonHeaders,
        },
      )
    }

    const text =
      anthropicData?.content
        ?.filter((x: any) => x?.type === 'text')
        ?.map((x: any) => x?.text || '')
        ?.join('\n')
        ?.trim() || ''

    if (!text) {
      return new Response(JSON.stringify({ error: 'Réponse Anthropic vide' }), {
        status: 502,
        headers: jsonHeaders,
      })
    }

    return new Response(
      JSON.stringify({
        content: [{ type: 'text', text }],
        usage: anthropicData?.usage ?? null,
      }),
      {
        status: 200,
        headers: jsonHeaders,
      },
    )
  } catch (error) {
    console.error('generate-groceries', error)

    return new Response(
      JSON.stringify({
        error: 'Erreur interne generate-groceries',
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: jsonHeaders,
      },
    )
  }
})
