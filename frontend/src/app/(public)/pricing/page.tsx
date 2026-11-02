import {keepVietnamesePhrases} from "@/lib/typography";
import {pageMetadata} from "@/content/marketing/metadata";
import {CustomerCta, PublicPage} from "@/components/marketing/PublicPage";
import {pricingComparisonRows} from "@/content/marketing/home-content";
import {PlanCards} from "@/components/marketing/PlanCards";

export const metadata = pageMetadata(
    "Bảng giá & Gói dịch vụ UAV",
    "Bảng giá minh hoạ trong bản demo UAV PAS (Basic, Pro, Enterprise): mô phỏng hạn mức giờ bay, số UAV đồng thời và luồng thanh toán. Không thu phí thật.",
    "/pricing",
    true
);

const paymentSteps = [
    {
        step: '01',
        title: 'Chọn gói cước trên Cổng Khách hàng',
        detail: 'Đăng nhập Cổng Khách hàng → mục Gói cước, chọn một gói minh hoạ (Basic, Pro hoặc Enterprise) để xem luồng cấp hạn mức giờ bay.',
    },
    {
        step: '02',
        title: 'Phiếu thanh toán mẫu & mã VietQR minh hoạ',
        detail: 'Hệ thống sinh phiếu thanh toán mẫu kèm mã QR theo định dạng VietQR (có kiểm tra CRC-16) để minh hoạ kỹ thuật. Không chuyển tiền thật.',
    },
    {
        step: '03',
        title: 'Xác nhận thanh toán & Kích hoạt hạn mức tức thì',
        detail: 'Sau khi chuyển khoản và nhập mã tham chiếu ngân hàng, bộ phận Quản trị xác nhận thanh toán và hệ thống tự động nâng hạn mức giờ bay, số UAV đồng thời cùng quyền sử dụng AI/SAR.',
    },
];

export default function PricingPage() {
    return (
        <PublicPage
            eyebrow="Bảng giá minh hoạ · Bản demo"
            title="Minh bạch chi phí theo hạn mức giờ bay và năng lực công nghệ."
            intro="Đây là bảng giá minh hoạ để demo luồng gói cước, hạn mức giờ bay và thanh toán VietQR trong đồ án. UAV PAS không phải dịch vụ thương mại: không nhận đặt bay thật và không thu tiền."
            scene="landing"
        >
            <div className="space-y-14">
                {/* 3 PRICING CARDS */}
                <section aria-labelledby="pricing-tiers-heading" className="space-y-6">
                    <h2 id="pricing-tiers-heading" className="text-2xl font-black tracking-tight text-foreground">
                        {keepVietnamesePhrases('Các gói cước thuê bao theo tháng')}
                    </h2>
                    <PlanCards detailed/>
                </section>

                {/* COMPARISON TABLE */}
                <section aria-labelledby="pricing-comparison-heading" className="space-y-4">
                    <h2 id="pricing-comparison-heading" className="text-2xl font-black tracking-tight text-foreground">
                        {keepVietnamesePhrases('Bảng so sánh thông số & quyền lợi chi tiết')}
                    </h2>
                    <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-xs">
                        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                            <thead className="border-b border-border bg-slate-50 text-xs font-extrabold uppercase tracking-wider text-slate-600">
                                <tr>
                                    <th className="px-5 py-4">Hạng mục tính năng & Hạn mức</th>
                                    <th className="px-5 py-4">Basic (5.000.000 ₫)</th>
                                    <th className="bg-uav-red-light/40 px-5 py-4 text-primary">Pro (15.000.000 ₫)</th>
                                    <th className="px-5 py-4">Enterprise (45.000.000 ₫)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border text-xs sm:text-sm">
                                {pricingComparisonRows.map((row) => (
                                    <tr key={row.feature} className="hover:bg-slate-50/70">
                                        <th scope="row" className="px-5 py-3.5 font-semibold text-foreground">{row.feature}</th>
                                        <td className="px-5 py-3.5 text-slate-600">{row.basic}</td>
                                        <td className="bg-uav-red-light/20 px-5 py-3.5 font-semibold text-slate-900">{row.pro}</td>
                                        <td className="px-5 py-3.5 font-semibold text-uav-blue">{row.enterprise}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* VIETQR PAYMENT WORKFLOW */}
                <section aria-labelledby="pricing-payment-heading" className="space-y-5">
                    <div className="max-w-3xl space-y-2">
                        <h2 id="pricing-payment-heading" className="text-2xl font-black tracking-tight text-foreground">
                            {keepVietnamesePhrases('Quy trình đăng ký gói cước & thanh toán VietQR tự động')}
                        </h2>
                        <p className="text-sm leading-relaxed text-slate-600">
                            Luồng nâng cấp gói cước được mô phỏng trong Cổng Khách hàng để minh hoạ cách sinh mã VietQR và đối soát; bản demo không kết nối ngân hàng và không thu tiền.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {paymentSteps.map((item) => (
                            <article key={item.step} className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-2.5">
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-uav-red-light font-mono text-xs font-extrabold text-primary">
                                    {item.step}
                                </span>
                                <h3 className="text-base font-bold text-foreground">{item.title}</h3>
                                <p className="text-xs leading-relaxed text-slate-600">{item.detail}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <CustomerCta/>
            </div>
        </PublicPage>
    );
}
