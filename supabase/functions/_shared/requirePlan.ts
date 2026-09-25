import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export { corsHeaders }

export type RequiredPlan = 'pro' | 'free'

export async function requirePlan(
  req: Request,
  minPlan: RequiredPlan = 'pro'
): Promise<{ userId: string; plan: string } | Response> {

  // 1. Extraire le token JWT du header Authorization
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'UNAUTHENTICATED', message: 'Token manquant.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  const token = authHeader.replace('Bearer ', '')

  // 2. Créer un client Supabase avec le token utilisateur
  const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
  const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!
  const supabase = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  // 3. Vérifier l'identité
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'UNAUTHENTICATED', message: 'Session invalide.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 4. Si on n'exige que 'free', on retourne directement
  if (minPlan === 'free') {
    return { userId: user.id, plan: 'free' }
  }

  // 5. Lire le plan depuis profiles (service role pour contourner RLS)
  const supabaseService = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const { data: profile, error: profileError } = await supabaseService
    .from('profiles')
    .select('subscription_plan, trial_ends_at')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return new Response(
      JSON.stringify({ error: 'PROFILE_NOT_FOUND', message: 'Profil introuvable.' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 6. Vérifier le plan
  const raw = profile.subscription_plan as string | null
  const trialActive = profile.trial_ends_at &&
    new Date(profile.trial_ends_at) > new Date()

  const isPro = trialActive ||
    raw === 'pro' || raw === 'nox' ||
    raw === 'pro_plus' || raw === 'ultra'

  if (!isPro) {
    return new Response(
      JSON.stringify({
        error: 'PRO_REQUIRED',
        message: 'Cette fonctionnalité nécessite NOX Pro.',
      }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return { userId: user.id, plan: raw ?? 'pro' }
}
