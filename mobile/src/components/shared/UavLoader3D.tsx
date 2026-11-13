import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, AccessibilityInfo, StyleSheet, View} from 'react-native';
import {requireOptionalNativeModule} from 'expo-modules-core';
import type {ExpoWebGLRenderingContext, GLViewProps} from 'expo-gl';
import * as THREE from 'three';
import {AppText} from '@/components/ui';
import {colors, spacing} from '@/styles/tokens';

/**
 * The web portals' UavLoader (customer/src/utils/digital-twin/uav-3d-loader.ts) on the phone: the same Three.js
 * quadcopter (carbon fuselage, crimson canopy, gimbal camera, skids, counter-rotating rotors, strobe LEDs, ground
 * ring), drawn through expo-gl instead of a DOM canvas. Falls back to a spinner when GL cannot start.
 */
function buildScene() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(4.5, 3.2, 4.7);
    camera.lookAt(0, -0.1, 0);
    scene.add(new THREE.HemisphereLight(0xe2e8f0, 0x1e293b, 1.35));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(6, 10, 7);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.1);
    rimLight.position.set(-6, 4, -5);
    scene.add(rimLight);

    const uav = new THREE.Group();
    scene.add(uav);
    const carbon = new THREE.MeshStandardMaterial({color: 0x1e293b, roughness: 0.42, metalness: 0.45});
    const darkMetal = new THREE.MeshStandardMaterial({color: 0x0f172a, roughness: 0.3, metalness: 0.7});
    const crimson = new THREE.MeshStandardMaterial({color: 0xab2523, roughness: 0.35, metalness: 0.25});
    const silver = new THREE.MeshStandardMaterial({color: 0xe2e8f0, roughness: 0.25, metalness: 0.65});
    const lens = new THREE.MeshStandardMaterial({color: 0x2563eb, roughness: 0.15, metalness: 0.85});
    const blade = new THREE.MeshStandardMaterial({color: 0x334155, roughness: 0.35, metalness: 0.4, transparent: true, opacity: 0.9});
    const rotorDisc = new THREE.MeshBasicMaterial({color: 0x94a3b8, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false});
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        parent.add(mesh);
        return mesh;
    };

    add(uav, new THREE.BoxGeometry(1.15, 0.36, 1.55), carbon);
    add(uav, new THREE.BoxGeometry(0.86, 0.2, 1.12), crimson, 0, 0.24, -0.04);
    add(uav, new THREE.CylinderGeometry(0.18, 0.2, 0.08, 20), silver, 0, 0.38, -0.15);
    add(uav, new THREE.CylinderGeometry(0.12, 0.14, 0.22, 16), darkMetal, 0, -0.22, 0.52);
    add(uav, new THREE.SphereGeometry(0.2, 20, 20), darkMetal, 0, -0.34, 0.56);
    add(uav, new THREE.CylinderGeometry(0.09, 0.09, 0.08, 16), lens, 0, -0.34, 0.73).rotation.x = Math.PI / 2;
    for (const side of [-0.48, 0.48]) {
        add(uav, new THREE.CylinderGeometry(0.035, 0.035, 1.45, 12), darkMetal, side, -0.58, 0).rotation.x = Math.PI / 2;
        for (const z of [-0.42, 0.42]) {
            add(uav, new THREE.CylinderGeometry(0.03, 0.03, 0.48, 10), carbon, side * 0.88, -0.36, z).rotation.z = side > 0 ? -0.22 : 0.22;
        }
    }

    const rotors: THREE.Object3D[] = [];
    const leds: THREE.Mesh[] = [];
    const arms: [number, number, boolean][] = [[1.25, 1.25, true], [-1.25, 1.25, false], [1.25, -1.25, false], [-1.25, -1.25, true]];
    for (const [x, z, clockwise] of arms) {
        add(uav, new THREE.BoxGeometry(0.14, 0.11, 1.82), carbon, x * 0.5, 0.02, z * 0.5).rotation.y = Math.atan2(x, z);
        add(uav, new THREE.CylinderGeometry(0.2, 0.18, 0.22, 20), darkMetal, x, 0.14, z);
        const hub = new THREE.Group();
        hub.position.set(x, 0.28, z);
        add(hub, new THREE.BoxGeometry(1.55, 0.025, 0.14), blade).rotation.z = clockwise ? 0.06 : -0.06;
        add(hub, new THREE.BoxGeometry(0.14, 0.025, 1.55), blade).rotation.x = clockwise ? 0.06 : -0.06;
        add(hub, new THREE.ConeGeometry(0.08, 0.12, 16), silver, 0, 0.05, 0);
        add(hub, new THREE.CircleGeometry(0.78, 28), rotorDisc).rotation.x = -Math.PI / 2;
        uav.add(hub);
        rotors.push(hub);
        // Front LEDs crimson, rear LEDs sky blue.
        leds.push(add(uav, new THREE.SphereGeometry(0.075, 12, 12), new THREE.MeshBasicMaterial({color: z > 0 ? 0xef4444 : 0x38bdf8}), x, 0.01, z));
    }

    const ringMat = new THREE.MeshBasicMaterial({color: 0xab2523, transparent: true, opacity: 0.28, side: THREE.DoubleSide});
    const ring = add(scene, new THREE.RingGeometry(1.15, 1.32, 48), ringMat, 0, -1.05, 0);
    ring.rotation.x = -Math.PI / 2;

    /** Advances the hover, banking, 360° turn, rotor spin, strobes and ring by `delta` seconds. */
    let elapsed = 0;
    const step = (delta: number, slow: boolean) => {
        elapsed += delta * (slow ? 0.25 : 1);
        const hoverY = Math.sin(elapsed * 2.6) * 0.14;
        uav.position.y = hoverY;
        uav.rotation.set(Math.sin(elapsed * 1.8) * 0.07, elapsed * 0.65, Math.cos(elapsed * 1.4) * 0.08);
        const spin = delta * (slow ? 8 : 32);
        rotors.forEach((rotor, idx) => { rotor.rotation.y += idx === 0 || idx === 3 ? spin : -spin; });
        const strobe = Math.floor(elapsed * 2.2) % 2 === 0;
        leds.forEach((led, idx) => { led.visible = idx < 2 ? strobe : !strobe; });
        const scale = 1 - hoverY * 0.22;
        ring.scale.set(scale, scale, 1);
        ringMat.opacity = 0.24 - hoverY * 0.08;
    };
    return {scene, camera, step};
}

