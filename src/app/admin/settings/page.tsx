'use client';

import { type ChangeEvent, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/query-keys';
import { Button } from '@/components/admin-ui/button';
import { Separator } from '@/components/admin-ui/separator';
import { Badge } from '@/components/admin-ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/admin-ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { SuperField } from '@/components/ui/super-field';
import { InputGroupButton } from '@/components/ui/input-group';
import {
  CheckCircle2,
  CircleAlert,
  Eye,
  EyeOff,
  LoaderCircle,
} from 'lucide-react';
import {
  siPaypal,
  siSquare,
  siStripe,
  siVenmo,
  siZelle,
  type SimpleIcon,
} from 'simple-icons';
import type {
  Preference,
  AdminSettingsState,
  PaymentCredentialDraft,
  PaymentCredentialKey,
  PaymentProviderConfiguration,
  PaymentProviderConfigurations,
  ProviderTab,
} from './types';
import {
  EMPTY_PAYMENT_CREDENTIALS,
  EMPTY_SETTINGS,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CHANNELS,
  PAYMENT_METHOD_OPTIONS,
} from './constants';
import { NativeNotificationSettings } from './components/native-notification-settings';

const TIMEZONE_LABEL_DATE = new Date();

function timezoneOffsetLabel(timezone: string): string {
  const offset =
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'longOffset',
    })
      .formatToParts(TIMEZONE_LABEL_DATE)
      .find((part) => part.type === 'timeZoneName')?.value || 'GMT';
  const normalized =
    offset === 'GMT'
      ? 'GMT +00:00'
      : offset.replace(/^GMT([+-])(\d{2}):(\d{2})$/, 'GMT $1$2:$3');
  return `${timezone} (${normalized})`;
}

const AVAILABLE_TIMEZONES = ['UTC', ...Intl.supportedValuesOf('timeZone')].map(
  (timezone) => ({
    value: timezone,
    label: timezoneOffsetLabel(timezone),
  }),
);

const PAYMENT_PROVIDERS: Array<{
  key: keyof PaymentProviderConfigurations;
  label: string;
  description: string;
  methods: string;
  icons: SimpleIcon[];
}> = [
  {
    key: 'stripe',
    label: 'Stripe',
    description: 'Hosted checkout and verified payment webhooks.',
    methods: 'Card · Apple Pay · Cash App Pay',
    icons: [siStripe],
  },
  {
    key: 'square',
    label: 'Square',
    description: 'Web Payments SDK with server-side payment capture.',
    methods: 'Card · Apple Pay · Cash App Pay',
    icons: [siSquare],
  },
  {
    key: 'paypal',
    label: 'PayPal / Venmo',
    description: 'PayPal Orders API and Venmo checkout eligibility.',
    methods: 'Venmo',
    icons: [siPaypal, siVenmo],
  },
];

const BOOKING_PROCESSORS: Array<{
  key: ProviderTab;
  label: string;
  description: string;
  icons: SimpleIcon[];
}> = [
  {
    key: 'stripe',
    label: 'Stripe',
    description: 'Card and digital wallets',
    icons: [siStripe],
  },
  {
    key: 'square',
    label: 'Square',
    description: 'Card and digital wallets',
    icons: [siSquare],
  },
  {
    key: 'paypal',
    label: 'PayPal / Venmo',
    description: 'Venmo checkout',
    icons: [siPaypal, siVenmo],
  },
  {
    key: 'zelle',
    label: 'Zelle',
    description: 'Manual verification',
    icons: [siZelle],
  },
];

const PROVIDER_CREDENTIAL_FIELDS: Record<
  keyof PaymentProviderConfigurations,
  Array<{ key: PaymentCredentialKey; label: string }>
> = {
  stripe: [
    { key: 'STRIPE_SECRET_KEY', label: 'Secret key' },
    { key: 'STRIPE_WEBHOOK_SECRET', label: 'Webhook signing secret' },
  ],
  square: [
    { key: 'SQUARE_ACCESS_TOKEN', label: 'Access token' },
    { key: 'SQUARE_APP_ID', label: 'Application ID' },
    { key: 'SQUARE_LOCATION_ID', label: 'Location ID' },
    { key: 'SQUARE_WEBHOOK_SIGNATURE_KEY', label: 'Webhook signature key' },
  ],
  paypal: [
    { key: 'PAYPAL_CLIENT_ID', label: 'Client ID' },
    { key: 'PAYPAL_CLIENT_SECRET', label: 'Client secret' },
    { key: 'PAYPAL_WEBHOOK_ID', label: 'Webhook ID' },
  ],
};

function ProviderMark({ icons }: { icons: SimpleIcon[] }) {
  return (
    <span
      aria-hidden='true'
      className='flex h-9 min-w-9 items-center justify-center gap-1 rounded-md border bg-background px-2 text-foreground'
    >
      {icons.map((icon) => (
        <svg
          key={icon.slug}
          viewBox='0 0 24 24'
          className='size-4'
          fill='currentColor'
        >
          <path d={icon.path} />
        </svg>
      ))}
    </span>
  );
}

