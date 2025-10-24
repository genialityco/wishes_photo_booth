import React, { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useWishStyle } from "@/context/Context";

export default function CascadeAnimation() {
  const [rows, setRows] = useState([]);
  const loaderRef = useRef(new THREE.TextureLoader());
  const { wishImage } = useWishStyle();

  // 🌊 CONFIG
  const photoWidth = 12;
  const photoHeight = 16;
  const spacingX = 16;
  const spacingY = 20;
  const pushDownSpeed = 0.08;
  const amplitude = 1.5;
  const rotationAmplitude = 0.05;

  // 📸 Cargar grupo de imágenes (una fila)
  useEffect(() => {
    if (!wishImage?.length) return;

    const newGroup = wishImage.filter(Boolean);
    if (newGroup.length === 0) return;

    const textures = [];
    let loaded = 0;

    newGroup.forEach((url, index) => {
      loaderRef.current.load(
        url,
        (texture) => {
          // 🔧 CONFIGURACIÓN CRÍTICA DE LA TEXTURA
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.needsUpdate = true;
          
          textures[index] = texture;
          loaded++;
          
          if (loaded === newGroup.length) {
            const startTime = performance.now() / 1000;

            // 🎨 Fila estilo collage con variaciones
            const collageOffsets = textures.map(() => ({
              offsetX: (Math.random() - 0.5) * 3,
              offsetY: (Math.random() - 0.5) * 3,
              rotZ: (Math.random() - 0.5) * 0.25,
              scale: 0.85 + Math.random() * 0.3,
              depth: (Math.random() - 0.5) * 2,
            }));

            const newRow = {
              id: `row-${startTime}-${Math.random()}`,
              startTime,
              textures,
              collageOffsets,
              currentY: 80,
              targetY: 40,
              opacity: 0,
            };

            // ⬇️ Mover filas existentes hacia abajo y limitar a 60 texturas
            setRows((prev) => {
              const updatedRows = [
                newRow,
                ...prev.map((r) => ({
                  ...r,
                  targetY: r.targetY - spacingY,
                })),
              ];

              // 🚨 LIMITAR A 60 TEXTURAS TOTALES
              let totalTextures = 0;
              const limitedRows = [];
              
              for (const row of updatedRows) {
                if (totalTextures + row.textures.length <= 60) {
                  limitedRows.push(row);
                  totalTextures += row.textures.length;
                } else {
                  // Disponer texturas antiguas
                  row.textures.forEach(tex => tex?.dispose());
                  break;
                }
              }

              console.log('🎯 Total de texturas:', totalTextures);
              console.log('📊 Número de filas:', limitedRows.length);

              return limitedRows;
            });
          }
        },
        undefined,
        (err) => {
          console.error("Error cargando imagen:", url, err);
          loaded++;
          textures[index] = null;
        }
      );
    });

    // Cleanup al desmontar
    return () => {
      rows.forEach(row => {
        row.textures.forEach(tex => tex?.dispose());
      });
    };
  }, [wishImage]);

  // 🎬 ANIMACIÓN
  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    setRows((prev) =>
      prev.map((row, rowIndex) => {
        const elapsed = t - row.startTime;

        // 🪄 Entrada con rebote
        if (elapsed < 1.5) {
          const p = Math.min(1, elapsed / 1.5);
          const ease = 1 - Math.pow(1 - p, 3);
          const bounce = Math.sin(p * Math.PI) * 2.5;
          row.currentY = 80 - (80 - row.targetY) * ease + bounce;
          row.opacity = p;
        } else {
          row.currentY += (row.targetY - row.currentY) * pushDownSpeed;
        }

        row.depth = -5 - rowIndex * 2;

        return row;
      })
    );
  });

  return (
    <group>
      {/* 💡 LUCES */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={0.9} />
      <pointLight position={[0, 40, 20]} intensity={0.4} color="#ffd700" />

      {/* 🖼️ FILAS */}
      {rows.map((row) => {
        const total = row.textures.length;
        return (
          <group key={row.id} position={[0, row.currentY, row.depth]}>
            {row.textures.map((tex, i) => {
              if (!tex) return null; // Skip texturas que fallaron
              
              const off = row.collageOffsets[i];
              const x = (i - (total - 1) / 2) * spacingX + off.offsetX;
              const y = off.offsetY + Math.sin(i * 0.7 + performance.now() / 600) * amplitude;
              const rZ = off.rotZ + Math.sin(i * 0.5 + performance.now() / 800) * rotationAmplitude;

              return (
                <mesh
                  key={`${row.id}-img-${i}`}
                  position={[x, y, off.depth]}
                  rotation={[0, 0, rZ]}
                  scale={[off.scale, off.scale, 1]}
                >
                  <planeGeometry args={[photoWidth, photoHeight]} />
                  <meshStandardMaterial
                    map={tex}
                    transparent
                    opacity={row.opacity}
                    side={THREE.DoubleSide}
                    emissiveIntensity={0.12 + Math.sin(i * 0.3 + performance.now() / 500) * 0.05}
                    toneMapped={false}
                  />
                </mesh>
              );
            })}
          </group>
        );
      })}

      {/* ✨ Partículas decorativas */}
      {Array.from({ length: 50 }).map((_, i) => (
        <mesh
          key={`particle-${i}`}
          position={[
            (Math.random() - 0.5) * 100,
            Math.random() * 100 - 20,
            (Math.random() - 0.5) * 30,
          ]}
        >
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshBasicMaterial
            color="#ffd700"
            transparent
            opacity={0.15 + Math.random() * 0.25}
          />
        </mesh>
      ))}
    </group>
  );
}