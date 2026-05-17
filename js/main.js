// js/main.js
import {
  initGame, state, getValidMoves, applyMove, checkWin, WIN_MASKS
} from './engine.js';
import {
  renderBoard, renderStock, clearHighlights, highlightValidCells,
  flashInvalid, updateTurnIndicator, showWinAnimation, setThinking
} from './ui.js';
import { isOnlineAvailable } from './network.js';
import { startRecording, finalizeReplay, saveReplayJSON, copyReplayJSON, recordMove, loadReplayViewer, initViewerControls, getReplayData } from './replay.js';

// ── Screen Management ────────────────────────────────────────
const screens = {
  modeSelect: document.getElementById('screen-mode-select'),
  game:       document.getElementById('screen-game'),
  result:     document.getElementById('screen-result'),
  replay:     document.getElementById('screen-replay'),
};

export function showScreen(name) {
  Object.values(screens).forEach(s => s?.classList.remove('active'));
  screens[name]?.classList.add('active');
}

// ── Game Context ─────────────────────────────────────────────
export const ctx = {
  mode:         null,     // 'vs_ai' | 'local_2p'
  vsAI:         false,
  aiColor:      'yellow',
  selectedFrom: null,     // { type, cell, size, color }
};

// ── Boot ─────────────────────────────────────────────────────
function boot() {
  if (!isOnlineAvailable) {
    const btn = document.getElementById('btn-online');
    if (btn) { btn.disabled = true; btn.title = 'Coming soon'; }
  }

  document.getElementById('btn-vs-ai')       ?.addEventListener('click', () => startGame('vs_ai'));
  document.getElementById('btn-local-2p')    ?.addEventListener('click', () => startGame('local_2p'));
  document.getElementById('btn-menu')        ?.addEventListener('click', () => showScreen('modeSelect'));
  document.getElementById('btn-result-menu') ?.addEventListener('click', () => showScreen('modeSelect'));
  document.getElementById('btn-play-again')  ?.addEventListener('click', () => startGame(ctx.mode));
  document.getElementById('btn-replay-menu') ?.addEventListener('click', () => showScreen('modeSelect'));
  document.getElementById('btn-view-replay') ?.addEventListener('click', () => openReplayFromCurrentGame());
  document.getElementById('btn-save-replay') ?.addEventListener('click', () => saveReplayJSON());
  document.getElementById('btn-copy-json')   ?.addEventListener('click', () => copyReplayJSON());

  initViewerControls();
  showScreen('modeSelect');
}

// ── Start Game ───────────────────────────────────────────────
export function startGame(mode) {
  ctx.mode         = mode;
  ctx.vsAI         = mode === 'vs_ai';
  ctx.aiColor      = 'yellow'; // AI always plays Yellow (moves second)
  ctx.selectedFrom = null;

  initGame();
  startRecording(mode, 'perfect');

  renderBoard(document.getElementById('board'), handleCellClick);
  renderStock('stock-red', 'stock-yellow', handleStockClick);
  updateTurnIndicator(state.currentTurn, false);
  showScreen('game');

  // AI never starts first (AI = yellow, red goes first)
}

// ── Click Handlers ───────────────────────────────────────────
function handleStockClick(color, size) {
  if (state.gameOver) return;
  if (color !== state.currentTurn) return;
  if (ctx.vsAI && color === ctx.aiColor) return;
  if (state.stock[color][size] === 0) return;

  clearHighlights();
  ctx.selectedFrom = { type: 'stock', cell: null, size, color };

  const validCells = getValidMoves(color)
    .filter(m => m.from.type === 'stock' && m.from.size === size)
    .map(m => m.to.cell);
  highlightValidCells(validCells);

  const panel = document.getElementById(color === 'red' ? 'stock-red' : 'stock-yellow');
  panel?.querySelectorAll('.stock-piece-icon').forEach(el => {
    if (parseInt(el.dataset.size) === size) el.classList.add('selected');
  });
}

