'use client';

import { Button } from "../ui/button";

export function InfoSection() {
  return (
    <section className="bg-black py-10 text-white lg:py-32">
      <div className="site-container">
        <h2 className="site-heading">
          Chauffeured Personally
        </h2>
        <h3 className="site-lead mb-4">Gold Ridr is built around a simple idea: professional black SUV transportation for the way Houston moves. </h3>
        <p className="site-copy">
          Every booking is professionally coordinated and handled with warm communication, thoughtful timing and a clear standard of care and attentiveness from start to finish.
        </p>
        <p className="site-copy mb-12">
          This is not ride share. It’s for you — specifically.
        </p>
        <Button
          size={ 'lg' }
          variant='outline'
        >
          ABOUT GOLDRIDR
        </Button>
      </div>
    </section>
  );
}
