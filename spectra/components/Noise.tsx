import type React from 'react';
import { useRef, useEffect } from 'react';
import './Noise.css';

interface NoiseProps {
  patternSize?: number;
  patternAlpha?: number;
  animated?: boolean;
  patternRefreshInterval?: number;
}

const Noise: React.FC<NoiseProps> = ({
  patternSize = 150,
  patternAlpha = 15,
  animated = false,
  patternRefreshInterval = 10
}) => {
  const grainRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = grainRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const canvasSize = 512;

    const resize = () => {
      if (!canvas) return;
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
    };

    const drawGrain = () => {
      const imageData = ctx.createImageData(canvasSize, canvasSize);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const value = Math.random() * 255;
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
        data[i + 3] = patternAlpha;
      }

      ctx.putImageData(imageData, 0, 0);
    };

    window.addEventListener('resize', resize);
    resize();
    drawGrain();

    let animationId: number;
    let frame = 0;

    if (animated) {
      const loop = () => {
        if (frame % patternRefreshInterval === 0) {
          drawGrain();
        }
        frame++;
        animationId = window.requestAnimationFrame(loop);
      };
      animationId = requestAnimationFrame(loop);
    }

    return () => {
      window.removeEventListener('resize', resize);
      if (animated && animationId) {
        window.cancelAnimationFrame(animationId);
      }
    };
  }, [patternSize, patternAlpha, animated, patternRefreshInterval]);

  return <canvas className="noise-overlay" ref={grainRef} />;
};

export default Noise;
