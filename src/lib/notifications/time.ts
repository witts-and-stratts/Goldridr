function partsAt( date: Date, timeZone: string ): Record<string, number> {
  const parts = new Intl.DateTimeFormat( "en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  } ).formatToParts( date );
  return Object.fromEntries(
    parts.filter( part => part.type !== "literal" ).map( part => [ part.type, Number( part.value ) ] )
  );
}

export function zonedDateTimeToDate( date: string, time: string, timeZone = process.env.NOTIFICATION_TIMEZONE || "America/Chicago" ): Date {
  const [ year, month, day ] = date.split( "-" ).map( Number );
  const [ hour, minute ] = time.split( ":" ).map( Number );
  const target = Date.UTC( year, month - 1, day, hour, minute, 0 );
  let candidate = target;

  for ( let index = 0; index < 2; index++ ) {
    const observed = partsAt( new Date( candidate ), timeZone );
    const observedUtc = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
      observed.second
    );
    candidate += target - observedUtc;
  }
  return new Date( candidate );
}
