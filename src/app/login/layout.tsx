import type { ReactNode } from "react";
import { adminPwaMetadata, adminPwaViewport } from "@/lib/admin-pwa-metadata";
import "@/styles/admin-pwa.css";

export const metadata = adminPwaMetadata;
export const viewport = adminPwaViewport;

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
