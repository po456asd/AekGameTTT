// js/main.js
import {
  initGame, state, getValidMoves, applyMove, checkWin, WIN_MASKS
} from './engine.js';
import { findBestMove, initTT, getTTBuffer } from './ai.js';
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

// ── Worker / Lazy SMP ────────────────────────────────────────
let _worker = null;
let _useWorker = false;

function _initWorker() {
  try {
    _worker = new Worker('./js/ai-worker.js', { type: 'module' });
    const buf = getTTBuffer();
    if (buf instanceof SharedArrayBuffer) {
      _worker.postMessage({ type: 'init', payload: { ttBuffer: buf } });
      _useWorker = true;
    }
  } catch {
    _useWorker = false;
  }
}

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
  initTT();
  _initWorker();
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

  renderBoard(document.getElementById('board'), handleCellClick, handleBoardPieceDragStart);
  _wireBoardDragEvents();
  renderStock('stock-red', 'stock-yellow', handleStockClick, handleStockPieceDragStart);
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
  panel?.querySelectorAll('.piece').forEach(el => {
    if (parseInt(el.dataset.size, 10) === size) el.classList.add('selected');
  });
}

function handleCellClick(cell) {
  if (state.gameOver) return;

  if (!ctx.selectedFrom) {
    const stack = state.board[cell];
    if (stack.length === 0) { flashInvalid(cell); return; }
    const top = stack[stack.length - 1];
    if (top.color !== state.currentTurn) { flashInvalid(cell); return; }
    if (ctx.vsAI && top.color === ctx.aiColor) return;
    clearHighlights();
    ctx.selectedFrom = { type: 'board', cell, size: top.size, color: top.color };
    const validCells = getValidMoves(top.color)
      .filter(m => m.from.type === 'board' && m.from.cell === cell).map(m => m.to.cell);
    highlightValidCells(validCells);
    document.getElementById('board')?.children[cell]?.querySelector('.piece')?.classList.add('selected');
    return;
  }

  // Re-select another own board piece?
  const { type, size, color } = ctx.selectedFrom;
  const allValid = getValidMoves(color).filter(m =>
    m.from.type === type && m.from.size === size &&
    (type === 'board' ? m.from.cell === ctx.selectedFrom.cell : true)
  );
  if (!allValid.some(m => m.to.cell === cell)) {
    const stack = state.board[cell];
    if (stack.length > 0 && stack[stack.length - 1].color === color && type === 'board') {
      clearHighlights(); ctx.selectedFrom = null; handleCellClick(cell); return;
    }
  }
  executeMoveToCell(cell);
}

function executeMoveToCell(cell) {
  const { type, size, color } = ctx.selectedFrom;
  const fromCell = ctx.selectedFrom.cell;

  const allValid = getValidMoves(color).filter(m =>
    m.from.type === type &&
    m.from.size === size &&
    (type === 'board' ? m.from.cell === fromCell : true)
  );
  if (!allValid.some(m => m.to.cell === cell)) {
    flashInvalid(cell);
    clearHighlights();
    ctx.selectedFrom = null;
    return false;
  }

  const move = { from: { type, cell: fromCell, size }, to: { cell }, color, timestamp: 0 };
  clearHighlights();
  ctx.selectedFrom = null;

  applyMove(move);
  recordMove(move);
  renderBoard(document.getElementById('board'), handleCellClick, handleBoardPieceDragStart);
  // Animate newly placed piece
  const pieceEl = document.getElementById('board')?.children[cell]?.querySelector('.piece');
  if (pieceEl) {
    pieceEl.classList.add(move._gobbled ? 'anim-gobble-in' : 'anim-place');
    pieceEl.addEventListener('animationend', () =>
      pieceEl.classList.remove('anim-gobble-in', 'anim-place'), { once: true }
    );
  }
  renderStock('stock-red', 'stock-yellow', handleStockClick, handleStockPieceDragStart);

  if (checkWin(color)) { endGame(color); return true; }
  updateTurnIndicator(state.currentTurn, ctx.vsAI && state.currentTurn === ctx.aiColor);
  if (ctx.vsAI && state.currentTurn === ctx.aiColor && !state.gameOver) {
    setThinking(ctx.aiColor === 'red' ? 'stock-red' : 'stock-yellow', true);
    setTimeout(triggerAI, 50);
  }
  return true;
}

