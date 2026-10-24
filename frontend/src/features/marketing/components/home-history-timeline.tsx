'use client';

import Image from 'next/image';
import {useRef} from 'react';
import {eras} from "@/features/marketing/content/home-content";
import {EraSilhouette} from "@/features/marketing/components/home-icons";

// Horizontally scrollable track: swipe on touch, arrow buttons or trackpad on desktop. Never hijacks page scroll.
export function HistoryTimeline({children}: { children: React.ReactNode }) {
    const viewportRef = useRef<HTMLDivElement>(null);
    // Step to the first milestone past the current scroll position in the chosen direction.
    const scroll = (direction: 1 | -1) => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        const inset = parseFloat(getComputedStyle(viewport).scrollPaddingLeft) || 0;
        const stops = Array.from(viewport.querySelectorAll<HTMLElement>('.home-era')).map((era) => era.offsetLeft - inset);
        const current = viewport.scrollLeft;
        const target = direction > 0
            ? stops.find((stop) => stop > current + 4) ?? viewport.scrollWidth
            : [...stops].reverse().find((stop) => stop < current - 4) ?? 0;
        const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        viewport.scrollTo({left: target, behavior: smooth ? 'smooth' : 'auto'});
    };

    return (
        <section className="border-b border-border bg-card py-16 sm:py-20 space-y-6" aria-labelledby="home-history-title">
            {children}
            <div
                className="overflow-x-auto px-4 sm:px-6 pb-4"
                ref={viewportRef}
                tabIndex={0}
                aria-label="Dòng thời gian UAV"
            >
                <ol className="mx-auto flex w-max max-w-none gap-5">
                    {eras.map((era) => (
                        <li
                            className={`home-era w-[280px] shrink-0 rounded-2xl border p-5 transition-colors ${
                                era.current ? 'border-primary bg-uav-red-light/40' : 'border-border bg-slate-50/70'
                            }`}
                            key={era.year}
                        >
                            <article className="flex h-full flex-col gap-3">
                                <span className="tabular-nums text-xs font-extrabold uppercase tracking-widest text-primary">
                                    {era.year}
                                </span>
                                {era.photo ? (
                                    <figure className="space-y-1.5">
                                        <div className="relative h-36 w-full overflow-hidden rounded-xl border border-border">
                                            <Image src={era.photo.src} alt={era.photo.alt} fill className="object-cover" sizes="290px"/>
                                        </div>
                                        <figcaption className="text-[11px] text-slate-500">
                                            <a href={era.photo.source} target="_blank" rel="noopener noreferrer" title="Xem nguồn ảnh trên Wikimedia Commons" className="hover:text-primary">
                                                {era.photo.credit} ↗
                                            </a>
                                        </figcaption>
                                    </figure>
                                ) : (
                                    <div className="flex h-24 items-center justify-center rounded-xl bg-card p-3 text-slate-700 border border-slate-100">
                                        <EraSilhouette icon={era.icon}/>
                                    </div>
                                )}
                                <h3 className="text-base font-bold text-foreground">{era.title}</h3>
                                <p className="text-xs leading-relaxed text-slate-600 flex-1">{era.text}</p>
                                <span className="inline-block self-start rounded-full bg-slate-200/70 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                                    {era.tag}
                                </span>
                            </article>
                        </li>
                    ))}
                </ol>
            </div>
            <div className="mx-auto flex w-full max-w-6xl items-center justify-end gap-2 px-4 sm:px-6">
                <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-sm font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    onClick={() => scroll(-1)}
                    aria-label="Mốc trước"
                >
                    ←
                </button>
                <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-sm font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    onClick={() => scroll(1)}
                    aria-label="Mốc tiếp theo"
                >
                    →
                </button>
            </div>
        </section>
    );
}
