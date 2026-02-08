import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useForm } from "@tanstack/react-form";
import { ArrowLeft, Plane } from "lucide-react";
import { motion } from "motion/react";
import * as z from "zod";
import Image from "next/image";

interface AirportFormProps {
  onBack: () => void;
}

const formSchema = z.object( {
  flightNumber: z.string().min( 2, "Flight number is required" ),
  pickupLocation: z.string().min( 5, "Pickup location is required" ),
  dropoffLocation: z.string().min( 5, "Dropoff location is required" ),
  date: z.string().min( 1, "Date is required" ),
  time: z.string().min( 1, "Time is required" ),
} );

export function AirportForm( { onBack }: AirportFormProps ) {
  const form = useForm( {
    defaultValues: {
      flightNumber: "",
      pickupLocation: "",
      dropoffLocation: "",
      date: "",
      time: "",
    } as z.infer<typeof formSchema>,
    validators: {
      onChange: formSchema,
    },
    onSubmit: async ( { value } ) => {
      console.log( value );
      // Handle form submission
    },
  } );

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

      <div className="flex flex-col items-center justify-center gap-2 w-full mb-6 py-12">
        <Image src="/assets/images/icon/airplane.svg" alt="Airport Transfer" width={ 48 } height={ 48 } />
        <h2 className="font-widest font-wide uppercase tracking-[5px] text-2xl text-white">Airport Transfer</h2>
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
            name="flightNumber"
            children={ ( field ) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={ isInvalid }>
                  <FieldLabel
                    htmlFor={ field.name }
                  >
                    Flight Number
                  </FieldLabel>
                  <Input
                    id={ field.name }
                    name={ field.name }
                    value={ field.state.value }
                    onBlur={ field.handleBlur }
                    onChange={ ( e ) => field.handleChange( e.target.value ) }
                    placeholder="e.g. UA1234"
                    className="border-white/10 bg-white/5 text-white placeholder-gray-500 focus-visible:border-[#D4AF37] focus-visible:ring-1 focus-visible:ring-[#D4AF37]"
                    aria-invalid={ isInvalid }
                  />
                  { isInvalid && (
                    <FieldError errors={ field.state.meta.errors } />
                  ) }
                </Field>
              );
            } }
          />

          <form.Field
            name="pickupLocation"
            children={ ( field ) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={ isInvalid }>
                  <FieldLabel
                    htmlFor={ field.name }
                  >
                    Pickup Location
                  </FieldLabel>
                  <Input
                    id={ field.name }
                    name={ field.name }
                    value={ field.state.value }
                    onBlur={ field.handleBlur }
                    onChange={ ( e ) => field.handleChange( e.target.value ) }
                    placeholder="Enter pickup address or airport"
                    className="border-white/10 bg-white/5 text-white placeholder-gray-500 focus-visible:border-[#D4AF37] focus-visible:ring-1 focus-visible:ring-[#D4AF37]"
                    aria-invalid={ isInvalid }
                  />
                  { isInvalid && (
                    <FieldError errors={ field.state.meta.errors } />
                  ) }
                </Field>
              );
            } }
          />

          <form.Field
            name="dropoffLocation"
            children={ ( field ) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={ isInvalid }>
                  <FieldLabel
                    htmlFor={ field.name }
                  >
                    Dropoff Location
                  </FieldLabel>
                  <Input
                    id={ field.name }
                    name={ field.name }
                    value={ field.state.value }
                    onBlur={ field.handleBlur }
                    onChange={ ( e ) => field.handleChange( e.target.value ) }
                    placeholder="Enter destination"
                    className="border-white/10 bg-white/5 text-white placeholder-gray-500 focus-visible:border-[#D4AF37] focus-visible:ring-1 focus-visible:ring-[#D4AF37]"
                    aria-invalid={ isInvalid }
                  />
                  { isInvalid && (
                    <FieldError errors={ field.state.meta.errors } />
                  ) }
                </Field>
              );
            } }
          />

          <div className="grid grid-cols-2 gap-4">
            <form.Field
              name="date"
              children={ ( field ) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={ isInvalid }>
                    <FieldLabel
                      htmlFor={ field.name }
                    >
                      Date
                    </FieldLabel>
                    <Input
                      id={ field.name }
                      name={ field.name }
                      type="date"
                      value={ field.state.value }
                      onBlur={ field.handleBlur }
                      onChange={ ( e ) => field.handleChange( e.target.value ) }
                      className="border-white/10 bg-white/5 text-white placeholder-gray-500 focus-visible:border-[#D4AF37] focus-visible:ring-1 focus-visible:ring-[#D4AF37] scheme-dark"
                      aria-invalid={ isInvalid }
                    />
                    { isInvalid && (
                      <FieldError errors={ field.state.meta.errors } />
                    ) }
                  </Field>
                );
              } }
            />

            <form.Field
              name="time"
              children={ ( field ) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={ isInvalid }>
                    <FieldLabel
                      htmlFor={ field.name }
                    >
                      Time
                    </FieldLabel>
                    <Input
                      id={ field.name }
                      name={ field.name }
                      type="time"
                      value={ field.state.value }
                      onBlur={ field.handleBlur }
                      onChange={ ( e ) => field.handleChange( e.target.value ) }
                      className="border-white/10 bg-white/5 text-white placeholder-gray-500 focus-visible:border-[#D4AF37] focus-visible:ring-1 focus-visible:ring-[#D4AF37] scheme-dark"
                      aria-invalid={ isInvalid }
                    />
                    { isInvalid && (
                      <FieldError errors={ field.state.meta.errors } />
                    ) }
                  </Field>
                );
              } }
            />
          </div>
        </FieldGroup>

        <form.Subscribe
          selector={ ( state ) => [ state.canSubmit, state.isSubmitting ] }
          children={ ( [ canSubmit, isSubmitting ] ) => (
            <Button
              type="submit"
              size={ 'lg' }
              disabled={ !canSubmit }
              className="mt-4 w-full bg-[#D4AF37] text-black hover:bg-[#b5952f] uppercase"
            >
              { isSubmitting ? "..." : "Request Booking" }
            </Button>
          ) }
        />
      </form>
    </motion.div>
  );
}
