/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from 'three';

interface CartDimensions {
  width: number;
  height: number;
  depth: number;
  wallThickness: number;
  handleRadius: number;
  handleHeight: number;
  wheelRadius: number;
  cageHeight: number;
}

interface CartOptions {
  size?: number;
  color?: number;
  labelText?: string;
}

/**
 * 🛒 Carrito de Compra Dorado con Ruedas
 * Diseño metálico dorado plateado, malla tipo rejilla, ruedas funcionales, brillo y reflejos realistas.
 */
export function createShoppingCartGeometry(options: CartOptions = {}): THREE.Group {
  const {
    size = 1,
    color = 0xffd700,  // 🥈 Plateado metálico
    labelText = 'CART'
  } = options;

  const group = new THREE.Group();

  const DIMENSIONS: CartDimensions = {
    width: 5,
    height: 4,
    depth: 7,
    wallThickness: 0.12,
    handleRadius: 0.15,
    handleHeight: 5.5,
    wheelRadius: 0.4,
    cageHeight: 4
  };

  // 🧺 CESTA PRINCIPAL CON REJILLA
  const basket = createCartBasket(DIMENSIONS, color);
  group.add(basket);

  // 🪜 MANGO ERGONÓMICO
  const handle = createCartHandle(DIMENSIONS, color);
  group.add(handle);

  // 🎯 RUEDAS
  const wheels = createWheels(DIMENSIONS, color);
  group.add(...wheels);

  // 🏗️ ESTRUCTURA DE SOPORTE
//   const frame = createCartFrame(DIMENSIONS, color);
//   group.add(frame);

  // ✨ Escala y posición
  group.scale.setScalar(size * 0.22);
  group.position.y = 0.5;

  group.updateMatrixWorld();
  return group;
}

// 🧺 CESTA PRINCIPAL CON EFECTO DE REJILLA
function createCartBasket(dim: CartDimensions, color: number): THREE.Group {
  const group = new THREE.Group();

  // Material plateado metálico brillante
  const metalMat = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.85,
    roughness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.2,
    reflectivity: 1.0,
    emissive: new THREE.Color(color).multiplyScalar(0.3),
    emissiveIntensity: 0.5,
  });

  // Base inclinada hacia arriba (más estrecha abajo)
  const baseGeom = createTaperedCartBox(dim.width, dim.height, dim.depth);
  const baseMesh = new THREE.Mesh(baseGeom, metalMat);
  baseMesh.position.y = dim.height / 2 + dim.wheelRadius;
  group.add(baseMesh);

  return group;
}

// 📦 CAJA CON INCLINACIÓN (más ancha arriba y angosta adelante desde atrás)
function createTaperedCartBox(w: number, h: number, d: number): THREE.BoxGeometry {
  const geom = new THREE.BoxGeometry(w, h, d, 12, 8, 14);
  const pos = geom.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const x = pos.getX(i);
    
    // Inclinación vertical (más ancho arriba)
    const taperY = y > 0 ? 0.15 * (y / h) : -0.05 * (y / h);
    
    // Inclinación frontal progresiva desde atrás hasta adelante
    const normalizedZ = (z + d / 2) / d; // 0 en atrás, 1 en adelante
    const taperZ = -0.35 * normalizedZ; // Se estrecha progresivamente hacia adelante
    
    if (Math.abs(x) > 0.1 || Math.abs(z) > 0.1) {
      pos.setX(i, x * (1 + taperY + taperZ));
      if (Math.abs(z) > 0.1) {
        pos.setZ(i, z * (1 + taperY * 0.5));
      }
    }
  }

  geom.computeVertexNormals();
  return geom;
}

// 🔲 EFECTO DE REJILLA METÁLICA
function createWireframeEffect(dim: CartDimensions, color: number): THREE.Group {
  const group = new THREE.Group();
  
  const wireMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color).multiplyScalar(0.8),
    metalness: 1.0,
    roughness: 0.1,
    emissive: new THREE.Color(color).multiplyScalar(0.2),
    emissiveIntensity: 0.4,
  });

  // Barras verticales
  const barGeom = new THREE.CylinderGeometry(0.08, 0.08, dim.height, 8);
  const spacing = dim.width / 6;
  
  for (let i = -2; i <= 2; i++) {
    // Frente
    const barFront = new THREE.Mesh(barGeom, wireMat);
    barFront.position.set(i * spacing, 0, dim.depth / 2);
    group.add(barFront);
    
    // Atrás
    const barBack = new THREE.Mesh(barGeom, wireMat);
    barBack.position.set(i * spacing, 0, -dim.depth / 2);
    group.add(barBack);
  }

  // Barras horizontales
  const hBarGeom = new THREE.CylinderGeometry(0.08, 0.08, dim.width * 1.1, 8);
  hBarGeom.rotateZ(Math.PI / 2);
  
  for (let i = -1; i <= 1; i++) {
    const hBar = new THREE.Mesh(hBarGeom, wireMat);
    hBar.position.set(0, i * (dim.height / 3), dim.depth / 2);
    group.add(hBar);
  }

  return group;
}

