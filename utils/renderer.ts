import { VisualizerSettings, VisualizerStyle, AudioData, Particle, ColorPalette, ParticleType, ParticleMode, AspectRatio } from '../types';
import { PALETTES } from '../constants';

// Helper to resolve current colors
const getColors = (settings: VisualizerSettings) => {
  if (settings.palette === ColorPalette.CUSTOM) {
    return settings.customColors;
  }
  return PALETTES[settings.palette].colors;
};

// Particle System State
let particles: Particle[] = [];
let lastParticleMode: ParticleMode = ParticleMode.MIX; // Track mode changes
let lastAspectRatio: AspectRatio | null = null; // Track ratio to reset particles

// Helper to draw a star shape
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

const resolveParticleType = (mode: ParticleMode): ParticleType => {
  if (mode === ParticleMode.ORBS) return ParticleType.ORB;
  if (mode === ParticleMode.STARS) return ParticleType.STAR;
  if (mode === ParticleMode.DUST) return ParticleType.DUST;
  
  // Mix Mode: mostly dust, some orbs, few stars
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
  // "Standard" spawn rate
  let spawnChance = 0.4 * densityMultiplier;
  
  // If bass hits, we actually spawn a burst from the bottom to fill the void,
  // contrasting the "slow motion" effect of the existing particles.
  if (isBassHit && settings.particlesReactToBeat) {
      spawnChance += 1.5 * densityMultiplier;
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
        targetSize: baseSize, // Initialize target
        alpha: 0, 
        life: 1.0, 
        color: colors[Math.floor(Math.random() * colors.length)],
        type: type,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
        wobble: Math.random() * Math.PI * 2,
        pulsePhase: Math.random() * Math.PI * 2, // Random start point in breathing cycle
        pulseSpeed: 0.02 + Math.random() * 0.04   // Unique breathing speed
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
    
    p.x += p.vx + Math.sin(p.wobble + p.y * 0.005) * driftIntensity; 
    p.y += p.vy * speedModifier;
    p.rotation += p.rotationSpeed * speedModifier;

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

    // --- RENDER ---
    ctx.globalAlpha = renderAlpha;

    if (p.type === ParticleType.ORB) {
        // Soft Glow
        ctx.shadowBlur = p.size; 
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2); 
        ctx.fill();
        ctx.shadowBlur = 0;
        
    } else if (p.type === ParticleType.STAR) {
        // Sharp Sparkle
        ctx.shadowBlur = p.size * 0.5;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        drawStar(ctx, 0, 0, 4, p.size, p.size * 0.25);
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
    gradient.addColorStop(1, 'rgba(0,0,0,0.8)'); // Slightly darker edges for cinema look

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
};

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
    const spikeHeight = Math.pow(value / 255, 2.0) * maxSpikeHeight; 
    
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
    const barHeight = Math.max(5, Math.pow(value / 255, 2) * (height * 0.5)); // Dynamic height based on canvas height
    
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
    const y = (v * height) / 2; 
    
    const bassOffset = (audioData.bass / 255) * settings.sensitivity * 60 * Math.sin(i * 0.1);

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
  
  // SMOOTH CAMERA SHAKE
  if (settings.enableBassShake && audioData.bass > 130) {
    const time = performance.now() / 50; 
    const shakeIntensity = ((audioData.bass - 130) / 125) * 20 * settings.sensitivity;
    
    // Smooth, cinematic sway with multiple sine waves
    const dx = Math.sin(time) * shakeIntensity * 0.7 + Math.sin(time * 1.5) * shakeIntensity * 0.3;
    const dy = Math.cos(time * 0.8) * shakeIntensity * 0.7 + Math.cos(time * 1.2) * shakeIntensity * 0.3;
    
    ctx.translate(dx, dy);
  }

  // --- LAYER ORDER: PARTICLES FIRST (BEHIND) ---
  updateAndDrawParticles(ctx, audioData, settings, width, height);

  // --- MAIN VISUALIZER ---
  if (settings.style === VisualizerStyle.CIRCULAR_NEON) {
    drawCircularNeon(ctx, audioData.frequencyData, audioData, settings, centerImage, width, height);
  } else if (settings.style === VisualizerStyle.MIRRORED_FLOOR) {
    drawMirroredFloor(ctx, audioData.frequencyData, audioData, settings, width, height);
  } else if (settings.style === VisualizerStyle.REACTIVE_WAVE) {
    drawReactiveWave(ctx, audioData.waveData, audioData, settings, width, height);
  }

  ctx.restore(); // End Camera Shake context

  // 3. Cinematic Vignette (On top)
  drawVignette(ctx, width, height);
};