import { VisualizerSettings, VisualizerStyle, AudioData, Particle, ColorPalette, ParticleType, ParticleMode, AspectRatio, CameraShakeMode, PostProcessEffect } from '../types';
import { PALETTES } from '../constants';

// ============================================================================
// PERLIN NOISE IMPLEMENTATION (For organic camera shake and displacement)
// ============================================================================
class PerlinNoise {
  private permutation: number[];

  constructor(seed: number = 0) {
    this.permutation = [];
    for (let i = 0; i < 256; i++) {
      this.permutation[i] = i;
    }
    // Shuffle with seed
    for (let i = 255; i > 0; i--) {
      const j = Math.floor((Math.sin(seed + i) * 10000) % (i + 1));
      [this.permutation[i], this.permutation[j]] = [this.permutation[j], this.permutation[i]];
    }
    this.permutation = [...this.permutation, ...this.permutation];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const a = this.permutation[X] + Y;
    const aa = this.permutation[a];
    const ab = this.permutation[a + 1];
    const b = this.permutation[X + 1] + Y;
    const ba = this.permutation[b];
    const bb = this.permutation[b + 1];

    return this.lerp(v,
      this.lerp(u, this.grad(this.permutation[aa], x, y), this.grad(this.permutation[ba], x - 1, y)),
      this.lerp(u, this.grad(this.permutation[ab], x, y - 1), this.grad(this.permutation[bb], x - 1, y - 1))
    );
  }
}

const perlin = new PerlinNoise(12345);

// Helper to resolve current colors
const getColors = (settings: VisualizerSettings) => {
  if (settings.palette === ColorPalette.CUSTOM) {
    return settings.customColors;
  }
  return PALETTES[settings.palette].colors;
};

// Helper to convert HSL to RGB for color shifting
const hslToRgb = (h: number, s: number, l: number): string => {
  h = h / 360;
  s = s / 100;
  l = l / 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
};

// Particle System State
let particles: Particle[] = [];
let lastParticleMode: ParticleMode = ParticleMode.MIX; // Track mode changes
let lastAspectRatio: AspectRatio | null = null; // Track ratio to reset particles

// Performance limits
const MAX_PARTICLES = 300; // Maximale Anzahl für gute Performance

// ============================================================================
// PARTICLE SHAPE DRAWING FUNCTIONS
// ============================================================================

// Draw a star shape
const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
  let rot = Math.PI / 2 * 3;
  let x = cx;
  let y = cy;
  let step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
};

// Draw a heart shape
const drawHeart = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) => {
  ctx.beginPath();
  const topCurveHeight = size * 0.3;
  ctx.moveTo(cx, cy + topCurveHeight);
  // Left side
  ctx.bezierCurveTo(
    cx, cy,
    cx - size / 2, cy,
    cx - size / 2, cy + topCurveHeight
  );
  ctx.bezierCurveTo(
    cx - size / 2, cy + (size + topCurveHeight) / 2,
    cx, cy + (size + topCurveHeight) / 1.2,
    cx, cy + size
  );
  // Right side
  ctx.bezierCurveTo(
    cx, cy + (size + topCurveHeight) / 1.2,
    cx + size / 2, cy + (size + topCurveHeight) / 2,
    cx + size / 2, cy + topCurveHeight
  );
  ctx.bezierCurveTo(
    cx + size / 2, cy,
    cx, cy,
    cx, cy + topCurveHeight
  );
  ctx.closePath();
  ctx.fill();
};

