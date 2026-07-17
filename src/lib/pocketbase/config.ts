export function isPocketBaseConfigured(): boolean {
  return Boolean( process.env.POCKETBASE_URL && process.env.POCKETBASE_SUPERUSER_EMAIL && process.env.POCKETBASE_SUPERUSER_PASSWORD );
}

export function getPocketBaseUrl(): string {
  const value = process.env.POCKETBASE_URL?.trim();
  if ( !value ) throw new Error( "POCKETBASE_URL is not configured" );
  return value.replace( /\/$/, "" );
}

export function getPocketBaseSuperuserCredentials(): { email: string; password: string } {
  const email = process.env.POCKETBASE_SUPERUSER_EMAIL?.trim();
  const password = process.env.POCKETBASE_SUPERUSER_PASSWORD?.trim();
  if ( !email || !password ) throw new Error( "POCKETBASE_SUPERUSER_EMAIL/POCKETBASE_SUPERUSER_PASSWORD is not configured" );
  return { email, password };
}
