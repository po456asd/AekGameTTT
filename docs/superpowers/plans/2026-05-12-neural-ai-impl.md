# Neural Network AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement self-trained neural network AI with two color-specialized models (firststart=RED, secondstart=YELLOW) trained via self-play. Browser integration uses ONLY secondstart (YELLOW) model since AI moves second in game. 5-second MCTS inference.

**Architecture:** Two phases - Python training backend (Policy+Value networks, self-play loop, model evaluation) → Browser inference (MCTS+network hybrid, YELLOW model only, UI integration).

**Tech Stack:** Python (PyTorch 2.0+), TensorFlow.js (browser inference), MCTS tree search

---

## File Structure

**Training (Python):**
- `training/models.py` - Network architecture (Policy+Value)
- `training/selfplay.py` - Self-play game engine (imports from index.html game logic via headless mode or port)
- `training/train.py` - Main training orchestration loop
- `training/evaluate.py` - Win rate evaluation (new vs old models)
- `training/export_tfjs.py` - PyTorch → TensorFlow.js conversion
- `training/requirements.txt` - Python dependencies
- `training/models/` - Saved model checkpoints (firststart_v0.pt, secondstart_v0.pt, etc.)

**Browser (YELLOW model only):**
- `index.html` (modify) - Add NEURAL difficulty option, MCTS function, YELLOW model loading
- `models/` - TensorFlow.js exported YELLOW model (secondstart_latest.json, secondstart_latest_weights.bin)

---

## Phase 1: Python Training Infrastructure

### Task 1: Set Up Python Training Environment

**Files:**
- Create: `training/requirements.txt`
- Create: `training/README.md`

- [ ] **Step 1: Create requirements.txt**

```txt
torch==2.0.0
numpy==1.24.0
```

- [ ] **Step 2: Create training README with setup instructions**

```markdown
# Training the Neural AI

## Setup
1. `pip install -r requirements.txt`
2. Ensure CUDA is available (for GPU training)

## Running Training
```python
python train.py --generations 100 --games-per-gen 20
```

## Output
- Models saved to `models/firststart_v{N}.pt`, `models/secondstart_v{N}.pt`
- Training logs: `training_log.csv` (generation, win_rate, loss)
```

- [ ] **Step 3: Commit**

```bash
git add training/requirements.txt training/README.md
git commit -m "setup: add python training environment"
```

---

### Task 2: Implement Network Architecture (Policy+Value)

**Files:**
- Create: `training/models.py`

- [ ] **Step 1: Write network architecture**

```python
import torch
import torch.nn as nn

class PolicyValueNetwork(nn.Module):
    """
    Policy+Value network: outputs move probabilities (16) + position value (1)
    Input: 80-dim board encoding (16 cells × 5 states each)
    """
    def __init__(self, input_dim=80):
        super().__init__()
        
        # Shared trunk
        self.trunk = nn.Sequential(
            nn.Linear(input_dim, 512),
            nn.ReLU(),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Linear(256, 128),
            nn.ReLU()
        )
        
        # Policy head: 16 move logits
        self.policy_head = nn.Sequential(
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, 16)
        )
        
        # Value head: single value estimate [-1, +1]
        self.value_head = nn.Sequential(
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Tanh()
        )
    
    def forward(self, x):
        """
        Args:
            x: Tensor of shape (batch_size, 80)
        Returns:
            policy_logits: (batch_size, 16) - unnormalized move probabilities
            value: (batch_size, 1) - position value estimate
        """
        trunk_out = self.trunk(x)
        policy_logits = self.policy_head(trunk_out)
        value = self.value_head(trunk_out)
        return policy_logits, value

def encode_board(board_state):
    """
    Convert board state to 80-dim encoding.
    
    Args:
        board_state: 16-element list/array where each element is:
            0 = empty
            1 = red-small
            2 = red-large
            3 = yellow-small
            4 = yellow-large
    
    Returns:
        Tensor of shape (80,) with one-hot encoding per cell
    """
    encoding = torch.zeros(80)
    for i, state in enumerate(board_state):
        if state > 0:
            encoding[i * 5 + state - 1] = 1.0
    return encoding
```

- [ ] **Step 2: Commit**

```bash
git add training/models.py
git commit -m "feat: implement Policy+Value network architecture"
```

---

### Task 3: Implement Self-Play Game Engine

