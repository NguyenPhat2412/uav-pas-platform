'use client';

import Image from 'next/image';
import {useEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {Box, Compass, Download, Eye, Fan, Layers, Maximize2, RotateCcw, ZoomIn, ZoomOut} from 'lucide-react';
import {Button, StatusBadge} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import {
    buildEnterpriseUav3D,
    resolveAirframeClass,
    type UavAirframeClass,
    type UavAttitudeState,
} from '@/utils/uav/uav-3d-model';

type CameraPreset = 'iso' | 'top' | 'front' | 'side';
type ViewerTab = '3d' | 'blueprint' | 'turnaround';

const PRESET_SPHERICAL: Record<CameraPreset, THREE.Spherical> = {
    iso: new THREE.Spherical(5.6, 1.08, 0.72),
    top: new THREE.Spherical(6.2, 0.06, 0),
    front: new THREE.Spherical(5.4, 1.44, Math.PI),
    side: new THREE.Spherical(5.4, 1.44, Math.PI / 2),
};

const AIRFRAME_LABELS: Record<UavAirframeClass, string> = {
    QUADCOPTER_RTK: '4-Rotor RTK',
    HEXACOPTER_SAR: '6-Rotor SAR',
    VTOL_FIXED_WING: 'VTOL Wing',
};

function ThreeUavCanvas({
    serial,
    airframeClass,
    attitude,
    altitudeM,
    speedMps,
    batteryPct,
    preset,
    zoomFactor,
    spinning,
    wireframe,
    expanded,
    rotateHint,
    ariaLabel,
}: {
    serial: string;
    airframeClass: UavAirframeClass;
    attitude?: UavAttitudeState;
    altitudeM?: number | null;
    speedMps?: number | null;
    batteryPct?: number | null;
    preset: CameraPreset;
    zoomFactor: number;
    spinning: boolean;
    wireframe: boolean;
    expanded: boolean;
    rotateHint: string;
    ariaLabel: string;
}) {
    const hostRef = useRef<HTMLDivElement>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const uavRef = useRef<ReturnType<typeof buildEnterpriseUav3D> | null>(null);
    const spinningRef = useRef(spinning);
    const wireframeRef = useRef(wireframe);
    const attitudeRef = useRef<UavAttitudeState | undefined>(attitude);
    const targetSphericalRef = useRef<THREE.Spherical | null>(null);
    const [webglFallback, setWebglFallback] = useState(false);

    useEffect(() => {
        spinningRef.current = spinning;
    }, [spinning]);

    useEffect(() => {
        attitudeRef.current = attitude;
    }, [attitude]);

    useEffect(() => {
        wireframeRef.current = wireframe;
        uavRef.current?.setWireframe(wireframe);
    }, [wireframe]);

    useEffect(() => {
        const base = PRESET_SPHERICAL[preset].clone();
        base.radius = THREE.MathUtils.clamp(base.radius / zoomFactor, 2.6, 10.5);
        targetSphericalRef.current = base;
    }, [preset, zoomFactor]);

    useEffect(() => {
        const element = hostRef.current;
        if (!element) return;

        let renderer: THREE.WebGLRenderer;
        try {
            renderer = new THREE.WebGLRenderer({antialias: true, alpha: false, powerPreference: 'high-performance'});
        } catch {
            queueMicrotask(() => setWebglFallback(true));
            return;
        }

        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.domElement.className = 'block h-full w-full touch-none';
        element.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0b1120);
        scene.fog = new THREE.Fog(0x0b1120, 12, 26);

        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
        const initialSpherical = PRESET_SPHERICAL.iso.clone();
        camera.position.setFromSpherical(initialSpherical);
        cameraRef.current = camera;

        const hemi = new THREE.HemisphereLight(0xe2e8f0, 0x1e293b, 1.35);
        scene.add(hemi);

        const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
        keyLight.position.set(6, 9, 6);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(1024, 1024);
        keyLight.shadow.bias = -0.0005;
        scene.add(keyLight);

        const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.1);
        rimLight.position.set(-6, 4, -5);
        scene.add(rimLight);

        const fillLight = new THREE.DirectionalLight(0xf43f5e, 0.45);
        fillLight.position.set(4, -3, -4);
        scene.add(fillLight);

        const grid = new THREE.GridHelper(16, 32, 0x1e3a8a, 0x172554);
        grid.position.y = -0.92;
        scene.add(grid);

        const padRing = new THREE.Mesh(
            new THREE.RingGeometry(1.75, 1.82, 48),
            new THREE.MeshBasicMaterial({color: 0x38bdf8, transparent: true, opacity: 0.35, side: THREE.DoubleSide}),
        );
        padRing.rotation.x = -Math.PI / 2;
        padRing.position.y = -0.91;
        scene.add(padRing);

        const uav = buildEnterpriseUav3D(0xab2523, airframeClass);
        uav.setWireframe(wireframeRef.current);
        scene.add(uav.root);
        uavRef.current = uav;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(0, -0.05, 0);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.minDistance = 2.4;
        controls.maxDistance = 11;
        controls.maxPolarAngle = Math.PI * 0.52;
        controls.update();
        controlsRef.current = controls;

        const resize = () => {
            const w = element.clientWidth;
            const h = element.clientHeight;
            if (!w || !h) return;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        };
        const observer = new ResizeObserver(resize);
        observer.observe(element);
        resize();

        const clock = new THREE.Clock();
        let elapsed = 0;
        const currentSph = new THREE.Spherical();

        const animate = () => {
            const delta = Math.min(clock.getDelta(), 0.1);
            elapsed += delta;
            uav.update(elapsed, delta, spinningRef.current, attitudeRef.current);

            if (targetSphericalRef.current) {
                const goal = targetSphericalRef.current;
                currentSph.setFromVector3(camera.position.clone().sub(controls.target));
                currentSph.radius = THREE.MathUtils.lerp(currentSph.radius, goal.radius, 0.14);
                currentSph.phi = THREE.MathUtils.lerp(currentSph.phi, goal.phi, 0.14);
                currentSph.theta = THREE.MathUtils.lerp(currentSph.theta, goal.theta, 0.14);
                camera.position.setFromSpherical(currentSph).add(controls.target);
                if (
                    Math.abs(currentSph.radius - goal.radius) < 0.02 &&
                    Math.abs(currentSph.phi - goal.phi) < 0.02 &&
                    Math.abs(currentSph.theta - goal.theta) < 0.02
                ) {
                    targetSphericalRef.current = null;
                }
            }

            controls.update();
            renderer.render(scene, camera);
        };
        renderer.setAnimationLoop(animate);

        return () => {
            observer.disconnect();
            renderer.setAnimationLoop(null);
            controls.dispose();
            uav.dispose();
            grid.geometry.dispose();
            (grid.material as THREE.Material).dispose();
            padRing.geometry.dispose();
            (padRing.material as THREE.Material).dispose();
            renderer.dispose();
            renderer.domElement.remove();
            controlsRef.current = null;
            cameraRef.current = null;
            uavRef.current = null;
        };
    }, [airframeClass]);

    const rotateByKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const controls = controlsRef.current;
        const camera = cameraRef.current;
        if (!controls || !camera) return;
        const step = event.shiftKey ? 0.22 : 0.1;
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
        event.preventDefault();
        const sph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
        if (event.key === 'ArrowLeft') sph.theta -= step;
        if (event.key === 'ArrowRight') sph.theta += step;
        if (event.key === 'ArrowUp') sph.phi = Math.max(0.08, sph.phi - step);
        if (event.key === 'ArrowDown') sph.phi = Math.min(Math.PI * 0.5, sph.phi + step);
        targetSphericalRef.current = sph;
    };

    const pitch = attitude?.pitchDeg ?? (spinning ? -6.4 : 0);
    const roll = attitude?.rollDeg ?? 0;
    const hdg = attitude?.headingDeg ?? 0;
    const gimbalPitch = attitude?.gimbalPitchDeg ?? (spinning ? -65 : -30);

    return (
        <div
            ref={hostRef}
            className={`relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-[#0b1120] text-white select-none cursor-grab active:cursor-grabbing ${expanded ? 'h-[460px]' : 'h-[260px]'}`}
            role="img"
            aria-label={ariaLabel}
            tabIndex={0}
            onKeyDown={rotateByKeyboard}
        >
            {webglFallback && (
                <Image
                    src="/images/uav-blueprint/uav-350-rtk-isometric.jpg"
                    alt={ariaLabel}
                    fill
                    unoptimized
                    className="object-contain p-4"
                />
            )}
            <div className="pointer-events-none absolute left-3 top-2.5 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-slate-900/80 px-2 py-0.5 font-mono text-[10px] font-semibold text-sky-400 backdrop-blur-xs">
                    <span className={`h-1.5 w-1.5 rounded-full ${spinning ? 'bg-sky-400 animate-ping' : 'bg-slate-400'}`}/>
                    3D WEBGL · {serial}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-950/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-300 backdrop-blur-xs">
                    {AIRFRAME_LABELS[airframeClass]}
                </span>
            </div>
            <div className="pointer-events-none absolute right-3 top-2.5 flex flex-col items-end gap-1 font-mono text-[10px]">
                <div className="flex items-center gap-2 rounded-md border border-white/10 bg-slate-900/80 px-2 py-0.5 text-slate-200 backdrop-blur-xs">
                    <Compass size={11} className="text-sky-400"/>
                    <span>P {pitch.toFixed(1)}°</span>
                    <span>R {roll.toFixed(1)}°</span>
                    <span>Y {hdg.toFixed(0)}°</span>
                    <span className="text-amber-300">G {gimbalPitch.toFixed(0)}°</span>
                </div>
                {(altitudeM != null || speedMps != null || batteryPct != null) && (
                    <div className="flex items-center gap-2 rounded-md border border-white/10 bg-slate-900/80 px-2 py-0.5 text-sky-300 backdrop-blur-xs">
                        {altitudeM != null && <span>ALT {altitudeM.toFixed(1)}m</span>}
                        {speedMps != null && <span>SPD {speedMps.toFixed(1)}m/s</span>}
                        {batteryPct != null && (
                            <span className={batteryPct < 25 ? 'text-rose-400 font-bold' : 'text-emerald-300'}>
                                BAT {batteryPct}%
                            </span>
                        )}
                    </div>
                )}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[11px] font-medium text-slate-400">
                {rotateHint}
            </div>
        </div>
    );
}

