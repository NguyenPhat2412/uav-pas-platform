import Image from 'next/image';
import Link from 'next/link';
import {Card, CardContent, CardFooter} from '@/components/ui';
import {steps} from '@/content/marketing/site-content';
import {portalEcosystem} from '@/content/marketing/home-content';
import {MissionPlanner} from '@/components/marketing/HomeMissionPlanner';
import {ProcessRoute} from '@/components/marketing/HomeProcessRoute';
import {FlatTag} from '@/components/marketing/FlatTag';
import {PlanCards} from '@/components/marketing/PlanCards';
import {HomeLandingSectionHead} from '@/components/marketing/HomeLandingSectionHead';

export function HomeLandingPortalsSection() {
    return (
        <>
            {/* PRICING PLANS: the strongest block on the page, placed right after the services they buy */}
            <section id="goi-cuoc" className="relative isolate scroll-mt-16 overflow-hidden bg-slate-950 py-16 sm:py-24" aria-labelledby="home-pricing-title">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--primary)_0%,transparent_60%)] opacity-35" aria-hidden="true"/>
                <div className="absolute inset-x-0 top-0 -z-10 h-1 bg-primary" aria-hidden="true"/>
                <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12">
                    <HomeLandingSectionHead
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
                        <Link href="/pricing" className="font-bold text-white underline underline-offset-4 hover:text-rose-100">
                            So sánh chi tiết các gói
                        </Link>
                    </p>
                </div>
            </section>

            {/* INTERACTIVE MISSION PLANNER */}
            <section className="border-b border-border bg-slate-50/60 py-16 sm:py-20" aria-labelledby="home-missions-title">
                <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12">
                    <HomeLandingSectionHead
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
                    <HomeLandingSectionHead
                        id="home-portals-title"
                        eyebrow="Làm việc cùng UAV PAS"
                        jp="運用ポータル"
                        title="Bạn gửi yêu cầu, đội vận hành lo phần bay."
                        text="Khách hàng làm việc trên Cổng Khách hàng. Đội vận hành điều phối từng chuyến bay, và dữ liệu của bạn được phân quyền rõ ràng."
                    />
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {portalEcosystem.map((portal) => (
                            <Card key={portal.id} className="flex flex-col justify-between rounded-2xl border-border shadow-xs">
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
                                    <CardContent className="space-y-2.5">
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
                                    </CardContent>
                                </div>
                                <CardFooter className="py-3.5">
                                    <Link href={portal.href} className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
                                        {portal.cta} <span aria-hidden="true">→</span>
                                    </Link>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* PROCESS STEPS */}
            <section className="border-b border-border bg-card py-16 sm:py-20" aria-labelledby="home-process-title">
                <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12 space-y-8">
                    <HomeLandingSectionHead
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
        </>
    );
}