// Draw a music note
const drawMusicNote = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) => {
  ctx.beginPath();
  // Note head
  ctx.ellipse(cx, cy + size * 0.6, size * 0.3, size * 0.25, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Stem
  ctx.fillRect(cx + size * 0.2, cy - size * 0.4, size * 0.1, size);
  // Flag
  ctx.beginPath();
  ctx.moveTo(cx + size * 0.3, cy - size * 0.4);
  ctx.quadraticCurveTo(cx + size * 0.6, cy - size * 0.2, cx + size * 0.3, cy);
  ctx.fill();
};

// Draw a ring
const drawRing = (ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, thickness: number) => {
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.lineWidth = thickness;
  ctx.stroke();
};

// Draw a spark (lightning bolt)
const drawSpark = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) => {
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx - size * 0.3, cy);
  ctx.lineTo(cx + size * 0.1, cy);
  ctx.lineTo(cx - size * 0.2, cy + size);
  ctx.lineTo(cx + size * 0.4, cy - size * 0.2);
  ctx.lineTo(cx - size * 0.1, cy - size * 0.2);
  ctx.closePath();
  ctx.fill();
};

const resolveParticleType = (mode: ParticleMode): ParticleType => {
  if (mode === ParticleMode.ORBS) return ParticleType.ORB;
  if (mode === ParticleMode.STARS) return ParticleType.STAR;
  if (mode === ParticleMode.DUST) return ParticleType.DUST;
  if (mode === ParticleMode.RINGS) return ParticleType.RING;
  if (mode === ParticleMode.HEARTS) return ParticleType.HEART;
  if (mode === ParticleMode.NOTES) return ParticleType.NOTE;
  if (mode === ParticleMode.SPARKS) return ParticleType.SPARK;

  // Premium Mix Mode: All particle types with balanced distribution
  if (mode === ParticleMode.PREMIUM_MIX) {
    const r = Math.random();
    if (r < 0.15) return ParticleType.STAR;
    if (r < 0.30) return ParticleType.ORB;
    if (r < 0.40) return ParticleType.RING;
    if (r < 0.50) return ParticleType.HEART;
    if (r < 0.60) return ParticleType.NOTE;
    if (r < 0.70) return ParticleType.SPARK;
    return ParticleType.DUST;
  }

  // Standard Mix Mode: mostly dust, some orbs, few stars
  const r = Math.random();
  if (r < 0.1) return ParticleType.STAR;
  if (r < 0.35) return ParticleType.ORB;
  return ParticleType.DUST;
};

