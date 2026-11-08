import Image from 'next/image';
import Link from 'next/link';
import {Badge, Card, CardContent, CardFooter} from '@/components/ui';
import {keepVietnamesePhrases} from '@/lib/typography';
import {customerUrl, services} from '@/content/marketing/site-content';
import {serviceDetails} from '@/content/marketing/service-details';
import {uavPlatformFeatures} from '@/content/marketing/home-content';
import {FlatTag} from '@/components/marketing/FlatTag';
import {HomeLandingSectionHead} from '@/components/marketing/HomeLandingSectionHead';

// One drone-in-flight photo sits behind the capabilities section; cards stay text-only so the page repeats no image.
const capabilitiesBackdrop = {src: '/images/people/usgs-everglades-tracking-test.jpg'};

export function HomeLandingCapabilitiesSection() {
    return (
        <>
            {/* 6 CORE UAV PLATFORM CAPABILITIES */}
            <section className="relative isolate overflow-hidden border-b border-border bg-slate-950 py-16 sm:py-20" aria-labelledby="home-capabilities-title">
                <Image src={capabilitiesBackdrop.src} alt="" fill sizes="100vw" className="-z-10 object-cover opacity-45" aria-hidden="true"/>
                <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-950/80 via-slate-950/60 to-slate-950/85" aria-hidden="true"/>
                <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12">
                    <HomeLandingSectionHead
                        onPhoto
                        id="home-capabilities-title"
                        eyebrow="Chức năng UAV cốt lõi"
                        jp="主要機能"
                        title="Sáu năng lực công nghệ UAV trên nền tảng."
                        text="Tích hợp lập kế hoạch đường bay GIS, giám sát telemetry trực tuyến, quản lý nhiệm vụ và tài liệu an toàn bay."
                    />
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {uavPlatformFeatures.map((feature, index) => (
                            <Card
                                key={feature.id}
                                className="flex flex-col justify-between rounded-2xl border-border shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
                            >
                                <CardContent className="space-y-2.5">
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
                                            <Badge
                                                key={spec}
                                                variant="outline"
                                                size="sm"
                                                className="rounded-md border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium normal-case tracking-normal text-slate-700"
                                            >
                                                {spec}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                                <CardFooter className="justify-start gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    Phân hệ: <span className="text-slate-700">{feature.portal}</span>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* CLEAR UAV SERVICES CATALOG WITH TECHNICAL SPECS */}
            <section className="border-b border-border bg-card py-16 sm:py-20" aria-labelledby="home-services-catalog-title">
                <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12 space-y-10">
                    <HomeLandingSectionHead
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
                                <Card
                                    key={service.slug}
                                    className="flex flex-col justify-between rounded-2xl border-border shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
                                >
                                    <CardContent className="space-y-3.5">
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
                                                <Badge
                                                    key={sensor}
                                                    variant="outline"
                                                    size="sm"
                                                    className="rounded-md border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold normal-case tracking-normal text-slate-700"
                                                >
                                                    {sensor}
                                                </Badge>
                                            ))}
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex-wrap gap-3 py-3.5">
                                        <Link href={`/services/${service.slug}`} className="text-xs font-bold text-primary hover:underline">
                                            Chi tiết thông số →
                                        </Link>
                                        <Link
                                            href={`${customerUrl}/services`}
                                            className="inline-flex h-8 items-center justify-center rounded-control bg-primary px-3.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
                                        >
                                            Đặt dịch vụ này
                                        </Link>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </section>
        </>
    );
}
