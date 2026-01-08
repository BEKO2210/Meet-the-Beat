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
  OCEAN_DEEP = 'OCEAN_DEEP',
  LAVA_FLOW = 'LAVA_FLOW',
  AURORA = 'AURORA',
  NEON_CITY = 'NEON_CITY',
  ROYAL_PURPLE = 'ROYAL_PURPLE',
  EMERALD_DREAM = 'EMERALD_DREAM',
  CUSTOM = 'CUSTOM',
}

export enum ParticleType {
  ORB = 'ORB',
  STAR = 'STAR',
  DUST = 'DUST',
  RING = 'RING',
  HEART = 'HEART',
  NOTE = 'NOTE',
  SPARK = 'SPARK'
}

export enum ParticleMode {
  MIX = 'MIX',
  ORBS = 'ORBS',
  STARS = 'STARS',
  DUST = 'DUST',
  RINGS = 'RINGS',
  HEARTS = 'HEARTS',
  NOTES = 'NOTES',
  SPARKS = 'SPARKS',
  PREMIUM_MIX = 'PREMIUM_MIX'
}

export enum AspectRatio {
  LANDSCAPE = 'LANDSCAPE', // 16:9
  PORTRAIT = 'PORTRAIT'    // 9:16
}

export enum CameraShakeMode {
  OFF = 'OFF',
  SUBTLE = 'SUBTLE',
  MEDIUM = 'MEDIUM',
  INTENSE = 'INTENSE',
  EARTHQUAKE = 'EARTHQUAKE'
}

export enum PostProcessEffect {
  CHROMATIC_ABERRATION = 'CHROMATIC_ABERRATION',
  SCANLINES = 'SCANLINES',
  CRT = 'CRT',
  MOTION_BLUR = 'MOTION_BLUR'
}

export interface VisualizerSettings {
  style: VisualizerStyle;
  palette: ColorPalette;
  customColors: [string, string, string]; // User selected colors

  aspectRatio: AspectRatio; // Output format

  // Particles
  enableParticles: boolean;
  particleMode: ParticleMode;
  particleDensity: number; // 0.1 to 3.0 multiplier for quantity
  particleSensitivity: number; // Specific sensitivity for particle beats
  particlesReactToBeat: boolean; // If true, explode on beat. If false, just ambient.
  particleTrails: boolean; // Motion blur trails
  particleGravity: boolean; // Physics-based gravity
  particleColorShift: boolean; // Color changes based on audio

  // Camera Shake
  enableBassShake: boolean;
  cameraShakeMode: CameraShakeMode;
  shakeRotation: boolean; // Add rotation to shake

  // Effects
  enableDarkOverlay: boolean;
  centerImageRotation: boolean; // Rotate the center logo?
  enablePerlinNoise: boolean; // Organic displacement
  enableKaleidoscope: boolean; // Psychedelic mirror effect
  kaleidoscopeSegments: number; // 3-12 segments

  // Post Processing
  postProcessEffects: PostProcessEffect[];
  chromaticAberrationIntensity: number; // 0 to 10
  scanlineIntensity: number; // 0 to 1
  motionBlurIntensity: number; // 0 to 1

  // Audio
  smoothing: number; // 0.1 to 0.99
  bloomIntensity: number; // 0 to 2
  sensitivity: number; // 0.5 to 3.0

  // Frequency Display
  showFrequencyBars: boolean; // Show frequency analyzer overlay
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
  rotation: number;
  rotationSpeed: number;
  wobble: number;

  // Organic props
  pulsePhase: number;   // Current phase in the breathing cycle (0-2PI)
  pulseSpeed: number;   // How fast this specific particle breathes
  targetSize: number;   // For smooth interpolation during bass hits

  // Premium features
  trail: Array<{x: number, y: number, alpha: number}>; // Motion trail
  hue: number; // For color shifting (0-360)
  hueSpeed: number; // Color shift speed
}

export interface AudioData {
  frequencyData: Uint8Array;
  waveData: Uint8Array;
  bass: number; // 0-255 average of low frequencies
  mid: number; // 0-255 average of mid frequencies
  treble: number; // 0-255 average of high frequencies
}