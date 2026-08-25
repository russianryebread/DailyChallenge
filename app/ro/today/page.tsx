import type { Metadata } from 'next';

import { TodayView, todayMetadata } from '@/src/features/reader/pages';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  return todayMetadata('ro');
}

export default function TodayPageRo() {
  return <TodayView locale="ro" />;
}
