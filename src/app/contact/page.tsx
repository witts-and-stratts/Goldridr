"use client";

import { useState } from "react";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";
import { BookingOverlay } from "@/components/booking/BookingOverlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  MapPin,
  Mail,
  Phone
} from "lucide-react";
import QRCode from "react-qr-code";

const VCARD_DATA = `BEGIN:VCARD
VERSION:3.0
FN:Goldridr Concierge
ORG:Goldridr
TEL;TYPE=WORK,VOICE:+1 555 123 4567
EMAIL:concierge@goldridr.com
ADR;TYPE=WORK:;;Houston, TX;United States
END:VCARD`;

export default function ContactPage() {
  const [ isBookingOpen, setIsBookingOpen ] = useState( false );

  return (
    <main className="flex min-h-screen flex-col bg-black text-white">
      <Header onBookNow={ () => setIsBookingOpen( true ) } />

      <div className="flex-1 w-full max-w-7xl mx-auto px-8 py-12 md:py-24">
        <div className="grid md:grid-cols-2 gap-16 lg:gap-24">

          {/* Contact Information */ }
          <div className="space-y-12">
            <div>
              <h1 className="font-serif text-4xl md:text-5xl text-white mb-6">
                GET IN TOUCH
              </h1>
              <p className="text-gray-400 font-light text-lg leading-relaxed max-w-md">
                We are here to help with any questions or specific needs you may have.
                Reach out to us and experience the Goldridr difference.
              </p>
            </div>

            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-white/5 border border-white/10 text-gold">
                  <Phone className="size-6" strokeWidth={ 1 } />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white mb-1">Phone</h3>
                  <p className="text-gray-400 font-light">+1 (555) 123-4567</p>
                  <p className="text-gray-500 text-sm mt-1">Mon-Fri from 8am to 5pm.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-white/5 border border-white/10 text-gold">
                  <Mail className="size-6" strokeWidth={ 1 } />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white mb-1">Email</h3>
                  <p className="text-gray-400 font-light">concierge@goldridr.com</p>
                  <p className="text-gray-500 text-sm mt-1">Depending on the volume, we will do our best to answer your email within 24 hours.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-white/5 border border-white/10 text-gold">
                  <MapPin className="size-6" strokeWidth={ 1 } />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white mb-1">Office</h3>
                  <p className="text-gray-400 font-light">
                    Houston, TX<br />
                    United States
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-white/10">
              <div className="bg-white p-4 rounded-xl w-fit">
                <QRCode
                  value={ VCARD_DATA }
                  size={ 128 }
                  style={ { height: "auto", maxWidth: "100%", width: "100%" } }
                  viewBox={ `0 0 128 128` }
                />
              </div>
              <p className="text-gray-500 text-sm mt-3">Scan to add to contacts</p>
            </div>
          </div>

          {/* Contact Form */ }
          <div className="bg-white/5 border border-white/10 p-8 md:p-10 rounded-2xl">
            <h2 className="text-2xl font-wide text-white mb-6 uppercase tracking-widest">Send us a Message</h2>
            <form className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name" className="text-gray-400">First name</Label>
                  <Input
                    id="first-name"
                    placeholder="First name"
                    className="bg-black/50 border-white/20 text-white placeholder:text-gray-600 focus:border-gold focus:ring-gold"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name" className="text-gray-400">Last name</Label>
                  <Input
                    id="last-name"
                    placeholder="Last name"
                    className="bg-black/50 border-white/20 text-white placeholder:text-gray-600 focus:border-gold focus:ring-gold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-400">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  className="bg-black/50 border-white/20 text-white placeholder:text-gray-600 focus:border-gold focus:ring-gold"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-400">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  className="bg-black/50 border-white/20 text-white placeholder:text-gray-600 focus:border-gold focus:ring-gold"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-gray-400">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Tell us how we can help..."
                  className="min-h-[150px] bg-black/50 border-white/20 text-white placeholder:text-gray-600 focus:border-gold focus:ring-gold"
                />
              </div>

              <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-black font-bold">
                SEND MESSAGE
              </Button>
            </form>
          </div>

        </div>
      </div>

      <Footer />
      <BookingOverlay isOpen={ isBookingOpen } onClose={ () => setIsBookingOpen( false ) } />
    </main >
  );
}