export function UavModelViewer({
    serial = 'UAV-350-RTK',
    model = 'Enterprise RTK Quadcopter',
    status = 'UNKNOWN',
    airframeClass: explicitAirframe,
    attitude,
    altitudeM,
    speedMps,
    batteryPct,
    compact = false,
}: {
    serial?: string;
    model?: string;
    status?: string;
    airframeClass?: UavAirframeClass;
    attitude?: UavAttitudeState;
    altitudeM?: number | null;
    speedMps?: number | null;
    batteryPct?: number | null;
    compact?: boolean;
}) {
    const isFlying = status === 'IN_USE' || status === 'ACTIVE' || status === 'MISSION';
    const defaultAirframe = resolveAirframeClass(model, serial, explicitAirframe);
    const [selectedAirframe, setSelectedAirframe] = useState<UavAirframeClass | null>(null);
    const activeAirframe = selectedAirframe ?? defaultAirframe;

    const [tab, setTab] = useState<ViewerTab>('3d');
    const [preset, setPreset] = useState<CameraPreset>('iso');
    const [zoom, setZoom] = useState(1);
    const [spinOverride, setSpinOverride] = useState<boolean | null>(null);
    const [wireframe, setWireframe] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const {t} = useI18n();

    const spinning = spinOverride ?? isFlying;

    useEffect(() => {
        if (!expanded) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setExpanded(false);
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [expanded]);

    const reset = () => {
        setPreset('iso');
        setZoom(1);
        setWireframe(false);
        setSpinOverride(null);
        setSelectedAirframe(null);
    };

    const iconBtnClass = 'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-colors';
    const activeIconBtnClass = 'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary bg-primary/10 text-primary cursor-pointer transition-colors';
    const pillClass = (active: boolean) =>
        `inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-bold transition-colors cursor-pointer ${
            active
                ? 'bg-primary text-white shadow-2xs'
                : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`;

    const ariaLabel = `${t('console.viewer.reference')} 3D ${serial}`;

    const renderStage = (isExpanded: boolean) => {
        if (tab === 'blueprint') {
            return (
                <div className={`relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-[#0f172a] ${isExpanded ? 'h-[460px]' : 'h-[260px]'}`}>
                    <Image
                        src="/images/uav-blueprint/uav-orthographic-blueprint.svg"
                        alt={`2D CAD Blueprint ${serial}`}
                        fill
                        unoptimized
                        className="object-contain p-2"
                    />
                </div>
            );
        }
        if (tab === 'turnaround') {
            return (
                <div className={`relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-[#f4f4f6] ${isExpanded ? 'h-[460px]' : 'h-[260px]'}`}>
                    <Image
                        src="/images/uav-blueprint/uav-350-rtk-turnaround.jpg"
                        alt={`2D Turnaround ${serial}`}
                        fill
                        unoptimized
                        className="object-contain p-2"
                    />
                </div>
            );
        }
        return (
            <ThreeUavCanvas
                serial={serial}
                airframeClass={activeAirframe}
                attitude={attitude}
                altitudeM={altitudeM}
                speedMps={speedMps}
                batteryPct={batteryPct}
                preset={preset}
                zoomFactor={zoom}
                spinning={spinning}
                wireframe={wireframe}
                expanded={isExpanded}
                rotateHint={t('console.viewer.rotateHint')}
                ariaLabel={ariaLabel}
            />
        );
    };

    const toolbar = (
        <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {t('console.viewer.reference').toUpperCase()}
                    </span>
                    <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-foreground">{serial}</strong>
                        {model && <span className="text-xs font-medium text-slate-500">· {model}</span>}
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <StatusBadge status={status}/>
                    <div className="flex gap-1">
                        <button
                            type="button"
                            className={spinning ? activeIconBtnClass : iconBtnClass}
                            title="Rotor Spin"
                            aria-label="Rotor Spin"
                            onClick={() => setSpinOverride(!spinning)}
                        >
                            <Fan size={14} className={spinning ? 'animate-spin' : ''}/>
                        </button>
                        <button
                            type="button"
                            className={wireframe ? activeIconBtnClass : iconBtnClass}
                            title="Wireframe Mesh"
                            aria-label="Wireframe Mesh"
                            onClick={() => setWireframe(v => !v)}
                        >
                            <Box size={14}/>
                        </button>
                        <button
                            type="button"
                            className={iconBtnClass}
                            aria-label={t('console.viewer.zoomOut')}
                            onClick={() => setZoom(value => Math.max(0.7, +(value - 0.15).toFixed(2)))}
                        >
                            <ZoomOut size={15}/>
                        </button>
                        <button
                            type="button"
                            className={iconBtnClass}
                            aria-label={t('console.viewer.zoomIn')}
                            onClick={() => setZoom(value => Math.min(1.6, +(value + 0.15).toFixed(2)))}
                        >
                            <ZoomIn size={15}/>
                        </button>
                        <button
                            type="button"
                            className={iconBtnClass}
                            aria-label={t('console.viewer.reset')}
                            onClick={reset}
                        >
                            <RotateCcw size={15}/>
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-slate-100 pt-2">
                <div className="flex flex-wrap items-center gap-1">
                    <button type="button" className={pillClass(tab === '3d' && preset === 'iso')} onClick={() => { setTab('3d'); setPreset('iso'); }}>
                        <Eye size={12}/> 3D (3/4)
                    </button>
                    <button type="button" className={pillClass(tab === '3d' && preset === 'top')} onClick={() => { setTab('3d'); setPreset('top'); }}>
                        Top
                    </button>
                    <button type="button" className={pillClass(tab === '3d' && preset === 'front')} onClick={() => { setTab('3d'); setPreset('front'); }}>
                        Front
                    </button>
                    <button type="button" className={pillClass(tab === '3d' && preset === 'side')} onClick={() => { setTab('3d'); setPreset('side'); }}>
                        Side
                    </button>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                    {(['QUADCOPTER_RTK', 'HEXACOPTER_SAR', 'VTOL_FIXED_WING'] as UavAirframeClass[]).map(cls => (
                        <button
                            key={cls}
                            type="button"
                            className={pillClass(tab === '3d' && activeAirframe === cls)}
                            onClick={() => {
                                setTab('3d');
                                setSelectedAirframe(cls);
                            }}
                        >
                            {AIRFRAME_LABELS[cls]}
                        </button>
                    ))}
                    <button type="button" className={pillClass(tab === 'blueprint')} onClick={() => setTab('blueprint')}>
                        <Layers size={12}/> 2D CAD
                    </button>
                    <button type="button" className={pillClass(tab === 'turnaround')} onClick={() => setTab('turnaround')}>
                        2D Sheet
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <section
                className={`space-y-3 rounded-2xl border border-border bg-card p-4 shadow-xs ${compact ? 'text-xs' : ''}`}
                aria-label={ariaLabel}
            >
                {toolbar}
                {renderStage(false)}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-500">
                    <span>
                        {t('console.viewer.model')} <strong className="text-slate-700">glTF 2.0 / Three.js 3D ({AIRFRAME_LABELS[activeAirframe]})</strong>
                    </span>
                    <div className="flex items-center gap-2">
                        <a
                            href="/models/uav-350-rtk.glb"
                            download="uav-350-rtk.glb"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[11px] font-semibold text-slate-700 no-underline hover:bg-slate-100"
                        >
                            <Download size={13}/> .GLB
                        </a>
                        {!compact && (
                            <Button variant="outline" size="sm" leftIcon={<Maximize2 size={14}/>} onClick={() => setExpanded(true)}>
                                {t('console.viewer.expand')}
                            </Button>
                        )}
                    </div>
                </div>
            </section>
            {expanded && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
                    role="dialog"
                    aria-modal="true"
                    aria-label={ariaLabel}
                >
                    <div className="w-full max-w-4xl space-y-4 rounded-2xl border border-border bg-card p-6 shadow-2xl">
                        <header className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <strong className="text-base font-bold text-foreground">{serial}</strong>
                                {model && <span className="text-xs text-slate-500">· {model}</span>}
                            </div>
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
                        {renderStage(true)}
                    </div>
                </div>
            )}
        </>
    );
}
