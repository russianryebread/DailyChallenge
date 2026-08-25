import { PlaceholderScreen } from '@/src/features/shell/PlaceholderScreen';
import { messages } from '@/src/i18n/messages';

export const metadata = { title: messages('en').tabs.archive };

export default function ArchivePage() {
  return (
    <PlaceholderScreen
      locale="en"
      active="archive"
      title={messages('en').tabs.archive}
    />
  );
}
