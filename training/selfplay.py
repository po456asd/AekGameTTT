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
