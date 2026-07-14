export function isPocketBaseConfigured(): boolean {
  return Boolean( process.env.POCKETBASE_URL && process.env.POCKETBASE_SUPERUSER_TOKEN );
}

export function isPocketBaseNotificationReadEnabled(): boolean {
  return process.env.POCKETBASE_NOTIFICATIONS_READ === "true";
}

export function isPocketBaseNotificationWriteEnabled(): boolean {
  return process.env.POCKETBASE_NOTIFICATIONS_WRITE === "true";
}

export function isPocketBaseAuthEnabled(): boolean {
  return process.env.POCKETBASE_AUTH === "true";
}

export function isPocketBaseDeliveryQueueEnabled(): boolean {
  return process.env.POCKETBASE_DELIVERY_QUEUE === "true";
}

export function isPocketBaseCoreWriteEnabled(): boolean {
  return process.env.POCKETBASE_CORE_WRITE === "true";
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
