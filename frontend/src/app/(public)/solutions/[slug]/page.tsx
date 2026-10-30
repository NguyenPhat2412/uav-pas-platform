import {pageMetadata} from "@/features/marketing/content/metadata";
import {notFound} from 'next/navigation';
import Link from 'next/link';
import {solutionDetails} from "@/features/marketing/content/solution-details";
import {legacySolutionSlugAliases, solutions} from "@/features/marketing/content/site-content";
import {CustomerCta, PublicPage} from "@/features/marketing/components/PublicPage";
import {solutionScenes} from "@/features/marketing/components/UavPhoto";

export function generateStaticParams() {
    return [
        ...solutions.map(({slug}) => ({slug})),
        ...Object.keys(legacySolutionSlugAliases).map((slug) => ({slug})),
    ];
}

export async function generateMetadata({params}: { params: Promise<{ slug: string }> }) {
    const {slug} = await params;
    const canonicalSlug = legacySolutionSlugAliases[slug] ?? slug;
    const solution = solutions.find((item) => item.slug === canonicalSlug);
    if (!solution) notFound();
    return pageMetadata(`Giải pháp: ${solution.title}`, solution.text, `/solutions/${canonicalSlug}`);
}

export default async function SolutionDetail({params}: { params: Promise<{ slug: string }> }) {
    const {slug} = await params;
    const canonicalSlug = legacySolutionSlugAliases[slug] ?? slug;
    const solution = solutions.find((item) => item.slug === canonicalSlug);
    if (!solution) notFound();
    const detail = solutionDetails[canonicalSlug];
    return (
        <PublicPage
            eyebrow={`Giải pháp • ${solution.status === 'AVAILABLE' ? 'Đã hỗ trợ gửi yêu cầu' : 'Lộ trình R&D & Tích hợp chuyên sâu'}`}
            title={solution.title}
            intro={solution.text}
            scene={solutionScenes[canonicalSlug]}
        >
            <div className="space-y-8 text-slate-600">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                        <h2 className="text-base font-bold text-slate-900">Nền tảng công nghệ (Tech Stack)</h2>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {detail.techStack.map((tech) => (
                                <span key={tech} className="rounded-lg border border-rose-200 bg-rose-50/70 px-2.5 py-1 text-xs font-bold text-primary">
                                    {tech}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                        <h2 className="text-base font-bold text-slate-900">Thuật toán & Quy chuẩn áp dụng</h2>
                        <ul className="mt-3 space-y-1.5">
                            {detail.algorithms.map((alg) => (
                                <li key={alg} className="flex items-start gap-2 text-xs font-medium text-slate-700">
                                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"/>
                                    <span>{alg}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                        <h2 className="text-base font-bold text-slate-900">Đầu ra & Giá trị bàn giao</h2>
                        <ul className="mt-3 space-y-1.5">
                            {detail.deliverables.map((del) => (
                                <li key={del} className="flex items-start gap-2 text-xs font-medium text-slate-700">
                                    <span className="mt-0.5 font-bold text-uav-blue">✓</span>
                                    <span>{del}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-primary">01 · Kịch bản thực tế</span>
                        <h2 className="text-base font-bold text-foreground">Tình huống sử dụng</h2>
                        <p className="text-xs leading-relaxed text-slate-600">{detail.useCase}</p>
                    </article>
                    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-uav-blue">02 · Luồng điều phối</span>
                        <h2 className="text-base font-bold text-foreground">Quy trình vận hành trên UAV PAS</h2>
                        <p className="text-xs leading-relaxed text-slate-600">{detail.workflow}</p>
                    </article>
                    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">03 · An toàn & Kỹ thuật</span>
                        <h2 className="text-base font-bold text-foreground">Phạm vi & Lưu ý vận hành</h2>
                        <p className="text-xs leading-relaxed text-slate-600">{detail.limitation}</p>
                    </article>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                    <Link className="text-sm font-semibold text-slate-600 hover:text-slate-900" href="/solutions">
                        ← Quay lại danh sách giải pháp
                    </Link>
                    <Link className="text-sm font-bold text-primary hover:underline" href="/pricing">
                        Xem bảng giá gói thuê bao →
                    </Link>
                </div>

                {solution.status === 'AVAILABLE' ? (
                    <CustomerCta/>
                ) : (
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-6">
                        <div className="space-y-1 max-w-2xl">
                            <p className="text-sm font-bold text-amber-900">Giải pháp thuộc nhóm R&D chuyên sâu (Gói Enterprise)</p>
                            <p className="text-xs text-amber-800">
                                Buồng lái SAR chuẩn IAMSAR và mô-đun Edge AI Kria KV260 đã được tích hợp trong cổng vận hành. Liên hệ đội ngũ kỹ thuật hoặc đăng ký gói Enterprise để kích hoạt thử nghiệm thực địa.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Link className="inline-flex items-center rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-primary/90" href="/pricing">
                                Xem gói Enterprise
                            </Link>
                            <Link className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50" href="/contact">
                                Liên hệ đội ngũ R&D
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </PublicPage>
    );
}
