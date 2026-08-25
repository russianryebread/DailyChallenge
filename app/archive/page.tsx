import type { Metadata } from 'next';

import { ArchiveCurrentView } from '@/src/features/archive/pages';
import { messages } from '@/src/i18n/messages';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: messages('en').tabs.archive };

export default function ArchivePage() {
  return <ArchiveCurrentView locale="en" />;
}
