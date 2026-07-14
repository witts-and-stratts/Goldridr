"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, LockKeyhole, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/admin-ui/button";
import { Input } from "@/components/admin-ui/input";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/admin-ui/card";

export default function ResetPasswordForm( { token }: { token: string } ) {
  const router = useRouter();
  const [password, setPassword] = useState( "" );
  const [confirm, setConfirm] = useState( "" );
  const [showPassword, setShowPassword] = useState( false );
  const [loading, setLoading] = useState( false );
  const [error, setError] = useState( "" );
  const [done, setDone] = useState( false );

  const handleSubmit = async ( event: FormEvent<HTMLFormElement> ) => {
    event.preventDefault();
    if ( password !== confirm ) {
      setError( "Passwords do not match" );
      return;
    }
    setLoading( true );
    setError( "" );
    try {
      const response = await fetch( "/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify( { token, password } ),
      } );
      const data = await response.json();
      if ( !response.ok || !data.success ) throw new Error( data.error || "Failed to reset password" );
      setDone( true );
      setTimeout( () => router.replace( "/login" ), 3000 );
    } catch ( err ) {
      setError( err instanceof Error ? err.message : "Failed to reset password" );
    } finally {
      setLoading( false );
    }
  };

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
              Reset password
            </CardTitle>
            <CardDescription className="text-white/55">
              Choose a new password for your account.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          { done ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="size-10 text-[#b99a56]" />
              <p className="font-medium">Password updated!</p>
              <p className="text-sm text-white/50">Redirecting you to sign in…</p>
            </div>
          ) : (
            <form onSubmit={ handleSubmit } className="space-y-5">
              <label className="grid gap-2 text-sm font-medium">
                New password
                <div className="relative">
                  <Input
                    type={ showPassword ? "text" : "password" }
                    value={ password }
                    onChange={ ( e ) => setPassword( e.target.value ) }
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    className="rounded-none border-white/15 bg-white/5 pr-11 text-white"
                    minLength={ 8 }
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={ () => setShowPassword( ( v ) => !v ) }
                    className="absolute right-0 top-0 flex size-10 items-center justify-center text-white/45 hover:text-white"
                    aria-label={ showPassword ? "Hide password" : "Show password" }
                  >
                    { showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" /> }
                  </button>
                </div>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Confirm password
                <Input
                  type={ showPassword ? "text" : "password" }
                  value={ confirm }
                  onChange={ ( e ) => setConfirm( e.target.value ) }
                  autoComplete="new-password"
                  placeholder="Repeat the new password"
                  className="rounded-none border-white/15 bg-white/5 text-white"
                  minLength={ 8 }
                  required
                />
              </label>
              { error && (
                <p role="alert" className="border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  { error }
                </p>
              ) }
              <Button
                type="submit"
                className="w-full rounded-none bg-[#b99a56] text-black hover:bg-[#c8aa64]"
                disabled={ loading }
              >
                { loading && <Loader2 className="animate-spin" /> }
                Set new password
              </Button>
              <p className="text-center text-xs text-white/40">
                <Link href="/login" className="hover:text-white/70 underline underline-offset-2">
                  Back to sign in
                </Link>
              </p>
            </form>
          ) }
        </CardContent>
      </Card>
    </main>
  );
}
