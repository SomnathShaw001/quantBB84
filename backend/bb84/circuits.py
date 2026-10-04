"""Per-qubit circuit views for the inspector (Alice / Eve / Bob).

These circuits are rebuilt from the stored record of a real run, using the
same ``prepare`` / ``transmit`` functions that the simulation used, so what the
user sees is exactly what was executed.
"""
from __future__ import annotations

from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector

from . import alice as A
from .channel import transmit

BASIS = {"Z": A.Z, "X": A.X}
ANGLE = {"|0⟩": 0, "|1⟩": 90, "|+⟩": 45, "|−⟩": 135}  # polarization, degrees


def _gates(qc: QuantumCircuit) -> list[str]:
    return [inst.operation.name for inst in qc.data]


def _draw(qc: QuantumCircuit) -> str:
    return str(qc.draw(output="text", fold=-1))


def _probs(bit: int, basis: int, meas_basis: int) -> list[float]:
    """Noiseless outcome probabilities when measuring a prepared state."""
    qc = QuantumCircuit(1)
    A.prepare(qc, 0, bit, basis)
    if meas_basis == A.X:
        qc.h(0)
    p = Statevector(qc).probabilities()
    return [round(float(p[0]), 6), round(float(p[1]), 6)]


def _amplitudes(bit: int, basis: int) -> list[list[float]]:
    qc = QuantumCircuit(1)
    A.prepare(qc, 0, bit, basis)
    sv = Statevector(qc).data
    return [[round(float(a.real), 6), round(float(a.imag), 6)] for a in sv]


def inspect(rec: dict) -> dict:
    a_bit, a_basis = rec["a_bit"], BASIS[rec["a_basis"]]

    alice = QuantumCircuit(1, name="alice")
    A.prepare(alice, 0, a_bit, a_basis)
    out = {
        "i": rec["i"],
        "alice": {
            "circuit": _draw(alice),
            "gates": _gates(alice),
            "state": rec["state"],
            "angle": ANGLE[rec["state"]],
            "amplitudes": _amplitudes(a_bit, a_basis),
        },
        "eve": None,
    }

    src_bit, src_basis, src_state = a_bit, a_basis, rec["state"]
    if rec["eve"]:
        e_basis = BASIS[rec["e_basis"]]
        eve = QuantumCircuit(1, 1, name="eve")
        A.prepare(eve, 0, a_bit, a_basis)
        eve.barrier()
        if e_basis == A.X:
            eve.h(0)
        eve.measure(0, 0)
        eve.reset(0)
        A.prepare(eve, 0, rec["e_bit"], e_basis)
        src_bit, src_basis = rec["e_bit"], e_basis
        src_state = A.STATE_NAME[(src_bit, src_basis)]
        out["eve"] = {
            "circuit": _draw(eve),
            "gates": _gates(eve),
            "basis": rec["e_basis"],
            "bit": rec["e_bit"],
            "probabilities": _probs(a_bit, a_basis, e_basis),
            "resent_state": src_state,
            "resent_angle": ANGLE[src_state],
        }

    b_basis = BASIS[rec["b_basis"]]
    bob = QuantumCircuit(1, 1, name="bob")
    A.prepare(bob, 0, src_bit, src_basis)
    bob.barrier()
    transmit(bob, 0)
    if b_basis == A.X:
        bob.h(0)
    bob.measure(0, 0)
    out["bob"] = {
        "circuit": _draw(bob),
        "gates": _gates(bob),
        "basis": rec["b_basis"],
        "bit": rec["b_bit"],
        "lost": rec["lost"],
        "incoming_state": src_state,
        "probabilities": _probs(src_bit, src_basis, b_basis),
    }
    out["result"] = {"match": rec["match"], "error": rec["error"], "role": rec["role"]}
    return out
