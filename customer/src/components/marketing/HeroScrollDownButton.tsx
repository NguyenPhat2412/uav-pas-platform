'use client';

import type {MouseEvent} from 'react';
import {ChevronDown} from 'lucide-react';

interface HeroScrollDownButtonProps {
    targetId?: string;
}

/**
 * Centered Hero scroll-down CTA with animated mouse-wheel + cascading chevrons
 * and smooth eased scrolling to the target landing section.
 */
export function HeroScrollDownButton({targetId = 'home-overview'}: HeroScrollDownButtonProps) {
    const handleScrollDown = (event: MouseEvent<HTMLAnchorElement>) => {
        const target = document.getElementById(targetId);
        if (!target) return;
        event.preventDefault();

        const headerOffset = 72;
        const startY = window.scrollY;
        const targetY = Math.max(0, target.getBoundingClientRect().top + startY - headerOffset);

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            window.scrollTo({top: targetY});
            window.history.replaceState(null, '', `#${targetId}`);
            return;
        }

        const distance = targetY - startY;
        const duration = 760;
        let startTime: number | null = null;

        const step = (timestamp: number) => {
            if (startTime === null) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased =
                progress < 0.5
                    ? 4 * progress * progress * progress
                    : 1 - Math.pow(-2 * progress + 2, 3) / 2;

            window.scrollTo(0, startY + distance * eased);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                window.history.replaceState(null, '', `#${targetId}`);
            }
        };

        window.requestAnimationFrame(step);
    };

    return (
        <a
            href={`#${targetId}`}
            onClick={handleScrollDown}
            aria-label="Cuộn xuống phần giới thiệu"
            className="group absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2 rounded-2xl px-5 py-2 text-center text-white/85 transition-all duration-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
            <span className="flex flex-col items-center" aria-hidden="true">
                <span className="flex h-8 w-5 items-start justify-center rounded-full border border-white/45 bg-white/5 p-1 backdrop-blur-xs transition-colors duration-300 group-hover:border-[#e2c18b]">
                    <span className="h-2 w-1 rounded-full bg-[#e2c18b] animate-uav-scroll-wheel" />
                </span>
                <span className="-mt-0.5 flex flex-col items-center leading-none text-[#e2c18b]">
                    <ChevronDown className="h-4 w-4 animate-uav-scroll-chevron" strokeWidth={2.4} />
                    <ChevronDown className="-mt-2.5 h-4 w-4 animate-uav-scroll-chevron-delay" strokeWidth={2.4} />
                </span>
            </span>
        </a>
    );
}
