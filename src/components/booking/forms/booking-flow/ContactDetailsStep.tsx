import { ContactFormFields } from '@/components/booking/ContactFormFields';

import type { ContactFormApi } from './use-booking-forms';

type ContactDetailsStepProps = {
  form: ContactFormApi;
  formId: string;
};

export function ContactDetailsStep({
  form,
  formId,
}: ContactDetailsStepProps) {
  return (
    <form
      id={formId}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        form.handleSubmit();
      }}
      className='booking-flow__contact-form'
    >
      <ContactFormFields form={form} />
    </form>
  );
}