**Files:**
- Create: `training/selfplay.py`

- [ ] **Step 1: Write self-play game engine**

```python
import torch
from models import PolicyValueNetwork, encode_board

class GameEngine:
    """Headless game engine for self-play training."""
    
    def __init__(self):
        self.board = [0] * 16  # 0=empty, 1-4=piece types
        self.stock = {
            'red': {'small': 8, 'large': 4},
            'yellow': {'small': 8, 'large': 4}
        }
        self.current_player = 'red'  # RED always goes first
    
    def get_valid_moves(self, color):
        """Return list of valid moves for color."""
        moves = []
        for cell_idx in range(16):
            for size in ['small', 'large']:
                if self.stock[color][size] > 0:
                    if self.can_place(cell_idx, size):
                        moves.append({'cell': cell_idx, 'size': size})
        return moves
    
    def can_place(self, cell_idx, size):
        """Check if piece can be placed at cell."""
        piece = self.board[cell_idx]
        if piece == 0:
            return True
        if piece in [1, 3] and size == 'large':  # small red/yellow, place large on top
            return True
        return False
    
    def make_move(self, move):
        """Execute move: (cell, size, color)"""
        cell_idx = move['cell']
        size = move['size']
        color = self.current_player
        
        # Encode piece
        piece_code = {'red': {'small': 1, 'large': 2}, 'yellow': {'small': 3, 'large': 4}}
        self.board[cell_idx] = piece_code[color][size]
        self.stock[color][size] -= 1
        
        # Check win
        if self.check_win(color):
            return 'win', color
        
        # Switch player
        self.current_player = 'yellow' if color == 'red' else 'red'
        
        # Check if current player has moves
        if not self.get_valid_moves(self.current_player):
            if not self.get_valid_moves(color):
                return 'draw', None
            else:
                return 'win', color
        
        return 'continue', None
    
    def check_win(self, color):
        """Check if color has won (4 in a row, corners, or center)."""
        # Check rows, columns, diagonals, corners, center
        # Return True if won
        winning_lines = [
            [0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15],  # rows
            [0, 4, 8, 12], [1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15],   # cols
            [0, 5, 10, 15], [3, 6, 9, 12],                                    # diags
            [0, 3, 12, 15],                                                    # corners
            [5, 6, 9, 10]                                                      # center
        ]
        
        color_codes = [1, 2] if color == 'red' else [3, 4]
        
        for line in winning_lines:
            if all(self.board[i] in color_codes for i in line):
                return True
        return False
    
    def play_game(self, network_red, network_yellow):
        """
        Play one game: RED vs YELLOW.
        Returns: {'winner': 'red'|'yellow'|'draw', 'moves': [(state, move), ...]}
        """
        history = []
        
        while True:
            color = self.current_player
            network = network_red if color == 'red' else network_yellow
            
            # Get board encoding
            board_tensor = encode_board(self.board).unsqueeze(0)  # (1, 80)
            
            # Network inference
            with torch.no_grad():
                policy_logits, value = network(board_tensor)
            
            # Get valid moves
            valid_moves = self.get_valid_moves(color)
            if not valid_moves:
                return {'winner': 'draw' if self.current_player == color else ('red' if color == 'yellow' else 'yellow'),
                        'moves': history}
            
            # Select best move by policy
            policy_probs = torch.softmax(policy_logits[0], dim=0)
            move_probs = [policy_probs[m['cell']].item() for m in valid_moves]
            best_idx = max(range(len(valid_moves)), key=lambda i: move_probs[i])
            move = valid_moves[best_idx]
            
            # Record move
            history.append((self.board.copy(), move, color))
            
            # Execute move
            status, winner = self.make_move(move)
            if status != 'continue':
                return {'winner': winner if winner else 'draw', 'moves': history}

def play_games(network_red, network_yellow, num_games):
    """Play num_games games and return list of game results."""
    results = []
    for _ in range(num_games):
        engine = GameEngine()
        result = engine.play_game(network_red, network_yellow)
        results.append(result)
    return results
```

- [ ] **Step 2: Commit**

```bash
git add training/selfplay.py
git commit -m "feat: implement self-play game engine"
```

---

### Task 4: Implement Training Loop

**Files:**
- Create: `training/train.py`

- [ ] **Step 1: Write training orchestration**

