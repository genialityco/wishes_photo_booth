import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import ShoppingBasketScene from './ShoppingBasketScene';

export default function AnimationComponent({ photoUrls = [], message = 'HOLA' }) {
  return (
    <div style={{ 
      width: '100%', 
      height: '100vh', 
      background: 'black'  // 🔄 NEGRO ORIGINAL
    }}>
      <Canvas gl={{ antialias: true }} camera={{ fov: 75, position: [0, 0, 60] }}>
        <Suspense fallback={null}>
          <ShoppingBasketScene photoUrls={photoUrls} message={message} />
        </Suspense>
      </Canvas>
    </div>
  );
}