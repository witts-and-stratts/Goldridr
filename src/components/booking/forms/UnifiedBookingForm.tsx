"use client";

import { Activity, useEffect, useId, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Loader2, MapPin, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { SuperField } from "@/components/ui/super-field";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm, useSelector } from "@tanstack/react-form";

import { BookingSummary } from "@/components/booking/BookingSummary";
import { MapOverlay } from "@/components/booking/MapOverlay";
import { RoutePreview } from "@/components/booking/RoutePreview";
import { ContactFormFields } from "@/components/booking/ContactFormFields";
import { showBookingErrorToast } from "@/components/booking/booking-errors";
import {
  ContactFormSchema,
  UnifiedBookingSchema,
  getFieldErrorMessage,
  type BookingServiceType,
  type UnifiedBookingData,
} from "@/lib/form-schemas";
import { getMinimumBookingDate } from "@/lib/booking-time";

interface UnifiedBookingFormProps {
  service?: BookingServiceType;
  onServiceChange?: ( service: BookingServiceType ) => void;
  onClose?: () => void;
  onSuccess: () => void;
}

const SERVICES: { value: BookingServiceType; label: string; }[] = [
  { value: "airport", label: "Airport Transfer" },
  { value: "city", label: "Around Town" },
  { value: "hourly", label: "By the Hour" },
];

const HOURLY_RATE = 75;

// Texas airport IATA codes — used to work out whether the guest is arriving into
// our service area (pick up at the airport) or departing from it (drop off there).
const TEXAS_AIRPORTS = [
  "IAH", "HOU", "DFW", "DAL", "AUS", "SAT", "ELP", "LBB", "MAF", "CRP", "HRL", "MFE",
];

type FlightDetails = {
  airline: string;
  departure: string;
  arrival: string;
  status: string;
  flightNumber: string;
  terminal: string;
  departureTerminal: string;
  gate: string;
  origin: string;
  destination: string;
  originAirport: string;
  destinationAirport: string;
  flightDate: string;
};

type DistanceData = {
  total_miles: number;
  duration_minutes: number;
  duration_text: string;
  price_per_mile: number;
  total_price: number;
};

type Step = 1 | 2 | 3;

function toApiDate( value: Date ): string {
  const year = value.getFullYear();
  const month = String( value.getMonth() + 1 ).padStart( 2, "0" );
  const day = String( value.getDate() ).padStart( 2, "0" );
  return `${ year }-${ month }-${ day }`;
}

