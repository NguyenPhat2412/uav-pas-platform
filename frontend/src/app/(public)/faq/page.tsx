import {keepVietnamesePhrases} from "@/lib/typography";
import {pageMetadata} from "@/features/marketing/content/metadata";
import {CustomerCta, PublicPage} from "@/features/marketing/components/public-page";

export const metadata = pageMetadata(
    "Câu hỏi thường gặp",
    "Giải đáp chi tiết về dịch vụ UAV PAS, bảng giá 3 gói thuê bao Basic/Pro/Enterprise, thanh toán VietQR, lập kế hoạch bay GIS và công nghệ Edge AI / SAR.",
    "/faq",
    true
);

const faqs = [
    [
        'Nền tảng UAV PAS dành cho những đối tượng nào?',
        'UAV PAS phục vụ doanh nghiệp, khu công nghiệp, nông trường, đơn vị khảo sát trắc địa, công trường xây dựng và đội ứng phó khẩn cấp cần đặt dịch vụ bay UAV chuyên nghiệp; đồng thời cung cấp cổng điều hành chuyên biệt cho đội ngũ phi công, kỹ thuật viên bảo dưỡng và quản trị viên.',
    ],
    [
        'Chi phí và các gói thuê bao trên UAV PAS được tính như thế nào?',
        'Hệ thống cung cấp 3 gói thuê bao minh bạch theo chu kỳ 30 ngày: Gói Cơ bản (Basic - 5.000.000đ / 10 nhiệm vụ), Gói Chuyên nghiệp (Pro - 15.000.000đ / 50 nhiệm vụ, hỗ trợ cảm biến nhiệt & RTK) và Gói Doanh nghiệp (Enterprise - 45.000.000đ / Không giới hạn nhiệm vụ, hỗ trợ buồng lái SAR IAMSAR, Edge AI Kria KV260 và Webhook API).',
    ],
    [
        'Tôi thanh toán và kích hoạt gói dịch vụ bằng cách nào?',
        'Sau khi đăng nhập cổng khách hàng và chọn gói phù hợp, hệ thống tự động tạo hóa đơn kèm mã QR chuyển khoản chuẩn EMVCo VietQR (tự động điền số tiền và mã tham chiếu hóa đơn). Ngay sau khi thanh toán được xác nhận, hạn mức nhiệm vụ sẽ được cấp tự động.',
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
        'Buồng lái Tìm kiếm Cứu nạn (SAR) và Edge AI Kria KV260 hoạt động ra sao?',
        'Trong cổng vận hành (Operations Portal), phi công và chỉ huy hiện trường có thể sử dụng Buồng lái SAR chuẩn IAMSAR để sinh đường bay tìm kiếm tự động, kết hợp luồng suy luận AI tại biên trên vi mạch FPGA Xilinx Kria KV260 giúp phát hiện người/phương tiện và dị thường nhiệt theo thời gian thực.',
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
