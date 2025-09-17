# 🌙 Astra AI – Multimodal Conversational Assistant

Astra is a **Flask-based AI assistant** powered by **Ollama (LLaMA 3)** for local text generation, **gTTS** for speech synthesis, and **D-ID** for avatar video generation.  
It supports **three modes of response**:  
1. 📝 **Text**  
2. 🔊 **Audio**  
3. 🎥 **Video with talking avatar**  

---

## ⚡ Features
- Local **chat response** via [Ollama](https://ollama.com/) (LLaMA 3 model).  
- **Text-to-Speech** using [gTTS](https://pypi.org/project/gTTS/).  
- **Talking avatar video** generation with [D-ID API](https://d-id.com/).  
- Simple **Flask web UI** with real-time responses.  
- Organized project structure with static assets and templates.  

---

## 📂 Project Structure
```
ASTRA_AI-PROJECT/
│── app.py                # Flask backend (Ollama + gTTS + D-ID)
│── requirements.txt       # Python dependencies
│── README.md              # Project documentation
│── .gitignore             # Ignore venv, cache, media files
│
├── static/
│   ├── css/               # Stylesheets
│   ├── js/                # Frontend JS
│   ├── img/               # UI images
│   ├── audio/             # Generated speech files
│   └── video/             # Generated video files
│
├── templates/
│   └── index.html         # Frontend UI
│
└── output/                # Optional outputs
```

---

## 🔧 Installation & Setup

### 1. Clone repo
```bash
git clone https://github.com/yourusername/astra-ai.git
cd astra-ai
```

### 2. Create & activate virtual environment
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# Linux / macOS
source venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Install & run Ollama
- [Download Ollama](https://ollama.com/download)  
- Pull LLaMA 3 model:
```bash
ollama pull llama3
```
- Run Ollama server:
```bash
ollama serve
```

### 5. Set up environment variables
Create a `.env` file:
```ini
DID_API_KEY=your_did_api_key   # Base64 encoded Basic Auth key
```

On Windows (PowerShell):
```powershell
setx DID_API_KEY "your_base64_basic_auth_value"
```

On Linux/macOS:
```bash
export DID_API_KEY="your_base64_basic_auth_value"
```

---

## ▶️ Run the app
```bash
python app.py
```

App will be available at: **http://localhost:5000/**

---

## 💡 Usage
- Enter your **prompt** in the UI.  
- Select a response **mode**:
  - `Text` → plain response.  
  - `Audio` → response with generated MP3 speech.  
  - `Video` → D-ID generated talking avatar.  

---

## 📦 Requirements
- Python 3.8+  
- Flask  
- gTTS  
- Requests  
- Ollama (with LLaMA 3 pulled)  
- D-ID API key (for video mode)  

---

## 🚀 Future Improvements
- Replace D-ID with **local lip-sync (Wav2Lip)**.  
- Add **multimodal input (voice prompts, image understanding)**.  
- Deploy on **Docker** for portability.  

---

## 📝 License
MIT License. Free to use & modify.  
