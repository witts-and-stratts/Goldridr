import Link from "next/link";
import Image from "next/image";
import { FooterCopyright } from "./FooterCopyright";

export function Footer() {
  return (
    <footer className="bg-black py-16 container  text-white mx-auto">
      <div className="site-container flex flex-col items-center justify-between gap-12 md:flex-row">
        {/* Logo */ }
        <div className="flex flex-col items-center md:items-start">
          <div className="mb-4">
            <Image src="/assets/images/goldridr-symbol.svg" alt="Goldridr" width={ 230 } height={ 100 } className="h-12 md:h-16 w-auto" />
          </div>
        </div>

        {/* Links */ }
        <div className="site-label flex flex-wrap justify-center gap-8 text-gray-400 md:justify-end">
          <Link href="#" className="hover:text-white transition-colors">ABOUT</Link>
          <Link href="#" className="hover:text-white transition-colors">RIDE</Link>
          <Link href="#" className="hover:text-white transition-colors">BUSINESS</Link>
          <Link href="#" className="hover:text-white transition-colors">FAQs</Link>
          <Link href="#" className="hover:text-white transition-colors">CONTACT</Link>
        </div>
      </div>

      <div className="site-container mt-12 flex flex-col items-center justify-between gap-6 border-t border-gray-900 pt-8 font-light text-gray-400 md:flex-row text-xs">
        <div className="flex gap-6">
          <Link href="/privacy" className="hover:text-gray-400 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-gray-400 transition-colors">Terms & Conditions</Link>
        </div>
        <div className="max-md:text-xs">
          <FooterCopyright />
        </div>
      </div>
    </footer>
  );
}
