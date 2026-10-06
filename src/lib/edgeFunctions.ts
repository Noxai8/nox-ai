// ── NOX — Appel des Edge Functions Supabase ──────────────────────────────────
// Passe par le client Supabase existant : il envoie lui-même la clé publique du projet
// et le jeton de l'utilisateur connecté. Aucune clé ni variable d'environnement ici.
// Toute erreur, quelle que soit sa forme, devient un texte lisible (jamais « [object Object] »).

import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import { supabase } from './supabase';

type InvokeClient = Pick<typeof supabase, 'functions'>;

/** Extrait un message lisible d'une réponse d'erreur, quelle que soit sa forme */
export function readableError(value: unknown, fallback: string): string {
  if (typeof value === 'string') return value.trim() || fallback;
  if (!value || typeof value !== 'object') return fallback;
  const v = value as Record<string, unknown>;

  // Clé du fournisseur IA refusée (erreur transmise telle quelle par la fonction)
  const nested = v.error && typeof v.error === 'object' ? (v.error as Record<string, unknown>) : null;
  if (nested?.type === 'authentication_error') {
    return 'Le service d’analyse IA n’est pas correctement configuré (clé du fournisseur refusée).';
  }
  if (typeof v.message === 'string' && v.message.trim()) return v.message;
  if (v.error === 'PRO_REQUIRED') return 'Cette fonctionnalité nécessite NOX Pro.';
  if (nested) return readableError(nested, fallback);
  if (typeof v.error === 'string' && v.error.trim()) return v.error;
  return fallback;
}

export async function invokeEdge<T = unknown>(
  name: string,
  body: Record<string, unknown>,
  fallback: string,
  client: InvokeClient = supabase,
): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await client.functions.invoke(name, { body });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const response = error.context as Response;
      let detail: unknown = null;
      try { detail = await response.clone().json(); } catch {
        try { detail = await response.text(); } catch { detail = null; }
      }
      return { data: null, error: readableError(detail, `${fallback} (${response.status})`) };
    }
    if (error instanceof FunctionsFetchError) return { data: null, error: 'Connexion au service impossible. Vérifie ta connexion et réessaie.' };
    if (error instanceof FunctionsRelayError) return { data: null, error: 'Le service est momentanément indisponible. Réessaie dans un instant.' };
    return { data: null, error: readableError(error, fallback) };
  }

  // Certaines fonctions renvoient une erreur avec un statut 200 (ex. erreur transmise par le fournisseur IA)
  if (data && typeof data === 'object' && (data as Record<string, unknown>).error) {
    return { data: null, error: readableError(data, fallback) };
  }
  return { data: (data ?? null) as T | null, error: null };
}
