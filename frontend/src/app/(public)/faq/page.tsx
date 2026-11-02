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
        'UAV PAS là đồ án cá nhân, không phục vụ khách hàng thật. Bản demo mô phỏng ba vai trò: người gửi yêu cầu bay (khách hàng), điều phối viên vận hành và quản trị viên, để minh hoạ một quy trình điều phối nhiệm vụ UAV hoàn chỉnh trên dữ liệu giả lập.',
    ],
    [
        'Chi phí và các gói thuê bao trên UAV PAS được tính như thế nào?',
        'Bản demo có 3 gói thuê bao minh hoạ theo chu kỳ 30 ngày (không thu phí thật): Gói Cơ bản (Basic - 5.000.000đ / 10 nhiệm vụ), Gói Pro (15.000.000đ / 50 nhiệm vụ) và Gói Enterprise (45.000.000đ / Không giới hạn nhiệm vụ, hỗ trợ buồng lái SAR IAMSAR, mô-đun AI thử nghiệm và Webhook API).',
    ],
    [
        'Tôi thanh toán và kích hoạt gói dịch vụ bằng cách nào?',
        'Trong bản demo, khi chọn gói hệ thống sinh một phiếu thanh toán mẫu kèm mã VietQR để minh hoạ luồng nghiệp vụ. Không có giao dịch thật; quản trị viên xác nhận thủ công để cấp hạn mức thử nghiệm.',
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
        'Trong cổng vận hành (Operations Portal), phi công và chỉ huy hiện trường có thể sử dụng Buồng lái SAR chuẩn IAMSAR để sinh đường bay tìm kiếm tự động, trên dữ liệu telemetry mô phỏng. Mô-đun AI (YOLOv8s trên bo mạch Kria KV260 đặt tại mặt đất) đang ở mức thử nghiệm và chưa vận hành trên UAV thật.',
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
