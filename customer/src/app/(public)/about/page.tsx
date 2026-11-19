import {pageMetadata} from '@/content/marketing/metadata';
import {AboutPageView} from '@/components/marketing/AboutPageView';

export const metadata = pageMetadata(
    'Giới thiệu UAV PAS',
    'UAV PAS là sản phẩm đồ án nghiên cứu và trình diễn kỹ thuật do Nguyễn Phát xây dựng: nền tảng điều phối dịch vụ bay UAV và mô phỏng chuyến bay.',
    '/about',
    true,
);

export default function AboutPage() {
    return <AboutPageView/>;
}
