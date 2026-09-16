import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    })
  }

  if (req.method !== 'POST') {
    return jsonResponse(
      { error: 'Method not allowed' },
      405,
    )
  }

  try {
    const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY')

    if (!ANTHROPIC_KEY) {
      console.error('[generate-program] ANTHROPIC_API_KEY missing')

      return jsonResponse(
        {
          error: 'ANTHROPIC_API_KEY is not configured',
        },
        500,
      )
    }

    let body: any

    try {
      body = await req.json()
    } catch {
      return jsonResponse(
        {
          error: 'Invalid JSON body',
        },
        400,
      )
    }

    const prompt =
      typeof body?.prompt === 'string'
        ? body.prompt.trim()
        : ''

    if (!prompt) {
      return jsonResponse(
        {
          error: 'Prompt is required',
        },
        400,
      )
    }

    if (prompt.length > 100_000) {
      return jsonResponse(
        {
          error: 'Prompt is too large',
        },
        413,
      )
    }

    console.log(
      `[generate-program] Request received — prompt length: ${prompt.length}`,
    )

    const controller = new AbortController()

    const timeout = setTimeout(() => {
      controller.abort()
    }, 90_000)

    let anthropicResponse: Response

    try {
      anthropicResponse = await fetch(
        'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',

          signal: controller.signal,

          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_KEY,
            'anthropic-version': '2023-06-01',
          },

          body: JSON.stringify({
            model: 'claude-sonnet-4-6',

            max_tokens: 8000,

            temperature: 0,

            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
          }),
        },
      )
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        console.error('[generate-program] Anthropic timeout')

        return jsonResponse(
          {
            error: 'Anthropic request timed out',
          },
          504,
        )
      }

      console.error(
        '[generate-program] Anthropic network error:',
        error,
      )

      return jsonResponse(
        {
          error:
            error?.message ||
            'Unable to contact Anthropic',
        },
        502,
      )
    } finally {
      clearTimeout(timeout)
    }

    let data: any

    try {
      data = await anthropicResponse.json()
    } catch {
      const raw = await anthropicResponse
        .text()
        .catch(() => '')

      console.error(
        '[generate-program] Invalid Anthropic response:',
        raw,
      )

      return jsonResponse(
        {
          error: 'Invalid response from Anthropic',
        },
        502,
      )
    }

    if (!anthropicResponse.ok) {
      console.error(
        '[generate-program] Anthropic API error:',
        JSON.stringify(data),
      )

      return jsonResponse(
        {
          error:
            data?.error?.message ||
            'Anthropic API error',

          anthropic_status:
            anthropicResponse.status,
        },
        anthropicResponse.status >= 500
          ? 502
          : anthropicResponse.status,
      )
    }

    if (
      !Array.isArray(data?.content) ||
      data.content.length === 0
    ) {
      console.error(
        '[generate-program] Empty Anthropic content:',
        JSON.stringify(data),
      )

      return jsonResponse(
        {
          error:
            'Anthropic returned an empty response',
        },
        502,
      )
    }

    console.log(
      `[generate-program] Success — stop_reason: ${
        data?.stop_reason || 'unknown'
      }`,
    )

    /*
     * IMPORTANT :
     *
     * On conserve volontairement la réponse Anthropic
     * complète.
     *
     * Le frontend NOX actuel récupère data.content
     * pour reconstruire le programme.
     *
     * Modifier la forme de cette réponse ici
     * risquerait de casser la génération déjà
     * fonctionnelle.
     */

    return jsonResponse(data)
  } catch (error: any) {
    console.error(
      '[generate-program] Unexpected error:',
      error,
    )

    return jsonResponse(
      {
        error:
          error?.message ||
          'Internal server error',
      },
      500,
    )
  }
})
