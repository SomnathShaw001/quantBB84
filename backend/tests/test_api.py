"""API endpoint tests using FastAPI TestClient."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_simulate_clean():
    payload = {
        "n_qubits": 600,
        "seed": 42,
        "eve": {"enabled": False},
        "noise": {"depolarizing": 0.0, "bitflip": 0.0, "loss": 0.0},
        "sample_fraction": 0.25,
        "qber_threshold": 0.11,
        "message": "secure message",
        "save": True,
    }
    res = client.post("/api/simulate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "id" in data
    assert data["qber"]["value"] == 0.0
    assert data["verdict"]["status"] == "accepted"
    assert data["keys"]["final_match"] is True
    assert data["message"]["decrypted"] == "secure message"

    sim_id = data["id"]

    # Check history listing
    hist_res = client.get("/api/simulations?limit=5")
    assert hist_res.status_code == 200
    hist = hist_res.json()
    assert any(item["id"] == sim_id for item in hist)

    # Check single retrieve
    single_res = client.get(f"/api/simulations/{sim_id}")
    assert single_res.status_code == 200
    assert single_res.json()["id"] == sim_id

    # Check qubits endpoint with filtering
    q_res = client.get(f"/api/simulations/{sim_id}/qubits?role=key&page=1&page_size=10")
    assert q_res.status_code == 200
    q_data = q_res.json()
    assert len(q_data["items"]) <= 10
    assert all(q["role"] == "key" for q in q_data["items"])

    # Check circuit inspector
    circ_res = client.get(f"/api/circuit/{sim_id}/1")
    assert circ_res.status_code == 200
    circ = circ_res.json()
    assert "alice" in circ
    assert "bob" in circ
    assert circ["eve"] is None

    # Check PDF export
    pdf_res = client.get(f"/api/simulations/{sim_id}/report.pdf")
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF-")


def test_simulate_with_eve_aborts():
    payload = {
        "n_qubits": 500,
        "seed": 99,
        "eve": {"enabled": True, "fraction": 1.0, "strategy": "random"},
        "noise": {"depolarizing": 0.0, "bitflip": 0.0, "loss": 0.0},
        "sample_fraction": 0.5,
        "qber_threshold": 0.11,
    }
    res = client.post("/api/simulate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["verdict"]["status"] == "aborted"
    assert data["qber"]["value"] > 0.11


def test_step_endpoint():
    payload = {
        "n_qubits": 50,
        "seed": 12,
        "eve": {"enabled": True, "fraction": 1.0},
    }
    res = client.post("/api/step?step_idx=2", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["step"] == 2
    assert "qubit" in data
    assert "circuit_inspect" in data


def test_sweep_endpoint():
    payload = {
        "parameter": "eve_fraction",
        "points": 3,
        "repeats": 1,
        "n_qubits": 100,
        "seed": 7,
    }
    res = client.post("/api/sweep", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data["points"]) == 3
    assert "theory_qber" in data["points"][0]


def test_compare_endpoint():
    payload = {
        "runs": 2,
        "n_qubits": 60,
        "eve_fraction": 1.0,
        "seed": 5,
    }
    res = client.post("/api/compare", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data["eve_off"]) == 2
    assert len(data["eve_on"]) == 2
