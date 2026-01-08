import React from 'react';
import { VisualizerSettings, VisualizerStyle, ColorPalette, ParticleMode } from '../types';
import { PALETTES } from '../constants';
import { Play, Pause, Square, Upload, Video, Music, Image as ImageIcon, CircleDot } from 'lucide-react';

interface Props {
  settings: VisualizerSettings;
  updateSettings: (s: Partial<VisualizerSettings>) => void;
  audioFile: File | null;
  bgFile: File | null;
  centerImageFile: File | null;
  onAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBgUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCenterImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  isRecording: boolean;
  onToggleRecord: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

const formatTime = (seconds: number) => {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const Controls: React.FC<Props> = ({
  settings,
  updateSettings,
  audioFile,
  bgFile,
  centerImageFile,
  onAudioUpload,
  onBgUpload,
  onCenterImageUpload,
  isPlaying,
  onPlayPause,
  onStop,
  isRecording,
  onToggleRecord,
  currentTime,
  duration,
  onSeek
}) => {
  
  const handleCustomColorChange = (index: number, color: string) => {
    const newColors = [...settings.customColors] as [string, string, string];
    newColors[index] = color;
    updateSettings({ customColors: newColors });
  };

  return (
    <div className="bg-gray-900 border-l border-gray-800 h-full p-6 overflow-y-auto w-full md:w-[400px] flex-shrink-0 text-gray-300 shadow-2xl z-10 flex flex-col">
      <h1 className="text-2xl font-bold text-white mb-6 tracking-tight bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
        Meet the Beat
      </h1>

      {/* Source Material */}
      <div className="space-y-3 mb-6">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Source Material</h2>
        
        {/* Audio Input */}
        <div className="relative group">
           <input 
            type="file" 
            accept="audio/mp3, audio/wav" 
            onChange={onAudioUpload} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className={`p-3 rounded-lg border-2 border-dashed transition-all flex items-center gap-3 ${audioFile ? 'border-green-500/50 bg-green-500/10' : 'border-gray-700 bg-gray-800 hover:border-gray-500'}`}>
            <Music className={audioFile ? "text-green-400" : "text-gray-400"} size={18} />
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{audioFile ? audioFile.name : "Select Audio (MP3)"}</p>
            </div>
          </div>
        </div>

        {/* BG Input */}
        <div className="relative group">
           <input 
            type="file" 
            accept="image/png, image/jpeg, image/jpg" 
            onChange={onBgUpload} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
           <div className={`p-3 rounded-lg border-2 border-dashed transition-all flex items-center gap-3 ${bgFile ? 'border-purple-500/50 bg-purple-500/10' : 'border-gray-700 bg-gray-800 hover:border-gray-500'}`}>
            <ImageIcon className={bgFile ? "text-purple-400" : "text-gray-400"} size={18} />
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{bgFile ? bgFile.name : "Background Image"}</p>
            </div>
          </div>
        </div>

         {/* Center Image Input */}
         <div className="relative group">
           <input 
            type="file" 
            accept="image/png, image/jpeg, image/jpg" 
            onChange={onCenterImageUpload} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
           <div className={`p-3 rounded-lg border-2 border-dashed transition-all flex items-center gap-3 ${centerImageFile ? 'border-blue-500/50 bg-blue-500/10' : 'border-gray-700 bg-gray-800 hover:border-gray-500'}`}>
            <CircleDot className={centerImageFile ? "text-blue-400" : "text-gray-400"} size={18} />
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{centerImageFile ? centerImageFile.name : "Center Logo / Image"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Player Section (NEW) */}
      <div className="mb-6 bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Now Playing</span>
            <span className="text-xs font-mono text-pink-400">{formatTime(currentTime)} / {formatTime(duration)}</span>
        </div>
        
        <div className="text-sm font-medium text-white truncate mb-3">
            {audioFile ? audioFile.name : "No Track Selected"}
        </div>

        {/* Scrubbing Timeline */}
        <input 
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            disabled={!audioFile}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500 hover:accent-pink-400 mb-4"
        />

        {/* Transport Controls */}
        <div className="grid grid-cols-2 gap-3">
            <button 
            onClick={onPlayPause}
            disabled={!audioFile}
            className={`flex items-center justify-center gap-2 p-3 rounded-lg font-semibold transition-all ${
                !audioFile ? 'bg-gray-800 text-gray-600 cursor-not-allowed' :
                isPlaying ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'bg-green-600 text-white hover:bg-green-500'
            }`}
            >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            {isPlaying ? "Pause" : "Play"}
            </button>
            <button 
            onClick={onStop}
            disabled={!audioFile}
            className="flex items-center justify-center gap-2 p-3 rounded-lg bg-gray-800 text-white hover:bg-gray-700 font-semibold disabled:opacity-50"
            >
            <Square size={18} fill="currentColor" /> Stop
            </button>
        </div>
      </div>

      {/* Visual Settings */}
      <div className="mb-6 space-y-5 flex-1 overflow-y-auto pr-1">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Visual Configuration</h2>

        <div>
          <label className="block text-sm mb-2 text-gray-400">Visualization Style</label>
          <select 
            value={settings.style}
            onChange={(e) => updateSettings({ style: e.target.value as VisualizerStyle })}
            className="w-full bg-gray-800 text-white border border-gray-700 rounded-md p-2.5 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none mb-3"
          >
            <option value={VisualizerStyle.CIRCULAR_NEON}>Circular Neon Pulse</option>
            <option value={VisualizerStyle.MIRRORED_FLOOR}>Mirrored Floor Spectrum</option>
            <option value={VisualizerStyle.REACTIVE_WAVE}>Reactive Waveform</option>
          </select>

           <label className="block text-sm mb-2 text-gray-400">Particle Type</label>
          <select 
            value={settings.particleMode}
            onChange={(e) => updateSettings({ particleMode: e.target.value as ParticleMode })}
            className="w-full bg-gray-800 text-white border border-gray-700 rounded-md p-2.5 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
          >
            <option value={ParticleMode.MIX}>Magic Mix</option>
            <option value={ParticleMode.ORBS}>Floating Orbs</option>
            <option value={ParticleMode.STARS}>Sparkling Stars</option>
            <option value={ParticleMode.DUST}>Atmospheric Dust</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-2 text-gray-400">Color Palette</label>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {Object.entries(PALETTES).map(([key, palette]) => (
              <button
                key={key}
                onClick={() => updateSettings({ palette: key as ColorPalette })}
                className={`p-2 rounded-md border text-left flex flex-col gap-2 transition-all ${
                  settings.palette === key ? 'border-pink-500 bg-pink-500/10' : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                }`}
              >
                <div className="flex gap-1 h-3 w-full rounded-sm overflow-hidden">
                  {key === ColorPalette.CUSTOM 
                    ? settings.customColors.map((c, i) => <div key={i} style={{background: c}} className="flex-1" />)
                    : palette.colors.map((c, i) => <div key={i} style={{background: c}} className="flex-1" />)
                  }
                </div>
                <span className="text-xs font-medium">{palette.name}</span>
              </button>
            ))}
          </div>

