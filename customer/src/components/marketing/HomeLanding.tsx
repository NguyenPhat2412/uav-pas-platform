import {pageMetadata} from '@/content/marketing/metadata';
import {HomeHeroSection} from '@/components/marketing/HomeHeroSection';
import {HomeCategoryGridSection} from '@/components/marketing/HomeCategoryGridSection';
import {HomeFeaturedServicesSection} from '@/components/marketing/HomeFeaturedServicesSection';
import {HomeHowItWorksSection} from '@/components/marketing/HomeHowItWorksSection';
import {HomeSimulationHighlightSection} from '@/components/marketing/HomeSimulationHighlightSection';
import {HomePartnerCtaSection} from '@/components/marketing/HomePartnerCtaSection';

export const metadata = pageMetadata(
    'UAV PAS | Đặt dịch vụ bay UAV cho dự án của bạn',
    'Nền tảng điều phối dịch vụ bay UAV: chọn dịch vụ, vẽ vùng bay và chọn lịch. UAV PAS điều phối đội bay đã xác minh, theo dõi chuyến bay mô phỏng và nhận kết quả.',
    '/',
    true,
);

/**
 * Compact 6-block Shopee-inspired homepage for UAV PAS:
 * 1. Hero + service search bar
 * 2. Shared service category icon grid
 * 3. Live featured service listings (fleet-anonymous)
 * 4. 4-step workflow
 * 5. Flight simulation highlight
 * 6. Partner strip + final CTA
 */
export default function Page() {
    return (
        <div className="overflow-x-hidden bg-card text-foreground">
            <HomeHeroSection/>
            <HomeCategoryGridSection/>
            <HomeFeaturedServicesSection/>
            <HomeHowItWorksSection/>
            <HomeSimulationHighlightSection/>
            <HomePartnerCtaSection/>
        </div>
    );
}
