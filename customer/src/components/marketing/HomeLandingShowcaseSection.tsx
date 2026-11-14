import Image from 'next/image';
import Link from 'next/link';
import {Card} from '@/components/ui';
import {keepVietnamesePhrases} from '@/lib/typography';
import {fieldTeam, pilotFromAbove} from '@/content/marketing/home-content';
import {HistoryTimeline} from '@/components/marketing/HomeHistoryTimeline';
import {DroneAnatomy} from '@/components/marketing/HomeDroneAnatomy';
import {HomeLandingSectionHead} from '@/components/marketing/HomeLandingSectionHead';
import {cn} from '@/lib/utils';

export function HomeLandingShowcaseSection() {
    return (
        <>
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
                    <HomeLandingSectionHead
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
                    <HomeLandingSectionHead
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
                    <HomeLandingSectionHead
                        id="home-field-title"
                        eyebrow="Ngoài thực địa"
                        jp="現場"
                        title="Con người đứng sau mỗi chuyến bay."
                        text="Người điều khiển, quan sát viên và đội khảo sát cùng chuẩn bị, theo dõi và kiểm tra từng chuyến bay."
                    />
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {fieldTeam.map((photo) => (
                            <Card
                                key={photo.src}
                                className={cn('relative rounded-2xl border-border shadow-xs', photo.layout === 'wide' && 'md:col-span-2')}
                            >
                                <figure className="m-0">
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
                            </Card>
                        ))}
                    </div>
                    <p className="text-xs text-slate-500">Ảnh tư liệu thuộc phạm vi công cộng của Cục Khảo sát Địa chất Hoa Kỳ (USGS).</p>
                </div>
            </section>

            {/* BOTTOM CTA */}
            <section className="relative isolate overflow-hidden bg-slate-950 py-16 text-white sm:py-20" aria-labelledby="home-cta-title">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,var(--primary)_0%,transparent_60%)] opacity-35" aria-hidden="true"/>
                <div className="absolute inset-x-0 top-0 -z-10 h-1 bg-primary" aria-hidden="true"/>
                <div className="relative z-10 mx-auto flex w-full max-w-[1380px] flex-wrap items-center justify-between gap-8 px-5 sm:px-8 lg:px-12">
                    <div className="max-w-xl space-y-3">
                        <p className="text-xs font-extrabold uppercase tracking-widest text-rose-300">
                            Sẵn sàng triển khai nhiệm vụ
                        </p>
                        <h2 id="home-cta-title" className="text-2xl font-black tracking-tight text-white sm:text-4xl">
                            {keepVietnamesePhrases('Mô tả nhiệm vụ trên bản đồ GIS. Đội vận hành lo phần bay.')}
                        </h2>
                        <p className="text-sm text-slate-300 sm:text-base">
                            Tạo tài khoản, chọn gói cước phù hợp, gửi yêu cầu đầu tiên và theo dõi trạng thái điều phối trực tiếp trong Cổng Khách hàng.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3.5">
                        <Link
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg transition-colors hover:bg-primary-hover"
                            href="/?auth=register"
                        >
                            Tạo tài khoản ngay →
                        </Link>
                        <Link
                            className="inline-flex min-h-11 items-center justify-center rounded-control border border-white/30 bg-white/5 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/15"
                            href="/pricing"
                        >
                            Xem bảng giá gói cước
                        </Link>
                        <Link className="px-2 text-sm font-bold text-slate-200 underline underline-offset-4 hover:text-white" href="/services">
                            Tất cả dịch vụ
                        </Link>
                    </div>
                    <Image
                        className="pointer-events-none absolute -right-12 top-1/2 -translate-y-1/2 opacity-10 grayscale invert"
                        src="/uav-pas-logo.svg"
                        alt=""
                        width={320}
                        height={320}
                        aria-hidden="true"
                        unoptimized
                    />
                </div>
            </section>
        </>
    );
}
