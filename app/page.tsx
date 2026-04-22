'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTetris } from './useTetris';
import { TETROMINOS, COLS, ROWS, TetrominoType } from './constants';

// Replace with your actual Google Apps Script URL
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyvWj2jK0jH2jK0jH2jK0jH2jK0jH2jK0jH2jK0jH2jK0jH2jK/exec'; // Placeholder

const Block = ({ color, ghost, className }: { color: string; ghost?: boolean; className?: string }) => (
  <div
    className={`w-full aspect-square border-[1px] border-white/10 rounded-[2px] transition-all duration-100 ${
      ghost ? `${color} opacity-20 border-dashed` : color
    } ${className}`}
    style={{
      boxShadow: !ghost ? 'inset 0 0 8px rgba(255,255,255,0.2)' : 'none',
    }}
  />
);

const PreviewPiece = ({ type }: { type: TetrominoType | null }) => {
  if (!type) return <div className="grid grid-cols-4 grid-rows-4 gap-1 w-24 h-24" />;
  const piece = TETROMINOS[type];
  return (
    <div className="flex items-center justify-center w-24 h-24 bg-zinc-900/50 rounded-xl border border-white/5 p-2 backdrop-blur-sm">
      <div 
        className="grid gap-1"
        style={{ 
          gridTemplateColumns: `repeat(${piece.shape[0].length}, 1fr)`,
        }}
      >
        {piece.shape.map((row, y) =>
          row.map((cell, x) => (
            <div key={`${y}-${x}`} className="w-4 h-4">
              {cell !== 0 && <Block color={piece.color} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

interface LeaderboardEntry {
  name: string;
  time: number;
}

export default function TetrisGame() {
  const [userName, setUserName] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const {
    grid,
    currentPiece,
    nextPiece,
    holdPiece,
    score,
    level,
    lines,
    gameState,
    elapsedTime,
    ghostPos,
    startGame,
    togglePause,
    quitGame,
    moveLeft,
    moveRight,
    moveDown,
    hardDrop,
    rotate,
    hold,
    setGameState,
  } = useTetris();

  const isUrlConfigured = GAS_URL && !GAS_URL.includes('AKfycbyvWj2jK');

  const fetchLeaderboard = useCallback(async () => {
    if (!isUrlConfigured) {
      console.warn('Leaderboard GAS_URL is not configured. Skipping fetch.');
      return;
    }
    try {
      const response = await fetch(GAS_URL);
      const data = await response.json();
      setLeaderboard(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  }, [isUrlConfigured]);

  const saveScore = useCallback(async () => {
    if (isSaved || !userName || !isUrlConfigured) return;
    setIsLoading(true);
    try {
      await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ name: userName, time: elapsedTime }),
      });
      setIsSaved(true);
      fetchLeaderboard();
    } catch (error) {
      console.error('Failed to save score:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userName, elapsedTime, isSaved, fetchLeaderboard, isUrlConfigured]);

  useEffect(() => {
    if (gameState === 'finished') {
      saveScore();
    }
  }, [gameState, saveScore]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (gameState === 'idle' || gameState === 'gameOver' || gameState === 'finished') {
        if (e.key === 'Enter' && userName.trim()) startGame();
        return;
      }

      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        togglePause();
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        startGame();
        return;
      }

      if (gameState !== 'playing') return;

      switch (e.key) {
        case 'ArrowLeft':
          moveLeft();
          break;
        case 'ArrowRight':
          moveRight();
          break;
        case 'ArrowDown':
          moveDown();
          break;
        case 'ArrowUp':
          rotate();
          break;
        case ' ':
          e.preventDefault();
          hardDrop();
          break;
        case 'c':
        case 'C':
        case 'Shift':
          hold();
          break;
      }
    },
    [gameState, userName, startGame, togglePause, moveLeft, moveRight, moveDown, rotate, hardDrop, hold]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleStart = () => {
    if (userName.trim()) {
      setIsSaved(false);
      startGame();
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center font-sans overflow-hidden p-4 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      </div>

      {gameState === 'idle' ? (
        <div className="z-10 flex flex-col items-center gap-8 p-12 bg-zinc-900/40 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-500 max-w-md w-full">
          <div className="text-center">
            <h1 className="text-5xl font-black mb-2 tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-500">TETRIS</h1>
            <p className="text-zinc-500 text-sm font-medium">Clear 3 lines to win!</p>
          </div>
          
          <div className="w-full flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Player Name</label>
              <input 
                type="text" 
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-6 py-4 bg-black/40 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-lg font-bold"
              />
            </div>
            
            <button 
              onClick={handleStart}
              disabled={!userName.trim()}
              className="w-full py-5 bg-white text-black font-black rounded-2xl hover:scale-[1.02] transition-transform active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 text-xl"
            >
              START MISSION
            </button>
          </div>

          <div className="w-full pt-6 border-t border-white/5">
            <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-4 text-center">Top 3 Records</h3>
            <div className="flex flex-col gap-2">
              {leaderboard.length > 0 ? (
                leaderboard.slice(0, 3).map((entry, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold ${i === 0 ? 'bg-yellow-500 text-black' : 'bg-zinc-800'}`}>
                        {i + 1}
                      </span>
                      <span className="font-bold text-sm">{entry.name}</span>
                    </div>
                    <span className="font-mono text-cyan-400 font-bold">{formatTime(entry.time)}</span>
                  </div>
                ))
              ) : (
                <p className="text-center text-xs text-zinc-600 py-2">No records yet</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start max-w-6xl w-full justify-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Left Side: Hold & Timer */}
          <div className="hidden lg:flex flex-col gap-6 w-32">
            <div className="p-4 bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 text-center">Hold</h3>
              <div className="flex justify-center"><PreviewPiece type={holdPiece} /></div>
            </div>
            <div className="p-4 bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 text-center">Time</h3>
              <div className="text-xl font-black font-mono text-center text-white">{formatTime(elapsedTime)}</div>
            </div>
          </div>

          {/* Center: Game Board */}
          <div className="relative group">
            <div className="p-2 bg-zinc-900/60 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
              <div 
                className="grid gap-[1px] bg-white/5 border border-white/5"
                style={{
                  gridTemplateColumns: `repeat(${COLS}, 1.75rem)`,
                  gridTemplateRows: `repeat(${ROWS}, 1.75rem)`,
                }}
              >
                {grid.map((row, y) =>
                  row.map((cell, x) => {
                    let color = cell;
                    let isGhost = false;

                    if (currentPiece) {
                      const py = y - currentPiece.pos.y;
                      const px = x - currentPiece.pos.x;
                      if (
                        py >= 0 && py < currentPiece.shape.length &&
                        px >= 0 && px < currentPiece.shape[py].length &&
                        currentPiece.shape[py][px] !== 0
                      ) {
                        color = currentPiece.color;
                      }
                    }

                    if (!color && ghostPos && currentPiece) {
                      const py = y - ghostPos.y;
                      const px = x - ghostPos.x;
                      if (
                        py >= 0 && py < currentPiece.shape.length &&
                        px >= 0 && px < currentPiece.shape[py].length &&
                        currentPiece.shape[py][px] !== 0
                      ) {
                        color = currentPiece.color;
                        isGhost = true;
                      }
                    }

                    return (
                      <div key={`${y}-${x}`} className="w-full h-full bg-zinc-950/30">
                        {color && <Block color={color} ghost={isGhost} />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Overlays */}
            {gameState === 'paused' && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl">
                <h2 className="text-2xl font-bold mb-6">PAUSED</h2>
                <button 
                  onClick={togglePause}
                  className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform"
                >
                  RESUME
                </button>
              </div>
            )}

            {gameState === 'gameOver' && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-red-950/80 backdrop-blur-md rounded-2xl animate-in zoom-in duration-300">
                <h2 className="text-3xl font-black mb-2 text-white">MISSION FAILED</h2>
                <div className="text-xl font-bold mb-6 text-red-200">Blocks reached the top</div>
                <button 
                  onClick={startGame}
                  className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform"
                >
                  RETRY
                </button>
              </div>
            )}

            {gameState === 'finished' && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-green-950/90 backdrop-blur-md rounded-2xl animate-in zoom-in duration-300 p-8 text-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4 animate-bounce">
                  <svg className="w-8 h-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-3xl font-black mb-1 text-white uppercase tracking-tighter">Mission Complete</h2>
                <p className="text-green-300 text-sm mb-6">You've cleared 3 lines!</p>
                
                <div className="bg-black/40 p-6 rounded-2xl border border-white/10 w-full mb-8">
                  <div className="text-xs font-bold text-zinc-500 uppercase mb-1">Final Time</div>
                  <div className="text-4xl font-black font-mono text-cyan-400">{formatTime(elapsedTime)}</div>
                </div>

                <button 
                  onClick={quitGame}
                  className="w-full py-4 bg-white text-black font-bold rounded-xl hover:scale-[1.02] transition-transform active:scale-[0.98]"
                >
                  MAIN MENU
                </button>
              </div>
            )}
          </div>

          {/* Right Side: Stats & Controls */}
          <div className="flex flex-col gap-6 w-full md:w-48">
            <div className="p-6 bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Player</h3>
              <div className="text-xl font-black truncate text-purple-400">{userName || 'Anonymous'}</div>
            </div>

            <div className="p-6 bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl flex flex-col gap-6">
              <div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Progress (Lines)</div>
                <div className="flex items-end gap-2">
                  <div className="text-3xl font-black font-mono text-cyan-400">{lines}</div>
                  <div className="text-sm text-zinc-500 mb-1">/ 3</div>
                </div>
                <div className="w-full h-1 bg-zinc-800 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="h-full bg-cyan-500 transition-all duration-500"
                    style={{ width: `${(lines / 3) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Next Piece</div>
                <div className="flex justify-center mt-2">
                  <PreviewPiece type={nextPiece} />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button 
                onClick={togglePause}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold text-sm transition-colors border border-white/5"
              >
                {gameState === 'playing' ? 'Pause (P)' : 'Resume'}
              </button>
              <button 
                onClick={startGame}
                className="w-full py-3 bg-zinc-900/50 hover:bg-zinc-800 rounded-xl font-bold text-sm transition-colors border border-white/5"
              >
                Restart (R)
              </button>
              <button 
                onClick={quitGame}
                className="w-full py-3 bg-zinc-900/50 hover:bg-red-900/20 rounded-xl font-bold text-sm transition-colors border border-white/5 text-zinc-500 hover:text-red-400"
              >
                Quit Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Footer */}
      <footer className="mt-12 text-center z-10 animate-in fade-in duration-1000 delay-500">
        <div className="flex flex-col gap-1 items-center">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">AI코딩을활용한창의적인앱개발</p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400">도시공학과</span>
            <span className="w-1 h-1 bg-zinc-800 rounded-full" />
            <span className="text-xs font-bold text-zinc-400 tracking-widest">표강현</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
