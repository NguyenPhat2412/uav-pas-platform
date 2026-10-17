import type { Metadata } from 'next';
import '@uav/design-tokens/styles.css';
import './globals.css';
import './public-pages.css';
import './accessibility.css';
import { PublicFooter } from '../src/components/public-footer';
import { PublicHeader } from '../src/components/public-header';

import { publicUrl as siteUrl } from '../src/content/origins';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'UAV PAS | Nền tảng điều phối nhiệm vụ', template: '%s | UAV PAS' },
  description: 'UAV PAS kết nối yêu cầu dịch vụ với quy trình điều phối nhiệm vụ và quản lý hình ảnh an toàn.',
  alternates: { canonical: '/' },
  openGraph: { title: 'UAV PAS', description: 'Kết nối rõ ràng từ yêu cầu dịch vụ UAV đến điều phối nhiệm vụ.', url: siteUrl, locale: 'vi_VN', siteName: 'UAV PAS', type: 'website', images: ['/og-default.png'] },
  twitter: { card: 'summary_large_image', title: 'UAV PAS', description: 'Kết nối rõ ràng từ yêu cầu dịch vụ UAV đến điều phối nhiệm vụ.', images: ['/og-default.png'] },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const structuredData = { '@context': 'https://schema.org', '@type': 'WebSite', name: 'UAV PAS', inLanguage: 'vi', url: siteUrl };
  return <html lang="vi"><body><a className="skip-link" href="#main-content">Chuyển đến nội dung chính</a><PublicHeader /><main id="main-content" tabIndex={-1}>{children}</main><PublicFooter /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} /></body></html>;
}