          {settings.palette === ColorPalette.CUSTOM && (
            <div className="grid grid-cols-3 gap-2 bg-gray-800 p-3 rounded-lg border border-gray-700">
               <div className="flex flex-col items-center gap-1">
                 <input 
                   type="color" 
                   value={settings.customColors[0]} 
                   onChange={(e) => handleCustomColorChange(0, e.target.value)}
                   className="w-full h-8 rounded cursor-pointer bg-transparent"
                 />
                 <span className="text-[10px] text-gray-400">Primary</span>
               </div>
               <div className="flex flex-col items-center gap-1">
                 <input 
                   type="color" 
                   value={settings.customColors[1]} 
                   onChange={(e) => handleCustomColorChange(1, e.target.value)}
                   className="w-full h-8 rounded cursor-pointer bg-transparent"
                 />
                 <span className="text-[10px] text-gray-400">Secondary</span>
               </div>
                <div className="flex flex-col items-center gap-1">
                 <input 
                   type="color" 
                   value={settings.customColors[2]} 
                   onChange={(e) => handleCustomColorChange(2, e.target.value)}
                   className="w-full h-8 rounded cursor-pointer bg-transparent"
                 />
                 <span className="text-[10px] text-gray-400">Accent</span>
               </div>
            </div>
          )}
        </div>

