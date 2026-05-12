"""
Direct export of PyTorch PolicyValueNetwork to TF.js Layers Model format.
Bypasses the broken tensorflowjs/tensorflow_hub dependency chain.

Architecture (from models.py):
  Input: (batch, 80)
  trunk: Linear(80->512)->ReLU -> Linear(512->256)->ReLU -> Linear(256->128)->ReLU
  policy_head: Linear(128->64)->ReLU -> Linear(64->16)   [logits]
  value_head:  Linear(128->64)->ReLU -> Linear(64->1)->Tanh

TF.js 4.x Layers Model (Keras functional) JSON format, verified from
tf.model(...).toJSON() output on TF.js 4.22.0.
"""

import sys
import json
import numpy as np
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import torch
from models import PolicyValueNetwork


def export(pt_path: str, output_dir: str) -> None:
    pt_path = Path(pt_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # ── Load PyTorch weights ──────────────────────────────────────────
    model = PolicyValueNetwork()
    model.load_state_dict(torch.load(str(pt_path), map_location='cpu'))
    model.eval()
    sd = model.state_dict()

    # ── Collect weights ───────────────────────────────────────────────
    # PyTorch Linear weight: (out, in) -> TF Dense kernel: (in, out)  [transposed]
    # Order must exactly match the weight manifest.
    layers_order = [
        # (pytorch_prefix, tfjs_layer_name, in_dim, out_dim)
        ('trunk.0',       'trunk_0',        80,  512),
        ('trunk.2',       'trunk_2',       512,  256),
        ('trunk.4',       'trunk_4',       256,  128),
        ('policy_head.0', 'policy_head_0', 128,   64),
        ('policy_head.2', 'policy_head_2',  64,   16),
        ('value_head.0',  'value_head_0',  128,   64),
        ('value_head.2',  'value_head_2',   64,    1),
    ]

    all_bytes = bytearray()
    manifest_weights = []

    for pt_prefix, tfjs_name, in_dim, out_dim in layers_order:
        w = sd[f'{pt_prefix}.weight'].detach().cpu().numpy().astype(np.float32)  # (out, in)
        b = sd[f'{pt_prefix}.bias'].detach().cpu().numpy().astype(np.float32)   # (out,)
        k = w.T  # (in, out) for TF Dense kernel

        manifest_weights.append({"name": f"{tfjs_name}/kernel", "shape": [in_dim, out_dim], "dtype": "float32"})
        all_bytes += k.tobytes()
        manifest_weights.append({"name": f"{tfjs_name}/bias", "shape": [out_dim], "dtype": "float32"})
        all_bytes += b.tobytes()

    # ── Write binary shard ────────────────────────────────────────────
    shard = "group1-shard1of1.bin"
    with open(str(output_dir / shard), 'wb') as f:
        f.write(all_bytes)
    print(f"  Weights shard: {output_dir / shard}  ({len(all_bytes):,} bytes)")

    # ── Build TF.js 4.x Layers Model JSON ────────────────────────────
    # inbound_nodes format (from tf.model().toJSON() on 4.22.0):
    #   [[ ["layer_name", node_idx, tensor_idx, {}] ]]
    def inbound(layer_name):
        return [[[layer_name, 0, 0, {}]]]

    def dense_layer(name, in_dim, out_dim, activation):
        return {
            "class_name": "Dense",
            "name": name,
            "config": {
                "name": name,
                "trainable": True,
                "dtype": "float32",
                "units": out_dim,
                "activation": activation,
                "use_bias": True,
                "kernel_initializer": {"class_name": "VarianceScaling",
                                       "config": {"scale": 1, "mode": "fan_avg",
                                                  "distribution": "normal", "seed": None}},
                "bias_initializer": {"class_name": "Zeros", "config": {}},
                "kernel_regularizer": None,
                "bias_regularizer": None,
                "activity_regularizer": None,
                "kernel_constraint": None,
                "bias_constraint": None
            }
        }

    layers = [
        # InputLayer
        {
            "class_name": "InputLayer",
            "name": "input_1",
            "config": {
                "batch_input_shape": [None, 80],
                "dtype": "float32",
                "sparse": False,
                "name": "input_1"
            },
            "inbound_nodes": []
        },
        # trunk
        {**dense_layer("trunk_0",  80, 512, "relu"), "inbound_nodes": inbound("input_1")},
        {**dense_layer("trunk_2", 512, 256, "relu"), "inbound_nodes": inbound("trunk_0")},
        {**dense_layer("trunk_4", 256, 128, "relu"), "inbound_nodes": inbound("trunk_2")},
        # policy head
        {**dense_layer("policy_head_0", 128,  64, "relu"),   "inbound_nodes": inbound("trunk_4")},
        {**dense_layer("policy_head_2",  64,  16, "linear"), "inbound_nodes": inbound("policy_head_0")},
        # value head
        {**dense_layer("value_head_0",  128,  64, "relu"),   "inbound_nodes": inbound("trunk_4")},
        {**dense_layer("value_head_2",   64,   1, "tanh"),   "inbound_nodes": inbound("value_head_0")},
    ]

    model_json = {
        "format": "layers-model",
        "generatedBy": "direct-pytorch-export",
        "convertedBy": None,
        "modelTopology": {
            "keras_version": "tfjs-layers 4.22.0",
            "backend": "tensor_flow.js",
            "class_name": "Model",
            "config": {
                "name": "policy_value_net",
                "layers": layers,
                "input_layers": [["input_1", 0, 0]],
                "output_layers": [["policy_head_2", 0, 0], ["value_head_2", 0, 0]]
            }
        },
        "weightsManifest": [
            {
                "paths": [shard],
                "weights": manifest_weights
            }
        ]
    }

    model_json_path = output_dir / "model.json"
    with open(str(model_json_path), 'w') as f:
        json.dump(model_json, f, indent=2)
    print(f"  Model JSON:   {model_json_path}")
    print("  Export complete.")


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', required=True, choices=['firststart', 'secondstart'])
    parser.add_argument('--generation', type=int, required=True)
    args = parser.parse_args()

    base = Path(__file__).parent
    pt_path = base / 'models' / f'{args.model}_v{args.generation}.pt'
    output_dir = base.parent / 'models' / f'{args.model}_latest'

    print(f"Exporting  {pt_path}")
    print(f"       ->  {output_dir}/")
    export(str(pt_path), str(output_dir))
