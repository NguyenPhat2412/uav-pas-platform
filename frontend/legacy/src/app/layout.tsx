import type { Metadata } from 'next';
import '@/styles/brand-tokens.css';
import './globals.css';
import '@/styles/portal.css';
import { I18nProvider } from '@/contexts/I18nContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryProvider } from '@/providers/QueryProvider';


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
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className="uav-portal bg-surface text-on-surface min-h-screen antialiased">
        <I18nProvider>
          <QueryProvider><AuthProvider>{children}</AuthProvider></QueryProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
