import Image from "next/image";
import { Header } from "./Header";

const HERO_BG = "/assets/images/arrive-better-goldridr.jpg";

interface HeroProps {
  onBookNow?: () => void;
}

export function Hero( { onBookNow }: HeroProps ) {
  return (
    <section className="relative h-screen w-full overflow-hidden bg-black text-white select-none">
      {/* Background Image */ }
      <div className="absolute inset-0 z-0">
        <Image
          src={ HERO_BG }
          alt="Luxury Chauffeured Services"
          fill
          className="object-cover opacity-70"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-b from-black/60 via-transparent to-black/80" />
      </div>

      {/* Navigation */ }
      <Header onBookNow={ onBookNow } />

      {/* Main Content */ }
      <div className="relative z-10 flex flex-1 w-full flex-col items-center justify-center py-[10%] md:py-[5%] text-center">
        <h1 className="font-serif text-4xl font-medium tracking-wide text-white md:text-5xl lg:text-6xl">
          ARRIVE BETTER
        </h1>
        <p className="mt-3 md:mt-4 max-w-2xl text-sm font-light tracking-wide text-gray-200 font-sans md:text-base">
          Experience premium chauffeured services, in Houston and beyond
        </p>
      </div>

      {/* Bottom Bar / Features */ }
      <div className="absolute bottom-16 left-0 right-0 z-20 flex w-full flex-col items-center justify-center md:px-8">
        <h2 className="mb-6 mx-auto font-serif text-xl font-bold text-center text-white uppercase">BOOK A RIDE</h2>
        <div className="flex w-full max-w-4xl justify-between pt-2">
          <FeatureItem
            icon={ <Image src="/assets/images/icon/airplane.svg" className="h-14 md:h-20 w-auto" alt="Airport" width={ 80 } height={ 80 } /> }
            title="Airport Rides"
            description="Advanced reservations to and from all airports in Houston"
          />
          <FeatureItem
            icon={ <Image src="/assets/images/icon/city.svg" className="h-12 md:h-16 w-auto" alt="City" width={ 80 } height={ 80 } /> }
            title="Around Town"
            description="Upfront pricing for trips around Houston"
          />
          <FeatureItem
            icon={ <Image src="/assets/images/icon/clock.svg" className="h-12 md:h-16 w-auto" alt="Hourly" width={ 80 } height={ 80 } /> }
            title="Hourly"
            description="Available whenever and whenever you need us"
          />
        </div>
      </div>
    </section>
  );
}

function FeatureItem( { icon, title, description }: { icon: React.ReactNode, title: string, description: string; } ) {
  return (
    <div className="flex flex-1 flex-col items-center text-center px-4 md:px-10 border-r border-white/20 last-of-type:border-r-0">
      <div className="mb-1 md:mb-3 size-20 flex items-center justify-center">{ icon }</div>
      <h3 className="mb-1 font-sans font-medium text-white max-md:text-sm">{ title }</h3>
      <p className="text-white font-sans text-xs md:text-sm text-balance font-light">{ description }</p>
    </div>
  );
}
