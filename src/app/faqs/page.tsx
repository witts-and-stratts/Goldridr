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
      question: "Does GoldRidr offer pre-scheduled rides or Ride On Demand?",
      answer:
        "All our rides are prescheduled for now. You can preschedule up to 4 hours in advance of your desired pick up time. Our Ride On Demand Option will soon be available.",
    },
    {
      question: "How do I request a ride?",
      answer:
        "You can either book via Phone, On this website or via WhatsApp.",
    },
    {
      question: "Which payment options do you accept?",
      answer: "GoldRidr accepts Visa, Mastercard, American Express and Discover cards. It is not possible to pay for the ride in cash. You can also pay via Zelle, Cashapp or Apple Pay if you are an iOS user. Our Chaffeurs can also provide you a physical device to tap and pay. Business accounts can also request to receive monthly invoices, instead of paying on a ride-by-ride basis. Please contact business@goldridr.com for additional information. Please keep in mind that all rides are on a pay-before-service basis. "
    },
    {
      question: "Can I schedule a ride in advance?",
      answer:
        "Yes, Goldridr allows you to schedule rides up to 30 days in advance to ensure your travel plans are secured.",
    },
    {
      question: "What if my flight is delayed?",
      answer: "Providing your flight number when booking an airport pickup allows us to track your arrival and adjust the pickup time for any delays or early arrivals. So we would adjust your pickup time accomodate a delayed or early arrival provided your flight number was provided when booking."
    },
    {
      question: "What is wait time?",
      answer: "We offer a 15 minute wait time beyong your pick up time just in case life happens and you are not ready at pick up. Wait times might vary based on location, pick up spot or time of day. You will be informed at booking or ahead of your pick up."
    },
    {
      question: "What is the cancellation policy and how can I cancel my ride?",
      answer: "Riders are able to cancel their ride free of charge up until 2 hours before the scheduled pickup time."
    },
    {
      question: "Rideshare Insurance",
      answer: "GoldRidr maintains commercial automobile liability insurance for all our vehicles.  Our liability insurance in case of a covered accident is $1,000,000. Uninsured and/or underinsured motorist bodily injury and property damage as required by law. "
    },
    {
      question: "What vehicles does GoldRidr use?",
      answer: "We use an all Black Chevrolet Suburban fleet. Newer than 2022 Model years. (updated October 2023) "
    },
    {
      question: "What city does GoldRidr operate in?",
      answer: "We operate in Houston Texas and operate interstate rides within the state of Texas."
    },
    {
      question: "What is seating capacity of your vehciles?",
      answer: "Each of our SUVs takes up to 7 passengers. We provide car seats for children."
    },
    {
      question: "How much luggage can your vehicles take?",
      answer: "In addition to the 7 seats available in our SUVs, the trunk space can take 7 carry-on, 5 standard or 3 extra large check-in luggage. In the case of foldable wheelchairs, they take up the space of 1 standard check-in luggage. Our chauffeurs are unable to transport unaccompanied luggage. Should you require multiple vehicles to accommodate your luggage, we ask that at least one passenger ride along in each vehicle."
    },
    {
      question: "What if I have more luggage than the baggage allowance for my booking?",
      answer: "The maximum luggage allowance shown for each booking is based on safety, so we do not recommend exceeding this limit. If you are traveling with more luggage than the allowance, ensure you book enough vehicles to be able to transport all your belongings without going over the maximum capacity."
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
