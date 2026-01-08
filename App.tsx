import React, { useState, useCallback, useRef } from 'react';
import VisualizerCanvas from './components/VisualizerCanvas';
import Controls from './components/Controls';
import { VisualizerSettings, VisualizerStyle, ColorPalette, ParticleMode, AspectRatio, CameraShakeMode, PostProcessEffect } from './types';

const App: React.FC = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [centerImageFile, setCenterImageFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [restartTrigger, setRestartTrigger] = useState(0); 
  
  // New Player State
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seekTo, setSeekTo] = useState<number | null>(null);
  
  const [settings, setSettings] = useState<VisualizerSettings>({
    style: VisualizerStyle.CIRCULAR_NEON,
    palette: ColorPalette.CYAN_MAGENTA,
    customColors: ['#ff0055', '#00f3ff', '#ffffff'],
    aspectRatio: AspectRatio.LANDSCAPE,

    // Particles
    enableParticles: true,
    particleMode: ParticleMode.MIX,
    particleDensity: 0.5, // Reduziert von 1.0 für bessere Performance
    particleSensitivity: 1.2,
    particlesReactToBeat: true,
    particleTrails: false,
    particleGravity: false,
    particleColorShift: false,

    // Camera Shake
    enableBassShake: true,
    cameraShakeMode: CameraShakeMode.MEDIUM,
    shakeRotation: false,

    // Effects
    enableDarkOverlay: false,
    centerImageRotation: false,
    enablePerlinNoise: false,
    enableKaleidoscope: false,
    kaleidoscopeSegments: 6,

    // Post Processing
    postProcessEffects: [],
    chromaticAberrationIntensity: 3,
    scanlineIntensity: 0.5,
    motionBlurIntensity: 0.3,

    // Audio
    smoothing: 0.85,
    bloomIntensity: 1.0,
    sensitivity: 1.0,

    // Frequency Display
    showFrequencyBars: false,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAudioFile(e.target.files[0]);
      setIsPlaying(false);
      setIsRecording(false);
      setCurrentTime(0);
      setDuration(0);
    }
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBgFile(e.target.files[0]);
    }
  };

  const handleCenterImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCenterImageFile(e.target.files[0]);
    }
  };

  const updateSettings = useCallback((newSettings: Partial<VisualizerSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Called when audio finishes playback
  const handleAudioEnd = () => {
    setIsPlaying(false);
    if (isRecording) {
      stopRecording();
    }
  };
  
  const handleTimeUpdate = (curr: number, total: number) => {
    setCurrentTime(curr);
    if (total > 0 && total !== duration) setDuration(total);
  };
  
  const handleSeek = (time: number) => {
    setCurrentTime(time); // Optimistic UI update
    setSeekTo(time);
    // Reset seekTo after a brief moment handled in child, or we just rely on the prop change
    // Since setSeekTo triggers an effect in child, we just need to change the value.
    // Ideally we might want a timestamp or ID to force it if seeking to same spot, 
    // but typically user drags which changes value constantly.
  };

  const handleStop = () => {
    setIsPlaying(false);
    if (isRecording) stopRecording();
    
    // Trigger reset logic
    setRestartTrigger(prev => prev + 1); 
    setCurrentTime(0);
  };

  const startRecording = () => {
    if (!canvasRef.current || !audioFile) return;
    
    // Force restart song logic
    setRestartTrigger(prev => prev + 1);
    setCurrentTime(0);

    const stream = canvasRef.current.captureStream(60);
    const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9') 
      ? 'video/webm; codecs=vp9' 
      : 'video/webm';
      
    const recorder = new MediaRecorder(stream, { 
      mimeType, 
      videoBitsPerSecond: 8000000 
    });
    
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
       if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meet_the_beat_${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
    
    if (!isPlaying) setIsPlaying(true);
  };

  const handleToggleRecord = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-black overflow-hidden font-sans">
      <div className="flex-1 flex flex-col relative bg-[#0a0a0a]">
        <div className="flex-1 flex items-center justify-center p-4 md:p-8 lg:p-12 overflow-hidden">
          <VisualizerCanvas 
            audioFile={audioFile}
            bgImageFile={bgFile}
            centerImageFile={centerImageFile}
            settings={settings}
            isPlaying={isPlaying}
            seekTo={seekTo}
            onTimeUpdate={handleTimeUpdate}
            onAudioEnd={handleAudioEnd}
            setCanvasRef={(ref) => canvasRef.current = ref}
            restartTrigger={restartTrigger}
          />
        </div>
      </div>

      <Controls 
        settings={settings}
        updateSettings={updateSettings}
        audioFile={audioFile}
        bgFile={bgFile}
        centerImageFile={centerImageFile}
        onAudioUpload={handleAudioUpload}
        onBgUpload={handleBgUpload}
        onCenterImageUpload={handleCenterImageUpload}
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onStop={handleStop}
        isRecording={isRecording}
        onToggleRecord={handleToggleRecord}
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeek}
      />
    </div>
  );
};

export default App;