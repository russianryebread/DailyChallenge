import type { Metadata } from 'next';

import { contentVersion } from '@/src/content/repository';
import { SearchScreen } from '@/src/features/search/SearchScreen';
import { messages } from '@/src/i18n/messages';

export const metadata: Metadata = { title: messages('ro').search.label };

export default function SearchPageRo() {
  return (
    <SearchScreen
      locale="ro"
      indexUrl={`/content/${contentVersion}/search-ro.json`}
    />
  );
}
