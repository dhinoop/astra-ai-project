document.addEventListener("DOMContentLoaded", () => {
    // Elements
    const promptInput = document.getElementById("prompt-input");
    const sendBtn = document.getElementById("send-btn");
    const messagesContainer = document.getElementById("messages");
    const modeButtons = document.querySelectorAll(".mode-btn");
    const loaderOverlay = document.getElementById("loader-overlay");
    const loaderVideo = document.getElementById("loader-video");
    const newChatBtn = document.getElementById("new-chat-btn");
    const chatList = document.getElementById("chat-list");

    // State
    let currentMode = "text";
    let typingMsg = null;
    let chats = [];            // array of chat sessions
    let currentChatId = null;  // id of active chat session

    // ---------------- Initialization ----------------
    loadChats();
    attachModeHandlers();
    attachInputHandlers();
    attachNewChatHandler();

    // ---------------- Mode switching ----------------
    function attachModeHandlers() {
        modeButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                modeButtons.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                currentMode = btn.dataset.mode;
            });
        });
    }

    // ---------------- Input handling ----------------
    function attachInputHandlers() {
        sendBtn.addEventListener("click", sendMessage);

        promptInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // auto-resize textarea
        promptInput.addEventListener("input", () => {
            promptInput.style.height = "auto";
            promptInput.style.height = promptInput.scrollHeight + "px";
        });
    }

    // ---------------- New chat / Sessions ----------------
    function attachNewChatHandler() {
        newChatBtn.addEventListener("click", () => {
            const session = createNewSession("New chat");
            chats.push(session);
            currentChatId = session.id;
            saveChats();
            renderChatList();
            renderMessagesFromSession(session);
            promptInput.value = "";
            promptInput.focus();
        });
    }

    function createNewSession(title) {
        return {
            id: "chat_" + Date.now(),
            title: title || "New chat",
            messages: [],
            createdAt: new Date().toISOString()
        };
    }

    function saveChats() {
        localStorage.setItem("astraChats", JSON.stringify(chats));
    }

    function loadChats() {
        chats = JSON.parse(localStorage.getItem("astraChats")) || [];
        if (chats.length === 0) {
            const initial = createNewSession("New chat");
            chats.push(initial);
            saveChats();
        }
        // default to last session
        currentChatId = chats[chats.length - 1].id;
        renderChatList();
        renderMessagesFromSession(getCurrentChat());
    }

    function getCurrentChat() {
        return chats.find(c => c.id === currentChatId);
    }

    function renderChatList() {
        chatList.innerHTML = "";
        chats.forEach(chat => {
            const li = document.createElement("li");
            li.dataset.id = chat.id;
            li.className = chat.id === currentChatId ? "active" : "";

            const title = document.createElement("div");
            title.textContent = chat.title || "New chat";
            title.style.fontSize = "13px";
            title.style.marginBottom = "4px";

            const meta = document.createElement("small");
            const d = new Date(chat.createdAt);
            meta.textContent = d.toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" });
            meta.style.color = "var(--muted)";

            li.appendChild(title);
            li.appendChild(meta);

            li.addEventListener("click", () => {
                currentChatId = chat.id;
                renderChatList();
                renderMessagesFromSession(chat);
            });

            chatList.appendChild(li);
        });
    }

    // ---------------- Sending messages ----------------
    function sendMessage() {
        const prompt = promptInput.value.trim();
        if (!prompt) return;

        addMessage(prompt, "user");
        promptInput.value = "";
        promptInput.style.height = "auto";

        updateChatTitleOnFirstUserMessage(prompt);

        // Show loader depending on mode
        if (currentMode === "text" || currentMode === "audio") {
            showTypingIndicator(); // inline 3 dots
        } else if (currentMode === "video") {
            hideTypingIndicator(); // ensure no dots
            showLoader();          // only moon.webm overlay
        }

        fetch("/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, mode: currentMode })
        })
        .then(res => res.json())
        .then(data => {
            if (currentMode === "text" || currentMode === "audio") {
                hideTypingIndicator();
            } else if (currentMode === "video") {
                hideLoader();
            }

            if (data.error) {
                addMessage(`Error: ${data.error}`, "bot");
                return;
            }

            // Always add text response
            addMessage(data.response, "bot");

            if (currentMode === "audio" && data.audio_url) {
                addAudioMessage(data.audio_url);
            }

            if (currentMode === "video" && data.video_url) {
                addVideoMessage(data.video_url);
            }
        })
        .catch(err => {
            console.error(err);
            hideLoader();
            hideTypingIndicator();
            addMessage("Failed to connect to server.", "bot");
        });
    }

    function updateChatTitleOnFirstUserMessage(prompt) {
        const chat = getCurrentChat();
        if (!chat) return;
        if (!chat.title || chat.title === "New chat") {
            chat.title = prompt.length > 30 ? (prompt.slice(0, 27) + "...") : prompt;
            saveChats();
            renderChatList();
        }
    }

    // ---------------- Message rendering & saving ----------------
    function getTimestamp() {
        const now = new Date();
        return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    function addMessage(text, sender) {
        const t = getTimestamp();
        renderTextMessage(text, sender, t);
        saveMessage({ type: "text", content: text, sender, time: t });
    }

    function addAudioMessage(url) {
        const t = getTimestamp();
        renderAudioMessage(url, t);
        saveMessage({ type: "audio", content: url, sender: "bot", time: t });
    }

    function addVideoMessage(url) {
        const t = getTimestamp();
        renderVideoMessage(url, t);
        saveMessage({ type: "video", content: url, sender: "bot", time: t });
    }

    function saveMessage(msgObj) {
        const chat = getCurrentChat();
        if (!chat) return;
        chat.messages.push(msgObj);
        saveChats();
    }

    function renderMessagesFromSession(session) {
        messagesContainer.innerHTML = "";
        hideLoader();
        hideTypingIndicator();

        if (!session || !session.messages) return;
        session.messages.forEach(m => {
            if (m.type === "text") {
                renderTextMessage(m.content, m.sender, m.time);
            } else if (m.type === "audio") {
                renderAudioMessage(m.content, m.time);
            } else if (m.type === "video") {
                renderVideoMessage(m.content, m.time);
            }
        });

        scrollToBottom();
    }

    // ---------------- DOM render helpers ----------------
    function renderTextMessage(text, sender, time) {
        const msg = document.createElement("div");
        msg.classList.add("msg", sender);

        const content = document.createElement("div");
        content.textContent = text;

        const ts = document.createElement("div");
        ts.classList.add("timestamp");
        ts.textContent = time || getTimestamp();

        msg.appendChild(content);
        msg.appendChild(ts);

        messagesContainer.appendChild(msg);
        scrollToBottom();
    }

    function renderAudioMessage(url, time) {
        const wrapper = document.createElement("div");
        wrapper.classList.add("msg", "bot");

        const audio = document.createElement("audio");
        audio.controls = true;
        audio.src = url;

        const ts = document.createElement("div");
        ts.classList.add("timestamp");
        ts.textContent = time || getTimestamp();

        wrapper.appendChild(audio);
        wrapper.appendChild(ts);

        messagesContainer.appendChild(wrapper);
        scrollToBottom();
    }

    function renderVideoMessage(url, time) {
        const wrapper = document.createElement("div");
        wrapper.classList.add("msg", "bot");

        const video = document.createElement("video");
        video.controls = true;
        video.src = url;

        const ts = document.createElement("div");
        ts.classList.add("timestamp");
        ts.textContent = time || getTimestamp();

        wrapper.appendChild(video);
        wrapper.appendChild(ts);

        messagesContainer.appendChild(wrapper);
        scrollToBottom();
    }

    // ---------------- Loader & typing helpers ----------------
    function showLoader() {
        loaderOverlay.classList.remove("hidden");
        loaderVideo.classList.remove("hidden");
    }

    function hideLoader() {
        loaderOverlay.classList.add("hidden");
        loaderVideo.classList.add("hidden");
    }

    function showTypingIndicator() {
        typingMsg = document.createElement("div");
        typingMsg.classList.add("msg", "bot");
        typingMsg.innerHTML = `<span class="thinking-dots"><span>.</span><span>.</span><span>.</span></span>`;
        messagesContainer.appendChild(typingMsg);
        scrollToBottom();
    }

    function hideTypingIndicator() {
        if (typingMsg) {
            typingMsg.remove();
            typingMsg = null;
        }
    }

    // ---------------- Utilities ----------------
    function scrollToBottom() {
        messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: "smooth"
        });
    }
});
