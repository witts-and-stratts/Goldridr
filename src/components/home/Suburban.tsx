import Image from 'next/image';
import { ImageSlider } from '../image-slider';
import '@/styles/suburban.css';

const SUBURBAN_IMAGES = [
  {
    img: '/assets/images/fleet-suburban-interior-top-view.webp',
    mobileImg: '/assets/images/fleet-suburban-interior-top-view-mobile.webp',
    alt: 'Chevrolet Suburban interior',
  },
  {
    img: '/assets/images/fleet-suburban-exterior.webp',
    mobileImg: '/assets/images/fleet-suburban-exterior-mobile.webp',
    alt: 'Black Chevrolet Suburban exterior',
  },
];

export function Suburban({
  showFeatureTag = false,
}: {
  showFeatureTag?: boolean;
}) {
  return (
    <section className="suburban">
      <ImageSlider
        overlayOpacity={0.3}
        images={SUBURBAN_IMAGES}
        animationDuration={2}
        exitAnimationDuration={4}
        imgClassName="suburban__image"
      />

      <div className="suburban__content site-container">
        <div className="suburban__intro">
          <h2 className="site-heading">
            Ride in Quiet Comfort
          </h2>
          <p className="site-lead suburban__lead">
            Inside every Gold Ridr vehicle, the goal is the same: space to
            settle in, room to breathe and a ride that feels smooth from the
            first mile to the last.
          </p>

          <p className="site-copy suburban__copy mb-50 md:mb-100">
            Our full-size black SUVs are kept clean, quiet, climate-controlled
            and thoughtfully equipped for airport runs, city appointments,
            family travel and executive transportation—so comfort never feels
            like an afterthought.
          </p>

          {/* Feature Tags */}
          {showFeatureTag && (
            <div className="suburban__feature-tags">
              <span className="suburban__feature-tag">
                PREMIUM SOUND
              </span>
              <span className="suburban__feature-tag">
                TINTED PRIVACY GLASS
              </span>
              <span className="suburban__feature-tag">
                SPACE FOR 6 PASSENGERS
              </span>
            </div>
          )}
        </div>

        <div className="suburban__features">
          <FleetFeature
            icon={
              <Image
                src='/assets/images/icon/chair.svg'
                alt='Start'
                width={100}
                height={100}
                className='md:size-12 size-8'
              />
            }
            title='Spacious interior with leather seats. Seats up to 6 people'
          />
          <FleetFeature
            icon={
              <Image
                src='/assets/images/icon/luggage.svg'
                alt='Briefcase'
                width={100}
                height={100}
                className='md:size-12 size-8'
              />
            }
            title='Plenty of luggage space'
          />
          <FleetFeature
            icon={
              <Image
                src='/assets/images/icon/umbrella.svg'
                alt='Shield'
                width={100}
                height={100}
                className='md:size-10 size-6'
              />
            }
            title='Complimentary water bottles'
          />
          <FleetFeature
            icon={
              <Image
                src='/assets/images/icon/charger.svg'
                alt='Wifi'
                width={100}
                height={100}
                className='md:size-12 size-8'
              />
            }
            title='In-vehicle w/ fast chargers'
          />
          <FleetFeature
            icon={
              <Image
                src='/assets/images/icon/chair.svg'
                alt='Quite Cabin'
                width={100}
                height={100}
                className='md:size-12 size-8'
              />
            }
            title='Quite Cabin'
          />
        </div>
      </div>
    </section>
  );
}

function FleetFeature({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="suburban__feature">
      <div className="suburban__feature-icon">{icon}</div>
      <div>
        <h4 className="suburban__feature-title">
          {title}
        </h4>
      </div>
    </div>
  );
}
