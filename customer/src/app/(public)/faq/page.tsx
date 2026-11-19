import {pageMetadata} from '@/content/marketing/metadata';
import {FaqPageView} from '@/components/marketing/FaqPageView';

export const metadata = pageMetadata(
    'Câu hỏi thường gặp',
    'Giải đáp về mô hình điều phối dịch vụ bay UAV PAS, cách đặt dịch vụ theo dự án, theo dõi bay mô phỏng và đăng ký đối tác đội bay.',
    '/faq',
    true,
);

export default function FaqPage() {
    return <FaqPageView/>;
}
