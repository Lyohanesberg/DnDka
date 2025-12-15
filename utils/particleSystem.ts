
import { VFXType } from '../types';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    color: string;
    alpha: number;
    type: 'fire' | 'heal' | 'blood' | 'magic' | 'rain' | 'snow' | 'ash';
}

export class ParticleSystem {
    particles: Particle[] = [];
    width: number = 800;
    height: number = 600;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
    }

    resize(width: number, height: number) {
        this.width = width;
        this.height = height;
    }

    // Create burst effect at grid coordinates
    createBurst(gridX: number, gridY: number, type: VFXType) {
        const centerX = gridX * 40 + 20;
        const centerY = gridY * 40 + 20;
        let count = 0;

        switch (type) {
            case 'fireball':
                count = 50;
                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = Math.random() * 3 + 1;
                    this.particles.push({
                        x: centerX,
                        y: centerY,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 40 + Math.random() * 20,
                        maxLife: 60,
                        size: Math.random() * 6 + 2,
                        color: `rgb(255, ${Math.floor(Math.random() * 150)}, 0)`,
                        alpha: 1,
                        type: 'fire'
                    });
                }
                break;
            case 'heal':
                count = 30;
                for (let i = 0; i < count; i++) {
                    this.particles.push({
                        x: centerX + (Math.random() - 0.5) * 40,
                        y: centerY + 20,
                        vx: (Math.random() - 0.5) * 0.5,
                        vy: -(Math.random() * 2 + 1),
                        life: 50 + Math.random() * 20,
                        maxLife: 70,
                        size: Math.random() * 3 + 1,
                        color: `rgb(100, 255, 150)`,
                        alpha: 1,
                        type: 'heal'
                    });
                }
                break;
            case 'blood':
                count = 20;
                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = Math.random() * 2 + 0.5;
                    this.particles.push({
                        x: centerX,
                        y: centerY,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 30 + Math.random() * 20,
                        maxLife: 50,
                        size: Math.random() * 4 + 2,
                        color: `rgb(200, 0, 0)`,
                        alpha: 1,
                        type: 'blood'
                    });
                }
                break;
            case 'magic':
                count = 40;
                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = Math.random() * 4;
                    this.particles.push({
                        x: centerX,
                        y: centerY,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 40,
                        maxLife: 40,
                        size: Math.random() * 3,
                        color: `rgb(100, 200, 255)`,
                        alpha: 1,
                        type: 'magic'
                    });
                }
                break;
        }
    }

    // Create ambient weather particles
    updateWeather(type: 'rain' | 'snow' | 'ash' | 'none' | 'fog') {
        // Add new particles based on density
        if (type === 'rain') {
            if (this.particles.filter(p => p.type === 'rain').length < 300) {
                for(let i=0; i<5; i++) {
                    this.particles.push({
                        x: Math.random() * this.width,
                        y: -10,
                        vx: 1,
                        vy: 10 + Math.random() * 5,
                        life: 1000,
                        maxLife: 1000,
                        size: 2,
                        color: 'rgba(150, 150, 255, 0.5)',
                        alpha: 0.5,
                        type: 'rain'
                    });
                }
            }
        } else if (type === 'snow') {
            if (this.particles.filter(p => p.type === 'snow').length < 200) {
                this.particles.push({
                    x: Math.random() * this.width,
                    y: -10,
                    vx: (Math.random() - 0.5),
                    vy: 1 + Math.random(),
                    life: 1000,
                    maxLife: 1000,
                    size: Math.random() * 3 + 2,
                    color: 'rgba(255, 255, 255, 0.8)',
                    alpha: 0.8,
                    type: 'snow'
                });
            }
        } else if (type === 'ash') {
            if (this.particles.filter(p => p.type === 'ash').length < 100) {
                this.particles.push({
                    x: Math.random() * this.width,
                    y: -10,
                    vx: (Math.random() - 0.5) * 2,
                    vy: 1 + Math.random(),
                    life: 1000,
                    maxLife: 1000,
                    size: Math.random() * 3 + 1,
                    color: 'rgba(100, 100, 100, 0.6)',
                    alpha: 0.6,
                    type: 'ash'
                });
            }
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            p.life--;
            p.x += p.vx;
            p.y += p.vy;

            // Type specific behavior
            if (p.type === 'fire') {
                p.size *= 0.95;
                p.vy -= 0.05; // rise
                p.alpha = p.life / p.maxLife;
            } else if (p.type === 'heal') {
                p.vy -= 0.02; // slow rise
                p.alpha = p.life / p.maxLife;
                p.size *= 0.98;
            } else if (p.type === 'blood') {
                p.vy += 0.2; // gravity
                p.size *= 0.98;
            } else if (p.type === 'rain') {
                if (p.y > this.height) {
                    p.y = -10;
                    p.x = Math.random() * this.width;
                }
            } else if (p.type === 'snow' || p.type === 'ash') {
                p.x += Math.sin(Date.now() / 500 + p.life) * 0.5; // sway
                if (p.y > this.height) {
                    p.y = -10;
                    p.x = Math.random() * this.width;
                }
            }

            if (p.life <= 0 && p.type !== 'rain' && p.type !== 'snow' && p.type !== 'ash') {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        // Clear Logic is handled by parent usually, but we can assume additives here
        
        // Draw Fog Overlay manually first if needed, but handled via CSS usually.
        
        for (const p of this.particles) {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            
            if (p.type === 'rain') {
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + p.vx, p.y + p.vy);
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 1;
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    }
}
