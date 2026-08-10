import { BookingPageFlow } from "@/components/booking/BookingPageFlow";
import type { BookingServiceSlug } from "@/components/booking/booking-services";
import { Footer } from "@/components/home/Footer";
import { Header } from "@/components/home/Header";
import { Suspense } from "react";

export function BookingPageShell( { service }: { service?: BookingServiceSlug } ) {
  return (
    <>
      <Header />
      <main className="min-h-screen text-white selection:bg-gold/30">
        <div className="container mx-auto flex min-h-[80vh] items-center justify-center pb-16 w-full">
          <Suspense fallback={ <p className="site-copy text-gray-400">Loading booking form…</p> }>
            <BookingPageFlow service={ service } />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}