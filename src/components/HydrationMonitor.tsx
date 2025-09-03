'use client';

import { useEffect } from 'react';

export default function HydrationMonitor() {
  useEffect(() => {
    // Monitor hydration performance
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name === 'Next.js-hydration') {
          console.warn('Hydration completed in:', entry.duration, 'ms');
        }
      });
    });

    observer.observe({ entryTypes: ['measure'] });

    // Cleanup
    return () => observer.disconnect();
  }, []);

  return null;
}