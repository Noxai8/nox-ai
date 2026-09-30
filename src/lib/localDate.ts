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
