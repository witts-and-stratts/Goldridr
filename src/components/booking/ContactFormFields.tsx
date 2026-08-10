"use client";

import { SuperField } from "@/components/ui/super-field";
import { getFieldErrorMessage } from "@/lib/form-schemas";
import { SmsConsent } from "@/components/booking/SmsConsent";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ChangeEvent, ReactNode } from "react";

interface ContactFormFieldsProps {
  form: unknown;
}

type ContactTextField = {
  name: string;
  state: { value: string; meta: { errors: unknown } };
  handleChange: ( value: string ) => void;
  handleBlur: () => void;
};

export function ContactFormFields( { form }: ContactFormFieldsProps ) {
  const shouldReduceMotion = useReducedMotion();
  const typedForm = form as {
    Field: ( props: {
      name: string;
      children: ( field: ContactTextField ) => ReactNode;
    } ) => ReactNode;
    Subscribe: ( props: {
      selector: ( state: { values: { phone?: string } } ) => boolean;
      children: ( hasPhone: boolean ) => ReactNode;
    } ) => ReactNode;
    setFieldValue: ( name: "marketingSmsOptIn" | "smsOptIn", value: boolean ) => void;
  };

  return (
    <>
      <typedForm.Field
        name="name"
      >
        { ( field ) => (
          <SuperField
            type="text"
            id={ field.name }
            label="Full Name"
            placeholder="John Doe"
            value={ field.state.value }
            onChange={ ( e: ChangeEvent<HTMLInputElement> ) => field.handleChange( e.target.value ) }
            onBlur={ field.handleBlur }
            error={ getFieldErrorMessage( field.state.meta.errors ) }
          />
        ) }
      </typedForm.Field>
      <typedForm.Field
        name="email"
      >
        { ( field ) => (
          <SuperField
            type="email"
            id={ field.name }
            label="Email"
            placeholder="john@example.com"
            value={ field.state.value }
            onChange={ ( e: ChangeEvent<HTMLInputElement> ) => field.handleChange( e.target.value ) }
            onBlur={ field.handleBlur }
            error={ getFieldErrorMessage( field.state.meta.errors ) }
          />
        ) }
      </typedForm.Field>
      <typedForm.Field
        name="phone"
      >
        { ( field ) => (
          <SuperField
            type="tel"
            id={ field.name }
            label="Phone (optional)"
            placeholder="Mobile phone number"
            value={ field.state.value }
            onChange={ ( e: ChangeEvent<HTMLInputElement> ) => {
              const phone = e.target.value;
              field.handleChange( phone );

              if ( !phone.trim() ) {
                typedForm.setFieldValue( "smsOptIn", false );
                typedForm.setFieldValue( "marketingSmsOptIn", false );
              }
            } }
            onBlur={ field.handleBlur }
            error={ getFieldErrorMessage( field.state.meta.errors ) }
          />
        ) }
      </typedForm.Field>
      <typedForm.Field
        name="notes"
      >
        { ( field ) => (
          <SuperField
            type="textarea"
            id={ field.name }
            label="Special Requests (Optional)"
            placeholder="Any special requests..."
            value={ field.state.value }
            onChange={ ( e: ChangeEvent<HTMLTextAreaElement> ) => field.handleChange( e.target.value ) }
            onBlur={ field.handleBlur }
            error={ getFieldErrorMessage( field.state.meta.errors ) }
            className="min-h-[100px]"
          />
        ) }
      </typedForm.Field>
      <typedForm.Field
        name="discountCode"
      >
        { ( field ) => (
          <SuperField
            type="text"
            id={ field.name }
            label="Discount Code (Optional)"
            placeholder="SAVE10"
            value={ field.state.value }
            onChange={ ( e: ChangeEvent<HTMLInputElement> ) => field.handleChange( e.target.value ) }
            onBlur={ field.handleBlur }
            error={ getFieldErrorMessage( field.state.meta.errors ) }
          />
        ) }
      </typedForm.Field>
      <typedForm.Subscribe
        selector={ ( state ) => Boolean( state.values.phone?.trim() ) }
      >
        { ( hasPhone ) => (
          <AnimatePresence initial={ false }>
            { hasPhone && (
              <motion.div
                key="sms-consent"
                className="overflow-hidden"
                initial={ shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, height: 0, clipPath: "inset(0 0 100% 0)" } }
                animate={ shouldReduceMotion
                  ? { opacity: 1 }
                  : { opacity: 1, height: "auto", clipPath: "inset(0 0 0% 0)" } }
                exit={ shouldReduceMotion
                  ? { opacity: 0, transition: { duration: 0 } }
                  : {
                      opacity: 0,
                      height: 0,
                      clipPath: "inset(0 0 100% 0)",
                      transition: { duration: 0.18, ease: [ 0.4, 0, 1, 1 ] },
                    } }
                transition={ shouldReduceMotion
                  ? { duration: 0 }
                  : { duration: 0.32, ease: [ 0.16, 1, 0.3, 1 ] } }
              >
                <SmsConsent form={ form } required />
              </motion.div>
            ) }
          </AnimatePresence>
        ) }
      </typedForm.Subscribe>
    </>
  );
}
