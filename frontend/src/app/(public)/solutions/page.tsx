import Image from 'next/image';
import Link from 'next/link';
import {keepVietnamesePhrases} from "@/lib/typography";
import {pageMetadata} from "@/content/marketing/metadata";
import {solutions} from "@/content/marketing/site-content";
import {solutionDetails} from "@/content/marketing/solution-details";
import {CustomerCta} from "@/components/marketing/PublicPage";
import {FlatTag} from "@/components/marketing/FlatTag";
import {scenes, solutionScenes} from "@/components/marketing/UavPhoto";

export const metadata = pageMetadata(
    "Giải pháp UAV & Edge AI",
    "Tìm hiểu các giải pháp chuyên sâu trên UAV PAS: vận hành UAV theo yêu cầu, khảo sát hạ tầng kỹ thuật, tìm kiếm cứu nạn SAR chuẩn IAMSAR và nhận diện Edge AI Xilinx Kria KV260.",
    "/solutions",
    true
);

export default function SolutionsPage() {
    const commercialSolutions = solutions.filter((s) => s.status === 'AVAILABLE');
    const tacticalSolutions = solutions.filter((s) => s.status !== 'AVAILABLE');

    return (
        <div className="bg-card text-foreground">
            {/* Dark Tactical Hero Banner (Distinct from all other pages) */}
            <section className="relative overflow-hidden bg-slate-950 py-16 text-white sm:py-22">
                <Image
                    src={scenes.response.src}
                    alt={scenes.response.alt}
                    fill
                    sizes="100vw"
                    className="object-cover opacity-30"
                    preload
                />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/40"/>
                <div className="relative z-10 mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12">
                    <div className="max-w-2xl space-y-4">
                        <p className="text-xs font-extrabold uppercase tracking-widest text-rose-400">
                            Giải pháp Chuyên ngành & R&D
                        </p>
                        <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl leading-tight">
                            {keepVietnamesePhrases('Từ khảo sát thương mại đến buồng lái cứu nạn AI.')}
                        </h1>
                        <p className="text-sm text-slate-300 sm:text-base">
                            Hai phân nhóm giải pháp tách biệt: vận hành UAV thương mại trọn gói và tác chiến Edge AI Kria KV260 / SAR chuẩn quốc tế IAMSAR.
                        </p>
                    </div>
                </div>
            </section>

            <section className="py-14 sm:py-18">
                <div className="mx-auto w-full max-w-[1380px] space-y-16 px-5 sm:px-8 lg:px-12">
                    {/* Part 1: Horizontal Split Cards for Commercial Solutions */}
                    <div className="space-y-6">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h2 className="text-2xl font-black tracking-tight text-foreground">
                                01 · Giải pháp Vận hành Thương mại
                            </h2>
                            <span className="text-xs font-bold text-primary">Sẵn sàng đặt lịch trên Cổng Khách hàng</span>
                        </div>

                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {commercialSolutions.map((item) => {
                                const detail = solutionDetails[item.slug];
                                const photo = scenes[solutionScenes[item.slug] ?? 'opsCommand'];
                                return (
                                    <Link
                                        key={item.slug}
                                        href={`/solutions/${item.slug}`}
                                        className="group grid grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card shadow-xs transition-all hover:border-primary/40 hover:shadow-md sm:grid-cols-12"
                                    >
                                        <div className="relative aspect-[16/10] sm:col-span-5 sm:aspect-auto sm:h-full">
                                            <Image
                                                src={photo.src}
                                                alt={photo.alt}
                                                fill
                                                sizes="(max-width: 640px) 100vw, 280px"
                                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                        </div>
                                        <div className="flex flex-col justify-between p-5 sm:col-span-7 space-y-3">
                                            <div className="space-y-1.5">
                                                <FlatTag>Thương mại · Sẵn sàng</FlatTag>
                                                <h3 className="text-lg font-extrabold text-foreground group-hover:text-primary transition-colors">
                                                    {keepVietnamesePhrases(item.title)}
                                                </h3>
                                                <p className="text-xs leading-relaxed text-slate-600">{item.text}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {detail?.techStack.slice(0, 3).map((tech) => (
                                                    <span key={tech} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                                        {tech}
                                                    </span>
                                                ))}
                                            </div>
                                            <span className="text-xs font-bold text-primary group-hover:underline">
                                                Xem quy trình →
                                            </span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Part 2: Full-Bleed Image Overlay Cards for Edge AI & SAR (No outer container box) */}
                    <div className="space-y-6">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-widest text-primary">Tích hợp Cổng Điều hành & Gói Enterprise</span>
                                <h2 className="mt-1 text-2xl font-black tracking-tight text-foreground">
                                    02 · Tổ hợp Tác chiến Edge AI & Tìm kiếm Cứu nạn (SAR)
                                </h2>
                            </div>
                            <Link href="/pricing" className="text-xs font-bold text-primary hover:underline">
                                Mở khoá trên gói Pro / Enterprise →
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            {tacticalSolutions.map((item) => {
                                const detail = solutionDetails[item.slug];
                                const photo = scenes[solutionScenes[item.slug] ?? 'edgePayload'];
                                return (
                                    <Link
                                        key={item.slug}
                                        href={`/solutions/${item.slug}`}
                                        className="group relative flex min-h-[320px] flex-col justify-end overflow-hidden rounded-2xl bg-slate-950 p-6 shadow-sm"
                                    >
                                        <Image
                                            src={photo.src}
                                            alt={photo.alt}
                                            fill
                                            sizes="(max-width: 768px) 100vw, 50vw"
                                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-transparent"/>
                                        <div className="relative z-10 space-y-3">
                                            <span className="inline-flex items-center border-l-2 border-primary pl-2 text-[11px] font-bold uppercase tracking-wider text-rose-300">
                                                Công nghệ lõi R&D
                                            </span>
                                            <h3 className="text-xl font-black text-white group-hover:text-rose-300 transition-colors">
                                                {keepVietnamesePhrases(item.title)}
                                            </h3>
                                            <p className="text-xs text-slate-200">{item.text}</p>
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {detail?.techStack.slice(0, 3).map((tech) => (
                                                    <span
                                                        key={tech}
                                                        className="rounded-md bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-xs"
                                                    >
                                                        {tech}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    <CustomerCta/>
                </div>
            </section>
        </div>
    );
}
