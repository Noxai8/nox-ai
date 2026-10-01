import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })

async function requirePro(
  req: Request,
): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'UNAUTHENTICATED' }, 401)
  }

  const token = authHeader.replace('Bearer ', '')

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    },
  )

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return jsonResponse({ error: 'UNAUTHENTICATED' }, 401)
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const {
    data: profile,
    error: profileError,
  } = await admin
    .from('profiles')
    .select('subscription_plan, trial_ends_at')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('nox-coach profile error:', profileError)
    return jsonResponse({ error: 'PROFILE_CHECK_FAILED' }, 500)
  }

  const plan = profile?.subscription_plan

  const trialActive =
    !!profile?.trial_ends_at &&
    new Date(profile.trial_ends_at).getTime() > Date.now()

  const isPro =
    trialActive ||
    plan === 'pro' ||
    plan === 'nox' ||
    plan === 'pro_plus' ||
    plan === 'ultra'

  if (!isPro) {
    return jsonResponse({ error: 'PRO_REQUIRED' }, 403)
  }

  return { userId: user.id }
}

type SafeMessage = {
  role: 'user' | 'assistant'
  content: string
}

function sanitizeMessages(value: unknown): SafeMessage[] {
  if (!Array.isArray(value)) return []

  return value
    .slice(-8)
    .filter(
      (message: any) =>
        (message?.role === 'user' || message?.role === 'assistant') &&
        typeof message?.content === 'string' &&
        message.content.trim().length > 0,
    )
    .map((message: any) => ({
      role: message.role,
      content: message.content.trim().slice(0, 3000),
    }))
}

function sanitizeSystem(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, 12000)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405)
  }

  const check = await requirePro(req)

  if (check instanceof Response) {
    return check
  }

  try {
    const body = await req.json().catch(() => null)

    const messages = sanitizeMessages(body?.messages)
    const system = sanitizeSystem(body?.system)

    if (messages.length === 0) {
      return jsonResponse({ error: 'INVALID_MESSAGES' }, 400)
    }

    const ANTHROPIC_KEY = Deno.env.get('Anthropic_key_noxai')

    if (!ANTHROPIC_KEY) {
      console.error('nox-coach: Anthropic_key_noxai missing')
      return jsonResponse({ error: 'AI_CONFIGURATION_ERROR' }, 500)
    }

    const anthropicBody: Record<string, unknown> = {
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages,
    }

    // Compatibilité avec le Coach actuel :
    // le frontend construit encore le contexte NOX dans `system`.
    // On le conserve pour ne pas casser le comportement existant.
    if (system) {
      anthropicBody.system = system
    }

    const response = await fetch(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-workspace-id':
            'wrkspc_01L3cb9d5iNZv6pGhXFb1jW2',
        },
        body: JSON.stringify(anthropicBody),
      },
    )

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      console.error(
        'nox-coach Anthropic error:',
        response.status,
        JSON.stringify(data),
      )

      return jsonResponse(
        {
          error: 'AI_PROVIDER_ERROR',
          provider_status: response.status,
        },
        502,
      )
    }

    const text =
      Array.isArray(data?.content)
        ? data.content
            .filter(
              (block: any) =>
                block?.type === 'text' &&
                typeof block?.text === 'string',
            )
            .map((block: any) => block.text)
            .join('\n')
            .trim()
        : ''

    if (!text) {
      console.error(
        'nox-coach: Anthropic returned no text:',
        JSON.stringify(data),
      )

      return jsonResponse({ error: 'AI_EMPTY_RESPONSE' }, 502)
    }

    return jsonResponse({
      content: [
        {
          type: 'text',
          text,
        },
      ],
      model: data?.model ?? null,
      usage: data?.usage ?? null,
    })
  } catch (err: unknown) {
    console.error('nox-coach unexpected error:', err)

    return jsonResponse(
      {
        error: 'NOX_COACH_ERROR',
        message:
          err instanceof Error
            ? err.message
            : 'Erreur inconnue',
      },
      500,
    )
  }
})
