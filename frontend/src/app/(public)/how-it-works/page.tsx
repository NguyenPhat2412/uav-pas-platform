import Image from 'next/image';
import {keepVietnamesePhrases} from "@/lib/typography";
import {pageMetadata} from "@/features/marketing/content/metadata";
import {steps} from "@/features/marketing/content/site-content";
import {CustomerCta} from "@/features/marketing/components/PublicPage";
import {ProcessRoute} from "@/features/marketing/components/HomeProcessRoute";
import {scenes, type UavScene} from "@/features/marketing/components/UavPhoto";

export const metadata = pageMetadata(
    "Quy trình thực hiện nhiệm vụ UAV",
    "Khám phá quy trình 5 bước triển khai nhiệm vụ UAV và vòng đời 7 trạng thái điều phối tự động giữa Khách hàng, Trung tâm Điều hành và Phi công thực địa.",
    "/how-it-works",
    true
);

const timelineStages: {
    number: string;
    role: string;
    title: string;
    short: string;
    scene: UavScene;
}[] = [
    {
        number: '01',
        role: 'Cổng Khách hàng',
        title: 'Chọn dịch vụ & gói giờ bay',
        short: 'Chọn 1 trong 4 dịch vụ chuẩn và kích hoạt hạn mức qua VietQR.',
        scene: 'stepBriefing',
    },
    {
        number: '02',
        role: 'GIS Flight Planner',
        title: 'Khoanh vùng đa giác trên bản đồ số',
        short: 'Vẽ khu vực bay, chọn độ cao AGL (30–120m), GSD và cảm biến.',
        scene: 'stepPlanning',
    },
    {
        number: '03',
        role: 'Trung tâm Điều hành',
        title: 'Thẩm định & giữ chỗ UAV – Phi công',
        short: 'Kiểm tra vùng trời Geofence, thời tiết và phân công tổ bay.',
        scene: 'stepPrep',
    },
    {
        number: '04',
        role: 'Tổ bay Thực địa',
        title: 'Bay thực địa & truyền Telemetry RTK',
        short: 'Kiểm tra tiền bay SOP, cất cánh và xử lý AI Kria KV260 trực tiếp.',
        scene: 'stepRtk',
    },
    {
        number: '05',
        role: 'Lưu trữ Đám mây',
        title: 'Bàn giao dữ liệu qua Signed-URL',
        short: 'Tải ảnh Geotagged, bình đồ 2D/3D và video 4K bảo mật một lần.',
        scene: 'stepOrthomosaic',
    },
];

const metroNodes = [
    {step: '01', code: 'DRAFT', name: 'Bản nháp'},
    {step: '02', code: 'PENDING', name: 'Chờ duyệt'},
    {step: '03', code: 'CONFIRMED', name: 'Đã duyệt'},
    {step: '04', code: 'RESERVED', name: 'Giữ UAV'},
    {step: '05', code: 'READY', name: 'Sẵn sàng'},
    {step: '06', code: 'IN_PROGRESS', name: 'Đang bay'},
    {step: '07', code: 'COMPLETED', name: 'Hoàn tất'},
];

export default function HowItWorksPage() {
    return (
        <div className="bg-card text-foreground">
            {/* Top Interactive Flight Route Header */}
            <section className="border-b border-border bg-slate-50/70 py-12 sm:py-16">
                <div className="mx-auto w-full max-w-[1380px] space-y-8 px-5 sm:px-8 lg:px-12">
                    <div className="max-w-2xl space-y-2">
                        <p className="text-xs font-extrabold uppercase tracking-widest text-primary">
                            Quy trình thực hiện • 5 Bước khép kín
                        </p>
                        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-5xl">
                            {keepVietnamesePhrases('Từ vùng vẽ GIS đến chuyến bay ngoài thực địa.')}
                        </h1>
                    </div>
                    <ProcessRoute steps={steps.slice(0, 4)}/>
                </div>
            </section>

            {/* Center-Line Vertical Alternating Timeline */}
            <section className="py-16 sm:py-20">
                <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
                    <div className="relative space-y-12 before:hidden md:before:block before:absolute before:top-6 before:bottom-6 before:left-1/2 before:-translate-x-1/2 before:w-0.5 before:bg-slate-200">
                        {timelineStages.map((stage, idx) => {
                            const photo = scenes[stage.scene];
                            const isEven = idx % 2 === 1;
                            return (
                                <div key={stage.number} className="relative grid grid-cols-1 items-center gap-6 md:grid-cols-12 md:gap-10">
                                    {/* Image Side */}
                                    <div className={`md:col-span-5 ${isEven ? 'md:col-start-8 md:order-2' : 'md:col-start-1 md:order-1'}`}>
                                        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-slate-100 shadow-sm">
                                            <Image
                                                src={photo.src}
                                                alt={photo.alt}
                                                fill
                                                sizes="(max-width: 768px) 100vw, 420px"
                                                className="object-cover"
                                            />
                                        </div>
                                    </div>

                                    {/* Center Node Badge */}
                                    <div className="hidden md:flex md:col-span-2 md:col-start-6 md:order-2 items-center justify-center">
                                        <span className="z-10 flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-primary font-mono text-sm font-black text-white shadow-md">
                                            {stage.number}
                                        </span>
                                    </div>

                                    {/* Concise Text Side */}
                                    <div className={`md:col-span-5 ${isEven ? 'md:col-start-1 md:order-1 md:text-right' : 'md:col-start-8 md:order-3'}`}>
                                        <div className="rounded-2xl border border-border bg-slate-50/70 p-6 space-y-2">
                                            <p className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
                                                Bước {stage.number} · {stage.role}
                                            </p>
                                            <h2 className="text-xl font-black text-foreground">
                                                {keepVietnamesePhrases(stage.title)}
                                            </h2>
                                            <p className="text-xs leading-relaxed text-slate-600">{stage.short}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Horizontal 7-Node Status Track (No outer box wrapper) */}
                    <div className="mt-20 border-t border-border pt-14 space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-xl font-black tracking-tight text-foreground sm:text-2xl">
                                Chuỗi 7 trạng thái đồng bộ thời gian thực
                            </h2>
                            <span className="text-xs font-bold text-primary">Khách hàng ↔ Điều hành ↔ Trạm mặt đất</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                            {metroNodes.map((node, i) => (
                                <div key={node.code} className="flex flex-col items-center rounded-2xl border border-border bg-slate-50/70 p-3.5 text-center">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary font-mono text-xs font-black text-white">
                                        {i + 1}
                                    </span>
                                    <span className="mt-2 font-mono text-[10px] font-bold text-primary">{node.code}</span>
                                    <span className="mt-0.5 text-xs font-bold text-foreground">{node.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <CustomerCta/>
                </div>
            </section>
        </div>
    );
}
