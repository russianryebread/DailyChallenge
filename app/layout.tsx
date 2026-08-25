import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Christian’s Daily Challenge',
  description: 'A daily devotional by Edwin and Lillian Harvey.',
};

export const viewport: Viewport = {
  themeColor: '#faf5f0',
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
