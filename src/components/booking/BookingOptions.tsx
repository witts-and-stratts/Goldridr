import { motion } from "motion/react";
import Image from "next/image";

interface BookingOptionsProps {
  onSelect: ( option: "airport" | "town" | "hourly" ) => void;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function BookingOptions( { onSelect }: BookingOptionsProps ) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-4">
      <motion.div
        initial={ { opacity: 0, y: -20 } }
        animate={ { opacity: 1, y: 0 } }
        className="mb-8 text-center"
      >
        <h2 className="font-serif text-2xl font-bold text-center text-white uppercase tracking-widest">
          BOOK A RIDE
        </h2>
        <p className="font-sans font-light text-white mt-2 max-md:text-balance">
          Experience premium chauffeured services, in Houston and beyond
        </p>
      </motion.div>

      <motion.div
        variants={ container }
        initial="hidden"
        animate="show"
        className="flex w-full max-w-4xl flex-col md:flex-row justify-between pt-2 gap-8 md:gap-0"
      >
        <OptionItem
          title="Airport Rides"
          description="Advanced reservations to and from all airports in Houston"
          icon={ <Image src="/assets/images/icon/airplane.svg" className="h-14 md:h-20 w-auto" alt="Airport" width={ 80 } height={ 80 } /> }
          onClick={ () => onSelect( "airport" ) }
        />
        <OptionItem
          title="Around Town"
          description="Upfront pricing for trips around Houston"
          icon={ <Image src="/assets/images/icon/city.svg" className="h-12 md:h-16 w-auto" alt="City" width={ 80 } height={ 80 } /> }
          onClick={ () => onSelect( "town" ) }
        />
        <OptionItem
          title="Hourly"
          description="Available whenever and whenever you need us"
          icon={ <Image src="/assets/images/icon/clock.svg" className="h-12 md:h-16 w-auto" alt="Hourly" width={ 80 } height={ 80 } /> }
          onClick={ () => onSelect( "hourly" ) }
        />
      </motion.div>
    </div>
  );
}

function OptionItem( {
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
} ) {
  return (
    <motion.button
      variants={ item }
      whileHover={ { scale: 1.05 } }
      whileTap={ { scale: 0.95 } }
      onClick={ onClick }
      className="flex flex-1 flex-col items-center text-center px-10 md:px-10 md:border-r border-white/20 last-of-type:border-r-0 focus:outline-none group"
    >
      <div className="mb-1 md:mb-3 size-20 flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-1">
        { icon }
      </div>
      <h3 className="mb-1 font-sans font-medium text-white text-lg group-hover:text-gold transition-colors">
        { title }
      </h3>
      <p className="text-white font-sans text-xs md:text-sm text-balance font-light opacity-80 group-hover:opacity-100 transition-opacity">
        { description }
      </p>
    </motion.button>
  );
}
