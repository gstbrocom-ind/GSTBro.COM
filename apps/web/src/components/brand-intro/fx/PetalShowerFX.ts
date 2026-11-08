/**
 * Botanical Flower Petal Shower Physics Engine
 * Generates realistic 3D-tumbling flower petals (Marigold, Rose, Jasmine)
 * with sine-wave aerodynamic flutter and perspective spin.
 */

export interface Petal {
  x: number;
  y: number;
  size: number;
  color: string;
  vx: number;
  vy: number;
  rotation: number;
  rotSpeed: number;
  flip: number;
  flipSpeed: number;
  oscillationOffset: number;
  shape: 'marigold' | 'rose' | 'jasmine';
}

export class PetalShowerFX {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private petals: Petal[] = [];
  private maxPetals: number;

  constructor(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    preset: 'marigold' | 'rose' | 'jasmine' | 'mixed' = 'marigold'
  ) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.maxPetals = Math.min(width < 640 ? 25 : 55, 65);

    const colorMap = {
      marigold: ['#F59E0B', '#FBBF24', '#EA580C', '#FCD34D', '#D97706'],
      rose: ['#E11D48', '#F43F5E', '#FB7185', '#BE123C', '#FDA4AF'],
      jasmine: ['#FFFFFF', '#FEF08A', '#F1F5F9', '#FDE047'],
      mixed: ['#F59E0B', '#E11D48', '#FFFFFF', '#FBBF24', '#FB7185'],
    };

    const colors = colorMap[preset] || colorMap.marigold;

    for (let i = 0; i < this.maxPetals; i++) {
      this.petals.push(this.createPetal(true, colors, preset));
    }
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  private createPetal(
    randomY: boolean,
    colors: string[],
    preset: 'marigold' | 'rose' | 'jasmine' | 'mixed'
  ): Petal {
    const shapeChoices: ('marigold' | 'rose' | 'jasmine')[] =
      preset === 'mixed' ? ['marigold', 'rose', 'jasmine'] : [preset as any];
    const shape = shapeChoices[Math.floor(Math.random() * shapeChoices.length)];

    return {
      x: Math.random() * this.width,
      y: randomY ? Math.random() * this.height : -20 - Math.random() * 50,
      size: Math.random() * 8 + 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 0.8,
      vy: Math.random() * 1.2 + 0.8,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      flip: Math.random() * Math.PI,
      flipSpeed: Math.random() * 0.03 + 0.015,
      oscillationOffset: Math.random() * Math.PI * 2,
      shape,
    };
  }

  public updateAndDraw(now: number) {
    const ctx = this.ctx;

    for (let i = 0; i < this.petals.length; i++) {
      const p = this.petals[i];

      // Aerodynamic flutter
      p.y += p.vy;
      p.x += p.vx + Math.sin(now * 0.002 + p.oscillationOffset) * 0.9;
      p.rotation += p.rotSpeed;
      p.flip += p.flipSpeed;

      // Wrap around bottom
      if (p.y > this.height + 25) {
        p.y = -20;
        p.x = Math.random() * this.width;
      }
      if (p.x < -30) p.x = this.width + 20;
      if (p.x > this.width + 30) p.x = -20;

      // Draw 3D-tumbling petal
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.scale(1, Math.cos(p.flip)); // 3D flip effect

      ctx.beginPath();
      if (p.shape === 'jasmine') {
        // Slender pointed petal
        ctx.moveTo(0, -p.size);
        ctx.quadraticCurveTo(p.size * 0.45, 0, 0, p.size);
        ctx.quadraticCurveTo(-p.size * 0.45, 0, 0, -p.size);
      } else {
        // Teardrop marigold/rose petal
        ctx.moveTo(0, -p.size * 0.8);
        ctx.bezierCurveTo(p.size * 0.65, -p.size * 0.8, p.size * 0.8, p.size * 0.4, 0, p.size);
        ctx.bezierCurveTo(-p.size * 0.8, p.size * 0.4, -p.size * 0.65, -p.size * 0.8, 0, -p.size * 0.8);
      }

      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.85;
      ctx.shadowBlur = 4;
      ctx.shadowColor = p.color;
      ctx.fill();

      // Delicate petal vein highlight
      ctx.beginPath();
      ctx.moveTo(0, -p.size * 0.5);
      ctx.lineTo(0, p.size * 0.5);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    }

    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
  }
}
