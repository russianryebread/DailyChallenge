import type { Metadata } from 'next';

import { SettingsScreen } from '@/src/features/settings/SettingsScreen';
import { messages } from '@/src/i18n/messages';

export const metadata: Metadata = { title: messages('ro').tabs.settings };

export default function SettingsPageRo() {
  return <SettingsScreen locale="ro" />;
}
