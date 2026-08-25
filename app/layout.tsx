import type { Metadata, Viewport } from 'next';
import './globals.css';
import { NO_FLASH_SCRIPT } from '@/src/features/settings/preferences';

export const metadata: Metadata = {
  title: {
    default: 'The Christian’s Daily Challenge',
    template: '%s · The Christian’s Daily Challenge',
  },
  description: 'A daily devotional by Edwin and Lillian Harvey.',
};

export const viewport: Viewport = {
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