```python
import torch
import torch.optim as optim
import torch.nn.functional as F
from models import PolicyValueNetwork, encode_board
from selfplay import play_games, GameEngine
import csv
from pathlib import Path

def train_network(network, games_data, epochs=3, batch_size=32, lr=0.001):
    """
    Train network on collected games data.
    
    Args:
        network: PolicyValueNetwork to train
        games_data: list of dicts {'moves': [(board, move, color), ...], 'winner': 'red'|'yellow'|'draw'}
        epochs: training epochs
        batch_size: batch size for SGD
        lr: learning rate
    """
    optimizer = optim.Adam(network.parameters(), lr=lr)
    
    # Collect training samples
    training_samples = []
    for game in games_data:
        winner = game['winner']
        for board, move, color in game['moves']:
            # Skip if not the right color
            if color != network.color:  # Assuming network has .color attribute set
                continue
            
            # Outcome: +1 if won, -1 if lost, 0 if draw
            if winner == 'draw':
                outcome = 0.0
            elif (color == 'red' and winner == 'red') or (color == 'yellow' and winner == 'yellow'):
                outcome = 1.0
            else:
                outcome = -1.0
            
            training_samples.append((board, move, outcome))
    
    # Train
    network.train()
    for epoch in range(epochs):
        epoch_loss = 0
        for i in range(0, len(training_samples), batch_size):
            batch = training_samples[i:i+batch_size]
            
            boards = torch.stack([encode_board(b) for b, _, _ in batch])
            outcomes = torch.tensor([o for _, _, o in batch]).unsqueeze(1)
            moves = [m['cell'] for _, m, _ in batch]
            
            # Forward
            policy_logits, value = network(boards)
            
            # Loss: policy cross-entropy + value MSE
            policy_loss = F.cross_entropy(policy_logits, torch.tensor(moves))
            value_loss = F.mse_loss(value, outcomes)
            loss = policy_loss + value_loss
            
            # Backward
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
            epoch_loss += loss.item()
        
        print(f"Epoch {epoch+1}/{epochs} loss={epoch_loss/len(training_samples):.4f}")

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--generations', type=int, default=50, help='Number of training generations')
    parser.add_argument('--games-per-gen', type=int, default=20, help='Games per generation')
    args = parser.parse_args()
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Training on device: {device}")
    
    # Initialize models
    firststart = PolicyValueNetwork().to(device)
    firststart.color = 'red'
    secondstart = PolicyValueNetwork().to(device)
    secondstart.color = 'yellow'
    
    models_dir = Path('training/models')
    models_dir.mkdir(exist_ok=True)
    
    # Logging
    log_file = Path('training/training_log.csv')
    with open(log_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['generation', 'red_wins', 'yellow_wins', 'draws', 'red_win_rate'])
    
    # Training loop
    for gen in range(args.generations):
        print(f"\n=== Generation {gen} ===")
        
        # Play games
        print(f"Playing {args.games_per_gen} games...")
        games = play_games(firststart, secondstart, args.games_per_gen)
        
        # Log results
        red_wins = sum(1 for g in games if g['winner'] == 'red')
        yellow_wins = sum(1 for g in games if g['winner'] == 'yellow')
        draws = sum(1 for g in games if g['winner'] == 'draw')
        red_rate = red_wins / args.games_per_gen
        
        print(f"Results: RED {red_wins}, YELLOW {yellow_wins}, DRAW {draws} (RED win rate: {red_rate:.2%})")
        
        # Log to file
        with open(log_file, 'a', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([gen, red_wins, yellow_wins, draws, red_rate])
        
        # Train
        print("Training RED model...")
        train_network(firststart, games, epochs=3)
        print("Training YELLOW model...")
        train_network(secondstart, games, epochs=3)
        
        # Save models
        torch.save(firststart.state_dict(), models_dir / f'firststart_v{gen}.pt')
        torch.save(secondstart.state_dict(), models_dir / f'secondstart_v{gen}.pt')
        print(f"Saved models to v{gen}")

if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Commit**

```bash
git add training/train.py
git commit -m "feat: implement training loop"
```

---

### Task 5: Implement Model Export to TensorFlow.js

**Files:**
- Create: `training/export_tfjs.py`

- [ ] **Step 1: Write export script**

```python
import torch
import json
from pathlib import Path
from models import PolicyValueNetwork
import numpy as np

