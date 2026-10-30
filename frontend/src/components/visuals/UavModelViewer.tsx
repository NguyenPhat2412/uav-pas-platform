'use client';
import {useEffect, useRef, useState} from 'react';
import {Maximize2, RotateCcw, ZoomIn, ZoomOut} from 'lucide-react';
import {Button, StatusBadge} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';

export function UavModelViewer({serial = 'UAV', status = 'UNKNOWN', compact = false}: {
    serial?: string;
    status?: string;
    compact?: boolean
}) {
    const initial = {x: -12, y: -24};
    const [rotation, setRotation] = useState(initial);
    const [zoom, setZoom] = useState(1);
    const [expanded, setExpanded] = useState(false);
    const pointer = useRef<{ x: number; y: number } | null>(null);
    const {t} = useI18n();
    useEffect(() => {
        if (!expanded) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setExpanded(false);
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [expanded]);
    const move = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!pointer.current) return;
        setRotation(current => ({
            x: Math.max(-28, Math.min(20, current.x + (event.clientY - pointer.current!.y) * -0.2)),
            y: current.y + (event.clientX - pointer.current!.x) * 0.35
        }));
        pointer.current = {x: event.clientX, y: event.clientY};
    };
    const reset = () => {
        setRotation(initial);
        setZoom(1);
    };
    const rotateByKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const step = event.shiftKey ? 12 : 6;
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
        event.preventDefault();
        setRotation(current => ({
            x: Math.max(-28, Math.min(20, current.x + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0))),
            y: current.y + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0),
        }));
    };
    const iconBtnClass = "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer";
    const stage = (
        <div
            className="relative flex min-h-[220px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-900 text-white select-none cursor-grab active:cursor-grabbing"
            role="img"
            aria-label={`${t('console.viewer.reference')} 3D ${serial}`}
            tabIndex={0}
            onKeyDown={rotateByKeyboard}
            onPointerDown={event => {
                pointer.current = {x: event.clientX, y: event.clientY};
                event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={move}
            onPointerUp={() => {
                pointer.current = null;
            }}
            onPointerCancel={() => {
                pointer.current = null;
            }}
        >
            <div
                className="relative h-28 w-28"
                style={{transform: 'translate(-50%, -50%) scale(' + zoom + ') rotateX(' + rotation.x + 'deg) rotateY(' + rotation.y + 'deg)', position: 'absolute', top: '50%', left: '50%'}}
            >
                <div className="absolute inset-6 rounded-2xl border border-rose-400/50 bg-slate-800 shadow-lg flex items-center justify-center">
                    <span className="h-3 w-3 rounded-full bg-primary ring-2 ring-rose-300"/>
                    <span className="absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-uav-blue animate-pulse"/>
                    <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse"/>
                </div>
                <div className="absolute left-0 top-0 h-8 w-8 rounded-full border border-sky-400/40 bg-sky-500/10 animate-spin"/>
                <div className="absolute right-0 top-0 h-8 w-8 rounded-full border border-sky-400/40 bg-sky-500/10 animate-spin"/>
                <div className="absolute bottom-0 left-0 h-8 w-8 rounded-full border border-sky-400/40 bg-sky-500/10 animate-spin"/>
                <div className="absolute bottom-0 right-0 h-8 w-8 rounded-full border border-sky-400/40 bg-sky-500/10 animate-spin"/>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[11px] font-medium text-slate-400">
                {t('console.viewer.rotateHint')}
            </div>
        </div>
    );
    const toolbar = (
        <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {t('console.viewer.reference').toUpperCase()}
                </span>
                <strong className="text-sm font-bold text-foreground">{serial}</strong>
            </div>
            <StatusBadge status={status}/>
            <div className="flex gap-1">
                <button type="button" className={iconBtnClass} aria-label={t('console.viewer.zoomOut')}
                        onClick={() => setZoom(value => Math.max(.75, value - .1))}><ZoomOut size={15}/></button>
                <button type="button" className={iconBtnClass} aria-label={t('console.viewer.zoomIn')}
                        onClick={() => setZoom(value => Math.min(1.35, value + .1))}><ZoomIn size={15}/></button>
                <button type="button" className={iconBtnClass} aria-label={t('console.viewer.reset')} onClick={reset}>
                    <RotateCcw size={15}/></button>
            </div>
        </div>
    );
    return (
        <>
            <section
                className={`space-y-3 rounded-2xl border border-border bg-card p-4 shadow-xs ${compact ? 'text-xs' : ''}`}
                aria-label={`${t('console.viewer.reference')} 3D ${serial}`}
            >
                {toolbar}
                {stage}
                {!compact && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-500">
                        <span>{t('console.viewer.model')} <strong className="text-slate-700">CSS reference</strong></span>
                        <span>{t('console.viewer.license')} <strong className="text-slate-700">{t('console.viewer.internalOriginal')}</strong></span>
                        <Button variant="outline" size="sm" leftIcon={<Maximize2 size={14}/>} onClick={() => setExpanded(true)}>
                            {t('console.viewer.expand')}
                        </Button>
                    </div>
                )}
            </section>
            {expanded && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`${t('console.viewer.reference')} 3D ${serial}`}
                >
                    <div className="w-full max-w-2xl space-y-4 rounded-2xl border border-border bg-card p-6 shadow-2xl">
                        <header className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <strong className="text-base font-bold text-foreground">{serial}</strong>
                            <button
                                type="button"
                                className={iconBtnClass}
                                aria-label={t('console.viewer.close')}
                                onClick={() => setExpanded(false)}
                            >
                                ×
                            </button>
                        </header>
                        {toolbar}
                        {stage}
                    </div>
                </div>
            )}
        </>
    );
}
