import {NotFoundView} from '@/components/shared/NotFoundView';

export default function NotFound() {
    return <NotFoundView
        title="Không tìm thấy trang này"
        detail="Trang có thể đã được đổi tên hoặc gỡ bỏ. Quay về trang chủ hoặc xem các dịch vụ UAV PAS đang hỗ trợ."
        homeHref="/"
        homeLabel="Về trang chủ"
        backLabel="Quay lại"
        linksLabel="Có thể bạn đang tìm"
        links={[
            {href: '/services', label: 'Dịch vụ'},
            {href: '/solutions', label: 'Giải pháp'},
            {href: '/pricing', label: 'Bảng giá'},
            {href: '/faq', label: 'Câu hỏi thường gặp'},
            {href: '/contact', label: 'Liên hệ'},
        ]}
    />;
}