const HAS_NATIVE_GL = requireOptionalNativeModule('ExpoGL') != null;

export function UavLoader3D({size = 140, label}: { size?: number; label?: string }) {
    const [failed, setFailed] = useState(!HAS_NATIVE_GL);
    const [GlComponent, setGlComponent] = useState<React.ComponentType<GLViewProps> | null>(null);
    const mountedRef = useRef(true);
    const frame = useRef<number | null>(null);
    const cleanup = useRef<(() => void) | null>(null);
    const slowRef = useRef(false);

    useEffect(() => {
        mountedRef.current = true;
        void AccessibilityInfo.isReduceMotionEnabled().then(reduce => { slowRef.current = reduce; }).catch(() => undefined);
        if (HAS_NATIVE_GL) {
            void import('expo-gl')
                .then(mod => {
                    if (mountedRef.current) setGlComponent(() => mod.GLView);
                })
                .catch(() => {
                    if (mountedRef.current) setFailed(true);
                });
        }
        return () => {
            mountedRef.current = false;
            if (frame.current != null) {
                cancelAnimationFrame(frame.current);
                frame.current = null;
            }
            cleanup.current?.();
            cleanup.current = null;
        };
    }, []);

    // Must stay synchronous: expo-gl calls this outside React's normal JS turn, and code after an `await` here may never
    // run, which left the canvas blank. Reduce Motion is read ahead of time in the effect instead.
    const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
        try {
            if (!mountedRef.current) return;
            const {drawingBufferWidth: width, drawingBufferHeight: height} = gl;
            // three expects a canvas; expo-gl has none, so hand it a minimal stand-in around the GL context.
            const canvas = {width, height, style: {}, clientHeight: height, addEventListener: () => {}, removeEventListener: () => {}, getContext: () => gl};
            const renderer = new THREE.WebGLRenderer({canvas: canvas as unknown as HTMLCanvasElement, context: gl as unknown as WebGL2RenderingContext, alpha: true, antialias: true});
            renderer.setPixelRatio(1);
            renderer.setSize(width, height, false);
            renderer.setClearColor(0x000000, 0);
            renderer.outputColorSpace = THREE.SRGBColorSpace;
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.15;
            const {scene, camera, step} = buildScene();
            cleanup.current = () => {
                scene.traverse(obj => {
                    if (obj instanceof THREE.Mesh) {
                        obj.geometry.dispose();
                        (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => m.dispose());
                    }
                });
                renderer.dispose();
            };
            let lastMs = performance.now();
            const render = () => {
                if (!mountedRef.current) return;
                const nowMs = performance.now();
                const delta = Math.min(Math.max(0, (nowMs - lastMs) / 1000), 0.1);
                lastMs = nowMs;
                step(delta, slowRef.current);
                renderer.render(scene, camera);
                gl.endFrameEXP();
                if (mountedRef.current) frame.current = requestAnimationFrame(render);
            };
            render();
        } catch {
            if (mountedRef.current) setFailed(true);
        }
    };

    return (
        <View style={styles.wrap} accessibilityRole="progressbar" accessibilityLabel={label}>
            <View style={{width: size, height: size}}>
                {failed || !GlComponent
                    ? <View style={styles.fallback}><ActivityIndicator color={colors.primary}/></View>
                    : <GlComponent style={{width: size, height: size}} onContextCreate={onContextCreate}/>}
            </View>
            {label ? <AppText variant="caption" style={styles.label}>{label}</AppText> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {alignItems: 'center', gap: spacing.sm},
    fallback: {flex: 1, alignItems: 'center', justifyContent: 'center'},
    label: {fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: colors.textSecondary},
});
