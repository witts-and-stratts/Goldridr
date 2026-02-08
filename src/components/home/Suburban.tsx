import Image from "next/image";
import { ImageSlider } from "../image-slider";

const SUBURBAN_IMAGES = [
  "/assets/images/1e141ce887d3a30045b7dceb10747c1658343708.png",
  "/assets/images/193eb7d3de6fd89f5df76f1f0cae7d91d3fa738d.png"
];

export function Suburban( { showFeatureTag = false }: { showFeatureTag?: boolean; } ) {
  return (
    <section className="relative w-full h-screen overflow-hidden text-white bg-black">
      <ImageSlider
        overlayOpacity={ 0.3 }
        images={ SUBURBAN_IMAGES }
        animationDuration={ 2 }
        exitAnimationDuration={ 4 }
      />

      <div className="mx-auto flex flex-col px-4 py-12 md:px-16 relative w-full h-full justify-between">
        <div className="mb-12">
          <h2 className="font-serif text-5xl uppercase leading-tight tracking-wide">
            Our Fleet
          </h2>
          <h3 className="tracking-wide text-4xl md:text-5xl text-gold/80 font-light">
            The Chevrolet Suburban
          </h3>
          <p className="mt-2 text-3xl font-light text-gold">2023-2024</p>

          {/* Feature Tags */ }
          { showFeatureTag && <div className="flex flex-wrap gap-4 mt-8">
            <span className="border border-white/20 px-6 py-2 font-wide text-sm tracking-[0.2em]">
              PREMIUM SOUND
            </span>
            <span className="border border-white/20 px-6 py-2 font-wide text-sm tracking-[0.2em]">
              TINTED PRIVACY GLASS
            </span>
            <span className="border border-white/20 px-6 py-2 font-wide text-sm tracking-[0.2em]">
              SPACE FOR 6 PASSENGERS
            </span>
          </div> }
        </div>



        <div className="grid grid-cols-2 gap-8 border-white/10 pt-12 md:grid-cols-4 justify-between max-md:bg-black/30 max-md:pb-10 max-md:px-2">
          <FleetFeature icon={ <Image src="/assets/images/icon/chair.svg" alt="Start" width={ 100 } height={ 100 } className="size-12" /> } title="Spacious interior with leather seats. Seats up to 6 people" />
          <FleetFeature icon={ <Image src="/assets/images/icon/luggage.svg" alt="Briefcase" width={ 100 } height={ 100 } className="size-12" /> } title="Plenty of luggage space" />
          <FleetFeature icon={ <Image src="/assets/images/icon/umbrella.svg" alt="Shield" width={ 100 } height={ 100 } className="size-10" /> } title="Complimentary water bottles" />
          <FleetFeature icon={ <Image src="/assets/images/icon/charger.svg" alt="Wifi" width={ 100 } height={ 100 } className="size-12" /> } title="In-vehicle w/ fast chargers" />
        </div>
      </div>
    </section>
  );
}

function FleetFeature( { icon, title }: { icon: React.ReactNode, title: string; } ) {
  return (
    <div className="flex flex-col items-start gap-2 md:border-r-[0.5px] md:border-r-white/30 max-md:border-b-[0.5px] max-md:border-b-white/30 py-2 md:py-5 last-of-type:border-r-0 px-6">
      <div className="mb-2 size-14">{ icon }</div>
      <div>
        <h4 className="text-white font-light md:text-base text-sm">{ title }</h4>
      </div>
    </div>
  );
}