const updateAndDrawParticles = (ctx: CanvasRenderingContext2D, audioData: AudioData, settings: VisualizerSettings, width: number, height: number) => {
  // Clear particles immediately if disabled
  if (!settings.enableParticles) {
    particles = [];
    return;
  }

  // DETECT MODE OR RESOLUTION CHANGE: Clear particles to avoid glitches (e.g. half screen particles)
  if (settings.particleMode !== lastParticleMode || settings.aspectRatio !== lastAspectRatio) {
      particles = [];
      lastParticleMode = settings.particleMode;
      lastAspectRatio = settings.aspectRatio;
  }

  const colors = getColors(settings);
  const densityMultiplier = settings.particleDensity;
  
  // Threshold for "Beat Hit"
  const isBassHit = audioData.bass > (125 / settings.particleSensitivity);

  // --- SPAWNING LOGIC (Bottom Up Only) ---
  // PERFORMANCE OPTIMIERT: Reduzierte Spawn-Rate
  let spawnChance = 0.15 * densityMultiplier; // Reduziert von 0.4

  // If bass hits, we actually spawn a burst from the bottom to fill the void,
  // contrasting the "slow motion" effect of the existing particles.
  if (isBassHit && settings.particlesReactToBeat) {
      spawnChance += 0.6 * densityMultiplier; // Reduziert von 1.5
  }

  // Performance Limit: Stop spawning wenn zu viele Partikel
  if (particles.length >= MAX_PARTICLES) {
    spawnChance = 0;
  }

  const particlesToSpawn = Math.floor(spawnChance) + (Math.random() < (spawnChance % 1) ? 1 : 0);

  for (let i = 0; i < particlesToSpawn; i++) {
    const type = resolveParticleType(settings.particleMode);
    
    // Depth Simulation (0 = Far/Background, 1 = Close/Foreground)
    const depth = Math.random(); 
    
    // Size and Speed depend on Depth
    let baseSize = 0;
    let speedY = 0;

    if (type === ParticleType.STAR) {
        baseSize = 4 + depth * 8;  // 4px to 12px
        speedY = 1 + depth * 4;    // Faster
    } else if (type === ParticleType.ORB) {
        baseSize = 5 + depth * 20; // 5px to 25px
        speedY = 1.5 + depth * 3;
    } else if (type === ParticleType.RING) {
        baseSize = 6 + depth * 15; // 6px to 21px
        speedY = 1.2 + depth * 3.5;
    } else if (type === ParticleType.HEART) {
        baseSize = 6 + depth * 12; // 6px to 18px
        speedY = 1.0 + depth * 3;
    } else if (type === ParticleType.NOTE) {
        baseSize = 7 + depth * 14; // 7px to 21px
        speedY = 1.3 + depth * 3.2;
    } else if (type === ParticleType.SPARK) {
        baseSize = 5 + depth * 10; // 5px to 15px
        speedY = 2 + depth * 5;    // Very fast
    } else {
        // Dust
        baseSize = 1 + depth * 3;  // Small
        speedY = 0.5 + depth * 2;  // Slow floating
    }

    particles.push({
        x: Math.random() * width,
        y: height + 10 + (Math.random() * 50),
        vx: (Math.random() - 0.5) * 0.5,
        vy: -speedY,
        size: baseSize,
        baseSize: baseSize,
        targetSize: baseSize,
        alpha: 0,
        life: 1.0,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: type,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
        wobble: Math.random() * Math.PI * 2,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.04,
        trail: [], // Initialize empty trail
        hue: Math.random() * 360, // Random starting hue for color shifting
        hueSpeed: 0.5 + Math.random() * 1.5 // Hue shift speed
    });
  }

  // --- UPDATE & DRAW ---
  ctx.globalCompositeOperation = 'screen'; 

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    // --- ORGANIC MOVEMENT & BREATHING ---
    
    // 1. Bass Reaction (Time Warp + Swell)
    let speedModifier = 1.0;
    let beatScaleToAdd = 0;

    if (isBassHit && settings.particlesReactToBeat) {
        speedModifier = 0.2; // Slow down (Time Stop effect)
        beatScaleToAdd = p.baseSize * 0.5; // Target size increases
    } 
    
    // 2. Continuous Breathing (Lifecycle Variation)
    // Particles expand and contract slightly over time independently of the beat
    p.pulsePhase += p.pulseSpeed;
    const breathingFactor = Math.sin(p.pulsePhase) * 0.15; // +/- 15% size variation
    
    // 3. Smooth Size Interpolation
    // Instead of snapping size, we lerp towards target
    const targetSize = p.baseSize * (1 + breathingFactor) + beatScaleToAdd;
    p.size += (targetSize - p.size) * 0.1; // Smooth ease-in/out for size

    // 4. Position Update with Fluidity
    p.wobble += 0.02;
    // Smaller particles (Dust) drift more chaotically, larger ones have more inertia
    const driftIntensity = (30 / p.baseSize) * 0.5;

    // Trail Management (Performance optimiert)
    if (settings.particleTrails) {
      p.trail.push({ x: p.x, y: p.y, alpha: p.alpha * 0.5 });
      if (p.trail.length > 5) p.trail.shift(); // Reduziert von 10 auf 5 für Performance
      // Fade out trail
      p.trail.forEach(t => t.alpha *= 0.85);
    } else {
      p.trail = []; // Clear trails if disabled
    }

    // Gravity effect
    if (settings.particleGravity) {
      p.vy += 0.05; // Add downward acceleration
    }

    p.x += p.vx + Math.sin(p.wobble + p.y * 0.005) * driftIntensity;
    p.y += p.vy * speedModifier;
    p.rotation += p.rotationSpeed * speedModifier;

    // Color shifting based on audio
    if (settings.particleColorShift) {
      p.hue += p.hueSpeed * (1 + audioData.mid / 255);
      if (p.hue > 360) p.hue -= 360;
      p.color = hslToRgb(p.hue, 80, 60);
    }

    // 5. Alpha/Lifecycle
    // Fade in at bottom
    if (p.alpha < 1.0 && p.y > height - 150) {
        p.alpha += 0.02;
    } 
    // Fade out at top
    else if (p.y < 150) {
        p.alpha -= 0.01;
    }

    // Twinkle effect (Alpha fluctuation based on breathing)
    // When particle breathes in (gets larger), it gets slightly brighter
    const twinkle = 0.1 * Math.sin(p.pulsePhase);
    const renderAlpha = Math.max(0, Math.min(1, p.alpha + twinkle));

    // Kill condition
    if (p.y < -50 || p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
    }

    // --- RENDER TRAIL FIRST (behind particle) ---
    // PERFORMANCE: Trail nur jedes zweite Partikel zeichnen bei hoher Anzahl
    if (settings.particleTrails && p.trail.length > 0 && (particles.length < 200 || i % 2 === 0)) {
      for (let j = 0; j < p.trail.length; j++) {
        const t = p.trail[j];
        if (t.alpha > 0.1) { // Skip fast unsichtbare trails
          ctx.globalAlpha = t.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(t.x, t.y, p.size * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // --- RENDER MAIN PARTICLE ---
    ctx.globalAlpha = renderAlpha;

    if (p.type === ParticleType.ORB) {
        ctx.shadowBlur = p.size;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

    } else if (p.type === ParticleType.STAR) {
        ctx.shadowBlur = p.size * 0.5;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        drawStar(ctx, 0, 0, 4, p.size, p.size * 0.25);
        ctx.restore();
        ctx.shadowBlur = 0;

    } else if (p.type === ParticleType.RING) {
        ctx.shadowBlur = p.size * 0.4;
        ctx.shadowColor = p.color;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * 0.2;
        drawRing(ctx, p.x, p.y, p.size * 0.5, p.size * 0.2);
        ctx.shadowBlur = 0;

    } else if (p.type === ParticleType.HEART) {
        ctx.shadowBlur = p.size * 0.6;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.translate(-p.x, -p.y);
        drawHeart(ctx, p.x, p.y - p.size * 0.4, p.size);
        ctx.restore();
        ctx.shadowBlur = 0;

    } else if (p.type === ParticleType.NOTE) {
        ctx.shadowBlur = p.size * 0.5;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.translate(-p.x, -p.y);
        drawMusicNote(ctx, p.x, p.y, p.size);
        ctx.restore();
        ctx.shadowBlur = 0;

    } else if (p.type === ParticleType.SPARK) {
        ctx.shadowBlur = p.size;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.translate(-p.x, -p.y);
        drawSpark(ctx, p.x, p.y, p.size);
        ctx.restore();
        ctx.shadowBlur = 0;

    } else {
        // Dust - slightly translucent center
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
  }
  
  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';
};

const drawVignette = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gradient = ctx.createRadialGradient(
        width / 2, height / 2, height / 2.5,
        width / 2, height / 2, height
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.8)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
};

// ============================================================================
// POST-PROCESSING EFFECTS
// ============================================================================

// Chromatic Aberration Effect (PERFORMANCE WARNING: Sehr teuer!)
const applyChromaticAberration = (ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number) => {
  try {
    const offset = Math.floor(intensity);

    // OPTIMIERT: Temporary canvas wird wiederverwendet
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })!;

    // Copy current canvas
    tempCtx.drawImage(ctx.canvas, 0, 0);

    // Clear and redraw with offset channels
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.8;

    // Red channel (shifted right)
    ctx.drawImage(tempCanvas, offset, 0);

    // Green channel (no shift)
    ctx.drawImage(tempCanvas, 0, 0);

    // Blue channel (shifted left)
    ctx.drawImage(tempCanvas, -offset, 0);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
  } catch (error) {
    console.error('Chromatic Aberration Error:', error);
  }
};

// Scanlines Effect (CRT/TV look)
const applyScanlines = (ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number) => {
  ctx.globalAlpha = intensity * 0.3;
  ctx.fillStyle = '#000000';
  for (let y = 0; y < height; y += 4) {
    ctx.fillRect(0, y, width, 2);
  }
  ctx.globalAlpha = 1.0;
};

// CRT Effect (combines scanlines with curvature simulation via vignette)
const applyCRTEffect = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  try {
    applyScanlines(ctx, width, height, 0.5);

    // RGB separation for CRT look (OPTIMIERT)
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })!;
    tempCtx.drawImage(ctx.canvas, 0, 0);

    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.1;
    ctx.drawImage(tempCanvas, 2, 0);
    ctx.drawImage(tempCanvas, -2, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;

    // Screen flicker
    const flicker = 0.95 + Math.random() * 0.05;
    ctx.globalAlpha = flicker;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1.0;
  } catch (error) {
    console.error('CRT Effect Error:', error);
  }
};

