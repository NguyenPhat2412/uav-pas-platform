import Image from 'next/image';
import Link from 'next/link';
import {ShieldCheck, Sparkles} from 'lucide-react';
import {keepVietnamesePhrases} from '@/lib/typography';
import {scenes, serviceScenes} from '@/components/marketing/UavPhoto';
import {pageMetadata} from '@/content/marketing/metadata';
import {customerUrl, services} from '@/content/marketing/site-content';
import {serviceDetails} from '@/content/marketing/service-details';
import {PublicMarketplaceCatalog} from '@/components/marketplace/PublicMarketplaceCatalog';
import {MarketplaceDiptychCta, MarketplaceTrustBar} from '@/components/marketplace/MarketplaceSections';

export const metadata = pageMetadata(
    'Dịch vụ UAV',
    'Danh mục 4 nhóm dịch vụ UAV chuyên sâu trên UAV PAS: thuê UAV kèm phi công, khảo sát bản đồ GIS 2D/3D, quay chụp trên không 4K và thu thập dữ liệu hành lang.',
    '/services',
    true,
);

export default function ServicesPage() {
    const heroPhoto = scenes.inspectionGrid;

    return (
        <div className="bg-card text-foreground">
            {/* Section 1 of 6: Full-Bleed Aerial Hero with Bottom-Left Lead & Telemetry Second-Read Moment */}
            <section className="relative overflow-hidden border-b border-slate-800 bg-slate-950 text-white">
                <div className="absolute inset-0">
                    <Image
                        src={heroPhoto.src}
                        alt={heroPhoto.alt}
                        fill
                        sizes="100vw"
                        className="object-cover object-center opacity-55"
                        preload
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/30"/>
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/55 to-transparent"/>
                </div>

                <div className="relative mx-auto flex min-h-[420px] w-full max-w-[1380px] flex-col justify-end px-5 py-12 sm:min-h-[480px] sm:px-8 sm:py-16 lg:px-12">
                    <div className="grid grid-cols-1 items-end gap-8 lg:grid-cols-12">
                        <div className="space-y-4 lg:col-span-8">
                            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/35 bg-slate-900/80 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-emerald-300 backdrop-blur-xs">
                                <Sparkles size={13} aria-hidden="true"/>
                                Sàn Giao dịch Dịch vụ & Thiết bị UAV • Chuẩn KYC & VietQR Escrow
                            </span>
                            <h1 className="m-0 text-3xl font-black tracking-tight text-white sm:text-5xl">
                                {keepVietnamesePhrases('Chọn dịch vụ bay & đội tàu UAV theo mục tiêu thực địa.')}
                            </h1>
                            <p className="m-0 max-w-2xl text-sm leading-relaxed text-slate-200 sm:text-base">
                                Đặt thuê trực tiếp theo đơn giá niêm yết hoặc mở thầu RFQ cạnh tranh — bảo vệ thanh toán ký quỹ 100% qua VietQR.
                            </p>
                            <div className="flex flex-wrap items-center gap-3 pt-2">
                                <Link
                                    href="/customer/missions/create"
                                    className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-xs font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
                                >
                                    Đặt dịch vụ bay ngay →
                                </Link>
                                <Link
                                    href="/customer/provider/onboarding"
                                    className="inline-flex h-11 items-center justify-center rounded-full border border-white/25 bg-white/10 px-5 text-xs font-bold text-white backdrop-blur-xs transition-colors hover:bg-white/20"
                                >
                                    Đăng đội bay lên sàn
                                </Link>
                            </div>
                        </div>

                        <div className="lg:col-span-4 lg:flex lg:justify-end">
                            <div className="rounded-2xl border border-white/15 bg-slate-950/75 p-4 backdrop-blur-md">
                                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                                    <ShieldCheck size={15} aria-hidden="true"/>
                                    <span>Chuẩn kỹ thuật bàn giao thực địa</span>
                                </div>
                                <p className="m-0 mt-1.5 font-mono text-xs font-bold text-white">
                                    GSD ≤ 1.2 cm/px · RTK Fixed · Signed-URL 24h
                                </p>
                                <p className="m-0 mt-1 text-xs text-slate-300">
                                    4 nhóm dịch vụ chuẩn hoá · Đội bay 1P & Đối tác 3P toàn quốc
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 2 of 6: Stacked Center Escrow & KYC Trust Bar */}
            <MarketplaceTrustBar/>

            {/* Section 3 of 6: Image-Led Two-Sided UAV Marketplace Listings */}
            <PublicMarketplaceCatalog mode="public"/>

            {/* Section 4 & 6: Alternating 60/40 Editorial Split Showcase + Color-Blocked Diptych CTA */}
            <section className="py-12 sm:py-16">
                <div className="mx-auto w-full max-w-[1380px] space-y-12 px-5 sm:px-8 lg:px-12">
                    {services.map((item, idx) => {
                        const detail = serviceDetails[item.slug];
                        const sceneKey = serviceScenes[item.slug] ?? 'rentalFleet';
                        const photo = scenes[sceneKey];
                        const isReversed = idx % 2 === 1;

                        return (
                            <article
                                key={item.slug}
                                className="grid grid-cols-1 items-center gap-6 overflow-hidden rounded-3xl border border-border bg-card shadow-sm lg:grid-cols-12 lg:gap-0"
                            >
                                <div
                                    className={`relative aspect-[16/10] w-full overflow-hidden bg-slate-900 lg:col-span-7 lg:aspect-auto lg:h-full lg:min-h-[340px] ${
                                        isReversed ? 'lg:order-2' : 'lg:order-1'
                                    }`}
                                >
                                    <Image
                                        src={photo.src}
                                        alt={photo.alt}
                                        fill
                                        sizes="(max-width: 1024px) 100vw, 60vw"
                                        className="object-cover transition-transform duration-500 hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent"/>
                                    <div className="absolute right-5 bottom-4 left-5 flex flex-wrap items-center justify-between gap-2 text-white">
                                        <span className="border-l-2 border-primary pl-2 text-xs font-extrabold uppercase tracking-wider text-white">
                                            0{idx + 1} · {detail.code}
                                        </span>
                                        <span className="rounded-md bg-slate-950/70 px-2.5 py-1 text-xs font-semibold text-slate-200 backdrop-blur-xs">
                                            {detail.onSiteSla}
                                        </span>
                                    </div>
                                </div>

                                <div
                                    className={`flex flex-col justify-between space-y-6 p-6 sm:p-8 lg:col-span-5 ${
                                        isReversed ? 'lg:order-1' : 'lg:order-2'
                                    }`}
                                >
                                    <div className="space-y-3">
                                        <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                                            {keepVietnamesePhrases(item.title)}
                                        </h2>
                                        <p className="text-sm leading-relaxed text-slate-600">{item.text}</p>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3.5 text-center">
                                        <div>
                                            <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">GSD</span>
                                            <span className="mt-0.5 block text-xs font-black text-slate-900 sm:text-sm">{detail.bestGsd}</span>
                                        </div>
                                        <div className="border-x border-slate-200/80 px-1">
                                            <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Trần bay</span>
                                            <span className="mt-0.5 block text-xs font-black text-slate-900 sm:text-sm">{detail.altitudeRange}</span>
                                        </div>
                                        <div>
                                            <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Bàn giao</span>
                                            <span className="mt-0.5 block text-xs font-black text-uav-blue sm:text-sm">{detail.deliverySla}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-1.5">
                                        {detail.sensors.map(sensor => (
                                            <span
                                                key={sensor}
                                                className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
                                            >
                                                {sensor}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 pt-1">
                                        <Link
                                            href={`${customerUrl}/services`}
                                            className="inline-flex h-10 items-center justify-center rounded-control bg-primary px-5 text-xs font-bold text-primary-foreground shadow-xs transition-colors hover:bg-primary-hover"
                                        >
                                            Đặt dịch vụ này →
                                        </Link>
                                        <Link
                                            href={`/services/${item.slug}`}
                                            className="inline-flex h-10 items-center justify-center rounded-control border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition-colors hover:border-primary hover:text-primary"
                                        >
                                            Thông số chi tiết
                                        </Link>
                                    </div>
                                </div>
                            </article>
                        );
                    })}

                    <MarketplaceDiptychCta/>
                </div>
            </section>
        </div>
    );
}
