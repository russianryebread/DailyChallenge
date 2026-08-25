import type { Metadata } from 'next';

import { catalog } from '@/src/content/repository';
import { SavedScreen } from '@/src/features/saved/SavedScreen';
import { messages } from '@/src/i18n/messages';

export const metadata: Metadata = { title: messages('en').tabs.saved };

export default function SavedPage() {
  return <SavedScreen locale="en" catalog={catalog('en')} />;
}
