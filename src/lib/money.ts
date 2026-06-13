export function formatMoney( cents: number, currency = "USD" ): string {
  try {
    return new Intl.NumberFormat( "en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    } ).format( cents / 100 );
  } catch {
    return `$${ ( cents / 100 ).toFixed( 2 ) }`;
  }
}

/** Parses a dollar amount typed by the user ("49.50") into integer cents. */
export function parseMoney( input: string ): number | null {
  const value = Number.parseFloat( input.replace( /[^0-9.]/g, "" ) );
  if ( Number.isNaN( value ) || value < 0 ) return null;
  return Math.round( value * 100 );
}
