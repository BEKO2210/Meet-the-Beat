import React, { useRef, useEffect, useState } from 'react';
import { VisualizerSettings, AudioData, AspectRatio } from '../types';
import { renderFrame } from '../utils/renderer';
import { FFT_SIZE } from '../constants';

interface Props {
  audioFile: File | null;
  bgImageFile: File | null;
  centerImageFile: File | null;
  settings: VisualizerSettings;
  isPlaying: boolean;
  seekTo: number | null; // New: Timestamp to jump to
  onAudioEnd: () => void;
  onTimeUpdate: (current: number, total: number) => void; // New: Report time back
  setCanvasRef: (ref: HTMLCanvasElement | null) => void;
  setAudioElementRef?: (ref: HTMLAudioElement | null) => void; // NEW: For audio stream
  restartTrigger: number;
}

const VisualizerCanvas: React.FC<Props> = ({
  audioFile,
  bgImageFile,
  centerImageFile,
  settings,
  isPlaying,
  seekTo,
  onAudioEnd,
  onTimeUpdate,
  setCanvasRef,
  setAudioElementRef,
  restartTrigger
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [centerImage, setCenterImage] = useState<HTMLImageElement | null>(null);
  
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const requestRef = useRef<number>(0);

  // Define resolution based on aspect ratio setting
  const isPortrait = settings.aspectRatio === AspectRatio.PORTRAIT;
  const canvasWidth = isPortrait ? 1080 : 1920;
  const canvasHeight = isPortrait ? 1920 : 1080;

  useEffect(() => {
    setCanvasRef(canvasRef.current);
  }, [setCanvasRef]);

  // NEW: Expose audio element ref to parent
  useEffect(() => {
    if (setAudioElementRef) {
      setAudioElementRef(audioElementRef.current);
    }
  }, [setAudioElementRef]); // FIXED: Removed audioElementRef.current from deps to prevent unnecessary re-renders

  // Handle Seek from parent
  useEffect(() => {
    if (audioElementRef.current && seekTo !== null) {
      audioElementRef.current.currentTime = seekTo;
    }
  }, [seekTo]);

  // Handle Restart / Stop Trigger
  useEffect(() => {
    if (audioElementRef.current && restartTrigger > 0) {
      audioElementRef.current.currentTime = 0;
      // If we are resetting, let's also update the UI time immediately
      onTimeUpdate(0, audioElementRef.current.duration || 0);
    }
  }, [restartTrigger]);

  // Load Images
  useEffect(() => {
    if (bgImageFile) {
      const url = URL.createObjectURL(bgImageFile);
      const img = new Image();
      img.src = url;
      img.onload = () => setBgImage(img);
      return () => URL.revokeObjectURL(url); // FIXED: Clean up memory leak
    } else {
      setBgImage(null);
    }
  }, [bgImageFile]);

  useEffect(() => {
    if (centerImageFile) {
      const url = URL.createObjectURL(centerImageFile);
      const img = new Image();
      img.src = url;
      img.onload = () => setCenterImage(img);
      return () => URL.revokeObjectURL(url); // FIXED: Clean up memory leak
    } else {
      setCenterImage(null);
    }
  }, [centerImageFile]);

  // Setup Audio
  useEffect(() => {
    if (!audioFile) return;

    // Cleanup previous audio if exists
    if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = "";
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        // We don't necessarily need to close context, but let's be safe
    }

    const url = URL.createObjectURL(audioFile);
    const audio = new Audio(url);
    audioElementRef.current = audio;

    // Event Listeners
    const handleEnded = () => {
      onAudioEnd(); // Critical for stopping recording
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };

    const handleTimeUpdate = () => {
      if (audio.duration) {
        onTimeUpdate(audio.currentTime, audio.duration);
      }
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleTimeUpdate);

    // Create Audio Context
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
    }
    const ctx = audioContextRef.current;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = settings.smoothing;
    analyserRef.current = analyser;

    // FIXED: Error handling for MediaElementSource creation
    try {
      const source = ctx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      sourceRef.current = source;
    } catch (error) {
      console.error('Failed to create audio source:', error);
    }

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleTimeUpdate);
      audio.pause();
      audio.src = '';
      URL.revokeObjectURL(url); // FIXED: Clean up memory leak
    };
  }, [audioFile]);

  // Update Smoothing
  useEffect(() => {
    if (analyserRef.current) {
      analyserRef.current.smoothingTimeConstant = settings.smoothing;
    }
  }, [settings.smoothing]);

  // Play/Pause Logic
  useEffect(() => {
    const audio = audioElementRef.current;
    const ctx = audioContextRef.current;

    if (audio && ctx) {
      if (isPlaying) {
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        audio.play()
            .then(() => {
                if (!requestRef.current) requestRef.current = requestAnimationFrame(animate);
            })
            .catch(e => console.error("Playback failed", e));

        if (!requestRef.current) requestRef.current = requestAnimationFrame(animate);

      } else {
        audio.pause();
        // FIXED: Stop animation when paused to save CPU
        if (requestRef.current) {
          cancelAnimationFrame(requestRef.current);
          requestRef.current = 0;
        }
        // Still render one final frame when paused
        requestRef.current = requestAnimationFrame(animate);
      }
    }
  }, [isPlaying]);

  const animate = () => {
    // FIXED: Don't continue animation loop if refs are not ready
    if (!canvasRef.current || !analyserRef.current) {
        return; // Stop animation loop instead of continuing endlessly
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) {
      // FIXED: Schedule next frame even if ctx is null temporarily
      requestRef.current = requestAnimationFrame(animate);
      return;
    }

    // Data buffers
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const waveArray = new Uint8Array(bufferLength);

    analyserRef.current.getByteFrequencyData(dataArray);
    analyserRef.current.getByteTimeDomainData(waveArray);

    // Calculate bands
    let bassSum = 0, midSum = 0, trebleSum = 0;
    const bassLimit = Math.max(1, Math.floor(bufferLength * 0.05)); // FIXED: Ensure > 0
    const midLimit = Math.max(bassLimit + 1, Math.floor(bufferLength * 0.3)); // FIXED: Ensure > bassLimit

    for (let i = 0; i < bufferLength; i++) {
      if (i < bassLimit) bassSum += dataArray[i];
      else if (i < midLimit) midSum += dataArray[i];
      else trebleSum += dataArray[i];
    }

    // FIXED: Prevent division by zero
    const midDivisor = Math.max(1, midLimit - bassLimit);
    const trebleDivisor = Math.max(1, bufferLength - midLimit);

    const audioData: AudioData = {
      frequencyData: dataArray,
      waveData: waveArray,
      bass: bassSum / bassLimit,
      mid: midSum / midDivisor,
      treble: trebleSum / trebleDivisor
    };
    
    // Pass current derived width/height to renderer
    // Note: Use the actual canvas internal resolution
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;

    renderFrame(ctx, audioData, settingsRef.current, bgImage, centerImage, w, h);
    requestRef.current = requestAnimationFrame(animate);
  };

  return (
    <div 
      className="relative shadow-2xl overflow-hidden border border-gray-800 bg-black rounded-lg transition-all duration-500 ease-in-out"
      style={{
        aspectRatio: isPortrait ? '9 / 16' : '16 / 9',
        height: isPortrait ? '100%' : 'auto',
        width: isPortrait ? 'auto' : '100%',
        maxHeight: '100%',
        maxWidth: '100%'
      }}
    >
      <canvas 
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="w-full h-full object-contain"
      />
      {!audioFile && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 pointer-events-none">
          <p className="text-xl">Upload an Audio File to Begin</p>
        </div>
      )}
    </div>
  );
};

export default VisualizerCanvas;