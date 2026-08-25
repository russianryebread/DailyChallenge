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
  applicationName: 'Daily Challenge',
  appleWebApp: {
    capable: true,
    // Translucent status bar so the hero/header paints under the safe area.
    statusBarStyle: 'black-translucent',
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
  // A single base theme-color; the no-flash script and ThemeColorSync update it
  // to match the active (light/dark) theme, not just the system preference.
  themeColor: '#faf5f0',
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
