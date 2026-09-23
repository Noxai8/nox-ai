import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const jsonHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
        error: 'Méthode non autorisée',
      }),
      {
        status: 405,
        headers: jsonHeaders,
      }
    )
  }

  try {
    const body = await req.json().catch(() => null)
    const prompt = body?.prompt

    if (
      typeof prompt !== 'string' ||
      !prompt.trim()
    ) {
      return new Response(
        JSON.stringify({
          error: 'Prompt manquant ou invalide',
        }),
        {
          status: 400,
          headers: jsonHeaders,
        }
      )
    }

    const ANTHROPIC_KEY =
      Deno.env.get('ANTHROPIC_API_KEY nox ai') ?? ''

    if (!ANTHROPIC_KEY) {
      console.error('ANTHROPIC_API_KEY manquante')

      return new Response(
        JSON.stringify({
          error: 'Configuration Anthropic manquante',
        }),
        {
          status: 500,
          headers: jsonHeaders,
        }
      )
    }

    const tool = {
      name: 'create_nox_program',

      description:
        "Crée le programme d'entraînement structuré NOX correspondant exactement au profil et aux règles données.",

      input_schema: {
        type: 'object',

        properties: {
          name: {
            type: 'string',
          },

          goal: {
            type: 'string',
          },

          duration_weeks: {
            type: 'integer',
            minimum: 4,
            maximum: 12,
          },

          session_length_min: {
            type: 'integer',
          },

          progression_notes: {
            type: 'string',
          },

          nutrition_notes: {
            type: 'string',
          },

          sessions: {
            type: 'array',

            items: {
              type: 'object',

              properties: {
                name: {
                  type: 'string',
                },

                day: {
                  type: 'string',
                },

                focus: {
                  type: 'string',
                },

                duration: {
                  type: 'integer',
                },

                exercises: {
                  type: 'array',
                  minItems: 3,
                  maxItems: 5,

                  items: {
                    type: 'object',

                    properties: {
                      name: {
                        type: 'string',
                      },

                      muscles: {
                        type: 'string',
                      },

                      sets: {
                        type: 'string',
                      },

                      reps: {
                        type: 'string',
                      },

                      rest: {
                        type: 'string',
                      },

                      weight_suggestion: {
                        type: 'string',
                      },

                      description: {
                        type: 'string',
                      },

                      instructions: {
                        type: 'string',
                      },

                      order_index: {
                        type: 'integer',
                      },
                    },

                    required: [
                      'name',
                      'muscles',
                      'sets',
                      'reps',
                      'rest',
                      'weight_suggestion',
                      'description',
                      'instructions',
                      'order_index',
                    ],
                  },
                },
              },

              required: [
                'name',
                'day',
                'focus',
                'duration',
                'exercises',
              ],
            },
          },
        },

        required: [
          'name',
          'goal',
          'duration_weeks',
          'session_length_min',
          'progression_notes',
          'nutrition_notes',
          'sessions',
        ],
      },
    }

    const anthropicResponse = await fetch(
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

        body: JSON.stringify({
          model: 'claude-sonnet-4-6',

          max_tokens: 8000,

          temperature: 0,

          tools: [tool],

          tool_choice: {
            type: 'tool',
            name: 'create_nox_program',
          },

          messages: [
            {
              role: 'user',

              content: `${prompt}

RÈGLES DE SORTIE PRIORITAIRES :

Utilise obligatoirement l'outil create_nox_program.

Respecte exactement le nombre de séances demandé dans le profil.

Chaque séance doit contenir entre 3 et 5 exercices.
Ne dépasse jamais 5 exercices par séance.

Pour chaque exercice :

- name : nom court de l'exercice
- muscles : 1 à 3 groupes musculaires maximum
- sets : valeur courte, exemple "4"
- reps : valeur courte, exemple "8-10"
- rest : valeur courte, exemple "90s"
- weight_suggestion : 8 mots maximum
- description : 12 mots maximum
- instructions : 18 mots maximum
- order_index : ordre numérique dans la séance

Pour le programme :

- name : nom court et personnalisé
- goal : objectif court
- progression_notes : 60 mots maximum
- nutrition_notes : 40 mots maximum

Évite toute répétition inutile.

N'écris pas de longues explications.

N'ajoute aucun texte en dehors de l'appel à l'outil.

PRIORITÉ ABSOLUE :

Le programme doit être COMPLET.

Toutes les séances demandées doivent être présentes.

Si la réponse devient trop longue, raccourcis les descriptions et les instructions.

Ne supprime jamais une séance pour réduire la longueur.

Le programme complet doit tenir intégralement dans la réponse.`,
            },
          ],
        }),
      }
    )

    let anthropicData: any

    try {
      anthropicData =
        await anthropicResponse.json()
    } catch {
      console.error('Réponse Anthropic non JSON')

      return new Response(
        JSON.stringify({
          error: 'Réponse Anthropic illisible',
        }),
        {
          status: 502,
          headers: jsonHeaders,
        }
      )
    }

    if (!anthropicResponse.ok) {
      console.error(
        'Erreur Anthropic :',
        JSON.stringify(anthropicData)
      )

      const message =
        anthropicData?.error?.message ||
        `Erreur Anthropic (${anthropicResponse.status})`

      return new Response(
        JSON.stringify({
          error: message,
        }),
        {
          status: anthropicResponse.status,
          headers: jsonHeaders,
        }
      )
    }

    if (
      anthropicData?.stop_reason ===
      'max_tokens'
    ) {
      console.error(
        'Réponse Anthropic tronquée : max_tokens'
      )

      return new Response(
        JSON.stringify({
          error:
            'La génération a dépassé la taille maximale autorisée.',
        }),
        {
          status: 502,
          headers: jsonHeaders,
        }
      )
    }

    const toolUse =
      anthropicData?.content?.find(
        (block: any) =>
          block?.type === 'tool_use' &&
          block?.name === 'create_nox_program'
      )

    if (
      !toolUse?.input ||
      typeof toolUse.input !== 'object'
    ) {
      console.error(
        'Aucun tool_use exploitable :',
        JSON.stringify(anthropicData)
      )

      return new Response(
        JSON.stringify({
          error:
            "L'IA n'a pas retourné de programme structuré.",
        }),
        {
          status: 502,
          headers: jsonHeaders,
        }
      )
    }

    const program = toolUse.input

    if (
      !Array.isArray(program.sessions) ||
      program.sessions.length === 0
    ) {
      return new Response(
        JSON.stringify({
          error: 'Programme sans séances.',
        }),
        {
          status: 502,
          headers: jsonHeaders,
        }
      )
    }

    for (
      let sessionIndex = 0;
      sessionIndex < program.sessions.length;
      sessionIndex++
    ) {
      const session =
        program.sessions[sessionIndex]

      if (
        !Array.isArray(session?.exercises) ||
        session.exercises.length < 3
      ) {
        return new Response(
          JSON.stringify({
            error:
              `Séance ${sessionIndex + 1} incomplète.`,
          }),
          {
            status: 502,
            headers: jsonHeaders,
          }
        )
      }

      if (session.exercises.length > 5) {
        return new Response(
          JSON.stringify({
            error:
              `Séance ${sessionIndex + 1} trop volumineuse.`,
          }),
          {
            status: 502,
            headers: jsonHeaders,
          }
        )
      }
    }

    /*
     * Compatibilité avec GenerateProgram.tsx :
     * le frontend récupère content[0].text
     * puis parse le JSON.
     *
     * Ici le JSON provient directement du
     * tool Anthropic, donc JSON.stringify()
     * garantit un JSON syntaxiquement valide.
     */
    return new Response(
      JSON.stringify({
        content: [
          {
            type: 'text',
            text: JSON.stringify(program),
          },
        ],

        stop_reason:
          anthropicData?.stop_reason ||
          'tool_use',

        usage:
          anthropicData?.usage || null,
      }),
      {
        status: 200,
        headers: jsonHeaders,
      }
    )
  } catch (err: any) {
    console.error(
      'generate-program error:',
      err
    )

    return new Response(
      JSON.stringify({
        error:
          err?.message ||
          'Erreur interne pendant la génération du programme',
      }),
      {
        status: 500,
        headers: jsonHeaders,
      }
    )
  }
})
