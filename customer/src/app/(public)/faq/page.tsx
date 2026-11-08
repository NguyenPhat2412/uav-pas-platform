import {keepVietnamesePhrases} from "@/lib/typography";
import {pageMetadata} from "@/content/marketing/metadata";
import {CustomerCta, PublicPage} from "@/components/marketing/PublicPage";

export const metadata = pageMetadata(
    "Câu hỏi thường gặp",
    "Giải đáp chi tiết về dịch vụ UAV PAS, bảng giá 3 gói thuê bao Basic/Pro/Enterprise, thanh toán VietQR, lập kế hoạch bay GIS và công nghệ Edge AI / SAR.",
    "/faq",
    true
);

const faqs = [
    [
        'Nền tảng UAV PAS dành cho những đối tượng nào?',
        'UAV PAS phục vụ doanh nghiệp khảo sát địa hình, ban quản lý dự án hạ tầng, đơn vị kiểm tra kỹ thuật và đội ứng phó hiện trường. Nền tảng kết nối ba phân hệ: Khách hàng gửi yêu cầu bay, Trung tâm Điều hành phân bổ nguồn lực và Quản trị viên giám sát vận hành.',
    ],
    [
        'Chi phí và các gói thuê bao trên UAV PAS được tính như thế nào?',
        'Nền tảng cung cấp 3 gói thuê bao theo chu kỳ 30 ngày: Gói Tiêu chuẩn (Basic - 5.000.000đ / 20 giờ bay), Gói Pro (15.000.000đ / 80 giờ bay) và Gói Enterprise (45.000.000đ / 300 giờ bay, hỗ trợ buồng lái SAR IAMSAR, mô-đun AI thử nghiệm và Webhook API).',
    ],
    [
        'Tôi thanh toán và kích hoạt gói dịch vụ bằng cách nào?',
        'Khi chọn gói cước trong Cổng Khách hàng, hệ thống tự động sinh phiếu thanh toán kèm mã VietQR định danh. Sau khi chuyển khoản và ghi nhận mã tham chiếu, hạn mức giờ bay và quyền truy cập tính năng sẽ được kích hoạt ngay trên tài khoản.',
    ],
    [
        'Tôi có thể tự vẽ vùng bay và thiết lập thông số kỹ thuật trước khi gửi yêu cầu không?',
        'Có. Trình lập kế hoạch bay GIS (GIS Flight Planner) trong cổng khách hàng cho phép bạn vẽ đa giác vùng khảo sát, chọn mẫu đường bay (Grid, Crosshatch, Perimeter, Waypoint, Corridor), thiết lập độ cao (10–500m), độ phủ ảnh (Overlap/Sidelap), góc gimbal và hệ thống tự động tính diện tích, quãng đường bay và số pin dự kiến.',
    ],
    [
        'Khi nào một nhiệm vụ bay được xác nhận và thực thi?',
        'Mỗi yêu cầu đi qua vòng đời 7 trạng thái minh bạch: Bản nháp (DRAFT) → Đã gửi yêu cầu (REQUESTED) → Đang thẩm định an toàn vùng trời & thời tiết (UNDER_REVIEW) → Đã phê duyệt & gán phi công/UAV (APPROVED) → Đang bay thực địa (IN_PROGRESS) → Hoàn thành & bàn giao tệp qua Signed-URL (COMPLETED).',
    ],
    [
        'Buồng lái Tìm kiếm Cứu nạn (SAR) và mô-đun AI thử nghiệm hoạt động ra sao?',
        'Trong cổng vận hành (Operations Portal), phi công và chỉ huy hiện trường có thể sử dụng Buồng lái SAR chuẩn IAMSAR để sinh đường bay tìm kiếm tự động và giám sát telemetry trực tuyến. Mô-đun AI (YOLOv8s trên bo mạch Kria KV260 đặt tại mặt đất) đang ở mức thử nghiệm và chưa vận hành trên UAV thật.',
    ],
    [
        'Dữ liệu ảnh, video và bản đồ sau chuyến bay được bàn giao như thế nào?',
        'Toàn bộ ảnh gốc, video 4K/Thermal, bình đồ trực giao (GeoTIFF), mô hình 3D và nhật ký Telemetry được tải lên kho lưu trữ đám mây và cấp quyền tải xuống qua liên kết bảo mật có chữ ký số (Signed-URL) ngay trong chi tiết nhiệm vụ của khách hàng.',
    ],
    [
        'Thiết bị UAV có được kiểm tra an toàn trước khi bay không?',
        'Bắt buộc. Hệ thống tích hợp phân hệ Quản lý bảo dưỡng (Maintenance) theo dõi chu kỳ sạc/xả từng viên pin, tình trạng động cơ/cảm biến và yêu cầu phi công hoàn tất kiểm tra an toàn tiền chuyến bay (Pre-flight Checklist) trước khi cất cánh.',
    ],
];

export default function FaqPage() {
    return (
        <PublicPage
            eyebrow="Câu hỏi thường gặp"
            title="Giải đáp chi tiết trước khi triển khai nhiệm vụ."
            intro="Tổng hợp các câu hỏi phổ biến về quy trình đặt nhiệm vụ UAV, bảng giá thuê bao, thông số kỹ thuật GIS, giám sát Telemetry và bàn giao dữ liệu."
        >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {faqs.map(([q, a]) => (
                    <article className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-2.5" key={q}>
                        <h2 className="text-lg font-bold text-foreground">{keepVietnamesePhrases(q)}</h2>
                        <p className="text-sm leading-relaxed text-slate-600">{a}</p>
                    </article>
                ))}
            </div>
            <CustomerCta/>
        </PublicPage>
    );
}
