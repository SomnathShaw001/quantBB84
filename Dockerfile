FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY scripts/ ./scripts/
COPY main.py .

# Default AppSail port environment variable
ENV X_ZOHO_CATALYST_LISTEN_PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "python main.py"]
