import type { Metadata } from 'next';

import {
  DevotionalView,
  devotionalMetadata,
} from '@/src/features/reader/pages';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return devotionalMetadata('en', id);
}

export default async function DevotionalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DevotionalView locale="en" idParam={id} />;
}
