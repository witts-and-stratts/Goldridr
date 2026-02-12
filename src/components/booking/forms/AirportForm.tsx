import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { useForm } from "@tanstack/react-form";
import { ArrowLeft, Loader2, MapPin, Plane } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import * as z from "zod";

interface AirportFormProps {
  onBack: () => void;
}

// Shared imports
import { BookingSummary } from "@/components/booking/BookingSummary";
import { MapOverlay } from "@/components/booking/MapOverlay";
import { SuperField } from "@/components/ui/super-field";
import { AirportFormSchema, ContactFormSchema, getFieldErrorMessage, type AirportFormData } from "@/lib/form-schemas";

type BookingData = AirportFormData & {
  flightDetails: {
    airline: string;
    departure: string;
    arrival: string;
    flightNumber: string;
    origin: string;
    destination: string;
  } | null;
};

declare global {
  interface Window {
    google: any;
  }
}

// Texas airport IATA codes for trip direction detection
const TEXAS_AIRPORTS = [
  'IAH', 'HOU', // Houston
  'DFW', 'DAL', // Dallas
  'AUS',        // Austin
  'SAT',        // San Antonio
  'ELP',        // El Paso
  'LBB',        // Lubbock
  'MAF',        // Midland
  'CRP',        // Corpus Christi
  'HRL',        // Harlingen
  'MFE',        // McAllen
];


