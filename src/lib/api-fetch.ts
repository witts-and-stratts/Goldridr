export async function apiFetch<T>( url: string, options?: RequestInit ): Promise<T> {
  const res = await fetch( url, {
    headers: { "Content-Type": "application/json" },
    ...options,
    ...(options?.body ? {} : {}),
  } );
  const data = await res.json();
  if ( !data.success ) throw new Error( data.error ?? "Request failed" );
  return data as T;
}
