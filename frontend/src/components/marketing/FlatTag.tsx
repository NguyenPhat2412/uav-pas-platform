import type {ReactNode} from 'react';

const tones = {
    red: 'border-primary text-primary',
    blue: 'border-uav-blue text-uav-blue',
    amber: 'border-warning text-warning',
} as const;

/** Flat card label: a short colour bar and small caps, in place of rounded pill badges. */
export function FlatTag({children, tone = 'red'}: { children: ReactNode; tone?: keyof typeof tones }) {
    return <span className={`inline-flex items-center self-start border-l-2 pl-2 text-[11px] font-bold uppercase leading-tight tracking-wider ${tones[tone]}`}>
        {children}
    </span>;
}
