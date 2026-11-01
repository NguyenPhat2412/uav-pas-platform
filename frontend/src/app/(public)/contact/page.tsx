import Image from 'next/image';
import Link from 'next/link';
import {keepVietnamesePhrases} from "@/lib/typography";
import {pageMetadata} from "@/content/marketing/metadata";
import {scenes} from "@/components/marketing/UavPhoto";
import {ContactQuickForm} from "@/components/marketing/ContactQuickForm";

export const metadata = pageMetadata(
    "Liên hệ & Hỗ trợ điều phối UAV",
    "Liên hệ về UAV PAS, đồ án cá nhân của Nguyễn Phát: góp ý, câu hỏi kỹ thuật hoặc yêu cầu xem demo. Đây không phải dịch vụ thương mại.",
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
                                Liên hệ · Bản demo
                            </p>
                            <h1 className="text-2xl font-black tracking-tight text-white sm:text-4xl leading-tight">
                                {keepVietnamesePhrases('Góp ý và câu hỏi về dự án UAV PAS.')}
                            </h1>

                            <div className="space-y-4 border-t border-white/15 pt-5 text-xs">
                                <div>
                                    <p className="font-bold text-rose-300">Đồ án cá nhân</p>
                                    <p className="mt-0.5 text-slate-300">UAV PAS do Nguyễn Phát thực hiện, không đại diện và không liên kết với bất kỳ trường học hay tổ chức nào.</p>
                                </div>
                                <div>
                                    <p className="font-bold text-rose-300">Không phải dịch vụ thương mại</p>
                                    <p className="mt-0.5 text-slate-300">Không nhận đặt bay thật, không báo giá và không thu phí. Biểu mẫu bên cạnh chỉ dùng để góp ý hoặc hẹn xem demo.</p>
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
                                Góp ý hoặc hẹn xem demo
                            </h2>
                            <p className="text-xs text-slate-500">
                                Để lại câu hỏi hoặc góp ý; bạn cũng có thể đăng nhập để thử vẽ vùng bay mẫu trên bản đồ GIS.
                            </p>
                        </div>

                        <ContactQuickForm/>
                    </div>
                </div>
            </div>
        </section>
    );
}
