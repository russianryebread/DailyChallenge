import type { Metadata } from 'next';

import {
  ArchiveMonthView,
  archiveMonthMetadata,
} from '@/src/features/archive/pages';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ month: string }>;
}): Promise<Metadata> {
  const { month } = await params;
  return archiveMonthMetadata('en', month);
}

export default async function ArchiveMonthPage({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  const { month } = await params;
  return <ArchiveMonthView locale="en" monthParam={month} />;
}
