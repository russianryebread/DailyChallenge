'use client';

import { useEffect } from 'react';

// Parallaxes the hero title/metadata upward as the page scrolls, fading them out
// before the reading content scrolls over the (sticky) hero. No-op when the
// reader prefers reduced motion.
export function HeroParallax() {
  useEffect(() => {
    const copy = document.querySelector<HTMLElement>('.hero-copy');
    if (!copy) {
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      copy.style.transform = `translate3d(0, ${-y * 0.45}px, 0)`;
      copy.style.opacity = String(Math.max(0, 1 - y / 220));
    };
    const onScroll = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      copy.style.transform = '';
      copy.style.opacity = '';
    };
  }, []);

  return null;
}
