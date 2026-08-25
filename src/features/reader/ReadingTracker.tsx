'use client';

import { useEffect } from 'react';

import { markRead } from '@/src/state/readingState';

const DWELL_MS = 5000;
const SCROLL_THRESHOLD_PX = 120;

/**
 * Marks a reading as read after meaningful engagement: the page has been open
 * for at least five seconds and the reader has scrolled a little. Fires once.
 */
export function ReadingTracker({ monthDay }: { monthDay: string }) {
  useEffect(() => {
    let dwelled = false;
    let scrolled = window.scrollY > SCROLL_THRESHOLD_PX;
    let done = false;

    function commit() {
      if (done || !dwelled || !scrolled) {
        return;
      }
      done = true;
      window.removeEventListener('scroll', onScroll);
      void markRead(monthDay);
    }

    function onScroll() {
      if (window.scrollY > SCROLL_THRESHOLD_PX) {
        scrolled = true;
        commit();
      }
    }

    const timer = window.setTimeout(() => {
      dwelled = true;
      commit();
    }, DWELL_MS);

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
  }, [monthDay]);

  return null;
}