def export_to_tfjs(pt_path, output_dir, model_name):
    """
    Convert PyTorch model to TensorFlow.js format.
    
    Args:
        pt_path: Path to .pt file
        output_dir: Directory to save TensorFlow.js files
        model_name: Name prefix (e.g., 'firststart')
    """
    import onnx
    from onnx2tf import convert
    
    # Load PyTorch model
    model = PolicyValueNetwork()
    model.load_state_dict(torch.load(pt_path, map_location='cpu'))
    model.eval()
    
    # Convert to ONNX
    dummy_input = torch.randn(1, 80)
    onnx_path = Path(output_dir) / f'{model_name}_model.onnx'
    
    torch.onnx.export(
        model,
        dummy_input,
        str(onnx_path),
        input_names=['input'],
        output_names=['policy', 'value'],
        opset_version=12
    )
    
    print(f"Exported to ONNX: {onnx_path}")
    
    # Convert ONNX to TensorFlow.js
    # Note: this requires tensorflowjs installed
    import subprocess
    subprocess.run([
        'python', '-m', 'onnx_tf.backend',
        str(onnx_path),
        '--output', str(Path(output_dir) / model_name)
    ])
    
    print(f"Exported to TFLite: {Path(output_dir) / model_name}")

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', required=True, choices=['firststart', 'secondstart'])
    parser.add_argument('--generation', type=int, required=True)
    args = parser.parse_args()
    
    pt_path = Path(f'training/models/{args.model}_v{args.generation}.pt')
    output_dir = Path('models')
    output_dir.mkdir(exist_ok=True)
    
    export_to_tfjs(pt_path, output_dir, args.model)
    print(f"Done! Model ready for browser: {output_dir}/{args.model}_latest.*")

if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Update requirements.txt**

```bash
echo "onnx==1.14.0
onnx2tf==1.10.0
tensorflowjs==4.0.0" >> training/requirements.txt
```

- [ ] **Step 3: Commit**

```bash
git add training/export_tfjs.py training/requirements.txt
git commit -m "feat: add model export to TensorFlow.js"
```

---

### Task 6: Run Initial Training

**Files:**
- None (model checkpoints created)

- [ ] **Step 1: Install dependencies**

```bash
cd training && pip install -r requirements.txt
```

- [ ] **Step 2: Run training (background)**

```bash
python train.py --generations 20 --games-per-gen 20
# This will take 4-12 hours depending on GPU
# Monitor via training_log.csv
```

- [ ] **Step 3: Export YELLOW model only**

```bash
python export_tfjs.py --model secondstart --generation 19
# Creates models/secondstart_latest.json, models/secondstart_latest_weights.bin
# (firststart model trained but NOT exported - only secondstart used in browser)
```

- [ ] **Step 4: Commit models (optional, .gitignore large .pt files)**

```bash
git add models/*.json models/*_weights.bin .gitignore
# Add to .gitignore: training/models/*.pt (keep TFLite exports)
git commit -m "feat: add trained neural network models (TFLite format)"
```

---

## Phase 2: Browser Integration

### Task 7: Implement MCTS Search in JavaScript

**Files:**
- Modify: `index.html` (add MCTS function after zobristHash)

- [ ] **Step 1: Add MCTS search function**

