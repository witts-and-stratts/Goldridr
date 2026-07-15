'use client';

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

type SliderImage = string | {
  img: string;
  alt: string;
  mobileImg?: string;
};

interface ImageSliderProps {
  images: SliderImage[];
  timeout?: number;
  containerClassName?: string;
  imgClassName?: string;
  overlayOpacity?: number;
  animationDuration?: number;
  exitAnimationDuration?: number;
}
export function ImageSlider( {
  images,
  timeout = 7000,
  containerClassName = "absolute w-full h-full overflow-hidden",
  imgClassName = "object-cover w-full h-full absolute top-0 left-0",
  animationDuration = 1,
  exitAnimationDuration = 3,
  overlayOpacity = 0.3
}: ImageSliderProps ) {
  const [ slide, setSlide ] = useState( 0 );

  useEffect( () => {
    const interval = setInterval( () => {
      setSlide( ( prevSlide ) => ( prevSlide + 1 ) % images.length );
    }, timeout );
    return () => clearInterval( interval );
  }, [ images.length, timeout ] );

  const activeImage = images[ slide ];
  const slideSrc = typeof activeImage === 'string' ? activeImage : activeImage?.img;
  const slideAlt = typeof activeImage === 'string' ? undefined : activeImage?.alt;
  const mobileSlideSrc = typeof activeImage === 'string' ? undefined : activeImage?.mobileImg;
  const slideKey = slideSrc;

  return (
    <div className={ containerClassName }>
      <AnimatePresence>
        <motion.picture
          key={ slideKey }
          className="absolute inset-0 block"
          initial={ {
            clipPath: 'inset(0 100% 0 0)',
          } }
          animate={ {
            clipPath: 'inset(0 0 0 0)', transition: {
              duration: animationDuration,
              ease: 'easeIn'
            }
          } }
          exit={ {
            opacity: 0, transition: {
              delay: animationDuration,
              duration: exitAnimationDuration,
              ease: 'easeOut'
            }
          } }
        >
          { mobileSlideSrc && (
            <source media="(max-width: 767px)" srcSet={ mobileSlideSrc } />
          ) }
          <img
            src={ slideSrc }
            alt={ slideAlt }
            className={ imgClassName }
          />
        </motion.picture>
      </AnimatePresence>
      <div className={ "absolute w-full h-full top-0 left-0" } style={ { backgroundColor: `rgba(0, 0, 0, ${ overlayOpacity })` } } />
    </div>
  );
}
