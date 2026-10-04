# Deployment Guide: Local Execution & Zoho Catalyst AppSail

## 1. Local Development Execution

### Prerequisites
- Python 3.10+ (tested on Python 3.12)
- Git

### Setup & Launch
```bash
# 1. Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\activate   # Windows (or: source .venv/bin/activate on Linux/macOS)

# 2. Install production dependencies
pip install -r requirements.txt

# 3. Launch unified server (FastAPI serves API + static HTML/CSS/JS frontend)
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```
Open [http://localhost:8000](http://localhost:8000) in your web browser.

---

## 2. Deployment to Zoho Catalyst AppSail

The project is structured to deploy as a unified single-service **Catalyst AppSail** application:
- `backend/main.py` detects the dynamic port variable `X_ZOHO_CATALYST_LISTEN_PORT`.
- FastAPI mounts `frontend/` as static files on the root `/`, eliminating cross-origin CORS complexity.

### Option A: AppSail Managed Python Runtime (Fastest)
1. Verify `app-config.json` at project root:
   ```json
   {
     "command": "python -m uvicorn backend.main:app --host 0.0.0.0 --port $X_ZOHO_CATALYST_LISTEN_PORT",
     "health_check": {
       "path": "/api/health",
       "status_code": 200,
       "timeout": 15
     },
     "stack": "python3.12"
   }
   ```
2. Initialize or deploy via Catalyst CLI:
   ```bash
   catalyst appsail:deploy
   ```

### Option B: AppSail Custom Docker Container (Recommended for Qiskit C++ Wheels)
Because `qiskit` and `qiskit-aer` bundle native C++ Clifford stabilizer simulation engines, the provided `Dockerfile` compiles cleanly on Linux `python:3.12-slim`:
```bash
docker build -t bb84-simulator .
docker run -p 8000:8000 -e X_ZOHO_CATALYST_LISTEN_PORT=8000 bb84-simulator
```
Push the container to Zoho Catalyst AppSail container registry or deploy directly through the Catalyst Console.

---

## 3. Post-Deployment Verification Checklist

Once deployed to your live Catalyst URL:
1. **Health Check:** `curl https://<app-domain>/api/health` returns `{"status":"ok"}`.
2. **Clean Baseline:** Run simulation with Eve OFF. Confirm QBER is approximately `0.0%` and verdict is `ACCEPTED`.
3. **Eavesdropping Detection:** Run simulation with Eve ON (100% intercept). Confirm QBER is approximately `25%` ($\pm 3\%$) and verdict is `ABORTED`.
4. **Interactive Ledger:** Click a row in the ledger and confirm the Qiskit Circuit Drawer displays Alice and Bob circuits.
5. **PDF Export:** Click **Download PDF Report** and confirm the server streams a valid binary PDF document.