```javascript
// ── Monte Carlo Tree Search with Network Guidance ───────────────────
class MCTSNode {
  constructor(board, stock, move = null) {
    this.board = JSON.parse(JSON.stringify(board));
    this.stock = JSON.parse(JSON.stringify(stock));
    this.move = move;
    this.visits = 0;
    this.value = 0; // Accumulated value
    this.children = [];
    this.parent = null;
  }
}

async function mctsSearch(board, stock, aiColor, network, simulations = 200, timeLimit = 5000) {
  const startTime = Date.now();
  const root = new MCTSNode(board, stock);
  
  let simulationCount = 0;
  while (simulationCount < simulations && Date.now() - startTime < timeLimit) {
    // Selection + Expansion
    let node = root;
    let path = [node];
    
    while (node.children.length > 0 && Date.now() - startTime < timeLimit) {
      // UCB1 selection with network policy bias
      let bestChild = null;
      let bestUCB = -Infinity;
      
      for (const child of node.children) {
        const exploitation = child.value / (child.visits || 1);
        const exploration = Math.sqrt(Math.log(node.visits) / (child.visits || 1));
        const ucb = exploitation + exploration;
        
        if (ucb > bestUCB) {
          bestUCB = ucb;
          bestChild = child;
        }
      }
      
      node = bestChild;
      path.push(node);
    }
    
    // Expansion: generate children if not terminal
    if (node.children.length === 0 && !isTerminal(node.board, node.stock)) {
      const moves = getAllMoves(aiColor === 'red' ? 'red' : 'yellow');
      
      for (const move of moves) {
        const childBoard = JSON.parse(JSON.stringify(node.board));
        const childStock = JSON.parse(JSON.stringify(node.stock));
        
        // Make move
        const r = move.cell.row, c = move.cell.col;
        childBoard[r][c].piece = { color: aiColor, size: move.size };
        childStock[aiColor][move.size]--;
        
        const child = new MCTSNode(childBoard, childStock, move);
        child.parent = node;
        node.children.push(child);
      }
    }
    
    // Evaluation: use network value estimate
    const boardEncoding = encodeBoardForNetwork(node.board);
    const [policy, value] = await network.predict(boardEncoding);
    
    const nodeValue = value[0][0]; // Value in [-1, +1]
    
    // Backup: propagate value up tree
    for (const n of path) {
      n.visits++;
      n.value += nodeValue;
    }
    
    simulationCount++;
  }
  
  // Return best move (highest visit count = most explored = best estimate)
  let bestMove = null;
  let maxVisits = 0;
  
  for (const child of root.children) {
    if (child.visits > maxVisits) {
      maxVisits = child.visits;
      bestMove = child.move;
    }
  }
  
  return bestMove;
}

function encodeBoardForNetwork(board) {
  // Convert 4x4 board to 80-dim encoding (16 cells × 5 states each)
  const encoding = new Array(80).fill(0);
  
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const cellIdx = r * 4 + c;
      const piece = board[r][c].piece;
      
      if (!piece) {
        // Empty: encoding[cellIdx*5+0] = 1 (implicit, stay 0)
      } else {
        const stateMap = {
          'red-small': 1,
          'red-large': 2,
          'yellow-small': 3,
          'yellow-large': 4
        };
        const state = `${piece.color}-${piece.size}`;
        encoding[cellIdx * 5 + stateMap[state]] = 1;
      }
    }
  }
  
  return tf.tensor2d([encoding]); // (1, 80)
}

function isTerminal(board, stock) {
  return checkWin('red') || checkWin('yellow') || !hasValidMoves('red') || !hasValidMoves('yellow');
}
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: implement MCTS search with network guidance"
```

---

### Task 8: Add Model Loading to Browser

**Files:**
- Modify: `index.html` (add model loading at game start)

- [ ] **Step 1: Add model loading code**

```javascript
// ── Neural Network Model Loading ────────────────────────────────────
let neuralNetworkModel = null;  // YELLOW model only

async function loadNeuralModel() {
  console.log('Loading neural network model (YELLOW)...');
  
  try {
    // Load secondstart (YELLOW) model - AI always uses this when playing as YELLOW (moves second)
    neuralNetworkModel = await tf.loadGraphModel('models/secondstart_latest/model.json');
    console.log('✓ Loaded YELLOW neural model');
  } catch (err) {
    console.error('Failed to load neural model:', err);
    neuralNetworkModel = null;
  }
}

// Call at game initialization (in startGame function)
// Add before game board is built:
async function startGame(diff) {
  difficulty = diff;
  
  if (difficulty === 'neural') {
    if (!neuralNetworkModel) {
      await loadNeuralModel();
    }
  }
  
  // ... rest of startGame
}
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add neural model loading at game start"
```

---

### Task 9: Add NEURAL Difficulty to UI

**Files:**
- Modify: `index.html` (difficulty selector buttons)

- [ ] **Step 1: Find difficulty buttons and add NEURAL**

Find the buttons section (around line 530-535) and add:

```html
<button onclick="startGame('neural')">🧠 NEURAL</button>
```

Place it after DEMON3. Update description if needed.

- [ ] **Step 2: Verify startGame handles 'neural'**

