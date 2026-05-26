import React, { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PresentationControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

// ==================== GEOMETRI KANTONG INFUS PIPIH KOTAK ====================
// Bentuknya flat rectangular pouch dengan rounded edges, kayak infusan asli
function createBagGeometry(width, height, depth, radius, segments) {
    const shape = new THREE.Shape();
    const w = width / 2 - radius;
    const h = height / 2 - radius;

    // Bentuk 2D rounded rectangle
    shape.moveTo(-w, -height / 2);
    shape.lineTo(w, -height / 2);
    shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -h);
    shape.lineTo(width / 2, h);
    shape.quadraticCurveTo(width / 2, height / 2, w, height / 2);
    shape.lineTo(-w, height / 2);
    shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, h);
    shape.lineTo(-width / 2, -h);
    shape.quadraticCurveTo(-width / 2, -height / 2, -w, -height / 2);

    // Extrude dengan bevel supaya ada ketebalan dan rounded edges
    const extrudeSettings = {
        steps: 1,
        depth: depth,
        bevelEnabled: true,
        bevelThickness: depth * 0.35,
        bevelSize: radius * 0.6,
        bevelOffset: 0,
        bevelSegments: segments || 6,
    };

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center();
    return geo;
}

// ==================== KANTONG INFUS 3D ====================
function IVBag({ percentage = 100, status = 'monitoring' }) {
    const liquidRef = useRef();
    const liquidSurfaceRef = useRef();
    const currentPercRef = useRef(percentage);

    // Dimensi kantong
    const bagW = 1.4;   // lebar
    const bagH = 2.0;   // tinggi
    const bagD = 0.3;   // kedalaman (pipih)
    const bagR = 0.15;  // corner radius

    // Geometri kantong luar
    const bagGeo = useMemo(() => createBagGeometry(bagW, bagH, bagD, bagR, 6), []);

    // Geometri cairan (sedikit lebih kecil biar di dalam kantong)
    const liquidGeo = useMemo(() => createBagGeometry(bagW * 0.92, bagH * 0.94, bagD * 0.7, bagR * 0.8, 4), []);

    // Material kantong (plastik transparan — TANPA transmission supaya cairan keliatan)
    const bagMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#e2e8f0',
        transparent: true,
        opacity: 0.22,
        roughness: 0.1,
        metalness: 0.0,
        side: THREE.DoubleSide,
        depthWrite: false,
    }), []);

    // Warna cairan berdasarkan persentase (hijau > 50%, kuning 25-50%, merah < 25%)
    const getLiquidColors = (p) => {
        if (p > 50) return { main: '#22c55e', light: '#86efac' };      // Hijau — aman
        if (p > 25) return { main: '#eab308', light: '#fde047' };      // Kuning — waspada
        return { main: '#ef4444', light: '#fca5a5' };                   // Merah — kritis
    };

    const targetColorRef = useRef(new THREE.Color('#22c55e'));
    const targetLightRef = useRef(new THREE.Color('#86efac'));

    // Material cairan — OPAQUE supaya pasti keliatan
    const liquidMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#22c55e',
        roughness: 0.3,
        metalness: 0.05,
        side: THREE.DoubleSide,
    }), []);

    // Material permukaan cairan
    const surfaceMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#86efac',
        side: THREE.DoubleSide,
    }), []);

    // Material label/strip di kantong
    const labelMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#94a3b8',
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
    }), []);

    // Hitung tinggi cairan berdasarkan percentage
    const liquidTotalH = bagH * 0.94;

    useFrame((state) => {
        if (!liquidRef.current) return;

        // Smooth lerp percentage
        const diff = percentage - currentPercRef.current;
        if (Math.abs(diff) > 0.05) {
            currentPercRef.current += diff * 0.04;
        } else {
            currentPercRef.current = percentage;
        }

        const p = Math.max(0, Math.min(100, currentPercRef.current));
        const scaleVal = Math.max(p / 100, 0.001);

        // Scale Y — cairan turun dari atas
        liquidRef.current.scale.y = scaleVal;

        // Posisi: pivot di dasar, geser ke bawah saat scale mengecil
        const bottomY = -liquidTotalH / 2;
        liquidRef.current.position.y = bottomY + (liquidTotalH * scaleVal) / 2;

        // Update warna cairan berdasarkan persentase (smooth transition)
        const colors = getLiquidColors(p);
        targetColorRef.current.set(colors.main);
        targetLightRef.current.set(colors.light);
        liquidMaterial.color.lerp(targetColorRef.current, 0.05);
        surfaceMaterial.color.lerp(targetLightRef.current, 0.05);

        // Permukaan cairan
        if (liquidSurfaceRef.current) {
            const surfaceY = bottomY + liquidTotalH * scaleVal;
            liquidSurfaceRef.current.position.y = surfaceY;
            liquidSurfaceRef.current.visible = p > 1;

            // Gelombang halus
            const time = state.clock.elapsedTime;
            liquidSurfaceRef.current.scale.x = 1 + Math.sin(time * 2.5) * 0.008;
            liquidSurfaceRef.current.scale.z = 1 + Math.cos(time * 2.5) * 0.008;
        }
    });

    return (
        <group scale={1.2} position={[0, 0.2, 0]}>

            {/* === CAIRAN DI DALAM (render duluan) === */}
            <group ref={liquidRef}>
                <mesh geometry={liquidGeo} material={liquidMaterial} renderOrder={0} />
            </group>

            {/* === BADAN KANTONG LUAR (render di atas cairan) === */}
            <mesh geometry={bagGeo} material={bagMaterial} renderOrder={1} />

            {/* === PERMUKAAN CAIRAN === */}
            <mesh ref={liquidSurfaceRef} rotation={[-Math.PI / 2, 0, 0]}
                  scale={[bagW * 0.44 / 0.3, 1, bagD * 0.28 / 0.3]}
                  material={surfaceMaterial}
                  renderOrder={0} />

            {/* === SEAL / LASERAN SAMPING (garis tepi kantong) === */}
            {/* Kiri */}
            <mesh position={[-bagW / 2 + 0.02, 0, 0]}>
                <boxGeometry args={[0.04, bagH * 0.7, bagD * 0.5]} />
                <meshStandardMaterial color="#d1d5db" transparent opacity={0.5} />
            </mesh>
            {/* Kanan */}
            <mesh position={[bagW / 2 - 0.02, 0, 0]}>
                <boxGeometry args={[0.04, bagH * 0.7, bagD * 0.5]} />
                <meshStandardMaterial color="#d1d5db" transparent opacity={0.5} />
            </mesh>

            {/* === PORT BAWAH (tempat keluar cairan) === */}
            {/* Tabung port */}
            <mesh position={[0, -bagH / 2 - 0.15, 0]}>
                <cylinderGeometry args={[0.08, 0.06, 0.25, 12]} />
                <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.4} />
            </mesh>
            {/* Cap port */}
            <mesh position={[0, -bagH / 2 - 0.3, 0]}>
                <cylinderGeometry args={[0.07, 0.05, 0.12, 12]} />
                <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.5} />
            </mesh>

            {/* === HANGER / PENGAIT ATAS === */}
            {/* Tabung leher */}
            <mesh position={[0, bagH / 2 + 0.12, 0]}>
                <cylinderGeometry args={[0.1, 0.12, 0.2, 12]} />
                <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.5} />
            </mesh>
            {/* Lubang gantung */}
            <mesh position={[0, bagH / 2 + 0.3, 0]}>
                <torusGeometry args={[0.13, 0.035, 8, 16]} />
                <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.6} />
            </mesh>

            {/* === DRIP CHAMBER (tabung tetes bawah) === */}
            <mesh position={[0, -bagH / 2 - 0.6, 0]}>
                <cylinderGeometry args={[0.06, 0.06, 0.5, 12]} />
                <meshStandardMaterial
                    color="#e2e8f0"
                    transparent
                    opacity={0.35}
                    roughness={0.1}
                />
            </mesh>
            {/* Drop point (bola kecil di bawah drip chamber) */}
            <mesh position={[0, -bagH / 2 - 0.88, 0]}>
                <sphereGeometry args={[0.04, 8, 8]} />
                <meshStandardMaterial color="#cbd5e1" />
            </mesh>

            {/* === TETESAN ANIMASI === */}
            <DropletAnim percentage={currentPercRef.current} />

            {/* === LABEL STRIP (depan kantong) === */}
            <mesh position={[0, 0.15, bagD / 2 + 0.01]}>
                <planeGeometry args={[bagW * 0.6, 0.25]} />
                {labelMaterial && <primitive object={labelMaterial} attach="material" />}
            </mesh>

            {/* === GARIS TAKAR VOLUME === */}
            {[0.2, 0.45, 0.7, 0.95].map((yFrac, i) => {
                const y = -bagH / 2 + bagH * yFrac;
                return (
                    <group key={i}>
                        {/* Garis kiri */}
                        <mesh position={[-bagW / 2 + 0.15, y, bagD / 2 + 0.02]}>
                            <boxGeometry args={[0.12, 0.01, 0.005]} />
                            <meshStandardMaterial color="#64748b" />
                        </mesh>
                        {/* Garis kanan */}
                        <mesh position={[bagW / 2 - 0.15, y, bagD / 2 + 0.02]}>
                            <boxGeometry args={[0.12, 0.01, 0.005]} />
                            <meshStandardMaterial color="#64748b" />
                        </mesh>
                    </group>
                );
            })}
        </group>
    );
}

