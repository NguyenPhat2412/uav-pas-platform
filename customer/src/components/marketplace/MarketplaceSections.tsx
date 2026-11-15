import Image from 'next/image';
import Link from 'next/link';
import {CheckCircle2, Lock, ShieldCheck} from 'lucide-react';
import {scenes} from '@/components/marketing/UavPhoto';

export function MarketplaceTrustBar() {
    return (
        <section className="border-b border-border bg-slate-50/85 py-10 sm:py-12" aria-label="Cơ chế bảo vệ giao dịch hai chiều">
            <div className="mx-auto w-full max-w-[1380px] space-y-5 px-5 sm:px-8 lg:px-12">
                <div className="text-center">
                    <span className="text-xs font-extrabold uppercase tracking-widest text-primary">
                        Cơ chế bảo vệ giao dịch hai chiều
                    </span>
                    <h2 className="m-0 mt-1 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                        An toàn pháp lý, minh bạch đơn giá và bảo toàn vốn ký quỹ 100%
                    </h2>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                        <div className="flex items-center gap-2.5">
                            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                <Lock size={18} aria-hidden="true"/>
                            </span>
                            <h3 className="m-0 text-sm font-extrabold text-slate-900">Bảo vệ Ký quỹ VietQR</h3>
                        </div>
                        <p className="m-0 mt-2.5 text-xs leading-relaxed text-slate-600">
                            Khoản thanh toán được tạm giữ an toàn trên hệ thống và chỉ giải ngân cho đối tác sau khi khách hàng nghiệm thu dữ liệu bàn giao.
                        </p>
                    </article>

                    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                        <div className="flex items-center gap-2.5">
                            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                <CheckCircle2 size={18} aria-hidden="true"/>
                            </span>
                            <h3 className="m-0 text-sm font-extrabold text-slate-900">Thẩm định Pháp nhân & Chứng chỉ Bay</h3>
                        </div>
                        <p className="m-0 mt-2.5 text-xs leading-relaxed text-slate-600">
                            100% đối tác đội bay 3P được kiểm duyệt hồ sơ KYC, giấy phép điều khiển UAV, bảo hiểm trách nhiệm và số serial tàu bay.
                        </p>
                    </article>

                    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                        <div className="flex items-center gap-2.5">
                            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-primary">
                                <ShieldCheck size={18} aria-hidden="true"/>
                            </span>
                            <h3 className="m-0 text-sm font-extrabold text-slate-900">Đơn giá Niêm yết & SLA Minh bạch</h3>
                        </div>
                        <p className="m-0 mt-2.5 text-xs leading-relaxed text-slate-600">
                            Niêm yết rõ theo hecta, giờ bay, ngày thuê hoặc trọn gói; bàn giao dữ liệu gốc GeoTIFF/LAS qua liên kết bảo mật Signed-URL.
                        </p>
                    </article>
                </div>
            </div>
        </section>
    );
}

export function MarketplaceDiptychCta() {
    const hardwarePhoto = scenes.edgePayload;
    return (
        <section className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm" aria-label="Hành động đặt dịch vụ hoặc đăng ký đối tác">
            <div className="grid grid-cols-1 lg:grid-cols-12">
                <div className="flex flex-col justify-between space-y-6 bg-slate-950 p-7 text-white sm:p-10 lg:col-span-6">
                    <div className="space-y-3">
                        <span className="inline-block rounded-full border border-rose-500/40 bg-rose-500/15 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-rose-300">
                            Dành cho Chủ đầu tư & Đơn vị Khảo sát
                        </span>
                        <h2 className="m-0 text-2xl font-black tracking-tight text-white sm:text-3xl">
                            Cần khảo sát thực địa hoặc mở thầu RFQ ngay hôm nay?
                        </h2>
                        <p className="m-0 text-xs leading-relaxed text-slate-300 sm:text-sm">
                            Đặt trực tiếp gói dịch vụ theo đơn giá niêm yết hoặc mở yêu cầu chào giá cạnh tranh (Open RFQ) để các đội bay UAV đã xác minh gửi phương án tối ưu.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        <Link
                            href="/customer/missions/create"
                            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-xs font-bold text-primary-foreground shadow-xs transition-colors hover:bg-primary-hover"
                        >
                            Tạo nhiệm vụ & Nhận báo giá →
                        </Link>
                        <Link
                            href="/customer/missions/create?rfq=1"
                            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-700 bg-slate-900 px-5 text-xs font-bold text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
                        >
                            Mở thầu Open RFQ
                        </Link>
                    </div>
                </div>

                <div className="flex flex-col justify-between space-y-6 bg-slate-50 p-7 sm:p-10 lg:col-span-6">
                    <div className="grid grid-cols-1 items-center gap-5 sm:grid-cols-12">
                        <div className="space-y-2.5 sm:col-span-7">
                            <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                                Dành cho Đối tác Đội bay 3P
                            </span>
                            <h2 className="m-0 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                                Đưa đội bay UAV & thiết bị của bạn lên sàn — nhận thanh toán bảo đảm qua VietQR Escrow.
                            </h2>
                            <p className="m-0 text-xs leading-relaxed text-slate-600">
                                Mở gian hàng miễn phí, chủ động niêm yết giá thuê theo hecta/ca bay và rút doanh thu ròng trực tiếp về tài khoản ngân hàng.
                            </p>
                        </div>
                        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 sm:col-span-5">
                            <Image
                                src={hardwarePhoto.src}
                                alt={hardwarePhoto.alt}
                                fill
                                sizes="(max-width: 768px) 100vw, 260px"
                                className="object-cover"
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-4">
                        <span className="text-xs font-semibold text-slate-500">
                            Xét duyệt KYC nhanh · Bảo vệ cọc thiết bị & phí dịch vụ
                        </span>
                        <Link
                            href="/customer/provider/onboarding"
                            className="inline-flex h-11 items-center justify-center rounded-control bg-slate-900 px-5 text-xs font-bold text-white transition-colors hover:bg-slate-800"
                        >
                            Đăng ký Đối tác KYC miễn phí →
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
