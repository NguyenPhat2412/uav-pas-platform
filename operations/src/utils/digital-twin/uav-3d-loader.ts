import * as THREE from 'three';

export interface Uav3dLoaderScene {
    dispose: () => void;
}

/**
 * Mounts an interactive-quality 3D quadcopter UAV WebGL scene inside the given host element
 * for UavLoader. Returns null if WebGL is unavailable (e.g. headless test runner).
 */
export function mountUav3dLoader(host: HTMLElement, size: number): Uav3dLoaderScene | null {
    let renderer: THREE.WebGLRenderer;
    try {
        renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: 'low-power',
        });
    } catch {
        return null;
    }

    const reducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    renderer.setPixelRatio(Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2));
    renderer.setSize(size, size, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.className = 'block select-none pointer-events-none';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(4.5, 3.2, 4.7);
    camera.lookAt(0, -0.1, 0);

    // 3-point studio lighting for crisp 3D depth on airframe, gimbal, skids and rotors
    scene.add(new THREE.HemisphereLight(0xe2e8f0, 0x1e293b, 1.35));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(6, 10, 7);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.1);
    rimLight.position.set(-6, 4, -5);
    scene.add(rimLight);

    const uav = new THREE.Group();
    scene.add(uav);

    // Shared materials (palette-compliant: carbon slate, crimson #ab2523, sky blue #2563eb, metallic silver)
    const carbonMat = new THREE.MeshStandardMaterial({color: 0x1e293b, roughness: 0.42, metalness: 0.45});
    const darkMetalMat = new THREE.MeshStandardMaterial({color: 0x0f172a, roughness: 0.3, metalness: 0.7});
    const crimsonMat = new THREE.MeshStandardMaterial({color: 0xab2523, roughness: 0.35, metalness: 0.25});
    const silverMat = new THREE.MeshStandardMaterial({color: 0xe2e8f0, roughness: 0.25, metalness: 0.65});
    const lensMat = new THREE.MeshStandardMaterial({color: 0x2563eb, roughness: 0.15, metalness: 0.85});
    const bladeMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.35,
        metalness: 0.4,
        transparent: true,
        opacity: 0.9,
    });
    const rotorDiscMat = new THREE.MeshBasicMaterial({
        color: 0x94a3b8,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
    });

    // 1. Main fuselage & upper crimson canopy shell
    const coreBody = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.36, 1.55), carbonMat);
    uav.add(coreBody);

    const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.2, 1.12), crimsonMat);
    canopy.position.set(0, 0.24, -0.04);
    uav.add(canopy);

    const gpsPuck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.08, 20), silverMat);
    gpsPuck.position.set(0, 0.38, -0.15);
    uav.add(gpsPuck);

    // 2. Front 3-axis gimbal & optical/thermal camera payload
    const gimbalMount = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.22, 16), darkMetalMat);
    gimbalMount.position.set(0, -0.22, 0.52);
    uav.add(gimbalMount);

    const cameraBall = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 20), darkMetalMat);
    cameraBall.position.set(0, -0.34, 0.56);
    uav.add(cameraBall);

    const cameraLens = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 16), lensMat);
    cameraLens.rotation.x = Math.PI / 2;
    cameraLens.position.set(0, -0.34, 0.73);
    uav.add(cameraLens);

    // 3. Dual 3D landing skids underneath
    for (const side of [-0.48, 0.48]) {
        const skidBar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.45, 12), darkMetalMat);
        skidBar.rotation.x = Math.PI / 2;
        skidBar.position.set(side, -0.58, 0);
        uav.add(skidBar);

        for (const zOffset of [-0.42, 0.42]) {
            const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.48, 10), carbonMat);
            strut.position.set(side * 0.88, -0.36, zOffset);
            strut.rotation.z = side > 0 ? -0.22 : 0.22;
            uav.add(strut);
        }
    }

    // 4. Four diagonal motor arms, brushless motor bells, spinning 3D blades & LED beacons
    const rotors: THREE.Object3D[] = [];
    const leds: THREE.Mesh[] = [];
    const armCoords: [number, number, boolean][] = [
        [1.25, 1.25, true],
        [-1.25, 1.25, false],
        [1.25, -1.25, false],
        [-1.25, -1.25, true],
    ];

    for (const [x, z, isFrontRightOrRearLeft] of armCoords) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 1.82), carbonMat);
        arm.position.set(x * 0.5, 0.02, z * 0.5);
        arm.rotation.y = Math.atan2(x, z);
        uav.add(arm);

        const motorBell = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.22, 20), darkMetalMat);
        motorBell.position.set(x, 0.14, z);
        uav.add(motorBell);

        const rotorHub = new THREE.Group();
        rotorHub.position.set(x, 0.28, z);

        const blade1 = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.025, 0.14), bladeMat);
        blade1.rotation.z = isFrontRightOrRearLeft ? 0.06 : -0.06;
        rotorHub.add(blade1);

        const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, 1.55), bladeMat);
        blade2.rotation.x = isFrontRightOrRearLeft ? 0.06 : -0.06;
        rotorHub.add(blade2);

        const spinnerCap = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.12, 16), silverMat);
        spinnerCap.position.y = 0.05;
        rotorHub.add(spinnerCap);

        const blurDisc = new THREE.Mesh(new THREE.CircleGeometry(0.78, 28), rotorDiscMat);
        blurDisc.rotation.x = -Math.PI / 2;
        rotorHub.add(blurDisc);

        uav.add(rotorHub);
        rotors.push(rotorHub);

        // Front LEDs crimson, rear LEDs aviation sky-blue
        const ledColor = z > 0 ? 0xef4444 : 0x38bdf8;
        const ledMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.075, 12, 12),
            new THREE.MeshBasicMaterial({color: ledColor}),
        );
        ledMesh.position.set(x, 0.01, z);
        uav.add(ledMesh);
        leds.push(ledMesh);
    }

    // 5. Ground telemetry ring below the hovering UAV
    const ringMat = new THREE.MeshBasicMaterial({
        color: 0xab2523,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
    });
    const groundRing = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.32, 48), ringMat);
    groundRing.rotation.x = -Math.PI / 2;
    groundRing.position.y = -1.05;
    scene.add(groundRing);

    const clock = new THREE.Clock();
    let elapsed = 0;

    const renderFrame = () => {
        const delta = Math.min(clock.getDelta(), 0.1);
        const speed = reducedMotion ? 0.25 : 1;
        elapsed += delta * speed;

        // 3D hover bobbing + gentle banking + 360-degree showcase rotation
        const hoverY = Math.sin(elapsed * 2.6) * 0.14;
        uav.position.y = hoverY;
        uav.rotation.y = elapsed * 0.65;
        uav.rotation.x = Math.sin(elapsed * 1.8) * 0.07;
        uav.rotation.z = Math.cos(elapsed * 1.4) * 0.08;

        // Counter-rotating 3D rotors
        const spinStep = delta * (reducedMotion ? 8 : 32);
        rotors.forEach((rotor, idx) => {
            rotor.rotation.y += idx === 0 || idx === 3 ? spinStep : -spinStep;
        });

        // Alternating strobe LEDs
        const strobePhase = Math.floor(elapsed * 2.2) % 2 === 0;
        leds.forEach((led, idx) => {
            led.visible = idx < 2 ? strobePhase : !strobePhase;
        });

        // Ground ring scales subtly with hover height
        const ringScale = 1 - hoverY * 0.22;
        groundRing.scale.set(ringScale, ringScale, 1);
        ringMat.opacity = 0.24 - hoverY * 0.08;

        renderer.render(scene, camera);
    };

    renderer.setAnimationLoop(renderFrame);

    const onVisibilityChange = () => {
        if (document.hidden) {
            renderer.setAnimationLoop(null);
        } else {
            clock.getDelta();
            renderer.setAnimationLoop(renderFrame);
        }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return {
        dispose: () => {
            document.removeEventListener('visibilitychange', onVisibilityChange);
            renderer.setAnimationLoop(null);
            scene.traverse(obj => {
                if (obj instanceof THREE.Mesh) {
                    obj.geometry.dispose();
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(m => m.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
            });
            renderer.dispose();
            renderer.domElement.remove();
        },
    };
}
