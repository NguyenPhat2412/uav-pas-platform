'use client';

import {useId} from 'react';
import {cn} from '@/lib/utils';

interface ZaloBrandIconProps {
    className?: string;
}

/**
 * Monochrome-capable Zalo speech-bubble vector mark using an SVG mask cutout
 * so it inherits `currentColor` cleanly without clashing electric-blue fills.
 */
export function ZaloBrandIcon({className}: ZaloBrandIconProps) {
    const maskId = useId();
    return (
        <svg
            viewBox="0 0 40 40"
            fill="none"
            aria-hidden="true"
            className={cn('h-5 w-5 shrink-0', className)}
        >
            <defs>
                <mask id={maskId}>
                    <rect width="40" height="40" fill="black" />
                    <path
                        d="M20 4C10.611 4 3 10.768 3 19.118c0 4.66 2.376 8.826 6.112 11.594-.21 1.88-.934 3.746-2.062 5.04-.26.298-.023.758.368.712 2.712-.318 5.424-1.362 7.362-2.616 1.662.454 3.418.704 5.22.704 9.389 0 17-6.768 17-15.434C37 10.768 29.389 4 20 4Z"
                        fill="white"
                    />
                    <text
                        x="20"
                        y="22.5"
                        textAnchor="middle"
                        fill="black"
                        fontSize="10.5"
                        fontWeight="800"
                        fontFamily="system-ui, -apple-system, sans-serif"
                        letterSpacing="-0.3"
                    >
                        Zalo
                    </text>
                </mask>
            </defs>
            <rect width="40" height="40" fill="currentColor" mask={`url(#${maskId})`} />
        </svg>
    );
}
