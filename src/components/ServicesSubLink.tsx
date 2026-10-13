'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BOOKING_SERVICES } from '@/components/booking/forms/booking-flow/constants';
import { useRouter } from 'next/navigation';
import '@/components/booking/forms/booking-flow/booking-flow.css';

export function ServicesSubLink({}) {
  const router = useRouter();
  return (
    <section className='dark sticky top-0 z-20 w-full bg-[#050505] px-4 md:px-20 lg:px-[20%] [--radius:0.625rem]'>
      <Tabs
        defaultValue={BOOKING_SERVICES[0].value}
        onValueChange={(value) => {
          router.push(`#${value}`);
        }}
        className='w-full'
      >
        <TabsList activateOnFocus className='booking-flow__service-tabs'>
          {BOOKING_SERVICES.map((option) => (
            <TabsTrigger
              key={option.value}
              value={option.value}
              className='booking-flow__service-tab'
            >
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </section>
  );
}
