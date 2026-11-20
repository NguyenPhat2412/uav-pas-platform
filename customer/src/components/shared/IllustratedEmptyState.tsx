'use client';

import type {ReactNode} from 'react';
import type {LucideIcon} from 'lucide-react';

export function IllustratedEmptyState({
    imageSrc,
    imageAlt,
    icon: Icon,
    title,
    description,
    action,
}: {
    imageSrc: string;
    imageAlt: string;
    icon: LucideIcon;
    title: string;
    description: string;
    action: ReactNode;
}) {
    return (
        <div
            role="status"
            className="flex flex-col items-center justify-center gap-3.5 px-5 py-12 text-center"
        >
            <div className="relative mb-1">
                <div className="h-28 w-44 overflow-hidden rounded-panel border border-slate-200 bg-uav-red-light shadow-2xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={imageSrc}
                        alt={imageAlt}
                        className="h-full w-full object-cover"
                    />
                </div>
                <span className="absolute -right-2.5 -bottom-2.5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-4 ring-white">
                    <Icon size={18} strokeWidth={2} aria-hidden="true"/>
                </span>
            </div>

            <div className="max-w-md space-y-1">
                <h2 className="m-0 text-base font-semibold text-slate-900">{title}</h2>
                <p className="m-0 text-xs leading-relaxed text-slate-500">{description}</p>
            </div>

            <div className="pt-1">{action}</div>
        </div>
    );
}
