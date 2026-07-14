"use client";

import { useState, useCallback } from "react";
import { Camera, CameraOff, QrCode, Keyboard, Phone } from "lucide-react";
import { Button } from "@/components/admin-ui/button";
import { Input } from "@/components/admin-ui/input";
import { cn } from "@/lib/utils";
import { useQrScanner } from "./hooks/use-qr-scanner";
import { RideResult } from "./components/ride-result";

export default function ScanPage() {
  const { videoRef, canvasRef, state, errorMsg, ride, startCamera, reset, lookupPayload } = useQrScanner();
  const [manualRef, setManualRef] = useState("");
  const [showManual, setShowManual] = useState(false);

  const handleReset = useCallback(() => {
    reset();
    setManualRef("");
  }, [reset]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualRef.trim()) return;
    void lookupPayload(manualRef.trim());
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Scan QR Code</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Point the camera at a rider&apos;s booking QR code to look up their ride.
        </p>
      </header>

      {state === "found" && ride ? (
        <RideResult ride={ride} onReset={handleReset} />
      ) : (
        <div className="space-y-4">
          {/* Camera viewport */}
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-border">
            <video
              ref={videoRef}
              className={cn("w-full h-full object-cover", state !== "scanning" && "hidden")}
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Idle / error state */}
            {(state === "idle" || state === "error") && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/60">
                {state === "error"
                  ? <CameraOff className="size-10 opacity-50" />
                  : <Camera className="size-10 opacity-50" />
                }
                <p className="text-sm text-center px-6 text-white/50">
                  {state === "error" ? errorMsg : "Camera preview will appear here"}
                </p>
              </div>
            )}

            {/* Loading overlay */}
            {state === "loading" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="flex flex-col items-center gap-2 text-white">
                  <QrCode className="size-8 animate-pulse" />
                  <p className="text-sm">Looking up booking…</p>
                </div>
              </div>
            )}

            {/* Scanning overlay */}
            {state === "scanning" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative size-48">
                  <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl" />
                  <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr" />
                  <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl" />
                  <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br" />
                  <div className="absolute inset-x-0 top-1/2 h-px bg-white/40 animate-pulse" />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {state === "scanning" ? (
              <Button variant="outline" onClick={handleReset} className="gap-1.5">
                <CameraOff className="size-4" />
                Stop camera
              </Button>
            ) : (
              <Button onClick={startCamera} disabled={state === "loading"} className="gap-1.5">
                <Camera className="size-4" />
                {state === "error" ? "Try again" : "Start camera"}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 ml-auto"
              onClick={() => setShowManual(v => !v)}
            >
              <Keyboard className="size-3.5" />
              {showManual ? "Hide manual entry" : "Enter reference manually"}
            </Button>
          </div>

          {/* Manual entry */}
          {showManual && (
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                value={manualRef}
                onChange={e => setManualRef(e.target.value.toUpperCase())}
                placeholder="e.g. ABC-1234"
                className="font-mono uppercase"
                maxLength={32}
              />
              <Button type="submit" disabled={state === "loading" || !manualRef.trim()}>
                Look up
              </Button>
            </form>
          )}

          {state === "error" && errorMsg && (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-destructive inline-block" />
              {errorMsg}
            </p>
          )}

          {/* Hint row */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="size-3 shrink-0" />
            <span>Requires HTTPS or localhost. Allow camera permission when prompted.</span>
          </div>
        </div>
      )}
    </div>
  );
}