// 🪜 MANGO ERGONÓMICO EN FORMA DE U INVERTIDA
function createCartHandle(dim: CartDimensions, color: number): THREE.Group {
  const group = new THREE.Group();

  const handleMat = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.9,
    roughness: 0.12,
    reflectivity: 1.0,
    emissive: new THREE.Color(color).multiplyScalar(0.4),
    emissiveIntensity: 0.6,
    clearcoat: 1.0,
  });

  // Curva en U invertida
  const handleWidth = dim.width * 0.85;
  const handleTop = dim.handleHeight + dim.wheelRadius;
  const handleBottom = dim.wheelRadius + dim.height;
  
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-handleWidth / 2, handleBottom, -dim.depth / 2),
    new THREE.Vector3(-handleWidth / 2, handleTop, -dim.depth / 2),
    new THREE.Vector3(0, handleTop, -dim.depth / 2),
    new THREE.Vector3(handleWidth / 2, handleTop, -dim.depth / 2),
    new THREE.Vector3(handleWidth / 2, handleBottom, -dim.depth / 2)
  ]);

  const tubeGeom = new THREE.TubeGeometry(curve, 48, dim.handleRadius * 1.1, 12, false);
  const handleMesh = new THREE.Mesh(tubeGeom, handleMat);
  group.add(handleMesh);

  return group;
}

// 🎯 RUEDAS GIRATORIAS
function createWheels(dim: CartDimensions, color: number): THREE.Mesh[] {
  const wheels: THREE.Mesh[] = [];
  
  const wheelMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a1a1a,
    metalness: 0.3,
    roughness: 0.7,
    clearcoat: 0.5,
  });

  const rimMat = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 1.0,
    roughness: 0.1,
    emissive: new THREE.Color(color).multiplyScalar(0.2),
    emissiveIntensity: 0.3,
  });

  const positions = [
    [-dim.width / 3, -dim.depth / 2.5],
    [dim.width / 3, -dim.depth / 2.5],
    [-dim.width / 3, dim.depth / 2.5],
    [dim.width / 3, dim.depth / 2.5],
  ];

  positions.forEach(([x, z]) => {
    // Rueda negra
    const wheelGeom = new THREE.CylinderGeometry(dim.wheelRadius, dim.wheelRadius, 0.3, 16);
    wheelGeom.rotateZ(Math.PI / 2);
    const wheel = new THREE.Mesh(wheelGeom, wheelMat);
    wheel.position.set(x, dim.wheelRadius * 0.5, z);
    wheels.push(wheel);

    // Rin plateado
    const rimGeom = new THREE.TorusGeometry(dim.wheelRadius * 0.6, 0.08, 8, 16);
    rimGeom.rotateY(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeom, rimMat);
    rim.position.set(x, dim.wheelRadius * 0.5, z);
    wheels.push(rim);
  });

  return wheels;
}

// 🏗️ ESTRUCTURA DE SOPORTE INFERIOR
function createCartFrame(dim: CartDimensions, color: number): THREE.Group {
  const group = new THREE.Group();

  const frameMat = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 1.0,
    roughness: 0.2,
    emissive: new THREE.Color(color).multiplyScalar(0.25),
    emissiveIntensity: 0.4,
  });

  // Barras de soporte diagonales
  const supportGeom = new THREE.CylinderGeometry(0.12, 0.12, dim.depth * 1.1, 8);
  
  [-dim.width / 3, dim.width / 3].forEach(x => {
    const support = new THREE.Mesh(supportGeom, frameMat);
    support.position.set(x, dim.wheelRadius + 1, 0);
    support.rotation.x = Math.PI / 2;
    group.add(support);
  });

  // Barra transversal inferior
  const crossBarGeom = new THREE.CylinderGeometry(0.12, 0.12, dim.width * 0.8, 8);
  crossBarGeom.rotateZ(Math.PI / 2);
  const crossBar = new THREE.Mesh(crossBarGeom, frameMat);
  crossBar.position.set(0, dim.wheelRadius + 0.5, dim.depth / 3);
  group.add(crossBar);

  return group;
}