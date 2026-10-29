import {keepVietnamesePhrases} from "@/lib/typography";
import {customerUrl} from "@/features/marketing/content/site-content";
import {type UavScene, UavPhoto} from "@/features/marketing/components/uav-photo";

export function PublicPage({eyebrow, title, accent, intro, scene, children}: {
    eyebrow: string;
    title: string;
    /** Optional closing phrase of the title, set on its own line in the italic accent colour. */
    accent?: string;
    intro: string;
    scene?: UavScene;
    children: React.ReactNode
}) {
    return (
        <>
            <section className="border-b border-border bg-gradient-to-br from-sky-50/70 via-card to-card py-14 sm:py-20">
                <div className={`mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12 ${scene ? 'grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12' : ''}`}>
                    <div className={scene ? 'space-y-4 lg:col-span-6' : 'max-w-3xl space-y-4'}>
                        <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                            <span className="h-px w-8 bg-primary/60" aria-hidden="true"/>
                            {eyebrow}
                        </p>
                        <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-[52px]">
                            {keepVietnamesePhrases(title)}
                            {accent && <><br/><em className="font-medium italic text-primary">{keepVietnamesePhrases(accent)}</em></>}
                        </h1>
                        <p className="text-base leading-relaxed text-slate-600 sm:text-lg">{intro}</p>
                    </div>
                    {scene && (
                        <div className="lg:col-span-6">
                            <UavPhoto scene={scene} preload className="mb-0 shadow-lg"/>
                        </div>
                    )}
                </div>
            </section>
            <section className="py-12 sm:py-16">
                <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12">{children}</div>
            </section>
        </>
    );
}

export function CustomerCta() {
    return (
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-slate-50/90 p-6 sm:p-8">
            <p className="text-base font-bold text-foreground">Bạn đã sẵn sàng mô tả nhu cầu thực hiện nhiệm vụ?</p>
            <a
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover transition-colors shadow-xs"
                href={`${customerUrl}/services`}
            >
                Xem dịch vụ
            </a>
        </div>
    );
}