// Motion Blur Effect
const applyMotionBlur = (ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number) => {
  ctx.globalAlpha = 1 - intensity;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = `rgba(0, 0, 0, ${intensity * 0.3})`;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1.0;
};

// Frequency Analyzer Overlay
const drawFrequencyBars = (ctx: CanvasRenderingContext2D, audioData: AudioData, settings: VisualizerSettings, width: number, height: number) => {
  const barCount = 64;
  const barWidth = width / barCount;
  const data = audioData.frequencyData;
  const step = Math.floor(data.length / barCount);
  const colors = getColors(settings);

  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = colors[0];

  for (let i = 0; i < barCount; i++) {
    const value = data[i * step];
    const barHeight = (value / 255) * (height * 0.15); // Max 15% of screen height
    const x = i * barWidth;
    const y = height - barHeight;

    // Gradient per bar
    const gradient = ctx.createLinearGradient(0, y, 0, height);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(1, colors[1]);
    ctx.fillStyle = gradient;

    ctx.fillRect(x, y, barWidth - 2, barHeight);
  }

  ctx.restore();
};

// ============================================================================
// KALEIDOSCOPE WRAPPER
// ============================================================================
const applyKaleidoscope = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  segments: number,
  drawFunc: () => void
) => {
  ctx.save();
  ctx.translate(width / 2, height / 2);

  const angleStep = (Math.PI * 2) / segments;

  for (let i = 0; i < segments; i++) {
    ctx.save();
    ctx.rotate(angleStep * i);

    // Mirror every other segment for kaleidoscope effect
    if (i % 2 === 1) {
      ctx.scale(-1, 1);
    }

    ctx.translate(-width / 2, -height / 2);
    drawFunc();
    ctx.restore();
  }

  ctx.restore();
};

