'use client';

import { useSyncExternalStore } from 'react';

function subscribe() {
  return () => {};
}

function getCurrentYear() {
  return new Date().getFullYear();
}

function getPrerenderYear() {
  return null;
}

export function FooterCopyright() {
  const year = useSyncExternalStore( subscribe, getCurrentYear, getPrerenderYear );

  return (
    <div className="max-md:text-xs">
      © Goldridr{ year === null ? '' : ` ${ year }` }. All rights reserved.
    </div>
  );
}
