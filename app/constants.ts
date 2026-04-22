export const COLS = 10;
export const ROWS = 20;
export const INITIAL_DROP_SPEED = 800;
export const MIN_DROP_SPEED = 100;
export const SPEED_INCREMENT = 50;

export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

export interface Tetromino {
  shape: number[][];
  color: string;
  type: TetrominoType;
}

export const TETROMINOS: Record<TetrominoType, Tetromino> = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: 'bg-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.6)]',
    type: 'I',
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: 'bg-[#7000FF] shadow-[0_0_15px_rgba(112,0,255,0.6)]',
    type: 'J',
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: 'bg-[#FF007F] shadow-[0_0_15px_rgba(255,0,127,0.6)]',
    type: 'L',
  },
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: 'bg-[#FFFB00] shadow-[0_0_15px_rgba(255,251,0,0.6)]',
    type: 'O',
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: 'bg-[#00FF66] shadow-[0_0_15px_rgba(0,255,102,0.6)]',
    type: 'S',
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: 'bg-[#FF00FF] shadow-[0_0_15px_rgba(255,0,255,0.6)]',
    type: 'T',
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    color: 'bg-[#FF3333] shadow-[0_0_15px_rgba(255,51,51,0.6)]',
    type: 'Z',
  },
};

export const COLORS = {
  empty: 'bg-[#0A0A0F]',
  border: 'border-[#FF007F]/30',
  grid: 'bg-[#0A0A0F]/50',
  primary: '#FF007F',
  secondary: '#00E5FF',
  tertiary: '#7000FF',
};

export const SCORES = {
  SINGLE: 1,
  DOUBLE: 2,
  TRIPLE: 3,
  TETRIS: 4,
};
