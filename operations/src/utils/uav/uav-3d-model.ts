import * as THREE from 'three';

export type UavAirframeClass = 'QUADCOPTER_RTK' | 'HEXACOPTER_SAR' | 'VTOL_FIXED_WING';

export interface UavAttitudeState {
    pitchDeg?: number;
    rollDeg?: number;
    headingDeg?: number;
    gimbalPitchDeg?: number;
}

export interface EnterpriseUav3D {
    root: THREE.Group;
    rotors: THREE.Object3D[];
    rotorDiscs: THREE.Mesh[];
    gimbal: THREE.Object3D;
    airframeClass: UavAirframeClass;
    update: (elapsed: number, delta: number, spinning: boolean, attitude?: UavAttitudeState) => void;
    setWireframe: (enabled: boolean) => void;
    dispose: () => void;
}

export function resolveAirframeClass(
    model?: string,
    serial?: string,
    explicitClass?: string,
): UavAirframeClass {
    if (
        explicitClass === 'QUADCOPTER_RTK' ||
        explicitClass === 'HEXACOPTER_SAR' ||
        explicitClass === 'VTOL_FIXED_WING'
    ) {
        return explicitClass;
    }
    const text = `${model ?? ''} ${serial ?? ''}`.toUpperCase();
    if (text.includes('VTOL') || text.includes('WING') || text.includes('FIXED') || text.includes('LR-')) {
        return 'VTOL_FIXED_WING';
    }
    if (
        text.includes('HEXA') ||
        text.includes('SAR') ||
        text.includes('600') ||
        text.includes('HEAVY') ||
        text.includes('CARGO') ||
        text.includes('RESCUE')
    ) {
        return 'HEXACOPTER_SAR';
    }
    return 'QUADCOPTER_RTK';
}

