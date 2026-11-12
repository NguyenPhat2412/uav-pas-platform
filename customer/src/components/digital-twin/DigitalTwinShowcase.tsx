'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import {useEffect, useRef, useState, type ReactNode} from 'react';
import {
    ArrowDown,
    ArrowUp,
    Box,
    Camera,
    Expand,
    Minus,
    Plus,
    RefreshCw,
    Route,
    RotateCcw,
    RotateCw,
    Shrink,
    Workflow,
} from 'lucide-react';
import {UavLoader} from '@/components/ui/UavLoader';
import {UavModelViewer} from '@/components/visuals/UavModelViewer';
import {useI18n} from '@/providers/I18nContext';
import {cn} from '@/lib/utils';
import type {DigitalTwinHandle} from '@/components/digital-twin/DigitalTwinViewer';

// three.js only runs in the browser; the page shell renders first and the stage streams in.
const DigitalTwinViewer = dynamic(() => import('@/components/digital-twin/DigitalTwinViewer').then(m => m.DigitalTwinViewer), {ssr: false});

const STEP = Math.PI / 12;
const panel = 'rounded-xl border border-white/10 bg-slate-950/70 backdrop-blur-md';
const keyClass = 'inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-slate-900/80 text-sm font-bold text-slate-100 transition-colors hover:border-white/30 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-primary';

function Key({label, onClick, pressed, children}: { label: string; onClick: () => void; pressed?: boolean; children: ReactNode }) {
    return <button type="button" aria-label={label} title={label} aria-pressed={pressed} onClick={onClick}
                   className={cn(keyClass, pressed && 'border-primary bg-primary/30 text-white')}>{children}</button>;
}

