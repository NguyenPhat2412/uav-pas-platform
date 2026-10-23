'use client';

import {useEffect, useRef} from 'react';
import {keepVietnamesePhrases} from "@/lib/typography";

const ROUTE = 'M10 110 C 140 110, 170 40, 260 40 S 400 110, 510 100 S 640 30, 760 34 S 900 90, 990 70';

// A small drone flies along the route as the section scrolls through the viewport, lighting each stage it passes.
export function ProcessRoute({steps}: { steps: { number: string; title: string; text: string }[] }) {
    const rootRef = useRef<HTMLDivElement>(null);
    const baseRef = useRef<SVGPathElement>(null);
    const liveRef = useRef<SVGPathElement>(null);
    const droneRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const root = rootRef.current, base = baseRef.current, live = liveRef.current, drone = droneRef.current;
        if (!root || !base || !live || !drone) return;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const svg = base.ownerSVGElement!;
        const items = Array.from(root.querySelectorAll<HTMLElement>('.home-step'));
        const length = base.getTotalLength();
        live.style.strokeDasharray = `${length}`;
        const update = () => {
            const rect = root.getBoundingClientRect(), vh = window.innerHeight;
            const p = reduce ? 1 : Math.min(1, Math.max(0, (vh * 0.75 - rect.top) / (vh * 0.45 + rect.height * 0.3)));
            live.style.strokeDashoffset = `${length * (1 - p)}`;
            const point = base.getPointAtLength(length * p), box = svg.getBoundingClientRect(), wrap = root.getBoundingClientRect();
            drone.style.left = `${box.left - wrap.left + point.x * box.width / 1000}px`;
            drone.style.top = `${box.top - wrap.top + point.y * box.height / 140}px`;
            items.forEach((item, i) => item.classList.toggle('is-lit', p >= (i + 0.5) / items.length - 0.08));
        };
        update();
        window.addEventListener('scroll', update, {passive: true});
        window.addEventListener('resize', update);
        return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
    }, []);

    return (
        <div className="home-route" ref={rootRef}>
            <svg className="home-route-line" viewBox="0 0 1000 140" preserveAspectRatio="none" aria-hidden="true">
                <path ref={baseRef} className="home-route-base" d={ROUTE}/>
                <path ref={liveRef} className="home-route-live" d={ROUTE}/>
            </svg>
            <svg ref={droneRef} className="home-route-drone" viewBox="-14 -14 28 28" width="30" height="30" aria-hidden="true">
                <g fill="#fff" stroke="#ab2523" strokeWidth="1.8"><circle cx="-8" cy="-8" r="4.5"/><circle cx="8" cy="-8" r="4.5"/><circle cx="-8" cy="8" r="4.5"/><circle cx="8" cy="8" r="4.5"/></g>
                <rect x="-4" y="-4" width="8" height="8" rx="2" fill="#ab2523"/>
            </svg>
            <ol className="home-steps">
                {steps.map((step) => (
                    <li className="home-step" key={step.number}>
                        <span className="home-mono">Chặng {step.number}</span>
                        <h3>{keepVietnamesePhrases(step.title)}</h3>
                        <p>{step.text}</p>
                    </li>
                ))}
            </ol>
        </div>
    );
}
