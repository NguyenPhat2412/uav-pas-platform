import {pageMetadata} from '@/content/marketing/metadata';
import {ServicesPageView} from '@/components/marketing/ServicesPageView';

export const metadata = pageMetadata(
    'Sàn Dịch vụ & Thiết bị UAV',
    'Danh mục dịch vụ UAV từ các đơn vị vận hành độc lập đã thẩm định hồ sơ trên nền tảng UAV PAS.',
    '/services',
    true,
);

export default function ServicesPage() {
    return <ServicesPageView />;
}
