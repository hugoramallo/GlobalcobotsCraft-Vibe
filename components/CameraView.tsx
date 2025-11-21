import React, { useEffect, useRef, useState } from 'react';
import { recognizeGesture } from '../services/mediapipeService';
import { GameState, Gesture } from '../types';

interface CameraViewProps {
  gameState: GameState;
  onGestureDetected: (gesture: Gesture) => void;
}

// Drawing helpers
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index
  [5, 9], [9, 10], [10, 11], [11, 12], // Middle
  [9, 13], [13, 14], [14, 15], [15, 16], // Ring
  [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
  [0, 17] // Palm base
];

export const CameraView: React.FC<CameraViewProps> = ({ gameState, onGestureDetected }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const [lastDetected, setLastDetected] = useState<Gesture>(Gesture.None);

  const drawLandmarks = (ctx: CanvasRenderingContext2D, landmarks: any[]) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Style
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#00f0ff'; // Cyan neon
    ctx.fillStyle = '#ff00aa'; // Pink neon

    // Draw connections
    for (const [start, end] of HAND_CONNECTIONS) {
      const p1 = landmarks[start];
      const p2 = landmarks[end];
      ctx.beginPath();
      ctx.moveTo(p1.x * ctx.canvas.width, p1.y * ctx.canvas.height);
      ctx.lineTo(p2.x * ctx.canvas.width, p2.y * ctx.canvas.height);
      ctx.stroke();
    }

    // Draw points
    for (const point of landmarks) {
      ctx.beginPath();
      ctx.arc(point.x * ctx.canvas.width, point.y * ctx.canvas.height, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  const loop = () => {
    if (videoRef.current && videoRef.current.readyState === 4) {
      const video = videoRef.current;
      const { gesture, landmarks } = recognizeGesture(video);

      // Only visualize if we found a hand
      if (landmarks && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
           // Match canvas size to video size
           if (canvasRef.current.width !== video.videoWidth) {
              canvasRef.current.width = video.videoWidth;
              canvasRef.current.height = video.videoHeight;
           }
           drawLandmarks(ctx, landmarks);
        }
      } else if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }

      // If we are in the detecting phase, update the parent
      if (gameState === GameState.Detecting) {
        // Simple debouncing/state update just for visualization
        setLastDetected(gesture);
        onGestureDetected(gesture); 
      } else {
        setLastDetected(Gesture.None);
      }
    }
    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    };

    startCamera();
    requestRef.current = requestAnimationFrame(loop);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      // Stop tracks
      if (videoRef.current && videoRef.current.srcObject) {
         const stream = videoRef.current.srcObject as MediaStream;
         stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]); // Re-bind loop if needed, though primarily runs continuously

  return (
    <div className="relative w-full max-w-[640px] aspect-[4/3] rounded-2xl overflow-hidden border-4 border-slate-700 shadow-2xl bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute top-0 left-0 w-full h-full object-cover"
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none"
      />
      
      {gameState === GameState.Detecting && (
        <div className="absolute bottom-4 right-4 bg-black/70 px-4 py-2 rounded-lg backdrop-blur-md border border-white/10">
          <p className="text-sm text-gray-300 uppercase tracking-wider font-bold">Detectando:</p>
          <p className={`text-xl font-bold ${lastDetected === Gesture.Unknown ? 'text-yellow-500' : 'text-green-400'}`}>
            {lastDetected}
          </p>
        </div>
      )}
    </div>
  );
};