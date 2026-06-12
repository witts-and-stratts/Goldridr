// Bookings store date as "YYYY-MM-DD" and time as "HH:MM" (24h).

export function formatRideDate( date: string ): string {
  const [ y, m, d ] = date.split( "-" ).map( Number );
  if ( !y || !m || !d ) return date;
  return new Date( y, m - 1, d ).toLocaleDateString( "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  } );
}

export function formatRideTime( time: string ): string {
  const [ h, min ] = time.split( ":" ).map( Number );
  if ( Number.isNaN( h ) || Number.isNaN( min ) ) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${ hour }:${ String( min ).padStart( 2, "0" ) } ${ period }`;
}

export function greeting(): string {
  const hour = new Date().getHours();
  if ( hour < 12 ) return "Good morning";
  if ( hour < 18 ) return "Good afternoon";
  return "Good evening";
}

export function firstName( name: string ): string {
  return name.split( " " )[ 0 ] ?? name;
}
