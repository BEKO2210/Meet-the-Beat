export enum VisualizerStyle {
  CIRCULAR_NEON = 'CIRCULAR_NEON',
  MIRRORED_FLOOR = 'MIRRORED_FLOOR',
  REACTIVE_WAVE = 'REACTIVE_WAVE',
}

export enum ColorPalette {
  CYAN_MAGENTA = 'CYAN_MAGENTA',
  SUNSET_BLAZE = 'SUNSET_BLAZE',
  MATRIX_GREEN = 'MATRIX_GREEN',
  GOLDEN_HOUR = 'GOLDEN_HOUR',
  FIRE_ICE = 'FIRE_ICE',
  COTTON_CANDY = 'COTTON_CANDY',
  CUSTOM = 'CUSTOM', // New Manual Mode
}

export enum ParticleType {
  ORB = 'ORB',
  STAR = 'STAR',
  DUST = 'DUST'
}

export enum ParticleMode {
  MIX = 'MIX',
  ORBS = 'ORBS',
  STARS = 'STARS',
  DUST = 'DUST'
}

export interface VisualizerSettings {
  style: VisualizerStyle;
  palette: ColorPalette;
  customColors: [string, string, string]; // User selected colors
  
  enableParticles: boolean;
  particleMode: ParticleMode; // New: Selectable particle type
  particleDensity: number; // 0.5 to 3.0 multiplier for quantity
  particleSensitivity: number; // New: Specific sensitivity for particle beats
  particlesReactToBeat: boolean; // If true, explode on beat. If false, just ambient.
  
  enableBassShake: boolean;
  enableDarkOverlay: boolean;
  
  centerImageRotation: boolean; // Rotate the center logo?
  
  smoothing: number; // 0.1 to 0.99
  bloomIntensity: number; // 0 to 1
  sensitivity: number; // 0.5 to 2.0
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseSize: number; // Remember original size for pulsing
  alpha: number;
  life: number;
  color: string;
  type: ParticleType;
  rotation: number;     // For stars
  rotationSpeed: number;
  wobble: number;       // For organic movement phase
}

export interface AudioData {
  frequencyData: Uint8Array;
  waveData: Uint8Array;
  bass: number; // 0-255 average of low frequencies
  mid: number; // 0-255 average of mid frequencies
  treble: number; // 0-255 average of high frequencies
}