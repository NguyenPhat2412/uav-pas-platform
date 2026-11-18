'use client';

import {useEffect, useRef} from 'react';
import type {EraIcon} from '@/content/marketing/home-content';
import {EraSilhouette} from '@/components/marketing/HomeIcons';
import {FlatTag} from '@/components/marketing/FlatTag';
import {useI18n} from '@/providers/I18nContext';

const ERA_ICONS: {idx: number; icon: EraIcon; current?: boolean}[] = [
    {idx: 1, icon: 'kite'},
    {idx: 2, icon: 'kites'},
    {idx: 3, icon: 'agheli'},
    {idx: 4, icon: 'quad'},
    {idx: 5, icon: 'rules'},
    {idx: 6, icon: 'hex'},
    {idx: 7, icon: 'route', current: true},
];

export function HistoryTimeline({children}: { children: React.ReactNode }) {
    const {t} = useI18n();
    const listRef = useRef<HTMLOListElement>(null);
    const fillRef = useRef<HTMLSpanElement>(null);

    const eras = ERA_ICONS.map((meta) => ({
        icon: meta.icon,
        current: meta.current,
        year: t(`publicSite.showcase.e${meta.idx}Year`),
        title: t(`publicSite.showcase.e${meta.idx}Title`),
        tag: t(`publicSite.showcase.e${meta.idx}Tag`),
        text: t(`publicSite.showcase.e${meta.idx}Text`),
    }));

    useEffect(() => {
        const list = listRef.current;
        const fill = fillRef.current;
        if (!list || !fill) return;
        const items = Array.from(list.querySelectorAll<HTMLElement>('[data-era]'));
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            items.forEach((item) => {
                item.dataset.shown = 'true';
            });
            fill.style.transform = 'scaleY(1)';
            return;
        }
        items.forEach((item) => {
            item.dataset.shown = 'false';
        });
        const io = new IntersectionObserver(
            (entries) =>
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    (entry.target as HTMLElement).dataset.shown = 'true';
                    io.unobserve(entry.target);
                }),
            {rootMargin: '0px 0px -12% 0px'},
        );
        items.forEach((item) => io.observe(item));

        let frame = 0;
        const paint = () => {
            frame = 0;
            const box = list.getBoundingClientRect();
            const progress = Math.min(
                1,
                Math.max(0, (window.innerHeight * 0.6 - box.top) / box.height),
            );
            fill.style.transform = `scaleY(${progress})`;
        };
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(paint);
        };
        paint();
        window.addEventListener('scroll', onScroll, {passive: true});
        window.addEventListener('resize', onScroll);
        return () => {
            io.disconnect();
            cancelAnimationFrame(frame);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, []);

    return (
        <section
            className="border-b border-border bg-card py-16 sm:py-20"
            aria-labelledby="home-history-title"
        >
            {children}
            <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
                <ol
                    ref={listRef}
                    className="relative m-0 list-none space-y-6 p-0 md:space-y-4"
                    aria-label={t('publicSite.showcase.historyEyebrow')}
                >
                    <span
                        className="absolute top-2 bottom-2 left-[19px] w-0.5 bg-slate-200 md:left-1/2 md:-translate-x-1/2"
                        aria-hidden="true"
                    />
                    <span
                        ref={fillRef}
                        className="absolute top-2 bottom-2 left-[19px] w-0.5 origin-top scale-y-0 bg-primary md:left-1/2 md:-translate-x-1/2"
                        aria-hidden="true"
                    />
                    {eras.map((era, i) => {
                        const left = i % 2 === 0;
                        return (
                            <li
                                key={era.icon}
                                data-era=""
                                className="group relative grid grid-cols-[40px_1fr] items-start gap-x-4 transition-[opacity,translate] duration-500 ease-out data-[shown=false]:translate-y-3 data-[shown=false]:opacity-0 motion-reduce:transition-none md:grid-cols-[1fr_40px_1fr] md:gap-x-6 md:data-[shown=false]:translate-y-0"
                            >
                                <span
                                    className={`relative z-10 col-start-1 row-start-1 flex h-10 w-10 items-center justify-center rounded-full border-2 bg-card md:col-start-2 ${
                                        era.current
                                            ? 'border-primary text-primary'
                                            : 'border-slate-300 text-slate-600'
                                    }`}
                                >
                                    <span className="h-4 w-8">
                                        <EraSilhouette icon={era.icon} />
                                    </span>
                                </span>
                                <span
                                    className={`row-start-1 hidden pt-2 text-lg font-black tracking-wide tabular-nums md:block ${
                                        left ? 'text-left md:col-start-3' : 'text-right md:col-start-1'
                                    } ${era.current ? 'text-primary' : 'text-slate-400'}`}
                                >
                                    {era.year}
                                </span>
                                <article
                                    className={`col-start-2 row-start-1 rounded-panel border p-4 transition-[translate] duration-500 ease-out motion-reduce:transition-none ${
                                        left
                                            ? 'md:col-start-1 md:text-right md:group-data-[shown=false]:-translate-x-6'
                                            : 'md:col-start-3 md:group-data-[shown=false]:translate-x-6'
                                    } ${
                                        era.current
                                            ? 'border-primary bg-uav-red-light/50'
                                            : 'border-border bg-slate-50/70'
                                    }`}
                                >
                                    <div
                                        className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${
                                            left ? 'md:justify-end' : ''
                                        }`}
                                    >
                                        <span className="text-xs font-extrabold tabular-nums text-primary md:hidden">
                                            {era.year}
                                        </span>
                                        <h3 className="m-0 text-base font-bold text-foreground">
                                            {era.title}
                                        </h3>
                                        <FlatTag tone="blue">{era.tag}</FlatTag>
                                    </div>
                                    <p className="m-0 mt-1.5 text-sm leading-relaxed text-slate-600">
                                        {era.text}
                                    </p>
                                </article>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </section>
    );
}
