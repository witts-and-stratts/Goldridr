import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";
import { ChevronDown } from "lucide-react";
import Image from "next/image";

export default function FaqPage() {
  const faqs = [
    {
      question: "What is Goldridr?",
      answer:
        "Goldridr is a premium transportation service designed to offer luxury, comfort, and reliability for all your travel needs.",
    },
    {
      question: "How do I book a ride?",
      answer:
        "You can book a ride directly through our website by clicking on the 'Ride' link in the navigation menu, or by downloading our mobile app.",
    },
    {
      question: "What areas do you serve?",
      answer:
        "We currently serve major metropolitan areas and select international destinations. Please check our booking page for specific availability in your region.",
    },
    {
      question: "Can I schedule a ride in advance?",
      answer:
        "Yes, Goldridr allows you to schedule rides up to 30 days in advance to ensure your travel plans are secured.",
    },
    {
      question: "What is your cancellation policy?",
      answer:
        "Cancellations made at least 24 hours before the scheduled pickup time are fully refundable. For cancellations within 24 hours, a fee may apply.",
    },
    {
      question: "Do you offer corporate accounts?",
      answer:
        "Absolutely. Our Business solutions provide companies with streamlined billing, priority booking, and detailed reporting. Visit our Business page to learn more.",
    },
  ];

  return (
    <>
      <Header />
      <Image src="/assets/images/goldridr-chaffeur.png" width={ 1600 } height={ 1600 } alt="Goldridr Chaffeur" className="absolute -mt-40 opacity-50" />
      <div className="min-h-screen text-white selection:bg-gold/30 relative mt-20 md:mt-20 lg:mt-80">
        {/* Header Section */ }
        <div className="container mx-auto px-4 pt-32 pb-16">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-6 text-center font-serif">
            Frequently Asked <span className="text-gold">Questions</span>
          </h1>
          <p className="text-xl text-gray-400 text-center max-w-2xl mx-auto mb-12">
            Everything you need to know about Goldridr services, booking, and accounts.
          </p>

          {/* FAQs Grid */ }
          <div className="max-w-3xl mx-auto space-y-4">
            { faqs.map( ( faq, index ) => (
              <div
                key={ index }
                className="group border border-white/10 rounded-lg overflow-hidden bg-white/5 hover:border-white/20 transition-colors"
              >
                <details className="group">
                  <summary className="flex cursor-pointer items-center justify-between p-4 lg:p-6 font-medium text-lg list-none outline-none">
                    <span className="font-wide uppercase tracking-wide group-open:text-gold">{ faq.question }</span>
                    <ChevronDown className="transition-transform group-open:rotate-180 text-gold" strokeWidth={ 1 } />
                  </summary>
                  <div className="px-6 pb-6 text-gray-400 animate-in slide-in-from-top-2 fade-in duration-200 font-sans">
                    { faq.answer }
                  </div>
                </details>
              </div>
            ) ) }
          </div>

          {/* Contact CTA */ }
          <div className="mt-24 text-center">
            <h3 className="text-2xl font-bold mb-4 font-sans">Still have questions?</h3>
            <p className="text-gray-400 mb-8">
              Our support team is available 24/7 to assist you.
            </p>
            <Link href="/contact">
              <Button
                size="lg"
                className="bg-gold text-black hover:bg-gold/80 font-semibold px-8"
              >
                Contact Support
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
