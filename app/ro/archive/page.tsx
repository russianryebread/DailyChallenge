import type { Metadata } from 'next';

import { ArchiveCurrentView } from '@/src/features/archive/pages';
import { messages } from '@/src/i18n/messages';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: messages('ro').tabs.archive };

export default function ArchivePageRo() {
  return <ArchiveCurrentView locale="ro" />;
}
