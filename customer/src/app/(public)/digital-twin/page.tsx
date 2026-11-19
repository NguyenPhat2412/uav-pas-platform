import {pageMetadata} from '@/content/marketing/metadata';
import {FlightSimulationPageView} from '@/components/marketing/FlightSimulationPageView';

export const metadata = pageMetadata(
    'Mô phỏng bay UAV — Lộ trình quét lưới & Fail-safe',
    'Trải nghiệm mô phỏng chuyến bay UAV trên bản đồ: sinh đường bay quét lưới, điều khiển lệnh an toàn Fail-safe và theo dõi chỉ số pin, tín hiệu liên kết.',
    '/digital-twin',
);

export default function FlightSimulationPage() {
    return <FlightSimulationPageView/>;
}