// ==================== ANIMASI TETESAN ====================
function DropletAnim({ percentage }) {
    const dropRef = useRef();
    const trailRef = useRef();
    const dropMatRef = useRef();
    const trailMatRef = useRef();

    const getColor = (p) => {
        if (p > 50) return '#22c55e';
        if (p > 25) return '#eab308';
        return '#ef4444';
    };

    useFrame((state) => {
        if (!dropRef.current) return;
        const time = state.clock.elapsedTime;
        const cycle = (time * 1.5) % 2.5;

        // Update warna tetesan
        const color = getColor(percentage);
        if (dropMatRef.current) dropMatRef.current.color.set(color);
        if (trailMatRef.current) trailMatRef.current.color.set(color);

        if (cycle < 1.8) {
            const t = cycle / 1.8;
            dropRef.current.position.y = -1.35 - t * 1.0;
            dropRef.current.scale.setScalar(1 - t * 0.3);
            dropRef.current.visible = true;

            if (trailRef.current) {
                trailRef.current.scale.y = 0.3 + t * 0.7;
                trailRef.current.position.y = -1.35 - t * 0.5;
                trailRef.current.material.opacity = 0.35 * (1 - t);
                trailRef.current.visible = true;
            }
        } else {
            dropRef.current.visible = false;
            if (trailRef.current) trailRef.current.visible = false;
        }
    });

    return (
        <group>
            <mesh ref={dropRef} position={[0, -1.35, 0]}>
                <sphereGeometry args={[0.04, 10, 10]} />
                <meshStandardMaterial ref={dropMatRef} color="#22c55e" transparent opacity={0.9} roughness={0.1} />
            </mesh>
            <mesh ref={trailRef} position={[0, -1.35, 0]}>
                <cylinderGeometry args={[0.015, 0.03, 0.25, 6]} />
                <meshStandardMaterial ref={trailMatRef} color="#22c55e" transparent opacity={0.3} />
            </mesh>
        </group>
    );
}

