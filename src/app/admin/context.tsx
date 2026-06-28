"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthSession } from "@/lib/auth";
import { qk } from "@/lib/query-keys";

export interface Chauffeur {
  id: number;
  name: string;
  email: string;
  phone?: string;
}

export interface Role {
  type: "admin" | "chauffeur";
  id?: number;
  name?: string;
}

interface AdminContextValue {
  chauffeurs: Chauffeur[];
  currentRole: Role;
  session: AuthSession;
  selectedChauffeurId: number | null;
  setSelectedChauffeurId: ( id: number | null ) => void;
  fetchChauffeurs: () => Promise<void>;
}

const AdminContext = createContext<AdminContextValue | null>( null );

export function AdminProvider( {
  children,
  session,
}: {
  children: React.ReactNode;
  session: AuthSession;
} ) {
  const queryClient = useQueryClient();

  const initialChauffeurs: Chauffeur[] =
    session.role === "chauffeur" && session.chauffeurId
      ? [ { id: session.chauffeurId, name: session.name, email: session.email } ]
      : [];

  const { data: chauffeursData } = useQuery( {
    queryKey: qk.chauffeurs(),
    queryFn: async () => {
      const res = await fetch( "/api/admin/chauffeurs" );
      const data = await res.json();
      if ( !data.success ) throw new Error( data.error ?? "Failed to load chauffeurs" );
      return data.chauffeurs as Chauffeur[];
    },
    enabled: session.role === "admin",
    placeholderData: initialChauffeurs,
  } );

  const chauffeurs = chauffeursData ?? initialChauffeurs;

  const [ selectedChauffeurId, setSelectedChauffeurId ] = useState<number | null>(
    session.role === "chauffeur" ? session.chauffeurId ?? null : null
  );

  const currentRole: Role =
    session.role === "admin"
      ? { type: "admin" }
      : { type: "chauffeur", id: session.chauffeurId, name: session.name };

  useEffect( () => {
    if ( selectedChauffeurId !== null && !chauffeurs.some( c => c.id === selectedChauffeurId ) ) {
      setSelectedChauffeurId( null );
    }
  }, [ chauffeurs, selectedChauffeurId ] );

  async function fetchChauffeurs() {
    await queryClient.invalidateQueries( { queryKey: qk.chauffeurs() } );
  }

  return (
    <AdminContext.Provider value={ {
      chauffeurs,
      currentRole,
      session,
      selectedChauffeurId,
      setSelectedChauffeurId,
      fetchChauffeurs,
    } }>
      { children }
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext( AdminContext );
  if ( !ctx ) throw new Error( "useAdmin must be used inside AdminProvider" );
  return ctx;
}
