"""Request/response schemas with validation limits."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from ..bb84.protocol import MAX_QUBITS


class EveIn(BaseModel):
    enabled: bool = False
    fraction: float = Field(1.0, ge=0, le=1)
    strategy: Literal["random", "always_Z", "always_X"] = "random"


class NoiseIn(BaseModel):
    depolarizing: float = Field(0.0, ge=0, le=0.5)
    bitflip: float = Field(0.0, ge=0, le=0.5)
    loss: float = Field(0.0, ge=0, le=0.95)


class SimulateIn(BaseModel):
    n_qubits: int = Field(256, ge=1, le=MAX_QUBITS)
    seed: int | None = Field(None, ge=0, le=2**31 - 1)
    eve: EveIn = EveIn()
    noise: NoiseIn = NoiseIn()
    sample_fraction: float = Field(0.25, ge=0, le=0.9)
    qber_threshold: float = Field(0.11, ge=0, le=0.5)
    message: str = Field("", max_length=200)
    save: bool = True


class SweepIn(BaseModel):
    parameter: Literal["eve_fraction", "depolarizing", "n_qubits"] = "eve_fraction"
    points: int = Field(11, ge=2, le=21)
    repeats: int = Field(3, ge=1, le=10)
    n_qubits: int = Field(600, ge=16, le=3000)
    seed: int = Field(1, ge=0, le=2**31 - 1)
    eve: EveIn = EveIn(enabled=True)
    noise: NoiseIn = NoiseIn()
    sample_fraction: float = Field(0.5, gt=0, le=0.9)
    qber_threshold: float = Field(0.11, ge=0, le=0.5)


class CompareIn(BaseModel):
    runs: int = Field(10, ge=2, le=30)
    n_qubits: int = Field(400, ge=16, le=3000)
    eve_fraction: float = Field(1.0, ge=0, le=1)
    seed: int = Field(1, ge=0, le=2**31 - 1)
    noise: NoiseIn = NoiseIn()
    sample_fraction: float = Field(0.25, gt=0, le=0.9)
    qber_threshold: float = Field(0.11, ge=0, le=0.5)
