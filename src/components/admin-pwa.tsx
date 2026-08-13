"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/admin-ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/admin-ui/dialog";

const DISMISS_KEY = "goldridr-admin-install-dismissed-v1";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isStandalone() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches
    || navigatorWithStandalone.standalone === true;
}

function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function AdminPwa({ showInstallPrompt = false }: { showInstallPrompt?: boolean }) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [offerInstall, setOfferInstall] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register("/admin-sw.js", {
          scope: "/",
          updateViaCache: "none",
        })
        .catch(() => undefined);
    }

    if (!showInstallPrompt || isStandalone()) return;

    const dismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
    const iosDevice = isIosDevice();
    const frame = window.requestAnimationFrame(() => {
      if (iosDevice && !dismissed) setOfferInstall(true);
    });

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
      setInstallEvent(event as BeforeInstallPromptEvent);
      setOfferInstall(true);
    };
    const handleInstalled = () => {
      setInstallEvent(null);
      setOfferInstall(false);
      setShowIosHelp(false);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [showInstallPrompt]);

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setOfferInstall(false);
    setShowIosHelp(false);
  };

  const install = async () => {
    if (isIosDevice()) {
      setShowIosHelp(true);
      return;
    }
    if (!installEvent) return;

    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    setInstallEvent(null);
    if (choice.outcome === "dismissed") dismiss();
  };

  if (!showInstallPrompt || !offerInstall) return null;

  return (
    <>
      <div className="admin-install-offer" role="group" aria-label="Install GoldRidr Admin">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="admin-install-button"
          onClick={install}
        >
          <Download aria-hidden="true" />
          <span>Install app</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="admin-install-dismiss"
          onClick={dismiss}
          aria-label="Dismiss install app suggestion"
        >
          <X aria-hidden="true" />
        </Button>
      </div>

      <Dialog open={showIosHelp} onOpenChange={setShowIosHelp}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Install GoldRidr Admin</DialogTitle>
            <DialogDescription>
              Safari installs this app from its Share menu.
            </DialogDescription>
          </DialogHeader>
          <ol className="grid gap-4 text-sm">
            <li className="flex gap-3">
              <span className="admin-install-step">1</span>
              <span>Tap <strong>Share</strong> in Safari.</span>
              <Share className="ml-auto size-5 shrink-0" aria-hidden="true" />
            </li>
            <li className="flex gap-3">
              <span className="admin-install-step">2</span>
              <span>Choose <strong>Add to Home Screen</strong>.</span>
            </li>
            <li className="flex gap-3">
              <span className="admin-install-step">3</span>
              <span>Tap <strong>Add</strong> to finish.</span>
            </li>
          </ol>
          <DialogFooter>
            <Button type="button" onClick={dismiss}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
