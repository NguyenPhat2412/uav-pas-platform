import type {Metadata} from 'next';
import {NotFoundView} from '@/components/shared/NotFoundView';

export const metadata: Metadata = {title: 'Không tìm thấy trang · UAV PAS Admin'};

/** Root 404 for the Admin portal (:3300), keeping every recovery destination inside Admin or resolved cross-portal. */
export default function AdminRootNotFound() {
    return <NotFoundView
        fullScreen
        title="Không tìm thấy trang quản trị"
        detail="Đường dẫn quản trị có thể đã đổi hoặc không tồn tại trên cổng Quản trị. Kiểm tra lại địa chỉ hoặc quay về bảng điều khiển."
        homeHref="/admin/dashboard"
        homeLabel="Về trang quản trị"
        backLabel="Quay lại"
        portalHomes={[
            {prefix: '/admin', href: '/admin/dashboard', label: 'Về trang quản trị'},
            {prefix: '/operations', href: '/operations/overview', label: 'Về cổng điều hành'},
            {prefix: '/customer', href: '/customer/dashboard', label: 'Về trang khách hàng'},
        ]}
        linksLabel="Khu vực quản trị chính"
        links={[
            {href: '/admin/dashboard', label: 'Bảng điều khiển'},
            {href: '/admin/missions', label: 'Quản lý nhiệm vụ'},
            {href: '/admin/users', label: 'Người dùng & Vai trò'},
            {href: '/admin/uavs', label: 'Đội tàu bay UAV'},
            {href: '/admin/support', label: 'Hộp thư hỗ trợ'},
        ]}
    />;
}
