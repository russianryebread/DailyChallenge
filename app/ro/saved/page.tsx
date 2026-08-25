import type { Metadata } from 'next';

import { catalog } from '@/src/content/repository';
import { SavedScreen } from '@/src/features/saved/SavedScreen';
import { messages } from '@/src/i18n/messages';

export const metadata: Metadata = { title: messages('ro').tabs.saved };

export default function SavedPageRo() {
  return <SavedScreen locale="ro" catalog={catalog('ro')} />;
}
