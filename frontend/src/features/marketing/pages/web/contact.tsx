import {pageMetadata} from "@/features/marketing/content/metadata";
import {CustomerCta, PublicPage} from "@/features/marketing/components/public-page";

export const metadata = pageMetadata("Liên hệ và yêu cầu dịch vụ", "Gửi yêu cầu qua tài khoản của bạn. Trang giới thiệu chưa thiết lập kênh tiếp nhận liên hệ.", "/contact", true);

export default function ContactPage() {
    return <PublicPage eyebrow="Liên hệ" title="Bắt đầu từ thông tin nhiệm vụ bạn đã có."
                       intro="Trang này chưa thiết lập địa chỉ liên hệ công khai đã xác minh hoặc kênh tiếp nhận liên hệ." scene="field">
        <div className="page-copy"><p>Để gửi yêu cầu dịch vụ, hãy đăng nhập và tạo yêu cầu theo quy trình hiện có. Bạn
            có thể tìm hiểu thông tin sản phẩm trên các trang giới thiệu và mục câu hỏi thường gặp.</p><CustomerCta/>
        </div>
    </PublicPage>
}
