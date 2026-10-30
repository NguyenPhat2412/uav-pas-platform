import {keepVietnamesePhrases} from "@/lib/typography";
import {pageMetadata} from "@/features/marketing/content/metadata";
import Image from 'next/image';
import Link from 'next/link';
import {capabilities, customerUrl, readinessLabels, services, steps} from "@/features/marketing/content/site-content";
import { serviceDetails } from "@/features/marketing/content/service-details";
import { HeroSlider } from "@/features/marketing/components/HeroSlider";
import { HistoryTimeline } from "@/features/marketing/components/HomeHistoryTimeline";
import { DroneAnatomy } from "@/features/marketing/components/HomeDroneAnatomy";
import { MissionPlanner } from "@/features/marketing/components/HomeMissionPlanner";
import { ProcessRoute } from "@/features/marketing/components/HomeProcessRoute";
import {
    fieldTeam,
    pilotFromAbove,
    portalEcosystem,
    projectHighlights,
    uavPlatformFeatures,
} from "@/features/marketing/content/home-content";
import {FlatTag} from "@/features/marketing/components/FlatTag";
import {PlanCards} from "@/features/marketing/components/PlanCards";

// One drone-in-flight photo sits behind the capabilities section; cards stay text-only so the page repeats no image.
const capabilitiesBackdrop = {src: '/images/people/usgs-everglades-tracking-test.jpg'};

export const metadata = pageMetadata(
    "UAV PAS | Nền tảng điều phối nhiệm vụ & tác chiến UAV chuyên nghiệp",
    "Khám phá nền tảng UAV PAS (Trường Đại học Việt Nhật – ĐHQGHN): dịch vụ bay khảo sát GIS, giám sát Telemetry RTK, buồng lái SAR & Edge AI Kria KV260 cùng bảng giá gói dịch vụ minh bạch.",
    "/",
    true
);

const available = capabilities.filter((item) => item.status === 'AVAILABLE');
const keepTogether = (text: string) => text.replaceAll(' ', ' ');

function SectionHead({eyebrow, jp, title, text, id, onPhoto = false}: { eyebrow: string; jp: string; title: string; text: string; id: string; onPhoto?: boolean }) {
    return (
        <div className="mb-10 grid grid-cols-1 items-end gap-6 lg:grid-cols-12">
            <div className="space-y-2 lg:col-span-7">
                <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                    <span className="h-px w-8 bg-primary/60" aria-hidden="true"/>
                    {eyebrow}
                    <span lang="ja" className={`text-xs tracking-[0.2em] normal-case ${onPhoto ? 'text-white/60' : 'text-slate-400'}`}>{jp}</span>
                </p>
                <h2 id={id} className={`text-3xl font-semibold leading-tight tracking-tight sm:text-[40px] ${onPhoto ? 'text-white' : 'text-foreground'}`}>
                    {keepVietnamesePhrases(title)}
                </h2>
            </div>
            <p className={`text-sm leading-relaxed sm:text-base lg:col-span-5 ${onPhoto ? 'text-white/80' : 'text-slate-600'}`}>{text}</p>
        </div>
    );
}

