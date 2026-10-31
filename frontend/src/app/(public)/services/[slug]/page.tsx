import {serviceScenes} from "@/components/marketing/UavPhoto";
import {pageMetadata} from "@/content/marketing/metadata";
import {notFound} from 'next/navigation';
import Link from 'next/link';
import {serviceDetails} from "@/content/marketing/service-details";
import {services} from "@/content/marketing/site-content";
import {CustomerCta, PublicPage} from "@/components/marketing/PublicPage";

export function generateStaticParams() {
    return services.map(({slug}) => ({slug}));
}

export async function generateMetadata({params}: { params: Promise<{ slug: string }> }) {
    const {slug} = await params;
    const service = services.find((item) => item.slug === slug);
    if (!service) notFound();
    return pageMetadata(`Dịch vụ: ${service.title}`, service.text, `/services/${slug}`);
}

export default async function ServiceDetail({params}: { params: Promise<{ slug: string }> }) {
    const {slug} = await params;
    const service = services.find((item) => item.slug === slug);
    if (!service) notFound();
    const detail = serviceDetails[slug];
    return (
        <PublicPage
            eyebrow={`Thông số dịch vụ UAV • ${detail.code}`}
            title={service.title}
            intro={service.text}
            scene={serviceScenes[slug]}
        >
            <div className="space-y-8 text-slate-600">
                {/* Technical Specifications Grid */}
                <div className="grid grid-cols-2 gap-3.5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:grid-cols-3 lg:grid-cols-6">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Độ phân giải GSD</span>
                        <span className="mt-1 block text-sm font-extrabold text-slate-900">{detail.bestGsd}</span>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Trần bay nhiệm vụ</span>
                        <span className="mt-1 block text-sm font-extrabold text-slate-900">{detail.altitudeRange}</span>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Phạm vi bao phủ</span>
                        <span className="mt-1 block text-sm font-extrabold text-slate-900">{detail.maxArea}</span>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Kháng gió tối đa</span>
                        <span className="mt-1 block text-sm font-extrabold text-slate-900">{detail.maxWind}</span>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">SLA có mặt</span>
                        <span className="mt-1 block text-sm font-extrabold text-primary">{detail.onSiteSla}</span>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">SLA bàn giao</span>
                        <span className="mt-1 block text-sm font-extrabold text-uav-blue">{detail.deliverySla}</span>
                    </div>
                </div>

                {/* Sensors & Deliverables */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                        <h2 className="text-lg font-bold text-slate-900">Tổ hợp cảm biến & Payload UAV</h2>
                        <p className="mt-1 text-xs text-slate-500">Thiết bị bay và cảm biến chuyên dụng được lựa chọn theo yêu cầu nhiệm vụ.</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {detail.sensors.map((sensor) => (
                                <span key={sensor} className="rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-1.5 text-xs font-bold text-primary">
                                    {sensor}
                                </span>
                            ))}
                        </div>
                        <h3 className="mt-6 text-sm font-bold text-slate-900">Các bài toán ứng dụng điển hình</h3>
                        <ul className="mt-2.5 space-y-2">
                            {detail.useCases.map((uc) => (
                                <li key={uc} className="flex items-start gap-2 text-xs leading-relaxed text-slate-600">
                                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"/>
                                    <span>{uc}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                        <h2 className="text-lg font-bold text-slate-900">Đầu ra bàn giao tiêu chuẩn (Deliverables)</h2>
                        <p className="mt-1 text-xs text-slate-500">Tất cả tệp kết quả được lưu trữ bảo mật trên cổng khách hàng qua Signed-URL.</p>
                        <ul className="mt-4 space-y-2.5">
                            {detail.deliverables.map((item) => (
                                <li key={item} className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs font-medium text-slate-700">
                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-uav-blue-light text-xs font-bold text-uav-blue">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* 3 Concise Operational Cards */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-primary">01 · Đối tượng phù hợp</span>
                        <h2 className="text-base font-bold text-foreground">Khách hàng & đơn vị sử dụng</h2>
                        <p className="text-xs leading-relaxed text-slate-600">{detail.audience}</p>
                    </article>
                    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-uav-blue">02 · Cấu hình GIS</span>
                        <h2 className="text-base font-bold text-foreground">Gợi ý thông số bay</h2>
                        <p className="text-xs leading-relaxed text-slate-600">{detail.example}</p>
                    </article>
                    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">03 · Nghiệm thu</span>
                        <h2 className="text-base font-bold text-foreground">Quy trình bàn giao kết quả</h2>
                        <p className="text-xs leading-relaxed text-slate-600">{detail.output}</p>
                    </article>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                    <Link className="text-sm font-semibold text-slate-600 hover:text-slate-900" href="/services">
                        ← Quay lại danh sách dịch vụ
                    </Link>
                    <Link className="text-sm font-bold text-primary hover:underline" href="/pricing">
                        Xem bảng giá gói thuê bao áp dụng →
                    </Link>
                </div>

                <CustomerCta/>
            </div>
        </PublicPage>
    );
}
