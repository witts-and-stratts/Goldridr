"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import type { DriverRide, ScanState } from "../types";

export function useQrScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScannedRef = useRef<string>("");

  const [state, setState] = useState<ScanState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [ride, setRide] = useState<DriverRide | null>(null);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const lookupPayload = useCallback(async (payload: string) => {
    setState("loading");
    try {
      const res = await fetch("/api/admin/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });
      const data = await res.json();
      if (data.success) {
        stopCamera();
        setRide(data.ride);
        setState("found");
      } else {
        setErrorMsg(data.error ?? "Booking not found");
        setState("error");
      }
    } catch {
      setErrorMsg("Network error — please try again");
      setState("error");
    }
  }, [stopCamera]);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
    if (code && code.data && code.data !== lastScannedRef.current) {
      lastScannedRef.current = code.data;
      void lookupPayload(code.data);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [lookupPayload]);

  const startCamera = useCallback(async () => {
    setErrorMsg(""); setRide(null); lastScannedRef.current = "";
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMsg("Camera not available — this page requires HTTPS or localhost");
      setState("error"); return;
    }
    setState("scanning");
    const constraints: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
      { video: { facingMode: "user" } },
      { video: true },
    ];
    let stream: MediaStream | null = null;
    let lastErr: unknown;
    for (const constraint of constraints) {
      try { stream = await navigator.mediaDevices.getUserMedia(constraint); break; }
      catch (err) { lastErr = err; if (err instanceof Error && err.name === "NotAllowedError") break; }
    }
    if (!stream) {
      const err = lastErr instanceof Error ? lastErr : null;
      const msg = err?.name === "NotAllowedError"
        ? "Camera access denied — tap Allow when the browser asks for camera permission"
        : err?.name === "NotFoundError"
          ? "No camera found on this device"
          : "Could not start camera — try reloading the page";
      setErrorMsg(msg); setState("error"); return;
    }
    streamRef.current = stream;
    if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const reset = useCallback(() => {
    stopCamera(); setRide(null); setErrorMsg(""); lastScannedRef.current = ""; setState("idle");
  }, [stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  return { videoRef, canvasRef, state, errorMsg, ride, startCamera, reset, lookupPayload };
}
