import Image from 'next/image';
import Link from 'next/link';
import {keepVietnamesePhrases} from "@/lib/typography";
import {pageMetadata} from "@/features/marketing/content/metadata";
import {scenes} from "@/features/marketing/components/uav-photo";
import {ContactQuickForm} from "@/features/marketing/components/contact-quick-form";

export const metadata = pageMetadata(
    "Liên hệ & Hỗ trợ điều phối UAV",
    "Kết nối với Trung tâm Điều phối UAV PAS (Trường Đại học Việt Nhật – ĐHQGHN): tư vấn dịch vụ khảo sát GIS, gói cước doanh nghiệp, hỗ trợ kỹ thuật bay và hợp tác R&D Edge AI.",
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
            <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
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
                                Liên hệ & Điều phối 24/7
                            </p>
                            <h1 className="text-2xl font-black tracking-tight text-white sm:text-4xl leading-tight">
                                {keepVietnamesePhrases('Kết nối trực tiếp với Trung tâm Chỉ huy UAV PAS.')}
                            </h1>

                            <div className="space-y-4 border-t border-white/15 pt-5 text-xs">
                                <div>
                                    <p className="font-bold text-rose-300">Trạm Thực nghiệm Hòa Lạc (ĐHQGHN)</p>
                                    <p className="mt-0.5 text-slate-300">Khu Công nghệ cao Hòa Lạc, Thạch Thất, Hà Nội</p>
                                </div>
                                <div>
                                    <p className="font-bold text-rose-300">Văn phòng Mỹ Đình (VJU)</p>
                                    <p className="mt-0.5 text-slate-300">Đường Lưu Hữu Phước, Nam Từ Liêm, Hà Nội</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    <div className="rounded-xl bg-white/10 p-3">
                                        <span className="block text-[10px] uppercase text-slate-400">Email hỗ trợ</span>
                                        <strong className="mt-0.5 block text-white">uav-pas@vju.ac.vn</strong>
                                    </div>
                                    <div className="rounded-xl bg-white/10 p-3">
                                        <span className="block text-[10px] uppercase text-slate-400">Trực điều phối</span>
                                        <strong className="mt-0.5 block text-white">08:00 – 17:30 (T2–T7)</strong>
                                    </div>
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
                                Nhận tư vấn thông số bay & báo giá gói cước
                            </h2>
                            <p className="text-xs text-slate-500">
                                Điền ngắn gọn nhu cầu của bạn hoặc đăng nhập để vẽ trực tiếp vùng bay trên bản đồ GIS.
                            </p>
                        </div>

                        <ContactQuickForm/>
                    </div>
                </div>
            </div>
        </section>
    );
}
