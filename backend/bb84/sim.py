"""Low-level Qiskit Aer execution helpers.

Every qubit in BB84 is independent (a product state), so we pack many qubits
into one circuit and run it once with ``shots=1``. Because the protocol only
uses Clifford gates (X, H, I) and Pauli noise, Aer's *stabilizer* method
simulates these circuits exactly and very quickly.
"""
from __future__ import annotations

from typing import Callable

import numpy as np
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator
from qiskit_aer.noise import NoiseModel

CHUNK = 64  # qubits per circuit; stabilizer cost grows ~n^3 with width
BACKEND_NAME = "AerSimulator"
METHOD = "stabilizer"
SHOTS = 1


def run_one_shot(
    n: int,
    build: Callable[[QuantumCircuit, int, int], None],
    seed: int,
    noise_model: NoiseModel | None = None,
) -> np.ndarray:
    """Build and run ``n`` independent single-qubit experiments in chunks.

    ``build(qc, local_qubit, global_index)`` appends the gates for one qubit.
    A measurement into the matching classical bit is added automatically.
    Returns an int8 array of measured bits (length ``n``).
    """
    if n == 0:
        return np.zeros(0, dtype=np.int8)
    circuits: list[QuantumCircuit] = []
    for start in range(0, n, CHUNK):
        width = min(CHUNK, n - start)
        qc = QuantumCircuit(width, width)
        for q in range(width):
            build(qc, q, start + q)
        qc.measure(range(width), range(width))
        circuits.append(qc)

    sim = AerSimulator(method=METHOD, noise_model=noise_model, seed_simulator=seed)
    result = sim.run(circuits, shots=SHOTS).result()

    out = np.empty(n, dtype=np.int8)
    for k, qc in enumerate(circuits):
        key = next(iter(result.get_counts(k))).replace(" ", "")
        # Qiskit bitstrings are little-endian: clbit 0 is the right-most char.
        bits = np.frombuffer(key[::-1].encode(), dtype=np.uint8) - ord("0")
        out[k * CHUNK : k * CHUNK + qc.num_qubits] = bits
    return out
