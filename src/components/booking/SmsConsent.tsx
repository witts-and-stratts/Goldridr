import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import {
  SMS_CONSENT_FREQUENCY,
  SMS_CONSENT_HELP_STOP,
  SMS_CONSENT_NOT_REQUIRED,
  SMS_CONSENT_RATES,
} from "@/lib/sms-consent-copy";

interface SmsConsentProps {
  form: any;
}

export function SmsConsent( { form }: SmsConsentProps ) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
      <form.Field
        name="smsOptIn"
        children={ ( field: any ) => (
          <label className="flex items-start gap-3 text-sm leading-6 text-foreground/80">
            <Checkbox
              className="mt-1"
              checked={ field.state.value === true }
              onCheckedChange={ ( checked: boolean | "indeterminate" ) =>
                field.handleChange( checked === true )
              }
            />
            <span>
              Yes, I would like to receive automated text messages from Goldridr about
              my booking confirmations, pickup reminders, chauffeur arrival updates and
              changes to my scheduled ride.
            </span>
          </label>
        ) }
      />

      <dl className="mt-4 space-y-2 text-xs leading-5 text-muted-foreground">
        <div>
          <dt className="inline font-semibold text-foreground/80">Message Frequency: </dt>
          <dd className="inline">{ SMS_CONSENT_FREQUENCY }</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-foreground/80">Standard Rates: </dt>
          <dd className="inline">{ SMS_CONSENT_RATES }</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-foreground/80">Help &amp; Stop: </dt>
          <dd className="inline">{ SMS_CONSENT_HELP_STOP }</dd>
        </div>
      </dl>

      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        By providing your phone number and checking the box above, you agree to receive
        text messages from Goldridr. { SMS_CONSENT_NOT_REQUIRED }
      </p>

      <p className="mt-3 text-xs leading-5">
        <Link href="/terms" className="text-gold underline underline-offset-2">
          Terms of Service
        </Link>
        <span className="text-muted-foreground"> | </span>
        <Link href="/privacy" className="text-gold underline underline-offset-2">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
