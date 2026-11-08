import type {Metadata} from 'next';
import {NotFoundView} from '@/components/shared/NotFoundView';

export const metadata: Metadata = {title: 'Không tìm thấy trang · UAV PAS'};

/** Any URL outside the public site and the portals. */
export default function RootNotFound() {
    return <NotFoundView
        fullScreen
        title="Không tìm thấy trang"
        detail="Đường dẫn có thể đã bị đổi, bị gỡ hoặc chưa từng tồn tại. Kiểm tra lại địa chỉ, hoặc quay về trang chủ."
        homeHref="/"
        homeLabel="Về trang chủ"
        backLabel="Quay lại"
        portalHomes={[
            {prefix: '/admin', href: '/admin/dashboard', label: 'Về trang quản trị'},
            {prefix: '/operations', href: '/operations/overview', label: 'Về cổng điều hành'},
            {prefix: '/customer', href: '/customer/dashboard', label: 'Về trang tổng quan'},
        ]}
        linksLabel="Có thể bạn đang tìm"
        links={[
            {href: '/services', label: 'Dịch vụ'},
            {href: '/pricing', label: 'Bảng giá'},
            {href: '/how-it-works', label: 'Quy trình thực hiện'},
            {href: '/faq', label: 'Câu hỏi thường gặp'},
            {href: '/contact', label: 'Liên hệ'},
        ]}
    />;
}
