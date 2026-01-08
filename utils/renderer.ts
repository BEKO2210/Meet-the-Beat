import { VisualizerSettings, VisualizerStyle, AudioData, Particle, ColorPalette, ParticleType, ParticleMode } from '../types';
import { PALETTES, CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';

// Helper to resolve current colors
const getColors = (settings: VisualizerSettings) => {
  if (settings.palette === ColorPalette.CUSTOM) {
    return settings.customColors;
  }
  return PALETTES[settings.palette].colors;
};

// Particle System State
let particles: Particle[] = [];

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

const updateAndDrawParticles = (ctx: CanvasRenderingContext2D, audioData: AudioData, settings: VisualizerSettings) => {
  if (!settings.enableParticles) {
    particles = [];
    return;
  }

  const colors = getColors(settings);
  const densityMultiplier = settings.particleDensity;
  
  // Threshold for "Beat Hit"
  // Using specific particleSensitivity from settings
  // Higher sensitivity = detection at lower bass volumes
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
    // This makes the scene look 3D.
    const depth = Math.random(); 
    
    // Size and Speed depend on Depth
    let baseSize = 0;
    let speedY = 0;

    if (type === ParticleType.STAR) { 
        baseSize = 2 + depth * 6;  // 2px to 8px
        speedY = 1 + depth * 4;    // Faster
    } else if (type === ParticleType.ORB) { 
        baseSize = 3 + depth * 12; // 3px to 15px (Soft large bokeh)
        speedY = 1.5 + depth * 3; 
    } else { 
        // Dust
        baseSize = 1 + depth * 2;  // Small
        speedY = 0.5 + depth * 2;  // Slow floating
    }

    particles.push({
        x: Math.random() * CANVAS_WIDTH,
        // Spawn slightly below canvas
        y: CANVAS_HEIGHT + 10 + (Math.random() * 50), 
        vx: (Math.random() - 0.5) * 0.5, // Subtle horizontal drift
        vy: -speedY, // Always moving up
        size: baseSize,
        baseSize: baseSize,
        alpha: 0, // Start invisible, fade in
        life: 1.0, 
        color: colors[Math.floor(Math.random() * colors.length)],
        type: type,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
        wobble: Math.random() * Math.PI * 2 // Phase for sine wave movement
    });
  }

  // --- UPDATE & DRAW ---
  // 'screen' mode blends colors additively but softer than 'lighter', perfect for premium glow
  ctx.globalCompositeOperation = 'screen'; 

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    // --- BASS REACTION: TIME WARP ---
    // User request: "slower when bass comes"
    // This creates a "matrix" or "heavy impact" feel where gravity seems to increase
    let speedModifier = 1.0;
    
    if (isBassHit && settings.particlesReactToBeat) {
        speedModifier = 0.2; // Slow down to 20% speed (Slow Motion)
        p.size = p.baseSize * 1.3; // Slight pulse in size to show energy
    } else {
        // Smoothly return to normal size
        p.size = p.size * 0.9 + p.baseSize * 0.1;
    }

    // Move
    p.wobble += 0.02;
    // Add sine wave drift based on depth (closer particles wobble more)
    p.x += p.vx + Math.sin(p.wobble + p.y * 0.005) * (0.3 * (p.baseSize / 5)); 
    p.y += p.vy * speedModifier;
    p.rotation += p.rotationSpeed * speedModifier;

    // Fade In / Out
    // Fade in quickly at the bottom
    if (p.alpha < 1.0 && p.y > CANVAS_HEIGHT - 150) {
        p.alpha += 0.02;
    } 
    // Fade out at the top
    else if (p.y < 150) {
        p.alpha -= 0.01;
    }

    // Kill condition
    if (p.y < -50 || p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
    }

    // DRAWING
    ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));

    if (p.type === ParticleType.ORB) {
        // High Quality Soft Orb (Bokeh)
        // Using shadowBlur for the glow effect
        ctx.shadowBlur = p.size; 
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        
        ctx.beginPath();
        // Draw the core slightly smaller, let the shadow bloom
        ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2); 
        ctx.fill();
        
        // Reset shadow for next draw call (performance)
        ctx.shadowBlur = 0;
        
    } else if (p.type === ParticleType.STAR) {
        // Sparkling Star
        ctx.shadowBlur = p.size * 0.5;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        // 4-point star
        drawStar(ctx, 0, 0, 4, p.size, p.size * 0.25);
        ctx.restore();
        
        ctx.shadowBlur = 0;
        
    } else {
        // Dust (Simple Circle, high quantity)
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
  }
  
  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over'; // Reset blend mode
};

const drawVignette = (ctx: CanvasRenderingContext2D) => {
    const gradient = ctx.createRadialGradient(
        CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_HEIGHT / 2.5,
        CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_HEIGHT
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.8)'); // Slightly darker edges for cinema look

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
};

