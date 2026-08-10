"use client";

import { SuperField } from "@/components/ui/super-field";
import { getFieldErrorMessage } from "@/lib/form-schemas";
import { SmsConsent } from "@/components/booking/SmsConsent";
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
  const typedForm = form as {
    Field: ( props: {
      name: string;
      children: ( field: ContactTextField ) => ReactNode;
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
      <SmsConsent form={ form } />
    </>
  );
}
