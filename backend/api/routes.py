"""FastAPI router implementing all BB84 simulation endpoints."""
from __future__ import annotations

import uuid
from typing import Any

import numpy as np
from fastapi import APIRouter, HTTPException, Query, Response

from ..bb84.circuits import inspect
from ..bb84.eve import EveConfig
from ..bb84.channel import NoiseConfig
from ..bb84.protocol import SimConfig, run_simulation
from ..bb84.theory import expected_qber, key_rate
from ..report_pdf import generate_pdf_report
from ..storage import get_simulation, list_simulations, save_simulation
from .schemas import CompareIn, SimulateIn, SweepIn

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "BB84 Quantum Key Distribution Simulator"}


@router.post("/simulate")
def simulate(req: SimulateIn) -> dict[str, Any]:
    cfg = SimConfig(
        n_qubits=req.n_qubits,
        seed=req.seed,
        eve=EveConfig(
            enabled=req.eve.enabled,
            fraction=req.eve.fraction,
            strategy=req.eve.strategy,
        ),
        noise=NoiseConfig(
            depolarizing=req.noise.depolarizing,
            bitflip=req.noise.bitflip,
            loss=req.noise.loss,
        ),
        sample_fraction=req.sample_fraction,
        qber_threshold=req.qber_threshold,
        message=req.message,
    )
    result = run_simulation(cfg)
    sim_id = f"sim-{uuid.uuid4().hex[:8]}"
    result["id"] = sim_id

    if req.save:
        save_simulation(sim_id, result)

    return result


@router.post("/step")
def step(req: SimulateIn, step_idx: int = Query(1, ge=1)) -> dict[str, Any]:
    """Execute simulation and return step item with circuit inspect data."""
    if step_idx > req.n_qubits:
        raise HTTPException(status_code=400, detail=f"step_idx {step_idx} exceeds n_qubits {req.n_qubits}")
    
    cfg = SimConfig(
        n_qubits=req.n_qubits,
        seed=req.seed,
        eve=EveConfig(
            enabled=req.eve.enabled,
            fraction=req.eve.fraction,
            strategy=req.eve.strategy,
        ),
        noise=NoiseConfig(
            depolarizing=req.noise.depolarizing,
            bitflip=req.noise.bitflip,
            loss=req.noise.loss,
        ),
        sample_fraction=req.sample_fraction,
        qber_threshold=req.qber_threshold,
        message=req.message,
    )
    res = run_simulation(cfg)
    target_qubit = res["qubits"][step_idx - 1]
    inspection = inspect(target_qubit)

    return {
        "step": step_idx,
        "total": req.n_qubits,
        "seed": res["seed"],
        "qubit": target_qubit,
        "circuit_inspect": inspection,
        "qber_so_far": res["qber"],
    }


@router.post("/sweep")
def sweep(req: SweepIn) -> dict[str, Any]:
    """Parameter sweep returning simulated points, error bars, and theoretical curves."""
    results = []
    points = req.points
    rng = np.random.default_rng(req.seed)

    if req.parameter == "eve_fraction":
        param_values = np.linspace(0.0, 1.0, points)
    elif req.parameter == "depolarizing":
        param_values = np.linspace(0.0, 0.4, points)
    else:  # n_qubits
        param_values = np.linspace(50, req.n_qubits, points, dtype=int)

    for val in param_values:
        qber_runs = []
        final_len_runs = []
        matched_runs = []

        cur_eve = EveConfig(
            enabled=req.eve.enabled,
            fraction=float(val) if req.parameter == "eve_fraction" else req.eve.fraction,
            strategy=req.eve.strategy,
        )
        cur_noise = NoiseConfig(
            depolarizing=float(val) if req.parameter == "depolarizing" else req.noise.depolarizing,
            bitflip=req.noise.bitflip,
            loss=req.noise.loss,
        )
        cur_n = int(val) if req.parameter == "n_qubits" else req.n_qubits

        for _ in range(req.repeats):
            run_seed = int(rng.integers(0, 2**31 - 1))
            cfg = SimConfig(
                n_qubits=cur_n,
                seed=run_seed,
                eve=cur_eve,
                noise=cur_noise,
                sample_fraction=req.sample_fraction,
                qber_threshold=req.qber_threshold,
            )
            out = run_simulation(cfg)
            if out["qber"]["value"] is not None:
                qber_runs.append(out["qber"]["value"])
            final_len_runs.append(out["stages"]["final"])
            matched_runs.append(out["stages"]["matched"])

        mean_qber = float(np.mean(qber_runs)) if qber_runs else 0.0
        theory_qber = expected_qber(cur_eve, cur_noise)
        results.append({
            "param_value": round(float(val), 4),
            "simulated_qber": round(mean_qber, 4),
            "theory_qber": round(float(theory_qber), 4),
            "theory_key_rate": round(float(key_rate(theory_qber)), 4),
            "avg_final_len": round(float(np.mean(final_len_runs)), 1),
            "avg_matched": round(float(np.mean(matched_runs)), 1),
        })

    return {
        "parameter": req.parameter,
        "points": results,
        "threshold": req.qber_threshold,
    }


