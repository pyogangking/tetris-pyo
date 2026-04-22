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
  const [nextPiece, setNextPiece] = useState<TetrominoType>(() => {
    const types = Object.keys(TETROMINOS) as TetrominoType[];
    return types[Math.floor(Math.random() * types.length)];
  });
  const [holdPiece, setHoldPiece] = useState<TetrominoType | null>(null);
  const [canHold, setCanHold] = useState(true);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'paused' | 'gameOver'>('idle');
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const speed = Math.max(MIN_DROP_SPEED, INITIAL_DROP_SPEED - (level - 1) * SPEED_INCREMENT);

  const getRandomType = useCallback(() => {
    const types = Object.keys(TETROMINOS) as TetrominoType[];
    return types[Math.floor(Math.random() * types.length)];
  }, []);

  const spawnPiece = useCallback(() => {
    const type = nextPiece;
    const tetromino = TETROMINOS[type];
    const newPiece: Piece = {
      type,
      shape: tetromino.shape,
      color: tetromino.color,
      pos: { x: Math.floor(COLS / 2) - Math.floor(tetromino.shape[0].length / 2), y: 0 },
    };

    if (checkCollision(newPiece.pos, newPiece.shape)) {
      setGameState('gameOver');
      return;
    }

    setCurrentPiece(newPiece);
    setNextPiece(getRandomType());
    setCanHold(true);
  }, [nextPiece, getRandomType]);

  const checkCollision = (pos: Position, shape: number[][], currentGrid = grid) => {
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
  };

  const rotate = (shape: number[][]) => {
    const newShape = shape[0].map((_, i) => shape.map((row) => row[i]).reverse());
    return newShape;
  };

  const handleRotate = useCallback(() => {
    if (!currentPiece || gameState !== 'playing') return;
    const newShape = rotate(currentPiece.shape);
    if (!checkCollision(currentPiece.pos, newShape)) {
      setCurrentPiece({ ...currentPiece, shape: newShape });
    }
  }, [currentPiece, gameState]);

  const move = useCallback((dx: number, dy: number) => {
    if (!currentPiece || gameState !== 'playing') return false;
    const newPos = { x: currentPiece.pos.x + dx, y: currentPiece.pos.y + dy };
    if (!checkCollision(newPos, currentPiece.shape)) {
      setCurrentPiece({ ...currentPiece, pos: newPos });
      return true;
    }
    return false;
  }, [currentPiece, gameState]);

  const lockPiece = useCallback(() => {
    if (!currentPiece) return;

    setGrid((prevGrid) => {
      const newGrid = prevGrid.map((row) => [...row]);
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

      // Clear lines
      let linesCleared = 0;
      const filteredGrid = newGrid.filter((row) => {
        const isFull = row.every((cell) => cell !== null);
        if (isFull) linesCleared++;
        return !isFull;
      });

      while (filteredGrid.length < ROWS) {
        filteredGrid.unshift(Array(COLS).fill(null));
      }

      if (linesCleared > 0) {
        const scoreTable: Record<number, number> = {
          1: SCORES.SINGLE,
          2: SCORES.DOUBLE,
          3: SCORES.TRIPLE,
          4: SCORES.TETRIS,
        };
        setScore((prev) => prev + (scoreTable[linesCleared] || 0) * level);
        setLines((prev) => {
          const newTotalLines = prev + linesCleared;
          setLevel(Math.floor(newTotalLines / 10) + 1);
          return newTotalLines;
        });
      }

      return filteredGrid;
    });

    spawnPiece();
  }, [currentPiece, level, spawnPiece]);

  const drop = useCallback(() => {
    if (!move(0, 1)) {
      lockPiece();
    }
  }, [move, lockPiece]);

  const hardDrop = useCallback(() => {
    if (!currentPiece || gameState !== 'playing') return;
    let newY = currentPiece.pos.y;
    while (!checkCollision({ x: currentPiece.pos.x, y: newY + 1 }, currentPiece.shape)) {
      newY++;
    }
    const finalPiece = { ...currentPiece, pos: { x: currentPiece.pos.x, y: newY } };
    setCurrentPiece(finalPiece);
    
    // Immediate lock logic using the final position
    setGrid((prevGrid) => {
      const newGrid = prevGrid.map((row) => [...row]);
      finalPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            const gridY = finalPiece.pos.y + y;
            const gridX = finalPiece.pos.x + x;
            if (gridY >= 0 && gridY < ROWS && gridX >= 0 && gridX < COLS) {
              newGrid[gridY][gridX] = finalPiece.color;
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

      if (linesCleared > 0) {
        const scoreTable: Record<number, number> = {
          1: SCORES.SINGLE,
          2: SCORES.DOUBLE,
          3: SCORES.TRIPLE,
          4: SCORES.TETRIS,
        };
        setScore((prev) => prev + (scoreTable[linesCleared] || 0) * level);
        setLines((prev) => {
          const newTotalLines = prev + linesCleared;
          setLevel(Math.floor(newTotalLines / 10) + 1);
          return newTotalLines;
        });
      }

      return filteredGrid;
    });
    spawnPiece();
  }, [currentPiece, gameState, level, spawnPiece]);

  const handleHold = useCallback(() => {
    if (!currentPiece || !canHold || gameState !== 'playing') return;

    const currentType = currentPiece.type;
    if (holdPiece === null) {
      setHoldPiece(currentType);
      spawnPiece();
    } else {
      const nextToHold = holdPiece;
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
    setHoldPiece(null);
    setGameState('playing');
    setNextPiece(getRandomType());
    // Initial spawn
    const firstType = getRandomType();
    const tetromino = TETROMINOS[firstType];
    setCurrentPiece({
      type: firstType,
      shape: tetromino.shape,
      color: tetromino.color,
      pos: { x: Math.floor(COLS / 2) - Math.floor(tetromino.shape[0].length / 2), y: 0 },
    });
  }, [getRandomType]);

  const togglePause = useCallback(() => {
    if (gameState === 'playing') setGameState('paused');
    else if (gameState === 'paused') setGameState('playing');
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(drop, speed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, drop, speed]);

  // Ghost block calculation
  const getGhostPos = () => {
    if (!currentPiece) return null;
    let ghostY = currentPiece.pos.y;
    while (!checkCollision({ x: currentPiece.pos.x, y: ghostY + 1 }, currentPiece.shape)) {
      ghostY++;
    }
    return { x: currentPiece.pos.x, y: ghostY };
  };

  return {
    grid,
    currentPiece,
    nextPiece,
    holdPiece,
    score,
    level,
    lines,
    gameState,
    ghostPos: getGhostPos(),
    startGame,
    togglePause,
    moveLeft: () => move(-1, 0),
    moveRight: () => move(1, 0),
    moveDown: drop,
    hardDrop,
    rotate: handleRotate,
    hold: handleHold,
    setGameState
  };
};
