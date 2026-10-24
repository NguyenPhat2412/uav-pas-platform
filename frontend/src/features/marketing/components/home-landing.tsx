import {keepVietnamesePhrases} from "@/lib/typography";
import {pageMetadata} from "@/features/marketing/content/metadata";
import Image from 'next/image';
import Link from 'next/link';
import {capabilities, customerUrl, readinessLabels, steps} from "@/features/marketing/content/site-content";
import {HeroSlider} from "@/features/marketing/components/hero-slider";
import {HistoryTimeline} from "@/features/marketing/components/home-history-timeline";
import {DroneAnatomy} from "@/features/marketing/components/home-drone-anatomy";
import {MissionPlanner} from "@/features/marketing/components/home-mission-planner";
import {ProcessRoute} from "@/features/marketing/components/home-process-route";
import {fieldTeam, pilotFromAbove} from "@/features/marketing/content/home-content";

export const metadata = pageMetadata(
    "UAV PAS | Nền tảng điều phối nhiệm vụ",
    "Tìm hiểu quy trình nhiệm vụ UAV, các loại yêu cầu được hỗ trợ và tính năng dự kiến.",
    "/",
    true
);

const available = capabilities.filter((item) => item.status === 'AVAILABLE');
const upcoming = capabilities.filter((item) => item.status !== 'AVAILABLE');
const keepTogether = (text: string) => text.replaceAll(' ', ' ');

function SectionHead({eyebrow, jp, title, text, id}: { eyebrow: string; jp: string; title: string; text: string; id: string }) {
    return (
        <div className="mb-10 grid grid-cols-1 items-end gap-6 lg:grid-cols-12">
            <div className="space-y-2 lg:col-span-7">
                <p className="flex items-baseline gap-3 text-xs font-bold uppercase tracking-widest text-primary">
                    {eyebrow}
                    <span lang="ja" className="text-sm tracking-widest text-slate-400 normal-case">{jp}</span>
                </p>
                <h2 id={id} className="text-2xl font-black tracking-tight text-foreground sm:text-4xl">
                    {keepVietnamesePhrases(title)}
                </h2>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 sm:text-base lg:col-span-5">{text}</p>
        </div>
    );
}

