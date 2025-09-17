from flask import Flask, render_template, request, jsonify
from gtts import gTTS
import os
import uuid
import requests
import time

app = Flask(__name__, static_url_path="/static")

# ⚠️ RECOMMENDED: keep secrets out of source; use env vars.
# setx DID_API_KEY "your_base64_basic_auth_value"  (Windows)
DID_API_KEY = os.getenv("DID_API_KEY", "YOUR_DID_API_KEY")

# 🔗 Chat response via Ollama (local)
def chat_with_ollama(prompt: str) -> str:
    try:
        res = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": "llama3", "prompt": prompt, "stream": False},
            timeout=60
        )
        res.raise_for_status()
        return res.json().get("response", "No response from model.")
    except Exception as e:
        print("Error communicating with Ollama:", str(e))
        return "Sorry, I couldn't get a response from the model."

# 🗣️ Text-to-speech using gTTS
def text_to_audio(text: str) -> str:
    os.makedirs("static/audio", exist_ok=True)
    filename = f"{uuid.uuid4()}.mp3"
    audio_path = os.path.join("static/audio", filename)
    tts = gTTS(text)
    tts.save(audio_path)
    return audio_path

# 🧑‍🚀 Generate video using D-ID hosted avatar (returns a URL)
def generate_avatar_video_from_text(text: str):
    if not DID_API_KEY or DID_API_KEY == "REPLACE_ME_WITH_BASE64_BASIC_KEY":
        print("D-ID API key not configured. Set env var DID_API_KEY.")
        return None

    headers = {"Authorization": f"Basic {DID_API_KEY}"}
    payload = {
        "script": {
            "type": "text",
            "input": text,
            "provider": {
                "type": "microsoft",
                "voice_id": "en-US-JennyMultilingualNeural"
            },
            "ssml": False
        },
        "avatar_id": "amy"
    }

    try:
        create = requests.post("https://api.d-id.com/talks", json=payload, headers=headers, timeout=30)
        create.raise_for_status()
        talk_id = create.json().get("id")
        if not talk_id:
            return None

        # Poll until ready
        for _ in range(30):
            poll = requests.get(f"https://api.d-id.com/talks/{talk_id}", headers=headers, timeout=15)
            data = poll.json()
            status = data.get("status")
            result_url = data.get("result_url")
            if result_url:
                return result_url
            if status in {"error", "failed"}:
                print("D-ID error:", data)
                return None
            time.sleep(2)

        return None
    except Exception as e:
        print("D-ID video generation failed:", str(e))
        return None

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/process", methods=["POST"])
def process():
    try:
        data = request.json or {}
        prompt = data.get("prompt", "").strip()
        mode = data.get("mode", "text")

        if not prompt:
            return jsonify({"error": "Prompt is empty."}), 400

        response_text = chat_with_ollama(prompt)

        if mode == "text":
            return jsonify({"response": response_text})

        elif mode == "audio":
            audio_path = text_to_audio(response_text)
            return jsonify({
                "response": response_text,
                "audio_url": f"/static/audio/{os.path.basename(audio_path)}"
            })

        elif mode == "video":
            video_url = generate_avatar_video_from_text(response_text)
            if video_url:
                return jsonify({"response": response_text, "video_url": video_url})
            return jsonify({"response": response_text, "video_url": None, "error": "Video generation failed."}), 502

        else:
            return jsonify({"error": "Invalid mode selected."}), 400

    except Exception as e:
        print("Error in /process:", e)
        return jsonify({"error": "Internal server error"}), 500

if __name__ == "__main__":
    os.makedirs("static/audio", exist_ok=True)
    os.makedirs("static/video", exist_ok=True)
    app.run(host="0.0.0.0", port=5000, debug=True)
