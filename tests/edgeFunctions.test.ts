import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import { invokeEdge, readableError } from '../src/lib/edgeFunctions';

let ok = 0, ko = 0;
const t = (n: string, c: boolean) => { c ? ok++ : ko++; console.log(c ? '✓' : '✗', n); };
const json = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const calls: any[] = [];
const client = (result: { data?: unknown; error?: unknown }) => ({
  functions: { invoke: async (name: string, opts: any) => { calls.push({ name, opts }); return { data: result.data ?? null, error: result.error ?? null }; } },
}) as any;
const run = (r: any) => invokeEdge('analyze-meal', { base64: 'x' }, 'Analyse indisponible.', client(r));
const messages: string[] = [];
const keep = (s: string | null) => { if (s) messages.push(s); return s; };

(async () => {
  // Succès
  const s = await run({ data: { description: 'Pâtes', total: { kcal: 600 } } });
  t('Succès : données renvoyées, pas d’erreur', s.error === null && (s.data as any)?.total?.kcal === 600);
  t('Appel via le client Supabase avec le nom de fonction et le corps', calls.at(-1)?.name === 'analyze-meal' && calls.at(-1)?.opts?.body?.base64 === 'x');

  // Erreurs HTTP réelles du projet
  t('Passerelle Supabase 401 « Invalid API key » → message lisible', keep((await run({ error: new FunctionsHttpError(json({ message: 'Invalid API key' }, 401)) })).error) === 'Invalid API key');
  t('Session invalide (requirePlan) → message', keep((await run({ error: new FunctionsHttpError(json({ error: 'UNAUTHENTICATED', message: 'Session invalide.' }, 401)) })).error) === 'Session invalide.');
  t('Pro requis (403) → message', keep((await run({ error: new FunctionsHttpError(json({ error: 'PRO_REQUIRED', message: 'Cette fonctionnalité nécessite NOX Pro.' }, 403)) })).error) === 'Cette fonctionnalité nécessite NOX Pro.');
  t('Erreur 500 de la fonction { error: "…" } → texte', keep((await run({ error: new FunctionsHttpError(json({ error: 'No API key' }, 500)) })).error) === 'No API key');
  t('Corps non JSON → texte brut', keep((await run({ error: new FunctionsHttpError(new Response('Bad Gateway', { status: 502 })) })).error) === 'Bad Gateway');
  t('Corps vide → message par défaut avec le statut', keep((await run({ error: new FunctionsHttpError(new Response('', { status: 503 })) })).error) === 'Analyse indisponible. (503)');

  // Erreurs transmises avec un statut 200
  const anth = await run({ data: { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } } });
  t('Clé Anthropic refusée (statut 200) → message de configuration explicite', keep(anth.error)?.startsWith('Le service d’analyse IA n’est pas correctement configuré') === true && anth.data === null);
  const other = await run({ data: { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } } });
  t('Autre erreur du fournisseur IA (objet imbriqué) → son message', keep(other.error) === 'Overloaded');
  t('Image manquante (statut 200 avec error) → texte', keep((await run({ data: { error: 'Image manquante.' } })).error) === 'Image manquante.');

  // Réseau
  t('Réseau indisponible → message de connexion', keep((await run({ error: new FunctionsFetchError('fail') })).error)?.startsWith('Connexion au service impossible') === true);
  t('Relais Supabase indisponible → message', keep((await run({ error: new FunctionsRelayError('relay') })).error)?.startsWith('Le service est momentanément indisponible') === true);

  // Jamais « [object Object] »
  t('readableError sur un objet sans message → message par défaut', readableError({ foo: { bar: 1 } }, 'Défaut') === 'Défaut');
  t('readableError sur une erreur imbriquée sans texte → message par défaut', readableError({ error: { code: 42 } }, 'Défaut') === 'Défaut');
  t('Aucun message produit ne vaut « [object Object] »', messages.length >= 10 && messages.every(m => !m.includes('[object Object]')));

  console.log(`\n${ok} réussis, ${ko} échoués`);
})();
