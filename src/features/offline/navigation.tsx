'use client';

import { createContext, useContext, type ComponentProps } from 'react';
import NextLink from 'next/link';

export const OfflineNavigation = createContext<((href: string) => void) | null>(null);
export const useOfflineNavigation = () => useContext(OfflineNavigation);

// The cached app routes locally, without Next's server-component requests or
// link prefetches. Normal website pages keep Next navigation, without prefetch.
export function AppLink({ href, children, onClick, ...props }: ComponentProps<typeof NextLink>) {
  const navigate = useOfflineNavigation();
  if (!navigate || typeof href !== 'string') {
    return <NextLink {...props} href={href} prefetch={false} onClick={onClick}>{children}</NextLink>;
  }
  return (
    <a {...props} href={href} onClick={(event) => {
      onClick?.(event);
      if (event.defaultPrevented || event.button !== 0 || event.metaKey ||
          event.ctrlKey || event.shiftKey || event.altKey || props.target === '_blank' || props.download) return;
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
      event.preventDefault();
      navigate(`${url.pathname}${url.search}${url.hash}`);
    }}>{children}</a>
  );
}
