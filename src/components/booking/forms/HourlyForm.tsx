import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useForm } from "@tanstack/react-form";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { HourlyFormSchema, ContactFormSchema, getFieldErrorMessage, type HourlyFormData } from "@/lib/form-schemas";
import { SuperField } from "@/components/ui/super-field";
import { BookingSummary } from "@/components/booking/BookingSummary";
import { MapOverlay } from "@/components/booking/MapOverlay";
import { ContactFormFields } from "@/components/booking/ContactFormFields";

interface HourlyFormProps {
  onBack: () => void;
}

type BookingData = HourlyFormData;

// Hourly rate in dollars
const HOURLY_RATE = 75;

export function HourlyForm( { onBack }: HourlyFormProps ) {
  const form = useForm( {
    defaultValues: {
      pickupLocation: "",
      duration: "",
      date: new Date(),
      time: "",
    } as HourlyFormData,
    validators: {
      onChange: HourlyFormSchema,
    },
    onSubmit: async ( { value } ) => {
      setBookingData( value );
      setBookingStep( 'confirmation' );
    },
  } );

  const [ bookingStep, setBookingStep ] = useState<'form' | 'confirmation'>( 'form' );
  const [ bookingData, setBookingData ] = useState<BookingData | null>( null );
  const [ showMapOverlay, setShowMapOverlay ] = useState( false );
  const [ mapImageUrl, setMapImageUrl ] = useState<string | null>( null );

  const contactForm = useForm( {
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      notes: "",
    },
    validators: {
      onChange: ContactFormSchema,
    },
    onSubmit: async ( { value } ) => {
      const hours = parseInt( bookingData?.duration || "0" );
      const totalPrice = hours * HOURLY_RATE;
      toast.loading( "Processing your booking..." );
      try {
        const response = await fetch( "/api/booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify( {
            date: bookingData?.date,
            time: bookingData?.time,
            duration: hours * 60, // Convert hours to minutes
            attendee: {
              name: value.name,
              email: value.email,
              phone: value.phone,
            },
            notes: value.notes,
            tripType: "hourly",
            tripDetails: {
              pickupLocation: bookingData?.pickupLocation,
              durationHours: hours,
              hourlyRate: HOURLY_RATE,
              estimatedTotal: totalPrice,
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

  // Generate location map URL when entering confirmation
  useEffect( () => {
    if ( bookingStep === 'confirmation' && bookingData ) {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      setMapImageUrl(
        `https://maps.googleapis.com/maps/api/staticmap?size=600x300&markers=color:green|label:P|${ encodeURIComponent( bookingData.pickupLocation ) }&zoom=14&key=${ apiKey }`
      );
    }
  }, [ bookingStep, bookingData ] );

  // Confirmation View
  if ( bookingStep === 'confirmation' && bookingData ) {
    const hours = parseInt( bookingData.duration );
    const totalPrice = hours * HOURLY_RATE;

    return (
      <motion.div
        initial={ { opacity: 0, x: 20 } }
        animate={ { opacity: 1, x: 0 } }
        exit={ { opacity: 0, x: -20 } }
        className="relative w-full max-w-3xl rounded-xl border border-white/10 bg-black/60 p-8 backdrop-blur-md"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={ () => setBookingStep( 'form' ) }
          className="mb-6 text-white/70 hover:text-white hover:bg-white/10 -ml-2 uppercase tracking-widest"
        >
          <ArrowLeft className="size-4 mr-2" />
          Back to Edit
        </Button>

        <div className="flex flex-col items-center justify-center gap-2 w-full mb-6 pb-12">
          <Image src="/assets/images/icon/clock.svg" alt="Hourly Service" width={ 48 } height={ 48 } />
          <h2 className="font-widest font-wide uppercase tracking-[5px] text-2xl text-white">Confirm Booking</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 -mt-2">
          <div>
            <form
              onSubmit={ ( e ) => {
                e.preventDefault();
                e.stopPropagation();
                contactForm.handleSubmit();
              } }
              className="space-y-4"
            >
              <ContactFormFields form={ contactForm } />
              <contactForm.Subscribe
                selector={ ( state ) => [ state.canSubmit, state.isSubmitting ] }
                children={ ( [ canSubmit, isSubmitting ] ) => (
                  <Button
                    type="submit"
                    size="lg"
                    disabled={ !canSubmit }
                    className="w-full bg-gold text-black hover:bg-gold/80 uppercase mt-6"
                  >
                    { isSubmitting ? "..." : "Confirm Booking" }
                  </Button>
                ) }
              />
            </form>
          </div>

          <BookingSummary
            bookingType="hourly"
            bookingData={ bookingData }
            hourlyData={ {
              hours,
              rate: HOURLY_RATE,
              totalPrice,
            } }
            mapPreviewUrl={ mapImageUrl }
            onShowMap={ () => setShowMapOverlay( true ) }
          />
        </div>

        <MapOverlay
          isOpen={ showMapOverlay }
          onClose={ () => setShowMapOverlay( false ) }
          title="Pickup Location"
          mapImageUrl={ `https://maps.googleapis.com/maps/api/staticmap?size=800x400&markers=color:green|label:P|${ encodeURIComponent( bookingData.pickupLocation ) }&zoom=15&key=${ process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY }` }
          pickupLocation={ bookingData.pickupLocation }
        />
      </motion.div>
    );
  }

  // Form View
  return (
    <motion.div
      initial={ { opacity: 0, x: 20 } }
      animate={ { opacity: 1, x: 0 } }
      exit={ { opacity: 0, x: -20 } }
      className="relative w-full max-w-lg rounded-xl border border-white/10 bg-black/60 p-8 backdrop-blur-md"
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={ onBack }
        className="absolute top-8 left-8 h-8 w-8 rounded-full border border-white/10 text-white hover:bg-white/10 hover:text-white"
      >
        <ArrowLeft className="size-4" />
      </Button>

      <div className="flex flex-col items-center justify-center gap-2 w-full md:mb-6 py-8 md:py-12">
        <Image src="/assets/images/icon/clock.svg" alt="Hourly Service" width={ 48 } height={ 48 } />
        <h2 className="font-widest font-wide uppercase tracking-[5px] text-2xl text-white">Hourly Service</h2>
      </div>

      <form
        onSubmit={ ( e ) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        } }
        className="space-y-4"
      >
        <FieldGroup>
          <form.Field
            name="pickupLocation"
            children={ ( field ) => (
              <SuperField
                type="location"
                id={ field.name }
                label="Pickup Location"
                placeholder="Enter pickup address"
                value={ field.state.value }
                onChange={ field.handleChange }
                onBlur={ field.handleBlur }
                error={ getFieldErrorMessage( field.state.meta.errors ) }
              />
            ) }
          />

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
                options={ [ 3, 4, 5, 6, 8, 12 ].map( h => ( {
                  value: h.toString(),
                  label: `${ h } Hours - $${ h * HOURLY_RATE }`
                } ) ) }
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
                />
              ) }
            />

            <form.Field
              name="time"
              children={ ( field ) => (
                <SuperField
                  type="timepicker"
                  id={ field.name }
                  label="Time"
                  value={ field.state.value }
                  onChange={ ( e ) => field.handleChange( e.target.value ) }
                  onBlur={ field.handleBlur }
                  error={ getFieldErrorMessage( field.state.meta.errors ) }
                />
              ) }
            />
          </div>
        </FieldGroup>

        <form.Subscribe
          selector={ ( state ) => [ state.canSubmit, state.isSubmitting ] }
          children={ ( [ canSubmit, isSubmitting ] ) => (
            <Button
              type="submit"
              size="lg"
              disabled={ !canSubmit }
              className="mt-4 w-full bg-gold text-black hover:bg-gold/80 uppercase"
            >
              { isSubmitting ? "..." : "Reserve Now" }
            </Button>
          ) }
        />
      </form>
    </motion.div>
  );
}
