import type { Metadata } from 'next';

import { SettingsScreen } from '@/src/features/settings/SettingsScreen';
import { messages } from '@/src/i18n/messages';

export const metadata: Metadata = { title: messages('en').tabs.settings };

export default function SettingsPage() {
  return <SettingsScreen locale="en" />;
}