// ============================================================================
// VISUALIZATION STYLES
// ============================================================================

// Style A: Circular Neon Pulse (Symmetrical)
const drawCircularNeon = (
  ctx: CanvasRenderingContext2D, 
  data: Uint8Array, 
  audioData: AudioData, 
  settings: VisualizerSettings,
  centerImage: HTMLImageElement | null,
  width: number,
  height: number
) => {
  const cx = width / 2;
  const cy = height / 2;
  const colors = getColors(settings);
  
  // Audio Reactive Pulse
  const bassBoost = (audioData.bass / 255) * settings.sensitivity;
  
  // Adapt radius to smaller dimension to fit on screen
  const baseRadius = Math.min(width, height) * 0.2; // 20% of smallest side
  const radius = baseRadius + (bassBoost * 30); 

  // --- Draw Center Image ---
  if (centerImage) {
    ctx.save();
    ctx.beginPath();
    
    // Image Pulse (Scales with beat)
    const imagePulse = 1.0 + (bassBoost * 0.15); 

    ctx.arc(cx, cy, Math.max(0, radius - 15), 0, Math.PI * 2); // Clip remains stable relative to ring
    ctx.clip();
    
    ctx.translate(cx, cy);
    // Rotation
    if (settings.centerImageRotation) {
      const time = performance.now() / 1000;
      ctx.rotate(time * 0.5); 
    }
    // Scale on beat
    ctx.scale(imagePulse, imagePulse);
    ctx.translate(-cx, -cy);
    
    // Draw Image centered
    const scale = Math.max((radius * 2) / centerImage.width, (radius * 2) / centerImage.height);
    const w = centerImage.width * scale;
    const h = centerImage.height * scale;
    ctx.drawImage(centerImage, cx - w/2, cy - h/2, w, h);
    
    ctx.restore();
  }

  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  
  // Premium Glow
  ctx.shadowBlur = 25 * settings.bloomIntensity;
  ctx.shadowColor = colors[0];

  const totalPoints = 120; 
  const halfPoints = totalPoints / 2;
  const dataSubset = Math.floor(data.length * 0.6); 
  const step = Math.floor(dataSubset / halfPoints);

  // Use 'lighter' for neon blending
  ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath();
  
  // Calculate max spike height based on available screen space
  const maxSpikeHeight = Math.min(width, height) * 0.25;

  for (let i = 0; i < halfPoints; i++) {
    const value = data[i * step] * settings.sensitivity;
    let spikeHeight = Math.pow(value / 255, 2.0) * maxSpikeHeight;

    // Perlin Noise Displacement for organic movement
    if (settings.enablePerlinNoise) {
      const time = performance.now() / 1000;
      const noiseValue = perlin.noise(i * 0.1, time) * 20;
      spikeHeight += noiseValue;
    }

    ctx.strokeStyle = colors[Math.floor((i / halfPoints) * colors.length) % colors.length];

    const angleRight = -Math.PI / 2 + (i / halfPoints) * Math.PI;
    const angleLeft = -Math.PI / 2 - (i / halfPoints) * Math.PI;

    ctx.moveTo(cx + Math.cos(angleRight) * radius, cy + Math.sin(angleRight) * radius);
    ctx.lineTo(cx + Math.cos(angleRight) * (radius + spikeHeight), cy + Math.sin(angleRight) * (radius + spikeHeight));

    ctx.moveTo(cx + Math.cos(angleLeft) * radius, cy + Math.sin(angleLeft) * radius);
    ctx.lineTo(cx + Math.cos(angleLeft) * (radius + spikeHeight), cy + Math.sin(angleLeft) * (radius + spikeHeight));
  }
  ctx.stroke();

  // Inner ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 5, 0, Math.PI * 2);
  ctx.strokeStyle = colors[1];
  ctx.lineWidth = 3;
  ctx.stroke();
  
  ctx.globalCompositeOperation = 'source-over';
};