function ProviderTabIcon({ icons }: { icons: SimpleIcon[] }) {
  return (
    <span aria-hidden='true' className='flex items-center gap-1'>
      {icons.map((icon) => (
        <svg
          key={icon.slug}
          viewBox='0 0 24 24'
          className='size-3.5'
          fill='currentColor'
        >
          <path d={icon.path} />
        </svg>
      ))}
    </span>
  );
}

function PaymentMethodToggle({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = `payment-method-${label.toLowerCase().replaceAll(' ', '-')}`;
  return (
    <Field
      orientation='horizontal'
      className='min-h-11 rounded-md border px-3 py-3'
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <FieldLabel htmlFor={id} className='font-normal'>
        {label}
      </FieldLabel>
    </Field>
  );
}

function BookingProcessorToggle({
  processor,
  checked,
  disabled,
  onCheckedChange,
}: {
  processor: (typeof BOOKING_PROCESSORS)[number];
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = `booking-processor-${processor.key}`;
  return (
    <Field
      orientation='horizontal'
      data-disabled={disabled || undefined}
      className='min-h-14 rounded-md border px-3 py-3'
    >
      <Checkbox
        id={id}
        name='enabledProcessors'
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <ProviderTabIcon icons={processor.icons} />
      <FieldLabel htmlFor={id} className='min-w-0 flex-1 font-normal'>
        <span className='block font-medium'>{processor.label}</span>
        <span className='mt-0.5 block text-xs text-muted-foreground'>
          {processor.description}
        </span>
      </FieldLabel>
    </Field>
  );
}

function hasAvailablePaymentMethod(
  settings: Pick<AdminSettingsState, 'enabledMethods' | 'enabledProcessors'>,
): boolean {
  const hasOnlineProcessor =
    settings.enabledProcessors.includes('stripe') ||
    settings.enabledProcessors.includes('square');
  return settings.enabledMethods.some((method) => {
    if (method === 'venmo')
      return settings.enabledProcessors.includes('paypal');
    if (method === 'zelle') return settings.enabledProcessors.includes('zelle');
    return hasOnlineProcessor;
  });
}

function CredentialField({
  name,
  label,
  value,
  configured,
  onChange,
}: {
  name: PaymentCredentialKey;
  label: string;
  value: string;
  configured: boolean;
  onChange: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const displayValue = editing ? value : configured ? '************' : value;

  const toggleVisibility = async () => {
    setError('');
    if (editing && value) {
      setRevealed((current) => !current);
      return;
    }
    if (!configured) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/settings/credential?key=${encodeURIComponent(name)}`,
        { cache: 'no-store' },
      );
      const result = (await response.json().catch(() => ({}))) as {
        value?: string;
        error?: string;
      };
      if (!response.ok || !result.value) {
        throw new Error(result.error || 'Unable to reveal this credential');
      }
      onChange(result.value);
      setEditing(true);
      setRevealed(true);
    } catch (revealError) {
      setError(
        revealError instanceof Error
          ? revealError.message
          : 'Unable to reveal this credential',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SuperField
      type={!editing || revealed ? 'text' : 'password'}
      id={name.toLowerCase()}
      label={label}
      headerExtra={
        <span className='break-all font-mono text-[9px] text-muted-foreground'>
          {name}
        </span>
      }
      autoComplete='new-password'
      value={displayValue}
      disabled={loading}
      error={error}
      onFocus={() => {
        if (configured && !editing) {
          setEditing(true);
          setRevealed(false);
          onChange('');
        }
      }}
      onChange={(event: ChangeEvent<HTMLInputElement>) => {
        setEditing(true);
        setError('');
        onChange(event.target.value);
      }}
      suffix={
        <InputGroupButton
          type='button'
          size='icon-xs'
          aria-label={revealed ? `Hide ${label}` : `Show ${label}`}
          title={revealed ? `Hide ${label}` : `Show ${label}`}
          disabled={loading || (!configured && !value)}
          onClick={() => void toggleVisibility()}
        >
          {loading ? (
            <LoaderCircle className='animate-spin' aria-hidden='true' />
          ) : revealed ? (
            <EyeOff aria-hidden='true' />
          ) : (
            <Eye aria-hidden='true' />
          )}
        </InputGroupButton>
      }
      placeholder={
        configured
          ? 'Configured — enter a new value to replace'
          : 'Not configured'
      }
    />
  );
}

function ProviderConfiguration({
  provider,
  configuration,
  appUrl,
}: {
  provider: (typeof PAYMENT_PROVIDERS)[number];
  configuration: PaymentProviderConfiguration;
  appUrl: string;
}) {
  const missing = Object.entries(configuration.credentials)
    .filter(([, ready]) => !ready)
    .map(([name]) => name);
  const ready = missing.length === 0;
  const webhookUrl = `${appUrl.replace(/\/$/, '')}${configuration.webhookPath}`;
  return (
    <div className='px-5 py-5'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div className='flex min-w-0 gap-3'>
          <ProviderMark icons={provider.icons} />
          <div className='min-w-0'>
            <h3 className='text-sm font-medium'>{provider.label} connection</h3>
            <p className='mt-1 text-xs leading-5 text-muted-foreground'>
              {provider.description}
            </p>
          </div>
        </div>
        <Badge variant={ready ? 'outline' : 'destructive'} className='gap-1.5'>
          {ready ? (
            <CheckCircle2 className='size-3' />
          ) : (
            <CircleAlert className='size-3' />
          )}
          {ready ? 'Ready' : `${missing.length} missing`}
        </Badge>
      </div>
      <dl className='mt-4 grid gap-4 text-xs sm:grid-cols-3'>
        <div>
          <dt className='text-muted-foreground'>Environment</dt>
          <dd className='mt-1 font-medium capitalize'>
            {configuration.environment}
          </dd>
        </div>
        <div>
          <dt className='text-muted-foreground'>Customer methods</dt>
          <dd className='mt-1 font-medium'>{provider.methods}</dd>
        </div>
        <div className='min-w-0'>
          <dt className='text-muted-foreground'>Webhook endpoint</dt>
          <dd
            className='mt-1 truncate font-mono text-foreground'
            title={webhookUrl}
          >
            {webhookUrl}
          </dd>
        </div>
      </dl>
      <div className='mt-4 rounded-md bg-muted/40 px-3 py-3'>
        <p className='text-xs font-medium'>Resolved credentials</p>
        <div className='mt-2 flex flex-wrap gap-x-4 gap-y-2'>
          {Object.entries(configuration.credentials).map(
            ([name, configured]) => (
              <span
                key={name}
                className='inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground'
              >
                {configured ? (
                  <CheckCircle2 className='size-3 text-foreground' />
                ) : (
                  <CircleAlert className='size-3 text-destructive' />
                )}
                {name}
              </span>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [settings, setSettings] = useState<AdminSettingsState>(EMPTY_SETTINGS);
  const [settingsStatus, setSettingsStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [settingsMessage, setSettingsMessage] = useState('');
  const [providerTab, setProviderTab] = useState<ProviderTab>('stripe');
  const [credentialDraft, setCredentialDraft] =
    useState<PaymentCredentialDraft>({ ...EMPTY_PAYMENT_CREDENTIALS });
  const [credentialRevision, setCredentialRevision] = useState(0);

  const { data: settingsData } = useQuery({
    queryKey: qk.settings(),
    queryFn: async () => {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (!data.success)
        throw new Error(data.error ?? 'Failed to load settings');
      return data.settings;
    },
  });

  const { data: preferencesData } = useQuery({
    queryKey: qk.notificationPreferences(),
    queryFn: async () => {
      const res = await fetch('/api/admin/notifications/preferences');
      const data = await res.json();
      if (!data.success)
        throw new Error(data.error ?? 'Failed to load preferences');
      return data.preferences as Preference[];
    },
  });

  useEffect(() => {
    if (!settingsData) return;
    // Query results hydrate editable drafts; later changes remain local until Save.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings({
      bookingBufferMinutes: String(
        settingsData.bookingBufferMinutes ??
          EMPTY_SETTINGS.bookingBufferMinutes,
      ),
      notificationTimezone:
        settingsData.notificationTimezone ||
        EMPTY_SETTINGS.notificationTimezone,
      appUrl: settingsData.appUrl || EMPTY_SETTINGS.appUrl,
      emailFromName: settingsData.emailFromName || EMPTY_SETTINGS.emailFromName,
      emailFromAddress:
        settingsData.emailFromAddress || EMPTY_SETTINGS.emailFromAddress,
      emailReplyTo: settingsData.emailReplyTo || '',
      priceByMileAirport: String(
        settingsData.priceByMileAirport ?? EMPTY_SETTINGS.priceByMileAirport,
      ),
      priceByMileCity: String(
        settingsData.priceByMileCity ?? EMPTY_SETTINGS.priceByMileCity,
      ),
      priceByMileHourly: String(
        settingsData.priceByMileHourly ?? EMPTY_SETTINGS.priceByMileHourly,
      ),
      twilioFromNumber:
        settingsData.twilioFromNumber || EMPTY_SETTINGS.twilioFromNumber,
      activeProcessor:
        settingsData.activeProcessor || EMPTY_SETTINGS.activeProcessor,
      enabledProcessors:
        settingsData.enabledProcessors || EMPTY_SETTINGS.enabledProcessors,
      enabledMethods:
        settingsData.enabledMethods || EMPTY_SETTINGS.enabledMethods,
      zelleRecipient: settingsData.zelleRecipient || '',
      zelleInstructions:
        settingsData.zelleInstructions || EMPTY_SETTINGS.zelleInstructions,
      holdMinutes: String(
        settingsData.holdMinutes ?? EMPTY_SETTINGS.holdMinutes,
      ),
      zelleVerificationHours: String(
        settingsData.zelleVerificationHours ??
          EMPTY_SETTINGS.zelleVerificationHours,
      ),
      hourlyRate: String(settingsData.hourlyRate ?? EMPTY_SETTINGS.hourlyRate),
      squareEnvironment:
        settingsData.squareEnvironment || EMPTY_SETTINGS.squareEnvironment,
      paypalEnvironment:
        settingsData.paypalEnvironment || EMPTY_SETTINGS.paypalEnvironment,
    });
    const enabledProcessors = (settingsData.enabledProcessors ||
      EMPTY_SETTINGS.enabledProcessors) as ProviderTab[];
    const preferredTab = settingsData.activeProcessor as
      ProviderTab | undefined;
    setProviderTab(
      preferredTab && enabledProcessors.includes(preferredTab)
        ? preferredTab
        : enabledProcessors[0],
    );
  }, [settingsData]);

  useEffect(() => {
    // Preferences are an editable draft of the latest server response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (preferencesData) setPreferences(preferencesData);
  }, [preferencesData]);

  const preferenceFor = (category: string) =>
    preferences.find((preference) => preference.category === category) || {
      category,
      inApp: 1,
      email: 1,
      sms: 0,
    };

  const updatePreference = async (
    category: string,
    channel: 'inApp' | 'email' | 'sms',
    checked: boolean,
  ) => {
    const current = preferenceFor(category);
    const next = { ...current, [channel]: Number(checked) };
    setPreferences((values) => [
      ...values.filter((value) => value.category !== category),
      next,
    ]);
    await fetch('/api/admin/notifications/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category,
        inApp: Boolean(next.inApp),
        email: Boolean(next.email),
        sms: Boolean(next.sms),
      }),
    });
    queryClient.invalidateQueries({ queryKey: qk.notificationPreferences() });
  };

  const saveSettings = async () => {
    const minutes = Number(settings.bookingBufferMinutes);
    const airport = Number(settings.priceByMileAirport);
    const city = Number(settings.priceByMileCity);
    const hourly = Number(settings.priceByMileHourly);
    const hourlyRate = Number(settings.hourlyRate);
    const holdMinutes = Number(settings.holdMinutes);
    const zelleVerificationHours = Number(settings.zelleVerificationHours);
    if (
      !Number.isInteger(minutes) ||
      minutes < 0 ||
      minutes > 240 ||
      !settings.notificationTimezone.trim() ||
      !settings.appUrl.trim() ||
      !settings.emailFromName.trim() ||
      !settings.emailFromAddress.trim() ||
      !Number.isFinite(airport) ||
      airport < 0 ||
      !Number.isFinite(city) ||
      city < 0 ||
      !Number.isFinite(hourly) ||
      hourly < 0 ||
      !settings.twilioFromNumber.trim() ||
      !Number.isFinite(hourlyRate) ||
      hourlyRate < 0 ||
      !Number.isInteger(holdMinutes) ||
      holdMinutes < 30 ||
      !Number.isInteger(zelleVerificationHours) ||
      zelleVerificationHours < 1 ||
      settings.enabledProcessors.length === 0 ||
      !hasAvailablePaymentMethod(settings)
    ) {
      setSettingsStatus('error');
      setSettingsMessage(
        'Review the required runtime values and select at least one available payment method.',
      );
      return;
    }

    setSettingsStatus('saving');
    setSettingsMessage('');
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingBufferMinutes: minutes,
          notificationTimezone: settings.notificationTimezone.trim(),
          appUrl: settings.appUrl.trim(),
          emailFromName: settings.emailFromName.trim(),
          emailFromAddress: settings.emailFromAddress.trim(),
          emailReplyTo: settings.emailReplyTo.trim(),
          priceByMileAirport: airport,
          priceByMileCity: city,
          priceByMileHourly: hourly,
          twilioFromNumber: settings.twilioFromNumber.trim(),
          activeProcessor: settings.activeProcessor,
          enabledProcessors: settings.enabledProcessors,
          enabledMethods: settings.enabledMethods,
          zelleRecipient: settings.zelleRecipient.trim(),
          zelleInstructions: settings.zelleInstructions.trim(),
          holdMinutes,
          zelleVerificationHours,
          hourlyRate,
          squareEnvironment: settings.squareEnvironment,
          paypalEnvironment: settings.paypalEnvironment,
          providerCredentials: Object.fromEntries(
            Object.entries(credentialDraft).filter(([, value]) => value.trim()),
          ),
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        details?: string;
      };
      if (response.ok) {
        setSettingsStatus('saved');
        setSettingsMessage('Settings saved.');
        setCredentialDraft({ ...EMPTY_PAYMENT_CREDENTIALS });
        setCredentialRevision((current) => current + 1);
        queryClient.invalidateQueries({ queryKey: qk.settings() });
      } else {
        setSettingsStatus('error');
        setSettingsMessage(
          result.error === 'Validation failed' && result.details
            ? result.details
            : result.error || `Settings could not be saved (${response.status}).`,
        );
      }
    } catch {
      setSettingsStatus('error');
      setSettingsMessage(
        'The settings service could not be reached. Check your connection and try again.',
      );
    }
  };

  const togglePaymentMethod = (method: string, enabled: boolean) => {
    setSettings((current) => ({
      ...current,
      enabledMethods: enabled
        ? [...new Set([...current.enabledMethods, method])]
        : current.enabledMethods.filter((value) => value !== method),
    }));
    if (settingsStatus !== 'idle') setSettingsStatus('idle');
    if (settingsMessage) setSettingsMessage('');
  };

  const toggleBookingProcessor = (processor: ProviderTab, enabled: boolean) => {
    const enabledProcessors = enabled
      ? [...new Set([...settings.enabledProcessors, processor])]
      : settings.enabledProcessors.filter((value) => value !== processor);
    if (enabledProcessors.length === 0) return;

    const nextOnlineProcessor = enabledProcessors.find(
      (value) => value === 'stripe' || value === 'square',
    ) as 'stripe' | 'square' | undefined;
    setSettings((current) => ({
      ...current,
      enabledProcessors,
      activeProcessor:
        enabledProcessors.includes(current.activeProcessor) ||
        !nextOnlineProcessor
          ? current.activeProcessor
          : nextOnlineProcessor,
    }));
    if (!enabledProcessors.includes(providerTab))
      setProviderTab(enabledProcessors[0]);
    if (settingsStatus !== 'idle') setSettingsStatus('idle');
    if (settingsMessage) setSettingsMessage('');
  };

  const selectProcessor = (processor: 'stripe' | 'square') => {
    setSettings((current) => ({ ...current, activeProcessor: processor }));
    if (settingsStatus !== 'idle') setSettingsStatus('idle');
    if (settingsMessage) setSettingsMessage('');
  };

  const updateCredential = (key: PaymentCredentialKey, value: string) => {
    setCredentialDraft((current) => ({ ...current, [key]: value }));
    if (settingsStatus !== 'idle') setSettingsStatus('idle');
    if (settingsMessage) setSettingsMessage('');
  };

  const updateField = (key: keyof AdminSettingsState, value: string) => {
    setSettings((current) => ({ ...current, [key]: value }));
    if (settingsStatus !== 'idle') setSettingsStatus('idle');
    if (settingsMessage) setSettingsMessage('');
  };

  return (
    <div className='mx-auto max-w-5xl p-6'>
      <header className='mb-8'>
        <h1 className='text-xl font-semibold tracking-tight'>Settings</h1>
        <p className='mt-1 text-sm text-muted-foreground'>
          Configure dispatch behavior and securely managed provider credentials.
        </p>
      </header>

      <div className='grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]'>
        <aside>
          <p className='text-sm font-medium'>Workspace</p>
          <p className='mt-1 text-xs leading-5 text-muted-foreground'>
            Operational values that used to sit in environment files.
          </p>
        </aside>

        <div className='grid gap-4'>
          <NativeNotificationSettings />
          <section className='overflow-hidden rounded-lg border'>
            <div className='bg-muted/30 px-5 py-4'>
              <h2 className='text-sm font-semibold'>Runtime configuration</h2>
              <p className='mt-1 text-xs text-muted-foreground'>
                Changes take effect immediately for new requests and
                notifications.
              </p>
            </div>
            <Separator />
            <div className='grid gap-4 px-5 py-5 md:grid-cols-2'>
              <SuperField
                type='number'
                label='Booking buffer minutes'
                min={0}
                max={240}
                step={5}
                value={settings.bookingBufferMinutes}
                onChange={(event) =>
                  updateField('bookingBufferMinutes', event.target.value)
                }
              />
              <SuperField
                type='searchable-select'
                label='Timezone'
                value={settings.notificationTimezone}
                onValueChange={(value) =>
                  value && updateField('notificationTimezone', value)
                }
                options={AVAILABLE_TIMEZONES}
                placeholder='Search timezones'
              />
              <SuperField
                type='url'
                label='App URL'
                value={settings.appUrl}
                onChange={(event) => updateField('appUrl', event.target.value)}
                placeholder='https://goldridr.com'
                description='Use the public HTTPS URL; email QR links and read tracking pixels are generated from this address.'
                className='md:col-span-2'
              />
              <SuperField
                type='text'
                label='Email from name'
                value={settings.emailFromName}
                onChange={(event) =>
                  updateField('emailFromName', event.target.value)
                }
                placeholder='Goldridr'
              />
              <SuperField
                type='email'
                label='Email from address'
                value={settings.emailFromAddress}
                onChange={(event) =>
                  updateField('emailFromAddress', event.target.value)
                }
                placeholder='notifications@example.com'
              />
              <SuperField
                type='email'
                label='Reply-to address'
                value={settings.emailReplyTo}
                onChange={(event) =>
                  updateField('emailReplyTo', event.target.value)
                }
                placeholder='support@example.com'
                description='Use the mailbox Resend Receiving or webmail IMAP monitors for passenger replies.'
                className='md:col-span-2'
              />
              <SuperField
                type='number'
                label='Airport price per mile'
                min={0}
                step='0.01'
                value={settings.priceByMileAirport}
                onChange={(event) =>
                  updateField('priceByMileAirport', event.target.value)
                }
              />
              <SuperField
                type='number'
                label='City price per mile'
                min={0}
                step='0.01'
                value={settings.priceByMileCity}
                onChange={(event) =>
                  updateField('priceByMileCity', event.target.value)
                }
              />
              <SuperField
                type='number'
                label='Hourly price per mile'
                min={0}
                step='0.01'
                value={settings.priceByMileHourly}
                onChange={(event) =>
                  updateField('priceByMileHourly', event.target.value)
                }
              />
              <SuperField
                type='tel'
                label='Twilio from number'
                value={settings.twilioFromNumber}
                onChange={(event) =>
                  updateField('twilioFromNumber', event.target.value)
                }
                placeholder='+17135550000'
              />
            </div>
            <Separator />
            <div className='flex flex-wrap items-center gap-3 px-5 py-5'>
              <Button
                size='sm'
                onClick={saveSettings}
                disabled={settingsStatus === 'saving'}
              >
                {settingsStatus === 'saving' ? 'Saving…' : 'Save settings'}
              </Button>
              {settingsStatus === 'saved' && (
                <span className='text-xs text-muted-foreground' aria-live='polite'>
                  {settingsMessage}
                </span>
              )}
              {settingsStatus === 'error' && (
                <span
                  className='max-w-2xl whitespace-pre-line text-xs text-destructive'
                  role='alert'
                >
                  {settingsMessage}
                </span>
              )}
            </div>
          </section>
        </div>
      </div>

      <div className='mt-10 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]'>
        <aside>
          <p className='text-sm font-medium'>Payments</p>
          <p className='mt-1 text-xs leading-5 text-muted-foreground'>
            Control checkout and encrypted provider credentials. Environment
            variables remain fallbacks.
          </p>
        </aside>
        <section className='overflow-hidden rounded-lg border'>
          <div className='bg-muted/30 px-5 py-4'>
            <h2 className='text-sm font-semibold'>Checkout configuration</h2>
            <p className='mt-1 text-xs text-muted-foreground'>
              Choose a provider tab to update its checkout behavior and
              connection settings.
            </p>
          </div>
          <Separator />
          <div className='grid gap-5 px-5 py-5 sm:grid-cols-2'>
            <SuperField
              type='number'
              label='Hourly fare'
              min={0}
              step='0.01'
              value={settings.hourlyRate}
              onChange={(event) =>
                updateField('hourlyRate', event.target.value)
              }
            />
            <SuperField
              type='number'
              label='Payment hold minutes'
              min={30}
              max={1440}
              value={settings.holdMinutes}
              onChange={(event) =>
                updateField('holdMinutes', event.target.value)
              }
            />
          </div>
          <Separator />
          <div className='px-5 py-5'>
            <h3 className='text-sm font-semibold'>Booking Processors</h3>
            <p className='mt-1 text-xs leading-5 text-muted-foreground'>
              Select the processors available for booking payments. Only
              selected processors appear in the tabs and customer checkout.
            </p>
            <div
              data-slot='checkbox-group'
              className='mt-4 grid gap-3 sm:grid-cols-2'
            >
              {BOOKING_PROCESSORS.map((processor) => {
                const checked = settings.enabledProcessors.includes(
                  processor.key,
                );
                return (
                  <BookingProcessorToggle
                    key={processor.key}
                    processor={processor}
                    checked={checked}
                    disabled={
                      checked && settings.enabledProcessors.length === 1
                    }
                    onCheckedChange={(enabled) =>
                      toggleBookingProcessor(processor.key, enabled)
                    }
                  />
                );
              })}
            </div>
          </div>
          <Separator />
          <Tabs
            value={providerTab}
            onValueChange={(value) => setProviderTab(value as ProviderTab)}
          >
            <div className='overflow-x-auto border-b px-5'>
              <TabsList
                aria-label='Payment providers'
                className='h-auto min-w-max justify-start rounded-none bg-transparent p-0'
              >
                {PAYMENT_PROVIDERS.filter((provider) =>
                  settings.enabledProcessors.includes(provider.key),
                ).map((provider) => (
                  <TabsTrigger
                    key={provider.key}
                    value={provider.key}
                    className='gap-2 rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none'
                  >
                    <ProviderTabIcon icons={provider.icons} />
                    {provider.label}
                  </TabsTrigger>
                ))}
                {settings.enabledProcessors.includes('zelle') ? (
                  <TabsTrigger
                    value='zelle'
                    className='gap-2 rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none'
                  >
                    <ProviderTabIcon icons={[siZelle]} />
                    Zelle
                  </TabsTrigger>
                ) : null}
              </TabsList>
            </div>

            {PAYMENT_PROVIDERS.filter(
              (provider) =>
                settings.enabledProcessors.includes(provider.key) &&
                (provider.key === 'stripe' || provider.key === 'square'),
            ).map((provider) => {
              const processor = provider.key as 'stripe' | 'square';
              const active = settings.activeProcessor === processor;
              const configuration = settingsData?.paymentProviders
                ? (
                    settingsData.paymentProviders as PaymentProviderConfigurations
                  )[provider.key]
                : undefined;
              return (
                <TabsContent
                  key={provider.key}
                  value={provider.key}
                  className='mt-0'
                >
                  <div className='px-5 py-5'>
                    <div className='flex flex-wrap items-start justify-between gap-4'>
                      <div>
                        <h3 className='text-sm font-semibold'>
                          {provider.label} checkout
                        </h3>
                        <p className='mt-1 text-xs leading-5 text-muted-foreground'>
                          Configure the customer methods handled by{' '}
                          {provider.label}.
                        </p>
                      </div>
                      {active ? (
                        <Badge variant='secondary' className='gap-1.5'>
                          <CheckCircle2 className='size-3' />
                          Active processor
                        </Badge>
                      ) : (
                        <Button
                          type='button'
                          size='sm'
                          variant='outline'
                          onClick={() => selectProcessor(processor)}
                        >
                          Use {provider.label}
                        </Button>
                      )}
                    </div>
                    <div className='mt-5 grid gap-3 sm:grid-cols-3'>
                      {PAYMENT_METHOD_OPTIONS.filter(
                        (method) =>
                          method.value === 'card' ||
                          method.value === 'apple_pay' ||
                          method.value === 'cash_app',
                      ).map((method) => (
                        <PaymentMethodToggle
                          key={method.value}
                          label={method.label}
                          checked={settings.enabledMethods.includes(
                            method.value,
                          )}
                          onCheckedChange={(checked) =>
                            togglePaymentMethod(method.value, checked)
                          }
                        />
                      ))}
                    </div>
                    {provider.key === 'square' ? (
                      <SuperField
                        type='select'
                        size='md'
                        label='Environment'
                        value={settings.squareEnvironment}
                        onValueChange={(value) =>
                          value && updateField('squareEnvironment', value)
                        }
                        options={[
                          { value: 'sandbox', label: 'Sandbox' },
                          { value: 'production', label: 'Production' },
                        ]}
                        className='mt-5 max-w-sm'
                      />
                    ) : null}
                    <div className='mt-6 grid gap-5 sm:grid-cols-2'>
                      {PROVIDER_CREDENTIAL_FIELDS[provider.key].map((field) => (
                        <CredentialField
                          key={`${field.key}:${credentialRevision}`}
                          name={field.key}
                          label={field.label}
                          value={credentialDraft[field.key]}
                          configured={Boolean(
                            configuration?.credentials[field.key],
                          )}
                          onChange={(value) =>
                            updateCredential(field.key, value)
                          }
                        />
                      ))}
                    </div>
                  </div>
                  {configuration ? (
                    <>
                      <Separator />
                      <ProviderConfiguration
                        provider={provider}
                        configuration={configuration}
                        appUrl={settings.appUrl}
                      />
                    </>
                  ) : null}
                </TabsContent>
              );
            })}

            {settings.enabledProcessors.includes('paypal') ? (
              <TabsContent value='paypal' className='mt-0'>
                <div className='px-5 py-5'>
                  <div className='flex flex-wrap items-start justify-between gap-4'>
                    <div>
                      <h3 className='text-sm font-semibold'>
                        PayPal / Venmo checkout
                      </h3>
                      <p className='mt-1 text-xs leading-5 text-muted-foreground'>
                        Venmo appears only when PayPal reports that the customer
                        and device are eligible.
                      </p>
                    </div>
                    {settings.enabledMethods.includes('venmo') ? (
                      <Badge variant='secondary'>Venmo enabled</Badge>
                    ) : null}
                  </div>
                  <div className='mt-5 max-w-sm'>
                    <PaymentMethodToggle
                      label='Venmo'
                      checked={settings.enabledMethods.includes('venmo')}
                      onCheckedChange={(checked) =>
                        togglePaymentMethod('venmo', checked)
                      }
                    />
                  </div>
                  <SuperField
                    type='select'
                    size='md'
                    label='Environment'
                    value={settings.paypalEnvironment}
                    onValueChange={(value) =>
                      value && updateField('paypalEnvironment', value)
                    }
                    options={[
                      { value: 'sandbox', label: 'Sandbox' },
                      { value: 'production', label: 'Production' },
                    ]}
                    className='mt-5 max-w-sm'
                  />
                  <div className='mt-6 grid gap-5 sm:grid-cols-2'>
                    {PROVIDER_CREDENTIAL_FIELDS.paypal.map((field) => (
                      <CredentialField
                        key={`${field.key}:${credentialRevision}`}
                        name={field.key}
                        label={field.label}
                        value={credentialDraft[field.key]}
                        configured={Boolean(
                          (
                            settingsData?.paymentProviders as
                              PaymentProviderConfigurations | undefined
                          )?.paypal.credentials[field.key],
                        )}
                        onChange={(value) => updateCredential(field.key, value)}
                      />
                    ))}
                  </div>
                </div>
                {settingsData?.paymentProviders ? (
                  <>
                    <Separator />
                    <ProviderConfiguration
                      provider={PAYMENT_PROVIDERS[2]}
                      configuration={
                        (
                          settingsData.paymentProviders as PaymentProviderConfigurations
                        ).paypal
                      }
                      appUrl={settings.appUrl}
                    />
                  </>
                ) : null}
              </TabsContent>
            ) : null}

            {settings.enabledProcessors.includes('zelle') ? (
              <TabsContent value='zelle' className='mt-0'>
                <div className='px-5 py-5'>
                  <div className='flex flex-wrap items-start justify-between gap-4'>
                    <div>
                      <h3 className='text-sm font-semibold'>
                        Zelle manual verification
                      </h3>
                      <p className='mt-1 text-xs leading-5 text-muted-foreground'>
                        Customers submit their transfer reference for staff
                        approval.
                      </p>
                    </div>
                    <Badge variant='outline'>Manual provider</Badge>
                  </div>
                  <div className='mt-5 max-w-sm'>
                    <PaymentMethodToggle
                      label='Offer Zelle at checkout'
                      checked={settings.enabledMethods.includes('zelle')}
                      onCheckedChange={(checked) =>
                        togglePaymentMethod('zelle', checked)
                      }
                    />
                  </div>
                  <div className='mt-5 grid gap-5 sm:grid-cols-2'>
                    <SuperField
                      type='text'
                      label='Zelle recipient'
                      value={settings.zelleRecipient}
                      onChange={(event) =>
                        updateField('zelleRecipient', event.target.value)
                      }
                      placeholder='Business email or mobile number'
                    />
                    <SuperField
                      type='number'
                      label='Verification hold hours'
                      min={1}
                      max={168}
                      value={settings.zelleVerificationHours}
                      onChange={(event) =>
                        updateField(
                          'zelleVerificationHours',
                          event.target.value,
                        )
                      }
                    />
                    <SuperField
                      type='textarea'
                      label='Customer instructions'
                      value={settings.zelleInstructions}
                      onChange={(event) =>
                        updateField('zelleInstructions', event.target.value)
                      }
                      rows={3}
                      className='sm:col-span-2'
                    />
                  </div>
                </div>
              </TabsContent>
            ) : null}
          </Tabs>
          <Separator />
          <div className='flex flex-wrap items-center gap-3 px-5 py-5'>
            <Button
              size='sm'
              onClick={saveSettings}
              disabled={settingsStatus === 'saving'}
            >
              {settingsStatus === 'saving' ? 'Saving…' : 'Save settings'}
            </Button>
            {settingsStatus === 'saved' && (
              <span className='text-xs text-muted-foreground' aria-live='polite'>
                {settingsMessage}
              </span>
            )}
            {settingsStatus === 'error' && (
              <span
                className='max-w-2xl whitespace-pre-line text-xs text-destructive'
                role='alert'
              >
                {settingsMessage}
              </span>
            )}
          </div>
        </section>
      </div>

      <div className='mt-10 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]'>
        <aside>
          <p className='text-sm font-medium'>Notifications</p>
          <p className='mt-1 text-xs leading-5 text-muted-foreground'>
            Choose where each kind of update should reach you.
          </p>
        </aside>

        <section className='overflow-hidden rounded-lg border'>
          <div className='grid grid-cols-[minmax(0,1fr)_repeat(3,72px)] items-end gap-3 bg-muted/30 px-5 py-4'>
            <div>
              <h2 className='text-sm font-semibold'>Channel preferences</h2>
              <p className='mt-1 text-xs text-muted-foreground'>
                Choose where each kind of update should reach you.
              </p>
            </div>
            {NOTIFICATION_CHANNELS.map((channel) => (
              <div key={channel.value} className='text-center'>
                <channel.icon className='mx-auto mb-1 size-3.5 text-muted-foreground' />
                <span className='text-xs font-medium text-muted-foreground'>
                  {channel.label}
                </span>
              </div>
            ))}
          </div>
          <Separator />
          {NOTIFICATION_CATEGORIES.map((category) => {
            const preference = preferenceFor(category.value);
            return (
              <div
                key={category.value}
                className='grid grid-cols-[minmax(0,1fr)_repeat(3,72px)] items-center gap-3 border-b px-5 py-5 last:border-b-0'
              >
                <div className='pr-6'>
                  <p className='text-sm font-medium'>{category.label}</p>
                  <p className='mt-1 text-xs leading-5 text-muted-foreground'>
                    {category.description}
                  </p>
                </div>
                {NOTIFICATION_CHANNELS.map((channel) => (
                  <div key={channel.value} className='flex justify-center'>
                    <Checkbox
                      aria-label={`${category.label} via ${channel.label}`}
                      checked={Boolean(preference[channel.value])}
                      onCheckedChange={(checked) =>
                        updatePreference(
                          category.value,
                          channel.value,
                          checked === true,
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
