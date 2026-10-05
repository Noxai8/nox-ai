/**
 * Retourne la date locale de l'utilisateur au format YYYY-MM-DD.
 * Utilise sv-SE (suédois) qui produit ce format nativement.
 * Ne jamais utiliser toISOString().slice(0,10) — c'est UTC.
 */
export function todayLocalDate(): string {
  return new Date().toLocaleDateString('sv-SE');
}

export function localDateFromDate(date: Date): string {
  return date.toLocaleDateString('sv-SE');
}

export function formatLocalDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

/**
 * Bornes d'une journée locale "YYYY-MM-DD", en instants absolus (ISO/UTC) pour une requête serveur.
 * Ex. à Paris en été : le 06/10 commence à 2026-10-05T22:00:00.000Z.
 * Ne jamais écrire `date + 'T00:00:00'` : sans fuseau, la base l'interprète en UTC.
 */
export function localDayStartISO(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toISOString();
}

export function localDayEndISO(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}
