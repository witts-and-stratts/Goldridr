import { SuperField } from "@/components/ui/super-field";
import { getFieldErrorMessage } from "@/lib/form-schemas";

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
    </>
  );
}
