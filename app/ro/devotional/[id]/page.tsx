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
  return devotionalMetadata('ro', id);
}

export default async function DevotionalPageRo({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DevotionalView locale="ro" idParam={id} />;
}
