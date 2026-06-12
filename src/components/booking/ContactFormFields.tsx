import { SuperField } from "@/components/ui/super-field";
import { getFieldErrorMessage } from "@/lib/form-schemas";
import { Checkbox } from "@/components/ui/checkbox";

interface ContactFormFieldsProps {
  form: any;
}

export function ContactFormFields( { form }: ContactFormFieldsProps ) {
  return (
    <>
      <form.Field
        name="name"
        children={ ( field: any ) => (
          <SuperField
            type="text"
            id={ field.name }
            label="Full Name"
            placeholder="John Doe"
            value={ field.state.value }
            onChange={ ( e: any ) => field.handleChange( e.target.value ) }
            onBlur={ field.handleBlur }
            error={ getFieldErrorMessage( field.state.meta.errors ) }
          />
        ) }
      />
      <form.Field
        name="email"
        children={ ( field: any ) => (
          <SuperField
            type="email"
            id={ field.name }
            label="Email"
            placeholder="john@example.com"
            value={ field.state.value }
            onChange={ ( e: any ) => field.handleChange( e.target.value ) }
            onBlur={ field.handleBlur }
            error={ getFieldErrorMessage( field.state.meta.errors ) }
          />
        ) }
      />
      <form.Field
        name="phone"
        children={ ( field: any ) => (
          <SuperField
            type="tel"
            id={ field.name }
            label="Phone"
            placeholder="+1 (555) 123-4567"
            value={ field.state.value }
            onChange={ ( e: any ) => field.handleChange( e.target.value ) }
            onBlur={ field.handleBlur }
            error={ getFieldErrorMessage( field.state.meta.errors ) }
          />
        ) }
      />
      <form.Field
        name="notes"
        children={ ( field: any ) => (
          <SuperField
            type="textarea"
            id={ field.name }
            label="Special Requests (Optional)"
            placeholder="Any special requests..."
            value={ field.state.value }
            onChange={ ( e: any ) => field.handleChange( e.target.value ) }
            onBlur={ field.handleBlur }
            error={ getFieldErrorMessage( field.state.meta.errors ) }
            className="min-h-[100px]"
          />
        ) }
      />
      <form.Field
        name="discountCode"
        children={ ( field: any ) => (
          <SuperField
            type="text"
            id={ field.name }
            label="Discount Code (Optional)"
            placeholder="SAVE10"
            value={ field.state.value }
            onChange={ ( e: any ) => field.handleChange( e.target.value ) }
            onBlur={ field.handleBlur }
            error={ getFieldErrorMessage( field.state.meta.errors ) }
          />
        ) }
      />
      <form.Field
        name="smsOptIn"
        children={ ( field: any ) => (
          <label className="flex items-start gap-3 text-sm leading-6 text-foreground/80">
            <Checkbox
              className="mt-1"
              checked={ field.state.value }
              onCheckedChange={ ( checked ) => field.handleChange( checked === true ) }
            />
            <span>
              Send me booking updates and pickup reminders by SMS. Message and data rates may apply. Reply STOP to opt out.
            </span>
          </label>
        ) }
      />
    </>
  );
}
