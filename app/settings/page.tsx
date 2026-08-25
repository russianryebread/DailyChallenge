import { PlaceholderScreen } from '@/src/features/shell/PlaceholderScreen';
import { messages } from '@/src/i18n/messages';

export const metadata = { title: messages('en').tabs.settings };

export default function SettingsPage() {
  return (
    <PlaceholderScreen
      locale="en"
      active="settings"
      title={messages('en').tabs.settings}
    />
  );
}
