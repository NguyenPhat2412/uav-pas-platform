import Image from 'next/image';
import Link from 'next/link';
import {keepVietnamesePhrases} from "@/lib/typography";
import {scenes, serviceScenes} from "@/features/marketing/components/uav-photo";
import {pageMetadata} from "@/features/marketing/content/metadata";
import {customerUrl, services} from "@/features/marketing/content/site-content";
import {serviceDetails} from "@/features/marketing/content/service-details";
import {CustomerCta} from "@/features/marketing/components/public-page";
import {FlatTag} from "@/features/marketing/components/flat-tag";

export const metadata = pageMetadata(
    "Dịch vụ UAV",
    "Danh mục 4 nhóm dịch vụ UAV chuyên sâu trên UAV PAS: thuê UAV kèm phi công, khảo sát bản đồ GIS 2D/3D, quay chụp trên không 4K và thu thập dữ liệu hành lang.",
    "/services",
    true
);

export default function ServicesPage() {
    return (
        <div className="bg-card text-foreground">
            {/* Minimalist Split Header */}
            <section className="border-b border-border bg-slate-50/70 py-12 sm:py-16">
                <div className="mx-auto flex w-full max-w-6xl flex-wrap items-end justify-between gap-6 px-4 sm:px-6">
                    <div className="max-w-2xl space-y-2">
                        <p className="text-xs font-extrabold uppercase tracking-widest text-primary">
                            Danh mục Dịch vụ UAV • 4 Nhóm chuẩn hoá
                        </p>
                        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-5xl">
                            {keepVietnamesePhrases('Chọn dịch vụ bay theo mục tiêu thực địa.')}
                        </h1>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs font-bold">
                        <FlatTag>RTK 1–3 cm</FlatTag>
                        <FlatTag tone="blue">4 Dòng cảm biến</FlatTag>
                        <FlatTag>Signed-URL bàn giao</FlatTag>
                    </div>
                </div>
            </section>

            {/* Alternating Zig-Zag Split Showcase Rows */}
            <section className="py-12 sm:py-16">
                <div className="mx-auto w-full max-w-6xl space-y-12 px-4 sm:px-6">
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
                                {/* 60% Visual Column */}
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
                                        preload={idx === 0}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent"/>
                                    <div className="absolute bottom-4 left-5 right-5 flex flex-wrap items-center justify-between gap-2 text-white">
                                        <span className="border-l-2 border-primary pl-2 text-xs font-extrabold uppercase tracking-wider text-white">
                                            0{idx + 1} · {detail.code}
                                        </span>
                                        <span className="rounded-md bg-slate-950/70 px-2.5 py-1 text-xs font-semibold text-slate-200 backdrop-blur-xs">
                                            {detail.onSiteSla}
                                        </span>
                                    </div>
                                </div>

                                {/* 40% Ultra-Concise Spec Column */}
                                <div
                                    className={`flex flex-col justify-between p-6 sm:p-8 lg:col-span-5 space-y-6 ${
                                        isReversed ? 'lg:order-1' : 'lg:order-2'
                                    }`}
                                >
                                    <div className="space-y-3">
                                        <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                                            {keepVietnamesePhrases(item.title)}
                                        </h2>
                                        <p className="text-sm leading-relaxed text-slate-600">{item.text}</p>
                                    </div>

                                    {/* 3 Big Numbers */}
                                    <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3.5 text-center">
                                        <div>
                                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">GSD</span>
                                            <span className="mt-0.5 block text-xs font-black text-slate-900 sm:text-sm">{detail.bestGsd}</span>
                                        </div>
                                        <div className="border-x border-slate-200/80 px-1">
                                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Trần bay</span>
                                            <span className="mt-0.5 block text-xs font-black text-slate-900 sm:text-sm">{detail.altitudeRange}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Bàn giao</span>
                                            <span className="mt-0.5 block text-xs font-black text-uav-blue sm:text-sm">{detail.deliverySla}</span>
                                        </div>
                                    </div>

                                    {/* Compact Sensor Pills */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {detail.sensors.map((sensor) => (
                                            <span
                                                key={sensor}
                                                className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                                            >
                                                {sensor}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Action Bar */}
                                    <div className="flex flex-wrap items-center gap-3 pt-1">
                                        <Link
                                            href={`${customerUrl}/services`}
                                            className="inline-flex h-10 items-center justify-center rounded-control bg-primary px-5 text-xs font-bold text-primary-foreground hover:bg-primary-hover transition-colors shadow-xs"
                                        >
                                            Đặt dịch vụ này →
                                        </Link>
                                        <Link
                                            href={`/services/${item.slug}`}
                                            className="inline-flex h-10 items-center justify-center rounded-control border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:border-primary hover:text-primary transition-colors"
                                        >
                                            Thông số chi tiết
                                        </Link>
                                    </div>
                                </div>
                            </article>
                        );
                    })}

                    <CustomerCta/>
                </div>
            </section>
        </div>
    );
}
