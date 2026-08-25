import { PlaceholderScreen } from '@/src/features/shell/PlaceholderScreen';
import { messages } from '@/src/i18n/messages';

export const metadata = { title: messages('ro').tabs.settings };

export default function SettingsPageRo() {
  return (
    <PlaceholderScreen
      locale="ro"
      active="settings"
      title={messages('ro').tabs.settings}
    />
  );
}
