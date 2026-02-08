export function Testimonials() {
  return (
    <section className="bg-[#E5E5E5] px-4 py-24 text-black md:px-16 lg:py-64">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-16 max-w-2xl font-serif text-3xl uppercase leading-tight tracking-wide md:text-4xl">
          Everyone is talking about the experience
        </h2>

        <div className="grid gap-12 md:grid-cols-3">
          <TestimonialItem
            text="From the moment I stepped out of the vehicle, everything felt effortless and refined. The service was discreet, punctual, and truly world-class."
            author="Amara Okoye"
          />
          <TestimonialItem
            text="The epitome of executive transportation should feel—calm, professional, and impeccably delivered. I couldn't ask for a better start to my business trip."
            author="Daniel Foster"
          />
          <TestimonialItem
            text="It isn't just a ride, it's a part of the experience. Elegant, seamless, and thoughtfully executed from start to finish."
            author="Sophie Laurent"
          />
        </div>
      </div>
    </section>
  );
}

function TestimonialItem( { text, author }: { text: string; author: string; } ) {
  return (
    <div className="flex flex-col justify-between pr-10 md:border-r-[0.5px] md:border-r-gray-400 md:last-of-type:pr-0 md:last-of-type:border-r-0 max-md:border-b-[0.5px] max-md:border-gray-400 max-md:last-of-type:border-b-0 max-md:pb-8">
      <p className="mb-6 font-light leading-relaxed text-gray-800">
        “{ text }”
      </p>
      <p className="text-sm font-medium text-gold">
        { author }
      </p>
    </div>
  );
}
