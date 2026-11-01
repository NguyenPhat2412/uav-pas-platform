import {pageMetadata} from '@/content/marketing/metadata';
import {DigitalTwinShowcase} from '@/components/digital-twin/DigitalTwinShowcase';

export const metadata = pageMetadata(
    'Digital Twin – Mô hình 3D từ dữ liệu UAV',
    'Xem mô hình số 3D mẫu (dựng tự động để minh hoạ): xoay, phóng to, đổi góc nhìn và xem UAV mô phỏng tuần tra, khảo sát.',
    '/digital-twin',
);

export default function DigitalTwinPage() {
    return <DigitalTwinShowcase/>;
}
