'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { COLS, ROWS, TETROMINOS, TetrominoType, SCORES, INITIAL_DROP_SPEED, MIN_DROP_SPEED, SPEED_INCREMENT } from './constants';

type Grid = (string | null)[][];

interface Position {
  x: number;
  y: number;
}

interface Piece {
  type: TetrominoType;
  shape: number[][];
  color: string;
  pos: Position;
}

export const useTetris = () => {
  const [grid, setGrid] = useState<Grid>(
    Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  );
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [nextPiece, setNextPiece] = useState<TetrominoType | null>(null);
  
  useEffect(() => {
    const types = Object.keys(TETROMINOS) as TetrominoType[];
    setNextPiece(types[Math.floor(Math.random() * types.length)]);
  }, []);

  const [holdPiece, setHoldPiece] = useState<TetrominoType | null>(null);
  const [canHold, setCanHold] = useState(true);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'paused' | 'gameOver' | 'finished'>('idle');
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speed = Math.max(MIN_DROP_SPEED, INITIAL_DROP_SPEED - (level - 1) * SPEED_INCREMENT);

  const getRandomType = useCallback(() => {
    const types = Object.keys(TETROMINOS) as TetrominoType[];
    return types[Math.floor(Math.random() * types.length)];
  }, []);

  const checkCollision = useCallback((pos: Position, shape: number[][], currentGrid: Grid) => {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 0) {
          const newX = pos.x + x;
          const newY = pos.y + y;

          if (
            newX < 0 ||
            newX >= COLS ||
            newY >= ROWS ||
            (newY >= 0 && currentGrid[newY][newX] !== null)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }, []);

  const spawnPiece = useCallback(() => {
    const type = nextPiece || getRandomType();
    const tetromino = TETROMINOS[type as TetrominoType];
    const pos = { x: Math.floor(COLS / 2) - Math.floor(tetromino.shape[0].length / 2), y: 0 };

    if (checkCollision(pos, tetromino.shape, grid)) {
      setGameState('gameOver');
      return;
    }

    setCurrentPiece({
      type,
      shape: tetromino.shape,
      color: tetromino.color,
      pos,
    });
    setNextPiece(getRandomType());
    setCanHold(true);
  }, [nextPiece, getRandomType, grid, checkCollision]);

  const rotate = (shape: number[][]) => {
    const newShape = shape[0].map((_, i) => shape.map((row) => row[i]).reverse());
    return newShape;
  };

  const handleRotate = useCallback(() => {
    if (!currentPiece || gameState !== 'playing') return;
    const newShape = rotate(currentPiece.shape);
    if (!checkCollision(currentPiece.pos, newShape, grid)) {
      setCurrentPiece({ ...currentPiece, shape: newShape });
    }
  }, [currentPiece, gameState, checkCollision, grid]);

  const move = useCallback((dx: number, dy: number) => {
    if (!currentPiece || gameState !== 'playing') return false;
    const newPos = { x: currentPiece.pos.x + dx, y: currentPiece.pos.y + dy };
    if (!checkCollision(newPos, currentPiece.shape, grid)) {
      setCurrentPiece({ ...currentPiece, pos: newPos });
      return true;
    }
    return false;
  }, [currentPiece, gameState, checkCollision, grid]);

  const lockPiece = useCallback(() => {
    if (!currentPiece) return;

    // 1. Calculate new grid
    const newGrid = grid.map((row) => [...row]);
    currentPiece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          const gridY = currentPiece.pos.y + y;
          const gridX = currentPiece.pos.x + x;
          if (gridY >= 0 && gridY < ROWS && gridX >= 0 && gridX < COLS) {
            newGrid[gridY][gridX] = currentPiece.color;
          }
        }
      });
    });

    // 2. Count and clear lines
    let linesCleared = 0;
    const filteredGrid = newGrid.filter((row) => {
      const isFull = row.every((cell) => cell !== null);
      if (isFull) linesCleared++;
      return !isFull;
    });

    while (filteredGrid.length < ROWS) {
      filteredGrid.unshift(Array(COLS).fill(null));
    }

    // 3. Update all states OUTSIDE of setGrid to avoid StrictMode double-counting
    setGrid(filteredGrid);
    
    if (linesCleared > 0) {
      setScore((prev) => prev + linesCleared);
      setLines((prev) => {
        const newTotalLines = prev + linesCleared;
        if (newTotalLines >= 3) {
          setGameState('finished');
        }
        return newTotalLines;
      });
    }

    spawnPiece();
  }, [currentPiece, grid, spawnPiece]);

  const drop = useCallback(() => {
    if (!move(0, 1)) {
      lockPiece();
    }
  }, [move, lockPiece]);

  const hardDrop = useCallback(() => {
    if (!currentPiece || gameState !== 'playing') return;
    
    let newY = currentPiece.pos.y;
    while (!checkCollision({ x: currentPiece.pos.x, y: newY + 1 }, currentPiece.shape, grid)) {
      newY++;
    }
    
    // Direct locking logic for hard drop
    const newGrid = grid.map((row) => [...row]);
    currentPiece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          const gridY = newY + y;
          const gridX = currentPiece.pos.x + x;
          if (gridY >= 0 && gridY < ROWS && gridX >= 0 && gridX < COLS) {
            newGrid[gridY][gridX] = currentPiece.color;
          }
        }
      });
    });

    let linesCleared = 0;
    const filteredGrid = newGrid.filter((row) => {
      const isFull = row.every((cell) => cell !== null);
      if (isFull) linesCleared++;
      return !isFull;
    });

    while (filteredGrid.length < ROWS) {
      filteredGrid.unshift(Array(COLS).fill(null));
    }

    setGrid(filteredGrid);
    
    if (linesCleared > 0) {
      setScore((prev) => prev + linesCleared);
      setLines((prev) => {
        const newTotalLines = prev + linesCleared;
        if (newTotalLines >= 3) {
          setGameState('finished');
        }
        return newTotalLines;
      });
    }

    spawnPiece();
  }, [currentPiece, gameState, grid, checkCollision, spawnPiece]);

  const handleHold = useCallback(() => {
    if (!currentPiece || !canHold || gameState !== 'playing') return;

    const currentType = currentPiece.type;
    if (holdPiece === null) {
      setHoldPiece(currentType);
      spawnPiece();
    } else {
      const nextToHold = holdPiece as TetrominoType;
      setHoldPiece(currentType);
      const tetromino = TETROMINOS[nextToHold];
      setCurrentPiece({
        type: nextToHold,
        shape: tetromino.shape,
        color: tetromino.color,
        pos: { x: Math.floor(COLS / 2) - Math.floor(tetromino.shape[0].length / 2), y: 0 },
      });
    }
    setCanHold(false);
  }, [currentPiece, canHold, holdPiece, gameState, spawnPiece]);

  const startGame = useCallback(() => {
    setGrid(Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
    setScore(0);
    setLevel(1);
    setLines(0);
    setElapsedTime(0);
    setHoldPiece(null);
    setGameState('playing');
    
    const types = Object.keys(TETROMINOS) as TetrominoType[];
    const firstType = types[Math.floor(Math.random() * types.length)];
    const nextType = types[Math.floor(Math.random() * types.length)];
    
    setNextPiece(nextType);
    const tetromino = TETROMINOS[firstType];
    setCurrentPiece({
      type: firstType,
      shape: tetromino.shape,
      color: tetromino.color,
      pos: { x: Math.floor(COLS / 2) - Math.floor(tetromino.shape[0].length / 2), y: 0 },
    });
  }, []);

  const quitGame = useCallback(() => {
    setGameState('idle');
  }, []);

  const togglePause = useCallback(() => {
    if (gameState === 'playing') setGameState('paused');
    else if (gameState === 'paused') setGameState('playing');
  }, [gameState]);

  const dropRef = useRef(drop);
  useEffect(() => {
    dropRef.current = drop;
  }, [drop]);

  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => dropRef.current(), speed);
      gameTimerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    };
  }, [gameState, speed]);

  const getGhostPos = useCallback(() => {
    if (!currentPiece) return null;
    let ghostY = currentPiece.pos.y;
    while (!checkCollision({ x: currentPiece.pos.x, y: ghostY + 1 }, currentPiece.shape, grid)) {
      ghostY++;
    }
    return { x: currentPiece.pos.x, y: ghostY };
  }, [currentPiece, grid, checkCollision]);

  return {
    grid,
    currentPiece,
    nextPiece,
    holdPiece,
    score,
    level,
    lines,
    gameState,
    elapsedTime,
    ghostPos: getGhostPos(),
    startGame,
    togglePause,
    quitGame,
    moveLeft: () => move(-1, 0),
    moveRight: () => move(1, 0),
    moveDown: drop,
    hardDrop,
    rotate: handleRotate,
    hold: handleHold,
    setGameState
  };
};
