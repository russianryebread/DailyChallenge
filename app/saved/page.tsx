import { PlaceholderScreen } from '@/src/features/shell/PlaceholderScreen';
import { messages } from '@/src/i18n/messages';

export const metadata = { title: messages('en').tabs.saved };

export default function SavedPage() {
  return (
    <PlaceholderScreen
      locale="en"
      active="saved"
      title={messages('en').tabs.saved}
    />
  );
}