// Style B: Mirrored Floor Spectrum
const drawMirroredFloor = (
    ctx: CanvasRenderingContext2D, 
    data: Uint8Array, 
    audioData: AudioData, 
    settings: VisualizerSettings,
    width: number,
    height: number
) => {
  const barCount = 80; // More bars for premium look
  const barWidth = (width / barCount) * 0.6;
  const spacing = (width / barCount) * 0.4;
  const colors = getColors(settings);
  const dataStep = Math.floor(data.length / 2 / barCount);

  const gradient = ctx.createLinearGradient(0, height / 2, 0, 0);
  gradient.addColorStop(0, colors[1]);
  gradient.addColorStop(0.5, colors[0]);
  gradient.addColorStop(1, colors[2] || colors[0]);

  ctx.fillStyle = gradient;
  ctx.shadowBlur = 20 * settings.bloomIntensity;
  ctx.shadowColor = colors[0];
  ctx.globalCompositeOperation = 'lighter';

  for (let i = 0; i < barCount; i++) {
    const value = data[i * dataStep] * settings.sensitivity;
    let barHeight = Math.max(5, Math.pow(value / 255, 2) * (height * 0.5));

    // Perlin Noise Displacement
    if (settings.enablePerlinNoise) {
      const time = performance.now() / 1000;
      const noiseValue = perlin.noise(i * 0.2, time) * 30;
      barHeight += noiseValue;
    }

    const totalWidth = barCount * (barWidth + spacing);
    const startX = (width - totalWidth) / 2;
    const x = startX + i * (barWidth + spacing);

    // Position 10% from bottom
    const y = height - (height * 0.1); 

    // Main Bar
    ctx.fillRect(x, y - barHeight, barWidth, barHeight);

    // Reflection
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillRect(x, y + 10, barWidth, barHeight * 0.6); 
    ctx.restore();
  }
  
  // Floor Glow Line
  ctx.shadowBlur = 40;
  ctx.shadowColor = colors[1];
  ctx.fillStyle = colors[1];
  ctx.fillRect(0, height - (height * 0.1) + 2, width, 2);

  ctx.globalCompositeOperation = 'source-over';
};

