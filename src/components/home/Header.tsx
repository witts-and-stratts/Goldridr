
import Image from "next/image";
import { Button } from "../ui/button";
import Link from "next/link";

interface HeaderProps {
  onBookNow?: () => void;
}

export function Header( { onBookNow }: HeaderProps ) {
  return (
    <nav className="relative z-20 flex w-full items-center justify-between px-8 py-6 md:px-16 md:py-8">
      <Link href="/" className="flex items-center">
        <Image src="/assets/images/goldridr-logo-main.svg" alt="Goldridr" width={ 180 } height={ 40 } className="h-8 w-auto md:h-10" />
      </Link>

      <div className="hidden items-center gap-8 md:flex">
        <div className="flex gap-8 font-normal tracking-[0.2em] uppercase text-gray-300 font-wide">
          {/* <Link href="/about" className="hover:text-white transition-colors">About</Link> */ }
          <Link href="/ride" className="hover:text-white transition-colors">Ride</Link>
          <Link href="/business" className="hover:text-white transition-colors">Business</Link>
          <Link href="/faqs" className="hover:text-white transition-colors">FAQs</Link>
          <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
        </div>
        <Button
          variant="outline"
          size={ 'lg' }
          onClick={ onBookNow }
          className={ 'bg-black/20 border-gold/80' }
        >
          BOOK NOW
        </Button>
      </div>
    </nav>
  );
}
