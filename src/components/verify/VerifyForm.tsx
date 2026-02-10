"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface VerifyFormProps {
  bookingReference: string;
  email: string;
  isLoading: boolean;
  onReferenceChange: ( value: string ) => void;
  onEmailChange: ( value: string ) => void;
  onSubmit: () => void;
}

export function VerifyForm( {
  bookingReference,
  email,
  isLoading,
  onReferenceChange,
  onEmailChange,
  onSubmit,
}: VerifyFormProps ) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8">
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Booking Reference
          </label>
          <Input
            placeholder="e.g., GR-X1Y2Z3AB"
            value={ bookingReference }
            onChange={ ( e ) => onReferenceChange( e.target.value.toUpperCase() ) }
            className="border-white/10 bg-white/5 text-white placeholder-gray-500 focus-visible:border-[#D4AF37] focus-visible:ring-1 focus-visible:ring-[#D4AF37] font-mono"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Email Address
          </label>
          <Input
            type="email"
            placeholder="your@email.com"
            value={ email }
            onChange={ ( e ) => onEmailChange( e.target.value ) }
            onKeyDown={ ( e ) => e.key === "Enter" && onSubmit() }
            className="border-white/10 bg-white/5 text-white placeholder-gray-500 focus-visible:border-[#D4AF37] focus-visible:ring-1 focus-visible:ring-[#D4AF37]"
          />
        </div>
        <Button
          onClick={ onSubmit }
          size="lg"
          disabled={ isLoading }
          className="w-full bg-[#D4AF37] hover:bg-[#C4A030] text-black font-wide uppercase tracking-wider"
        >
          { isLoading ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            <span className="uppercase tracking-widest">Verify Booking</span>
          ) }
        </Button>
      </div>
    </div>
  );
}
