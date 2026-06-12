"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/admin-ui/button";
import { Input } from "@/components/admin-ui/input";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/admin-ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => {
        if (response.ok) router.replace("/admin");
      })
      .finally(() => setChecking(false));
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to sign in");

      router.replace("/admin");
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-white">
        <Loader2 className="size-5 animate-spin text-[#b99a56]" />
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080808] px-4 py-12 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#2a2418_0,transparent_42%)] opacity-80" />
      <Card className="relative w-full max-w-md rounded-none border-white/10 bg-[#111]/95 text-white shadow-2xl">
        <CardHeader className="space-y-5 border-b border-white/10">
          <Image
            src="/assets/images/goldridr-logo-main.svg"
            alt="Goldridr"
            width={150}
            height={36}
            className="h-9 w-auto invert"
            priority
          />
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-xl">
              <LockKeyhole className="size-5 text-[#b99a56]" />
              Operations sign in
            </CardTitle>
            <CardDescription className="text-white/55">
              Use your administrator or chauffeur credentials.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="grid gap-2 text-sm font-medium">
              Email
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@goldridr.com"
                className="rounded-none border-white/15 bg-white/5 text-white placeholder:text-white/30"
                required
                autoFocus
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Password
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="rounded-none border-white/15 bg-white/5 pr-11 text-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-0 top-0 flex size-10 items-center justify-center text-white/45 hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </label>
            {error && (
              <p role="alert" className="border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full rounded-none bg-[#b99a56] text-black hover:bg-[#c8aa64]"
              disabled={loading}
            >
              {loading && <Loader2 className="animate-spin" />}
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
