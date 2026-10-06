import os
import sys

# Ensure root directory is in sys.path
root_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, root_dir)

import uvicorn
from backend.main import app

if __name__ == "__main__":
    raw_port = os.environ.get("X_ZOHO_CATALYST_LISTEN_PORT", os.environ.get("PORT", "8000"))
    try:
        port = int(raw_port)
    except (ValueError, TypeError):
        port = 8000
    print(f"Starting BB84 AppSail server on port {port}...", flush=True)
    uvicorn.run(app, host="0.0.0.0", port=port)
