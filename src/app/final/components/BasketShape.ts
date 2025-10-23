/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from 'three';

interface BasketDimensions {
  width: number;
  height: number;
  depth: number;
  wallThickness: number;
  handleRadius: number;
  handleHeight: number;
  labelSize: number;
}

interface BasketOptions {
  size?: number;
  color?: number;
  labelText?: string;
}

/**
 * 🛒 Cesta Dorada con Manijas Luminosas
 * Diseño metálico dorado, manijas redondeadas, brillo y reflejos realistas.
 */
export function createShoppingBasketGeometry(options: BasketOptions = {}): THREE.Group {
  const {
    size = 1,
    color = 0xffd700,  // 💛 Dorado brillante
    labelText = 'SHOP'
  } = options;

  const group = new THREE.Group();

  const DIMENSIONS: BasketDimensions = {
    width: 6, height: 2, depth: 4,
    wallThickness: 0.08,
    handleRadius: 0.18,
    handleHeight: 2.4,
    labelSize: 2.2
  };

  // 🧺 BASE DORADA
  const basket = createGoldenBasketBase(DIMENSIONS, color);
  group.add(basket);

  // 🪶 MANIJAS SUAVES Y REDONDEADAS
  const handles = createGoldenHandles(DIMENSIONS);
  group.add(...handles);

  // 🏷️ ETIQUETA
  const label = createReliefLabel(DIMENSIONS, labelText);
  //group.add(label);

  // ✨ Escala y posición
  group.scale.setScalar(size * 0.25);
  group.position.y = 0.5;

  group.updateMatrixWorld();
  return group;
}

// 🧺 BASE DORADA METÁLICA
function createGoldenBasketBase(dim: BasketDimensions, color: number): THREE.Group {
  const group = new THREE.Group();

  const outerGeom = createTaperedBox(dim.width, dim.height, dim.depth, 12, 6, 10);
  const outerMat = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.5,
    roughness: 0.2,                // menos rugosidad = más reflejo
    clearcoat: 1.0,
    clearcoatRoughness: 0.5,
    reflectivity: 1.0,
    emissive: new THREE.Color(color).multiplyScalar(0.4), // más brillo
    emissiveIntensity: 0.6,
  });
  const outerMesh = new THREE.Mesh(outerGeom, outerMat);
  group.add(outerMesh);

  const rim = createRim(dim, color);
  //group.add(rim);

  return group;
}

// 📦 GEOMETRÍA CON LIGERA INCLINACIÓN
function createTaperedBox(w: number, h: number, d: number, sw: number, sh: number, sd: number): THREE.BoxGeometry {
  const geom = new THREE.BoxGeometry(w, h*2, d * 2, sw, sh, sd); // ⬅️ Doble profundidad
  const pos = geom.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const taper = 0.12 * (y / h);
    const x = pos.getX(i);
    const z = pos.getZ(i);
    if (Math.abs(x) > 0.1 || Math.abs(z) > 0.1) {
      pos.setX(i, x * (1 + taper));
      pos.setZ(i, z * (1 + taper));
    }
  }

  geom.computeVertexNormals();
  return geom;
}

// 🪶 MANIJAS DORADAS LUMINOSAS
// 🪶 MANIJAS DORADAS LUMINOSAS (más arriba del borde)
function createGoldenHandles(dim: BasketDimensions): THREE.Mesh[] {
  const handleMat = new THREE.MeshPhysicalMaterial({
    color: 0xffd700,
    metalness: 0.5,
    roughness: 0.15,               // menos rugosidad = más reflejo
    reflectivity: 1.0,
    emissive: new THREE.Color(0xfff2b3),
    emissiveIntensity: 0.35,       // mayor brillo
    clearcoat: 1.0,
  });

  const handles: THREE.Mesh[] = [];
  const yOffset = dim.height * 0.8; // ⬆️ Ahora se elevan sobre el borde del basket

  [-dim.depth / 2 + 0.25, dim.depth / 2 - 0.25].forEach(zOffset => {
    // Curva más alta y centrada
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-dim.width / 2 * 0.9, yOffset, zOffset),
      new THREE.Vector3(-dim.width / 4, dim.handleHeight * 1.3 + yOffset, zOffset * 0.5),
      new THREE.Vector3(dim.width / 4, dim.handleHeight * 1.3 + yOffset, zOffset * 0.5),
      new THREE.Vector3(dim.width / 2 * 0.9, yOffset, zOffset)
    ]);

    const tubeGeom = new THREE.TubeGeometry(curve, 32, dim.handleRadius, 16, false);
    const tubeMesh = new THREE.Mesh(tubeGeom, handleMat);
    handles.push(tubeMesh);
  });

  return handles;
}



// 🏷️ ETIQUETA FRONTAL
function createReliefLabel(dim: BasketDimensions, text: string): THREE.Group {
  const group = new THREE.Group();

  const labelGeom = new THREE.BoxGeometry(dim.labelSize, 0.9, 0.04);
  const labelMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.2,
    roughness: 0.3,
    clearcoat: 0.8,
  });

  const labelMesh = new THREE.Mesh(labelGeom, labelMat);
  labelMesh.position.set(0, 0.3, dim.depth / 2 + 0.05);
  group.add(labelMesh);

  // Relieve simulado
  const textGeom = new THREE.PlaneGeometry(0.4, 0.4);
  const textMat = new THREE.MeshPhysicalMaterial({
    color: 0xffd700,
    emissive: 0xfff2b3,
    emissiveIntensity: 0.2,
    roughness: 0.2,
  });
  const textMesh = new THREE.Mesh(textGeom, textMat);
  textMesh.position.set(0, 0.4, dim.depth / 2 + 0.06);
  group.add(textMesh);

  return group;
}

// 🛡️ BORDE SUPERIOR REFORZADO
function createRim(dim: BasketDimensions, color: number): THREE.Mesh {
  const rimGeom = new THREE.TorusGeometry(dim.width / 2 * 1.02, 0.08, 8, 24);
  rimGeom.rotateX(-Math.PI / 2);

  const rimMat = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 1.0,
    roughness: 0.15,
    clearcoat: 1.0,
    emissive: new THREE.Color(color).multiplyScalar(0.15),
    emissiveIntensity: 0.25,
  });

  return new THREE.Mesh(rimGeom, rimMat);
}