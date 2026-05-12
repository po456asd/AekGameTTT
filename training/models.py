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
