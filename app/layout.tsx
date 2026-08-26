import type { Metadata, Viewport } from 'next';
import './globals.css';
import { NO_FLASH_SCRIPT } from '@/src/features/settings/preferences';
import { RegisterSW } from '@/src/features/pwa/RegisterSW';
import { ThemeColorSync } from '@/src/features/pwa/ThemeColorSync';

export const metadata: Metadata = {
  title: {
    default: 'The Christian’s Daily Challenge',
    template: '%s · The Christian’s Daily Challenge',
  },
  description: 'A daily devotional by Edwin and Lillian Harvey.',
  manifest: '/manifest.webmanifest',
  applicationName: 'DailyChallenge',
  appleWebApp: {
    capable: true,
    // Translucent status bar so the hero/header paints under the safe area.
    statusBarStyle: 'black-translucent',
    title: 'DailyChallenge',
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
  // Base theme-color matches the hero/header top so the browser's status-bar
  // area blends with the gradient (no band); the no-flash script and
  // ThemeColorSync keep it in sync with the active light/dark theme.
  themeColor: '#e0a074',
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
        <ThemeColorSync />
      </body>
    </html>
  );
}
