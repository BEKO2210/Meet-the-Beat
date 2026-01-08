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
  [ColorPalette.CUSTOM]: {
    name: "Custom (Manual)",
    colors: ["#ffffff", "#888888", "#444444"] // Default placeholders
  }
};