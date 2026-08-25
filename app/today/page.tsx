import type { Metadata } from 'next';

import { TodayView, todayMetadata } from '@/src/features/reader/pages';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  return todayMetadata('en');
}

export default function TodayPage() {
  return <TodayView locale="en" />;
}
