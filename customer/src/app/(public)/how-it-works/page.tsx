import {pageMetadata} from '@/content/marketing/metadata';
import {HowItWorksPageView} from '@/components/marketing/HowItWorksPageView';

export const metadata = pageMetadata(
    'Cách hoạt động — Quy trình 4 bước UAV PAS',
    'Quy trình 4 bước đặt dịch vụ bay UAV: chọn dịch vụ, vẽ vùng bay và chọn lịch, UAV PAS điều phối đội bay đã xác minh, theo dõi chuyến bay mô phỏng và nhận kết quả.',
    '/how-it-works',
    true,
);

export default function HowItWorksPage() {
    return <HowItWorksPageView/>;
}
