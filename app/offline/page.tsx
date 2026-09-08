import { OfflineReader } from '@/src/features/offline/OfflineReader';

export const metadata = { title: 'DailyChallenge' };

// Complete local app shell used for every controlled navigation, online or
// offline. Reads the device clock and cached content instead of server pages.
export default function OfflinePage() {
  return <OfflineReader />;
}
