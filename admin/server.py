import json
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory
from werkzeug.utils import secure_filename

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_FILE = BASE_DIR / "data" / "data.json"
ASSETS_DIR = BASE_DIR / "assets"
AUDIO_DIR = ASSETS_DIR / "audio"
IMAGES_DIR = ASSETS_DIR / "images"

# Création automatique des dossiers si absents
for folder in (DATA_FILE.parent, AUDIO_DIR, IMAGES_DIR):
    folder.mkdir(parents=True, exist_ok=True)

app = Flask(__name__, static_folder=None)


@app.route("/")
def serve_admin():
    return send_from_directory(Path(__file__).resolve().parent, "admin.html")


@app.route("/assets/<path:filename>")
def serve_assets(filename):
    return send_from_directory(ASSETS_DIR, filename)


@app.route("/api/data", methods=["GET"])
def get_data():
    if not DATA_FILE.exists():
        return jsonify({"profile": {}, "projects": []})
    with DATA_FILE.open("r", encoding="utf-8") as f:
        return jsonify(json.load(f))


@app.route("/api/data", methods=["POST"])
def save_data():
    payload = request.get_json(force=True)
    with DATA_FILE.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    return jsonify({"status": "ok"})


@app.route("/api/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "Aucun fichier reçu"}), 400

    file = request.files["file"]
    upload_type = request.form.get("type", "image")

    if not file.filename:
        return jsonify({"error": "Nom de fichier vide"}), 400

    filename = secure_filename(file.filename)

    if upload_type == "audio":
        dest = AUDIO_DIR / filename
        rel_path = f"assets/audio/{filename}"
    elif upload_type == "cv":
        dest = ASSETS_DIR / "cv.pdf"
        rel_path = "assets/cv.pdf"
    else:
        dest = IMAGES_DIR / filename
        rel_path = f"assets/images/{filename}"

    file.save(dest)
    return jsonify({"path": rel_path})


if __name__ == "__main__":
    print("Admin Portfolio lancé sur http://localhost:5000")
    app.run(host="127.0.0.1", port=5000, debug=True)