import {keepVietnamesePhrases} from '@/lib/typography';

export interface HomeLandingSectionHeadProps {
    eyebrow: string;
    jp: string;
    title: string;
    text: string;
    id: string;
    onPhoto?: boolean;
}

export function HomeLandingSectionHead({
    eyebrow,
    jp,
    title,
    text,
    id,
    onPhoto = false,
}: HomeLandingSectionHeadProps) {
    return (
        <div className="mb-10 grid grid-cols-1 items-end gap-6 lg:grid-cols-12">
            <div className="space-y-2 lg:col-span-7">
                <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                    <span className="h-px w-8 bg-primary/60" aria-hidden="true"/>
                    {eyebrow}
                    <span lang="ja" className={`text-xs tracking-[0.2em] normal-case ${onPhoto ? 'text-white/60' : 'text-slate-400'}`}>
                        {jp}
                    </span>
                </p>
                <h2 id={id} className={`text-3xl font-semibold leading-tight tracking-tight sm:text-[40px] ${onPhoto ? 'text-white' : 'text-foreground'}`}>
                    {keepVietnamesePhrases(title)}
                </h2>
            </div>
            <p className={`text-sm leading-relaxed sm:text-base lg:col-span-5 ${onPhoto ? 'text-white/80' : 'text-slate-600'}`}>
                {text}
            </p>
        </div>
    );
}
