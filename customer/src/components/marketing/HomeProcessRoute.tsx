'use client';

import Image from 'next/image';
import {useEffect, useRef} from 'react';
import {keepVietnamesePhrases} from '@/lib/typography';
import {useI18n} from '@/providers/I18nContext';
import {scenes, type UavScene} from '@/components/marketing/UavPhoto';

const ROUTE =
    'M10 110 C 140 110, 170 40, 260 40 S 400 110, 510 100 S 640 30, 760 34 S 900 90, 990 70';

const STAGE_SCENES: UavScene[] = ['stepBriefing', 'stepPlanning', 'stepRtk', 'stepOrthomosaic'];

export function ProcessRoute({
    steps,
}: {
    steps: { number: string; title: string; text: string }[];
}) {
    const {t, locale} = useI18n();
    const shapeVi = (text: string) => (locale === 'vi' ? keepVietnamesePhrases(text) : text);

    const rootRef = useRef<HTMLDivElement>(null);
    const baseRef = useRef<SVGPathElement>(null);
    const liveRef = useRef<SVGPathElement>(null);
    const droneRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const root = rootRef.current,
            base = baseRef.current,
            live = liveRef.current,
            drone = droneRef.current;
        if (!root || !base || !live || !drone) return;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const svg = base.ownerSVGElement!;
        const items = Array.from(root.querySelectorAll<HTMLElement>('.home-step'));
        const length = base.getTotalLength();
        live.style.strokeDasharray = `${length}`;
        const update = () => {
            const rect = root.getBoundingClientRect(),
                vh = window.innerHeight;
            const p = reduce
                ? 1
                : Math.min(1, Math.max(0, (vh * 0.75 - rect.top) / (vh * 0.45 + rect.height * 0.3)));
            live.style.strokeDashoffset = `${length * (1 - p)}`;
            const point = base.getPointAtLength(length * p),
                box = svg.getBoundingClientRect(),
                wrap = root.getBoundingClientRect();
            drone.style.left = `${box.left - wrap.left + (point.x * box.width) / 1000}px`;
            drone.style.top = `${box.top - wrap.top + (point.y * box.height) / 140}px`;
            items.forEach((item, i) =>
                item.classList.toggle('is-lit', p >= (i + 0.5) / items.length - 0.08),
            );
        };
        update();
        window.addEventListener('scroll', update, {passive: true});
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('scroll', update);
            window.removeEventListener('resize', update);
        };
    }, []);

    return (
        <div className="relative space-y-6" ref={rootRef}>
            <svg
                className="hidden h-28 w-full overflow-visible md:block"
                viewBox="0 0 1000 140"
                preserveAspectRatio="none"
                aria-hidden="true"
            >
                <path
                    ref={baseRef}
                    className="fill-none stroke-slate-200 stroke-2"
                    strokeDasharray="4 6"
                    d={ROUTE}
                />
                <path ref={liveRef} className="fill-none stroke-primary stroke-[3]" d={ROUTE} />
            </svg>
            <svg
                ref={droneRef}
                className="pointer-events-none absolute hidden -translate-x-1/2 -translate-y-1/2 md:block"
                viewBox="-14 -14 28 28"
                width="30"
                height="30"
                aria-hidden="true"
            >
                <g className="fill-white stroke-primary" strokeWidth="1.8">
                    <circle cx="-8" cy="-8" r="4.5" />
                    <circle cx="8" cy="-8" r="4.5" />
                    <circle cx="-8" cy="8" r="4.5" />
                    <circle cx="8" cy="8" r="4.5" />
                </g>
                <rect x="-4" y="-4" width="8" height="8" rx="2" className="fill-primary" />
            </svg>
            <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {steps.map((step, idx) => {
                    const photo = scenes[STAGE_SCENES[idx % STAGE_SCENES.length]];
                    return (
                        <li
                            className="home-step overflow-hidden rounded-2xl border border-border bg-card shadow-2xs transition-colors"
                            key={step.number}
                        >
                            <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                                <Image
                                    src={photo.src}
                                    alt={photo.alt}
                                    fill
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                    className="object-cover"
                                />
                                <span className="absolute top-2.5 left-2.5 rounded-md bg-slate-950/80 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-white tabular-nums backdrop-blur-xs">
                                    {t('publicSite.process.stagePrefix')} {step.number}
                                </span>
                            </div>
                            <div className="space-y-1.5 p-4">
                                <h3 className="text-base font-bold text-foreground">
                                    {shapeVi(step.title)}
                                </h3>
                                <p className="text-xs leading-relaxed text-slate-600">{step.text}</p>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
