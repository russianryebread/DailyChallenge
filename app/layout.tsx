import type { Metadata, Viewport } from 'next';
import './globals.css';
import { NO_FLASH_SCRIPT } from '@/src/features/settings/preferences';
import { RegisterSW } from '@/src/features/pwa/RegisterSW';

export const metadata: Metadata = {
  title: {
    default: 'The Christian’s Daily Challenge',
    template: '%s · The Christian’s Daily Challenge',
  },
  description: 'A daily devotional by Edwin and Lillian Harvey.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Daily Challenge',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Daily Challenge',
  },
  icons: {
    icon: '/icons/favicon.png',
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf5f0' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1512' },
  ],
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
        <RegisterSW />
      </body>
    </html>
  );
}
