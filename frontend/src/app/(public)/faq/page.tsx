import {keepVietnamesePhrases} from "@/lib/typography";
import {pageMetadata} from "@/features/marketing/content/metadata";
import {CustomerCta, PublicPage} from "@/features/marketing/components/public-page";

export const metadata = pageMetadata("Câu hỏi thường gặp", "Giải đáp về yêu cầu dịch vụ UAV PAS, giá, quy trình xem xét và tính năng AI dự kiến.", "/faq", true);

const faqs = [
    ['UAV PAS dành cho ai?', 'Khách hàng có nhu cầu dịch vụ UAV và đội vận hành điều phối công việc nhiệm vụ.'],
    ['Tôi có thể xem giá tại đây không?', 'Chưa. Bảng giá chỉ được công bố sau khi mô hình thương mại được phê duyệt.'],
    ['Khi nào nhiệm vụ được xác nhận?', 'Sau khi đội vận hành xem xét yêu cầu và xác nhận bước tiếp theo phù hợp.'],
    ['Tính năng phát hiện bằng AI đã sử dụng được chưa?', 'Tính năng này đang ở trạng thái “Dự kiến”. Hiện chưa có cam kết về độ chính xác hay khả năng sử dụng thực tế.'],
    ['Tôi gửi yêu cầu ở đâu?', 'Đăng nhập tài khoản để gửi yêu cầu. Trang giới thiệu không sao chép mã xác thực hay dữ liệu phiên riêng tư.'],
];

export default function FaqPage() {
    return (
        <PublicPage
            eyebrow="Câu hỏi thường gặp"
            title="Giải đáp trước khi bắt đầu."
            intro="Thông tin dưới đây giải thích phạm vi sản phẩm hiện tại, không thay thế xác nhận của đội vận hành."
        >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {faqs.map(([q, a]) => (
                    <article className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-2" key={q}>
                        <h2 className="text-lg font-bold text-foreground">{keepVietnamesePhrases(q)}</h2>
                        <p className="text-sm leading-relaxed text-slate-600">{a}</p>
                    </article>
                ))}
            </div>
            <CustomerCta/>
        </PublicPage>
    );
}
