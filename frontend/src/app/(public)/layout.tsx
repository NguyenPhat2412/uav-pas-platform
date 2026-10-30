import type {Metadata} from 'next';
import {Suspense} from 'react';
import {PublicFooter} from '@/features/marketing/components/PublicFooter';
import {PublicHeader} from '@/features/marketing/components/PublicHeader';
import {ScrollToTopButton} from '@/features/marketing/components/ScrollToTopButton';
import {PortalProviders} from '@/providers/PortalProviders';
import {AuthModalPopup} from '@/features/auth/components/AuthModalPopup';
import {publicUrl as siteUrl} from '@/features/marketing/content/origins';

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {default: 'UAV PAS | Nền tảng điều phối nhiệm vụ', template: '%s | UAV PAS'},
    description: 'UAV PAS kết nối yêu cầu dịch vụ với quy trình điều phối nhiệm vụ và quản lý hình ảnh an toàn.',
    alternates: {canonical: '/'},
    openGraph: {
        title: 'UAV PAS',
        description: 'Kết nối rõ ràng từ yêu cầu dịch vụ UAV đến điều phối nhiệm vụ.',
        url: siteUrl,
        locale: 'vi_VN',
        siteName: 'UAV PAS',
        type: 'website',
        images: ['/og-default.png'],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'UAV PAS',
        description: 'Kết nối rõ ràng từ yêu cầu dịch vụ UAV đến điều phối nhiệm vụ.',
        images: ['/og-default.png'],
    },
};

export default function PublicLayout({children}: { children: React.ReactNode }) {
    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'UAV PAS',
        inLanguage: 'vi',
        url: siteUrl,
    };
    return (
        <div className="min-h-screen bg-card text-foreground">
            <PortalProviders area="customer">
                <a
                    className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-card focus:px-4 focus:py-2 focus:font-bold focus:text-primary focus:shadow-lg"
                    href="#main-content"
                >
                    Chuyển đến nội dung chính
                </a>
                <PublicHeader/>
                <main id="main-content" tabIndex={-1}>{children}</main>
                <PublicFooter/>
                <ScrollToTopButton/>
                <Suspense fallback={null}>
                    <AuthModalPopup/>
                </Suspense>
            </PortalProviders>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{__html: JSON.stringify(structuredData).replace(/</g, '\\u003c')}}
            />
        </div>
    );
}