function handleCellClick(cell) {
  if (state.gameOver) return;

  // ── No piece selected yet ────────────────────────────────
  if (!ctx.selectedFrom) {
    const stack = state.board[cell];
    if (stack.length === 0) { flashInvalid(cell); return; }
    const top = stack[stack.length - 1];
    if (top.color !== state.currentTurn) { flashInvalid(cell); return; }
    if (ctx.vsAI && top.color === ctx.aiColor) return;

    clearHighlights();
    ctx.selectedFrom = { type: 'board', cell, size: top.size, color: top.color };

    const validCells = getValidMoves(top.color)
      .filter(m => m.from.type === 'board' && m.from.cell === cell)
      .map(m => m.to.cell);
    highlightValidCells(validCells);
    document.getElementById('board')?.children[cell]?.querySelector('.piece')?.classList.add('selected');
    return;
  }

  // ── Piece already selected — try to place ────────────────
  const { type, size, color } = ctx.selectedFrom;
  const fromCell = ctx.selectedFrom.cell;

  const allValid = getValidMoves(color).filter(m =>
    m.from.type === type &&
    m.from.size === size &&
    (type === 'board' ? m.from.cell === fromCell : true)
  );
  const isValid = allValid.some(m => m.to.cell === cell);

  if (!isValid) {
    // Clicking another own board piece → re-select it instead
    const stack = state.board[cell];
    if (stack.length > 0 && stack[stack.length - 1].color === color && type === 'board') {
      clearHighlights();
      ctx.selectedFrom = null;
      handleCellClick(cell);
      return;
    }
    flashInvalid(cell);
    clearHighlights();
    ctx.selectedFrom = null;
    return;
  }

  // Execute move
  const move = { from: { type, cell: fromCell, size }, to: { cell }, color, timestamp: 0 };
  clearHighlights();
  ctx.selectedFrom = null;

  applyMove(move);
  recordMove(move);
  renderBoard(document.getElementById('board'), handleCellClick);
  renderStock('stock-red', 'stock-yellow', handleStockClick);

  if (checkWin(color)) { endGame(color); return; }

  updateTurnIndicator(state.currentTurn, ctx.vsAI && state.currentTurn === ctx.aiColor);

  if (ctx.vsAI && state.currentTurn === ctx.aiColor && !state.gameOver) {
    setThinking(ctx.aiColor === 'red' ? 'stock-red' : 'stock-yellow', true);
    setTimeout(triggerAI, 50);
  }
}

// ── End Game ─────────────────────────────────────────────────
function endGame(winner) {
  state.gameOver = true;
  state.winner   = winner;

  // Find winning line cells
  const surface  = winner === 'red' ? state.surfaceRed : state.surfaceYellow;
  let winMask = 0n;
  for (const mask of WIN_MASKS) {
    if ((surface & mask) === mask) { winMask = mask; break; }
  }
  const winCells = [];
  for (let i = 0; i < 16; i++) if ((winMask >> BigInt(i)) & 1n) winCells.push(i);

  showWinAnimation(winCells);
  finalizeReplay(winner);

  const el = document.getElementById('result-winner');
  if (el) {
    el.textContent = `${winner === 'red' ? '🔴 Red' : '🟡 Yellow'} wins!`;
    el.style.color = winner === 'red' ? '#ff6b6b' : '#ffe082';
  }
  setTimeout(() => showScreen('result'), 900);
}

// ── AI (stub — replaced in Task 14) ─────────────────────────
function triggerAI() {
  // Stub: random move
  const moves = getValidMoves(ctx.aiColor);
  if (!moves.length) { endGame(ctx.aiColor === 'red' ? 'yellow' : 'red'); return; }
  const move = moves[Math.floor(Math.random() * moves.length)];
  move._searchMode = false;

  setThinking(ctx.aiColor === 'red' ? 'stock-red' : 'stock-yellow', false);
  applyMove(move);
  recordMove(move);
  renderBoard(document.getElementById('board'), handleCellClick);
  renderStock('stock-red', 'stock-yellow', handleStockClick);

  if (checkWin(ctx.aiColor)) { endGame(ctx.aiColor); return; }
  updateTurnIndicator(state.currentTurn, false);
}

// ── Replay launch ────────────────────────────────────────────
function openReplayFromCurrentGame() {
  const data = getReplayData();
  if (data) loadReplayViewer(data);
  showScreen('replay');
}

boot();
