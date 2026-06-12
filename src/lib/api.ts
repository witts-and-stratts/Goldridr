import type { BlockedSlot, Chauffeur, DriverRide } from "@/lib/types";

// Point this at the Goldridr Next.js server. On a physical device use your
// machine's LAN IP (e.g. http://192.168.1.20:3000) — localhost is the phone.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  status: number;

  constructor( message: string, status: number ) {
    super( message );
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  token?: string | null;
  body?: unknown;
}

async function request<T>( path: string, options: RequestOptions = {} ): Promise<T> {
  const { method = "GET", token, body } = options;

  let response: Response;
  try {
    response = await fetch( `${ API_URL }${ path }`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...( token ? { Authorization: `Bearer ${ token }` } : {} ),
      },
      body: body === undefined ? undefined : JSON.stringify( body ),
    } );
  } catch {
    throw new ApiError( `Could not reach the server at ${ API_URL }`, 0 );
  }

  const data = await response.json().catch( () => ( {} ) );
  if ( !response.ok || data.success === false ) {
    throw new ApiError( data.error || `Request failed (${ response.status })`, response.status );
  }
  return data as T;
}

export function login( email: string, password: string ) {
  return request<{ token: string; chauffeur: Chauffeur }>( "/api/driver/login", {
    method: "POST",
    body: { email, password },
  } );
}

export function getRides( token: string ) {
  return request<{ rides: DriverRide[] }>( "/api/driver/rides", { token } );
}

export function getRide( token: string, reference: string ) {
  return request<{ ride: DriverRide }>( `/api/driver/rides/${ encodeURIComponent( reference ) }`, { token } );
}

export function updateRideStatus( token: string, reference: string, status: string ) {
  return request<{ ride: DriverRide }>( `/api/driver/rides/${ encodeURIComponent( reference ) }`, {
    method: "PATCH",
    token,
    body: { status },
  } );
}

export function getBlockedSlots( token: string ) {
  return request<{ blocks: BlockedSlot[] }>( "/api/driver/blocked", { token } );
}

export function createBlockedSlot(
  token: string,
  block: {
    title: string;
    date: string;
    endDate?: string;
    isFullDay?: boolean;
    time?: string;
    duration?: number;
    recurring?: string;
  }
) {
  return request<{ block: BlockedSlot }>( "/api/driver/blocked", {
    method: "POST",
    token,
    body: block,
  } );
}

export function deleteBlockedSlot( token: string, id: number ) {
  return request<object>( `/api/driver/blocked?id=${ id }`, { method: "DELETE", token } );
}

export function scanRiderCode( token: string, payload: string ) {
  return request<{ ride: DriverRide; assignedToYou: boolean }>( "/api/driver/scan", {
    method: "POST",
    token,
    body: { payload },
  } );
}
