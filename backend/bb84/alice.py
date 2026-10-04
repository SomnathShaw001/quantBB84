"""Alice: random bits, random bases, and BB84 state preparation.

Encoding (basis 0 = Z / rectilinear "+", basis 1 = X / diagonal "x"):

    Z, 0 -> |0>          (no gate)
    Z, 1 -> |1>          X
    X, 0 -> |+>          H
    X, 1 -> |->          X then H
"""
from __future__ import annotations

import numpy as np
from qiskit import QuantumCircuit

Z, X = 0, 1
BASIS_NAME = {Z: "Z", X: "X"}
STATE_NAME = {(0, Z): "|0⟩", (1, Z): "|1⟩", (0, X): "|+⟩", (1, X): "|−⟩"}


def generate(n: int, rng: np.random.Generator) -> tuple[np.ndarray, np.ndarray]:
    """Return (bits, bases), each a uniform random int8 array of length n."""
    bits = rng.integers(0, 2, n, dtype=np.int8)
    bases = rng.integers(0, 2, n, dtype=np.int8)
    return bits, bases


def prepare(qc: QuantumCircuit, q: int, bit: int, basis: int) -> None:
    """Append the gates that encode ``bit`` in ``basis`` on qubit ``q``."""
    if bit:
        qc.x(q)
    if basis == X:
        qc.h(q)
