import React, { useRef, useEffect } from 'react';
import { WeatherType, VisualEffect } from '../types';
import { ParticleSystem } from '../utils/particleSystem';

interface VisualFXProps {
    width: number;
    height: number;
    weather: WeatherType;
    activeEffects: VisualEffect[];
}

const VisualFX: React.FC<VisualFXProps> = ({ width, height, weather, activeEffects }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particleSystemRef = useRef<ParticleSystem>(new ParticleSystem(width, height));
    const animationRef = useRef<number | null>(null);
    const processedEffects = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (particleSystemRef.current) {
            particleSystemRef.current.resize(width, height);
        }
    }, [width, height]);

    useEffect(() => {
        activeEffects.forEach(effect => {
            if (!processedEffects.current.has(effect.id)) {
                particleSystemRef.current.createBurst(effect.x, effect.y, effect.type);
                processedEffects.current.add(effect.id);
            }
        });
        if (processedEffects.current.size > 50) {
            processedEffects.current.clear();
            activeEffects.forEach(e => processedEffects.current.add(e.id));
        }
    }, [activeEffects]);

    useEffect(() => {
        if (weather === 'none') {
            const ps = particleSystemRef.current;
            ps.particles = ps.particles.filter(p => p.type !== 'rain' && p.type !== 'snow' && p.type !== 'ash');
        }
    }, [weather]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ps = particleSystemRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const render = () => {
            if (weather !== 'none' && weather !== 'fog') {
                ps.updateWeather(weather as any);
            }
            ps.update();
            ctx.clearRect(0, 0, width, height);
            if (weather === 'fog') {
                ctx.fillStyle = 'rgba(200, 200, 200, 0.2)';
                ctx.fillRect(0, 0, width, height);
            }
            ps.draw(ctx);
            animationRef.current = requestAnimationFrame(render);
        };
        render();
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [width, height, weather]);

    return <canvas ref={canvasRef} width={width} height={height} className="absolute inset-0 z-40 pointer-events-none" />;
};

export default VisualFX;
