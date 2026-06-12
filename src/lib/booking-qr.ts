export function getBookingVerifyUrl(
  appUrl: string,
  reference: string,
  email: string
): string {
  const url = new URL( "/verify", `${ appUrl.replace( /\/$/, "" ) }/` );
  url.searchParams.set( "reference", reference );
  url.searchParams.set( "email", email );
  return url.toString();
}

export function getBookingQrImageUrl(
  appUrl: string,
  reference: string,
  email: string
): string {
  const url = new URL( "/api/booking/qr", `${ appUrl.replace( /\/$/, "" ) }/` );
  url.searchParams.set( "reference", reference );
  url.searchParams.set( "email", email );
  return url.toString();
}
