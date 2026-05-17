// js/engine.js
export const SIZES  = { TINY: 0, SMALL: 1, MEDIUM: 2, LARGE: 3 };
export const COLORS = { RED: 'red', YELLOW: 'yellow' };

// 10 pre-computed 16-bit win masks for 4×4 board (row-major cell index = r*4+c)
// Bit i = cell i is in this winning line
export const WIN_MASKS = [
  0x000Fn, // row 0: cells  0, 1, 2, 3
  0x00F0n, // row 1: cells  4, 5, 6, 7
  0x0F00n, // row 2: cells  8, 9,10,11
  0xF000n, // row 3: cells 12,13,14,15
  0x1111n, // col 0: cells  0, 4, 8,12
  0x2222n, // col 1: cells  1, 5, 9,13
  0x4444n, // col 2: cells  2, 6,10,14
  0x8888n, // col 3: cells  3, 7,11,15
  0x8421n, // diag \: cells  0, 5,10,15
  0x1248n, // diag /: cells  3, 6, 9,12
];

export const state = {
  board: [],
  stock: {},
  redMask:    0n,
  yellowMask: 0n,
  surfaceRed:    0n,
  surfaceYellow: 0n,
  currentTurn: 'red',
  gameStartTime: 0,
  moveLog: [],
  gameOver: false,
  winner: null,
};

export function initGame() {
  state.board        = Array.from({ length: 16 }, () => []);
  state.stock        = { red: [3,3,3,3], yellow: [3,3,3,3] };
  state.redMask      = 0n;
  state.yellowMask   = 0n;
  state.surfaceRed   = 0n;
  state.surfaceYellow= 0n;
  state.currentTurn  = 'red';
  state.gameStartTime= Date.now();
  state.moveLog      = [];
  state.gameOver     = false;
  state.winner       = null;
}
