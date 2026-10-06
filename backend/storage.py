"""Simulation persistence layer.

Provides a unified repository interface. Uses SQLite locally (and in AppSail
container persistent volume), easily pluggable into Catalyst Data Store.
"""
from __future__ import annotations

import json
import sqlite3
import time
import os
from pathlib import Path
from typing import Any

DB_PATH = Path(os.environ.get("DATABASE_PATH", "simulations.db"))


def init_db(db_path: Path = DB_PATH) -> None:
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS simulations (
                id TEXT PRIMARY KEY,
                created_at REAL,
                n_qubits INTEGER,
                eve_enabled INTEGER,
                eve_fraction REAL,
                noise_depol REAL,
                noise_bitflip REAL,
                noise_loss REAL,
                qber REAL,
                status TEXT,
                sifted_len INTEGER,
                final_len INTEGER,
                seed INTEGER,
                summary_json TEXT,
                data_json TEXT
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_sim_created ON simulations (created_at DESC)")


def save_simulation(sim_id: str, data: dict[str, Any], db_path: Path = DB_PATH) -> str:
    init_db(db_path)
    cfg = data.get("config", {})
    eve = cfg.get("eve", {})
    noise = cfg.get("noise", {})
    qber = data.get("qber", {}).get("value")
    stages = data.get("stages", {})
    verdict = data.get("verdict", {})

    summary = {
        "id": sim_id,
        "created_at": time.time(),
        "n_qubits": cfg.get("n_qubits", len(data.get("qubits", []))),
        "eve_enabled": eve.get("enabled", False),
        "eve_fraction": eve.get("fraction", 0.0),
        "qber": qber,
        "status": verdict.get("status", "unknown"),
        "status_title": verdict.get("title", ""),
        "sifted_len": stages.get("matched", 0),
        "final_len": stages.get("final", 0),
        "seed": data.get("seed"),
        "timing_ms": data.get("timing_ms"),
    }

    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO simulations (
                id, created_at, n_qubits, eve_enabled, eve_fraction,
                noise_depol, noise_bitflip, noise_loss, qber, status,
                sifted_len, final_len, seed, summary_json, data_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                sim_id,
                summary["created_at"],
                summary["n_qubits"],
                1 if summary["eve_enabled"] else 0,
                summary["eve_fraction"],
                noise.get("depolarizing", 0.0),
                noise.get("bitflip", 0.0),
                noise.get("loss", 0.0),
                qber if qber is not None else -1.0,
                summary["status"],
                summary["sifted_len"],
                summary["final_len"],
                summary["seed"],
                json.dumps(summary),
                json.dumps(data),
            ),
        )
    return sim_id


def list_simulations(limit: int = 20, offset: int = 0, db_path: Path = DB_PATH) -> list[dict]:
    init_db(db_path)
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.execute(
            "SELECT summary_json FROM simulations ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (limit, offset),
        )
        return [json.loads(row["summary_json"]) for row in cur.fetchall()]


def get_simulation(sim_id: str, db_path: Path = DB_PATH) -> dict[str, Any] | None:
    init_db(db_path)
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.execute("SELECT data_json FROM simulations WHERE id = ?", (sim_id,))
        row = cur.fetchone()
        if not row:
            return None
        return json.loads(row["data_json"])
