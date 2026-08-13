export function formatBookingStatus( status: string ): string {
  const normalized = status.trim().toLowerCase().replace( /[\s-]+/g, "_" );
  if ( !normalized ) return "Unknown";

  return normalized
    .split( "_" )
    .filter( Boolean )
    .map( word => word.charAt( 0 ).toUpperCase() + word.slice( 1 ) )
    .join( " " );
}
