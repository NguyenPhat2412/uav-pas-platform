import Link from 'next/link';
import {Card, CardContent} from '@/components/ui';
import {keepVietnamesePhrases} from '@/lib/typography';
import {capabilities, readinessLabels} from '@/content/marketing/site-content';
import {projectHighlights} from '@/content/marketing/home-content';
import {HeroSlider} from '@/components/marketing/HeroSlider';
import {HeroScrollDownButton} from '@/components/marketing/HeroScrollDownButton';
import {FlatTag} from '@/components/marketing/FlatTag';
import {HomeLandingSectionHead} from '@/components/marketing/HomeLandingSectionHead';

const available = capabilities.filter((item) => item.status === 'AVAILABLE');
const keepTogether = (text: string) => text.replaceAll(' ', '\u00A0');

export function HomeLandingHeroSection() {
    return (
        <>
            {/* HERO */}
            <section className="relative flex min-h-[580px] w-full items-center overflow-hidden sm:min-h-[650px] lg:min-h-[690px]" aria-labelledby="home-hero-title">
                <HeroSlider/>
                <div className="relative z-20 mx-auto w-full max-w-[1380px] px-6 pt-20 pb-32 sm:px-10 sm:pb-32 lg:px-16">
                    <div className="max-w-[720px] text-white">
                        <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#e2c18b]">
                            <span className="h-px w-12 bg-[#e2c18b]" aria-hidden="true"/>
                            Nền tảng Điều phối &amp; Vận hành Bay
                        </p>
                        <h1 id="home-hero-title" className="mt-7 text-[38px] font-medium leading-[1.13] tracking-[-0.025em] text-white sm:text-[58px] lg:text-[72px]">
                            {keepVietnamesePhrases('Mỗi chuyến bay UAV')}<br/>
                            {keepVietnamesePhrases('bắt đầu từ')}<br/>
                            <em className="font-medium italic text-[#e2c18b]">một yêu cầu {keepTogether('rõ ràng.')}</em>
                        </h1>
                        <p className="mt-6 max-w-[520px] text-[15px] leading-7 text-white/80">
                            Khởi tạo yêu cầu bay trên bản đồ GIS, điều phối phi công – trạm mặt đất và theo dõi tiến độ nhiệm vụ UAV xuyên suốt trên một nền tảng hợp nhất.
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
                    </div>
                </div>
                <HeroScrollDownButton targetId="home-overview" />
            </section>

            {/* PROJECT OVERVIEW & METRICS */}
            <section id="home-overview" className="scroll-mt-20 border-b border-border bg-card py-16 sm:py-20" aria-labelledby="home-project-title">
                <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12 space-y-8">
                    <HomeLandingSectionHead
                        id="home-project-title"
                        eyebrow="Giới thiệu Nền tảng UAV PAS"
                        jp="プロジェクト概要"
                        title="Hệ sinh thái điều hành UAV hợp nhất từ lập kế hoạch đến thực địa."
                        text="Chuẩn hoá chuỗi nghiệp vụ UAV từ vẽ vùng bay GIS, điều phối phi công và trạm mặt đất đến bàn giao dữ liệu."
                    />
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        {projectHighlights.map((metric) => (
                            <Card key={metric.label} className="rounded-2xl border-border bg-slate-50/70 p-4 space-y-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{metric.label}</span>
                                <p className="text-xl font-black tracking-tight text-primary sm:text-2xl">{metric.value}</p>
                                <p className="text-xs text-slate-600">{metric.detail}</p>
                            </Card>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {available.map((item) => (
                            <Card key={item.title} className="rounded-2xl border-border shadow-xs">
                                <CardContent className="space-y-2">
                                    <FlatTag>{readinessLabels[item.status]}</FlatTag>
                                    <h3 className="text-base font-bold text-foreground">{keepVietnamesePhrases(item.title)}</h3>
                                    <p className="text-xs leading-relaxed text-slate-600">{item.text}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
}
