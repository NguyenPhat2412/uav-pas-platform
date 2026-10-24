import {pageMetadata} from "@/features/marketing/content/metadata";
import {CustomerCta, PublicPage} from "@/features/marketing/components/public-page";

export const metadata = pageMetadata("Thông tin giá dịch vụ", "UAV PAS chưa công bố giá và gói dịch vụ. Tìm hiểu cách chuẩn bị yêu cầu dịch vụ.", "/pricing", true);

export default function PricingPage() {
    return <PublicPage eyebrow="Giá dịch vụ" title="Chưa công bố bảng giá."
                       intro="Thông tin thương mại sẽ được công bố sau khi mô hình giá được phê duyệt.">
        <div className="page-copy"><p>Trang này chưa đưa ra mức giá, giá gói, mức phí tối thiểu hay cam kết báo giá.
            Phạm vi nhiệm vụ, điều kiện vận hành và đầu ra cần được xem xét trước khi chuẩn bị thông tin thương mại.</p>
            <h2>Bạn có thể làm gì lúc này</h2><p>Tìm hiểu danh mục dịch vụ và đăng nhập tài khoản để gửi yêu cầu. Đội
                vận hành sẽ xem xét thông tin nhiệm vụ để xác nhận bước tiếp theo.</p><CustomerCta/></div>
    </PublicPage>
}
