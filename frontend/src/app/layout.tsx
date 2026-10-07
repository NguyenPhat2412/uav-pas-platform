import type { Metadata } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import './globals.css';
import { I18nProvider } from '@/contexts/I18nContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryProvider } from '@/providers/QueryProvider';

const beVietnamPro = Be_Vietnam_Pro({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-be-vietnam-pro',
});

export const metadata: Metadata = {
  title: 'UAV PAS - Precision Flight Control & Telemetry Platform',
  description:
    'Industrial-grade autonomous flight command, mission control, and real-time remote telemetry monitoring platform for specialized UAV equipment.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={beVietnamPro.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className="bg-surface font-body-md text-on-surface min-h-screen antialiased">
        <I18nProvider>
          <QueryProvider><AuthProvider>{children}</AuthProvider></QueryProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
