import type {ReactNode} from 'react';
import {Badge} from '@/components/ui';
import {cn} from '@/lib/utils';

const tones = {
    red: 'border-primary text-primary',
    blue: 'border-uav-blue text-uav-blue',
    amber: 'border-warning text-warning',
} as const;

/** Flat card label: a short colour bar and small caps, in place of rounded pill badges. */
export function FlatTag({
    children,
    tone = 'red',
    className,
}: {
    children: ReactNode;
    tone?: keyof typeof tones;
    className?: string;
}) {
    return (
        <Badge
            variant="outline"
            size="md"
            className={cn(
                'self-start rounded-none border-y-0 border-r-0 border-l-2 bg-transparent py-0 pr-0 pl-2 leading-tight',
                tones[tone],
                className,
            )}
        >
            {children}
        </Badge>
    );
}
