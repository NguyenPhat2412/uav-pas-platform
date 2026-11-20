import {scenes} from '@/components/marketing/UavPhoto';
import {pageMetadata} from '@/content/marketing/metadata';
import {ServicesPageView} from '@/components/marketing/ServicesPageView';

export const metadata = pageMetadata(
    'Sàn Dịch vụ & Thiết bị UAV',
    'Danh mục dịch vụ UAV từ các Đối tác đã xác minh trên nền tảng UAV PAS với đơn giá minh hoạ rõ ràng.',
    '/services',
    true,
    scenes.rentalFleet.src,
);

export default function ServicesPage() {
    return <ServicesPageView />;
}
