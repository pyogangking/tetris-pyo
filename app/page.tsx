'use client';

import { useEffect, useCallback } from 'react';
import { useTetris } from './useTetris';
import { TETROMINOS, COLS, ROWS, TetrominoType } from './constants';

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

export default function TetrisGame() {
  const {
    grid,
    currentPiece,
    nextPiece,
    holdPiece,
    score,
    level,
    lines,
    gameState,
    ghostPos,
    startGame,
    togglePause,
    moveLeft,
    moveRight,
    moveDown,
    hardDrop,
    rotate,
    hold,
    setGameState,
  } = useTetris();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (gameState === 'idle' || gameState === 'gameOver') {
        if (e.key === 'Enter') startGame();
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
    [gameState, startGame, togglePause, moveLeft, moveRight, moveDown, rotate, hardDrop, hold]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center font-sans overflow-hidden p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start max-w-6xl w-full justify-center">
        {/* Left Side: Hold */}
        <div className="hidden lg:flex flex-col gap-4">
          <div className="p-4 bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 text-center">Hold</h3>
            <PreviewPiece type={holdPiece} />
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

                  // Render current piece
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

                  // Render ghost piece
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
          {gameState === 'idle' && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl animate-in fade-in duration-500">
              <h2 className="text-4xl font-black mb-6 tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-500">TETRIS</h2>
              <button 
                onClick={startGame}
                className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform active:scale-95"
              >
                START GAME
              </button>
              <p className="mt-4 text-xs text-zinc-500">Press ENTER to Start</p>
            </div>
          )}

          {gameState === 'paused' && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl">
              <h2 className="text-2xl font-bold mb-6">PAUSED</h2>
              <button 
                onClick={togglePause}
                className="px-8 py-3 bg-zinc-800 text-white font-bold rounded-full hover:bg-zinc-700 transition-colors"
              >
                RESUME
              </button>
            </div>
          )}

          {gameState === 'gameOver' && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-red-950/80 backdrop-blur-md rounded-2xl animate-in zoom-in duration-300">
              <h2 className="text-3xl font-black mb-2 text-white">GAME OVER</h2>
              <div className="text-xl font-bold mb-6 text-red-200">Score: {score}</div>
              <button 
                onClick={startGame}
                className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform"
              >
                TRY AGAIN
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Stats & Next */}
        <div className="flex flex-col gap-6 w-full md:w-48">
          <div className="p-6 bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Next Piece</h3>
            <div className="flex justify-center">
              <PreviewPiece type={nextPiece} />
            </div>
          </div>

          <div className="p-6 bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl flex flex-col gap-6">
            <div>
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Score</div>
              <div className="text-3xl font-black font-mono text-cyan-400">{score.toLocaleString()}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Level</div>
                <div className="text-xl font-bold">{level}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Lines</div>
                <div className="text-xl font-bold">{lines}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button 
              onClick={gameState === 'playing' ? togglePause : gameState === 'paused' ? togglePause : startGame}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold text-sm transition-colors border border-white/5"
            >
              {gameState === 'playing' ? 'Pause (P)' : gameState === 'paused' ? 'Resume' : 'Start'}
            </button>
            <button 
              onClick={startGame}
              className="w-full py-3 bg-zinc-900/50 hover:bg-red-900/20 rounded-xl font-bold text-sm transition-colors border border-white/5 text-zinc-400 hover:text-red-400"
            >
              Reset (R)
            </button>
          </div>

          {/* Controls Help */}
          <div className="p-4 bg-zinc-900/20 rounded-2xl border border-white/5 mt-auto">
            <h4 className="text-[10px] font-bold text-zinc-600 uppercase mb-3">Controls</h4>
            <div className="flex flex-col gap-2 text-[10px] text-zinc-400 font-medium">
              <div className="flex justify-between"><span>Move</span><span>← →</span></div>
              <div className="flex justify-between"><span>Rotate</span><span>↑</span></div>
              <div className="flex justify-between"><span>Soft Drop</span><span>↓</span></div>
              <div className="flex justify-between"><span>Hard Drop</span><span>Space</span></div>
              <div className="flex justify-between"><span>Hold</span><span>C / Shift</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