// Style C: Reactive Waveform
const drawReactiveWave = (
    ctx: CanvasRenderingContext2D, 
    waveData: Uint8Array, 
    audioData: AudioData, 
    settings: VisualizerSettings,
    width: number,
    height: number
) => {
  const colors = getColors(settings);
  
  ctx.lineWidth = 5;
  ctx.shadowBlur = 30 * settings.bloomIntensity;
  ctx.shadowColor = colors[0];
  ctx.strokeStyle = colors[0];
  ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'lighter';
  
  ctx.beginPath();
  const sliceWidth = width / waveData.length;
  let x = 0;

  for (let i = 0; i < waveData.length; i++) {
    const v = waveData[i] / 128.0;
    let y = (v * height) / 2;

    const bassOffset = (audioData.bass / 255) * settings.sensitivity * 60 * Math.sin(i * 0.1);

    // Perlin Noise Displacement
    if (settings.enablePerlinNoise) {
      const time = performance.now() / 1000;
      const noiseValue = perlin.noise(i * 0.05, time) * 20;
      y += noiseValue;
    }

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y + bassOffset);
    }
    x += sliceWidth;
  }
  ctx.stroke();

  // Ghost Line
  ctx.lineWidth = 2;
  ctx.strokeStyle = colors[1];
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  x = 0;
  for (let i = 0; i < waveData.length; i+=2) { 
     const v = waveData[i] / 128.0;
     const y = (v * height) / 2;
     const bassOffset = (audioData.bass / 255) * settings.sensitivity * 40 * Math.sin(i * 0.1 + Math.PI);
     if(i===0) ctx.moveTo(x, y);
     else ctx.lineTo(x, y + bassOffset);
     x += sliceWidth * 2;
  }
  ctx.stroke();
  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';
};


