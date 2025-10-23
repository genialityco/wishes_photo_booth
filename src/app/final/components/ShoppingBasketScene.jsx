import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';

import { createShoppingBasketGeometry } from './BasketShape';
import { createShoppingCartGeometry } from './ShopingCartShape';
export default function ShoppingBasketScene({ photoUrls, message }) {
  // ✅ LOADER DENTRO DEL CANVAS
  const font = useLoader(FontLoader, '/fonts/Roboto_Regular.json');
  const repeatedPhotoUrls = Array.from({ length: 80 }, () => photoUrls).flat();
  const textures = useLoader(THREE.TextureLoader, repeatedPhotoUrls);
  const [phase, setPhase] = useState(0);
  const numBasketsPhase1_2 = 100;
  const numBasketsPhase3 = 2500;
  const numBaskets = numBasketsPhase3;

  // 🌊 CONFIGURACIÓN DE CASCADAS
  const numCascadeLines = 10; // 🔥 AJUSTA ESTE NÚMERO: cantidad de líneas de cascada paralelas

  // Refs
  const cameraRef = useRef(null);
  const basketRefs = useRef(Array.from({ length: numBaskets }, () => React.createRef()));
  const targetPositions = useRef([]);
  const phaseStartTimes = useRef({});
  const sparkleRefs = useRef(Array.from({ length: 220 }, () => React.createRef()));
  
  // 📸 PHOTOS REFS (IMPORTANTE!)
  const imageRefs = useRef(textures.map(() => React.createRef()));
  const photoGroupRefs = useRef(textures.map(() => React.createRef()));
  const disStartTimes = useRef(Array.from({ length: textures.length }, () => 0));
  
  // 🛒 CANASTOS DE TRANSFORMACIÓN (uno por cada foto)
  const transformBasketRefs = useRef(textures.map(() => React.createRef()));
  const transformBasketStates = useRef(textures.map(() => ({
    visible: false,
    startTime: 0,
    initialY: 0
  })));

  // Nuevos refs para partículas luminosas
  const particleRefs = useRef([]);
  const particleTargetBasket = useRef(null);
  
  // 🎥 NUEVOS REFS PARA CÁMARA SUAVIZADA
  const previousPhase = useRef(0);
  const cameraTransitionStart = useRef(0);
  const cameraStartPosition = useRef(new THREE.Vector3());
  const cameraStartTarget = useRef(new THREE.Vector3());

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

  // 📸 POSICIONES COLLAGE FOTOS - SISTEMA DE CASCADAS
  const photoCollagePositions = useMemo(() => {
    const positions = [];
    const photosPerLine = Math.ceil(textures.length / numCascadeLines);
    const spacingX = 20; // Espaciado horizontal entre líneas de cascada
    const spacingY = 20; // Espaciado vertical entre fotos en la misma cascada
    const totalWidth = (numCascadeLines - 1) * spacingX;
    
    for (let i = 0; i < textures.length; i++) {
      const lineIndex = i % numCascadeLines; // En qué línea de cascada está
      const positionInLine = Math.floor(i / numCascadeLines); // Posición dentro de su cascada
      
      positions.push({
        x: (lineIndex - (numCascadeLines - 1) / 2) * spacingX, // Distribuir líneas horizontalmente
        y: -positionInLine * spacingY, // Cada foto más abajo en su cascada
        z: -5 + Math.random() * 2,
        rotation: (Math.random() - 0.5) * 0.3,
        rotationY: (Math.random() - 0.5) * 0.3,
        scale: 1.0 + Math.random() * 0.3,
        cascadeIndex: lineIndex, // Índice de la línea de cascada
        cascadePosition: positionInLine // Posición en la cascada
      });
    }
    return positions;
  }, [textures.length, numCascadeLines]);

  // RANDOM DISINTEGRATION DELAYS
  const disRandomDelays = useMemo(() => 
    textures.map(() => Math.random() * 3 + 0.5),
  [textures.length]);

  // CAMINO CÁMARA
  const cameraPath = useRef([
    { pos: new THREE.Vector3(0, 15, 80), look: new THREE.Vector3(-5, 0, 0) },
    { pos: new THREE.Vector3(0, 8, 35), look: new THREE.Vector3(0, 5, 0) },
    { pos: new THREE.Vector3(-50, -30, 20), look: new THREE.Vector3(0, 0, 0) },
    { pos: new THREE.Vector3(0, 0, 100), look: new THREE.Vector3(0, 0, 0) }
  ]);

  // 🛒 GEOMETRÍA CANASTA
  //const basketGeometry = useMemo(() => createShoppingBasketGeometry(), []);
    const basketGeometry = useMemo(() => createShoppingCartGeometry(), [])
  // Inicializar partículas
  useEffect(() => {
    particleRefs.current = Array.from({ length: 500 }, () => ({
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      active: false,
      startTime: 0,
      originalColor: new THREE.Color(),
      meshRef: React.createRef()
    }));

    // Encontrar una canasta cercana como objetivo
    if (basketRefs.current.length > 0) {
      const nearbyBaskets = basketRefs.current
        .filter(ref => ref.current)
        .map(ref => ({
          mesh: ref.current,
          distance: ref.current.position.distanceTo(new THREE.Vector3(0, 0, 50))
        }))
        .filter(basket => basket.distance < 80)
        .sort((a, b) => a.distance - b.distance);

      if (nearbyBaskets.length > 0) {
        particleTargetBasket.current = nearbyBaskets[0].mesh;
      }
    }
  }, [phase]);

  // FASES
  useEffect(() => {
    const timers = [
      //setTimeout(() => setPhase(2), 3000),
      setTimeout(() => setPhase(2), 5000),
      setTimeout(() => setPhase(3), 30000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // PUNTOS TEXTO (con división automática en líneas)
  useEffect(() => {
    if (!font) return;
    console.log(`🛒 Generando texto multilínea para "${message}"...`);
    const thickness = 6;
    const size = 16;
    const maxLineWidth = 160;
    const lineHeight = 24;
    const verticalOffset = -20; // 🔥 CONTROLA LA POSICIÓN VERTICAL: negativo = más abajo, positivo = más arriba
    const letterSpacing = 3;
    
    const words = message.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testShapes = font.generateShapes(testLine, size);
      const testGeom = new THREE.ShapeGeometry(testShapes);
      testGeom.computeBoundingBox();
      const width = testGeom.boundingBox.max.x - testGeom.boundingBox.min.x;
      testGeom.dispose();

      if (width > maxLineWidth && currentLine !== '') {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    if (currentLine) lines.push(currentLine);

    const allTriangles = [];
    const allAreas = [];

    lines.forEach((line, i) => {
      // 🔥 GENERAR CADA LETRA POR SEPARADO PARA CONTROLAR EL ESPACIADO
      let totalLineWidth = 0;
      const letterGeometries = [];
      
      for (let charIndex = 0; charIndex < line.length; charIndex++) {
        const char = line[charIndex];
        if (char === ' ') {
          totalLineWidth += size * 0.5 + letterSpacing; // Espacio para espacios en blanco
          continue;
        }
        
        const shapes = font.generateShapes(char, size);
        const geom = new THREE.ShapeGeometry(shapes);
        geom.computeBoundingBox();
        
        const charWidth = geom.boundingBox.max.x - geom.boundingBox.min.x;
        letterGeometries.push({
          geom,
          xOffset: totalLineWidth,
          width: charWidth
        });
        
        totalLineWidth += charWidth + letterSpacing;
      }

      const centerX = totalLineWidth / 2;
      const totalHeight = lines.length * lineHeight;
      const yOffset = (totalHeight / 2) - (i * lineHeight) + verticalOffset;

      // 🔥 PROCESAR CADA LETRA CON SU OFFSET
      letterGeometries.forEach(({ geom, xOffset }) => {
        const pos = geom.attributes.position;
        const idx = geom.index;
        
        for (let j = 0; j < idx.count; j += 3) {
          const a = idx.getX(j), b = idx.getX(j + 1), c = idx.getX(j + 2);
          const pa = new THREE.Vector3(pos.getX(a) + xOffset - centerX, pos.getY(a) + yOffset, 0);
          const pb = new THREE.Vector3(pos.getX(b) + xOffset - centerX, pos.getY(b) + yOffset, 0);
          const pc = new THREE.Vector3(pos.getX(c) + xOffset - centerX, pos.getY(c) + yOffset, 0);
          const area = new THREE.Vector3().crossVectors(pb.clone().sub(pa), pc.clone().sub(pa)).length() / 2;
          allAreas.push(area);
          allTriangles.push({ pa, pb, pc, area });
        }
        
        geom.dispose();
      });
    });

    const totalArea = allAreas.reduce((sum, a) => sum + a, 0);

    const getRandomPointInShape = () => {
      let r = Math.random() * totalArea;
      let triIndex = 0;
      while (r > allAreas[triIndex]) { r -= allAreas[triIndex]; triIndex++; }
      const tri = allTriangles[triIndex];
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
  }, [font, message, numBaskets]);

  // 🎬 ANIMACIÓN
  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const cam = state.camera;

    if (!phaseStartTimes.current[phase]) phaseStartTimes.current[phase] = t;

    // 🎥 CÁMARA MEJORADA - TRANSICIONES SUAVIZADAS
    const currentTime = t;

    // Inicializar transición si cambió la fase
    if (phase !== previousPhase.current) {
      cameraTransitionStart.current = currentTime;
      cameraStartPosition.current = cam.position.clone();
      
      // Obtener dirección actual de la cámara
      cameraStartTarget.current = new THREE.Vector3();
      cam.getWorldDirection(cameraStartTarget.current);
      cameraStartTarget.current.add(cam.position);
      
      previousPhase.current = phase;
    }

    const transitionDuration = 2.5;
    const transitionProgress = Math.min(1, (currentTime - cameraTransitionStart.current) / transitionDuration);

    // Easing personalizado para movimiento más cinematográfico
    const smoothEase = (x) => {
      return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    };

    const easedProgress = smoothEase(transitionProgress);

    // Waypoints actual y siguiente
    const currentWaypoint = cameraPath.current[Math.min(phase, cameraPath.current.length - 1)];
    const nextWaypoint = cameraPath.current[Math.min(phase + 1, cameraPath.current.length - 1)];

    if (transitionProgress < 1) {
      // Durante transición: interpolación suave
      cam.position.lerpVectors(
        cameraStartPosition.current,
        nextWaypoint.pos,
        easedProgress
      );
      
      const currentLook = new THREE.Vector3().lerpVectors(
        cameraStartTarget.current, 
        nextWaypoint.look, 
        easedProgress
      );
      cam.lookAt(currentLook);
    } else {
      // Después de transición: movimiento orgánico suave
      const idleTime = currentTime - cameraTransitionStart.current - transitionDuration;
      cam.position.lerp(nextWaypoint.pos, 0.05);
      
      // Pequeño movimiento sinusoidal para hacerlo más vivo
      cam.position.y += Math.sin(idleTime * 0.5) * 0.3;
      cam.position.x += Math.cos(idleTime * 0.3) * 0.2;
      
      cam.lookAt(nextWaypoint.look);
    }

    // Field of View dinámico para mayor dramatismo
    if (phase === 3) {
      cam.fov = THREE.MathUtils.lerp(cam.fov, 45, 0.05);
    } else {
      cam.fov = THREE.MathUtils.lerp(cam.fov, 60, 0.05);
    }
    cam.updateProjectionMatrix();

    // ✨ Sparkles
    sparkleRefs.current.forEach((ref, i) => {
      if (ref.current) {
        ref.current.material.opacity = 0.4 + Math.abs(Math.sin(t * 1.8 + i * 0.05)) * 0.6;
        ref.current.scale.setScalar(0.1 + Math.abs(Math.sin(t * 1.5 + i)) * 0.08);
      }
    });

    // 🛒 CANASTAS
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

    // 📸 FOTOS ANIMADAS (FASE 2) - CON EFECTO DE CASCADAS MÚLTIPLES
    if (phase === 2) {
      const phase2Time = t - phaseStartTimes.current[2];

      photoGroupRefs.current.forEach((groupRef, i) => {
        const g = groupRef.current;
        const m = imageRefs.current[i]?.current;
        if (!g || !m) return;

        const collagePos = photoCollagePositions[i];
        if (!collagePos) return;

        // 🌊 Delay basado en la posición en su cascada (no en el índice total)
        const cascadeDelay = collagePos.cascadeIndex * 0.3; // Delay entre líneas de cascada
        const positionDelay = collagePos.cascadePosition * 0.6; // Delay dentro de la cascada
        const totalDelay = cascadeDelay + positionDelay;
        
        const localT = Math.max(0, phase2Time - totalDelay);
        const appearanceDuration = 3.0;
        const progress = Math.min(1, localT / appearanceDuration);

        const startY = 50;
        const endY = collagePos.y;
        
        const continuousProgress = progress + (localT - appearanceDuration) * 0.1;
        const currentY = 250 + (endY - startY) * progress - (continuousProgress - 1) * 50;
        
        g.position.set(collagePos.x, currentY, collagePos.z);
        
        const rotationProgress = Math.min(1, progress * 1.2);
        g.rotation.set(0, collagePos.rotationY * rotationProgress, collagePos.rotation * rotationProgress);

        const scaleProgress = progress < 0.9 ? progress / 0.9 : 0.9 + (progress - 0.9) * 0.1;
        const currentScale = 0.3 + (collagePos.scale - 0.3) * scaleProgress;
        g.scale.setScalar(currentScale);

        g.visible = true;
        m.material.uniforms.opacity.value = Math.min(1, progress * 1.5);
        m.material.uniforms.time.value = t;

        if (disStartTimes.current[i] === 0 && localT > appearanceDuration + disRandomDelays[i]) {
          disStartTimes.current[i] = t;
          activateParticlesForImage(i, g.position);
          
          // 🛒 Activar canasto de transformación
          transformBasketStates.current[i].visible = true;
          transformBasketStates.current[i].startTime = t;
          transformBasketStates.current[i].initialY = g.position.y - 20; // Aparece debajo de la foto
        }
        m.material.uniforms.startTime.value = disStartTimes.current[i];
      });
    }

    // ANIMACIÓN DE PARTÍCULAS LUMINOSAS
    particleRefs.current.forEach((particle, i) => {
      if (!particle.active || !particle.meshRef.current) return;

      const particleTime = t - particle.startTime;
      const particleProgress = Math.min(1, particleTime / 2.0);

      if (particleProgress >= 1) {
        particle.active = false;
        particle.meshRef.current.visible = false;
        return;
      }

      if (particleTargetBasket.current) {
        const targetPos = particleTargetBasket.current.position.clone();
        particle.position.lerpVectors(particle.position, targetPos, particleProgress * 0.1);
        
        particle.meshRef.current.position.copy(particle.position);
        
        const intensity = 1.0 - particleProgress;
        particle.meshRef.current.scale.setScalar(0.08 * intensity);
        particle.meshRef.current.material.emissiveIntensity = intensity * 2;
        particle.meshRef.current.material.opacity = intensity;
      }
    });

    // 🛒 ANIMACIÓN DE CANASTOS DE TRANSFORMACIÓN
    transformBasketRefs.current.forEach((basketRef, i) => {
      if (!basketRef.current) return;
      
      const state = transformBasketStates.current[i];
      
      // Ocultar canastos en fase 3
      if (phase === 3) {
        basketRef.current.visible = false;
        state.visible = false;
        return;
      }

      if (!state.visible) {
        basketRef.current.visible = false;
        return;
      }

      const transformTime = t - state.startTime;
      const transformDuration = 2.5;
      const progress = Math.min(1, transformTime / transformDuration);

      basketRef.current.visible = true;

      // Animación de aparición: escala y posición
      const scaleProgress = Math.min(1, progress * 1.5);
      const scale = 0.3 + scaleProgress * 0.7; // De 0.3 a 1.0
      basketRef.current.scale.setScalar(scale);

      // Movimiento hacia arriba gradual
      const photoPos = photoGroupRefs.current[i]?.current?.position;
      if (photoPos) {
        const startY = state.initialY;
        const endY = photoPos.y - 3; // Posición final: justo debajo de donde estaba la foto
        const currentY = startY + (endY - startY) * progress;
        
        basketRef.current.position.set(
          photoPos.x,
          currentY,
          photoPos.z + 2
        );
      }

      // Rotación suave
      basketRef.current.rotation.y = transformTime * 1.5;

      // Intensidad luminosa pulsante
      basketRef.current.traverse((child) => {
        if (child.isMesh) {
          const pulseIntensity = 0.3 + Math.abs(Math.sin(t * 4 + i)) * 0.7;
          child.material.emissiveIntensity = pulseIntensity * (1 + progress);
        }
      });
    });

    if (phase === 3) {
      photoGroupRefs.current.forEach((ref) => {
        if (ref.current) ref.current.visible = false;
      });
    }
  });

  // Función para activar partículas para una imagen específica
  const activateParticlesForImage = (imageIndex, imagePosition, imageMesh) => {
    const particlesPerImage = 200;
    const startIndex = imageIndex * particlesPerImage;
    const now = performance.now() / 1000;

    const width = imageMesh?.scale?.x * 50 || 18;
    const height = imageMesh?.scale?.y * 50 || 12;

    for (let i = 0; i < particlesPerImage; i++) {
      const particleIndex = startIndex + i;
      if (particleIndex >= particleRefs.current.length) break;

      const particle = particleRefs.current[particleIndex];
      particle.active = true;
      particle.startTime = now;

      const offsetX = (Math.random() - 0.5) * width;
      const offsetY = (Math.random() - 0.5) * height;
      const offsetZ = (Math.random() - 0.5) * 2;

      particle.position.set(
        imagePosition.x + offsetX,
        imagePosition.y + offsetY,
        imagePosition.z + offsetZ
      );

      particle.velocity.set(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 4
      );

      const hue = 0.1 + Math.random() * 0.15;
      const lightness = 0.8 + Math.random() * 0.2;
      particle.originalColor.setHSL(hue, 0.6, lightness);

      const emissive = particle.originalColor.clone().multiplyScalar(1.5);

      if (particle.meshRef.current) {
        const mesh = particle.meshRef.current;
        mesh.position.copy(particle.position);
        mesh.material.color.copy(particle.originalColor);
        mesh.material.emissive.copy(emissive);
        mesh.material.emissiveIntensity = 1.2;
        mesh.material.transparent = true;
        mesh.material.opacity = 1.0;
        mesh.visible = true;
      }
    }
  };

  return (
    <group>
      <ambientLight intensity={0.15} color={0xfff7de} />
      <directionalLight position={[40, 80, 30]} intensity={1.5} color={0xfff1b8} />

      <perspectiveCamera ref={cameraRef} makeDefault position={[0, 0, 80]} />

      {/* ✨ Sparkles */}
      {Array.from({ length: 120 }).map((_, i) => (
        <mesh key={`sparkle-${i}`} ref={el => sparkleRefs.current[i] = el} position={[
          (Math.random() - 0.5) * 1000, (Math.random() - 0.5) * 1000, (Math.random() - 0.5) * 1000
        ]}>
          <sphereGeometry args={[0.25, 6, 6]} />
          <meshBasicMaterial transparent opacity={0.5} color="#ffd700" />
        </mesh>
      ))}

      {/* ✨ Partículas Luminosas para Desintegración */}
      {particleRefs.current.map((_, i) => (
        <mesh
          key={`particle-${i}`}
          ref={el => particleRefs.current[i].meshRef = el}
          visible={false}
        >
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshBasicMaterial
            transparent
            opacity={1}
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={1}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* 📸 FOTOS COMPLETAS */}
      {textures.map((tex, i) => {
       const photoGeometry = useMemo(() => {
  const aspectRatio = 1080 / 1515; // ≈ 0.712
  const height = 15; // Keep the original height for consistency
  const width = height * aspectRatio; // Calculate width to maintain aspect ratio
  const geom = new THREE.PlaneGeometry(width, height, 80, 53); // Use calculated width
  return geom;
}, []);
        
        const material = useMemo(() => new THREE.ShaderMaterial({
          uniforms: {
            map: { value: tex },
            opacity: { value: 0 },
            time: { value: 0 },
            startTime: { value: 0 },
            delay: { value: 3 },
          },
          vertexShader: `
            uniform float time;
            uniform float startTime;
            uniform float delay;
            varying vec2 vUv;
            varying float vDissolve;
            varying vec3 vWorldPos;
            
            void main() {
              vUv = uv;
              vec3 pos = position;
              
              float effectiveTime = time - startTime - delay;
              
              if (effectiveTime > 0.0) {
                float dissolveThreshold = effectiveTime * 0.8;
                float vertexOrder = (position.y + 6.0) / 12.0 + (position.x + 9.0) / 18.0 * 0.3;
                vDissolve = smoothstep(vertexOrder - 0.1, vertexOrder + 0.1, dissolveThreshold);
                
                if (startTime > 0.0 && vDissolve > 0.01) {
                  pos *= (1.0 - vDissolve);
                }
              } else {
                vDissolve = 1.1;
              }
              vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
          `,
         fragmentShader: `
            uniform sampler2D map;
            uniform float opacity;
            uniform float time;
            uniform float startTime;
            uniform float delay;
            varying vec2 vUv;
            varying float vDissolve;
            varying vec3 vWorldPos;
            
            void main() {
              vec4 texColor = texture2D(map, vUv);
              
              float effectiveTime = time - startTime - delay;
              
              // Durante la animación normal (no desintegración)
              if (effectiveTime <= 0.0 || startTime == 0.0) {
                float alpha = texColor.a * opacity;
                gl_FragColor = vec4(texColor.rgb, alpha);
              } else {
                // Durante la desintegración
                float alpha = texColor.a * opacity * (1.0 - vDissolve);
                
                // Añadir brillo sutil a las partículas en desintegración
                vec3 finalColor = texColor.rgb;
                if (vDissolve > 0.4 && vDissolve < 0.9) {
                  // Efecto de luz suave en los bordes de desintegración
                  float edgeGlow = smoothstep(0.4, 0.65, vDissolve) * (1.0 - smoothstep(0.65, 0.9, vDissolve));
                  finalColor += vec3(1.0, 0.9, 0.6) * edgeGlow * 0.25;
                }
                
                gl_FragColor = vec4(finalColor, alpha);
              }
            }
          `,
          transparent: true,
          side: THREE.DoubleSide,
        }), [tex]);

        return (
          <group 
            key={`photo-group-${i}`}
            ref={photoGroupRefs.current[i]}
            visible={false}
            position={[0, 120, 0]}
          >
            <mesh 
              ref={imageRefs.current[i]} 
              geometry={photoGeometry}
            >
              <primitive object={material} attach="material" />
            </mesh>
          </group>
        );
      })}

      {/* 🛒 CANASTAS */}
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

      {/* 🛒 CANASTOS DE TRANSFORMACIÓN (uno por cada foto) */}
      {textures.map((_, i) => (
        <group
          key={`transform-basket-${i}`}
          ref={transformBasketRefs.current[i]}
          visible={false}
        >
          <primitive object={basketGeometry.clone()} />
        </group>
      ))}
    </group>
  );
}