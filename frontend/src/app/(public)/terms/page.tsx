import {pageMetadata} from "@/features/marketing/content/metadata";
import {PublicPage} from "@/features/marketing/components/public-page";

export const metadata = pageMetadata("Trạng thái công bố điều khoản", "Điều khoản đang chờ phê duyệt để công bố. Thông tin giới thiệu không xác nhận đặt dịch vụ hay quyền thực hiện nhiệm vụ.", "/terms", false);

export default function TermsPage() {
    return (
        <PublicPage
            eyebrow="Điều khoản"
            title="Điều khoản đang chờ duyệt công bố."
            intro="Trang này thông báo tình trạng hiện tại trong thời gian chờ điều khoản được phê duyệt."
        >
            <div className="max-w-3xl space-y-4 text-slate-600">
                <p className="text-base leading-relaxed">
                    Các trang giới thiệu chỉ mô tả tính năng và mức độ sẵn sàng. Nội dung không xác nhận đặt dịch vụ, báo giá, cam kết ứng phó khẩn cấp hay quyền thực hiện nhiệm vụ.
                </p>
                <p className="text-base leading-relaxed">
                    Nội dung cần được duyệt công bố trước khi được xem là điều khoản pháp lý đầy đủ.
                </p>
            </div>
        </PublicPage>
    );
}
