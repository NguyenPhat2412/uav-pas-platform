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
  title: { default: 'UAV PAS | Mission operations platform', template: '%s | UAV PAS' },
  description: 'UAV PAS connects service requests with structured mission operations and secure mission media.',
  alternates: { canonical: '/' },
  openGraph: { title: 'UAV PAS', description: 'A clearer path from UAV service request to mission operations.', url: siteUrl, siteName: 'UAV PAS', type: 'website', images: ['/og-default.png'] },
  twitter: { card: 'summary_large_image', title: 'UAV PAS', description: 'A clearer path from UAV service request to mission operations.', images: ['/og-default.png'] },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const structuredData = { '@context': 'https://schema.org', '@type': 'WebSite', name: 'UAV PAS', url: siteUrl };
  return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a><PublicHeader /><main id="main-content" tabIndex={-1}>{children}</main><PublicFooter /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} /></body></html>;
}
