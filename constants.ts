import { ColorPalette } from './types';

export const FFT_SIZE = 2048; // Higher = more resolution
export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;

// Note: CUSTOM is handled dynamically in the renderer, so we give it a placeholder here
export const PALETTES: Record<ColorPalette, { name: string; colors: string[] }> = {
  [ColorPalette.CYAN_MAGENTA]: {
    name: "Cyberpunk Neon",
    colors: ["#00f3ff", "#bd00ff", "#ffffff"]
  },
  [ColorPalette.SUNSET_BLAZE]: {
    name: "Sunset Blaze",
    colors: ["#ff4d00", "#ff0055", "#ffcc00"]
  },
  [ColorPalette.MATRIX_GREEN]: {
    name: "Matrix Code",
    colors: ["#00ff00", "#008f11", "#ccffcc"]
  },
  [ColorPalette.GOLDEN_HOUR]: {
    name: "Golden Luxury",
    colors: ["#ffd700", "#ffaa00", "#ffffff"]
  },
  [ColorPalette.FIRE_ICE]: {
    name: "Fire & Ice",
    colors: ["#ff0000", "#0088ff", "#ffffff"]
  },
  [ColorPalette.COTTON_CANDY]: {
    name: "Cotton Candy",
    colors: ["#ff99cc", "#99ccff", "#ffffff"]
  },
  [ColorPalette.OCEAN_DEEP]: {
    name: "Ocean Deep",
    colors: ["#0077be", "#00d4ff", "#7fffd4"]
  },
  [ColorPalette.LAVA_FLOW]: {
    name: "Lava Flow",
    colors: ["#ff4500", "#ff6347", "#ffa500"]
  },
  [ColorPalette.AURORA]: {
    name: "Aurora Borealis",
    colors: ["#00ff9f", "#00bfff", "#9370db"]
  },
  [ColorPalette.NEON_CITY]: {
    name: "Neon City",
    colors: ["#ff10f0", "#39ff14", "#ffff00"]
  },
  [ColorPalette.ROYAL_PURPLE]: {
    name: "Royal Purple",
    colors: ["#8b00ff", "#da70d6", "#ffffff"]
  },
  [ColorPalette.EMERALD_DREAM]: {
    name: "Emerald Dream",
    colors: ["#00ff7f", "#32cd32", "#98fb98"]
  },
  [ColorPalette.CUSTOM]: {
    name: "Custom (Manual)",
    colors: ["#ffffff", "#888888", "#444444"]
  }
};