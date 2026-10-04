"""Verify live running server."""
import httpx

base = "http://127.0.0.1:8000"

# 1. Clean simulation
r1 = httpx.post(f"{base}/api/simulate", json={"n_qubits": 200, "eve": {"enabled": False}}).json()
print("1. Clean Sim:", r1["id"], "Verdict:", r1["verdict"]["status"], "QBER:", r1["qber"]["value"])

# 2. Intercept Eve simulation
r2 = httpx.post(f"{base}/api/simulate", json={"n_qubits": 600, "eve": {"enabled": True, "fraction": 1.0}}).json()
print("2. Eve Sim:", r2["id"], "Verdict:", r2["verdict"]["status"], "QBER:", round(r2["qber"]["value"], 4))

# 3. PDF Download
pdf = httpx.get(f"{base}/api/simulations/{r2['id']}/report.pdf")
print("3. PDF Report:", pdf.status_code, "Length:", len(pdf.content), "Valid header:", pdf.content.startswith(b"%PDF-"))

# 4. Circuit inspection
circ = httpx.get(f"{base}/api/circuit/{r2['id']}/1").json()
print("4. Circuit 1 Alice:", circ["alice"]["gates"], "Eve:", circ["eve"]["gates"] if circ["eve"] else "None")

# 5. Sweep
sw = httpx.post(f"{base}/api/sweep", json={"parameter": "eve_fraction", "points": 5, "repeats": 1, "n_qubits": 100}).json()
print("5. Sweep points returned:", len(sw["points"]), "Max QBER:", max(p["simulated_qber"] for p in sw["points"]))

# 6. Compare
cmp = httpx.post(f"{base}/api/compare", json={"runs": 3, "n_qubits": 100, "eve_fraction": 1.0}).json()
print("6. Compare batches: Eve OFF runs:", len(cmp["eve_off"]), "Eve ON runs:", len(cmp["eve_on"]))