function handleStockPieceDragStart(color, size, e) {
  if (state.gameOver || color !== state.currentTurn) { e.preventDefault(); return; }
  if (ctx.vsAI && color === ctx.aiColor) { e.preventDefault(); return; }
  clearHighlights();
  ctx.selectedFrom = { type: 'stock', cell: null, size, color };
  highlightValidCells(getValidMoves(color)
    .filter(m => m.from.type === 'stock' && m.from.size === size).map(m => m.to.cell));
  e.currentTarget.classList.add('selected');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', '');
}

function handleBoardPieceDragStart(fromCell, e) {
  if (state.gameOver) { e.preventDefault(); return; }
  const stack = state.board[fromCell];
  if (!stack.length) { e.preventDefault(); return; }
  const top = stack[stack.length - 1];
  if (top.color !== state.currentTurn) { e.preventDefault(); return; }
  if (ctx.vsAI && top.color === ctx.aiColor) { e.preventDefault(); return; }
  clearHighlights();
  ctx.selectedFrom = { type: 'board', cell: fromCell, size: top.size, color: top.color };
  highlightValidCells(getValidMoves(top.color)
    .filter(m => m.from.type === 'board' && m.from.cell === fromCell).map(m => m.to.cell));
  e.currentTarget.classList.add('selected');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', '');
}

