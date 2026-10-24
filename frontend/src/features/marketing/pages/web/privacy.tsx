import {pageMetadata} from "@/features/marketing/content/metadata";
import {PublicPage} from "@/features/marketing/components/public-page";

export const metadata = pageMetadata("Trạng thái công bố chính sách quyền riêng tư", "Chính sách quyền riêng tư đang chờ phê duyệt để công bố. Tìm hiểu phạm vi hiện tại của trang giới thiệu.", "/privacy", false);

export default function PrivacyPage() {
    return <PublicPage eyebrow="Quyền riêng tư" title="Chính sách quyền riêng tư đang chờ duyệt công bố."
                       intro="Trang này thông báo tình trạng hiện tại trong thời gian chờ chính sách quyền riêng tư được phê duyệt.">
        <div className="page-copy"><p>Trang giới thiệu không yêu cầu thông tin chi tiết nhiệm vụ, lưu thông tin đăng
            nhập của khách hàng hay sao chép mã xác thực từ phiên đăng nhập. Việc xử lý tài khoản và nhiệm vụ được thực
            hiện trong hệ thống quản lý nhiệm vụ.</p><p>Nội dung cần được duyệt công bố trước khi được xem là chính sách
            pháp lý đầy đủ.</p></div>
    </PublicPage>
}
