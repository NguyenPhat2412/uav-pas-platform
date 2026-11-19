import {keepVietnamesePhrases} from '@/lib/typography';
import {pageMetadata} from '@/content/marketing/metadata';
import {CustomerCta, PublicPage} from '@/components/marketing/PublicPage';

export const metadata = pageMetadata(
    'Câu hỏi thường gặp',
    'Giải đáp về mô hình điều phối dịch vụ bay UAV PAS, cách đặt dịch vụ theo dự án, theo dõi bay mô phỏng và đăng ký đối tác đội bay.',
    '/faq',
    true,
);

const faqs = [
    [
        'Khách hàng có tự chọn đội bay trên UAV PAS không?',
        'Không. Khách hàng chọn dịch vụ phù hợp và đăng ký cho dự án của mình. UAV PAS đứng giữa kiểm tra hồ sơ và điều phối đội bay đã xác minh phù hợp gần khu vực dự án.',
    ],
    [
        'Đơn giá và thanh toán trên nền tảng có thu tiền thật không?',
        'Không. Mọi đơn giá dịch vụ, tạm tính, ký quỹ và ví đối soát trên hệ thống đều ở chế độ minh hoạ phục vụ đồ án nghiên cứu và trình diễn quy trình.',
    ],
    [
        'Chuyến bay trên hệ thống là bay thật hay bay mô phỏng?',
        'Trọng tâm của UAV PAS là điều phối đơn hàng và mô phỏng chuyến bay trên bản đồ (đường quét lưới, tiến độ, pin, tín hiệu và lệnh an toàn Fail-safe), không điều khiển UAV bay ngoài thực địa.',
    ],
    [
        'Làm sao để đặt dịch vụ bay định kỳ cho cùng một dự án?',
        'Bạn tạo một Dự án, vẽ vùng bay một lần trên bản đồ rồi chọn chu kỳ thực hiện Một lần, Hàng tuần hoặc Hàng tháng. Hệ thống tự gom các đơn bay theo đúng dự án đó.',
    ],
    [
        'Tôi theo dõi tiến độ đơn bay như thế nào?',
        'Mỗi đơn hàng có thanh 5 mốc trạng thái (Chờ xác nhận → Chờ bay → Đang bay → Bàn giao → Đánh giá) và bản đồ theo dõi chuyến bay mô phỏng hiển thị lộ trình dự kiến, đường đã bay và vị trí UAV.',
    ],
    [
        'Tôi có thể huỷ đơn bay trước khi cất cánh không?',
        'Có. Bạn có thể huỷ đơn trực tiếp trên Cổng Khách hàng khi đơn chưa bước sang trạng thái đang bay mô phỏng.',
    ],
    [
        'Chủ đội bay muốn nhận đơn từ UAV PAS cần làm gì?',
        'Đăng ký hồ sơ Đối tác đội bay, khai báo danh sách thiết bị UAV, kỹ sư điều khiển và tạo gói dịch vụ. Sau khi quản trị viên xác minh hồ sơ, đội bay sẽ nhận được đơn điều phối từ nền tảng.',
    ],
    [
        'Dữ liệu bàn giao sau chuyến bay được xem ở đâu?',
        'Khi đội bay hoàn tất bàn giao, khách hàng xem tệp kết quả ngay trong chi tiết đơn hàng, xác nhận nghiệm thu và gửi đánh giá sao.',
    ],
] as const;

export default function FaqPage() {
    return (
        <PublicPage
            eyebrow="Câu hỏi thường gặp"
            title="Giải đáp nhanh về mô hình UAV PAS."
            intro="Tổng hợp câu hỏi phổ biến về cách đặt dịch vụ theo dự án, điều phối đội bay đã xác minh, theo dõi bay mô phỏng và đăng ký đối tác."
        >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {faqs.map(([q, a]) => (
                    <article className="space-y-2 rounded-2xl border border-border bg-card p-5 shadow-2xs" key={q}>
                        <h2 className="m-0 text-base font-bold text-foreground">{keepVietnamesePhrases(q)}</h2>
                        <p className="m-0 text-sm leading-relaxed text-slate-600">{a}</p>
                    </article>
                ))}
            </div>
            <CustomerCta/>
        </PublicPage>
    );
}
