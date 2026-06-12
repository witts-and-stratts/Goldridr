"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { AuthSession } from "@/lib/auth";

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
  setSelectedChauffeurId: (id: number | null) => void;
  fetchChauffeurs: () => Promise<void>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: AuthSession;
}) {
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>(
    session.role === "chauffeur" && session.chauffeurId
      ? [{
          id: session.chauffeurId,
          name: session.name,
          email: session.email,
        }]
      : []
  );
  const [selectedChauffeurId, setSelectedChauffeurId] = useState<number | null>(
    session.role === "chauffeur" ? session.chauffeurId ?? null : null
  );
  const currentRole: Role = session.role === "admin"
    ? { type: "admin" }
    : { type: "chauffeur", id: session.chauffeurId, name: session.name };

  const fetchChauffeurs = useCallback(async () => {
    if (session.role !== "admin") return;

    try {
      const res = await fetch("/api/admin/chauffeurs");
      const data = await res.json();
      if (data.success) {
        setChauffeurs(data.chauffeurs);
        setSelectedChauffeurId((selectedId) => {
          if (selectedId !== null && !data.chauffeurs.some((chauffeur: Chauffeur) => chauffeur.id === selectedId)) {
            return null;
          }
          return selectedId;
        });
      }
    } catch {
      console.error("Failed to load chauffeurs");
    }
  }, [session.role]);

  useEffect(() => {
    // Initial remote state hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchChauffeurs();
  }, [fetchChauffeurs]);

  return (
    <AdminContext.Provider value={{
      chauffeurs,
      currentRole,
      session,
      selectedChauffeurId,
      setSelectedChauffeurId,
      fetchChauffeurs,
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside AdminProvider");
  return ctx;
}
