'use client';

import { useBookingOverlay } from '@/components/booking/BookingContext';
import { Footer } from '@/components/home/Footer';
import { Hero, type HeroSlide } from '@/components/home/Hero';
import { ServicesSubLink } from '@/components/ServicesSubLink';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

import '@/styles/services.css';

const SERVICES_HERO_SLIDES: HeroSlide[] = [
  {
    id: 1,
    image: '/assets/images/passenger-inside-goldridr.jpg',
    portraitImage: '/assets/images/passenger-inside-goldridr.jpg',
    alt: 'Chauffeur helping a client arrive',
    title: 'ORGANISED & PROFESSIONAL TRANSPORTATION, EVERY TIME',
    description:
      'Luxury chauffeured services for corporates and individuals with an uncompromising need for comfort and professionalism.',
    cta: 'ESTIMATE YOUR RIDE',
    secondaryCta: 'CHECK AVAILABILITY',
    secondaryCtaAction: 'availability',
  },
];

type ServiceSectionProps = {
  title: string;
  description: string;
  audience: string;
  howItWorks: string;
  support: string;
  children?: React.ReactNode;
  tone?: 'plain' | 'panel';
};

function ServiceSection({
  title,
  description,
  audience,
  howItWorks,
  support,
  children,
  tone = 'plain',
}: ServiceSectionProps) {
  return (
    <section className={`services-section services-section--${tone}`}>
      <div className='services-section__inner'>
        <div className='services-section__heading'>
          <h2>{title}</h2>
          <p className='services-section__description'>{description}</p>
        </div>
        <div className='services-section__details'>
          <div>
            <h3>WHO IT&apos;S FOR</h3>
            <p>{audience}</p>
          </div>
          <div>
            <h3>HOW IT WORKS</h3>
            <p>{howItWorks}</p>
          </div>
          {children}
          <p className='services-section__support'>{support}</p>
        </div>
      </div>
    </section>
  );
}

function ActionButtons() {
  const { setIsOpen, setAvailabilityOpen } = useBookingOverlay();
  return (
    <div className='services-actions'>
      <Button size='lg' onClick={() => setIsOpen(true)}>
        ESTIMATE YOUR RIDE <span aria-hidden='true'>→</span>
      </Button>
      <Button
        variant='outline'
        size='lg'
        onClick={() => setAvailabilityOpen(true)}
      >
        CHECK AVAILABILITY <span aria-hidden='true'>→</span>
      </Button>
    </div>
  );
}

