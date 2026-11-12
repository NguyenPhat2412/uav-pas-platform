import {pageMetadata} from '@/content/marketing/metadata';
import {HomeLandingHeroSection} from '@/components/marketing/HomeLandingHeroSection';
import {HomeLandingCapabilitiesSection} from '@/components/marketing/HomeLandingCapabilitiesSection';
import {HomeLandingPortalsSection} from '@/components/marketing/HomeLandingPortalsSection';
import {HomeLandingContactSection} from '@/components/marketing/HomeLandingContactSection';
import {HomeLandingShowcaseSection} from '@/components/marketing/HomeLandingShowcaseSection';

export const metadata = pageMetadata(
    'UAV PAS | Nền tảng Điều phối & Vận hành Nhiệm vụ UAV',
    'Nền tảng điều phối và vận hành nhiệm vụ UAV: lập kế hoạch bay GIS, giám sát telemetry, buồng lái SAR và quản lý dữ liệu nhiệm vụ cùng bảng giá gói cước minh bạch.',
    '/',
    true,
);

/**
 * Public home landing composition for UAV PAS.
 *
 * Sections rendered in order:
 * 1. Hero overview & primary mission CTAs
 * 2. Core operational & GIS planning capabilities
 * 3. Dedicated portal ecosystem overview
 * 4. Direct administrator contact & live support section
 * 5. Field operations, hardware anatomy & timeline showcase
 */
export default function Page() {
    return (
        <div className="overflow-x-hidden bg-card text-foreground">
            <HomeLandingHeroSection />
            <HomeLandingCapabilitiesSection />
            <HomeLandingPortalsSection />
            <HomeLandingContactSection />
            <HomeLandingShowcaseSection />
        </div>
    );
}