        {/* Sliders */}
        <div className="space-y-4 pt-2">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Main Sensitivity</span>
              <span className="text-gray-400">{settings.sensitivity.toFixed(1)}x</span>
            </div>
            <input 
              type="range" min="0.5" max="2.0" step="0.1" 
              value={settings.sensitivity}
              onChange={(e) => updateSettings({ sensitivity: parseFloat(e.target.value) })}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Particle Density</span>
              <span className="text-gray-400">{settings.particleDensity.toFixed(1)}x</span>
            </div>
            <input 
              type="range" min="0.5" max="3.0" step="0.1" 
              value={settings.particleDensity}
              onChange={(e) => updateSettings({ particleDensity: parseFloat(e.target.value) })}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Particle Beat Sensitivity</span>
              <span className="text-gray-400">{settings.particleSensitivity.toFixed(1)}x</span>
            </div>
            <input 
              type="range" min="0.5" max="3.0" step="0.1" 
              value={settings.particleSensitivity}
              onChange={(e) => updateSettings({ particleSensitivity: parseFloat(e.target.value) })}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Smoothness</span>
              <span className="text-gray-400">{(settings.smoothing * 100).toFixed(0)}%</span>
            </div>
            <input 
              type="range" min="0.1" max="0.99" step="0.01" 
              value={settings.smoothing}
              onChange={(e) => updateSettings({ smoothing: parseFloat(e.target.value) })}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Glow / Bloom</span>
              <span className="text-gray-400">{(settings.bloomIntensity * 100).toFixed(0)}%</span>
            </div>
            <input 
              type="range" min="0" max="2" step="0.1" 
              value={settings.bloomIntensity}
              onChange={(e) => updateSettings({ bloomIntensity: parseFloat(e.target.value) })}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-col gap-3 pt-2">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={settings.enableParticles}
              onChange={(e) => updateSettings({ enableParticles: e.target.checked })}
              className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-pink-600 focus:ring-pink-500 focus:ring-offset-gray-900"
            />
            <span className="text-sm group-hover:text-white transition-colors">Enable Particles</span>
          </label>
           <label className="flex items-center gap-3 cursor-pointer group ml-8">
            <input 
              type="checkbox" 
              checked={settings.particlesReactToBeat}
              disabled={!settings.enableParticles}
              onChange={(e) => updateSettings({ particlesReactToBeat: e.target.checked })}
              className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-pink-600 focus:ring-pink-500 focus:ring-offset-gray-900 disabled:opacity-50"
            />
            <span className={`text-sm transition-colors ${!settings.enableParticles ? 'text-gray-600' : 'group-hover:text-white'}`}>Particles React to Beat</span>
          </label>

           <label className="flex items-center gap-3 cursor-pointer group mt-2">
            <input 
              type="checkbox" 
              checked={settings.enableBassShake}
              onChange={(e) => updateSettings({ enableBassShake: e.target.checked })}
              className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-pink-600 focus:ring-pink-500 focus:ring-offset-gray-900"
            />
            <span className="text-sm group-hover:text-white transition-colors">Enable Camera Shake</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={settings.enableDarkOverlay}
              onChange={(e) => updateSettings({ enableDarkOverlay: e.target.checked })}
              className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-pink-600 focus:ring-pink-500 focus:ring-offset-gray-900"
            />
            <span className="text-sm group-hover:text-white transition-colors">Darken Background</span>
          </label>
          
          {settings.style === VisualizerStyle.CIRCULAR_NEON && (
             <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={settings.centerImageRotation}
                onChange={(e) => updateSettings({ centerImageRotation: e.target.checked })}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-pink-600 focus:ring-pink-500 focus:ring-offset-gray-900"
              />
              <span className="text-sm group-hover:text-white transition-colors">Rotate Center Image</span>
            </label>
          )}
        </div>
      </div>

      {/* Export Section */}
      <div className="mt-auto pt-6 border-t border-gray-800">
        <button 
          onClick={onToggleRecord}
          disabled={!audioFile}
          className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg ${
            isRecording 
              ? 'bg-red-500 text-white animate-pulse' 
              : !audioFile 
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-pink-600 to-violet-600 text-white hover:from-pink-500 hover:to-violet-500 hover:shadow-pink-500/20'
          }`}
        >
          {isRecording ? (
            <>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
              Recording... (Auto Stop at End)
            </>
          ) : (
            <>
              <Video size={24} /> Render Video (Restart & Record)
            </>
          )}
        </button>
        {isRecording && <p className="text-center text-xs text-red-400 mt-2">Recording active. Will stop automatically when song ends.</p>}
        {!isRecording && <p className="text-center text-xs text-gray-600 mt-2">Outputs high-bitrate WebM video</p>}
      </div>
    </div>
  );
};

export default Controls;