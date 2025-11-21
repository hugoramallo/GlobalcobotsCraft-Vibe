import React, { useEffect, useState, useCallback } from 'react';
import { CameraView } from './components/CameraView';
import { initializeGestureRecognizer } from './services/mediapipeService';
import { generateCommentary } from './services/geminiService';
import { GameState, Gesture, Winner, GameResult } from './types';
import { Trophy, RefreshCw, Cpu, User, Zap } from 'lucide-react';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.Loading);
  const [currentGesture, setCurrentGesture] = useState<Gesture>(Gesture.None);
  const [score, setScore] = useState({ user: 0, cpu: 0 });
  const [countdown, setCountdown] = useState(3);
  const [result, setResult] = useState<GameResult | null>(null);
  const [commentary, setCommentary] = useState<string>("");
  const [loadingCommentary, setLoadingCommentary] = useState(false);

  // Initialize AI Model
  useEffect(() => {
    const init = async () => {
      await initializeGestureRecognizer();
      setGameState(GameState.Idle);
    };
    init();
  }, []);

  const startGame = () => {
    setResult(null);
    setCommentary("");
    setCountdown(3);
    setGameState(GameState.Countdown);
  };

  // Countdown Logic
  useEffect(() => {
    if (gameState === GameState.Countdown) {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setGameState(GameState.Detecting);
      }
    }
  }, [gameState, countdown]);

  // Detection Phase Logic
  useEffect(() => {
    if (gameState === GameState.Detecting) {
      // Give the user a moment to hold the pose, then capture
      const timer = setTimeout(() => {
        handleGameConclusion();
      }, 1500); // 1.5 seconds to hold pose
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  // Real-time gesture update from CameraView
  const handleGestureUpdate = useCallback((gesture: Gesture) => {
    setCurrentGesture(gesture);
  }, []);

  const handleGameConclusion = async () => {
    // Determine CPU move
    const moves = [Gesture.Rock, Gesture.Paper, Gesture.Scissors];
    const cpuMove = moves[Math.floor(Math.random() * moves.length)];
    
    // Determine Winner
    let gameWinner = Winner.None;
    const userMove = currentGesture;

    if (userMove === Gesture.None || userMove === Gesture.Unknown) {
      // If user didn't show anything valid, CPU wins by default or void? Let's count as loss or retry.
      // For this game, if unknown, we'll treat it as a foul/loss to keep flow moving or just show Unknown.
      // Let's treat it as None -> No score change but show result.
      gameWinner = Winner.None;
    } else if (userMove === cpuMove) {
      gameWinner = Winner.Draw;
    } else if (
      (userMove === Gesture.Rock && cpuMove === Gesture.Scissors) ||
      (userMove === Gesture.Paper && cpuMove === Gesture.Rock) ||
      (userMove === Gesture.Scissors && cpuMove === Gesture.Paper)
    ) {
      gameWinner = Winner.User;
      setScore(prev => ({ ...prev, user: prev.user + 1 }));
    } else {
      gameWinner = Winner.Cpu;
      setScore(prev => ({ ...prev, cpu: prev.cpu + 1 }));
    }

    const newResult: GameResult = {
      userGesture: userMove,
      cpuGesture: cpuMove,
      winner: gameWinner,
      timestamp: Date.now()
    };

    setResult(newResult);
    setGameState(GameState.Result);

    // Fetch commentary
    if (userMove !== Gesture.None && userMove !== Gesture.Unknown) {
      setLoadingCommentary(true);
      const comment = await generateCommentary(newResult);
      setCommentary(comment);
      setLoadingCommentary(false);
    } else {
        setCommentary("¡No vi ninguna mano! Intenta de nuevo.");
    }
  };

  const getGestureEmoji = (g: Gesture) => {
    switch (g) {
      case Gesture.Rock: return '✊';
      case Gesture.Paper: return '✋';
      case Gesture.Scissors: return '✌️';
      default: return '❓';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center p-4 sm:p-8">
      {/* Header */}
      <header className="w-full max-w-4xl flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
            <Zap className="w-8 h-8 text-yellow-400" />
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
            RPS Battle AI
            </h1>
        </div>
        
        {/* Score Board */}
        <div className="flex items-center gap-8 bg-slate-800 px-6 py-3 rounded-full border border-slate-700 shadow-lg">
          <div className="flex flex-col items-center">
            <span className="text-xs text-slate-400 uppercase font-bold flex items-center gap-1"><User size={12}/> Tú</span>
            <span className="text-2xl font-mono font-bold text-blue-400">{score.user}</span>
          </div>
          <span className="text-slate-600 font-bold">:</span>
          <div className="flex flex-col items-center">
            <span className="text-xs text-slate-400 uppercase font-bold flex items-center gap-1"><Cpu size={12}/> CPU</span>
            <span className="text-2xl font-mono font-bold text-red-400">{score.cpu}</span>
          </div>
        </div>
      </header>

      <main className="w-full max-w-4xl flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Left Column: Game Area */}
        <div className="flex-1 w-full flex flex-col items-center">
          <div className="relative w-full max-w-[640px]">
            {gameState === GameState.Loading ? (
              <div className="w-full aspect-[4/3] bg-slate-800 rounded-2xl flex flex-col items-center justify-center animate-pulse border-4 border-slate-700">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-400 font-medium">Cargando Modelos de Visión...</p>
              </div>
            ) : (
              <CameraView 
                gameState={gameState} 
                onGestureDetected={handleGestureUpdate} 
              />
            )}

            {/* Overlays */}
            {gameState === GameState.Countdown && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-2xl z-10">
                <span className="text-9xl font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.5)] animate-bounce">
                  {countdown}
                </span>
              </div>
            )}

            {gameState === GameState.Detecting && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-6 py-2 rounded-full font-bold animate-pulse shadow-lg z-10">
                ¡HAZ TU GESTO AHORA!
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="mt-8 flex gap-4">
            {(gameState === GameState.Idle || gameState === GameState.Result) && (
              <button
                onClick={startGame}
                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl font-bold text-lg shadow-xl transition-all hover:scale-105 active:scale-95"
              >
                {gameState === GameState.Result ? <RefreshCw className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                {gameState === GameState.Result ? 'Jugar de Nuevo' : 'Empezar Juego'}
              </button>
            )}
          </div>
          
          {gameState === GameState.Idle && (
            <p className="mt-4 text-slate-400 text-sm max-w-md text-center">
              Colócate frente a la cámara. Cuando empiece la cuenta regresiva, muestra tu mano con Piedra, Papel o Tijera.
            </p>
          )}
        </div>

        {/* Right Column: Results & Info */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          
          {/* Match Status Card */}
          {result && gameState === GameState.Result && (
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 shadow-xl animate-fade-in">
              <h2 className="text-center text-lg font-bold text-slate-300 mb-6 uppercase tracking-widest border-b border-slate-700 pb-2">Resultado</h2>
              
              <div className="flex justify-between items-center mb-8">
                <div className="flex flex-col items-center">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-2 ${result.winner === Winner.User ? 'bg-green-500/20 border-2 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'bg-slate-700'}`}>
                    {getGestureEmoji(result.userGesture)}
                  </div>
                  <span className="text-sm font-bold text-slate-300">TÚ</span>
                </div>

                <div className="text-2xl font-black text-slate-500">VS</div>

                <div className="flex flex-col items-center">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-2 ${result.winner === Winner.Cpu ? 'bg-red-500/20 border-2 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'bg-slate-700'}`}>
                    {getGestureEmoji(result.cpuGesture)}
                  </div>
                  <span className="text-sm font-bold text-slate-300">CPU</span>
                </div>
              </div>

              <div className="text-center mb-6">
                {result.winner === Winner.User && (
                   <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white font-bold rounded-lg shadow-lg animate-bounce">
                     <Trophy size={18} /> ¡GANASTE!
                   </span>
                )}
                {result.winner === Winner.Cpu && (
                   <span className="inline-block px-4 py-2 bg-red-500 text-white font-bold rounded-lg shadow-lg">
                     ¡PERDISTE!
                   </span>
                )}
                {result.winner === Winner.Draw && (
                   <span className="inline-block px-4 py-2 bg-yellow-500 text-black font-bold rounded-lg shadow-lg">
                     ¡EMPATE!
                   </span>
                )}
                 {result.winner === Winner.None && (
                   <span className="inline-block px-4 py-2 bg-gray-500 text-white font-bold rounded-lg shadow-lg">
                     NO DETECTADO
                   </span>
                )}
              </div>

              {/* Gemini Commentary Section */}
              <div className="bg-slate-900/80 rounded-xl p-4 border border-indigo-500/30 relative min-h-[80px] flex items-center justify-center">
                <div className="absolute -top-3 left-4 bg-indigo-600 text-xs px-2 py-1 rounded uppercase font-bold shadow-sm">
                    Comentarista AI
                </div>
                {loadingCommentary ? (
                    <div className="flex gap-1">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                ) : (
                    <p className="text-indigo-200 text-sm italic text-center leading-relaxed">
                        "{commentary}"
                    </p>
                )}
              </div>
            </div>
          )}

          {/* Instructions / Helper (Visible when no result) */}
          {(!result || gameState !== GameState.Result) && (
             <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700/50 h-full flex flex-col justify-center">
                <h3 className="text-slate-400 font-bold mb-4 uppercase text-xs tracking-wider">Gestos Soportados</h3>
                <div className="space-y-4">
                    <div className="flex items-center gap-4 p-2 rounded-lg bg-slate-800/50">
                        <span className="text-3xl">✊</span>
                        <div>
                            <p className="font-bold text-white">Piedra</p>
                            <p className="text-xs text-slate-400">Puño cerrado</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-2 rounded-lg bg-slate-800/50">
                        <span className="text-3xl">✋</span>
                        <div>
                            <p className="font-bold text-white">Papel</p>
                            <p className="text-xs text-slate-400">Mano abierta</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-2 rounded-lg bg-slate-800/50">
                        <span className="text-3xl">✌️</span>
                        <div>
                            <p className="font-bold text-white">Tijera</p>
                            <p className="text-xs text-slate-400">Signo de la paz</p>
                        </div>
                    </div>
                </div>
             </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;