export default function Page() {
    return (
        <div className="bg-card text-foreground overflow-x-hidden">
            {/* HERO */}
            <section className="relative flex min-h-[560px] w-full items-center overflow-hidden sm:min-h-[630px] lg:min-h-[670px]" aria-labelledby="home-hero-title">
                <HeroSlider/>
                <div className="relative z-20 mx-auto w-full max-w-[1380px] px-6 py-20 sm:px-10 lg:px-16">
                    <div className="max-w-[720px] text-white">
                        <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#e2c18b]">
                            <span className="h-px w-12 bg-[#e2c18b]" aria-hidden="true"/>
                            Trường Đại học Việt Nhật · ĐHQGHN
                        </p>
                        <h1 id="home-hero-title" className="mt-7 text-[38px] font-medium leading-[1.13] tracking-[-0.025em] text-white sm:text-[58px] lg:text-[72px]">
                            {keepVietnamesePhrases('Mỗi chuyến bay UAV')}<br/>
                            {keepVietnamesePhrases('bắt đầu từ')}<br/>
                            <em className="font-medium italic text-[#e2c18b]">một yêu cầu {keepTogether('rõ ràng.')}</em>
                        </h1>
                        <p className="mt-6 max-w-[520px] text-[15px] leading-7 text-white/80">
                            Đặt dịch vụ bay, theo dõi nhiệm vụ và nhận dữ liệu an toàn trên một nền tảng của Trường Đại học Việt Nhật.
                        </p>
                        <div className="mt-9 flex flex-wrap items-center gap-3">
                            <Link
                                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-control bg-primary px-7 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground shadow-lg transition-colors hover:bg-primary-hover"
                                href="/?auth=register"
                            >
                                Bắt đầu yêu cầu bay <span aria-hidden="true">→</span>
                            </Link>
                            <Link
                                className="inline-flex min-h-12 items-center justify-center rounded-control border border-white/40 bg-white/5 px-7 text-xs font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-md transition-colors hover:bg-white/15"
                                href="#goi-cuoc"
                            >
                                Xem bảng giá
                            </Link>
                        </div>
                        <a href="#home-project-title" className="group mt-14 inline-flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/70 transition-colors hover:text-white">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/40 transition-transform group-hover:translate-y-0.5" aria-hidden="true">↓</span>
                            Khám phá UAV PAS
                        </a>
                    </div>
                </div>
            </section>

            {/* PROJECT OVERVIEW & METRICS */}
            <section className="border-b border-border bg-card py-16 sm:py-20" aria-labelledby="home-project-title">
                <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12 space-y-8">
                    <SectionHead
                        id="home-project-title"
                        eyebrow="Giới thiệu Dự án UAV PAS"
                        jp="プロジェクト概要"
                        title="Hệ sinh thái điều hành UAV hợp nhất từ lập kế hoạch đến thực địa."
                        text="Chuẩn hoá chuỗi nghiệp vụ UAV từ vẽ vùng bay GIS, điều phối phi công và trạm mặt đất đến bàn giao dữ liệu."
                    />
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        {projectHighlights.map((metric) => (
                            <div key={metric.label} className="rounded-2xl border border-border bg-slate-50/70 p-4 space-y-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{metric.label}</span>
                                <p className="text-xl font-black tracking-tight text-primary sm:text-2xl">{metric.value}</p>
                                <p className="text-xs text-slate-600">{metric.detail}</p>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {available.map((item) => (
                            <article key={item.title} className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
                                <div className="p-5 space-y-2">
                                    <FlatTag>{readinessLabels[item.status]}</FlatTag>
                                    <h3 className="text-base font-bold text-foreground">{keepVietnamesePhrases(item.title)}</h3>
                                    <p className="text-xs leading-relaxed text-slate-600">{item.text}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* 6 CORE UAV PLATFORM CAPABILITIES */}
            <section className="relative isolate overflow-hidden border-b border-border bg-slate-950 py-16 sm:py-20" aria-labelledby="home-capabilities-title">
                <Image src={capabilitiesBackdrop.src} alt="" fill sizes="100vw" className="-z-10 object-cover opacity-45" aria-hidden="true"/>
                <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-950/80 via-slate-950/60 to-slate-950/85" aria-hidden="true"/>
                <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12">
                    <SectionHead
                        onPhoto
                        id="home-capabilities-title"
                        eyebrow="Chức năng UAV cốt lõi"
                        jp="主要機能"
                        title="Sáu năng lực công nghệ UAV trên nền tảng."
                        text="Tích hợp lập kế hoạch đường bay GIS, giám sát Telemetry RTK, Edge AI Kria KV260 và học viện đào tạo an toàn bay."
                    />
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {uavPlatformFeatures.map((feature, index) => (
                            <article
                                key={feature.id}
                                className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
                            >
                                <div>
                                    <div className="p-5 space-y-2.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <FlatTag>{feature.badge}</FlatTag>
                                            <span className="font-mono text-xs font-bold text-slate-400">0{index + 1}</span>
                                        </div>
                                        <h3 className="text-base font-extrabold leading-snug text-foreground">
                                            {keepVietnamesePhrases(feature.title)}
                                        </h3>
                                        <p className="text-xs leading-relaxed text-slate-600">{feature.description}</p>
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {feature.specs.slice(0, 2).map((spec) => (
                                                <span
                                                    key={spec}
                                                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                                                >
                                                    {spec}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="border-t border-slate-100 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    Phân hệ: <span className="text-slate-700">{feature.portal}</span>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* CLEAR UAV SERVICES CATALOG WITH TECHNICAL SPECS */}
            <section className="border-b border-border bg-card py-16 sm:py-20" aria-labelledby="home-services-catalog-title">
                <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12 space-y-10">
                    <SectionHead
                        id="home-services-catalog-title"
                        eyebrow="Danh mục Dịch vụ UAV"
                        jp="提供サービス"
                        title="Bốn nhóm dịch vụ UAV với thông số kỹ thuật rõ ràng."
                        text="Mỗi dịch vụ quy định rõ tổ hợp cảm biến, độ phân giải GSD, trần bay AGL và thời gian bàn giao kết quả."
                    />
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {services.map((service) => {
                            const detail = serviceDetails[service.slug];
                            return (
                                <article
                                    key={service.slug}
                                    className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
                                >
                                    <div>
                                        <div className="p-5 space-y-3.5">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <FlatTag>{detail.code}</FlatTag>
                                                <span className="text-xs font-semibold text-uav-blue">{detail.onSiteSla}</span>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-extrabold text-foreground">{service.title}</h3>
                                                <p className="mt-1 text-xs leading-relaxed text-slate-600">{service.text}</p>
                                            </div>
                                            <dl className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs sm:grid-cols-4">
                                                <div>
                                                    <dt className="text-[11px] text-slate-400">GSD</dt>
                                                    <dd className="font-bold text-slate-800">{detail.bestGsd}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-[11px] text-slate-400">Trần bay</dt>
                                                    <dd className="font-bold text-slate-800">{detail.altitudeRange}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-[11px] text-slate-400">Phạm vi</dt>
                                                    <dd className="font-bold text-slate-800">{detail.maxArea}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-[11px] text-slate-400">Bàn giao</dt>
                                                    <dd className="font-bold text-slate-800">{detail.deliverySla}</dd>
                                                </div>
                                            </dl>
                                            <div className="flex flex-wrap gap-1.5">
                                                {detail.sensors.map((sensor) => (
                                                    <span
                                                        key={sensor}
                                                        className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                                                    >
                                                        {sensor}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5">
                                        <Link
                                            href={`/services/${service.slug}`}
                                            className="text-xs font-bold text-primary hover:underline"
                                        >
                                            Chi tiết thông số →
                                        </Link>
                                        <Link
                                            href={`${customerUrl}/services`}
                                            className="inline-flex h-8 items-center justify-center rounded-control bg-primary px-3.5 text-xs font-bold text-primary-foreground hover:bg-primary-hover transition-colors"
                                        >
                                            Đặt dịch vụ này
                                        </Link>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* PRICING PLANS: the strongest block on the page, placed right after the services they buy */}
            <section id="goi-cuoc" className="relative isolate scroll-mt-16 overflow-hidden bg-slate-950 py-16 sm:py-24" aria-labelledby="home-pricing-title">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--primary)_0%,transparent_60%)] opacity-35" aria-hidden="true"/>
                <div className="absolute inset-x-0 top-0 -z-10 h-1 bg-primary" aria-hidden="true"/>
                <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12">
                    <SectionHead
                        onPhoto
                        id="home-pricing-title"
                        eyebrow="Bảng giá & Gói cước"
                        jp="料金プラン"
                        title="Chọn gói bay phù hợp, kích hoạt ngay trong ngày."
                        text="Ba gói theo tháng với hạn mức giờ bay và số UAV rõ ràng. Thanh toán VietQR, hạn mức tự động kích hoạt sau khi đối soát."
                    />
                    <PlanCards/>
                    <p className="m-0 mt-10 text-center text-sm text-white/70">
                        Cần nhiều giờ bay hơn hoặc cấu hình riêng?{' '}
                        <Link href="/pricing" className="font-bold text-white underline underline-offset-4 hover:text-rose-100">So sánh chi tiết các gói</Link>
                    </p>
                </div>
            </section>

            {/* INTERACTIVE MISSION PLANNER */}
            <section className="border-b border-border bg-slate-50/60 py-16 sm:py-20" aria-labelledby="home-missions-title">
                <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12">
                    <SectionHead
                        id="home-missions-title"
                        eyebrow="Mô phỏng Đường bay"
                        jp="飛行パターン"
                        title="Trực quan hoá kiểu đường bay cho từng loại nhiệm vụ."
                        text="Mỗi dịch vụ có một phương thức quét không gian riêng: quét lưới song song, bay quỹ đạo tròn, bay dọc hành lang hoặc điều động từ trạm."
                    />
                    <MissionPlanner/>
                </div>
            </section>

            {/* 3-PORTAL ECOSYSTEM ARCHITECTURE */}
            <section className="border-b border-border bg-card py-16 sm:py-20" aria-labelledby="home-portals-title">
                <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12">
                    <SectionHead
                        id="home-portals-title"
                        eyebrow="Làm việc cùng UAV PAS"
                        jp="運用ポータル"
                        title="Bạn gửi yêu cầu, đội vận hành lo phần bay."
                        text="Khách hàng làm việc trên Cổng Khách hàng. Đội vận hành điều phối từng chuyến bay, và dữ liệu của bạn được phân quyền rõ ràng."
                    />
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {portalEcosystem.map((portal) => (
                            <article
                                key={portal.id}
                                className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-xs"
                            >
                                <div>
                                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                                        <Image
                                            src={portal.imageSrc}
                                            alt={portal.imageAlt}
                                            fill
                                            sizes="(max-width: 900px) 100vw, 33vw"
                                            className="object-cover"
                                        />
                                    </div>
                                    <div className="p-5 space-y-2.5">
                                        <FlatTag tone="blue">{portal.badge}</FlatTag>
                                        <h3 className="text-lg font-extrabold text-foreground">{portal.title}</h3>
                                        <p className="text-xs leading-relaxed text-slate-600">{portal.description}</p>
                                        <ul className="space-y-1.5 border-t border-slate-100 pt-2.5 text-xs text-slate-700">
                                            {portal.capabilities.map((cap) => (
                                                <li key={cap} className="flex items-start gap-2">
                                                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true"/>
                                                    <span>{cap}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                                <div className="border-t border-slate-100 px-5 py-3.5">
                                    <Link
                                        href={portal.href}
                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                                    >
                                        {portal.cta} <span aria-hidden="true">→</span>
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* PROCESS STEPS */}
            <section className="border-b border-border bg-card py-16 sm:py-20" aria-labelledby="home-process-title">
                <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12 space-y-8">
                    <SectionHead
                        id="home-process-title"
                        eyebrow="Quy trình thực hiện"
                        jp="流れ"
                        title="Bốn bước chuẩn hoá để triển khai một nhiệm vụ bay."
                        text="Mỗi nhiệm vụ bắt đầu từ một yêu cầu có cấu trúc trên bản đồ GIS, được thẩm định nguồn lực và chuyển trực tiếp tới tổ bay tại hiện trường."
                    />
                    <ProcessRoute steps={steps.slice(0, 4)}/>
                    <div>
                        <Link className="inline-flex items-center text-sm font-bold text-primary hover:underline" href="/how-it-works">
                            Xem chi tiết quy trình 5 bước →
                        </Link>
                    </div>
                </div>
            </section>

            {/* PILOT BANNER */}
            <section className="relative min-h-[420px] w-full overflow-hidden flex items-end py-16 text-white" aria-labelledby="home-pilot-title">
                <Image src={pilotFromAbove.src} alt={pilotFromAbove.alt} fill sizes="100vw" className="object-cover object-center"/>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent"/>
                <div className="relative z-10 mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12 space-y-3">
                    <p className="flex items-baseline gap-3 text-xs font-bold uppercase tracking-widest text-rose-300">
                        Góc nhìn từ UAV <span lang="ja" className="text-sm text-slate-300 normal-case">操縦者</span>
                    </p>
                    <h2 id="home-pilot-title" className="max-w-2xl text-2xl font-black tracking-tight text-white sm:text-4xl">
                        {keepVietnamesePhrases('Mỗi chuyến bay đều có người điều khiển trên mặt đất.')}
                    </h2>
                    <p className="max-w-xl text-sm leading-relaxed text-slate-200 sm:text-base">
                        Đội vận hành chỉ định người điều khiển cho từng nhiệm vụ, từ lúc kiểm tra an toàn tiền bay đến khi hạ cánh và bàn giao dữ liệu.
                    </p>
                    <a
                        className="inline-block pt-2 text-xs text-slate-300 hover:text-white underline"
                        href={pilotFromAbove.source}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {pilotFromAbove.caption} · Ảnh: {pilotFromAbove.credit}
                    </a>
                </div>
            </section>

            {/* DRONE ANATOMY */}
            <section className="border-b border-border bg-slate-50/60 py-16 sm:py-20" aria-labelledby="home-anatomy-title">
                <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12">
                    <SectionHead
                        id="home-anatomy-title"
                        eyebrow="Cấu tạo kỹ thuật UAV"
                        jp="機体の構造"
                        title="Tám hệ thống phần cứng giữ một chiếc UAV ổn định trên không."
                        text="Chọn một điểm trên sơ đồ để xem vai trò của bộ điều khiển bay, định vị GNSS/RTK, gimbal 3 trục, pin thông minh và kênh truyền dữ liệu Telemetry."
                    />
                    <DroneAnatomy/>
                </div>
            </section>

            {/* HISTORY TIMELINE */}
            <HistoryTimeline>
                <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12">
                    <SectionHead
                        id="home-history-title"
                        eyebrow="Hành trình UAV · 1888 → nay"
                        jp="歴史"
                        title="Hơn một thế kỷ nhìn từ trên cao."
                        text="Từ chiếc máy ảnh treo trên diều đến nền tảng điều phối đội bay ngày nay. Lướt xuống để xem từng mốc."
                    />
                </div>
            </HistoryTimeline>

            {/* FIELD TEAM */}
            <section className="border-b border-border bg-slate-50/60 py-16 sm:py-20" aria-labelledby="home-field-title">
                <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12 space-y-6">
                    <SectionHead
                        id="home-field-title"
                        eyebrow="Ngoài thực địa"
                        jp="現場"
                        title="Con người đứng sau mỗi chuyến bay."
                        text="Người điều khiển, quan sát viên và đội khảo sát cùng chuẩn bị, theo dõi và kiểm tra từng chuyến bay."
                    />
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {fieldTeam.map((photo) => (
                            <figure
                                className={`relative overflow-hidden rounded-2xl border border-border bg-card shadow-xs ${
                                    photo.layout === 'wide' ? 'md:col-span-2' : ''
                                }`}
                                key={photo.src}
                            >
                                <div className="relative aspect-[16/10] w-full">
                                    <Image
                                        src={photo.src}
                                        alt={photo.alt}
                                        fill
                                        className="object-cover"
                                        sizes={photo.layout === 'wide' ? '(max-width: 900px) 100vw, 66vw' : '(max-width: 900px) 100vw, 33vw'}
                                    />
                                </div>
                                <figcaption className="flex flex-wrap items-center justify-between gap-2 p-4 text-xs text-slate-600">
                                    <span>{photo.caption}</span>
                                    <a className="font-semibold text-slate-500 hover:text-primary" href={photo.source} target="_blank" rel="noopener noreferrer">
                                        Ảnh: {photo.credit}
                                    </a>
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                    <p className="text-xs text-slate-500">Ảnh tư liệu thuộc phạm vi công cộng của Cục Khảo sát Địa chất Hoa Kỳ (USGS).</p>
                </div>
            </section>

            {/* BOTTOM CTA */}
            <section className="relative overflow-hidden bg-primary py-16 text-primary-foreground sm:py-20" aria-labelledby="home-cta-title">
                <div className="relative z-10 mx-auto flex w-full max-w-[1380px] flex-wrap items-center justify-between gap-8 px-5 sm:px-8 lg:px-12">
                    <div className="max-w-xl space-y-3">
                        <h2 id="home-cta-title" className="text-2xl font-black tracking-tight sm:text-4xl">
                            {keepVietnamesePhrases('Mô tả nhiệm vụ trên bản đồ GIS. Đội vận hành lo phần bay.')}
                        </h2>
                        <p className="text-sm text-rose-100 sm:text-base">
                            Tạo tài khoản, chọn gói cước phù hợp, gửi yêu cầu đầu tiên và theo dõi trạng thái điều phối trực tiếp trong Cổng Khách hàng.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <Link
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-white px-6 py-3 text-sm font-bold text-primary hover:bg-slate-100 transition-colors shadow-md"
                            href="/?auth=register"
                        >
                            Tạo tài khoản ngay
                        </Link>
                        <Link className="text-sm font-bold text-white underline underline-offset-4 hover:text-rose-100" href="/pricing">
                            Xem bảng giá gói cước
                        </Link>
                        <Link className="text-sm font-bold text-white underline underline-offset-4 hover:text-rose-100" href="/services">
                            Xem tất cả dịch vụ
                        </Link>
                    </div>
                    <Image
                        className="pointer-events-none absolute -right-12 top-1/2 -translate-y-1/2 opacity-10 grayscale invert"
                        src="/vju-logo.svg"
                        alt=""
                        width={320}
                        height={320}
                        aria-hidden="true"
                        unoptimized
                    />
                </div>
            </section>
        </div>
    );
}
