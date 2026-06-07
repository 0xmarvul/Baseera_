---
title: Baseera AI
emoji: 🛡️
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# Baseera AI

Cybersecurity vulnerability assistant for the Baseera platform. Exposes a
single POST `/analyze` endpoint that receives a user question and returns
an explanation + fix for the matched vulnerability (or a friendly
"didn't understand" reply for off-topic input).

Local dev: `python app.py` (binds 5001). On Hugging Face Spaces the
included Dockerfile binds gunicorn to port 7860 (the HF-required port).

Health: GET `/health` returns `{ status: "ok", timestamp, service }`.
