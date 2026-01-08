# 🎵 Meet the Beat

<div align="center">
  <img src="https://github.com/BEKO2210/Meet-the-Beat/blob/main/assets/Meet%20the%20Beat.png?raw=true" alt="Meet the Beat Demo" width="800"/>
</div>

<div align="center">
  <strong>Professional Audio Visualization Suite</strong>
  <br/>
  Premium music visualizer with cinematic effects and high-quality video export
</div>

<br/>

## ✨ Features

### 🎨 Visualization Styles
- **Circular Neon Pulse** - Symmetrical frequency visualization with customizable center logo
- **Mirrored Floor Spectrum** - Dual vertical bar spectrum with reflection effects
- **Reactive Waveform** - Time-domain waveform with ghost overlay and bass distortion

### 🌟 Premium Particle System
- **9 Particle Types**: Orbs, Stars, Dust, Rings, Hearts, Music Notes, Lightning Sparks
- **Advanced Physics**: Motion trails, gravity simulation, organic breathing animation
- **Audio Reactivity**: Beat-synchronized particle bursts and slow-motion effects
- **Color Shifting**: Dynamic HSL-based color transitions synchronized to audio frequencies
- **3 Density Levels**: Adjustable particle count for performance optimization

### 📹 Camera Effects
- **5 Shake Modes**: Off, Subtle, Medium, Intense, Earthquake
- **Perlin Noise**: Organic, cinematic camera movement (smooth like AAA games)
- **Multi-Layer Motion**: Combined sine waves and noise for natural shake
- **Rotation Shake**: Optional camera rotation for extreme intensity
- **Bass-Driven**: Automatically syncs to low-frequency audio content

### 🎭 Visual Effects
- **Kaleidoscope Mode**: Psychedelic mirror effect with 3-12 configurable segments
- **Perlin Noise Displacement**: Organic, flowing movement for visualizations
- **Bloom/Glow**: Adjustable neon bloom intensity (0-200%)
- **Vignette**: Cinematic edge darkening for professional finish
- **Dark Overlay**: Optional background dimming for better contrast

### 🖼️ Post-Processing
- **Chromatic Aberration**: RGB color channel separation (1-10 intensity)
- **Scanlines**: Retro CRT TV effect with adjustable intensity
- **CRT Effect**: Authentic cathode-ray tube simulation with screen flicker
- **Motion Blur**: Cinematic motion blur for smooth, film-like visuals

### 🎨 Color Palettes
**10 Built-in Palettes:**
- Cyberpunk Neon
- Sunset Blaze
- Matrix Code
- Golden Luxury
- Fire & Ice
- Cotton Candy
- Ocean Deep
- Lava Flow
- Aurora Borealis
- Neon City

**Plus:** Custom palette mode with RGB color pickers

### 🎵 Audio Analysis
- **High-Resolution FFT**: 2048-bin frequency analysis
- **Frequency Bands**: Separate bass, mid, and treble detection
- **Adjustable Smoothing**: 10-99% for responsive or smooth visuals
- **Sensitivity Control**: 0.5x to 3.0x global sensitivity multiplier
- **Frequency Analyzer**: Optional real-time spectrum overlay

### 📤 Export Features
- **High-Bitrate Video**: 8 Mbps WebM (VP9 codec)
- **Dual Aspect Ratios**: 16:9 (YouTube) and 9:16 (TikTok/Reels)
- **Canvas Recording**: 60 FPS capture with automatic song sync
- **Auto-Stop**: Recording automatically ends when track finishes

### 🎛️ Advanced Controls
- **Playback Controls**: Play, pause, stop, timeline scrubbing
- **Real-Time Preview**: All settings update live during playback
- **Custom Images**: Upload background and center logo images
- **Audio Formats**: MP3 and WAV support
- **Responsive UI**: Works on desktop and tablet devices

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v16 or higher)
- Modern web browser with Canvas and Web Audio API support

### Installation

1. **Clone the repository** (for authorized users only)
   ```bash
   git clone https://github.com/BEKO2210/Meet-the-Beat.git
   cd Meet-the-Beat
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   Navigate to http://localhost:3000
   ```

### Build for Production

```bash
npm run build
npm run preview
```

---

## 🎮 Usage Guide

### Basic Workflow

1. **Upload Audio**: Click "Select Audio (MP3)" and choose your music file
2. **Upload Images** (optional):
   - Background Image: Sets the backdrop for visualizations
   - Center Logo: Displays in the center of Circular Neon style
3. **Select Style**: Choose from Circular Neon, Mirrored Floor, or Reactive Wave
4. **Choose Palette**: Pick from 10 presets or create a custom color scheme
5. **Adjust Settings**:
   - Particle density, sensitivity, and type
   - Camera shake mode and intensity
   - Visual effects (Perlin noise, Kaleidoscope)
   - Post-processing effects
