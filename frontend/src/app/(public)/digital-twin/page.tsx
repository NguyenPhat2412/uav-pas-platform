import {pageMetadata} from '@/content/marketing/metadata';
import {DigitalTwinShowcase} from '@/components/digital-twin/DigitalTwinShowcase';

export const metadata = pageMetadata(
    'Digital Twin – Mô hình 3D từ dữ liệu UAV',
    'Xem mô hình số 3D của khu VJU UAV Hub: xoay, phóng to, đổi góc nhìn và theo dõi UAV tuần tra, khảo sát theo thời gian thực.',
    '/digital-twin',
);

export default function DigitalTwinPage() {
    return <DigitalTwinShowcase/>;
}