Ensure `if (difficulty === 'neural')` cases are handled in startGame and pcMove.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add NEURAL difficulty option to UI"
```

---

### Task 10: Implement pcMoveNeural Function

**Files:**
- Modify: `index.html` (add neural AI move function)

- [ ] **Step 1: Add pcMoveNeural function**

```javascript
async function pcMoveNeural() {
  if (!gameActive) return;
  
  // Use YELLOW (secondstart) model - AI always moves as YELLOW (second player)
  if (!neuralNetworkModel) {
    console.error('Neural network model not loaded');
    pcMove(); // Fallback to DEMON3
    return;
  }
  
  const startTime = Date.now();
  const timeLimit = 5000; // 5 seconds
  
  try {
    // Run MCTS search with YELLOW model
    const bestMove = await mctsSearch(cells, stock, current, neuralNetworkModel, 200, timeLimit);
    
    if (!bestMove) {
      console.error('MCTS returned no move');
      return;
    }
    
    // Make the move
    placepiece(bestMove.cell.row, bestMove.cell.col, bestMove.size);
    
  } catch (err) {
    console.error('Neural AI error:', err);
    // Fallback
    const moves = generateMoves(cells, stock, current);
    if (moves.length > 0) {
      placepiece(moves[0].cell.row, moves[0].cell.col, moves[0].size);
    }
  }
  
  thinking = false;
}
```

- [ ] **Step 2: Update pcMove to route to pcMoveNeural**

Find the pcMove function (around line 2710) and add:

```javascript
function pcMove() {
  if (difficulty === 'neural') {
    pcMoveNeural();
    return;
  }
  
  // ... rest of pcMove (for DEMON difficulties)
}
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: implement pcMoveNeural for NEURAL difficulty"
```

---

### Task 11: Add TensorFlow.js Library

**Files:**
- Modify: `index.html` (add script tag)

- [ ] **Step 1: Add TensorFlow.js to head**

In the `<head>` section, add:

```html
<script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest"></script>
```

Place before the closing `</head>` tag.

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add TensorFlow.js library dependency"
```

---

### Task 12: Test Model Loading and Inference

**Files:**
- None (testing only)

- [ ] **Step 1: Start game with NEURAL difficulty**

1. Open `index.html` in browser
2. Click "🧠 NEURAL" button
3. Watch console (F12) for model loading messages
4. Should see "✓ Loaded YELLOW neural model"

- [ ] **Step 2: Play one game vs NEURAL**

1. Play as RED (you move first)
2. Make a move
3. Wait for NEURAL to respond as YELLOW (5 sec max)
4. Check for:
   - No JS errors in console
   - Move appears within 5 seconds
   - Move is legal
   - Thinking display updates correctly

- [ ] **Step 3: Play multiple games**

1. Play 3+ complete games
2. NEURAL always uses YELLOW model (moves second)
3. Verify consistency and correctness of moves

- [ ] **Step 4: Commit if all passes**

```bash
git add index.html
git commit -m "test: verify neural model loads and infers correctly"
```

---

### Task 13: Performance Optimization (if needed)

**Files:**
- Modify: `index.html` (MCTS parameters)

- [ ] **Step 1: Profile performance**

If MCTS takes > 5 sec:
- Reduce simulation count from 200 to 100
- Reduce time limit if needed
- Monitor with console.time()

- [ ] **Step 2: Optimize if slow**

```javascript
// Adjust in mctsSearch call:
const bestMove = await mctsSearch(
  cells, stock, current, network,
  100,   // Reduce simulations if needed
  4500   // Reduce time budget slightly for safety
);
```

- [ ] **Step 3: Commit if optimized**

```bash
git add index.html
git commit -m "perf: optimize MCTS simulation count for 5sec budget"
```

---

## Verification Checklist

- [ ] Python training environment set up (requirements.txt, README)
- [ ] Network architecture defined (Policy+Value)
- [ ] Self-play game engine works (no crashes)
- [ ] Training loop runs without errors
- [ ] Models export to TensorFlow.js format
- [ ] Initial models trained (v0 through v19+)
- [ ] Models loaded in browser without errors
- [ ] MCTS search completes in < 5 seconds
- [ ] NEURAL difficulty appears in UI
- [ ] AI makes legal moves
- [ ] No console errors during gameplay
- [ ] Performance is smooth (no UI freezes)
- [ ] All commits in git log

---

## Timeline

- **Phase 1 (Python training):** 1-2 hours setup + 4-12 hours training (background)
- **Phase 2 (Browser integration):** 3-4 hours implementation + testing
- **Total: 2-3 days** (with training running in parallel)

