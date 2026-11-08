import {pageMetadata} from '@/content/marketing/metadata';
import {HomeLandingHeroSection} from '@/components/marketing/HomeLandingHeroSection';
import {HomeLandingCapabilitiesSection} from '@/components/marketing/HomeLandingCapabilitiesSection';
import {HomeLandingPortalsSection} from '@/components/marketing/HomeLandingPortalsSection';
import {HomeLandingShowcaseSection} from '@/components/marketing/HomeLandingShowcaseSection';

export const metadata = pageMetadata(
    'UAV PAS | Nền tảng Điều phối & Vận hành Nhiệm vụ UAV',
    'Nền tảng điều phối và vận hành nhiệm vụ UAV: lập kế hoạch bay GIS, giám sát telemetry, buồng lái SAR và quản lý dữ liệu nhiệm vụ cùng bảng giá gói cước minh bạch.',
    '/',
    true,
);

export default function Page() {
    return (
        <div className="bg-card text-foreground overflow-x-hidden">
            <HomeLandingHeroSection/>
            <HomeLandingCapabilitiesSection/>
            <HomeLandingPortalsSection/>
            <HomeLandingShowcaseSection/>
        </div>
    );
}