function _wireBoardDragEvents() {
  const boardEl = document.getElementById('board');
  if (!boardEl || boardEl._dragWired) return;
  boardEl._dragWired = true;

  boardEl.addEventListener('dragover', e => {
    const cellEl = e.target.closest('.cell');
    if (!cellEl) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    boardEl.querySelectorAll('.cell.drag-over').forEach(c => { if (c !== cellEl) c.classList.remove('drag-over'); });
    if (cellEl.classList.contains('valid-target')) cellEl.classList.add('drag-over');
  });
  boardEl.addEventListener('dragleave', e => {
    const cellEl = e.target.closest('.cell');
    if (cellEl && !cellEl.contains(e.relatedTarget)) cellEl.classList.remove('drag-over');
  });
  boardEl.addEventListener('drop', e => {
    e.preventDefault();
    const cellEl = e.target.closest('.cell');
    if (!cellEl || !ctx.selectedFrom) return;
    cellEl.classList.remove('drag-over');
    executeMoveToCell(parseInt(cellEl.dataset.cell, 10));
  });
  boardEl.addEventListener('dragend', () => {
    clearHighlights();
    if (ctx.selectedFrom) ctx.selectedFrom = null;
  });
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

// ── AI ───────────────────────────────────────────────────────

/**
 * Animate a piece clone flying from `srcRect` to `dstRect` on screen.
 * Clone inherits piece CSS (color/size) via data attributes.
 * Calls `onComplete` when the CSS transition ends (or after 500ms safety).
 */
function _flyClone(color, size, srcRect, dstRect, onComplete) {
  const clone = document.createElement('div');
  clone.className = 'piece';
  clone.dataset.color = color;
  clone.dataset.size  = size;
  Object.assign(clone.style, {
    position:      'fixed',
    left:          `${srcRect.left}px`,
    top:           `${srcRect.top}px`,
    pointerEvents: 'none',
    zIndex:        '9999',
    transition:    'left 0.32s ease-in-out, top 0.32s ease-in-out',
  });
  document.body.appendChild(clone);
  // Double rAF ensures transition fires (not collapsed into initial paint)
  requestAnimationFrame(() => requestAnimationFrame(() => {
    clone.style.left = `${dstRect.left}px`;
    clone.style.top  = `${dstRect.top}px`;
    const done = () => { clone.remove(); onComplete?.(); };
    clone.addEventListener('transitionend', done, { once: true });
    setTimeout(done, 500); // safety cleanup if transitionend never fires
  }));
}

function _applyAIMove(move) {
  if (!move || state.gameOver) return;
  setThinking(ctx.aiColor === 'red' ? 'stock-red' : 'stock-yellow', false);

  // Re-derive move from current state (validate against current valid moves)
  const validMoves = getValidMoves(ctx.aiColor);
  const matched = validMoves.find(m =>
    m.from.type === move.from.type &&
    m.from.cell === move.from.cell &&
    m.from.size === move.from.size &&
    m.to.cell   === move.to.cell
  ) ?? validMoves[0]; // fallback to first valid move

  if (!matched) return;
  matched._searchMode = false;

  // Capture stock piece rect BEFORE applyMove/renderStock (DOM still shows old state)
  let stockSrcRect = null;
  if (matched.from.type === 'stock') {
    const panelId   = ctx.aiColor === 'red' ? 'stock-red' : 'stock-yellow';
    const stockPiece = document.getElementById(panelId)
      ?.querySelector(`.piece[data-size="${matched.from.size}"]`);
    if (stockPiece) stockSrcRect = stockPiece.getBoundingClientRect();
  }

  applyMove(matched);
  recordMove(matched);
  renderBoard(document.getElementById('board'), handleCellClick, handleBoardPieceDragStart);

  const _boardEl = document.getElementById('board');
  const _cellEl  = _boardEl?.children[matched.to.cell];
  const _pieceEl = _cellEl?.querySelector('.piece');
  const wasGobble = matched._gobbled != null;

  if (stockSrcRect && _pieceEl) {
    // Stock move: fly clone from stock → board, reveal piece on arrival
    const dstRect = _pieceEl.getBoundingClientRect();
    _pieceEl.style.opacity = '0';
    renderStock('stock-red', 'stock-yellow', handleStockClick, handleStockPieceDragStart);
    _flyClone(ctx.aiColor, matched.from.size, stockSrcRect, dstRect, () => {
      _pieceEl.style.opacity = '';
      _pieceEl.classList.add(wasGobble ? 'anim-gobble-in' : 'anim-place');
      _pieceEl.addEventListener('animationend', () =>
        _pieceEl.classList.remove('anim-gobble-in', 'anim-place'), { once: true }
      );
    });
  } else {
    // Board move: regular place/gobble animation
    if (_pieceEl) {
      _pieceEl.classList.add(wasGobble ? 'anim-gobble-in' : 'anim-place');
      _pieceEl.addEventListener('animationend', () =>
        _pieceEl.classList.remove('anim-gobble-in', 'anim-place'), { once: true }
      );
    }
    renderStock('stock-red', 'stock-yellow', handleStockClick, handleStockPieceDragStart);
  }

  if (checkWin(ctx.aiColor)) { endGame(ctx.aiColor); return; }
  updateTurnIndicator(state.currentTurn, false);
}

function triggerAI() {
  if (_useWorker && _worker) {
    const snapshot = {
      boardSnapshot: state.board.map(stk => stk.map(p => ({ ...p }))),
      stockSnapshot: { red: [...state.stock.red], yellow: [...state.stock.yellow] },
      currentColor:  ctx.aiColor,
      seed: Math.random(),
    };
    _worker.onmessage = e => {
      if (e.data.type !== 'result') return;
      _applyAIMove(e.data.move);
    };
    _worker.postMessage({ type: 'search', payload: snapshot });
  } else {
    // Fallback: run search on main thread
    const move = findBestMove(ctx.aiColor, 18, 3000);
    _applyAIMove(move);
  }
}

// ── Replay launch ────────────────────────────────────────────
function openReplayFromCurrentGame() {
  const data = getReplayData();
  if (data) loadReplayViewer(data);
  showScreen('replay');
}

boot();