// ==================== SCENE 3D ====================
export default function InfusionModel({ percentage = 100, status = 'monitoring' }) {
    return (
        <div className="w-full h-[450px] bg-slate-900 rounded-[32px] overflow-hidden relative border-4 border-slate-800 shadow-2xl">
            <Suspense fallback={
                <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-white text-xs font-black animate-pulse uppercase">Loading 3D Model...</p>
                </div>
            }>
                <Canvas shadows dpr={[1, 2]}>
                    <PerspectiveCamera makeDefault position={[0, 0, 5.5]} fov={40} />
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
                    <pointLight position={[-4, 3, 4]} intensity={0.5} color="#60a5fa" />
                    <pointLight position={[4, -2, 3]} intensity={0.3} color="#34d399" />
                    {/* Cahaya dari belakang biar efek transparan kantong keliatan */}
                    <pointLight position={[0, 0, -3]} intensity={0.4} color="#ffffff" />

                    <PresentationControls
                        global
                        rotation={[0, 0.3, 0]}
                        polar={[-Math.PI / 3, Math.PI / 3]}
                        azimuth={[-Math.PI / 4, Math.PI / 4]}
                    >
                        <IVBag percentage={percentage} status={status} />
                    </PresentationControls>

                    <OrbitControls
                        enableZoom={true}
                        enablePan={false}
                        minDistance={3}
                        maxDistance={10}
                        autoRotate
                        autoRotateSpeed={0.5}
                    />

                    <color attach="background" args={['#0f172a']} />
                    <fog attach="fog" args={['#0f172a', 8, 20]} />
                </Canvas>
            </Suspense>

            {/* Label Percentage */}
            <div className={`absolute bottom-6 left-6 px-4 py-2 rounded-xl font-black text-lg shadow-lg border-2 ${
                status === 'warning'
                    ? 'bg-rose-500 text-white border-rose-400'
                    : 'bg-emerald-500 text-white border-emerald-400'
            }`}>
                {Math.round(percentage)}%
            </div>

            {/* Status Label */}
            <div className="absolute top-6 right-6 bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg border border-white/20">
                <p className="text-[8px] font-black text-white/50 uppercase tracking-widest">Live IoT Feedback</p>
            </div>

            {/* Info Cairan */}
            <div className="absolute bottom-6 right-6 text-right">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Cairan Infus</p>
                <p className={`text-xl font-black ${
                    percentage <= 25 ? 'text-rose-400' : percentage <= 50 ? 'text-yellow-400' : 'text-emerald-400'
                }`}>
                    {percentage <= 25 ? 'KRITIS' : percentage <= 50 ? 'WASPADA' : 'AMAN'}
                </p>
            </div>
        </div>
    );
}
