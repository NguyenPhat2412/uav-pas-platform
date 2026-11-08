import Image from 'next/image';
import Link from 'next/link';
import {keepVietnamesePhrases} from "@/lib/typography";
import {pageMetadata} from "@/content/marketing/metadata";
import {scenes} from "@/components/marketing/UavPhoto";
import {ContactQuickForm} from "@/components/marketing/ContactQuickForm";

export const metadata = pageMetadata(
    "Liên hệ & Hỗ trợ điều phối UAV",
    "Liên hệ đội ngũ điều phối UAV PAS: tư vấn dịch vụ khảo sát GIS, gói cước vận hành đội bay, tích hợp kỹ thuật và cấp tài khoản nhân sự vận hành.",
    "/contact",
    true
);

// Operations and admin accounts are issued by an administrator, so only the customer portal is linked here.
const quickPortals = [
    {label: 'Cổng Khách hàng', href: '/customer/dashboard'},
];

export default function ContactPage() {
    return (
        <section className="py-10 sm:py-16">
            <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12">
                {/* 50/50 Split-Screen Command Desk Right Above the Fold */}
                <div className="grid grid-cols-1 overflow-hidden rounded-3xl border border-border bg-card shadow-lg lg:grid-cols-12">
                    {/* Left Visual Dark Panel (45%) */}
                    <div className="relative flex flex-col justify-between overflow-hidden bg-slate-950 p-8 text-white sm:p-10 lg:col-span-5">
                        <Image
                            src={scenes.fieldCommand.src}
                            alt={scenes.fieldCommand.alt}
                            fill
                            sizes="(max-width: 1024px) 100vw, 45vw"
                            className="object-cover opacity-25"
                            preload
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/90 to-slate-950"/>

                        <div className="relative z-10 space-y-6">
                            <p className="text-xs font-extrabold uppercase tracking-widest text-rose-400">
                                Liên hệ &amp; Hỗ trợ điều phối
                            </p>
                            <h1 className="text-2xl font-black tracking-tight text-white sm:text-4xl leading-tight">
                                {keepVietnamesePhrases('Tư vấn dịch vụ bay và hỗ trợ điều phối nhiệm vụ.')}
                            </h1>

                            <div className="space-y-4 border-t border-white/15 pt-5 text-xs">
                                <div>
                                    <p className="font-bold text-rose-300">Điều phối nhiệm vụ &amp; Gói cước</p>
                                    <p className="mt-0.5 text-slate-300">Tư vấn cấu hình cảm biến, độ phân giải GSD, hạn mức giờ bay và phương án triển khai phù hợp cho khu vực khảo sát của bạn.</p>
                                </div>
                                <div>
                                    <p className="font-bold text-rose-300">Cấp tài khoản vận hành nội bộ</p>
                                    <p className="mt-0.5 text-slate-300">Tài khoản khách hàng có thể tự đăng ký trực tuyến. Tài khoản Phi công và Điều phối viên do Quản trị hệ thống xét duyệt và cấp phát.</p>
                                </div>
                            </div>
                        </div>

                        <div className="relative z-10 mt-8 border-t border-white/15 pt-5 space-y-2.5">
                            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Mở nhanh cổng làm việc
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {quickPortals.map((p) => (
                                    <Link
                                        key={p.href}
                                        href={p.href}
                                        className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary transition-colors"
                                    >
                                        {p.label} →
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Instant Form Panel (55%) */}
                    <div className="flex flex-col justify-center bg-white p-8 sm:p-10 lg:col-span-7 space-y-6">
                        <div className="space-y-1.5">
                            <span className="text-xs font-extrabold uppercase tracking-widest text-primary">
                                Gửi yêu cầu nhanh
                            </span>
                            <h2 className="text-2xl font-black tracking-tight text-slate-900">
                                Gửi yêu cầu tư vấn &amp; điều phối
                            </h2>
                            <p className="text-xs text-slate-500">
                                Để lại nhu cầu khảo sát hoặc câu hỏi kỹ thuật; bạn cũng có thể đăng nhập Cổng Khách hàng để khởi tạo vùng bay trực tiếp trên bản đồ GIS.
                            </p>
                        </div>

                        <ContactQuickForm/>
                    </div>
                </div>
            </div>
        </section>
    );
}
