import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-black py-16 px-8 text-white md:px-16">
      <div className="site-container flex flex-col items-center justify-between gap-12 md:flex-row">
        {/* Logo */ }
        <div className="flex flex-col items-center md:items-start">
          <div className="mb-4">
            <Image src="/assets/images/goldridr-symbol.svg" alt="Goldridr" width={ 230 } height={ 100 } className="h-12 md:h-24 w-auto" />
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

      <div className="site-container mt-12 flex flex-col items-center justify-between gap-6 border-t border-gray-900 pt-8 font-light text-gray-400 md:flex-row">
        <div className="flex gap-6">
          <Link href="#" className="hover:text-gray-400 transition-colors">Privacy Policy</Link>
          <Link href="#" className="hover:text-gray-400 transition-colors">Terms & Conditions</Link>
        </div>
        <div className="max-md:text-xs">
          © Goldridr Technology LLC 2024. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