export function AirportForm( { onBack }: AirportFormProps ) {
  const form = useForm( {
    defaultValues: {
      flightNumber: "",
      passengers: "1",
      pickupLocation: "",
      dropoffLocation: "",
      date: new Date(),
      time: "",
    },
    validators: {
      onSubmit: AirportFormSchema,
    },
    onSubmit: async ( { value } ) => {
      // Store booking data and transition to confirmation
      setBookingData( {
        ...value,
        flightDetails: flightDetails ? {
          airline: flightDetails.airline,
          departure: flightDetails.departure,
          arrival: flightDetails.arrival,
          flightNumber: flightDetails.flightNumber,
          origin: flightDetails.origin,
          destination: flightDetails.destination,
        } : null,
      } );
      setBookingStep( 'confirmation' );
    },
  } );

  const [ bookingStep, setBookingStep ] = useState<'form' | 'confirmation'>( 'form' );
  const [ bookingData, setBookingData ] = useState<BookingData | null>( null );
  const [ distanceData, setDistanceData ] = useState<{
    total_miles: number;
    duration_minutes: number;
    duration_text: string;
    price_per_mile: number;
    total_price: number;
  } | null>( null );
  const [ isDistanceLoading, setIsDistanceLoading ] = useState( false );
  const [ showMapOverlay, setShowMapOverlay ] = useState( false );
  const [ tripDirection, setTripDirection ] = useState<'to_airport' | 'from_airport' | null>( null );
  const [ routeMapUrl, setRouteMapUrl ] = useState<{ small: string; large: string; } | null>( null );

  const contactForm = useForm( {
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      notes: "",
    } as z.infer<typeof ContactFormSchema>,
    validators: {
      onSubmit: ContactFormSchema,
    },
    onSubmit: async ( { value } ) => {
      toast.loading( "Processing your booking..." );
      try {
        const response = await fetch( "/api/booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify( {
            date: bookingData?.date ? ( () => {
              const d = new Date( bookingData.date );
              const year = d.getFullYear();
              const month = String( d.getMonth() + 1 ).padStart( 2, '0' );
              const day = String( d.getDate() ).padStart( 2, '0' );
              return `${ year }-${ month }-${ day }`;
            } )() : "",
            time: bookingData?.time,
            duration: distanceData?.duration_minutes || 60,
            attendee: {
              name: value.name,
              email: value.email,
              phone: value.phone,
            },
            notes: value.notes,
            tripType: "airport",
            tripDetails: {
              flightNumber: bookingData?.flightNumber,
              passengers: bookingData?.passengers,
              pickupLocation: bookingData?.pickupLocation,
              dropoffLocation: bookingData?.dropoffLocation,
              tripDirection,
              flightDetails: bookingData?.flightDetails,
              estimatedPrice: distanceData?.total_price,
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
        } else {
          toast.error( "Booking failed", {
            description: data.error || "Please try again or contact us directly.",
          } );
        }
      } catch ( error ) {
        toast.dismiss();
        toast.error( "Booking failed", {
          description: "An unexpected error occurred. Please try again.",
        } );
      }
    },
  } );

  const [ flightDetails, setFlightDetails ] = useState<{
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
  } | null>( null );
  const [ isFlightLoading, setIsFlightLoading ] = useState( false );
  const searchTimeoutRef = useRef<NodeJS.Timeout>( null );

  const fetchFlightDetails = async ( flightNumber: string ) => {
    if ( searchTimeoutRef.current ) {
      clearTimeout( searchTimeoutRef.current );
    }

    if ( flightNumber.length < 3 ) {
      setFlightDetails( null );
      setIsFlightLoading( false );
      return;
    }

    setIsFlightLoading( true );

    searchTimeoutRef.current = setTimeout( async () => {
      try {
        const response = await fetch( `/api/flights?flight_iata=${ flightNumber.toUpperCase() }` );
        const data = await response.json();

        if ( !response.ok || data.error ) {
          setFlightDetails( null );
        } else {
          // Format times
          let arrivalTime = "--:--";
          let departureTime = "--:--";
          let flightDate = "";

          if ( data.departure?.scheduled ) {
            const depDate = new Date( data.departure.scheduled );
            departureTime = depDate.toLocaleTimeString( [], { hour: '2-digit', minute: '2-digit', hour12: false } );
            flightDate = depDate.toLocaleDateString( undefined, { day: 'numeric', month: 'short', year: 'numeric' } );
          }
          if ( data.arrival?.scheduled ) {
            const arrDate = new Date( data.arrival.scheduled );
            arrivalTime = arrDate.toLocaleTimeString( [], { hour: '2-digit', minute: '2-digit', hour12: false } );
          }

          setFlightDetails( {
            airline: data.airline?.name || "Unknown Airline",
            departure: departureTime,
            arrival: arrivalTime,
            status: data.flight_status ? data.flight_status.charAt( 0 ).toUpperCase() + data.flight_status.slice( 1 ) : "Scheduled",
            flightNumber: data.flight?.iata || flightNumber.toUpperCase(),
            terminal: data.arrival?.terminal || "-",
            departureTerminal: data.departure?.terminal || "-",
            gate: data.arrival?.gate || "-",
            origin: data.departure?.iata || "UNK",
            destination: data.arrival?.iata || "UNK",
            originAirport: data.departure?.airport || "",
            destinationAirport: data.arrival?.airport || "",
            flightDate: flightDate,
          } );

          // Detect trip direction based on Texas airports
          const originCode = data.departure?.iata?.toUpperCase();
          const destinationCode = data.arrival?.iata?.toUpperCase();
          const isDestinationTexas = TEXAS_AIRPORTS.includes( destinationCode );
          const isOriginTexas = TEXAS_AIRPORTS.includes( originCode );

          if ( isDestinationTexas ) {
            // Client is arriving in Texas - we pick them up FROM the airport
            setTripDirection( 'from_airport' );
            if ( data.arrival?.airport ) {
              form.setFieldValue( "pickupLocation", data.arrival.airport );
            }
            // Use arrival time for pickup
            if ( data.arrival?.scheduled ) {
              const arrDate = new Date( data.arrival.scheduled );
              form.setFieldValue( "date", arrDate );
              form.setFieldValue( "time", arrDate.toLocaleTimeString( [], { hour: '2-digit', minute: '2-digit', hour12: false } ) );
            }
          } else if ( isOriginTexas ) {
            // Client is departing from Texas - we take them TO the airport
            setTripDirection( 'to_airport' );
            if ( data.departure?.airport ) {
              form.setFieldValue( "dropoffLocation", data.departure.airport );
            }
            // Use departure time (suggest pickup 2-3 hours before)
            if ( data.departure?.scheduled ) {
              const depDate = new Date( data.departure.scheduled );
              depDate.setHours( depDate.getHours() - 2 ); // Suggest pickup 2 hours before flight
              form.setFieldValue( "date", depDate );
              form.setFieldValue( "time", depDate.toLocaleTimeString( [], { hour: '2-digit', minute: '2-digit', hour12: false } ) );
            }
          }
        }
      } catch ( error ) {
        console.error( "Failed to fetch flight details", error );
        setFlightDetails( null );
      } finally {
        setIsFlightLoading( false );
      }
    }, 1000 ); // Debounce wait time
  };

  useEffect( () => {
    return () => {
      if ( searchTimeoutRef.current ) {
        clearTimeout( searchTimeoutRef.current );
      }
    };
  }, [] );

  // Fetch distance data when entering confirmation
  useEffect( () => {
    if ( bookingStep === 'confirmation' && bookingData ) {
      const fetchDistance = async () => {
        setIsDistanceLoading( true );
        try {
          const response = await fetch(
            `/api/distance?origin=${ encodeURIComponent( bookingData.pickupLocation ) }&destination=${ encodeURIComponent( bookingData.dropoffLocation ) }&type=airport`
          );
          const data = await response.json();
          if ( data.success ) {
            setDistanceData( data );
          }
        } catch ( error ) {
          console.error( 'Failed to fetch distance:', error );
        } finally {
          setIsDistanceLoading( false );
        }
      };

      const fetchRouteMap = async () => {
        try {
          // Fetch small map for preview
          const smallResponse = await fetch(
            `/api/route-map?origin=${ encodeURIComponent( bookingData.pickupLocation ) }&destination=${ encodeURIComponent( bookingData.dropoffLocation ) }&size=400x200`
          );
          const smallData = await smallResponse.json();

          // Fetch large map for overlay
          const largeResponse = await fetch(
            `/api/route-map?origin=${ encodeURIComponent( bookingData.pickupLocation ) }&destination=${ encodeURIComponent( bookingData.dropoffLocation ) }&size=800x400`
          );
          const largeData = await largeResponse.json();

          if ( smallData.success && largeData.success ) {
            setRouteMapUrl( {
              small: smallData.staticMapUrl,
              large: largeData.staticMapUrl,
            } );
          }
        } catch ( error ) {
          console.error( 'Failed to fetch route map:', error );
        }
      };

      fetchDistance();
      fetchRouteMap();
    }
  }, [ bookingStep, bookingData ] );

  // Confirmation View
  if ( bookingStep === 'confirmation' && bookingData ) {
    return (
      <motion.div
        initial={ { opacity: 0, x: 20 } }
        animate={ { opacity: 1, x: 0 } }
        exit={ { opacity: 0, x: -20 } }
        className="relative w-full max-w-5xl rounded-xl border border-white/10 bg-black/60 p-8 backdrop-blur-md max-h-[90vh] flex flex-col"
      >
        {/* Sticky Header */ }
        <div className="shrink-0 space-y-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={ () => setBookingStep( 'form' ) }
            className="text-white/70 hover:text-white hover:bg-white/10 -ml-2 uppercase tracking-widest absolute top-8 left-8"
          >
            <ArrowLeft className="size-4 mr-2" />
            Back to Edit
          </Button>

          <div className="flex flex-col items-center justify-center gap-2 w-full mb-6 pb-12">
            <Image src="/assets/images/icon/airplane.svg" alt="Airport Transfer" width={ 48 } height={ 48 } />
            <h2 className="font-widest font-wide uppercase tracking-[5px] text-2xl text-white">Confirm Your Booking</h2>
          </div>
        </div>

        {/* Scrollable Content */ }
        <div className="flex-1 overflow-y-auto min-h-0 -mr-2 pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent py-2">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Contact Form */ }
            <div>
              <form
                id="contact-form"
                onSubmit={ ( e ) => {
                  e.preventDefault();
                  e.stopPropagation();
                  contactForm.handleSubmit();
                } }
                className="space-y-4"
              >
                <contactForm.Field
                  name="name"
                  children={ ( field ) => (
                    <SuperField
                      type="text"
                      id={ field.name }
                      label="Full Name"
                      placeholder="John Doe"
                      value={ field.state.value }
                      onChange={ ( e ) => field.handleChange( e.target.value ) }
                      onBlur={ field.handleBlur }
                      error={ getFieldErrorMessage( field.state.meta.errors ) }
                    />
                  ) }
                />

                <contactForm.Field
                  name="email"
                  children={ ( field ) => (
                    <SuperField
                      type="email"
                      id={ field.name }
                      label="Email"
                      placeholder="john@example.com"
                      value={ field.state.value }
                      onChange={ ( e ) => field.handleChange( e.target.value ) }
                      onBlur={ field.handleBlur }
                      error={ getFieldErrorMessage( field.state.meta.errors ) }
                    />
                  ) }
                />

                <contactForm.Field
                  name="phone"
                  children={ ( field ) => (
                    <SuperField
                      type="tel"
                      id={ field.name }
                      label="Phone"
                      placeholder="+1 (555) 123-4567"
                      value={ field.state.value }
                      onChange={ ( e ) => field.handleChange( e.target.value ) }
                      onBlur={ field.handleBlur }
                      error={ getFieldErrorMessage( field.state.meta.errors ) }
                    />
                  ) }
                />

                <contactForm.Field
                  name="notes"
                  children={ ( field ) => (
                    <SuperField
                      type="textarea"
                      id={ field.name }
                      label="Special Requests (Optional)"
                      placeholder="Child seat, extra luggage, etc."
                      value={ field.state.value }
                      onChange={ ( e ) => field.handleChange( e.target.value ) }
                      onBlur={ field.handleBlur }
                      error={ getFieldErrorMessage( field.state.meta.errors ) }
                      className="min-h-[100px]"
                    />
                  ) }
                />
              </form>
            </div>

            {/* Right: Booking Summary */ }
            <BookingSummary
              bookingType="airport"
              bookingData={ bookingData }
              distanceData={ distanceData }
              flightDetails={ bookingData.flightDetails as any }
              mapPreviewUrl={ routeMapUrl?.small }
              isDistanceLoading={ isDistanceLoading }
              onShowMap={ () => setShowMapOverlay( true ) }
            />
          </div>
        </div>

        {/* Sticky Footer */ }
        <div className="shrink-0 pt-4 mt-auto bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-10">
          <contactForm.Subscribe
            selector={ ( state ) => [ state.canSubmit, state.isSubmitting ] }
            children={ ( [ canSubmit, isSubmitting ] ) => (
              <Button
                type="submit"
                form="contact-form"
                size="lg"
                disabled={ !canSubmit }
                className="w-full bg-gold text-black hover:bg-gold/80 uppercase"
              >
                { isSubmitting ? "..." : "Confirm Booking" }
              </Button>
            ) }
          />
        </div>

        {/* Map Overlay */ }
        <MapOverlay
          isOpen={ showMapOverlay }
          onClose={ () => setShowMapOverlay( false ) }
          routeMapUrl={ routeMapUrl }
          pickupLocation={ bookingData.pickupLocation }
          dropoffLocation={ bookingData.dropoffLocation }
          distanceData={ distanceData }
        />
      </motion.div>
    );
  }

  // Original Form View
  return (
    <motion.div
      initial={ { opacity: 0, x: 20 } }
      animate={ { opacity: 1, x: 0 } }
      exit={ { opacity: 0, x: -20 } }
      className="relative w-full max-w-xl rounded-xl border border-white/10 bg-black/60 p-8 backdrop-blur-md my-10 max-h-[90vh] flex flex-col"
    >
      <form
        onSubmit={ ( e ) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        } }
        className="flex flex-col h-full overflow-hidden"
      >
        <div className="shrink-0 space-y-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={ onBack }
            className="absolute top-8 left-8 h-8 w-8 rounded-full border border-white/10 text-white hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="size-4" />
          </Button>

          <div className="flex flex-col items-center justify-center gap-2 w-full md:mb-6 py-8 md:py-12">
            <Image src="/assets/images/icon/airplane.svg" alt="Airport Transfer" width={ 48 } height={ 48 } />
            <h2 className="font-widest font-wide uppercase tracking-[5px] text-2xl text-white">Airport Transfer</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 -mr-2 pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
          <FieldGroup>
            <div className="grid gap-4">
              <form.Field
                name="flightNumber"
                children={ ( field ) => (
                  <div className="flex flex-col gap-2">
                    <div className="relative">
                      <Field>
                        <FieldLabel htmlFor={ field.name }>Flight Number</FieldLabel>
                        <div className="relative">
                          <Input
                            id={ field.name }
                            placeholder="e.g. UA1234"
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
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Loader2 className="h-4 w-4 animate-spin text-[#D4AF37]" />
                            </div>
                          ) }
                        </div>
                        <AnimatePresence mode='wait'>
                          { getFieldErrorMessage( field.state.meta.errors ) && (
                            <motion.div initial={ { opacity: 0, height: 0 } } animate={ { opacity: 1, height: "auto" } } exit={ { opacity: 0, height: 0 } }>
                              <FieldError className="font-regular">
                                { getFieldErrorMessage( field.state.meta.errors ) }
                              </FieldError>
                            </motion.div>
                          ) }
                        </AnimatePresence>
                      </Field>
                    </div>
                    <AnimatePresence>
                      { flightDetails && !isFlightLoading && !field.state.meta.errors?.length && (
                        <motion.div
                          initial={ { opacity: 0, height: 0, marginTop: 0 } }
                          animate={ { opacity: 1, height: "auto", marginTop: 16 } }
                          exit={ { opacity: 0, height: 0, marginTop: 0 } }
                          className="overflow-hidden rounded-[10px] bg-black/60 text-white text-sm shadow-lg border border-border/20"
                        >
                          <div className="p-5 pb-4">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>From</span>
                              <span>To</span>
                            </div>
                            <div className="flex-between items-center mb-1 flex">
                              <span className="text-3xl font-bold font-wide text-white">{ flightDetails.departure }</span>
                              <div className="flex-1 flex items-center justify-center px-4">
                                <div className="h-px w-full bg-gray-300 relative">
                                  <Plane className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 text-[#D4AF37] rotate-90" />
                                </div>
                              </div>
                              <span className="text-3xl font-bold font-wide text-white">{ flightDetails.arrival }</span>
                            </div>
                            <div className="flex justify-between text-lg text-gray-500 font-wide">
                              <span>{ flightDetails.origin } T{ flightDetails.departureTerminal }</span>
                              <span>{ flightDetails.destination } T{ flightDetails.terminal }</span>
                            </div>
                            <div className="flex justify-between">
                              <div>
                                <span className="font-semibold text-black block">{ flightDetails.originAirport.split( ' ' ).slice( 0, 2 ).join( ' ' ) }</span>
                                <span className="text-gray-500">{ flightDetails.flightDate }</span>
                              </div>
                              <div className="text-right">
                                <span className="font-semibold text-black block">{ flightDetails.destinationAirport.split( ' ' ).slice( 0, 2 ).join( ' ' ) }</span>
                                <span className="text-gray-500">{ flightDetails.flightDate }</span>
                              </div>
                            </div>
                          </div>
                          <div className="border-t border-dashed border-gray-800 mx-5"></div>
                          <div className="p-5 pt-4 space-y-4">
                            <div className="flex justify-between">
                              <div>
                                <span className="block text-xs text-gray-500">Terminal</span>
                                <span className="font-bold text-lg font-wide">{ flightDetails.terminal }</span>
                              </div>
                              <div className="text-right">
                                <span className="block text-xs text-gray-500">Status</span>
                                <span className="font-bold text-lg font-wide lowercase">{ flightDetails.status }</span>
                              </div>
                            </div>
                            <div className="flex justify-between">
                              <div>
                                <span className="block text-xs text-gray-500">Gate</span>
                                <span className="font-bold text-lg font-wide">{ flightDetails.gate }</span>
                              </div>
                              <div className="text-right">
                                <span className="block text-xs text-gray-500">Flight</span>
                                <span className="font-bold text-lg font-wide">{ flightDetails.flightNumber }</span>
                              </div>
                            </div>
                          </div>
                          <div className="border-t border-dashed border-gray-800 mx-5"></div>
                          <div className="p-5 pt-4 flex justify-between items-center">
                            <div>
                              <span className="block text-xs text-gray-500">Airline</span>
                              <span className="font-bold font-wide uppercase text-lg tracking-widest">{ flightDetails.airline }</span>
                            </div>
                          </div>
                        </motion.div>
                      ) }
                    </AnimatePresence>
                  </div>
                ) }
              />

              <form.Field
                name="passengers"
                children={ ( field ) => (
                  <SuperField
                    type="select"
                    id={ field.name }
                    label="Passengers"
                    size="lg"
                    placeholder="Select"
                    value={ field.state.value }
                    onValueChange={ ( val: string | null ) => field.handleChange( val || "" ) }
                    onBlur={ field.handleBlur }
                    error={ getFieldErrorMessage( field.state.meta.errors ) }
                    options={ [ 1, 2, 3, 4, 5, 6 ].map( num => ( {
                      value: num.toString(),
                      label: `${ num } Passenger${ num > 1 ? "s" : "" }`
                    } ) ) }
                  />
                ) }
              />
            </div>

            <form.Field
              name="pickupLocation"
              children={ ( field ) => (
                <SuperField
                  type="location"
                  id={ field.name }
                  label="Pickup Location"
                  placeholder="Enter pickup address or airport"
                  value={ field.state.value }
                  onChange={ field.handleChange }
                  onBlur={ field.handleBlur }
                  error={ getFieldErrorMessage( field.state.meta.errors ) }
                  suffix={ <MapPin strokeWidth={ 1 } /> }
                />
              ) }
            />

            <form.Field
              name="dropoffLocation"
              children={ ( field ) => (
                <SuperField
                  type="location"
                  id={ field.name }
                  label="Dropoff Location"
                  placeholder="Enter destination"
                  value={ field.state.value }
                  onChange={ field.handleChange }
                  onBlur={ field.handleBlur }
                  error={ getFieldErrorMessage( field.state.meta.errors ) }
                  suffix={ <MapPin strokeWidth={ 1 } /> }
                />
              ) }
            />

            <div className="grid grid-cols-2 gap-4">
              <form.Field
                name="date"
                children={ ( field ) => (
                  <SuperField
                    type="datepicker"
                    id={ field.name }
                    label="Date"
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
                    placeholder="HH:MM AM/PM"
                    error={ field.state.meta.errors?.join( ", " ) }
                  />
                ) }
              />
            </div>
          </FieldGroup>
        </div>

        <div className="shrink-0 pt-4 mt-auto bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-10">
          <form.Subscribe
            selector={ ( state ) => [ state.canSubmit, state.isSubmitting ] }
            children={ ( [ canSubmit, isSubmitting ] ) => (
              <Button
                type="submit"
                size={ 'lg' }
                disabled={ !canSubmit }
                className="mt-4 w-full bg-gold text-black hover:bg-gold/80 uppercase"
              >
                { isSubmitting ? "..." : "Request Booking" }
              </Button>
            ) }
          />
        </div>
      </form >

    </motion.div >
  );
}
