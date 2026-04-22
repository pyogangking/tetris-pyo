'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTetris } from './useTetris';
import { TETROMINOS, COLS, ROWS, TetrominoType, COLORS } from './constants';

const GAS_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || ''; 

const Block = ({ color, ghost, className }: { color: string; ghost?: boolean; className?: string }) => (
  <div
    className={`w-full aspect-square border-[1px] border-white/5 rounded-[1px] transition-all duration-100 ${
      ghost ? `${color.split(' ')[0]} opacity-10 border-dashed border-white/20` : color
    } ${className}`}
  />
);

const PreviewPiece = ({ type, colorClass }: { type: TetrominoType | null, colorClass: string }) => {
  if (!type) return <div className="grid grid-cols-4 grid-rows-4 gap-[2px] w-20 h-20" />;
  const piece = TETROMINOS[type as TetrominoType];
  return (
    <div className="flex items-center justify-center w-20 h-20">
      <div 
        className="grid gap-[2px]"
        style={{ 
          gridTemplateColumns: `repeat(${piece.shape[0].length}, 1fr)`,
        }}
      >
        {piece.shape.map((row, y) =>
          row.map((cell, x) => (
            <div key={`${y}-${x}`} className="w-4 h-4">
              {cell !== 0 && (
                <div className={`w-full h-full rounded-[1px] ${colorClass}`} />
              )}
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

const CyberBox = ({ title, children, colorClass = 'border-[#00E5FF]' }: { title: string; children: React.ReactNode; colorClass?: string }) => (
  <div className={`relative p-4 bg-black/40 border-l-2 ${colorClass} backdrop-blur-sm shadow-[0_0_20px_rgba(0,0,0,0.3)]`}>
    <div className="absolute top-0 left-0 bg-black px-2 py-[2px] -translate-y-1/2 text-[10px] font-black tracking-widest text-zinc-500 uppercase">
      {title}
    </div>
    {children}
  </div>
);

const RetroSun = () => (
  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[40%] w-[500px] h-[500px] rounded-full overflow-hidden z-0 shadow-[0_0_80px_rgba(255,0,127,0.3)]">
    <div className="absolute inset-0 bg-gradient-to-b from-[#FFFB00] via-[#FF007F] to-[#7000FF]" />
    <div 
      className="absolute inset-0"
      style={{
        background: `repeating-linear-gradient(
          to bottom,
          transparent,
          transparent 20px,
          #050508 20px,
          #050508 24px
        )`,
        backgroundSize: '100% 100px',
        animation: 'sun-lines 10s linear infinite'
      }}
    />
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#050508] opacity-80" />
  </div>
);

const CitySkyline = () => (
  <div className="absolute bottom-[20%] left-0 w-full h-40 z-0 flex items-end justify-around opacity-30 pointer-events-none">
    {[...Array(20)].map((_, i) => {
      const height = Math.random() * 100 + 40;
      const width = Math.random() * 40 + 20;
      return (
        <div 
          key={i} 
          className="bg-[#050508] border-t border-x border-[#FF007F]/20 relative"
          style={{ height: `${height}px`, width: `${width}px` }}
        >
          <div className="absolute inset-0 grid grid-cols-2 gap-1 p-2 opacity-20">
            {[...Array(6)].map((_, j) => (
              <div key={j} className="bg-[#FFFB00] h-1 w-full" style={{ opacity: Math.random() }} />
            ))}
          </div>
        </div>
      );
    })}
  </div>
);

const GridFloor = () => (
  <div className="absolute bottom-0 left-0 w-full h-[40%] z-0 perspective-[500px] overflow-hidden pointer-events-none">
    <div 
      className="absolute inset-0 origin-top"
      style={{
        transform: 'rotateX(60deg)',
        background: `
          linear-gradient(to bottom, transparent, #050508 80%),
          linear-gradient(to right, rgba(0, 229, 255, 0.2) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0, 229, 255, 0.2) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 40px 40px, 40px 40px',
        animation: 'grid-move 4s linear infinite'
      }}
    />
  </div>
);

const BackgroundPiece = ({ type, delay, duration, left, size }: { type: TetrominoType, delay: number, duration: number, left: string, size: number }) => {
  const piece = TETROMINOS[type];
  return (
    <div 
      className="absolute pointer-events-none select-none z-0"
      style={{
        left,
        top: '-150px',
        animation: `falling ${duration}s linear ${delay}s infinite`,
        transform: `scale(${size})`,
      }}
    >
      <div 
        className="grid gap-[2px] opacity-15 blur-[0.5px]"
        style={{ 
          gridTemplateColumns: `repeat(${piece.shape[0].length}, 1fr)`,
        }}
      >
        {piece.shape.map((row, y) =>
          row.map((cell, x) => (
            <div key={`${y}-${x}`} className="w-5 h-5 relative">
              {cell !== 0 && (
                <div className={`absolute inset-0 rounded-[1px] ${piece.color}`} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default function TetrisGame() {
  const [userName, setUserName] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

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
  } = useTetris();

  const fetchLeaderboard = useCallback(async () => {
    if (!GAS_URL || !GAS_URL.startsWith('http')) return;
    try {
      const response = await fetch(GAS_URL, { 
        method: 'GET',
        cache: 'no-store' 
      });
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.warn('리더보드 로딩 실패');
    }
  }, []);

  const saveScore = useCallback(async () => {
    if (isSaved || !userName || !GAS_URL) return;
    setIsLoading(true);
    
    try {
      const saveUrl = `${GAS_URL}?action=save&name=${encodeURIComponent(userName)}&time=${elapsedTime}`;
      
      await fetch(saveUrl, { 
        method: 'GET',
        mode: 'no-cors' 
      });
      
      console.log("기록 저장 요청 완료(GET)");
      setIsSaved(true);
      setTimeout(fetchLeaderboard, 1500); 
    } catch (error) {
      console.error('저장 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userName, elapsedTime, isSaved, fetchLeaderboard]);

  useEffect(() => {
    setIsMounted(true);
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  useEffect(() => {
    if (gameState === 'finished' && !isSaved) {
      saveScore();
    }
  }, [gameState, isSaved, saveScore]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (gameState === 'idle' || gameState === 'gameOver' || gameState === 'finished') {
        if (e.key === 'Enter' && userName.trim()) handleStart();
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
        case 'ArrowLeft': moveLeft(); break;
        case 'ArrowRight': moveRight(); break;
        case 'ArrowDown': moveDown(); break;
        case 'ArrowUp': rotate(); break;
        case ' ': e.preventDefault(); hardDrop(); break;
        case 'c': case 'C': case 'Shift': hold(); break;
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

  if (!isMounted) return <div className="min-h-screen bg-[#050508]" />;

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100 flex flex-col items-center justify-center font-mono overflow-hidden p-4 relative">
      <style jsx global>{`
        @keyframes falling {
          0% { transform: translateY(-150px); opacity: 0; }
          10% { opacity: 0.2; }
          90% { opacity: 0.2; }
          100% { transform: translateY(120vh); opacity: 0; }
        }
        @keyframes grid-move {
          0% { background-position: 0 0; }
          100% { background-position: 0 40px; }
        }
        @keyframes sun-lines {
          0% { background-position: 0 0; }
          100% { background-position: 0 100px; }
        }
      `}</style>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <RetroSun />
        <CitySkyline />
        <GridFloor />
        
        <BackgroundPiece type="I" delay={0} duration={12} left="10%" size={1.2} />
        <BackgroundPiece type="T" delay={3} duration={15} left="30%" size={0.8} />
        <BackgroundPiece type="L" delay={6} duration={10} left="50%" size={1.5} />
        <BackgroundPiece type="S" delay={9} duration={18} left="70%" size={1} />
        <BackgroundPiece type="O" delay={12} duration={14} left="90%" size={1.3} />
        <BackgroundPiece type="J" delay={5} duration={11} left="20%" size={0.9} />
        <BackgroundPiece type="Z" delay={8} duration={16} left="80%" size={1.1} />
        
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#050508] z-0" />
      </div>

      <div className="absolute top-4 left-6 flex items-center gap-2 z-20">
        <div className="w-3 h-3 bg-[#FF007F] shadow-[0_0_8px_#FF007F] rounded-sm" />
        <span className="text-sm font-black italic tracking-widest text-[#FF007F]">NEON_TETRIS_V1.2_RETRO_EDITION</span>
      </div>

      {gameState === 'idle' ? (
        <div className="z-10 flex flex-col items-center gap-10 p-12 bg-[#0A0A0F]/85 border border-white/10 rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-md max-w-md w-full relative">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#FF007F] text-black font-black text-xs tracking-widest">SYSTEM_INIT</div>
          
          <div className="text-center">
            <h1 className="text-7xl font-black mb-4 tracking-tighter text-[#00E5FF] drop-shadow-[0_0_20px_rgba(0,229,255,0.8)] italic">
              TETRIS
            </h1>
            <p className="text-[#FF007F] text-[10px] font-bold tracking-[0.4em] uppercase animate-pulse">3줄을 제거하면 승리합니다!</p>
          </div>
          
          <div className="w-full flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1 h-3 bg-[#FF007F]" /> 플레이어 이름
              </label>
              <input 
                type="text" 
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="OPERATOR_NAME"
                className="w-full px-6 py-4 bg-black/60 border border-white/10 rounded-sm focus:outline-none focus:border-[#00E5FF] transition-all text-lg font-bold text-[#00E5FF] placeholder:text-zinc-800"
              />
            </div>
            
            <button 
              onClick={handleStart}
              disabled={!userName.trim()}
              className="w-full py-5 bg-[#FF007F] text-black font-black hover:bg-[#ff1a8c] transition-all active:scale-[0.98] disabled:opacity-30 text-xl tracking-widest flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(255,0,127,0.4)]"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              미션 시작
            </button>
          </div>

          <div className="w-full border-t border-white/5 pt-6">
            <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-4 text-center flex items-center justify-center gap-3">
              <span className="h-[1px] flex-1 bg-white/5" /> 최고 기록 Top 3 <span className="h-[1px] flex-1 bg-white/5" />
            </h3>
            <div className="flex flex-col gap-2">
              {leaderboard.length > 0 ? (
                leaderboard.slice(0, 3).map((entry, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-black ${i === 0 ? 'text-[#FFFB00]' : 'text-zinc-500'}`}>0{i + 1}</span>
                      <span className="font-bold text-sm text-zinc-300">{entry.name}</span>
                    </div>
                    <span className="font-mono text-[#00E5FF] font-bold">{formatTime(entry.time)}</span>
                  </div>
                ))
              ) : (
                <p className="text-center text-[10px] text-zinc-700 py-2 italic opacity-50">기록이 없습니다</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start max-w-6xl w-full justify-center">
          <div className="flex flex-col gap-6 w-36">
            <CyberBox title="순위" colorClass="border-[#FFFB00]">
              <div className="flex flex-col gap-2 py-1">
                {leaderboard.slice(0, 3).map((entry, i) => (
                  <div key={i} className="text-center border-b border-white/5 pb-1 last:border-0">
                    <div className="text-[8px] text-zinc-500 font-black">{i + 1}위</div>
                    <div className="text-[10px] font-bold truncate text-zinc-200">{entry.name}</div>
                    <div className="text-[10px] font-black text-[#00E5FF]">{formatTime(entry.time)}</div>
                  </div>
                ))}
                {leaderboard.length === 0 && <div className="text-[8px] text-zinc-700 text-center py-2">기록 없음</div>}
              </div>
            </CyberBox>
            <CyberBox title="시간">
              <div className="text-2xl font-black text-center text-white py-2">{formatTime(elapsedTime)}</div>
            </CyberBox>
            <div className="hidden md:block mt-auto p-4 border border-white/5 bg-black/20 backdrop-blur-sm">
              <h4 className="text-[9px] font-black text-zinc-600 mb-3 uppercase">조작법</h4>
              <div className="flex flex-col gap-2 text-[9px] text-zinc-500">
                <div className="flex justify-between"><span>이동</span><span>← →</span></div>
                <div className="flex justify-between"><span>회전</span><span>↑</span></div>
                <div className="flex justify-between"><span>강제낙하</span><span>SP</span></div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="p-[2px] bg-gradient-to-b from-[#FF007F]/30 to-[#00E5FF]/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-md">
              <div className="bg-[#050508]/90 p-1 border border-white/10">
                <div 
                  className="grid gap-[1px]"
                  style={{
                    gridTemplateColumns: `repeat(${COLS}, 1.6rem)`,
                    gridTemplateRows: `repeat(${ROWS}, 1.6rem)`,
                  }}
                >
                  {grid.map((row, y) =>
                    row.map((cell, x) => {
                      let color = cell;
                      let isGhost = false;
                      if (currentPiece) {
                        const py = y - currentPiece.pos.y;
                        const px = x - currentPiece.pos.x;
                        if (py >= 0 && py < currentPiece.shape.length && px >= 0 && px < currentPiece.shape[py].length && currentPiece.shape[py][px] !== 0) {
                          color = currentPiece.color;
                        }
                      }
                      if (!color && ghostPos && currentPiece) {
                        const py = y - ghostPos.y;
                        const px = x - ghostPos.x;
                        if (py >= 0 && py < currentPiece.shape.length && px >= 0 && px < currentPiece.shape[py].length && currentPiece.shape[py][px] !== 0) {
                          color = currentPiece.color;
                          isGhost = true;
                        }
                      }
                      return (
                        <div key={`${y}-${x}`} className="w-full h-full bg-[#0A0A0F]/80 border-[0.5px] border-white/5">
                          {color && <Block color={color} ghost={isGhost} />}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {gameState === 'paused' && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md border border-[#00E5FF]/20">
                <h2 className="text-4xl font-black mb-8 text-[#00E5FF] italic tracking-[0.2em] drop-shadow-[0_0_15px_#00E5FF]">PAUSED</h2>
                <button onClick={togglePause} className="px-12 py-4 bg-[#00E5FF] text-black font-black hover:bg-white transition-all shadow-[0_0_20px_#00E5FF]">
                  RESUME
                </button>
              </div>
            )}

            {(gameState === 'gameOver' || gameState === 'finished') && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl p-6 border border-[#FF007F]/40 shadow-[0_0_70px_rgba(255,0,127,0.4)]">
                <div className="text-[#FF007F] text-[10px] font-black tracking-[0.4em] mb-1 uppercase animate-pulse">SYSTEM_CRITICAL</div>
                <h2 className={`text-3xl font-black mb-5 italic ${gameState === 'finished' ? 'text-[#00FF66] drop-shadow-[0_0_15px_#00FF66]' : 'text-white'}`}>
                  {gameState === 'finished' ? '미션 성공' : '미션 실패'}
                </h2>
                <div className="grid grid-cols-2 gap-2 w-full max-w-[320px] mb-4">
                  <div className="p-2 bg-white/5 border-l-2 border-[#00E5FF] backdrop-blur-sm">
                    <div className="text-[9px] text-zinc-500 font-bold mb-0.5 uppercase">점수</div>
                    <div className="text-lg font-black font-mono">{score.toLocaleString()}</div>
                  </div>
                  <div className="p-2 bg-white/5 border-l-2 border-[#FF007F] backdrop-blur-sm">
                    <div className="text-[9px] text-zinc-500 font-bold mb-0.5 uppercase">시간</div>
                    <div className="text-lg font-black font-mono text-[#00E5FF]">{formatTime(elapsedTime)}</div>
                  </div>
                  <div className="p-2 bg-white/5 border-l-2 border-[#FFFB00] col-span-2 backdrop-blur-sm">
                    <div className="text-[9px] text-zinc-500 font-bold mb-0.5 uppercase">제거한 라인</div>
                    <div className="text-lg font-black font-mono flex items-center justify-between">
                      <span>{lines} / 3</span>
                      <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#FFFB00]" style={{ width: `${Math.min(100, (lines/3)*100)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="w-full max-w-[320px] border-t border-white/10 pt-3 mb-4">
                  <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span className="w-1 h-1 bg-[#00E5FF] rounded-full shadow-[0_0_5px_#00E5FF]" /> 명예의 전당 (TOP 3)
                  </h3>
                  <div className="flex flex-col gap-1">
                    {leaderboard.length > 0 ? (
                      leaderboard.slice(0, 3).map((entry, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-white/5 border border-white/5 rounded-sm backdrop-blur-sm">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black ${i === 0 ? 'text-[#FFFB00]' : 'text-zinc-500'}`}>0{i + 1}</span>
                            <span className="font-bold text-xs text-zinc-200 truncate max-w-[140px]">{entry.name}</span>
                          </div>
                          <span className="font-mono text-[#00E5FF] font-bold text-xs">{formatTime(entry.time)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[9px] text-zinc-600 text-center py-1 italic">데이터 로딩 중...</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full max-w-[320px]">
                  <button onClick={startGame} className="py-3 border border-[#00E5FF] text-[#00E5FF] text-[11px] font-black hover:bg-[#00E5FF] hover:text-black transition-all tracking-tighter shadow-[0_0_10px_rgba(0,229,255,0.2)]">
                    시스템 재시작
                  </button>
                  <button onClick={quitGame} className="py-3 border border-[#FF007F] text-[#FF007F] text-[11px] font-black hover:bg-[#FF007F] hover:text-black transition-all tracking-tighter shadow-[0_0_10px_rgba(255,0,127,0.2)]">
                    임무 종료
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6 w-48">
            <CyberBox title="플레이어" colorClass="border-[#7000FF]">
              <div className="text-lg font-black truncate text-[#7000FF] py-1">{userName || 'OPERATOR'}</div>
            </CyberBox>
            <CyberBox title="점수" colorClass="border-[#FFFB00]">
              <div className="text-2xl font-black font-mono text-center text-[#FFFB00] py-1">{score.toLocaleString()}</div>
            </CyberBox>
            <CyberBox title="진행 상황">
              <div className="flex items-end justify-between mb-2">
                <span className="text-[10px] font-black text-zinc-500">진행도</span>
                <span className="text-sm font-black text-[#00E5FF]">{lines} / 3</span>
              </div>
              <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-gradient-to-r from-[#FF007F] via-[#FFFB00] to-[#00E5FF] transition-all duration-700" style={{ width: `${(lines / 3) * 100}%` }} />
              </div>
            </CyberBox>
            <CyberBox title="다음">
              <div className="flex justify-center py-2">
                <PreviewPiece type={nextPiece} colorClass={nextPiece ? TETROMINOS[nextPiece].color : ''} />
              </div>
            </CyberBox>
            <div className="flex flex-col gap-2 mt-2">
              <button onClick={togglePause} className="w-full py-3 bg-white/5 hover:bg-white/10 text-xs font-black tracking-widest border border-white/10 transition-all uppercase backdrop-blur-sm">
                {gameState === 'playing' ? '일시정지 (P)' : '계속하기'}
              </button>
              <button onClick={startGame} className="w-full py-3 bg-white/5 hover:bg-white/10 text-xs font-black tracking-widest border border-white/10 transition-all uppercase backdrop-blur-sm">
                다시 시작 (R)
              </button>
              <button onClick={quitGame} className="w-full py-3 bg-[#FF007F]/10 hover:bg-[#FF007F]/20 text-[#FF007F] text-xs font-black tracking-widest border border-[#FF007F]/20 transition-all uppercase backdrop-blur-sm">
                게임 종료
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-16 text-center z-20 relative">
        <div className="flex flex-col gap-3 items-center group">
          <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.5em] drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] transition-all group-hover:text-white">
            AI 코딩을 활용한 창의적인 앱 개발
          </p>
          <div className="flex items-center gap-4 bg-black/40 px-8 py-2.5 border border-white/10 backdrop-blur-md rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all group-hover:border-[#FF007F]/40 group-hover:shadow-[0_0_30px_rgba(255,0,127,0.2)]">
            <span className="text-[13px] font-bold text-[#00E5FF] tracking-widest">도시공학과</span>
            <div className="w-1 h-1 bg-[#FF007F] rounded-full shadow-[0_0_8px_#FF007F]" />
            <span className="text-[15px] font-black text-white tracking-[0.3em] italic">표강현</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
