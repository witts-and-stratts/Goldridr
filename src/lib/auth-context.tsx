import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import * as api from "@/lib/api";
import type { Chauffeur } from "@/lib/types";

const TOKEN_KEY = "goldridr_driver_token";
const PROFILE_KEY = "goldridr_driver_profile";

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
  chauffeur: Chauffeur | null;
  signIn: ( email: string, password: string ) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>( null );

export function AuthProvider( { children }: { children: React.ReactNode } ) {
  const [ isLoading, setIsLoading ] = useState( true );
  const [ token, setToken ] = useState<string | null>( null );
  const [ chauffeur, setChauffeur ] = useState<Chauffeur | null>( null );

  useEffect( () => {
    ( async () => {
      try {
        const [ storedToken, storedProfile ] = await Promise.all( [
          storage.getItemAsync( TOKEN_KEY ),
          storage.getItemAsync( PROFILE_KEY ),
        ] );
        if ( storedToken ) {
          setToken( storedToken );
          setChauffeur( storedProfile ? JSON.parse( storedProfile ) : null );
        }
      } catch {
        // Corrupt or unavailable storage — treat as signed out
      } finally {
        setIsLoading( false );
      }
    } )();
  }, [] );

  const signIn = useCallback( async ( email: string, password: string ) => {
    const result = await api.login( email, password );
    await Promise.all( [
      storage.setItemAsync( TOKEN_KEY, result.token ),
      storage.setItemAsync( PROFILE_KEY, JSON.stringify( result.chauffeur ) ),
    ] );
    setToken( result.token );
    setChauffeur( result.chauffeur );
  }, [] );

  const signOut = useCallback( async () => {
    await Promise.all( [
      storage.deleteItemAsync( TOKEN_KEY ),
      storage.deleteItemAsync( PROFILE_KEY ),
    ] );
    setToken( null );
    setChauffeur( null );
  }, [] );

  const value = useMemo(
    () => ( { isLoading, token, chauffeur, signIn, signOut } ),
    [ isLoading, token, chauffeur, signIn, signOut ]
  );

  return <AuthContext.Provider value={ value }>{ children }</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext( AuthContext );
  if ( !context ) throw new Error( "useAuth must be used within AuthProvider" );
  return context;
}
