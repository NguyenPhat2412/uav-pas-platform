'use client';

import React, {useEffect, useRef} from 'react';
import {cn} from '@/lib/utils';
import {getPresentationLocale} from '@/lib/presentation';
import {mountUav3dLoader} from '@/utils/digital-twin/uav-3d-loader';

const defaultLabels = {vi: 'Đang tải...', en: 'Loading…', ja: '読み込み中…'} as const;

/**
 * Full-page and panel loading state powered by a real-time Three.js 3D quadcopter UAV model
 * (carbon-slate fuselage, crimson canopy, 3-axis gimbal camera, landing skids, and counter-rotating
 * 3D propellers). Gracefully falls back to a ring indicator when WebGL is unavailable.
 */
export function UavLoader({
    label,
    size = 140,
    className,
    fullScreen = false,
}: {
    label?: string;
    size?: number;
    className?: string;
    fullScreen?: boolean;
}) {
    const hostRef = useRef<HTMLDivElement>(null);
    const text = label || defaultLabels[getPresentationLocale()];

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;
        const scene = mountUav3dLoader(host, size);
        return () => {
            scene?.dispose();
        };
    }, [size]);

    return (
        <div
            role="status"
            aria-label={text}
            data-loader-mode="3d-uav"
            className={cn(
                'flex flex-col items-center justify-center gap-3 text-foreground/80',
                fullScreen && 'min-h-screen bg-background',
                className,
            )}
        >
            <div
                ref={hostRef}
                style={{width: size, height: size}}
                className="relative flex items-center justify-center overflow-visible [&:has(canvas)>.uav-loader-fallback]:hidden"
                aria-hidden="true"
            >
                <div className="uav-loader-fallback h-12 w-12 animate-spin rounded-full border-2 border-slate-300 border-t-primary" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{text}</span>
        </div>
    );
}
