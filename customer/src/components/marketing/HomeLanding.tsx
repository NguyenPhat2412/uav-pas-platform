import {pageMetadata} from '@/content/marketing/metadata';
import {HomeLandingHeroSection} from '@/components/marketing/HomeLandingHeroSection';
import {HomeLandingCapabilitiesSection} from '@/components/marketing/HomeLandingCapabilitiesSection';
import {HomeLandingPortalsSection} from '@/components/marketing/HomeLandingPortalsSection';
import {HomeLandingContactSection} from '@/components/marketing/HomeLandingContactSection';
import {HomeLandingShowcaseSection} from '@/components/marketing/HomeLandingShowcaseSection';

export const metadata = pageMetadata(
    'UAV PAS | Nền tảng Phần mềm Điều phối & Kết nối Dịch vụ UAV',
    'Nền tảng phần mềm kết nối dịch vụ UAV, lập kế hoạch bay GIS, giám sát telemetry trực tuyến và bàn giao dữ liệu bảo mật.',
    '/',
    true,
);

/**
 * Public home landing composition for UAV PAS (visual editorial & product imagery layout).
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
