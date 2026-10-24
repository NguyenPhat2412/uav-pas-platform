'use client';

import {useEffect, useRef, useState} from 'react';

// Map-style grid reference drawn along the visual's edges.
const gridColumns = ['A', 'B', 'C', 'D', 'E', 'F'];
const gridRows = ['1', '2', '3', '4', '5'];

// Decorative low-poly quadcopter over a wireframe terrain, loaded once the browser is idle.
// Falls back to a photo when WebGL is unavailable.
export function HeroDroneScene() {
    const hostRef = useRef<HTMLDivElement>(null);
    const [fallback, setFallback] = useState(false);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let disposed = false;
        let cleanup = () => {};
        const idle = window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 200));
        const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;

        const idleHandle = idle(() => import('three').then((THREE) => {
            if (disposed) return;
            let renderer: InstanceType<typeof THREE.WebGLRenderer>;
            try {
                renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
            } catch {
                setFallback(true);
                return;
            }
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            renderer.setClearColor(0x000000, 0);
            host.appendChild(renderer.domElement);

            const scene = new THREE.Scene();
            scene.fog = new THREE.Fog(0xfaf6f6, 16, 42);
            const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
            scene.add(new THREE.HemisphereLight(0xffffff, 0xe9dede, 1.6));
            const key = new THREE.DirectionalLight(0xffffff, 1.6);
            key.position.set(6, 10, 8);
            scene.add(key);
            const warm = new THREE.DirectionalLight(0xffd6d0, 0.8);
            warm.position.set(-6, 3, -4);
            scene.add(warm);

            const height = (x: number, z: number) => Math.sin(x * 0.16) * 1.1 + Math.cos(z * 0.21) * 0.9 + Math.sin((x + z) * 0.08) * 1.7 - 3.2;
            const terrainGeo = new THREE.PlaneGeometry(80, 80, 64, 64);
            terrainGeo.rotateX(-Math.PI / 2);
            const tp = terrainGeo.attributes.position;
            for (let i = 0; i < tp.count; i++) tp.setY(i, height(tp.getX(i), tp.getZ(i)));
            const wire = new THREE.WireframeGeometry(terrainGeo);
            scene.add(new THREE.LineSegments(wire, new THREE.LineBasicMaterial({color: 0xc7b3b3, transparent: true, opacity: 0.55})));

            const waypoints = [[-15, -9], [-8, -2], [-2, -7], [4, -1], [9, -6], [15, 2], [21, -4]]
                .map(([x, z]) => new THREE.Vector3(x, height(x, z) + 2.6, z));
            const curvePoints = new THREE.CatmullRomCurve3(waypoints).getPoints(400);
            const pathGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
            scene.add(new THREE.Line(pathGeo, new THREE.LineBasicMaterial({color: 0xab2523})));
            const ringMat = new THREE.MeshBasicMaterial({color: 0xab2523, side: THREE.DoubleSide, transparent: true, opacity: 0.85});
            const poleMat = new THREE.LineBasicMaterial({color: 0xab2523, transparent: true, opacity: 0.25});
            waypoints.forEach((p) => {
                const ring = new THREE.Mesh(new THREE.RingGeometry(0.26, 0.36, 32), ringMat);
                ring.rotation.x = -Math.PI / 2;
                ring.position.copy(p);
                scene.add(ring);
                scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([p, new THREE.Vector3(p.x, p.y - 2.6, p.z)]), poleMat));
            });

            const drone = new THREE.Group();
            const shell = new THREE.MeshStandardMaterial({color: 0xffffff, metalness: 0.15, roughness: 0.4});
            const dark = new THREE.MeshStandardMaterial({color: 0x2a2f3a, metalness: 0.4, roughness: 0.5});
            const red = new THREE.MeshStandardMaterial({color: 0xab2523, metalness: 0.2, roughness: 0.45});
            drone.add(new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.34, 1.6), shell));
            const dome = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), shell);
            dome.scale.set(0.95, 0.45, 1.25);
            dome.position.y = 0.16;
            drone.add(dome);
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.17, 0.07, 0.46), red);
            stripe.position.set(0, 0.05, 0.25);
            drone.add(stripe);
            const gps = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.1, 24), dark);
            gps.position.set(0, 0.46, -0.1);
            drone.add(gps);
            const props: { group: InstanceType<typeof THREE.Group>; dir: number }[] = [];
            [45, 135, 225, 315].forEach((deg, index) => {
                const a = deg * Math.PI / 180, dx = Math.sin(a), dz = Math.cos(a);
                const arm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.11, 1.7), dark);
                arm.position.set(dx * 0.95, 0.02, dz * 0.95);
                arm.rotation.y = a;
                drone.add(arm);
                const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.22, 20), dark);
                motor.position.set(dx * 1.8, 0.1, dz * 1.8);
                drone.add(motor);
                const prop = new THREE.Group();
                prop.position.set(dx * 1.8, 0.25, dz * 1.8);
                prop.add(new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.02, 0.1), dark));
                const disc = new THREE.Mesh(new THREE.CircleGeometry(0.6, 40), new THREE.MeshBasicMaterial({color: 0x2a2f3a, transparent: true, opacity: 0.08, side: THREE.DoubleSide}));
                disc.rotation.x = -Math.PI / 2;
                prop.add(disc);
                drone.add(prop);
                props.push({group: prop, dir: index % 2 ? 1 : -1});
                const led = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({color: dz > 0 ? 0xe0322c : 0x004ac6}));
                led.position.set(dx * 1.8, -0.04, dz * 1.8);
                drone.add(led);
            });
            const gimbal = new THREE.Mesh(new THREE.SphereGeometry(0.19, 20, 14), dark);
            gimbal.position.set(0, -0.3, 0.6);
            drone.add(gimbal);
            [-0.45, 0.45].forEach((x) => {
                const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), dark);
                leg.position.set(x, -0.38, 0);
                leg.rotation.z = x > 0 ? -0.25 : 0.25;
                drone.add(leg);
                const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 8), dark);
                skid.rotation.x = Math.PI / 2;
                skid.position.set(x * 1.25, -0.62, 0);
                drone.add(skid);
            });
            const cone = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.2, 40, 1, true), new THREE.MeshBasicMaterial({color: 0xab2523, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false}));
            cone.position.y = -1.9;
            drone.add(cone);
            scene.add(drone);

            const resize = () => {
                const w = host.clientWidth, h = host.clientHeight;
                if (!w || !h) return;
                renderer.setSize(w, h, false);
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
            };
            resize();
            const resizeObserver = new ResizeObserver(() => { resize(); if (reduce) render(0); });
            resizeObserver.observe(host);

            let mx = 0, my = 0, tx = 0, ty = 0;
            const onMove = (event: PointerEvent) => {
                const r = host.getBoundingClientRect();
                mx = ((event.clientX - r.left) / r.width) * 2 - 1;
                my = ((event.clientY - r.top) / r.height) * 2 - 1;
            };
            const onLeave = () => { mx = 0; my = 0; };
            host.addEventListener('pointermove', onMove);
            host.addEventListener('pointerleave', onLeave);

            let visible = true;
            const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
            io.observe(host);

            function render(t: number) {
                tx += (mx - tx) * 0.05;
                ty += (my - ty) * 0.05;
                drone.position.set(tx * 0.4, 1.4 + Math.sin(t * 1.5) * 0.14, 0);
                drone.rotation.set(ty * 0.18 + 0.12, -0.6 + Math.sin(t * 0.35) * 0.25 + tx * 0.4, -tx * 0.28);
                props.forEach(({group, dir}) => { group.rotation.y += 0.9 * dir; });
                pathGeo.setDrawRange(0, reduce ? curvePoints.length : Math.min(curvePoints.length, Math.floor(((t * 0.12) % 1.25) * curvePoints.length)));
                camera.position.set(tx * 0.8, 3.8 - ty * 0.4, 12.5);
                camera.lookAt(0, 0.7, 0);
                renderer.render(scene, camera);
            }

            let frame = 0;
            const start = performance.now();
            const loop = (now: number) => {
                frame = requestAnimationFrame(loop);
                if (!visible) return;
                render((now - start) / 1000);
            };
            if (reduce) render(0); else frame = requestAnimationFrame(loop);

            cleanup = () => {
                cancelAnimationFrame(frame);
                resizeObserver.disconnect();
                io.disconnect();
                host.removeEventListener('pointermove', onMove);
                host.removeEventListener('pointerleave', onLeave);
                scene.traverse((object) => {
                    const mesh = object as InstanceType<typeof THREE.Mesh>;
                    mesh.geometry?.dispose();
                    const material = mesh.material;
                    if (Array.isArray(material)) material.forEach((m) => m.dispose()); else material?.dispose();
                });
                renderer.dispose();
                renderer.domElement.remove();
            };
        }).catch(() => setFallback(true)));

        return () => { disposed = true; cancelIdle(idleHandle); cleanup(); };
    }, []);

    return (
        <div className="relative min-h-[380px] overflow-hidden rounded-2xl border border-border bg-slate-50">
            <div className="absolute inset-0" ref={hostRef} aria-hidden="true"/>
            <div className="pointer-events-none absolute inset-x-4 top-2 flex justify-between tabular-nums text-[10px] text-slate-400" aria-hidden="true">
                {gridColumns.map((label) => <span key={label}>{label}</span>)}
            </div>
            <div className="pointer-events-none absolute inset-y-4 left-2 flex flex-col justify-between tabular-nums text-[10px] text-slate-400" aria-hidden="true">
                {gridRows.map((label) => <span key={label}>{label}</span>)}
            </div>
            <svg className="pointer-events-none absolute right-3 top-3 h-10 w-10" viewBox="-24 -24 48 48" aria-hidden="true">
                <circle r="20" className="fill-white stroke-rose-200"/>
                <path d="M0 -15L5 0H-5z" className="fill-primary"/>
                <path d="M0 15L5 0H-5z" className="fill-slate-300"/>
                <text y="-24" textAnchor="middle" fontSize="7" fontWeight="700" className="fill-primary" dy="-1">B</text>
            </svg>
            <p className="pointer-events-none absolute bottom-2 right-3 text-[10px] text-slate-400" aria-hidden="true">
                Lưới tham chiếu A–F · 1–5
            </p>
        </div>
    );
}
