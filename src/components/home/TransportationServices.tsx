import Image from "next/image";
import Link from "next/link";
import "@/styles/transportation-services.css";
import { Button } from "../ui/button";

const services = [
  {
    title: "Airport Transfers",
    description:
      "Early departures, late arrivals, private airport pickups, and hotel transfers handled with attentive timing, luggage support and smooth curbside coordination.",
    icon: "/assets/images/icon/airplane.svg",
    size: 80,
  },
  {
    title: "Around Town (Single Rides)",
    description:
      "Reserved point-to-point transportation for meetings, dining, errands, appointments, red carpet, social outings and comfortable movement across Houston.",
    icon: "/assets/images/icon/city.svg",
    size: 76,
  },
  {
    title: "Beck & Call Hourly Reservation",
    description:
      "Dedicated black SUV availability reserved by the hour for the time you need—ideal for multiple stops, changing schedules, business engagements, and on-call convenience in and around Houston.",
    icon: "/assets/images/icon/reservation.svg",
    size: 80,
  },
  {
    title: "Corporate & Partner Transportation",
    description:
      "Dependable transportation support for hotels, travel planners, event teams, executives, client guests and recurring business coordination.",
    icon: "/assets/images/icon/hotel.svg",
    size: 98,
  },
];

export function TransportationServices() {
  return (
    <section className="transportation-services" aria-labelledby="transportation-services-title">
      <div className="transportation-services__inner site-container">
        <div className="transportation-services__intro">
          <h2 id="transportation-services-title" className="site-heading">
            Transportation, Professionally Handled
          </h2>
          <p className="site-copy">
            Structured private transportation for travelers, families, executive
            guests and business partners across Houston and beyond.
          </p>
        </div>

        <div className="transportation-services__grid">
          {services.map((service) => (
            <article className="transportation-services__card" key={service.title}>
              <div className="transportation-services__card-topline">
                <div
                  className="transportation-services__icon"
                  style={{ width: service.size, height: service.size }}
                  aria-hidden="true"
                >
                  <Image
                    src={service.icon}
                    alt=""
                    width={service.size}
                    height={service.size}
                    className="object-contain object-left-top"
                  />
                </div>
              </div>
              <div>
                <h3 className="transportation-services__card-title">{service.title}</h3>
                <p className="site-copy">{service.description}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="transportation-services__cta-row uppercase">
          <Link href="/ride">
            <Button size="lg" variant="outline">
              Explore Business &amp; Partnerships
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