export function UnifiedBookingForm( {
  service = "airport",
  onServiceChange,
  onClose,
  onSuccess,
}: UnifiedBookingFormProps ) {
  // The header's booking overlay can mount a second copy over the /book page, so the
  // ids the footer buttons target have to be unique per instance.
  const instanceId = useId();
  const tripFormId = `trip-form-${ instanceId }`;
  const contactFormId = `contact-form-${ instanceId }`;

  const [ step, setStep ] = useState<Step>( 1 );
  const [ distanceData, setDistanceData ] = useState<DistanceData | null>( null );
  const [ isDistanceLoading, setIsDistanceLoading ] = useState( false );
  const [ routeMapUrl, setRouteMapUrl ] = useState<{ small: string; large: string; } | null>( null );
  const [ showMapOverlay, setShowMapOverlay ] = useState( false );
  const [ flightDetails, setFlightDetails ] = useState<FlightDetails | null>( null );
  const [ isFlightLoading, setIsFlightLoading ] = useState( false );
  const [ tripDirection, setTripDirection ] = useState<"to_airport" | "from_airport" | null>( null );

  const flightTimeoutRef = useRef<NodeJS.Timeout | null>( null );
  const distanceTimeoutRef = useRef<NodeJS.Timeout | null>( null );

  const form = useForm( {
    defaultValues: {
      serviceType: service,
      pickupLocation: "",
      dropoffLocation: "",
      date: new Date(),
      time: "",
      passengers: "2",
      luggage: "2",
      flightNumber: "",
      terminal: "",
      duration: "",
    } as UnifiedBookingData,
    validators: {
      onSubmit: UnifiedBookingSchema,
    },
    onSubmit: async () => {
      setStep( 2 );
    },
  } );

  const contactForm = useForm( {
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      notes: "",
      discountCode: "",
      smsOptIn: false,
    },
    validators: {
      onSubmit: ContactFormSchema,
    },
    onSubmit: async () => {
      setStep( 3 );
    },
  } );

  const [ isSubmitting, setIsSubmitting ] = useState( false );

  const selectService = ( next: BookingServiceType ) => {
    form.setFieldValue( "serviceType", next );
    if ( next !== "airport" ) {
      setFlightDetails( null );
      setTripDirection( null );
    }
    onServiceChange?.( next );
  };

  const fetchFlightDetails = ( flightNumber: string ) => {
    if ( flightTimeoutRef.current ) clearTimeout( flightTimeoutRef.current );

    if ( flightNumber.length < 3 ) {
      setFlightDetails( null );
      setIsFlightLoading( false );
      return;
    }

    setIsFlightLoading( true );
    flightTimeoutRef.current = setTimeout( async () => {
      try {
        const response = await fetch( `/api/flights?flight_iata=${ flightNumber.toUpperCase() }` );
        const data = await response.json();

        if ( !response.ok || data.error ) {
          setFlightDetails( null );
          return;
        }

        let departureTime = "--:--";
        let arrivalTime = "--:--";
        let flightDate = "";

        if ( data.departure?.scheduled ) {
          const depDate = new Date( data.departure.scheduled );
          departureTime = depDate.toLocaleTimeString( [], { hour: "2-digit", minute: "2-digit", hour12: false } );
          flightDate = depDate.toLocaleDateString( undefined, { day: "numeric", month: "short", year: "numeric" } );
        }
        if ( data.arrival?.scheduled ) {
          const arrDate = new Date( data.arrival.scheduled );
          arrivalTime = arrDate.toLocaleTimeString( [], { hour: "2-digit", minute: "2-digit", hour12: false } );
        }

        setFlightDetails( {
          airline: data.airline?.name || "Unknown Airline",
          departure: departureTime,
          arrival: arrivalTime,
          status: data.flight_status
            ? data.flight_status.charAt( 0 ).toUpperCase() + data.flight_status.slice( 1 )
            : "Scheduled",
          flightNumber: data.flight?.iata || flightNumber.toUpperCase(),
          terminal: data.arrival?.terminal || "-",
          departureTerminal: data.departure?.terminal || "-",
          gate: data.arrival?.gate || "-",
          origin: data.departure?.iata || "UNK",
          destination: data.arrival?.iata || "UNK",
          originAirport: data.departure?.airport || "",
          destinationAirport: data.arrival?.airport || "",
          flightDate,
        } );

        const originCode = data.departure?.iata?.toUpperCase();
        const destinationCode = data.arrival?.iata?.toUpperCase();

        if ( TEXAS_AIRPORTS.includes( destinationCode ) ) {
          setTripDirection( "from_airport" );
          if ( data.arrival?.airport ) form.setFieldValue( "pickupLocation", data.arrival.airport );
          if ( data.arrival?.terminal ) form.setFieldValue( "terminal", data.arrival.terminal );
          if ( data.arrival?.scheduled ) {
            const arrDate = new Date( data.arrival.scheduled );
            form.setFieldValue( "date", arrDate );
            form.setFieldValue( "time", arrDate.toLocaleTimeString( [], { hour: "2-digit", minute: "2-digit", hour12: false } ) );
          }
        } else if ( TEXAS_AIRPORTS.includes( originCode ) ) {
          setTripDirection( "to_airport" );
          if ( data.departure?.airport ) form.setFieldValue( "dropoffLocation", data.departure.airport );
          if ( data.departure?.terminal ) form.setFieldValue( "terminal", data.departure.terminal );
          if ( data.departure?.scheduled ) {
            const depDate = new Date( data.departure.scheduled );
            depDate.setHours( depDate.getHours() - 2 );
            form.setFieldValue( "date", depDate );
            form.setFieldValue( "time", depDate.toLocaleTimeString( [], { hour: "2-digit", minute: "2-digit", hour12: false } ) );
          }
        }
      } catch {
        setFlightDetails( null );
      } finally {
        setIsFlightLoading( false );
      }
    }, 1000 );
  };

  useEffect( () => {
    return () => {
      if ( flightTimeoutRef.current ) clearTimeout( flightTimeoutRef.current );
      if ( distanceTimeoutRef.current ) clearTimeout( distanceTimeoutRef.current );
    };
  }, [] );

  // The route panel is live from step 1, so distance and map are fetched as soon as
  // both addresses look complete rather than waiting for the confirmation screen.
  // Select primitives one by one — subscribing to the whole `values` object would
  // re-render forever, since the derived store rebuilds it on every emission.
  const serviceType = useSelector( form.store, ( state ) => state.values.serviceType );
  const pickupLocation = useSelector( form.store, ( state ) => state.values.pickupLocation );
  const dropoffLocation = useSelector( form.store, ( state ) => state.values.dropoffLocation );
  const durationValue = useSelector( form.store, ( state ) => state.values.duration );
  const terminalValue = useSelector( form.store, ( state ) => state.values.terminal );

  useEffect( () => {
    if ( distanceTimeoutRef.current ) clearTimeout( distanceTimeoutRef.current );

    if ( serviceType === "hourly" || pickupLocation.trim().length < 5 || dropoffLocation.trim().length < 5 ) {
      distanceTimeoutRef.current = setTimeout( () => {
        setDistanceData( null );
        setRouteMapUrl( null );
        setIsDistanceLoading( false );
      }, 0 );
      return;
    }

    distanceTimeoutRef.current = setTimeout( async () => {
      setIsDistanceLoading( true );
      const origin = encodeURIComponent( pickupLocation );
      const destination = encodeURIComponent( dropoffLocation );

      try {
        const [ distanceRes, smallRes, largeRes ] = await Promise.all( [
          fetch( `/api/distance?origin=${ origin }&destination=${ destination }&type=${ serviceType }` ),
          fetch( `/api/route-map?origin=${ origin }&destination=${ destination }&size=400x200` ),
          fetch( `/api/route-map?origin=${ origin }&destination=${ destination }&size=800x400` ),
        ] );

        const [ distance, small, large ] = await Promise.all( [
          distanceRes.json(),
          smallRes.json(),
          largeRes.json(),
        ] );

        if ( distance.success ) setDistanceData( distance );
        if ( small.success && large.success ) {
          setRouteMapUrl( { small: small.staticMapUrl, large: large.staticMapUrl } );
        }
      } catch ( error ) {
        console.error( "Failed to fetch route details:", error );
      } finally {
        setIsDistanceLoading( false );
      }
    }, 800 );
  }, [ serviceType, pickupLocation, dropoffLocation ] );

  const hourlyHours = durationValue ? Number.parseInt( durationValue, 10 ) : null;
  const hourlyData = serviceType === "hourly" && hourlyHours
    ? { hours: hourlyHours, rate: HOURLY_RATE, totalPrice: hourlyHours * HOURLY_RATE }
    : undefined;

  const submitBooking = async () => {
    const contact = contactForm.state.values;
    const values = form.state.values;
    setIsSubmitting( true );
    toast.loading( "Processing your booking..." );

    try {
      const response = await fetch( "/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify( {
          date: toApiDate( new Date( values.date ) ),
          time: values.time,
          duration: serviceType === "hourly"
            ? ( hourlyHours ?? 1 ) * 60
            : ( distanceData?.duration_minutes || 60 ),
          attendee: {
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
          },
          notes: contact.notes,
          discountCode: contact.discountCode?.trim() || undefined,
          smsOptIn: contact.smsOptIn,
          smsConsentVersion: "2026-01",
          tripType: serviceType,
          tripDetails: {
            pickupLocation: values.pickupLocation,
            dropoffLocation: serviceType === "hourly" ? undefined : values.dropoffLocation,
            passengers: values.passengers,
            luggage: values.luggage,
            flightNumber: serviceType === "airport" ? values.flightNumber : undefined,
            terminal: serviceType === "airport" ? values.terminal : undefined,
            tripDirection: serviceType === "airport" ? tripDirection : undefined,
            flightDetails: serviceType === "airport" && flightDetails ? {
              airline: flightDetails.airline,
              departure: flightDetails.departure,
              arrival: flightDetails.arrival,
              flightNumber: flightDetails.flightNumber,
              origin: flightDetails.origin,
              destination: flightDetails.destination,
            } : undefined,
            hours: serviceType === "hourly" ? hourlyHours ?? undefined : undefined,
            estimatedPrice: hourlyData?.totalPrice ?? distanceData?.total_price,
            estimatedDistance: distanceData?.total_miles,
            estimatedDuration: distanceData?.duration_text,
            estimatedDurationMinutes: distanceData?.duration_minutes,
          },
        } ),
      } );

      const data = await response.json();
      toast.dismiss();

      if ( data.success ) {
        toast.success( "Booking confirmed!", {
          description: `Your booking reference is ${ data.booking?.reference || "" }. We'll send you a confirmation email shortly.`,
        } );
        onSuccess();
      } else {
        showBookingErrorToast( data, ( slot ) => {
          form.setFieldValue( "date", new Date( `${ slot.date }T00:00:00` ) );
          form.setFieldValue( "time", slot.time );
          setStep( 1 );
        } );
      }
    } catch {
      toast.dismiss();
      toast.error( "Booking failed", {
        description: "An unexpected error occurred. Please try again.",
      } );
    } finally {
      setIsSubmitting( false );
    }
  };

  const stepTitle = step === 1 ? "Reserve Your Chauffeur" : step === 2 ? "Your Details" : "Review & Confirm";

  return (
    <motion.div
      initial={ { opacity: 0, y: 16 } }
      animate={ { opacity: 1, y: 0 } }
      exit={ { opacity: 0, y: -16 } }
      className="relative grid w-full max-w-6xl overflow-hidden rounded-xl border border-white/10 bg-black/70 backdrop-blur-md lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]"
    >
      { onClose && (
        <button
          type="button"
          onClick={ onClose }
          aria-label="Close booking"
          className="absolute right-5 top-5 z-20 flex size-9 items-center justify-center border border-white/10 text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <X className="size-4" />
        </button>
      ) }

      {/* Left: the single merged form */ }
      <div className="flex max-h-[88vh] min-h-[520px] flex-col p-6 sm:p-10">
        <div className="shrink-0">
          {/* Desktop keeps back, title and step count on one line; below lg the title
              drops onto its own row underneath them. */ }
          <div className="flex min-h-9 flex-wrap items-center gap-x-4 pr-12">
            { step > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={ () => setStep( ( current ) => ( current - 1 ) as Step ) }
                className="-ml-3 shrink-0 text-[11px] uppercase tracking-[0.2em] text-white/70 hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft className="mr-2 size-4" />
                Back
              </Button>
            ) }

            <h2 className="order-last mt-4 w-full text-2xl font-wide text-white lowercase tracking-widest lg:order-none lg:mt-0 lg:w-auto">{ stepTitle }</h2>

            <span className="ml-auto shrink-0 text-[11px] uppercase tracking-[0.25em] text-white/50">Step { step } / 3</span>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3" aria-hidden>
            { ( [ 1, 2, 3 ] as const ).map( ( index ) => (
              <span
                key={ index }
                className={ `h-px transition-colors ${ index <= step ? "bg-gold" : "bg-white/15" }` }
              />
            ) ) }
          </div>
        </div>

        <div className="mt-8 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
          {/* Activity keeps every step mounted, so moving between them — or switching
              service and coming back — never discards what is already filled in. */ }
          <Activity mode={ step === 1 ? "visible" : "hidden" }>
            <form
              id={ tripFormId }
              onSubmit={ ( e ) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              } }
              className="space-y-6"
            >
              {/* Service switch — the three former forms, now one. Only the tab list is
                  used, with no Tabs.Panel: the services share a single set of fields
                  that Activity keeps mounted, rather than three separate panels. */ }
              <Tabs
                value={ serviceType }
                onValueChange={ ( value ) => selectService( value as BookingServiceType ) }
              >
                {/* Base UI defaults to manual activation (arrows move focus, Enter
                    selects). These read as a segmented control, so arrowing switches
                    the service outright — the switch is cheap and fully reversible. */ }
                <TabsList
                  variant="line"
                  activateOnFocus
                  className="h-auto w-full flex-wrap justify-start gap-3 bg-transparent p-0"
                >
                  { SERVICES.map( ( option ) => (
                    <TabsTrigger
                      key={ option.value }
                      value={ option.value }
                      className="h-auto flex-none border-white/10 px-5 py-3 text-[11px] uppercase tracking-[0.2em] text-white/60 transition after:hidden hover:border-white/30 hover:text-white data-active:border-gold data-active:bg-gold/15 data-active:text-gold"
                    >
                      { option.label }
                    </TabsTrigger>
                  ) ) }
                </TabsList>
              </Tabs>

              <Activity mode={ serviceType === "airport" ? "visible" : "hidden" }>
                <div className="space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <form.Field
                      name="flightNumber"
                      children={ ( field ) => (
                        <Field>
                          <FieldLabel htmlFor={ field.name }>Flight No.</FieldLabel>
                          <div className="relative">
                            <Input
                              id={ field.name }
                              placeholder="UA 1476"
                              value={ field.state.value }
                              onChange={ ( e ) => {
                                const value = e.target.value.replaceAll( " ", "" );
                                field.handleChange( value );
                                fetchFlightDetails( value );
                              } }
                              onBlur={ field.handleBlur }
                              className={ getFieldErrorMessage( field.state.meta.errors ) ? "border-destructive focus-visible:ring-destructive" : "" }
                            />
                            { isFlightLoading && (
                              <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-gold" />
                            ) }
                          </div>
                          { getFieldErrorMessage( field.state.meta.errors ) && (
                            <FieldError className="font-regular">
                              { getFieldErrorMessage( field.state.meta.errors ) }
                            </FieldError>
                          ) }
                        </Field>
                      ) }
                    />

                    <form.Field
                      name="terminal"
                      children={ ( field ) => (
                        <SuperField
                          type="text"
                          id={ field.name }
                          label="Terminal"
                          placeholder="IAH — Terminal C"
                          value={ field.state.value }
                          onChange={ ( e ) => field.handleChange( e.target.value ) }
                          onBlur={ field.handleBlur }
                          error={ getFieldErrorMessage( field.state.meta.errors ) }
                        />
                      ) }
                    />
                  </div>
                </div>
              </Activity>

              <form.Field
                name="pickupLocation"
                children={ ( field ) => (
                  <SuperField
                    type="location"
                    id={ field.name }
                    label="Pickup"
                    placeholder="Address, hotel or airport"
                    value={ field.state.value }
                    onChange={ field.handleChange }
                    onBlur={ field.handleBlur }
                    error={ getFieldErrorMessage( field.state.meta.errors ) }
                    suffix={ <MapPin strokeWidth={ 1 } /> }
                  />
                ) }
              />

              <Activity mode={ serviceType !== "hourly" ? "visible" : "hidden" }>
                <form.Field
                  name="dropoffLocation"
                  children={ ( field ) => (
                    <SuperField
                      type="location"
                      id={ field.name }
                      label="Drop-off"
                      placeholder="Where are we taking you?"
                      value={ field.state.value }
                      onChange={ field.handleChange }
                      onBlur={ field.handleBlur }
                      error={ getFieldErrorMessage( field.state.meta.errors ) }
                      suffix={ <MapPin strokeWidth={ 1 } /> }
                    />
                  ) }
                />
              </Activity>

              <div className="grid gap-6 sm:grid-cols-2">
                <form.Field
                  name="date"
                  children={ ( field ) => (
                    <SuperField
                      type="datepicker"
                      id={ field.name }
                      label="Date"
                      minDate={ getMinimumBookingDate() }
                      value={ field.state.value }
                      onChange={ ( val ) => field.handleChange( val ?? field.state.value ) }
                      onBlur={ field.handleBlur }
                      error={ getFieldErrorMessage( field.state.meta.errors ) }
                      fieldClassName="font-sans tracking-normal"
                    />
                  ) }
                />

                <form.Field
                  name="time"
                  children={ ( field ) => (
                    <SuperField
                      type="timepicker"
                      label="Time"
                      name={ field.name }
                      value={ field.state.value }
                      onChange={ ( e: React.ChangeEvent<HTMLInputElement> ) => field.handleChange( e.target.value ) }
                      onBlur={ field.handleBlur }
                      placeholder="HH:MM"
                      error={ getFieldErrorMessage( field.state.meta.errors ) }
                    />
                  ) }
                />
              </div>

              <Activity mode={ serviceType === "hourly" ? "visible" : "hidden" }>
                <form.Field
                  name="duration"
                  children={ ( field ) => (
                    <SuperField
                      type="select"
                      id={ field.name }
                      label="Duration"
                      size="lg"
                      placeholder="Select duration"
                      value={ field.state.value }
                      onValueChange={ ( val: string | null ) => field.handleChange( val || "" ) }
                      onBlur={ field.handleBlur }
                      error={ getFieldErrorMessage( field.state.meta.errors ) }
                      options={ [ 2, 3, 4, 5, 6, 8, 10, 12 ].map( ( hours ) => ( {
                        value: hours.toString(),
                        label: `${ hours } hours — $${ hours * HOURLY_RATE }`,
                      } ) ) }
                    />
                  ) }
                />
              </Activity>

              {/* Compact trailing row, as in the reference layout */ }
              <div className="flex flex-wrap items-end gap-6 border-t border-white/10 pt-6">
                <form.Field
                  name="passengers"
                  children={ ( field ) => (
                    <label className="flex items-center gap-3">
                      <span className="text-[11px] uppercase tracking-[0.2em] text-white/60">Passengers</span>
                      <Input
                        type="number"
                        min={ 1 }
                        max={ 12 }
                        value={ field.state.value }
                        onChange={ ( e ) => field.handleChange( e.target.value ) }
                        onBlur={ field.handleBlur }
                        className="w-20 text-center"
                      />
                    </label>
                  ) }
                />

                <form.Field
                  name="luggage"
                  children={ ( field ) => (
                    <label className="flex items-center gap-3">
                      <span className="text-[11px] uppercase tracking-[0.2em] text-white/60">Luggage</span>
                      <Input
                        type="number"
                        min={ 0 }
                        max={ 12 }
                        value={ field.state.value }
                        onChange={ ( e ) => field.handleChange( e.target.value ) }
                        onBlur={ field.handleBlur }
                        className="w-20 text-center"
                      />
                    </label>
                  ) }
                />
              </div>
            </form>
          </Activity>

          <Activity mode={ step === 2 ? "visible" : "hidden" }>
            <form
              id={ contactFormId }
              onSubmit={ ( e ) => {
                e.preventDefault();
                e.stopPropagation();
                contactForm.handleSubmit();
              } }
              className="space-y-4"
            >
              <ContactFormFields form={ contactForm } />
            </form>
          </Activity>

          <Activity mode={ step === 3 ? "visible" : "hidden" }>
            <BookingSummary
              bookingType={ serviceType === "city" ? "town" : serviceType }
              bookingData={ form.state.values }
              distanceData={ distanceData }
              hourlyData={ hourlyData }
              flightDetails={ serviceType === "airport" ? flightDetails : null }
              mapPreviewUrl={ routeMapUrl?.small }
              isDistanceLoading={ isDistanceLoading }
              onShowMap={ () => setShowMapOverlay( true ) }
            />
          </Activity>
        </div>

        <div className="mt-8 flex shrink-0 items-center gap-4">
          { step === 1 && (
            <form.Subscribe
              selector={ ( state ) => state.isSubmitting }
              children={ ( submitting ) => (
                <Button
                  type="submit"
                  form={ tripFormId }
                  size="lg"
                  disabled={ submitting }
                  className="ml-auto min-w-48 bg-gold uppercase tracking-[0.2em] text-black hover:bg-gold/80"
                >
                  Continue
                </Button>
              ) }
            />
          ) }

          { step === 2 && (
            <Button
              type="submit"
              form={ contactFormId }
              size="lg"
              className="ml-auto min-w-48 bg-gold uppercase tracking-[0.2em] text-black hover:bg-gold/80"
            >
              Continue
            </Button>
          ) }

          { step === 3 && (
            <Button
              type="button"
              size="lg"
              disabled={ isSubmitting }
              onClick={ submitBooking }
              className="ml-auto min-w-48 bg-gold uppercase tracking-[0.2em] text-black hover:bg-gold/80"
            >
              { isSubmitting ? "..." : "Confirm Booking" }
            </Button>
          ) }
        </div>
      </div>

      <RoutePreview
        pickupLocation={ pickupLocation }
        dropoffLocation={ dropoffLocation }
        serviceType={ serviceType }
        distanceData={ distanceData }
        hourlyHours={ hourlyHours }
        mapPreviewUrl={ routeMapUrl?.small }
        flightDetails={ serviceType === "airport" && !isFlightLoading ? flightDetails : null }
        terminal={ terminalValue }
        isLoading={ isDistanceLoading }
        onShowMap={ () => setShowMapOverlay( true ) }
      />

      <MapOverlay
        isOpen={ showMapOverlay }
        onClose={ () => setShowMapOverlay( false ) }
        routeMapUrl={ routeMapUrl }
        pickupLocation={ pickupLocation }
        dropoffLocation={ dropoffLocation }
        distanceData={ distanceData }
      />
    </motion.div>
  );
}