export default function Page() {
    return (
        <div className="bg-card text-foreground overflow-x-hidden">
            <section className="relative min-h-[580px] w-full overflow-hidden flex items-center py-20 lg:py-28" aria-labelledby="home-hero-title">
                <HeroSlider/>
                <div className="relative z-20 mx-auto w-full max-w-6xl px-4 sm:px-6">
                    <div className="max-w-2xl space-y-6 text-white">
                        <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-md">
                            <Image src="/vju-logo.svg" alt="Biểu trưng Trường Đại học Việt Nhật" width={36} height={36} priority unoptimized className="h-9 w-9 rounded-full bg-white p-0.5 object-contain"/>
                            <div className="flex flex-col leading-tight">
                                <strong className="text-xs font-bold text-white">Trường Đại học Việt Nhật</strong>
                                <span className="text-[11px] text-slate-300">ĐHQGHN · <span lang="ja">日越大学</span></span>
                            </div>
                        </div>
                        <h1 id="home-hero-title" className="text-3xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl leading-tight">
                            {keepVietnamesePhrases('Từ mục tiêu nhiệm vụ đến ')}
                            <em className="not-italic text-rose-400">{keepTogether('kế hoạch bay')}</em>
                            {keepVietnamesePhrases(' rõ ràng.')}
                        </h1>
                        <div className="flex flex-wrap items-center gap-3.5 pt-2">
                            <a
                                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover transition-colors shadow-lg"
                                href={`${customerUrl}/register`}
                            >
                                Bắt đầu yêu cầu <span aria-hidden="true">→</span>
                            </a>
                            <Link
                                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-md hover:bg-white/20 transition-colors"
                                href="/how-it-works"
                            >
                                Tìm hiểu quy trình
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <section className="border-b border-border bg-card py-14 sm:py-16" aria-labelledby="home-why-title">
                <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 space-y-8">
                    <h2 className="sr-only" id="home-why-title">Những gì UAV PAS đã hỗ trợ</h2>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {available.map((item) => (
                            <article key={item.title} className="rounded-2xl border border-border bg-slate-50/60 p-6 space-y-2.5">
                                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-success">
                                    {readinessLabels[item.status]}
                                </span>
                                <h3 className="text-lg font-bold text-foreground">{keepVietnamesePhrases(item.title)}</h3>
                                <p className="text-sm leading-relaxed text-slate-600">{item.text}</p>
                            </article>
                        ))}
                    </div>
                    <p className="flex flex-wrap items-center gap-2.5 rounded-xl border border-border bg-slate-50 px-4 py-3 text-xs text-slate-600">
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-bold text-warning">{readinessLabels.PLANNED}</span>
                        <span>{upcoming.map((item) => item.title).join(' · ')}</span>
                    </p>
                </div>
            </section>

            <section className="border-b border-border bg-slate-50/60 py-16 sm:py-20" aria-labelledby="home-missions-title">
                <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
                    <SectionHead
                        id="home-missions-title"
                        eyebrow="Dịch vụ"
                        jp="任務"
                        title="Bắt đầu từ công việc bạn cần thực hiện."
                        text="Mỗi dịch vụ có một kiểu đường bay riêng. Chọn một dịch vụ để xem UAV sẽ bay như thế nào."
                    />
                    <MissionPlanner/>
                </div>
            </section>

            <section className="border-b border-border bg-card py-16 sm:py-20" aria-labelledby="home-process-title">
                <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 space-y-8">
                    <SectionHead
                        id="home-process-title"
                        eyebrow="Quy trình thực hiện"
                        jp="流れ"
                        title="Bốn bước để gửi một nhiệm vụ bay."
                        text="Mỗi nhiệm vụ bắt đầu từ một yêu cầu có thể được xem xét, bổ sung và chuyển tới đội vận hành."
                    />
                    <ProcessRoute steps={steps.slice(0, 4)}/>
                    <div>
                        <Link className="inline-flex items-center text-sm font-bold text-primary hover:underline" href="/how-it-works">
                            Xem chi tiết quy trình →
                        </Link>
                    </div>
                </div>
            </section>

            <section className="relative min-h-[420px] w-full overflow-hidden flex items-end py-16 text-white" aria-labelledby="home-pilot-title">
                <Image src={pilotFromAbove.src} alt={pilotFromAbove.alt} fill sizes="100vw" className="object-cover object-center"/>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent"/>
                <div className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6 space-y-3">
                    <p className="flex items-baseline gap-3 text-xs font-bold uppercase tracking-widest text-rose-300">
                        Góc nhìn từ UAV <span lang="ja" className="text-sm text-slate-300 normal-case">操縦者</span>
                    </p>
                    <h2 id="home-pilot-title" className="max-w-2xl text-2xl font-black tracking-tight text-white sm:text-4xl">
                        {keepVietnamesePhrases('Mỗi chuyến bay đều có người điều khiển trên mặt đất.')}
                    </h2>
                    <p className="max-w-xl text-sm leading-relaxed text-slate-200 sm:text-base">
                        Đội vận hành chỉ định người điều khiển cho từng nhiệm vụ, từ lúc kiểm tra trước bay đến khi hạ cánh.
                    </p>
                    <a
                        className="inline-block pt-2 text-xs text-slate-300 hover:text-white underline"
                        href={pilotFromAbove.source}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {pilotFromAbove.caption} · Ảnh: {pilotFromAbove.credit} ↗
                    </a>
                </div>
            </section>

            <section className="border-b border-border bg-slate-50/60 py-16 sm:py-20" aria-labelledby="home-anatomy-title">
                <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
                    <SectionHead
                        id="home-anatomy-title"
                        eyebrow="Tìm hiểu UAV"
                        jp="機体の構造"
                        title="Tám bộ phận giữ một chiếc UAV trên không."
                        text="Chọn một điểm trên sơ đồ để xem bộ phận đó làm gì và vì sao nó quan trọng khi lập kế hoạch bay."
                    />
                    <DroneAnatomy/>
                </div>
            </section>

            <HistoryTimeline>
                <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
                    <SectionHead
                        id="home-history-title"
                        eyebrow="Hành trình UAV · 1888 → nay"
                        jp="歴史"
                        title="Hơn một thế kỷ nhìn từ trên cao."
                        text="Từ chiếc máy ảnh treo trên diều đến drone khảo sát ngày nay. Vuốt ngang hoặc dùng nút mũi tên để xem các mốc."
                    />
                </div>
            </HistoryTimeline>

            <section className="border-b border-border bg-slate-50/60 py-16 sm:py-20" aria-labelledby="home-field-title">
                <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 space-y-6">
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
                                        Ảnh: {photo.credit} ↗
                                    </a>
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                    <p className="text-xs text-slate-500">Ảnh tư liệu thuộc phạm vi công cộng của Cục Khảo sát Địa chất Hoa Kỳ (USGS).</p>
                </div>
            </section>

            <section className="relative overflow-hidden bg-primary py-16 text-primary-foreground sm:py-20" aria-labelledby="home-cta-title">
                <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-8 px-4 sm:px-6">
                    <div className="max-w-xl space-y-3">
                        <h2 id="home-cta-title" className="text-2xl font-black tracking-tight sm:text-4xl">
                            {keepVietnamesePhrases('Mô tả nhiệm vụ. Đội vận hành lo phần bay.')}
                        </h2>
                        <p className="text-sm text-rose-100 sm:text-base">
                            Tạo tài khoản, gửi yêu cầu đầu tiên và theo dõi trạng thái điều phối ngay trong cổng khách hàng.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <a
                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-primary hover:bg-slate-100 transition-colors shadow-md"
                            href={`${customerUrl}/register`}
                        >
                            Tạo tài khoản <span aria-hidden="true">↗</span>
                        </a>
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
