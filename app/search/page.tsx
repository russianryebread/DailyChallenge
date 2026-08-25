import type { Metadata } from 'next';

import { contentVersion } from '@/src/content/repository';
import { SearchScreen } from '@/src/features/search/SearchScreen';
import { messages } from '@/src/i18n/messages';

export const metadata: Metadata = { title: messages('en').search.label };

export default function SearchPage() {
  return (
    <SearchScreen
      locale="en"
      indexUrl={`/content/${contentVersion}/search-en.json`}
    />
  );
}
