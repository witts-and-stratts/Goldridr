'use client';

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useState, useLayoutEffect, useEffect, useEffectEvent } from "react";

interface ImageSliderProps {
  images: string[] | { img: string, alt: string; }[];
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

  const changeSlider = useEffectEvent( () => {
    const interval = setInterval( () => {
      setSlide( ( prevSlide ) => ( prevSlide + 1 ) % images.length );
    }, timeout );
    return () => clearInterval( interval );
  } );

  useLayoutEffect( () => {
    changeSlider();
  }, [] );

  const slideKey = typeof images[ slide ] === 'string' ? images[ slide ] : images[ slide ]?.img;
  const slideSrc = typeof images[ slide ] === 'string' ? images[ slide ] : images[ slide ]?.img;
  const slideAlt = typeof images[ slide ] === 'string' ? images[ slide ] : images[ slide ]?.alt;

  return (
    <div className={ containerClassName }>
      <AnimatePresence>
        <motion.div
          key={ slideKey }
          initial={ {
            height: 0,
          } }
          animate={ {
            height: "100%", transition: {
              duration: animationDuration,
              ease: 'easeIn'
            }
          } }
          exit={ {
            height: 0, transition: {
              duration: exitAnimationDuration,
              ease: 'easeOut'
            }
          } }
        >
          <motion.img
            src={ slideSrc }
            alt={ slideAlt }
            className={ imgClassName }
            initial={ {
              opacity: 0, y: 100,
            } }
            animate={ {
              opacity: 1, y: 0, transition: {
                duration: animationDuration,
                ease: 'easeIn'
              }
            } }
            exit={ {
              opacity: 0, y: -100, transition: {
                duration: exitAnimationDuration,
                ease: 'easeOut'
              }
            } }
          />
        </motion.div>
      </AnimatePresence>
      <div className={ "absolute w-full h-full top-0 left-0" } style={ { backgroundColor: `rgba(0, 0, 0, ${ overlayOpacity })` } } />
    </div>
  );
}