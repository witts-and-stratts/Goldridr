"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

const CONSENT_KEY = "goldridr-cookie-consent-v1";

type ConsentChoice = "accepted" | "declined";

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): ConsentChoice | null {
  const stored = window.localStorage.getItem(CONSENT_KEY);
  return stored === "accepted" || stored === "declined" ? stored : null;
}

function getServerSnapshot(): ConsentChoice | null | undefined {
  return undefined;
}

function setConsent(value: ConsentChoice) {
  window.localStorage.setItem(CONSENT_KEY, value);
  listeners.forEach((listener) => listener());
}

export function CookieConsent() {
  const pathname = usePathname();
  const choice = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const visible = choice === null && !pathname?.startsWith("/admin");

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="cookie-consent"
          role="region"
          aria-label="Cookie policy"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 32 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 md:px-8 md:pb-6"
        >
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 rounded-lg border border-gold/30 bg-black/95 p-5 shadow-2xl backdrop-blur-md md:flex-row md:items-center md:gap-6 md:p-6">
            <div className="flex items-start gap-3 md:flex-1">
              <Cookie aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-gold" />
              <div className="space-y-1.5">
                <p className="site-label text-gold">Cookie Policy</p>
                <p className="text-sm font-light leading-relaxed text-gray-300">
                  We use essential cookies to run GoldRidr and optional cookies for maps,
                  analytics, and email measurement. Accept all or decline optional cookies.
                  See our{" "}
                  <Link
                    href="/privacy#cookies"
                    className="text-gold underline underline-offset-4 hover:text-gold/80"
                  >
                    Cookie Policy
                  </Link>
                  .
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-3 md:items-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 md:flex-none"
                onClick={() => setConsent("declined")}
              >
                Decline
              </Button>
              <Button
                type="button"
                size="sm"
                className="flex-1 md:flex-none"
                onClick={() => setConsent("accepted")}
              >
                Accept
              </Button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
