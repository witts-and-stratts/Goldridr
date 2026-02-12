"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button, buttonVariants } from "../ui/button";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useBookingOverlay } from "../booking/BookingContext";

interface HeaderProps {
  className?: string; // Kept for compatibility if used elsewhere, though not used in component
}

export function Header( { className }: HeaderProps ) {
  const { setIsOpen } = useBookingOverlay();
  const [ isMenuOpen, setIsMenuOpen ] = useState( false );
  const [ isScrolled, setIsScrolled ] = useState( false );

  const handleBookNow = () => {
    setIsOpen( true );
  };

  const navLinks = [
    { href: "/ride", label: "Ride" },
    { href: "/business", label: "Business" },
    { href: "/faqs", label: "FAQs" },
    { href: "/contact", label: "Contact" },
  ];

  // Handle scroll effect
  useEffect( () => {
    const handleScroll = () => {
      setIsScrolled( window.scrollY > 10 );
    };
    window.addEventListener( "scroll", handleScroll );
    return () => window.removeEventListener( "scroll", handleScroll );
  }, [] );

  // Prevent body scroll when menu is open
  useEffect( () => {
    if ( isMenuOpen ) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [ isMenuOpen ] );

  return (
    <nav
      className={ cn(
        "sticky top-0 md:relative z-50 flex w-full items-center justify-between px-2 py-2 md:px-16 md:py-8 transition-all duration-300 md:bg-transparent md:backdrop-blur-none",
        isScrolled && !isMenuOpen ? "bg-black/50 backdrop-blur-md" : "bg-transparent backdrop-blur-none"
      ) }
    >
      <Link href="/" className="flex items-center z-50 relative">
        <Image src="/assets/images/goldridr-logo-main.svg" alt="Goldridr" width={ 180 } height={ 40 } className="h-8 w-auto md:h-10" />
      </Link>

      {/* Desktop Navigation */ }
      <div className="hidden items-center gap-8 md:flex">
        <div className="flex gap-8 font-normal tracking-[0.2em] uppercase text-gray-300 font-wide">
          { navLinks.map( ( link ) => (
            <Link key={ link.href } href={ link.href } className="hover:text-white transition-colors">
              { link.label }
            </Link>
          ) ) }
        </div>
        <Button
          variant="outline"
          size={ 'lg' }
          onClick={ handleBookNow }
          className={ 'bg-black/20 border-gold/80' }
        >
          BOOK NOW
        </Button>
      </div>

      {/* Mobile Navigation */ }
      <div className="flex items-center gap-2 md:hidden z-50 relative">
        <Button
          variant="outline"
          onClick={ handleBookNow }
          className={ 'bg-black/20 border-gold/80 px-8 h-8 text-sm tracking-widest' }
        >
          BOOK NOW
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 focus:outline-none w-12 px-0 z-50"
          onClick={ () => setIsMenuOpen( !isMenuOpen ) }
        >
          <AnimatePresence>
            { isMenuOpen ? (
              <X className="size-9" strokeWidth={ 1 } />
            ) : (
              <motion.svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-menu w-8 h-8 scale-x-150"
                initial={ { opacity: 0, y: 20 } }
                animate={ { opacity: 1, y: 0 } }
                transition={ { delay: 0.2, duration: 0.4 } }
              >
                <line x1="0" x2="24" y1="2" y2="2" />
                <line x1="0" x2="24" y1="12" y2="12" />
                <line x1="0" x2="24" y1="22" y2="22" />
              </motion.svg>
            ) }
          </AnimatePresence>
        </Button>
      </div>

      {/* Mobile Menu Overlay */ }
      <AnimatePresence>
        { isMenuOpen && (
          <motion.div
            initial={ { opacity: 0, y: -20 } }
            animate={ { opacity: 1, y: 0 } }
            exit={ { opacity: 0, y: -20 } }
            transition={ { duration: 0.3 } }
            className="fixed inset-0 z-40 flex flex-col items-center justify-start pt-40 bg-black/95 backdrop-blur-xl md:hidden"
          >
            <div className="flex flex-col items-center gap-8">
              { navLinks.map( ( link, index ) => (
                <motion.div
                  key={ link.href }
                  initial={ { opacity: 0, y: 20 } }
                  animate={ { opacity: 1, y: 0 } }
                  transition={ { delay: index * 0.1 + 0.2, duration: 0.4 } }
                >
                  <Link
                    href={ link.href }
                    className="font-wide text-3xl uppercase tracking-widest text-white hover:text-gold transition-colors"
                    onClick={ () => setIsMenuOpen( false ) }
                  >
                    { link.label }
                  </Link>
                </motion.div>
              ) ) }
            </div>
          </motion.div>
        ) }
      </AnimatePresence>
    </nav>
  );
}