export default function ServicesPage() {
  return (
    <main className='site-page services-page'>
      <Hero slides={SERVICES_HERO_SLIDES} ariaLabel='Gold Ridr services' />
      <section className='site-container md:my-60 text-center'>
        <h2 className='site-heading text-2xl'>
          One standard, <br />
          carried through every ride.
        </h2>
        <h2 className='site-lead mb-4 mt-20 text-balance mx-auto'>
          Gold Ridr approaches transportation with a simple standard: clear
          communication, dependable timing, and a more attentive ride experience
          from reservation to arrival.
        </h2>
        <div className='text-balance mx-auto'>
          <p className='site-copy max-w-[90ch] mx-auto'>
            Every airport pickup/drop-off, trip around town and scheduled rides,
            for you, your guests, business partners, clients and family is
            coordinated to be smooth, professional and easly to rely on.
          </p>
          <p className='site-copy max-w-[90ch] mx-auto'>
            From the first message to the moment you arrive, Gold Ridr keeps the
            details visible and the experience composed.
          </p>
        </div>
      </section>

      <ServicesSubLink />

      <section className='site-container mt-10 grid md:grid-cols-12 gap-8'>
        <div className='md:col-span-7'>
          <Image
            src='/assets/images/airport-pickup-from-terminal-e2.jpg'
            alt='Airport pickup from terminal'
            width={1200}
            height={800}
            priority
            className='opacity-70'
          />
        </div>
        <div className='md:col-span-5 mt-40 px-10'>
          <h3 className='site-heading text-2xl'>Airport Transfers</h3>
          <p className='mb-4'>
            Professional airport transportation for departures, arrivals,
            private terminals, hotel transfers, and scheduled travel across
            Houston and beyond.
          </p>
          <p className='site-copy'>
            Business travelers, families, visitors, executives, and clients who prefer dependable airport coordination over rideshare uncertainty
          </p>
        </div>
      </section>

      <ServiceSection
        title='AIRPORT TRANSFERS'
        description='Professional airport transportation for departures, arrivals, private terminals, hotel transfers, and scheduled travel across Houston and beyond.'
        audience='Business travelers, families, visitors, executives, and clients who prefer dependable airport coordination over rideshare uncertainty.'
        howItWorks='Airport reservations are scheduled in advance with confirmed pickup timing, direct communication, luggage support, and attentive coordination before arrival.'
        support='Early departures, late arrivals, hotel transfers, intra-city, and long-distance transportation are professionally handled.'
        tone='panel'
      >
        <div className='services-section__list-wrap'>
          <h3>GOLD RIDR SERVES</h3>
          <ul>
            <li>George Bush Intercontinental Airport (IAH)</li>
            <li>William P. Hobby Airport (HOU)</li>
            <li>Sugar Land Regional Airport (SGR)</li>
            <li>West Houston Airport (KIWS)</li>
          </ul>
          <p>And surrounding private aviation facilities.</p>
        </div>
      </ServiceSection>

      <ServiceSection
        title='AROUND TOWN'
        description='Reserved private transportation for appointments, dining, meetings, shopping, social outings, and comfortable city movement across Houston.'
        audience='Professionals, residents, couples, families, and visitors seeking a more dependable alternative to rideshare inconsistency.'
        howItWorks='Reservations are scheduled around your preferred timing and destinations, with smooth point-to-point transportation and professional handling throughout the ride.'
        support='Structured city transportation designed to feel calm, comfortable, and easy to coordinate.'
      />

      <ServiceSection
        title='BECK & CALL HOURLY AVAILABILITY'
        description='Dedicated black SUV availability reserved by the hour for flexible transportation needs and changing schedules throughout the day.'
        audience='Executives, event attendees, business travelers, families, hosted guests, and clients requiring multiple stops or ongoing transportation access.'
        howItWorks='During your reserved time block, the vehicle and chauffeur remain available for flexible routing, waiting periods, schedule adjustments, and ongoing transportation support.'
        support='Flexible transportation availability without the uncertainty of rebooking ride after ride.'
        tone='panel'
      >
        <div className='services-section__list-wrap'>
          <h3>IDEAL FOR</h3>
          <ul>
            <li>Business meetings across the city</li>
            <li>Shopping and appointments</li>
            <li>Dinner and evening transportation</li>
            <li>Event attendance and hosted guest movement</li>
            <li>Multi-stop schedules</li>
          </ul>
        </div>
      </ServiceSection>

      <ServiceSection
        title='CORPORATE & PARTNER TRANSPORTATION'
        description='Dependable transportation coordination designed to reduce friction for businesses and hosted guests.'
        audience='Hotels, executive assistants, travel planners, event coordinators, businesses, and organizations requiring dependable transportation support.'
        howItWorks='Gold Ridr coordinates directly with designated contacts to provide structured scheduling, responsive communication, and smooth transportation handling for guests, teams, and professional travel needs.'
        support='We function as an extension of your service promise—punctual, presentable, and dependable.'
      />

      <section className='services-final-cta'>
        <div>
          <h2>READY TO SCHEDULE YOUR RIDE?</h2>
          <p>
            Estimate your fare, check availability, or coordinate your next
            reservation with Gold Ridr.
          </p>
        </div>
        <ActionButtons />
      </section>

      <Footer />
    </main>
  );
}
