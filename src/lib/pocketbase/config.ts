export function isPocketBaseConfigured(): boolean {
  return Boolean( process.env.POCKETBASE_URL && process.env.POCKETBASE_SUPERUSER_TOKEN );
}

export function getPocketBaseUrl(): string {
  const value = process.env.POCKETBASE_URL?.trim();
  if ( !value ) throw new Error( "POCKETBASE_URL is not configured" );
  return value.replace( /\/$/, "" );
}

export function getPocketBaseSuperuserToken(): string {
  const value = process.env.POCKETBASE_SUPERUSER_TOKEN?.trim();
  if ( !value ) throw new Error( "POCKETBASE_SUPERUSER_TOKEN is not configured" );
  return value;
}
