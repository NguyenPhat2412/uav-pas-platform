import type {Metadata} from 'next';
import {NotFoundView} from '@/components/shared/NotFoundView';

export const metadata: Metadata = {title: 'Không tìm thấy trang · UAV PAS Operations'};

/** Root 404 for the Operations portal (:3200), keeping every recovery destination inside Operations or resolved cross-portal. */
export default function OperationsRootNotFound() {
    return <NotFoundView
        fullScreen
        title="Không tìm thấy trang điều hành"
        detail="Đường dẫn tác nghiệp có thể đã đổi hoặc không tồn tại trên cổng Điều hành. Kiểm tra lại địa chỉ hoặc quay về trung tâm điều phối."
        homeHref="/operations/overview"
        homeLabel="Về cổng điều hành"
        backLabel="Quay lại"
        portalHomes={[
            {prefix: '/admin', href: '/admin/dashboard', label: 'Về trang quản trị'},
            {prefix: '/operations', href: '/operations/overview', label: 'Về cổng điều hành'},
            {prefix: '/customer', href: '/customer/dashboard', label: 'Về trang khách hàng'},
        ]}
        linksLabel="Khu vực tác nghiệp chính"
        links={[
            {href: '/operations/overview', label: 'Tổng quan điều hành'},
            {href: '/operations/dispatch/missions', label: 'Điều phối nhiệm vụ'},
            {href: '/operations/sar-cockpit', label: 'Cứu hộ SAR AI'},
            {href: '/operations/uavs', label: 'Đội tàu bay UAV'},
            {href: '/operations/weather', label: 'Khí tượng bay'},
        ]}
    />;
}
