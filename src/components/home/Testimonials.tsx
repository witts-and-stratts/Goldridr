export function Testimonials() {
  return (
    <section className="bg-[#E5E5E5] py-4 text-black lg:py-64">
      <div className="site-container">
        <h2 className="site-heading mb-16 max-w-2xl">
          Why Clients Ride GoldRidr Again
        </h2>
        <p className="mb-16 -mt-10 max-w-xl font-light leading-relaxed text-gray-800">
          Professional handling that keeps clients coming back.
        </p>

        <div className="grid gap-12 md:grid-cols-3">
          <TestimonialItem
            text="What stood out most was the consistency. The timing, the communication, and the overall professionalism were exactly what I needed for repeat business travel."
            author="Jose Salvador"
          />
          <TestimonialItem
            text="Traveling across Houston with luggage and family can be stressful, but Gold Ridr made the entire trip feel calm and organized. Plenty of room, comfortable ride, and no guesswork."
            author="Adnan Haddi"
          />
          <TestimonialItem
            text="For client arrivals, executive pickups, and event-day transportation, Gold Ridr has been dependable, responsive, and easy to coordinate with. Having a transportation partner that communicates clearly makes a noticeable difference."
            author="Maya Burden for ‘Houston Traveler’"
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
