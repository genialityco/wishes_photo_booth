import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';

import { createShoppingBasketGeometry } from './BasquetShape.ts';

const fragRes = { width: 18, height: 12, resW: 15, resH: 10 };
const numFrags = fragRes.resW * fragRes.resH;

export default function ShoppingBasketScene({ photoUrls, message }) {
  const font = useLoader(FontLoader, '/fonts/helvetiker_regular.typeface.json');
  const textures = useLoader(THREE.TextureLoader, photoUrls);

  const [phase, setPhase] = useState(0);
  const numBasketsPhase1_2 = Math.max(400, photoUrls.length * 3 * 80);
  const numBasketsPhase3 = 3000;
  const numBaskets = numBasketsPhase3;

  // Refs
  const cameraRef = useRef();
  const basketRefs = useRef(Array.from({ length: numBaskets }, () => React.createRef()));
  const targetPositions = useRef([]);
  const phaseStartTimes = useRef({});
  const sparkleRefs = useRef(Array.from({ length: 220 }, () => React.createRef()));
  
  // PHOTOS REFS
  const imageRefs = useRef(textures.map(() => React.createRef()));
  const photoGroupRefs = useRef(textures.map(() => React.createRef()));
  const disStartTimes = useRef(Array.from({ length: textures.length }, () => 0));
  const targetsAssigned = useRef(Array.from({ length: textures.length }, () => false));

  // POSICIONES INICIALES CANASTAS
  const initialBasketPositions = useMemo(() => 
    Array.from({ length: numBaskets }).map(() => {
      const radius = 15 + Math.random() * 150;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      return new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );
    }), [numBaskets]
  );

  // POSICIONES COLLAGE FOTOS - ORGANIZADAS DE ARRIBA A ABAJO
  const photoCollagePositions = useMemo(() => {
    const positions = [];
    const gridCols = 4; // Número de columnas en la cuadrícula
    const spacingX = 12; // Espaciado horizontal
    const spacingY = 8; // Espaciado vertical
    const startY = 15; // Posición Y inicial (parte superior)
    
    for (let i = 0; i < textures.length; i++) {
      const col = i % gridCols;
      const row = Math.floor(i / gridCols);
      
      positions.push({
        x: (col - (gridCols - 1) / 2) * spacingX,
        y: startY - row * spacingY, // De arriba hacia abajo
        z: 25 + Math.random() * 10, // Menor variación en Z para mejor organización
        rotation: (Math.random() - 0.5) * 0.1, // Menor rotación para mejor legibilidad
        rotationY: (Math.random() - 0.5) * 0.2,
        scale: 0.8 + Math.random() * 0.4
      });
    }
    return positions;
  }, [textures.length]);

  // APPEARANCE DELAYS TOP TO BOTTOM - TIEMPO ENTRE FOTOS
  const appearanceDelays = useMemo(() => {
    const indices = [...Array(textures.length).keys()];
    // Ordenar por posición Y (de mayor a menor - de arriba a abajo)
    indices.sort((a, b) => photoCollagePositions[b].y - photoCollagePositions[a].y);
    return indices.reduce((acc, sortedIdx, order) => {
      acc[sortedIdx] = order * 0.4; // Reducido a 0.4s entre fotos para que sea más rápido
      return acc;
    }, Array(textures.length).fill(0));
  }, [photoCollagePositions, textures.length]);

  // TIEMPO DE VISUALIZACIÓN ANTES DE DESINTEGRACIÓN
  const viewTimeBeforeDisintegration = 2.5; // 2.5 segundos para ver cada foto

  // RANDOM DISINTEGRATION DELAYS - AHORA INCLUYE TIEMPO DE VISUALIZACIÓN
  const disRandomDelays = useMemo(() => 
    textures.map(() => Math.random() * 1 + viewTimeBeforeDisintegration), // Mínimo 2.5s, máximo 3.5s
  [textures.length, viewTimeBeforeDisintegration]);

  // CAMINO CÁMARA
  const cameraPath = useRef([
    { pos: new THREE.Vector3(-50, -30, 20), look: new THREE.Vector3(0, 0, 0) },
    { pos: new THREE.Vector3(80, 40, -60), look: new THREE.Vector3(0, 20, 0) },
    { pos: new THREE.Vector3(0, 30, 100), look: new THREE.Vector3(-5, 0, 40) },
    { pos: new THREE.Vector3(0, 5, 120), look: new THREE.Vector3(0, 0, 0) }
  ]);

  // GEOMETRÍA CANASTA
  const basketGeometry = useMemo(() => createShoppingBasketGeometry(), []);

  // FASES - AJUSTADO PARA DAR MÁS TIEMPO EN FASE 2
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 3000),
      setTimeout(() => setPhase(2), 8000),
      // Tiempo más largo en fase 2 para ver las fotos
      setTimeout(() => setPhase(3), 18000 + textures.length * 600), // Ajustado dinámicamente
    ];
    return () => timers.forEach(clearTimeout);
  }, [textures.length]);

  // PUNTOS TEXTO
  useEffect(() => {
    if (!font) return;
    console.log(`Generando "${message}" con ${numBaskets} canastas...`);

    const thickness = 8;
    const size = 40;
    const shapes = font.generateShapes(message, size);
    const shapeGeom = new THREE.ShapeGeometry(shapes);
    shapeGeom.computeBoundingBox();
    shapeGeom.center();

    const position = shapeGeom.attributes.position;
    const index = shapeGeom.index;
    const triangles = [];
    const areas = [];

    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2);
      const pa = new THREE.Vector3(position.getX(a), position.getY(a), 0);
      const pb = new THREE.Vector3(position.getX(b), position.getY(b), 0);
      const pc = new THREE.Vector3(position.getX(c), position.getY(c), 0);
      const area = new THREE.Vector3().crossVectors(
        pb.clone().sub(pa), pc.clone().sub(pa)
      ).length() / 2;
      areas.push(area);
      triangles.push({ pa, pb, pc, area });
    }

    const totalArea = areas.reduce((sum, a) => sum + a, 0);

    const getRandomPointInShape = () => {
      let r = Math.random() * totalArea;
      let triIndex = 0;
      while (r > areas[triIndex]) { r -= areas[triIndex]; triIndex++; }
      const tri = triangles[triIndex];
      let u = Math.random(), v = Math.random();
      if (u + v > 1) { u = 1 - u; v = 1 - v; }
      return tri.pa.clone()
        .add(tri.pb.clone().sub(tri.pa).multiplyScalar(u))
        .add(tri.pc.clone().sub(tri.pa).multiplyScalar(v));
    };

    targetPositions.current = Array.from({ length: numBaskets }, () => {
      const p2d = getRandomPointInShape();
      const z = (Math.random() - 0.5) * thickness;
      return new THREE.Vector3(p2d.x, p2d.y, z);
    });

    shapeGeom.dispose();
  }, [font, message, numBaskets]);

  // ASSIGN TARGETS
  useEffect(() => {
    if (phase !== 2) return;

    textures.forEach((_, i) => {
      if (targetsAssigned.current[i]) return;

      const group = photoGroupRefs.current[i].current;
      if (!group) return;

      const photoPos = group.getWorldPosition(new THREE.Vector3());

      const candidates = [];
      for (let j = 0; j < numBasketsPhase1_2; j++) {
        const basket = basketRefs.current[j].current;
        if (!basket) continue;
        const bPos = basket.getWorldPosition(new THREE.Vector3());
        const dist = bPos.distanceTo(photoPos);
        if (dist < 100) {
          candidates.push({ j, dist });
        }
      }

      if (candidates.length === 0) {
        const j = Math.floor(Math.random() * numBasketsPhase1_2);
        candidates.push({ j, dist: 0 });
      }

      candidates.sort((a, b) => a.dist - b.dist);
      const numCandidates = Math.min(100, candidates.length);
      candidates.length = numCandidates;

      const mesh = imageRefs.current[i].current;
      if (!mesh) return;

      const targetAttr = mesh.geometry.getAttribute('targetPos');
      let k = 0;
      for (let gy = 0; gy < fragRes.resH; gy++) {
        for (let gx = 0; gx < fragRes.resW; gx++) {
          const candIdx = Math.floor(Math.random() * candidates.length);
          const cand = candidates[candIdx];
          const basket = basketRefs.current[cand.j].current;
          const tPos = basket.getWorldPosition(new THREE.Vector3());
          targetAttr.setXYZ(k, tPos.x, tPos.y, tPos.z);
          k++;
        }
      }
      targetAttr.needsUpdate = true;

      targetsAssigned.current[i] = true;
    });
  }, [phase, textures]);

  // SET FRAG ATTRIBUTES
  const setFragAttributes = useCallback((mesh) => {
    if (!mesh) return;

    const w = fragRes.resW;
    const h = fragRes.resH;

    const uvOffsets = [];
    const localPositions = [];
    const randomDirs = [];
    const fragDelays = [];
    const targetPoss = []; // placeholders

    for (let gy = 0; gy < h; gy++) {
      for (let gx = 0; gx < w; gx++) {
        uvOffsets.push(gx / w, gy / h);

        const lx = (gx - (w - 1) / 2) * (fragRes.width / w);
        const ly = (gy - (h - 1) / 2) * (fragRes.height / h);
        const lz = 0;
        localPositions.push(lx, ly, lz);

        const rx = (Math.random() - 0.5) * 2;
        const ry = (Math.random() - 0.5) * 2 + 1;
        const rz = (Math.random() - 0.5) * 2;
        randomDirs.push(rx, ry, rz);

        const delay = ((h - 1 - gy) / h) * 1.0;
        fragDelays.push(delay);

        targetPoss.push(0, 0, 0);
      }
    }

    mesh.geometry.setAttribute('uvOffset', new THREE.InstancedBufferAttribute(new Float32Array(uvOffsets), 2));
    mesh.geometry.setAttribute('localPos', new THREE.InstancedBufferAttribute(new Float32Array(localPositions), 3));
    mesh.geometry.setAttribute('randomDir', new THREE.InstancedBufferAttribute(new Float32Array(randomDirs), 3));
    mesh.geometry.setAttribute('fragDelay', new THREE.InstancedBufferAttribute(new Float32Array(fragDelays), 1));
    mesh.geometry.setAttribute('targetPos', new THREE.InstancedBufferAttribute(new Float32Array(targetPoss), 3));
  }, []);

  useEffect(() => {
    textures.forEach((_, i) => {
      const mesh = imageRefs.current[i].current;
      if (mesh) setFragAttributes(mesh);
    });
  }, [textures, setFragAttributes]);

  // ANIMACIÓN
  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const cam = state.camera;

    if (!phaseStartTimes.current[phase]) phaseStartTimes.current[phase] = t;
    const ease = (v) => (1 - Math.cos(Math.PI * v)) / 2;

    // Cámara
    const idx = Math.min(phase, cameraPath.current.length - 1);
    const prog = phase >= 3 ? 1 : ease((t * 0.12) % 1);
    cam.position.lerpVectors(
      cameraPath.current[idx].pos,
      cameraPath.current[Math.min(idx + 1, cameraPath.current.length - 1)].pos,
      prog
    );
    const lookFrom = cameraPath.current[idx].look;
    const lookTo = cameraPath.current[Math.min(idx + 1, cameraPath.current.length - 1)].look;
    const lookPos = new THREE.Vector3().lerpVectors(lookFrom, lookTo, prog);
    cam.lookAt(lookPos);

    // Sparkles
    sparkleRefs.current.forEach((ref, i) => {
      if (ref.current) {
        ref.current.material.opacity = 0.4 + Math.abs(Math.sin(t * 1.8 + i * 0.05)) * 0.6;
        ref.current.scale.setScalar(0.1 + Math.abs(Math.sin(t * 1.5 + i)) * 0.08);
      }
    });

    // CANASTAS
    basketRefs.current.forEach((basketRef, i) => {
      const basket = basketRef.current;
      if (!basket) return;

      basket.visible = phase < 3 ? i < numBasketsPhase1_2 : true;

      if (phase < 3 && i < numBasketsPhase1_2) {
        basket.position.y += Math.cos(t * 0.25 + i) * 0.001;
        basket.rotation.y += delta * 0.3;
        basket.traverse((child) => {
          if (child.isMesh) child.material.emissiveIntensity = 0.1 + Math.abs(Math.sin(t * 2.5 + i)) * 0.2;
        });
      }

      if (phase >= 3) {
        const target = targetPositions.current[i];
        if (!target) return;

        const distance = basket.position.distanceTo(target);
        basket.position.lerp(target, Math.min(0.12, 0.12 + (1 - distance * 0.01)));

        if (distance < 2.0) {
          basket.position.y += Math.sin(t * 1.0 + i * 0.15) * 0.002;
          basket.rotation.y += delta * 0.5;
        }

        basket.traverse((child) => {
          if (child.isMesh) {
            child.material.emissiveIntensity = Math.min(1.0, 0.1 + Math.abs(Math.sin(t * 3 + i * 0.1)) * 0.5);
          }
        });
      }
    });

    // FOTOS ANIMADAS (FASE 2)
    if (phase === 2) {
      const phase2Time = t - phaseStartTimes.current[2];

      photoGroupRefs.current.forEach((groupRef, i) => {
        const g = groupRef.current;
        const m = imageRefs.current[i].current;
        if (!g || !m) return;

        const delay = appearanceDelays[i];
        const localT = Math.max(0, phase2Time - delay);
        const appearanceDuration = 1.5; // Reducido para aparición más rápida
        const progress = Math.min(1, localT / appearanceDuration);

        const collagePos = photoCollagePositions[i];
        if (!collagePos) return;

        const startY = 90;
        const endY = collagePos.y || 0;
        
        const arcProgress = ease(progress);
        const currentY = startY + (endY - startY) * arcProgress;
        
        g.position.set(collagePos.x, currentY, collagePos.z);
        g.rotation.set(0, collagePos.rotationY * arcProgress, collagePos.rotation * arcProgress);

        const currentScale = 0.2 + (collagePos.scale - 0.2) * Math.min(1, progress * 1.5);
        g.scale.setScalar(currentScale);

        g.visible = true;
        m.material.uniforms.opacity.value = progress;
        m.material.uniforms.time.value = t;

        // Start disintegration after appearance + view time + random delay
        const totalDelayBeforeDisintegration = appearanceDuration + disRandomDelays[i];
        if (disStartTimes.current[i] === 0 && localT > totalDelayBeforeDisintegration) {
          disStartTimes.current[i] = t;
        }
        m.material.uniforms.startTime.value = disStartTimes.current[i];
        m.material.uniforms.groupPos.value.copy(g.position);
      });
    }

    if (phase === 3) {
      // Ocultar fotos
      photoGroupRefs.current.forEach((ref) => {
        if (ref.current) ref.current.visible = false;
      });
    }
  });

  const fragGeo = useMemo(() => new THREE.PlaneGeometry(fragRes.width / fragRes.resW, fragRes.height / fragRes.resH), []);

  return (
    <group>
      <ambientLight intensity={0.15} color={0xfff7de} />
      <directionalLight position={[40, 80, 30]} intensity={1.5} color={0xfff1b8} />

      <perspectiveCamera ref={cameraRef} makeDefault position={[0, 0, 80]} />

      {/* Sparkles */}
      {Array.from({ length: 120 }).map((_, i) => (
        <mesh key={`sparkle-${i}`} ref={sparkleRefs.current[i]} position={[
          (Math.random() - 0.5) * 1000, (Math.random() - 0.5) * 1000, (Math.random() - 0.5) * 1000
        ]}>
          <sphereGeometry args={[0.25, 6, 6]} />
          <meshBasicMaterial transparent opacity={0.5} color="#ffd700" />
        </mesh>
      ))}

      {/* FOTOS COMPLETAS */}
      {textures.map((tex, i) => {
        const material = useMemo(() => new THREE.ShaderMaterial({
          uniforms: {
            map: { value: tex },
            opacity: { value: 0 },
            time: { value: 0 },
            startTime: { value: 0 },
            groupPos: { value: new THREE.Vector3() },
          },
          vertexShader: `
            attribute vec3 localPos;
            attribute vec2 uvOffset;
            attribute vec3 randomDir;
            attribute float fragDelay;
            attribute vec3 targetPos;

            varying vec2 vUv;
            varying float vBrightness;
            varying float vAlpha;

            uniform float time;
            uniform float startTime;
            uniform vec3 groupPos;

            void main() {
              vUv = uv * vec2(1.0 / ${fragRes.resW}.0, 1.0 / ${fragRes.resH}.0) + uvOffset;

              float localTime = time - startTime - fragDelay;

              float amount = clamp(localTime / 1.5, 0.0, 1.0);
              float flyAmount = clamp((localTime - 1.5) / 3.0, 0.0, 1.0);

              vec3 pos = position + localPos;
              vec3 disOffset = normalize(randomDir) * amount * 5.0;
              vec3 curPos = pos + disOffset;
              curPos = mix(curPos, targetPos - groupPos, flyAmount);

              float scale = 1.0 - amount * 0.3 - flyAmount * 0.6;
              vec3 scaledPos = curPos * scale;

              gl_Position = projectionMatrix * modelViewMatrix * vec4(scaledPos, 1.0);

              vBrightness = 1.0 + amount * 3.0 + flyAmount * 1.0;
              vAlpha = 1.0 - amount * 0.2 - flyAmount * 0.8;
            }
          `,
          fragmentShader: `
            uniform sampler2D map;
            uniform float opacity;
            varying vec2 vUv;
            varying float vBrightness;
            varying float vAlpha;

            void main() {
              vec4 texColor = texture2D(map, vUv);
              gl_FragColor = texColor * vBrightness * vAlpha * opacity;
            }
          `,
          transparent: true,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          toneMapped: false,
          depthWrite: false,
        }), [tex]);

        return (
          <group 
            key={`photo-group-${i}`}
            ref={photoGroupRefs.current[i]}
            visible={false}
            position={[0, 90, 0]}
          >
            <instancedMesh 
              ref={imageRefs.current[i]}
              args={[fragGeo, material, numFrags]}
            />
          </group>
        );
      })}

      {/* CANASTAS */}
      {Array.from({ length: numBaskets }).map((_, i) => {
        const pos = initialBasketPositions[i];
        return (
          <group
            key={`basket-${i}`}
            ref={basketRefs.current[i]}
            position={[pos.x, pos.y, pos.z]}
          >
            <primitive object={basketGeometry.clone()} />
          </group>
        );
      })}
    </group>
  );
}