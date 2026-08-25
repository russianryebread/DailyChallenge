import { PlaceholderScreen } from '@/src/features/shell/PlaceholderScreen';
import { messages } from '@/src/i18n/messages';

export const metadata = { title: messages('ro').tabs.saved };

export default function SavedPageRo() {
  return (
    <PlaceholderScreen
      locale="ro"
      active="saved"
      title={messages('ro').tabs.saved}
    />
  );
}