6. **Play**: Click Play to preview your visualization
7. **Record**: Click "Render Video" to export high-quality WebM file

### Pro Tips

- **Beat-Reactive Particles**: Enable "React to Beat" for explosive particle bursts on bass hits
- **Smooth Camera Shake**: Use "Medium" mode with Perlin noise for cinematic feel
- **Retro Look**: Combine Scanlines + CRT effect + Matrix Green palette
- **Psychedelic Mode**: Enable Kaleidoscope with 8 segments + Color Shifting particles
- **Premium Mix**: Use "Premium Mix" particle mode to showcase all particle types
- **Motion Trails**: Enable for smooth, flowing particle movement
- **Chromatic Aberration**: Add 3-5 intensity for subtle RGB separation (film-like look)

---

## 🛠️ Technical Stack

- **React 19** - Latest React with concurrent features
- **TypeScript 5.8** - Full type safety
- **Vite 6** - Lightning-fast development and build
- **Canvas 2D API** - High-performance rendering
- **Web Audio API** - Real-time audio analysis
- **MediaRecorder API** - Canvas-to-video export
- **Tailwind CSS** - Modern UI styling
- **Lucide React** - Beautiful icon set

### Performance Optimizations

- **Perlin Noise Caching**: Pre-generated permutation tables
- **Particle Pooling**: Efficient memory management with hardcap (300 particles max)
- **Request Animation Frame**: Smooth 60 FPS rendering with automatic pause optimization
- **Batch Draw Calls**: Minimized canvas state changes
- **Offscreen Rendering**: Reusable temp canvas for post-processing (no GC pressure)
- **Memory Leak Prevention**: Proper URL.revokeObjectURL() cleanup for all blob URLs
- **Smart Trail Rendering**: Adaptive rendering skips trails when particle count > 200

### Recent Bug Fixes (Latest Version)

**🔧 Memory & Performance Fixes:**
- ✅ Fixed memory leaks from `URL.createObjectURL()` not being revoked
- ✅ Fixed temp canvas being recreated every frame in post-processing effects
- ✅ Optimized animation loop to stop when paused (saves CPU/battery)
- ✅ Fixed useEffect dependency array causing unnecessary re-renders

**🛡️ Stability Improvements:**
- ✅ Added error handling for AudioContext creation failures
- ✅ Fixed potential negative array index in Perlin Noise shuffle algorithm
- ✅ Improved cleanup in audio setup effect hook

**🎬 Audio Export Enhancement:**
- ✅ Video export now includes audio track (video + audio combined in WebM)
- ✅ High-quality audio: 128kbps opus codec
- ✅ Synchronized dual audio streams (visualizer + recording)

---

## 📊 Architecture

```
Meet-the-Beat/
├── components/
│   ├── VisualizerCanvas.tsx   # Canvas rendering & audio setup
│   └── Controls.tsx            # UI control panel (50+ settings)
├── utils/
│   └── renderer.ts             # Core visualization engine with Perlin noise
├── types.ts                    # TypeScript interfaces & enums
├── constants.ts                # Color palettes & global constants
├── App.tsx                     # Main application & state management
└── assets/
    └── Meet the Beat.png       # Demo screenshot
```

---

## 🎯 Key Algorithms

### Perlin Noise Implementation
Custom Perlin noise generator for organic camera shake and visual displacement, providing smoother motion than traditional sine waves.

### Beat Detection
Multi-threshold bass detection with configurable sensitivity, enabling precise synchronization of visual effects to music beats.

### Particle Physics
- **Depth Simulation**: Parallax effect with size/speed variation
- **Organic Breathing**: Independent sine-wave pulsing per particle
- **Trail System**: Motion blur with exponential fade-out
- **Color Shifting**: HSL color space manipulation for smooth transitions

### Kaleidoscope Effect
Recursive radial mirroring with configurable segment count, creating psychedelic symmetry.

---

## ⚖️ License & Usage

**Important:** This project is **NOT open source**.

- **© 2024-2025 All Rights Reserved**
- **Private Use Only**: This software is proprietary and intended for authorized users only
- **No Redistribution**: You may not distribute, sell, or sublicense this software
- **No Modification**: Creating derivative works is not permitted without explicit authorization
- **Commercial Use**: Requires separate licensing agreement

For licensing inquiries, please contact the repository owner.

---

## 🤝 Credits

**Developed by:** BEKO2210

**Powered by:**
- Epic Games' Unreal Engine camera shake research
- Game development best practices from Unity & Unreal communities
- Modern web audio visualization techniques

---

## 📞 Support

For issues, feature requests, or licensing questions:
- **GitHub Issues**: [Report a bug](https://github.com/BEKO2210/Meet-the-Beat/issues)
- **Contact**: Via GitHub profile

---

<div align="center">
  <strong>🎵 Meet the Beat - Where Audio Meets Art 🎨</strong>
  <br/>
  <sub>Professional-grade music visualization for content creators</sub>
</div>
