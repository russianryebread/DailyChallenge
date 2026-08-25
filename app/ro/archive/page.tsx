import { PlaceholderScreen } from '@/src/features/shell/PlaceholderScreen';
import { messages } from '@/src/i18n/messages';

export const metadata = { title: messages('ro').tabs.archive };

export default function ArchivePageRo() {
  return (
    <PlaceholderScreen
      locale="ro"
      active="archive"
      title={messages('ro').tabs.archive}
    />
  );
}
