# Hugging Face Spaces (Docker SDK) builds and runs this image.
# HF exposes port 7860 and routes all traffic there, so we bind Flask to 7860
# instead of the local-dev default 5001. WORKDIR and a non-root user satisfy
# HF Spaces' filesystem and security expectations.

FROM python:3.11-slim

# python-Levenshtein needs gcc + python headers to build a C extension wheel
# on Linux. Slim install + remove apt lists to keep the image small.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces requires a non-root user for the runtime.
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1

WORKDIR $HOME/app

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

COPY --chown=user . .

EXPOSE 7860

# gunicorn is more robust than the Flask dev server for production traffic.
# 2 workers fits comfortably in the free-tier 2 vCPU. Long timeout so
# fuzzy-matching against the keyword index never times out under load.
RUN pip install --no-cache-dir --user gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:7860", "--workers", "2", "--timeout", "60", "app:app"]