/** The public digital-twin page: full-bleed 3D stage with VNPT-style controls, then how a real twin is made. */
export function DigitalTwinShowcase() {
    const {t} = useI18n();
    const stage = useRef<HTMLElement>(null);
    const viewer = useRef<DigitalTwinHandle>(null);
    const [ready, setReady] = useState(false);
    const [failed, setFailed] = useState(false);
    const [autoRotate, setAutoRotate] = useState(true);
    const [showPaths, setShowPaths] = useState(true);
    const [fullscreen, setFullscreen] = useState(false);

    useEffect(() => {
        const sync = () => setFullscreen(document.fullscreenElement === stage.current);
        document.addEventListener('fullscreenchange', sync);
        return () => document.removeEventListener('fullscreenchange', sync);
    }, []);

    const toggleFullscreen = () => {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void stage.current?.requestFullscreen?.();
    };
    // Any button press hands the camera to the user, as a drag does.
    const move = (action: (handle: DigitalTwinHandle) => void) => {
        setAutoRotate(false);
        if (viewer.current) action(viewer.current);
    };

    const legend = [
        ['bg-[#ab2523]', t('digitalTwin.legend.tower')],
        ['bg-[#fb7185]', t('digitalTwin.legend.patrol')],
        ['bg-[#a3e635]', t('digitalTwin.legend.survey')],
        ['bg-[#facc15]', t('digitalTwin.legend.pad')],
    ] as const;
    const steps = [
        [Camera, 'capture'],
        [Workflow, 'process'],
        [Box, 'operate'],
    ] as const;

    return (
        <>
            <section ref={stage} aria-label={t('digitalTwin.badge')}
                     className="relative h-[calc(100svh-7rem)] min-h-[540px] overflow-hidden bg-[#050814] text-slate-100">
                {!failed && <DigitalTwinViewer apiRef={viewer} autoRotate={autoRotate} showPaths={showPaths}
                                               onReady={() => setReady(true)} onError={() => setFailed(true)}/>}
                {!ready && !failed && <UavLoader className="absolute inset-0 text-slate-200" label={t('digitalTwin.loading')}/>}
                {failed && <p role="alert" className="absolute inset-0 m-0 flex items-center justify-center p-6 text-center text-sm text-slate-300">{t('digitalTwin.webglError')}</p>}

                <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-start gap-2 p-3 sm:p-5">
                    <span className={cn(panel, 'pointer-events-auto px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em]')}>{t('digitalTwin.badge')}</span>
                    <div role="toolbar" aria-label={t('digitalTwin.controls.toolbar')} className={cn(panel, 'pointer-events-auto flex gap-1.5 p-1.5')}>
                        <Key label={t(fullscreen ? 'digitalTwin.controls.exitFullscreen' : 'digitalTwin.controls.fullscreen')} onClick={toggleFullscreen}>
                            {fullscreen ? <Shrink size={16}/> : <Expand size={16}/>}
                        </Key>
                        <Key label={t('digitalTwin.controls.autoRotate')} pressed={autoRotate} onClick={() => setAutoRotate(on => !on)}>
                            <RefreshCw size={16}/>
                        </Key>
                        <Key label={t('digitalTwin.controls.paths')} pressed={showPaths} onClick={() => setShowPaths(on => !on)}>
                            <Route size={16}/>
                        </Key>
                    </div>
                </div>

                <aside className={cn(panel, 'absolute right-3 top-3 hidden w-60 p-4 sm:right-5 sm:top-5 lg:block')}>
                    <h2 className="m-0 text-xs font-bold uppercase tracking-wider text-slate-300">{t('digitalTwin.legend.title')}</h2>
                    <ul className="mt-3 space-y-2 p-0 text-[13px] text-slate-200">
                        {legend.map(([swatch, label]) => (
                            <li key={label} className="flex list-none items-center gap-2.5"><span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', swatch)}/>{label}</li>
                        ))}
                    </ul>
                    <p className="m-0 mt-3 border-t border-white/10 pt-3 text-[11.5px] leading-5 text-slate-400">{t('digitalTwin.sampleNote')}</p>
                </aside>

                <p className={cn(panel, 'absolute bottom-3 left-3 m-0 hidden max-w-[calc(100%-13rem)] px-4 py-2.5 text-[13px] text-slate-200 sm:bottom-5 sm:left-5 sm:block')}>
                    {t('digitalTwin.hint')}
                </p>

                <div role="group" aria-label={t('digitalTwin.controls.pad')}
                     className={cn(panel, 'absolute bottom-3 right-3 grid grid-cols-3 gap-1.5 p-2 sm:bottom-5 sm:right-5')}>
                    <Key label={t('digitalTwin.controls.zoomIn')} onClick={() => move(v => v.zoom(0.8))}><Plus size={16}/></Key>
                    <Key label={t('digitalTwin.controls.tiltUp')} onClick={() => move(v => v.tilt(-STEP / 2))}><ArrowUp size={16}/></Key>
                    <Key label={t('digitalTwin.controls.north')} onClick={() => move(v => v.north())}>N</Key>
                    <Key label={t('digitalTwin.controls.rotateLeft')} onClick={() => move(v => v.orbit(-STEP))}><RotateCcw size={16}/></Key>
                    <Key label={t('digitalTwin.controls.reset')} onClick={() => move(v => v.reset())}>R</Key>
                    <Key label={t('digitalTwin.controls.rotateRight')} onClick={() => move(v => v.orbit(STEP))}><RotateCw size={16}/></Key>
                    <Key label={t('digitalTwin.controls.zoomOut')} onClick={() => move(v => v.zoom(1.25))}><Minus size={16}/></Key>
                    <Key label={t('digitalTwin.controls.tiltDown')} onClick={() => move(v => v.tilt(STEP / 2))}><ArrowDown size={16}/></Key>
                    <Key label={t('digitalTwin.controls.top')} onClick={() => move(v => v.top())}>T</Key>
                </div>
            </section>

            <section className="bg-background px-4 py-14 sm:px-6">
                <div className="mx-auto max-w-5xl space-y-10">
                    <UavModelViewer serial="UAV-350-RTK" model="Enterprise RTK Quadcopter" status="IN_USE"/>
                    <div>
                        <h2 className="m-0 text-center text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{t('digitalTwin.explainer.title')}</h2>
                    <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 text-slate-600">{t('digitalTwin.explainer.subtitle')}</p>
                    <ol className="mt-10 grid gap-4 p-0 sm:grid-cols-3">
                        {steps.map(([Icon, key], index) => (
                            <li key={key} className="list-none rounded-panel border border-border bg-card p-5">
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon size={20}/></span>
                                <h3 className="mb-1.5 mt-4 text-base font-bold text-slate-900">{index + 1}. {t(`digitalTwin.explainer.${key}.title`)}</h3>
                                <p className="m-0 text-sm leading-6 text-slate-600">{t(`digitalTwin.explainer.${key}.body`)}</p>
                            </li>
                        ))}
                    </ol>
                    <div className="mt-10 flex justify-center">
                        <Link href="/contact" className="inline-flex h-11 items-center rounded-control bg-primary px-6 text-sm font-bold text-white transition-colors hover:bg-primary-hover">
                            {t('digitalTwin.explainer.cta')}
                        </Link>
                    </div>
                    </div>
                </div>
            </section>
        </>
    );
}
