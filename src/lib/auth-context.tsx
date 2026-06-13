import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import * as api from "@/lib/api";
import { registerForPushAsync, unregisterPushAsync } from "@/lib/push";
import type { Chauffeur, Role, SessionUser } from "@/lib/types";

const TOKEN_KEY = "goldridr_session_token";
const PROFILE_KEY = "goldridr_session_profile";

interface StoredProfile {
  role: Role;
  user: SessionUser;
  chauffeur: Chauffeur | null;
}

// SecureStore is unavailable on web; fall back to localStorage there so the
// app stays usable in browser-based development.
const storage = Platform.OS === "web"
  ? {
    getItemAsync: async ( key: string ) => globalThis.localStorage?.getItem( key ) ?? null,
    setItemAsync: async ( key: string, value: string ) => { globalThis.localStorage?.setItem( key, value ); },
    deleteItemAsync: async ( key: string ) => { globalThis.localStorage?.removeItem( key ); },
  }
  : SecureStore;

interface AuthState {
  isLoading: boolean;
  token: string | null;
  role: Role | null;
  isAdmin: boolean;
  user: SessionUser | null;
  chauffeur: Chauffeur | null;
  signIn: ( email: string, password: string ) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>( null );

export function AuthProvider( { children }: { children: React.ReactNode } ) {
  const [ isLoading, setIsLoading ] = useState( true );
  const [ token, setToken ] = useState<string | null>( null );
  const [ profile, setProfile ] = useState<StoredProfile | null>( null );

  useEffect( () => {
    ( async () => {
      try {
        const [ storedToken, storedProfile ] = await Promise.all( [
          storage.getItemAsync( TOKEN_KEY ),
          storage.getItemAsync( PROFILE_KEY ),
        ] );
        if ( storedToken && storedProfile ) {
          setToken( storedToken );
          setProfile( JSON.parse( storedProfile ) );
        }
      } catch {
        // Corrupt or unavailable storage — treat as signed out
      } finally {
        setIsLoading( false );
      }
    } )();
  }, [] );

  // Covers both fresh sign-ins and restored sessions; registration is
  // idempotent on the server (token upsert), so re-running is harmless.
  useEffect( () => {
    if ( token ) void registerForPushAsync( token );
  }, [ token ] );

  const signIn = useCallback( async ( email: string, password: string ) => {
    const result = await api.login( email, password );
    const nextProfile: StoredProfile = {
      role: result.role,
      user: result.user,
      chauffeur: result.chauffeur ?? null,
    };
    await Promise.all( [
      storage.setItemAsync( TOKEN_KEY, result.token ),
      storage.setItemAsync( PROFILE_KEY, JSON.stringify( nextProfile ) ),
    ] );
    setToken( result.token );
    setProfile( nextProfile );
  }, [] );

  const signOut = useCallback( async () => {
    // Drop the device token while we still hold a valid auth token, so this
    // device stops receiving pushes for the signed-out account.
    if ( token ) await unregisterPushAsync( token );
    await Promise.all( [
      storage.deleteItemAsync( TOKEN_KEY ),
      storage.deleteItemAsync( PROFILE_KEY ),
    ] );
    setToken( null );
    setProfile( null );
  }, [ token ] );

  const value = useMemo(
    () => ( {
      isLoading,
      token,
      role: profile?.role ?? null,
      isAdmin: profile?.role === "admin",
      user: profile?.user ?? null,
      chauffeur: profile?.chauffeur ?? null,
      signIn,
      signOut,
    } ),
    [ isLoading, token, profile, signIn, signOut ]
  );

  return <AuthContext.Provider value={ value }>{ children }</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext( AuthContext );
  if ( !context ) throw new Error( "useAuth must be used within AuthProvider" );
  return context;
}
