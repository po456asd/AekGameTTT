// js/engine.js
export const SIZES = { TINY: 0, SMALL: 1, MEDIUM: 2, LARGE: 3 };
export const COLORS = { RED: 'red', YELLOW: 'yellow' };
export const WIN_MASKS = [];
export const state = {
  board: [], stock: {},
  redMask: 0n, yellowMask: 0n,
  surfaceRed: 0n, surfaceYellow: 0n,
  currentTurn: 'red', gameStartTime: 0,
  moveLog: [], gameOver: false, winner: null
};
