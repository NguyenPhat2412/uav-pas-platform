import {cn} from '@/lib/utils';

interface ZaloBrandIconProps {
    className?: string;
}

/**
 * Clean vector Zalo speech-bubble badge mark for direct Zalo messaging actions.
 */
export function ZaloBrandIcon({className}: ZaloBrandIconProps) {
    return (
        <svg
            viewBox="0 0 40 40"
            fill="none"
            aria-hidden="true"
            className={cn('h-5 w-5 shrink-0', className)}
        >
            <path
                d="M20 4C10.611 4 3 10.768 3 19.118c0 4.66 2.376 8.826 6.112 11.594-.21 1.88-.934 3.746-2.062 5.04-.26.298-.023.758.368.712 2.712-.318 5.424-1.362 7.362-2.616 1.662.454 3.418.704 5.22.704 9.389 0 17-6.768 17-15.434C37 10.768 29.389 4 20 4Z"
                fill="currentColor"
            />
            <text
                x="20"
                y="22.5"
                textAnchor="middle"
                fill="#0068FF"
                fontSize="10.5"
                fontWeight="800"
                fontFamily="system-ui, -apple-system, sans-serif"
                letterSpacing="-0.3"
            >
                Zalo
            </text>
        </svg>
    );
}
