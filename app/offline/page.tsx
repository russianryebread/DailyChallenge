import { OfflineReader } from '@/src/features/offline/OfflineReader';

export const metadata = { title: 'Offline' };

// Client shell served by the service worker for routes not individually cached
// while offline. It renders the requested reading from the precached content.
export default function OfflinePage() {
  return <OfflineReader />;
}
