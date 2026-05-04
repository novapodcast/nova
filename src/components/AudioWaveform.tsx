"use client";
import { useEffect, useRef } from 'react';

export default function AudioWaveform({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const bars = 60;
    const barWidth = rect.width / bars;
    const heights: number[] = [];
    const speeds: number[] = [];

    for (let i = 0; i < bars; i++) {
      heights.push(Math.random() * 0.7 + 0.3);
      speeds.push((Math.random() - 0.5) * 0.02);
    }

    let animationId: number;

    function animate() {
      if (!ctx || !canvas) return;
      
      ctx.clearRect(0, 0, rect.width, rect.height);

      for (let i = 0; i < bars; i++) {
        heights[i] += speeds[i];
        
        if (heights[i] > 1 || heights[i] < 0.2) {
          speeds[i] *= -1;
        }

        const x = i * barWidth;
        const barHeight = heights[i] * rect.height;
        const y = (rect.height - barHeight) / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
        gradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.8)');
        gradient.addColorStop(1, 'rgba(34, 197, 94, 0.3)');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth - 2, barHeight);
      }

      animationId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
