import { redirect } from 'next/navigation';

// First release opens directly on Today for returning web users. A dedicated
// first-use Welcome screen is a later delivery stage.
export default function RootPage() {
  redirect('/today');
}