@router.post("/compare")
def compare(req: CompareIn) -> dict[str, Any]:
    """Run parallel batches of experiments: Eve OFF vs Eve ON."""
    rng = np.random.default_rng(req.seed)
    eve_off_series = []
    eve_on_series = []

    noise = NoiseConfig(
        depolarizing=req.noise.depolarizing,
        bitflip=req.noise.bitflip,
        loss=req.noise.loss,
    )

    for run_i in range(1, req.runs + 1):
        s1, s2 = int(rng.integers(0, 2**31 - 1)), int(rng.integers(0, 2**31 - 1))

        # Eve OFF
        cfg_off = SimConfig(
            n_qubits=req.n_qubits,
            seed=s1,
            eve=EveConfig(enabled=False),
            noise=noise,
            sample_fraction=req.sample_fraction,
            qber_threshold=req.qber_threshold,
        )
        r_off = run_simulation(cfg_off)
        eve_off_series.append({
            "run": run_i,
            "qber": r_off["qber"]["value"],
            "status": r_off["verdict"]["status"],
            "final_len": r_off["stages"]["final"],
        })

        # Eve ON
        cfg_on = SimConfig(
            n_qubits=req.n_qubits,
            seed=s2,
            eve=EveConfig(enabled=True, fraction=req.eve_fraction),
            noise=noise,
            sample_fraction=req.sample_fraction,
            qber_threshold=req.qber_threshold,
        )
        r_on = run_simulation(cfg_on)
        eve_on_series.append({
            "run": run_i,
            "qber": r_on["qber"]["value"],
            "status": r_on["verdict"]["status"],
            "final_len": r_on["stages"]["final"],
        })

    return {
        "runs": req.runs,
        "eve_fraction": req.eve_fraction,
        "threshold": req.qber_threshold,
        "eve_off": eve_off_series,
        "eve_on": eve_on_series,
    }


@router.get("/simulations")
def list_history(limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0)) -> list[dict]:
    return list_simulations(limit=limit, offset=offset)


@router.get("/simulations/{sim_id}")
def get_single(sim_id: str) -> dict[str, Any]:
    data = get_simulation(sim_id)
    if not data:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return data


@router.get("/simulations/{sim_id}/statistics")
def get_stats(sim_id: str) -> dict[str, Any]:
    data = get_simulation(sim_id)
    if not data:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return {
        "id": sim_id,
        "qber": data.get("qber"),
        "stages": data.get("stages"),
        "verdict": data.get("verdict"),
        "eve_stats": data.get("eve_stats"),
        "timing_ms": data.get("timing_ms"),
    }


@router.get("/simulations/{sim_id}/qubits")
def get_qubits_paginated(
    sim_id: str,
    role: str | None = None,
    match: bool | None = None,
    error: bool | None = None,
    eve: bool | None = None,
    sort_by: str = "i",
    order: str = "asc",
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
) -> dict[str, Any]:
    data = get_simulation(sim_id)
    if not data:
        raise HTTPException(status_code=404, detail="Simulation not found")

    qubits = data.get("qubits", [])

    # Filters
    if role:
        qubits = [q for q in qubits if q.get("role") == role]
    if match is not None:
        qubits = [q for q in qubits if q.get("match") == match]
    if error is not None:
        qubits = [q for q in qubits if q.get("error") == error]
    if eve is not None:
        qubits = [q for q in qubits if q.get("eve") == eve]

    # Sort
    reverse = (order.lower() == "desc")
    if sort_by in ["i", "a_bit", "b_bit", "e_bit", "a_basis", "b_basis", "role"]:
        qubits = sorted(qubits, key=lambda q: (q.get(sort_by) is not None, q.get(sort_by)), reverse=reverse)

    total = len(qubits)
    start = (page - 1) * page_size
    items = qubits[start : start + page_size]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": items,
    }


@router.get("/circuit/{sim_id}/{qubit_idx}")
def get_circuit_details(sim_id: str, qubit_idx: int) -> dict[str, Any]:
    data = get_simulation(sim_id)
    if not data:
        raise HTTPException(status_code=404, detail="Simulation not found")
    qubits = data.get("qubits", [])
    if qubit_idx < 1 or qubit_idx > len(qubits):
        raise HTTPException(status_code=400, detail="Qubit index out of range")
    target = qubits[qubit_idx - 1]
    return inspect(target)


@router.get("/simulations/{sim_id}/report.pdf")
def download_pdf(sim_id: str) -> Response:
    data = get_simulation(sim_id)
    if not data:
        raise HTTPException(status_code=404, detail="Simulation not found")
    pdf_bytes = generate_pdf_report(data)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=bb84_report_{sim_id}.pdf"},
    )
