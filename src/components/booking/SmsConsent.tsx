import Link from "next/link";
import type { ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/field";
import { getFieldErrorMessage } from "@/lib/form-schemas";
import {
  SMS_CONSENT_CALL_TO_ACTION,
  SMS_CONSENT_FREQUENCY,
  SMS_CONSENT_HELP_STOP,
  SMS_CONSENT_RATES,
  SMS_MARKETING_CONSENT_CALL_TO_ACTION,
  SMS_MARKETING_FREQUENCY,
} from "@/lib/sms-consent-copy";

interface SmsConsentProps {
  form: unknown;
}

type SmsConsentField = {
  state: { value: unknown; meta: { errors: unknown } };
  handleChange: ( value: boolean ) => void;
};

export function SmsConsent( { form }: SmsConsentProps ) {
  const typedForm = form as {
    Field: ( props: {
      name: "marketingSmsOptIn" | "smsOptIn";
      children: ( field: SmsConsentField ) => ReactNode;
    } ) => ReactNode;
  };

  return (
    <typedForm.Field name="smsOptIn">
      { ( smsField ) => {
        const error = getFieldErrorMessage( smsField.state.meta.errors );

        return (
          <fieldset
            className="space-y-3"
            aria-invalid={ Boolean( error ) }
          >
            {/* <legend className="text-sm font-semibold text-foreground">
              Text message preferences{ " " }
              <span className="font-normal text-muted-foreground">(optional)</span>
            </legend> */}
            {/* <p className="text-sm leading-6 text-muted-foreground">
              Choose which kinds of messages GoldRidr may send to the phone number above.
            </p> */}

            <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
              <typedForm.Field name="marketingSmsOptIn">
                { ( field ) => (
                  <label className="flex items-start gap-3 text-sm leading-6 text-foreground/80">
                    <Checkbox
                      className="mt-1"
                      checked={ field.state.value === true }
                      onCheckedChange={ ( checked: boolean | "indeterminate" ) =>
                        field.handleChange( checked === true )
                      }
                    />
                    <span>
                      { SMS_MARKETING_CONSENT_CALL_TO_ACTION } { SMS_MARKETING_FREQUENCY }{ " " }
                      { SMS_CONSENT_RATES } { SMS_CONSENT_HELP_STOP }
                    </span>
                  </label>
                ) }
              </typedForm.Field>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
              <label className="flex items-start gap-3 text-sm leading-6 text-foreground/80">
                <Checkbox
                  className="mt-1"
                  checked={ smsField.state.value === true }
                  onCheckedChange={ ( checked: boolean | "indeterminate" ) =>
                    smsField.handleChange( checked === true )
                  }
                />
                <span>
                  { SMS_CONSENT_CALL_TO_ACTION } { SMS_CONSENT_FREQUENCY }{ " " }
                  { SMS_CONSENT_RATES } { SMS_CONSENT_HELP_STOP }
                </span>
              </label>
            </div>

            { error && <FieldError>{ error }</FieldError> }

            <p className="text-xs leading-5">
              <Link href="/terms" className="text-gold underline underline-offset-2">
                Terms of Service
              </Link>
              <span className="text-muted-foreground"> | </span>
              <Link href="/privacy" className="text-gold underline underline-offset-2">
                Privacy Policy
              </Link>
            </p>
          </fieldset>
        );
      } }
    </typedForm.Field>
  );
}
