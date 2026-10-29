import Image from 'next/image';
import Link from 'next/link';
import {keepVietnamesePhrases} from "@/lib/typography";
import {pageMetadata} from "@/features/marketing/content/metadata";
import {scenes} from "@/features/marketing/components/uav-photo";
import {CustomerCta} from "@/features/marketing/components/public-page";
import {portalEcosystem, projectHighlights} from "@/features/marketing/content/home-content";

export const metadata = pageMetadata(
    "Giới thiệu dự án UAV PAS",
    "Tìm hiểu dự án UAV PAS (VJU – ĐHQGHN): nền tảng đám mây điều phối dịch vụ UAV công nghiệp, viễn thám GIS, giám sát Telemetry thời gian thực, Edge AI Kria KV260 và Học viện SOP.",
    "/about",
    true
);

const photoMosaic = [
    {
        src: scenes.aboutPreflight.src,
        alt: scenes.aboutPreflight.alt,
        tag: 'An toàn tiền bay (SOP)',
        caption: '100% chuyến bay thực hiện kiểm tra kỹ thuật trước khi cất cánh.',
        span: 'md:col-span-7',
    },
    {
        src: scenes.aboutGnssBase.src,
        alt: scenes.aboutGnssBase.alt,
        tag: 'Trắc địa RTK 1–3 cm',
        caption: 'Thu thập dữ liệu bình đồ 2D/3D chuẩn tọa độ quốc gia.',
        span: 'md:col-span-5',
    },
    {
        src: scenes.aboutSensorPayload.src,
        alt: scenes.aboutSensorPayload.alt,
        tag: 'Edge AI Kria KV260',
        caption: 'Tăng tốc suy luận thị giác máy tính YOLOv8s ngay trên khoang bay.',
        span: 'md:col-span-5',
    },
    {
        src: scenes.aboutPilotTeam.src,
        alt: scenes.aboutPilotTeam.alt,
        tag: 'Điều phối 3 Phân hệ',
        caption: 'Kết nối trực tiếp Cổng Khách hàng, Trung tâm Điều hành và Quản trị.',
        span: 'md:col-span-7',
    },
];

// The portal cards share their copy with the home page but use their own photos here.
const portalPhotos: Record<string, (typeof scenes)[keyof typeof scenes]> = {
    customer: scenes.aboutPortalCustomer,
    operations: scenes.aboutPortalOperations,
    admin: scenes.aboutPortalAdmin,
};

export default function AboutPage() {
    return (
        <div className="bg-card text-foreground">
            {/* Full-Bleed Editorial Photo Banner */}
            <section className="relative min-h-[420px] w-full overflow-hidden flex items-end py-16 text-white">
                <Image
                    src={scenes.researchTeam.src}
                    alt={scenes.researchTeam.alt}
                    fill
                    sizes="100vw"
                    className="object-cover object-center"
                    preload
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/20"/>
                <div className="relative z-10 mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12 space-y-3">
                    <p className="text-xs font-extrabold uppercase tracking-widest text-rose-400">
                        Trường Đại học Việt Nhật (VJU – ĐHQGHN)
                    </p>
                    <h1 className="max-w-3xl text-3xl font-black tracking-tight text-white sm:text-5xl leading-tight">
                        {keepVietnamesePhrases('Nền tảng đám mây điều phối đội bay & tác chiến AI UAV.')}
                    </h1>
                </div>
            </section>

            <section className="py-14 sm:py-18">
                <div className="mx-auto w-full max-w-[1380px] space-y-16 px-5 sm:px-8 lg:px-12">
                    {/* 4 Bold Metric Numbers */}
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        {projectHighlights.map((item) => (
                            <div key={item.label} className="rounded-2xl border border-border bg-slate-50/70 p-5 text-center space-y-1">
                                <p className="text-2xl font-black tracking-tight text-primary sm:text-3xl">{item.value}</p>
                                <p className="text-xs font-bold text-foreground">{item.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Editorial Asymmetric Photo Mosaic (Bento Gallery) */}
                    <div className="space-y-6">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h2 className="text-2xl font-black tracking-tight text-foreground">
                                Từ phòng thí nghiệm VJU ra hiện trường bay thực tế
                            </h2>
                            <span className="text-xs font-bold text-uav-blue">Nghiên cứu ứng dụng & Vận hành chuẩn SOP</span>
                        </div>

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
                            {photoMosaic.map((photo) => (
                                <figure
                                    key={photo.src}
                                    className={`group relative min-h-[280px] overflow-hidden rounded-3xl border border-border bg-slate-900 ${photo.span}`}
                                >
                                    <Image
                                        src={photo.src}
                                        alt={photo.alt}
                                        fill
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent"/>
                                    <figcaption className="absolute bottom-5 left-5 right-5 space-y-1 text-white">
                                        <span className="inline-flex items-center border-l-2 border-primary pl-2 text-[11px] font-bold uppercase tracking-wider text-rose-300">
                                            {photo.tag}
                                        </span>
                                        <p className="text-sm font-bold text-white sm:text-base">{photo.caption}</p>
                                    </figcaption>
                                </figure>
                            ))}
                        </div>
                    </div>

                    {/* 3 Tall Image-Overlay Portal Cards (Zero Bullet Lists!) */}
                    <div className="space-y-6">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h2 className="text-2xl font-black tracking-tight text-foreground">
                                Bạn làm việc với UAV PAS như thế nào
                            </h2>
                            <Link href="/how-it-works" className="text-xs font-bold text-primary hover:underline">
                                Xem quy trình phối hợp →
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                            {portalEcosystem.map((portal) => (
                                <Link
                                    key={portal.id}
                                    href={portal.href}
                                    className="group relative flex min-h-[340px] flex-col justify-end overflow-hidden rounded-3xl border border-border p-6 text-white shadow-sm"
                                >
                                    <Image
                                        src={portalPhotos[portal.id]?.src ?? portal.imageSrc}
                                        alt={portalPhotos[portal.id]?.alt ?? portal.imageAlt}
                                        fill
                                        sizes="(max-width: 1024px) 100vw, 33vw"
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"/>
                                    <div className="relative z-10 space-y-2">
                                        <span className="inline-flex items-center border-l-2 border-primary pl-2 text-[11px] font-bold uppercase tracking-wider text-rose-300">
                                            {portal.badge}
                                        </span>
                                        <h3 className="text-2xl font-black text-white">{portal.title}</h3>
                                        <p className="text-xs text-slate-200">{portal.role}</p>
                                        <span className="inline-flex items-center gap-1 pt-2 text-xs font-bold text-rose-300 group-hover:underline">
                                            {portal.cta} →
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <CustomerCta/>
                </div>
            </section>
        </div>
    );
}
