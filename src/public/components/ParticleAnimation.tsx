import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  targetX: number;
  targetY: number;
  originalX: number;
  originalY: number;
  life: number;
  maxLife: number;
}

interface Props {
  imageSrc: string;
  boxSize?: number | string; // ← Puede ser "min(88vw, 60svh)" o un número
  onComplete: () => void;
}

export default function ParticleAnimation({ 
  imageSrc, 
  boxSize = "min(88vw, 60svh)", // mismo valor por defecto que PreviewStep
  onComplete 
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef<'showImage' | 'fragment' | 'converge' | 'ascend' | 'complete'>('showImage');
  const startTimeRef = useRef<number>(0);
  const animationIdRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // 🔹 Convertir boxSize responsivo (vw/svh) a píxeles reales
    let boxSizePx: number;
    if (typeof boxSize === "string") {
      const temp = document.createElement("div");
      temp.style.position = "absolute";
      temp.style.visibility = "hidden";
      temp.style.width = boxSize;
      document.body.appendChild(temp);
      boxSizePx = temp.offsetWidth;
      document.body.removeChild(temp);
    } else {
      boxSizePx = boxSize;
    }

    // 🔹 Limitar tamaño entre 200–800 px
    const safeBoxSize = Math.max(200, Math.min(boxSizePx, 800));

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const imgX = centerX - 360 / 2;
    const imgY = centerY - 506 / 2;
    const imgWidth = 360;
    const imgHeight = 506;
    
    console.log(`🎯 Tamaño imagen inicial: ${safeBoxSize}px`);

    const particles: Particle[] = [];
    let imgElement: HTMLImageElement | null = null;
    
    startTimeRef.current = Date.now();
    
    const convergenceX = centerX;
    const convergenceY = centerY;
    let lightBallY = centerY;
    let lightBallSize = 0;
    let lightBallOpacity = 0;

    const img = new Image();
    img.onload = () => {
      imgElement = img;

      // ✅ DIBUJAR IMAGEN inicial centrada y del mismo tamaño que PreviewStep
      ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);

      // ✅ Obtener datos de píxeles
      const imageData = ctx.getImageData(
        Math.floor(imgX), 
        Math.floor(imgY), 
        Math.floor(imgWidth), 
        Math.floor(imgHeight)
      );

      // ✨ Crear partículas
      const sample = 12;
      for (let y = 0; y < imgHeight; y += sample) {
        for (let x = 0; x < imgWidth; x += sample) {
          const i = (Math.floor(y) * imgWidth + Math.floor(x)) * 4;
          if (i < imageData.data.length) {
            const alpha = imageData.data[i + 3];
            const brightness = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;

            if (alpha > 30 && brightness > 50) {
              const size = Math.random() * 2 + 1;
              const life = Math.random() * 100 + 50;
              
              particles.push({
                x: imgX + x,
                y: imgY + y,
                vx: 0,
                vy: 0,
                size,
                color: `rgb(${imageData.data[i]}, ${imageData.data[i + 1]}, ${imageData.data[i + 2]})`,
                alpha: 0,
                targetX: convergenceX,
                targetY: convergenceY,
                originalX: imgX + x,
                originalY: imgY + y,
                life,
                maxLife: life,
              });
            }
          }
        }
      }

      console.log(`✨ ${particles.length} partículas listas`);
      animate();
    };
    
    img.onerror = () => {
      console.error('❌ Error cargando imagen');
      onComplete();
    };
    
    img.src = imageSrc;

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (phaseRef.current === 'showImage') {
        if (elapsed < 1500) {
          ctx.drawImage(imgElement!, imgX, imgY, imgWidth, imgHeight);
        } else {
          phaseRef.current = 'fragment';
          startTimeRef.current = Date.now();
        }
      }
      
      else if (phaseRef.current === 'fragment') {
        const fragmentElapsed = Date.now() - startTimeRef.current;
        const progress = Math.min(fragmentElapsed / 1500, 1);
        
        const fadeProgress = 1 - Math.pow(1 - progress, 2);
        ctx.globalAlpha = 1 - fadeProgress;
        ctx.drawImage(imgElement!, imgX, imgY, imgWidth, imgHeight);
        ctx.globalAlpha = 1;
        
        particles.forEach((p, i) => {
          const particleProgress = progress * (1 + Math.sin(i * 0.1));
          p.alpha = Math.min(1, particleProgress);
          
          if (p.vx === 0 && particleProgress > 0.1) {
            const centerOffsetX = (imgX + imgWidth/2) - p.originalX;
            const centerOffsetY = (imgY + imgHeight/2) - p.originalY;
            const distance = Math.hypot(centerOffsetX, centerOffsetY);
            const angle = Math.atan2(centerOffsetY, centerOffsetX) + (Math.random() - 0.5) * 0.5;
            const speed = (distance / imgWidth) * 8 + 2;
            
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
          }
          
          p.x += p.vx * 0.97;
          p.y += p.vy * 0.97;
          p.life -= 0.5;
          
          const pulse = Math.sin(fragmentElapsed * 0.02 + i) * 0.3 + 0.7;
          const glow = p.life / p.maxLife * 15;
          
          ctx.globalAlpha = p.alpha * (p.life / p.maxLife);
          ctx.fillStyle = p.color;
          ctx.shadowBlur = glow;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * pulse, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.shadowBlur = 0;
        
        if (fragmentElapsed >= 1500) {
          phaseRef.current = 'converge';
          startTimeRef.current = Date.now();
        }
      }
      
      else if (phaseRef.current === 'converge') {
        const convergeElapsed = Date.now() - startTimeRef.current;
        const progress = Math.min(convergeElapsed / 1200, 1);
        
        particles.forEach(p => {
          const dx = convergenceX - p.x;
          const dy = convergenceY - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 1) {
            const force = 0.08 * (1 + progress * 2);
            p.x += dx * force;
            p.y += dy * force;
          }
          
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#FFD700';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.shadowBlur = 0;

        lightBallSize = 10 + progress * 30;
        lightBallOpacity = progress;
        ctx.globalAlpha = lightBallOpacity;
        ctx.fillStyle = '#FFD700';
        ctx.shadowBlur = 50;
        ctx.shadowColor = '#FFD700';
        ctx.beginPath();
        ctx.arc(convergenceX, convergenceY, lightBallSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (convergeElapsed >= 1200) {
          phaseRef.current = 'ascend';
          startTimeRef.current = Date.now();
        }
      }
      
      else if (phaseRef.current === 'ascend') {
        const ascendElapsed = Date.now() - startTimeRef.current;
        const progress = Math.min(ascendElapsed / 1000, 1);
        
        lightBallY = centerY - (canvas.height * progress * 1.2);
        
        for (let i = 0; i < 4; i++) {
          const trailY = lightBallY + i * 20;
          const trailAlpha = lightBallOpacity * (1 - i * 0.3);
          ctx.globalAlpha = trailAlpha;
          ctx.fillStyle = '#FFD700';
          ctx.shadowBlur = 30 - i * 7;
          ctx.shadowColor = '#FFD700';
          ctx.beginPath();
          ctx.arc(convergenceX, trailY, lightBallSize * (1 - i * 0.2), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;

        ctx.globalAlpha = lightBallOpacity;
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowBlur = 60;
        ctx.shadowColor = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(convergenceX, lightBallY, lightBallSize * 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (lightBallY < -100 || progress >= 1) {
          onComplete();
          return;
        }
      }

      if (phaseRef.current !== 'complete') {
        animationIdRef.current = requestAnimationFrame(animate);
      }
    };

    return () => {
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
    };
  }, [imageSrc, boxSize, onComplete]);

  return (
    <canvas 
      ref={canvasRef}
      className=" w-full h-full inset-0 z-50 pointer-events-none"
      style={{ background: 'transparent' }}
    />
  );
}
