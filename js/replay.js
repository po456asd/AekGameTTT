// js/replay.js
import { state } from './engine.js';

// Active replay being recorded
let _replayData = null;

/**
 * Begin recording. Called at game start.
 */
export function startRecording(mode, difficulty = 'perfect') {
  _replayData = {
    version:  2,
    mode,
    difficulty,
    winner:   null,
    duration_seconds: 0,
    date:     new Date().toISOString(),
    moves:    [],
  };
}

/**
 * Called after every human/AI move.
 * Snapshot the move into replay data.
 */
export function recordMove(move) {
  if (!_replayData) return;
  _replayData.moves.push({
    from:      { type: move.from.type, cell: move.from.cell, size: move.from.size },
    to:        { cell: move.to.cell },
    color:     move.color,
    timestamp: move.timestamp,
  });
}

/**
 * Finalize replay at game end. Called by endGame().
 */
export function finalizeReplay(winner) {
  if (!_replayData) return;
  _replayData.winner           = winner;
  _replayData.duration_seconds = Math.round((Date.now() - state.gameStartTime) / 1000);
}

/** Get current replay data object (read-only reference). */
export function getReplayData() { return _replayData; }

/** Download replay as JSON file. */
export function saveReplayJSON() {
  if (!_replayData) return;
  const json = JSON.stringify(_replayData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `replay-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Copy replay JSON to clipboard. */
export async function copyReplayJSON() {
  const data = _replayData ?? _viewerData;
  if (!data) return;
  const json = JSON.stringify(data, null, 2);
  try {
    await navigator.clipboard.writeText(json);
    ['btn-copy-json', 'btn-copy-json-viewer'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) { const orig = btn.textContent; btn.textContent = '✓ Copied!'; setTimeout(() => btn.textContent = orig, 2000); }
    });
  } catch { prompt('Copy this JSON:', json); }
}

// ── Replay Viewer ─────────────────────────────────────────────
import { initGame, applyMove as engineApplyMove } from './engine.js';
import { renderBoard, renderStock } from './ui.js';

let _viewerData   = null;
let _viewerStep   = 0;
let _autoInterval = null;

/**
 * Load replay data into the viewer and show the initial (empty) board state.
 * @param {object} replayData — parsed replay JSON
 */
export function loadReplayViewer(replayData) {
  _viewerData = replayData;
  _viewerStep = 0;
  _autoStop();

  initGame();
  renderBoard(document.getElementById('board-replay'), null);
  renderStock('stock-red-replay', 'stock-yellow-replay', null);
  _updateViewerHeader();
}

function _applyUpTo(targetStep) {
  initGame();
  const moves = _viewerData.moves.slice(0, targetStep);
  for (const m of moves) {
    engineApplyMove({ ...m, _searchMode: true });
  }
  renderBoard(document.getElementById('board-replay'), null);
  renderStock('stock-red-replay', 'stock-yellow-replay', null);
  _viewerStep = targetStep;
  _updateViewerHeader();
}

function _updateViewerHeader() {
  const d = _viewerData;
  const total = d?.moves?.length ?? 0;
  document.getElementById('replay-winner-badge').textContent  = d?.winner ? `🏆 ${d.winner}` : '';
  document.getElementById('replay-difficulty').textContent    = d?.difficulty ?? '';
  document.getElementById('replay-time').textContent          = d?.duration_seconds != null ? `⏱ ${d.duration_seconds}s` : '';
  document.getElementById('replay-move-counter').textContent  = `Move ${_viewerStep} / ${total}`;
}

function _autoStop() {
  if (_autoInterval) { clearInterval(_autoInterval); _autoInterval = null; }
  const btn = document.getElementById('btn-replay-auto');
  if (btn) btn.textContent = '▶ Auto';
}

/** Wire up all replay viewer button events. Call once from main.js boot. */
export function initViewerControls() {
  document.getElementById('btn-replay-start')?.addEventListener('click', () => {
    _autoStop(); _applyUpTo(0);
  });
  document.getElementById('btn-replay-prev')?.addEventListener('click', () => {
    _autoStop(); if (_viewerStep > 0) _applyUpTo(_viewerStep - 1);
  });
  document.getElementById('btn-replay-next')?.addEventListener('click', () => {
    _autoStop();
    if (_viewerData && _viewerStep < _viewerData.moves.length) _applyUpTo(_viewerStep + 1);
  });
  document.getElementById('btn-replay-end')?.addEventListener('click', () => {
    _autoStop(); if (_viewerData) _applyUpTo(_viewerData.moves.length);
  });
  document.getElementById('btn-replay-auto')?.addEventListener('click', () => {
    if (_autoInterval) { _autoStop(); return; }
    document.getElementById('btn-replay-auto').textContent = '⏸ Pause';
    const speed = parseFloat(document.getElementById('replay-speed')?.value ?? 1);
    const delay = Math.round(800 / speed);
    _autoInterval = setInterval(() => {
      if (!_viewerData || _viewerStep >= _viewerData.moves.length) { _autoStop(); return; }
      _applyUpTo(_viewerStep + 1);
    }, delay);
  });

  // File picker
  document.getElementById('replay-file-input')?.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      loadReplayViewer(data);
    } catch { alert('Invalid replay file.'); }
  });

  // Drag-drop on replay board container
  const container = document.getElementById('board-container-replay');
  if (container) {
    container.addEventListener('dragover', e => e.preventDefault());
    container.addEventListener('drop', async e => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file) return;
      const text = await file.text();
      try { loadReplayViewer(JSON.parse(text)); } catch { alert('Invalid replay file.'); }
    });
  }

  document.getElementById('btn-save-replay-viewer')?.addEventListener('click', saveReplayJSON);
  document.getElementById('btn-copy-json-viewer')  ?.addEventListener('click', copyReplayJSON);
}
