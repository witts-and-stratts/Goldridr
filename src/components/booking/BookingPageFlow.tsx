"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookingFlow } from "./BookingFlow";
import type { BookingServiceSlug, BookingView } from "./booking-services";

// Each service still has its own URL so a booking link can be shared or bookmarked.
// Switching service rewrites the URL with history.replaceState rather than router.push:
// a push crosses a route segment boundary, which remounts the form and throws away
// everything the guest has already filled in.
// Mirrors the `metadata.title` of each /book route. replaceState does not re-run
// route metadata, so the title is applied by hand to keep the tab in step.
const VIEW_TITLES: Record<BookingView, string> = {
  options: "Book a Ride | Goldridr",
  airport: "Book an Airport Ride | Goldridr",
  city: "Book an Around Town Ride | Goldridr",
  hourly: "Book an Hourly Charter | Goldridr",
};

export function BookingPageFlow( { service }: { service?: BookingServiceSlug } ) {
  const router = useRouter();
  const [ view, setView ] = useState<BookingView>( service || "options" );

  const changeView = ( next: BookingView ) => {
    setView( next );
    window.history.replaceState( null, "", next === "options" ? "/book" : `/book/${ next }` );
    document.title = VIEW_TITLES[ next ];
  };

  return (
    <BookingFlow
      view={ view }
      onViewChange={ changeView }
      onSuccess={ () => router.push( "/" ) }
    />
  );
}
