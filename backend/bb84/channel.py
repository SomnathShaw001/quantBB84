"""Quantum channel: optional Pauli noise (via a Qiskit Aer noise model) and loss.

The channel is represented in every circuit by an identity gate ``id``. The
noise model attaches errors to that gate, so noise is genuinely simulated by
Aer rather than added afterwards.

* depolarizing p : rho -> (1-p) rho + p I/2   -> error probability p/2 in any basis
* bit-flip q     : X applied with probability q -> error q in Z basis, 0 in X basis
* loss l         : photon never reaches Bob (no detection), sampled classically
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from qiskit import QuantumCircuit
from qiskit_aer.noise import NoiseModel, depolarizing_error, pauli_error


@dataclass(frozen=True)
class NoiseConfig:
    depolarizing: float = 0.0
    bitflip: float = 0.0
    loss: float = 0.0

    @property
    def is_noiseless(self) -> bool:
        return self.depolarizing == 0 and self.bitflip == 0


def build_noise_model(cfg: NoiseConfig) -> NoiseModel | None:
    if cfg.is_noiseless:
        return None
    err = depolarizing_error(cfg.depolarizing, 1).compose(
        pauli_error([("X", cfg.bitflip), ("I", 1 - cfg.bitflip)])
    )
    model = NoiseModel()
    model.add_all_qubit_quantum_error(err, ["id"])
    return model


def transmit(qc: QuantumCircuit, q: int) -> None:
    """Mark the fibre segment on qubit ``q`` (noise attaches to this gate)."""
    qc.id(q)


def sample_loss(n: int, cfg: NoiseConfig, rng: np.random.Generator) -> np.ndarray:
    """Boolean mask of photons lost in the channel."""
    if cfg.loss <= 0:
        return np.zeros(n, dtype=bool)
    return rng.random(n) < cfg.loss
