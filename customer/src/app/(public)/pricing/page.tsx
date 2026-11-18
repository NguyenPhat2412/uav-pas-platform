import {pageMetadata} from '@/content/marketing/metadata';
import {PricingPageView} from '@/components/marketing/PricingPageView';

export const metadata = pageMetadata(
    'Bảng giá & Gói phần mềm UAV PAS',
    'Bảng giá các gói thuê bao phần mềm UAV PAS (Basic, Pro, Enterprise): quản lý nhiệm vụ, hồ sơ thiết bị và kích hoạt nhanh qua VietQR.',
    '/pricing',
    true,
);

export default function PricingPage() {
    return <PricingPageView />;
}
