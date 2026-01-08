import React, { useRef, useEffect, useState } from 'react';
import { VisualizerSettings, AudioData } from '../types';
import { renderFrame } from '../utils/renderer';
import { FFT_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';

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

  useEffect(() => {
    setCanvasRef(canvasRef.current);
  }, [setCanvasRef]);

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
      const img = new Image();
      img.src = URL.createObjectURL(bgImageFile);
      img.onload = () => setBgImage(img);
    } else {
      setBgImage(null);
    }
  }, [bgImageFile]);

  useEffect(() => {
    if (centerImageFile) {
      const img = new Image();
      img.src = URL.createObjectURL(centerImageFile);
      img.onload = () => setCenterImage(img);
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

    // Re-use source node creation logic or create new one
    // Note: Creating a new MediaElementSource on the same Audio object twice throws error.
    // Since we create a NEW Audio object every time file changes, this is safe.
    const source = ctx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    sourceRef.current = source;

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleTimeUpdate);
      audio.pause();
      audio.src = '';
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
                // Animation loop starts only after successful play
                if (!requestRef.current) requestRef.current = requestAnimationFrame(animate);
            })
            .catch(e => console.error("Playback failed", e));
        
        // Ensure animation loop is running
        if (!requestRef.current) requestRef.current = requestAnimationFrame(animate);

      } else {
        audio.pause();
        // We don't cancel animation frame here immediately to prevent canvas from clearing/flashing black
        // But we can stop requesting new ones if strictly needed. 
        // For a smoother UI, we keep rendering the last frame or a static frame.
        // Let's keep rendering to allow "scrubbing" while paused to update visuals.
        if (!requestRef.current) requestRef.current = requestAnimationFrame(animate);
      }
    }
  }, [isPlaying]);

  const animate = () => {
    if (!canvasRef.current || !analyserRef.current) {
        requestRef.current = requestAnimationFrame(animate);
        return;
    }
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Data buffers
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const waveArray = new Uint8Array(bufferLength);

    analyserRef.current.getByteFrequencyData(dataArray);
    analyserRef.current.getByteTimeDomainData(waveArray);

    // Calculate bands
    let bassSum = 0, midSum = 0, trebleSum = 0;
    const bassLimit = Math.floor(bufferLength * 0.05);
    const midLimit = Math.floor(bufferLength * 0.3);

    for (let i = 0; i < bufferLength; i++) {
      if (i < bassLimit) bassSum += dataArray[i];
      else if (i < midLimit) midSum += dataArray[i];
      else trebleSum += dataArray[i];
    }

    const audioData: AudioData = {
      frequencyData: dataArray,
      waveData: waveArray,
      bass: bassSum / bassLimit,
      mid: midSum / (midLimit - bassLimit),
      treble: trebleSum / (bufferLength - midLimit)
    };

    renderFrame(ctx, audioData, settingsRef.current, bgImage, centerImage);
    requestRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className="w-full aspect-video bg-black rounded-lg shadow-2xl overflow-hidden border border-gray-800 relative">
      <canvas 
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
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