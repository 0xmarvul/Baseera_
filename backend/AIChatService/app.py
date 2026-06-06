from datetime import datetime, timezone

from flask import Flask, request, jsonify
from flask_cors import CORS

from engine import analyze

app = Flask(__name__)
CORS(app)


@app.route("/health", methods=["GET"])
def health():
    # Cheap probe used by hosting platforms and UptimeRobot to keep the
    # Hugging Face Space awake (and to alert if it dies). No auth, no rate
    # limit, no DB hit — just confirms the Python process is responding.
    return jsonify({
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "Baseera AI",
    })


@app.route("/analyze", methods=["POST"])
def analyze_message():
    data = request.get_json(silent=True) or {}
    message = data.get("message", "").strip()

    if not message:
        return jsonify({"error": "message is required"}), 400

    result = analyze(message)
    return jsonify(result)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)
