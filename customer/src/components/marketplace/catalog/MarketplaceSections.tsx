import Image from 'next/image';
import Link from 'next/link';
import {ArrowUpRight, CheckCircle2, Lock, ShieldCheck} from 'lucide-react';
import {scenes} from '@/components/marketing/UavPhoto';

export function MarketplaceTrustBar() {
    return (
        <section className="border-b border-border bg-slate-50/85 py-10 sm:py-12" aria-label="Cơ chế bảo vệ giao dịch hai chiều">
            <div className="mx-auto w-full max-w-[1380px] space-y-5 px-5 sm:px-8 lg:px-12">
                <div className="text-center">
                    <span className="text-xs font-semibold tracking-wide text-primary">
                        Cơ chế bảo vệ giao dịch hai chiều
                    </span>
                    <h2 className="m-0 mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                        An toàn pháp lý, minh bạch đơn giá và bảo toàn vốn ký quỹ
                    </h2>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <article className="uav-bezel">
                        <div className="uav-bezel-core h-full p-5">
                            <div className="flex items-center gap-2.5">
                                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-slate-900 text-white">
                                    <Lock size={17} aria-hidden="true"/>
                                </span>
                                <h3 className="m-0 text-sm font-semibold text-on-surface">Bảo vệ Ký quỹ VietQR</h3>
                            </div>
                            <p className="m-0 mt-2.5 text-xs leading-relaxed text-muted">
                                Khoản thanh toán được tạm giữ an toàn trên hệ thống và chỉ giải ngân cho đối tác sau khi khách hàng nghiệm thu dữ liệu bàn giao.
                            </p>
                        </div>
                    </article>

                    <article className="uav-bezel">
                        <div className="uav-bezel-core h-full p-5">
                            <div className="flex items-center gap-2.5">
                                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-slate-900 text-white">
                                    <CheckCircle2 size={17} aria-hidden="true"/>
                                </span>
                                <h3 className="m-0 text-sm font-semibold text-on-surface">Thẩm định Pháp nhân & Chứng chỉ Bay</h3>
                            </div>
                            <p className="m-0 mt-2.5 text-xs leading-relaxed text-muted">
                                Đối tác đội bay 3P được kiểm duyệt hồ sơ KYC, giấy phép điều khiển UAV, bảo hiểm trách nhiệm và số serial tàu bay.
                            </p>
                        </div>
                    </article>

                    <article className="uav-bezel">
                        <div className="uav-bezel-core h-full p-5">
                            <div className="flex items-center gap-2.5">
                                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-rose-50 text-primary">
                                    <ShieldCheck size={17} aria-hidden="true"/>
                                </span>
                                <h3 className="m-0 text-sm font-semibold text-on-surface">Đơn giá Niêm yết & Tiến độ Minh bạch</h3>
                            </div>
                            <p className="m-0 mt-2.5 text-xs leading-relaxed text-muted">
                                Niêm yết rõ theo hecta, giờ bay, ngày thuê hoặc trọn gói; bàn giao dữ liệu gốc GeoTIFF/LAS qua liên kết bảo mật Signed-URL.
                            </p>
                        </div>
                    </article>
                </div>
            </div>
        </section>
    );
}

export function MarketplaceDiptychCta() {
    const hardwarePhoto = scenes.edgePayload;
    return (
        <section className="overflow-hidden rounded-panel border border-slate-200 shadow-sm" aria-label="Hành động đặt dịch vụ hoặc đăng ký đối tác">
            <div className="grid grid-cols-1 lg:grid-cols-12">
                <div className="flex flex-col justify-between space-y-6 bg-slate-950 p-7 text-white sm:p-10 lg:col-span-6">
                    <div className="space-y-3">
                        <span className="inline-block rounded-full border border-rose-500/40 bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-200">
                            Dành cho Chủ đầu tư & Đơn vị Khảo sát
                        </span>
                        <h2 className="m-0 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                            Cần khảo sát thực địa hoặc mở thầu RFQ ngay hôm nay?
                        </h2>
                        <p className="m-0 text-xs leading-relaxed text-slate-300 sm:text-sm">
                            Đặt trực tiếp gói dịch vụ theo đơn giá niêm yết hoặc mở yêu cầu chào giá cạnh tranh (Open RFQ) để các đội bay UAV đã xác minh gửi phương án tối ưu.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        <Link
                            href="/customer/missions/create"
                            className="group inline-flex min-h-11 items-center gap-2.5 rounded-full bg-primary py-2 pr-2.5 pl-5 text-xs font-semibold whitespace-nowrap text-primary-foreground shadow-xs transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-primary-hover active:scale-[0.985]"
                        >
                            <span>Tạo nhiệm vụ & Nhận báo giá</span>
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5">
                                <ArrowUpRight size={14} aria-hidden="true"/>
                            </span>
                        </Link>
                        <Link
                            href="/customer/missions/create?rfq=1"
                            className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-700 bg-slate-900 px-5 text-xs font-semibold whitespace-nowrap text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
                        >
                            Mở thầu Open RFQ
                        </Link>
                    </div>
                </div>

                <div className="flex flex-col justify-between space-y-6 bg-slate-50 p-7 sm:p-10 lg:col-span-6">
                    <div className="grid grid-cols-1 items-center gap-5 sm:grid-cols-12">
                        <div className="space-y-2.5 sm:col-span-7">
                            <span className="inline-block rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-800">
                                Dành cho Đối tác Đội bay 3P
                            </span>
                            <h2 className="m-0 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                                Đưa đội bay UAV & thiết bị của bạn lên sàn — nhận thanh toán bảo đảm qua VietQR Escrow.
                            </h2>
                            <p className="m-0 text-xs leading-relaxed text-slate-600">
                                Mở gian hàng miễn phí, chủ động niêm yết giá thuê theo hecta/ca bay và rút doanh thu ròng trực tiếp về tài khoản ngân hàng.
                            </p>
                        </div>
                        <div className="relative aspect-[4/3] overflow-hidden rounded-panel border border-slate-200 bg-slate-900 sm:col-span-5">
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
                        <span className="text-xs font-medium text-muted">
                            Xét duyệt KYC nhanh · Bảo vệ cọc thiết bị & phí dịch vụ
                        </span>
                        <Link
                            href="/customer/provider/onboarding"
                            className="inline-flex min-h-10 items-center justify-center rounded-control bg-slate-900 px-5 text-xs font-semibold whitespace-nowrap text-white transition-colors hover:bg-slate-800"
                        >
                            Đăng ký Đối tác KYC miễn phí →
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
