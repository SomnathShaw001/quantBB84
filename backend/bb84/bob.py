"""Bob: random measurement bases and measurement of the arriving qubits."""
from __future__ import annotations

import numpy as np
from qiskit_aer.noise import NoiseModel

from . import alice as A
from .channel import transmit
from .sim import run_one_shot


def choose_bases(n: int, rng: np.random.Generator) -> np.ndarray:
    return rng.integers(0, 2, n, dtype=np.int8)


def measure(
    src_bits: np.ndarray,
    src_bases: np.ndarray,
    b_bases: np.ndarray,
    seed: int,
    noise_model: NoiseModel | None,
) -> np.ndarray:
    """Measure each incoming qubit.

    ``src_bits``/``src_bases`` describe the state actually on the fibre: Alice's
    state, or Eve's re-prepared state for intercepted qubits.
    """

    def build(qc, q, i):
        A.prepare(qc, q, int(src_bits[i]), int(src_bases[i]))
        transmit(qc, q)
        if b_bases[i] == A.X:
            qc.h(q)

    return run_one_shot(len(src_bits), build, seed, noise_model)
