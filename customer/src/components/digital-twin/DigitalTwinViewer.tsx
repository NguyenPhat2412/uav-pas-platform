'use client';

import {useEffect, useImperativeHandle, useRef, type Ref} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {buildCampusModel} from '@/utils/digital-twin/campus-model';

/** Camera moves the overlay buttons ask for; each one glides there in about a third of a second. */
export interface DigitalTwinHandle {
    orbit: (radians: number) => void;
    tilt: (radians: number) => void;
    zoom: (factor: number) => void;
    north: () => void;
    top: () => void;
    reset: () => void;
}

const TARGET = new THREE.Vector3(0, 12, 0);
const HOME = new THREE.Spherical(250, 1.02, 0.62);
const MIN_RADIUS = 60;
const MAX_RADIUS = 430;
const MIN_PHI = 0.05;
const MAX_PHI = 1.42;
const GLIDE_SECONDS = 0.35;

const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * The three.js stage of the digital twin: renderer, orbit camera and the sample district. It sizes itself
 * to its parent, pauses while the browser tab is hidden and frees every GPU resource on unmount.
 */
export function DigitalTwinViewer({apiRef, autoRotate, showPaths, onReady, onError}: {
    apiRef?: Ref<DigitalTwinHandle>;
    autoRotate: boolean;
    showPaths: boolean;
    onReady?: () => void;
    onError?: () => void;
}) {
    const host = useRef<HTMLDivElement>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const pathsRef = useRef<THREE.Group | null>(null);
    const glideRef = useRef<((to: Partial<{ radius: number; phi: number; theta: number }>) => void) | null>(null);
    const callbacks = useRef({onReady, onError});

    useEffect(() => {
        callbacks.current = {onReady, onError};
    }, [onReady, onError]);

    useImperativeHandle(apiRef, () => {
        const current = () => {
            const controls = controlsRef.current;
            return controls ? new THREE.Spherical().setFromVector3(controls.object.position.clone().sub(controls.target)) : HOME.clone();
        };
        const glide = (to: Partial<{ radius: number; phi: number; theta: number }>) => glideRef.current?.(to);
        return {
            orbit: radians => glide({theta: current().theta + radians}),
            tilt: radians => glide({phi: current().phi + radians}),
            zoom: factor => glide({radius: current().radius * factor}),
            north: () => glide({theta: 0}),
            top: () => glide({phi: MIN_PHI, theta: 0}),
            reset: () => glide({radius: HOME.radius, phi: HOME.phi, theta: HOME.theta}),
        };
    }, []);

    useEffect(() => {
        const element = host.current;
        if (!element) return;
        let renderer: THREE.WebGLRenderer;
        try {
            renderer = new THREE.WebGLRenderer({antialias: true, powerPreference: 'high-performance'});
        } catch {
            callbacks.current.onError?.();
            return;
        }
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.domElement.className = 'block h-full w-full touch-none';
        element.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x050814);
        scene.fog = new THREE.Fog(0x050814, 420, 900);
        const camera = new THREE.PerspectiveCamera(40, 1, 1, 2000);
        camera.position.setFromSpherical(HOME).add(TARGET);

        scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x1e293b, 1.1));
        const sun = new THREE.DirectionalLight(0xffffff, 2.4);
        sun.position.set(120, 190, 90);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        Object.assign(sun.shadow.camera, {left: -130, right: 130, top: 130, bottom: -130, near: 10, far: 500});
        sun.shadow.bias = -0.0005;
        scene.add(sun);

        // the blue "blueprint" floor the model sits on
        const grid = new THREE.GridHelper(1200, 120, 0x1d4ed8, 0x0f2347);
        grid.position.y = -6.05;
        scene.add(grid);

        const model = buildCampusModel();
        scene.add(model.root);
        pathsRef.current = model.paths;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.copy(TARGET);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.minDistance = MIN_RADIUS;
        controls.maxDistance = MAX_RADIUS;
        controls.minPolarAngle = MIN_PHI;
        controls.maxPolarAngle = MAX_PHI;
        controls.autoRotateSpeed = 0.6;
        controls.update();
        controlsRef.current = controls;

        let glide: { from: THREE.Spherical; to: THREE.Spherical; t: number } | null = null;
        glideRef.current = to => {
            const from = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
            const target = new THREE.Spherical(
                THREE.MathUtils.clamp(to.radius ?? from.radius, MIN_RADIUS, MAX_RADIUS),
                THREE.MathUtils.clamp(to.phi ?? from.phi, MIN_PHI, MAX_PHI),
                from.theta + wrapAngle((to.theta ?? from.theta) - from.theta),
            );
            glide = {from, to: target, t: reducedMotion ? 1 : 0};
        };

        const resize = () => {
            const {clientWidth: w, clientHeight: h} = element;
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
        let ready = false;
        const step = new THREE.Spherical();
        const frame = () => {
            const delta = Math.min(clock.getDelta(), 0.1);
            elapsed += reducedMotion ? delta * 0.35 : delta;
            model.update(elapsed, delta);
            if (glide) {
                glide.t = Math.min(1, glide.t + delta / GLIDE_SECONDS);
                const k = 1 - Math.pow(1 - glide.t, 3);
                step.set(
                    THREE.MathUtils.lerp(glide.from.radius, glide.to.radius, k),
                    THREE.MathUtils.lerp(glide.from.phi, glide.to.phi, k),
                    THREE.MathUtils.lerp(glide.from.theta, glide.to.theta, k),
                );
                camera.position.setFromSpherical(step).add(controls.target);
                if (glide.t >= 1) glide = null;
            }
            controls.update(delta);
            renderer.render(scene, camera);
            if (!ready) {
                ready = true;
                callbacks.current.onReady?.();
            }
        };
        renderer.setAnimationLoop(frame);
        // No frames while the tab is hidden; on return the clock skips the gap instead of jumping the scene.
        const visibility = () => {
            if (document.hidden) {
                renderer.setAnimationLoop(null);
            } else {
                clock.getDelta();
                renderer.setAnimationLoop(frame);
            }
        };
        document.addEventListener('visibilitychange', visibility);

        return () => {
            document.removeEventListener('visibilitychange', visibility);
            observer.disconnect();
            renderer.setAnimationLoop(null);
            controls.dispose();
            model.dispose();
            grid.geometry.dispose();
            (grid.material as THREE.Material).dispose();
            renderer.dispose();
            renderer.domElement.remove();
            controlsRef.current = null;
            pathsRef.current = null;
            glideRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (controlsRef.current) controlsRef.current.autoRotate = autoRotate;
    }, [autoRotate]);

    useEffect(() => {
        if (pathsRef.current) pathsRef.current.visible = showPaths;
    }, [showPaths]);

    return <div ref={host} className="absolute inset-0"/>;
}
