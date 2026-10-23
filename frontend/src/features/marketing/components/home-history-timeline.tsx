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
        <section className="home-section home-history" aria-labelledby="home-history-title">
            {children}
            <div className="home-track-viewport" ref={viewportRef} tabIndex={0} aria-label="Dòng thời gian UAV">
                <ol className="home-track">
                    {eras.map((era) => (
                        <li className={era.current ? 'home-era is-current' : 'home-era'} key={era.year}>
                            <article className="home-era-card">
                                <span className="home-era-year">{era.year}</span>
                                {era.photo
                                    ? <figure className="home-era-photo">
                                        <div className="home-era-photo-frame"><Image src={era.photo.src} alt={era.photo.alt} fill sizes="290px"/></div>
                                        <figcaption><a href={era.photo.source} target="_blank" rel="noopener noreferrer" title="Xem nguồn ảnh trên Wikimedia Commons">{era.photo.credit} ↗</a></figcaption>
                                    </figure>
                                    : <div className="home-era-icon"><EraSilhouette icon={era.icon}/></div>}
                                <h3>{era.title}</h3>
                                <p>{era.text}</p>
                                <span className="home-era-tag">{era.tag}</span>
                            </article>
                        </li>
                    ))}
                </ol>
            </div>
            <div className="shell home-track-controls">
                <button type="button" className="home-track-button" onClick={() => scroll(-1)} aria-label="Mốc trước">←</button>
                <button type="button" className="home-track-button" onClick={() => scroll(1)} aria-label="Mốc tiếp theo">→</button>
            </div>
        </section>
    );
}
