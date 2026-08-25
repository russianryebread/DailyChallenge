import type { Metadata } from 'next';

import { SupportScreen } from '@/src/features/support/SupportScreen';
import { messages } from '@/src/i18n/messages';

export const metadata: Metadata = { title: messages('en').support.title };

export default function SupportPage() {
  return <SupportScreen locale="en" />;
}
