// Kleine, gedeelde formatters.

/** Formatteert een bedrag als Nederlandse euro-notatie, bijv. "€ 3,50". */
export function formatEuro(amount: number): string {
  return `€ ${amount.toFixed(2).replace('.', ',')}`;
}