function connectStrut(
    from: THREE.Vector3,
    to: THREE.Vector3,
    radiusTop: number,
    radiusBottom: number,
    material: THREE.Material,
): THREE.Mesh {
    const dir = to.clone().sub(from);
    const len = dir.length();
    const geom = new THREE.CylinderGeometry(radiusTop, radiusBottom, len, 16);
    const mesh = new THREE.Mesh(geom, material);
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

/**
 * Builds a detailed 3D enterprise UAV model supporting 3 airframe classes:
 * - QUADCOPTER_RTK (4-rotor industrial RTK survey quadcopter)
 * - HEXACOPTER_SAR (6-rotor heavy-lift Search & Rescue hexacopter with rescue pod)
 * - VTOL_FIXED_WING (Twin-boom fixed-wing VTOL with 4 lift rotors + pusher prop)
 */
export function buildEnterpriseUav3D(
    accentColor = 0xab2523,
    airframeClass: UavAirframeClass = 'QUADCOPTER_RTK',
): EnterpriseUav3D {
    const root = new THREE.Group();

    const hullColor =
        airframeClass === 'HEXACOPTER_SAR'
            ? 0x334155
            : airframeClass === 'VTOL_FIXED_WING'
              ? 0xcbd5e1
              : 0x475569;

    const slateHull = new THREE.MeshStandardMaterial({
        color: hullColor,
        metalness: 0.38,
        roughness: 0.42,
    });
    const darkCarbon = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.48,
        roughness: 0.34,
    });
    const deepBlack = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.35,
        roughness: 0.5,
    });
    const aluminumMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.78,
        roughness: 0.25,
    });
    const copperMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        metalness: 0.85,
        roughness: 0.22,
    });
    const rtkWhiteMat = new THREE.MeshStandardMaterial({
        color: 0xf1f5f9,
        metalness: 0.12,
        roughness: 0.28,
    });
    const sarAccentMat = new THREE.MeshStandardMaterial({
        color: airframeClass === 'HEXACOPTER_SAR' ? 0xf97316 : 0x0ea5e9,
        metalness: 0.35,
        roughness: 0.32,
    });
    const opticalLensMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        metalness: 0.9,
        roughness: 0.1,
        emissive: 0x0369a1,
        emissiveIntensity: 0.25,
    });
    const thermalLensMat = new THREE.MeshStandardMaterial({
        color: 0xe11d48,
        metalness: 0.82,
        roughness: 0.16,
        emissive: accentColor,
        emissiveIntensity: 0.3,
    });
    const frontLedMat = new THREE.MeshBasicMaterial({color: 0xf43f5e});
    const rearLedMat = new THREE.MeshBasicMaterial({color: 0x38bdf8});
    const tipStripeMat = new THREE.MeshBasicMaterial({
        color: airframeClass === 'HEXACOPTER_SAR' ? 0xf97316 : 0xe2e8f0,
    });
    const discMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.09,
        side: THREE.DoubleSide,
        depthWrite: false,
    });

    const allMaterials: THREE.Material[] = [
        slateHull,
        darkCarbon,
        deepBlack,
        aluminumMat,
        copperMat,
        rtkWhiteMat,
        sarAccentMat,
        opticalLensMat,
        thermalLensMat,
        frontLedMat,
        rearLedMat,
        tipStripeMat,
        discMat,
    ];

    // 1. Central Fuselage & Avionics Core
    const bodyGroup = new THREE.Group();
    root.add(bodyGroup);

    const mainCore = new THREE.Mesh(
        new THREE.BoxGeometry(
            airframeClass === 'VTOL_FIXED_WING' ? 0.78 : 1.12,
            0.48,
            airframeClass === 'VTOL_FIXED_WING' ? 2.15 : 1.68,
        ),
        slateHull,
    );
    mainCore.position.set(0, 0.14, 0);
    mainCore.castShadow = true;
    mainCore.receiveShadow = true;
    bodyGroup.add(mainCore);

    const upperCrown = new THREE.Mesh(
        new THREE.BoxGeometry(
            airframeClass === 'VTOL_FIXED_WING' ? 0.64 : 0.92,
            0.16,
            1.42,
        ),
        airframeClass === 'HEXACOPTER_SAR' ? sarAccentMat : slateHull,
    );
    upperCrown.position.set(0, 0.44, -0.04);
    upperCrown.castShadow = true;
    bodyGroup.add(upperCrown);

    // Side fairings & cooling louvers
    for (const side of [-1, 1]) {
        const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.36, 1.2), slateHull);
        cheek.position.set(side * (airframeClass === 'VTOL_FIXED_WING' ? 0.42 : 0.58), 0.14, -0.06);
        cheek.castShadow = true;
        bodyGroup.add(cheek);
    }

    // Carbon Top Deck & Heatsink Fins
    const topDeck = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 1.16), darkCarbon);
    topDeck.position.set(0, 0.53, -0.05);
    topDeck.castShadow = true;
    bodyGroup.add(topDeck);

    for (let i = -3; i <= 3; i++) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.035, 0.03), aluminumMat);
        fin.position.set(0, 0.565, -0.12 + i * 0.1);
        bodyGroup.add(fin);
    }

    // Rear Dual Hot-Swap Battery Bays
    for (const side of [-1, 1]) {
        const bat = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.52), deepBlack);
        bat.position.set(side * 0.21, 0.14, 0.68);
        bat.castShadow = true;
        bodyGroup.add(bat);
    }

    // Front Nose Cone & Binocular Vision Sensors
    const noseCone = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.36, 0.28), darkCarbon);
    noseCone.position.set(0, 0.13, airframeClass === 'VTOL_FIXED_WING' ? -1.16 : -0.92);
    noseCone.castShadow = true;
    bodyGroup.add(noseCone);

    for (const side of [-1, 1]) {
        const nz = airframeClass === 'VTOL_FIXED_WING' ? -1.3 : -1.06;
        const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 20), aluminumMat);
        bezel.rotation.x = Math.PI / 2;
        bezel.position.set(side * 0.2, 0.2, nz);
        bodyGroup.add(bezel);

        const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.055, 20), opticalLensMat);
        glass.rotation.x = Math.PI / 2;
        glass.position.set(side * 0.2, 0.2, nz - 0.005);
        bodyGroup.add(glass);
    }

    // 2. Dual RTK GNSS Antennas (Rear-Top)
    for (const side of [-1, 1]) {
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.22, 16), darkCarbon);
        mast.position.set(side * 0.28, 0.62, 0.46);
        bodyGroup.add(mast);

        const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.08, 24), rtkWhiteMat);
        puck.position.set(side * 0.28, 0.76, 0.46);
        puck.castShadow = true;
        bodyGroup.add(puck);
    }

    // 3. Under-Slung 3-Axis Gimbal & Multi-Sensor Camera Payload
    const gimbal = new THREE.Group();
    gimbal.position.set(0, -0.14, -0.38);
    root.add(gimbal);

    const damperPlate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.42), darkCarbon);
    gimbal.add(damperPlate);

    const yawArm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.28, 0.09), aluminumMat);
    yawArm.position.set(0.2, -0.16, 0);
    gimbal.add(yawArm);

    const camHousing = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.32, 0.42), deepBlack);
    camHousing.position.set(0, -0.28, -0.04);
    camHousing.castShadow = true;
    gimbal.add(camHousing);

    const eoBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 24), aluminumMat);
    eoBarrel.rotation.x = Math.PI / 2;
    eoBarrel.position.set(-0.07, -0.28, -0.26);
    gimbal.add(eoBarrel);

    const eoGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.084, 0.084, 0.085, 24), opticalLensMat);
    eoGlass.rotation.x = Math.PI / 2;
    eoGlass.position.set(-0.07, -0.28, -0.265);
    gimbal.add(eoGlass);

    const irBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.07, 20), aluminumMat);
    irBarrel.rotation.x = Math.PI / 2;
    irBarrel.position.set(0.1, -0.24, -0.26);
    gimbal.add(irBarrel);

    const irGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.075, 20), thermalLensMat);
    irGlass.rotation.x = Math.PI / 2;
    irGlass.position.set(0.1, -0.24, -0.265);
    gimbal.add(irGlass);

    // Extra SAR Rescue Drop Box for HEXACOPTER_SAR
    if (airframeClass === 'HEXACOPTER_SAR') {
        const rescuePod = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.24, 0.66), sarAccentMat);
        rescuePod.position.set(0, -0.24, 0.34);
        rescuePod.castShadow = true;
        root.add(rescuePod);
    }

    // 4. Dual Carbon-Fiber Landing Skids
    const skidsGroup = new THREE.Group();
    root.add(skidsGroup);

    for (const side of [-1, 1]) {
        const sx = side * 0.96;
        const skidTube = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 2.32, 18), darkCarbon);
        skidTube.rotation.x = Math.PI / 2;
        skidTube.position.set(sx, -0.88, 0);
        skidTube.castShadow = true;
        skidsGroup.add(skidTube);

        for (const sz of [-0.52, 0.52]) {
            const topPt = new THREE.Vector3(side * 0.44, -0.06, sz * 0.85);
            const botPt = new THREE.Vector3(sx, -0.88, sz);
            skidsGroup.add(connectStrut(topPt, botPt, 0.044, 0.04, darkCarbon));
        }
    }

    // 5. Airframe-Specific Wings / Arms & Rotors
    const rotors: THREE.Object3D[] = [];
    const rotorDiscs: THREE.Mesh[] = [];

    const addRotorAssembly = (mx: number, my: number, mz: number, isFront: boolean, bladeRadius = 0.9) => {
        const mountCup = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.13, 22), darkCarbon);
        mountCup.position.set(mx, my - 0.02, mz);
        mountCup.castShadow = true;
        root.add(mountCup);

        const ledRing = new THREE.Mesh(
            new THREE.CylinderGeometry(0.145, 0.145, 0.04, 22),
            isFront ? frontLedMat : rearLedMat,
        );
        ledRing.position.set(mx, my - 0.09, mz);
        root.add(ledRing);

        const stator = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.065, 22), copperMat);
        stator.position.set(mx, my + 0.07, mz);
        root.add(stator);

        const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.16, 0.075, 22), deepBlack);
        bell.position.set(mx, my + 0.12, mz);
        bell.castShadow = true;
        root.add(bell);

        const rotorGroup = new THREE.Group();
        rotorGroup.position.set(mx, my + 0.18, mz);
        rotorGroup.rotation.y = isFront ? Math.PI * 0.18 : -Math.PI * 0.22;
        root.add(rotorGroup);

        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.055, 18), aluminumMat);
        rotorGroup.add(hub);

        for (const dir of [-1, 1]) {
            const blade = new THREE.Mesh(new THREE.BoxGeometry(bladeRadius, 0.016, 0.12), deepBlack);
            blade.position.set(dir * (bladeRadius * 0.52), 0.01, 0);
            blade.rotation.x = dir * 0.11;
            blade.castShadow = true;
            rotorGroup.add(blade);

            const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.018, 0.115), tipStripeMat);
            stripe.position.set(dir * (bladeRadius * 0.9), 0.01, 0);
            stripe.rotation.x = dir * 0.11;
            rotorGroup.add(stripe);
        }

        const disc = new THREE.Mesh(new THREE.RingGeometry(0.13, bladeRadius * 1.02, 32), discMat);
        disc.rotation.x = -Math.PI / 2;
        disc.position.set(mx, my + 0.19, mz);
        root.add(disc);

        rotors.push(rotorGroup);
        rotorDiscs.push(disc);
    };

    if (airframeClass === 'VTOL_FIXED_WING') {
        // Main swept carbon wing + winglets + twin tail booms
        const mainWing = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.06, 0.58), slateHull);
        mainWing.position.set(0, 0.34, 0.08);
        mainWing.castShadow = true;
        root.add(mainWing);

        for (const side of [-1, 1]) {
            const winglet = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.44), sarAccentMat);
            winglet.position.set(side * 2.2, 0.52, 0.12);
            root.add(winglet);

            const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.9, 16), darkCarbon);
            boom.rotation.x = Math.PI / 2;
            boom.position.set(side * 1.35, 0.3, 0.35);
            root.add(boom);

            const vTail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.52, 0.34), slateHull);
            vTail.position.set(side * 1.35, 0.54, 1.72);
            root.add(vTail);

            addRotorAssembly(side * 1.35, 0.32, -0.95, true, 0.72);
            addRotorAssembly(side * 1.35, 0.32, 1.15, false, 0.72);
        }

        const hTail = new THREE.Mesh(new THREE.BoxGeometry(2.76, 0.05, 0.32), slateHull);
        hTail.position.set(0, 0.78, 1.74);
        root.add(hTail);
    } else if (airframeClass === 'HEXACOPTER_SAR') {
        // 6 radial carbon arms at 60-degree intervals
        const radius = 2.25;
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3 + Math.PI / 6;
            const mx = Math.cos(angle) * radius;
            const mz = Math.sin(angle) * radius;
            const shoulder = new THREE.Vector3(mx * 0.24, 0.16, mz * 0.24);
            const motorBase = new THREE.Vector3(mx, 0.3, mz);
            root.add(connectStrut(shoulder, motorBase, 0.062, 0.08, darkCarbon));
            addRotorAssembly(mx, 0.3, mz, mz < 0, 0.76);
        }
    } else {
        // Default QUADCOPTER_RTK: 4 diagonal arms
        const motorCoords: Array<[number, number, boolean]> = [
            [-1.65, -1.65, true],
            [1.65, -1.65, true],
            [-1.65, 1.65, false],
            [1.65, 1.65, false],
        ];
        for (const [mx, mz, isFront] of motorCoords) {
            const shoulder = new THREE.Vector3(mx * 0.28, 0.15, mz * 0.28);
            const motorBase = new THREE.Vector3(mx, 0.3, mz);
            root.add(connectStrut(shoulder, motorBase, 0.068, 0.088, darkCarbon));
            addRotorAssembly(mx, 0.3, mz, isFront, 0.9);
        }
    }

    const update = (
        elapsed: number,
        delta: number,
        spinning: boolean,
        attitude?: UavAttitudeState,
    ) => {
        const speed = spinning ? 28 : 0;
        rotors.forEach((rotor, idx) => {
            if (speed > 0) {
                rotor.rotation.y += delta * speed * (idx % 2 === 0 ? 1 : -1);
            }
        });
        rotorDiscs.forEach(disc => {
            disc.visible = spinning;
        });

        const targetPitchRad = THREE.MathUtils.degToRad(attitude?.pitchDeg ?? 0);
        const targetRollRad = THREE.MathUtils.degToRad(attitude?.rollDeg ?? 0);
        const targetGimbalPitchRad = THREE.MathUtils.degToRad((attitude?.gimbalPitchDeg ?? 0) * 0.35);

        root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, targetPitchRad, 0.12);
        root.rotation.z = THREE.MathUtils.lerp(root.rotation.z, targetRollRad, 0.12);
        gimbal.rotation.x = THREE.MathUtils.lerp(gimbal.rotation.x, targetGimbalPitchRad, 0.12);

        if (spinning) {
            root.position.y = Math.sin(elapsed * 2.6) * 0.04;
            gimbal.rotation.y = Math.sin(elapsed * 0.9) * 0.16;
        } else {
            root.position.y = 0;
            gimbal.rotation.y = 0;
        }
    };

    const setWireframe = (enabled: boolean) => {
        for (const mat of allMaterials) {
            if ('wireframe' in mat) {
                (mat as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial).wireframe = enabled;
            }
        }
    };

    const dispose = () => {
        root.traverse(obj => {
            const mesh = obj as THREE.Mesh;
            mesh.geometry?.dispose();
        });
        for (const mat of allMaterials) {
            mat.dispose();
        }
    };

    return {root, rotors, rotorDiscs, gimbal, airframeClass, update, setWireframe, dispose};
}
