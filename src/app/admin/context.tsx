"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";

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
  setCurrentRole: (role: Role) => void;
  fetchChauffeurs: () => Promise<void>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [currentRole, setCurrentRole] = useState<Role>({ type: "admin" });

  const fetchChauffeurs = async () => {
    try {
      const res = await fetch("/api/admin/chauffeurs");
      const data = await res.json();
      if (data.success) setChauffeurs(data.chauffeurs);
    } catch {
      console.error("Failed to load chauffeurs");
    }
  };

  useEffect(() => {
    fetchChauffeurs();
  }, []);

  return (
    <AdminContext.Provider value={{ chauffeurs, currentRole, setCurrentRole, fetchChauffeurs }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside AdminProvider");
  return ctx;
}
