/**
 * High-performance Canvas Fireworks & Crackers Engine
 * Simulates aerial shell launches, explosive detonation, gravity, drag, and flickering spark trails.
 */

export interface FireworkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
  decay: number;
  gravity: number;
  trail: { x: number; y: number }[];
}

export interface Rocket {
  x: number;
  y: number;
  targetY: number;
  vy: number;
  color: string;
  trail: { x: number; y: number }[];
  exploded: boolean;
}

export class FireworksFX {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private particles: FireworkParticle[] = [];
  private rockets: Rocket[] = [];
  private colorPalette: string[];
  private lastLaunch: number = 0;
  private launchInterval: number = 800; // Launch new shell every 800ms

  constructor(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    colors: string[] = ['#F59E0B', '#EF4444', '#38BDF8', '#10B981', '#FCD34D', '#EC4899']
  ) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.colorPalette = colors.length ? colors : ['#F59E0B', '#FCD34D', '#38BDF8'];

    // Launch initial rockets immediately
    this.launchRocket(this.width * 0.35, this.height * 0.28);
    this.launchRocket(this.width * 0.65, this.height * 0.22);
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  public launchRocket(targetX?: number, targetY?: number) {
    const x = targetX ?? (this.width * 0.2 + Math.random() * (this.width * 0.6));
    const destY = targetY ?? (this.height * 0.15 + Math.random() * (this.height * 0.28));
    const color = this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)];

    this.rockets.push({
      x,
      y: this.height,
      targetY: destY,
      vy: -11 - Math.random() * 4,
      color,
      trail: [],
      exploded: false,
    });
  }

  private explode(x: number, y: number, baseColor: string) {
    const count = this.width < 640 ? 45 : 75;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.2;
      const speed = Math.random() * 5.5 + 1.2;
      const color = Math.random() > 0.4
        ? baseColor
        : this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1.0,
        color,
        size: Math.random() * 2.5 + 1.2,
        decay: Math.random() * 0.018 + 0.012,
        gravity: 0.065,
        trail: [],
      });
    }
  }

  public updateAndDraw(now: number) {
    // Launch periodic rockets
    if (now - this.lastLaunch > this.launchInterval) {
      this.launchRocket();
      this.lastLaunch = now;
      this.launchInterval = 700 + Math.random() * 600;
    }

    const ctx = this.ctx;

    // 1. Update and draw ascending rockets
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.y += r.vy;
      r.vy *= 0.985; // Slight atmospheric resistance

      // Record rocket trail
      r.trail.push({ x: r.x, y: r.y });
      if (r.trail.length > 7) r.trail.shift();

      // Draw rocket tail
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      for (let t = r.trail.length - 1; t >= 0; t--) {
        ctx.lineTo(r.trail[t].x, r.trail[t].y);
      }
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 6;
      ctx.shadowColor = r.color;
      ctx.stroke();

      // Check detonation point
      if (r.y <= r.targetY || r.vy >= -1.5) {
        this.explode(r.x, r.y, r.color);
        this.rockets.splice(i, 1);
      }
    }

    // 2. Update and draw exploding particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Physics
      p.vx *= 0.96; // Drag
      p.vy *= 0.96;
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;

      // Trail
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 4) p.trail.shift();

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Spark trail
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      for (let t = p.trail.length - 1; t >= 0; t--) {
        ctx.lineTo(p.trail[t].x, p.trail[t].y);
      }
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = p.alpha * 0.6;
      ctx.lineWidth = p.size * 0.8;
      ctx.stroke();

      // Spark head
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.shadowBlur = p.size * 3;
      ctx.shadowColor = p.color;
      ctx.fill();
    }

    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
  }
}
