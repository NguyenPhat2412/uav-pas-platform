import {pageMetadata} from "@/features/marketing/content/metadata";
import {notFound} from 'next/navigation';
import Link from 'next/link';
import {solutionDetails} from "@/features/marketing/content/solution-details";
import {legacySolutionSlugAliases, solutions} from "@/features/marketing/content/site-content";
import {CustomerCta, PublicPage} from "@/features/marketing/components/public-page";
import {solutionScenes} from "@/features/marketing/components/uav-photo";

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
    return pageMetadata(`Giải pháp: ${solution.title}`, solution.text, `/solutions/${canonicalSlug}`)
}

export default async function SolutionDetail({params}: { params: Promise<{ slug: string }> }) {
    const {slug} = await params;
    const canonicalSlug = legacySolutionSlugAliases[slug] ?? slug;
    const solution = solutions.find((item) => item.slug === canonicalSlug);
    if (!solution) notFound();
    const detail = solutionDetails[canonicalSlug];
    return (
        <PublicPage
            eyebrow={`Giải pháp / ${solution.status === 'AVAILABLE' ? 'Đã hỗ trợ gửi yêu cầu' : 'Dự kiến'}`}
            title={solution.title}
            intro={solution.text}
            scene={solutionScenes[canonicalSlug]}
        >
            <div className="max-w-3xl space-y-5 text-slate-600">
                <h2 className="pt-2 text-xl font-bold text-foreground">Tình huống sử dụng</h2>
                <p className="text-base leading-relaxed">{detail.useCase}</p>
                <h2 className="pt-2 text-xl font-bold text-foreground">Quy trình</h2>
                <p className="text-base leading-relaxed">{detail.workflow}</p>
                <h2 className="pt-2 text-xl font-bold text-foreground">Giới hạn</h2>
                <p className="text-base leading-relaxed">{detail.limitation}</p>
                {solution.status === 'AVAILABLE' ? (
                    <CustomerCta/>
                ) : (
                    <div className="pt-4">
                        <Link className="inline-flex items-center text-sm font-bold text-primary hover:underline" href="/services">
                            Xem các loại yêu cầu được hỗ trợ
                        </Link>
                    </div>
                )}
            </div>
        </PublicPage>
    );
}