export const renderFrame = (
  ctx: CanvasRenderingContext2D, 
  audioData: AudioData, 
  settings: VisualizerSettings,
  bgImage: HTMLImageElement | null,
  centerImage: HTMLImageElement | null,
  width: number,
  height: number
) => {
  // Clear Canvas
  ctx.clearRect(0, 0, width, height);
  
  // 1. Draw Background
  ctx.save();
  if (bgImage) {
    // cover fit logic
    const scale = Math.max(width / bgImage.width, height / bgImage.height);
    const x = (width / 2) - (bgImage.width / 2) * scale;
    const y = (height / 2) - (bgImage.height / 2) * scale;
    ctx.drawImage(bgImage, x, y, bgImage.width * scale, bgImage.height * scale);
    
    if (settings.enableDarkOverlay) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, width, height);
    }
  } else {
    const grad = ctx.createRadialGradient(width/2, height/2, 100, width/2, height/2, Math.max(width, height));
    grad.addColorStop(0, '#151515');
    grad.addColorStop(1, '#000000');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0, width, height);
  }
  ctx.restore();

  // 2. Prepare Context for Visuals
  ctx.save();

  // ============================================================================
  // PREMIUM CAMERA SHAKE with Perlin Noise & Multiple Modes
  // ============================================================================
  if (settings.enableBassShake && settings.cameraShakeMode !== CameraShakeMode.OFF && audioData.bass > 100) {
    const time = performance.now() / 1000;
    let shakeIntensity = ((audioData.bass - 100) / 155) * settings.sensitivity;

    // Mode-specific intensity multipliers
    let intensityMultiplier = 1.0;
    let rotationMultiplier = 0;

    switch (settings.cameraShakeMode) {
      case CameraShakeMode.SUBTLE:
        intensityMultiplier = 0.3;
        rotationMultiplier = 0.0005;
        break;
      case CameraShakeMode.MEDIUM:
        intensityMultiplier = 1.0;
        rotationMultiplier = 0.001;
        break;
      case CameraShakeMode.INTENSE:
        intensityMultiplier = 2.0;
        rotationMultiplier = 0.002;
        break;
      case CameraShakeMode.EARTHQUAKE:
        intensityMultiplier = 4.0;
        rotationMultiplier = 0.005;
        break;
    }

    shakeIntensity *= intensityMultiplier;

    // Perlin Noise for organic movement (more cinematic than pure sine waves)
    const noiseX = perlin.noise(time * 2, 0) * 30 * shakeIntensity;
    const noiseY = perlin.noise(0, time * 2) * 30 * shakeIntensity;

    // Layered sine waves for additional complexity
    const sineX = Math.sin(time * 3) * 10 * shakeIntensity * 0.5;
    const sineY = Math.cos(time * 2.5) * 10 * shakeIntensity * 0.5;

    const dx = noiseX + sineX;
    const dy = noiseY + sineY;

    // Translation
    ctx.translate(width / 2, height / 2);

    // Rotation shake (optional)
    if (settings.shakeRotation) {
      const rotation = perlin.noise(time * 1.5, time * 1.5) * rotationMultiplier * shakeIntensity;
      ctx.rotate(rotation);
    }

    ctx.translate(-width / 2 + dx, -height / 2 + dy);
  }

  // --- LAYER ORDER: PARTICLES FIRST (BEHIND) ---
  updateAndDrawParticles(ctx, audioData, settings, width, height);

  // --- MAIN VISUALIZER (with optional Kaleidoscope) ---
  const renderVisualizer = () => {
    if (settings.style === VisualizerStyle.CIRCULAR_NEON) {
      drawCircularNeon(ctx, audioData.frequencyData, audioData, settings, centerImage, width, height);
    } else if (settings.style === VisualizerStyle.MIRRORED_FLOOR) {
      drawMirroredFloor(ctx, audioData.frequencyData, audioData, settings, width, height);
    } else if (settings.style === VisualizerStyle.REACTIVE_WAVE) {
      drawReactiveWave(ctx, audioData.waveData, audioData, settings, width, height);
    }
  };

  if (settings.enableKaleidoscope) {
    applyKaleidoscope(ctx, width, height, settings.kaleidoscopeSegments, renderVisualizer);
  } else {
    renderVisualizer();
  }

  ctx.restore(); // End Camera Shake context

  // 3. Frequency Analyzer Overlay (optional)
  if (settings.showFrequencyBars) {
    drawFrequencyBars(ctx, audioData, settings, width, height);
  }

  // 4. Post-Processing Effects
  if (settings.postProcessEffects.includes(PostProcessEffect.CHROMATIC_ABERRATION)) {
    applyChromaticAberration(ctx, width, height, settings.chromaticAberrationIntensity);
  }
  if (settings.postProcessEffects.includes(PostProcessEffect.SCANLINES)) {
    applyScanlines(ctx, width, height, settings.scanlineIntensity);
  }
  if (settings.postProcessEffects.includes(PostProcessEffect.CRT)) {
    applyCRTEffect(ctx, width, height);
  }
  if (settings.postProcessEffects.includes(PostProcessEffect.MOTION_BLUR)) {
    applyMotionBlur(ctx, width, height, settings.motionBlurIntensity);
  }

  // 5. Cinematic Vignette (On top)
  drawVignette(ctx, width, height);
};