// Style A: Circular Neon Pulse (Symmetrical)
const drawCircularNeon = (
  ctx: CanvasRenderingContext2D, 
  data: Uint8Array, 
  audioData: AudioData, 
  settings: VisualizerSettings,
  centerImage: HTMLImageElement | null
) => {
  const cx = CANVAS_WIDTH / 2;
  const cy = CANVAS_HEIGHT / 2;
  const colors = getColors(settings);
  
  // Audio Reactive Pulse
  const bassBoost = (audioData.bass / 255) * settings.sensitivity;
  const radius = 220 + (bassBoost * 30); 

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
  
  for (let i = 0; i < halfPoints; i++) {
    const value = data[i * step] * settings.sensitivity;
    const height = Math.pow(value / 255, 2.0) * 280; 
    
    ctx.strokeStyle = colors[Math.floor((i / halfPoints) * colors.length) % colors.length];

    const angleRight = -Math.PI / 2 + (i / halfPoints) * Math.PI;
    const angleLeft = -Math.PI / 2 - (i / halfPoints) * Math.PI;

    ctx.moveTo(cx + Math.cos(angleRight) * radius, cy + Math.sin(angleRight) * radius);
    ctx.lineTo(cx + Math.cos(angleRight) * (radius + height), cy + Math.sin(angleRight) * (radius + height));

    ctx.moveTo(cx + Math.cos(angleLeft) * radius, cy + Math.sin(angleLeft) * radius);
    ctx.lineTo(cx + Math.cos(angleLeft) * (radius + height), cy + Math.sin(angleLeft) * (radius + height));
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
const drawMirroredFloor = (ctx: CanvasRenderingContext2D, data: Uint8Array, audioData: AudioData, settings: VisualizerSettings) => {
  const barCount = 80; // More bars for premium look
  const barWidth = (CANVAS_WIDTH / barCount) * 0.6;
  const spacing = (CANVAS_WIDTH / barCount) * 0.4;
  const colors = getColors(settings);
  const dataStep = Math.floor(data.length / 2 / barCount);

  const gradient = ctx.createLinearGradient(0, CANVAS_HEIGHT / 2, 0, 0);
  gradient.addColorStop(0, colors[1]);
  gradient.addColorStop(0.5, colors[0]);
  gradient.addColorStop(1, colors[2] || colors[0]);

  ctx.fillStyle = gradient;
  ctx.shadowBlur = 20 * settings.bloomIntensity;
  ctx.shadowColor = colors[0];
  ctx.globalCompositeOperation = 'lighter';

  for (let i = 0; i < barCount; i++) {
    const value = data[i * dataStep] * settings.sensitivity;
    const height = Math.max(5, Math.pow(value / 255, 2) * 600);
    
    const totalWidth = barCount * (barWidth + spacing);
    const startX = (CANVAS_WIDTH - totalWidth) / 2;
    const x = startX + i * (barWidth + spacing);
    const y = CANVAS_HEIGHT - 120;

    // Main Bar
    ctx.fillRect(x, y - height, barWidth, height);

    // Reflection
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillRect(x, y + 10, barWidth, height * 0.6); 
    ctx.restore();
  }
  
  // Floor Glow Line
  ctx.shadowBlur = 40;
  ctx.shadowColor = colors[1];
  ctx.fillStyle = colors[1];
  ctx.fillRect(0, CANVAS_HEIGHT - 118, CANVAS_WIDTH, 2);

  ctx.globalCompositeOperation = 'source-over';
};

// Style C: Reactive Waveform
const drawReactiveWave = (ctx: CanvasRenderingContext2D, waveData: Uint8Array, audioData: AudioData, settings: VisualizerSettings) => {
  const colors = getColors(settings);
  
  ctx.lineWidth = 5;
  ctx.shadowBlur = 30 * settings.bloomIntensity;
  ctx.shadowColor = colors[0];
  ctx.strokeStyle = colors[0];
  ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'lighter';
  
  ctx.beginPath();
  const sliceWidth = CANVAS_WIDTH / waveData.length;
  let x = 0;

  for (let i = 0; i < waveData.length; i++) {
    const v = waveData[i] / 128.0;
    const y = (v * CANVAS_HEIGHT) / 2; 
    
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
     const y = (v * CANVAS_HEIGHT) / 2;
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
  centerImage: HTMLImageElement | null
) => {
  // Clear Canvas
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // 1. Draw Background
  ctx.save();
  if (bgImage) {
    const scale = Math.max(CANVAS_WIDTH / bgImage.width, CANVAS_HEIGHT / bgImage.height);
    const x = (CANVAS_WIDTH / 2) - (bgImage.width / 2) * scale;
    const y = (CANVAS_HEIGHT / 2) - (bgImage.height / 2) * scale;
    ctx.drawImage(bgImage, x, y, bgImage.width * scale, bgImage.height * scale);
    
    if (settings.enableDarkOverlay) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  } else {
    const grad = ctx.createRadialGradient(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 100, CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 1000);
    grad.addColorStop(0, '#151515');
    grad.addColorStop(1, '#000000');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
  ctx.restore();

  // 2. Prepare Context for Visuals
  ctx.save();
  
  // SMOOTH CAMERA SHAKE: Uses Sine waves for a floating, breathing feel that ramps up with bass
  if (settings.enableBassShake && audioData.bass > 130) {
    const time = performance.now() / 50; 
    const shakeIntensity = ((audioData.bass - 130) / 125) * 20 * settings.sensitivity;
    
    // Smooth, cinematic sway with multiple sine waves
    const dx = Math.sin(time) * shakeIntensity * 0.7 + Math.sin(time * 1.5) * shakeIntensity * 0.3;
    const dy = Math.cos(time * 0.8) * shakeIntensity * 0.7 + Math.cos(time * 1.2) * shakeIntensity * 0.3;
    
    ctx.translate(dx, dy);
  }

  // --- LAYER ORDER: PARTICLES FIRST (BEHIND) ---
  updateAndDrawParticles(ctx, audioData, settings);

  // --- MAIN VISUALIZER ---
  if (settings.style === VisualizerStyle.CIRCULAR_NEON) {
    drawCircularNeon(ctx, audioData.frequencyData, audioData, settings, centerImage);
  } else if (settings.style === VisualizerStyle.MIRRORED_FLOOR) {
    drawMirroredFloor(ctx, audioData.frequencyData, audioData, settings);
  } else if (settings.style === VisualizerStyle.REACTIVE_WAVE) {
    drawReactiveWave(ctx, audioData.waveData, audioData, settings);
  }

  ctx.restore(); // End Camera Shake context

  // 3. Cinematic Vignette (On top)
  drawVignette(ctx);
};