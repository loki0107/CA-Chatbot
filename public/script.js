const form = document.getElementById("input-form");
const input = document.getElementById("user-input");
const messages = document.getElementById("messages");

// Connection status handling
let isConnected = false;
const statusDot = document.querySelector(".status-dot");
const statusText = document.getElementById("status-text");

function setConnecting() {
  statusDot.classList.remove("online", "offline");
  statusDot.classList.add("connecting");
  statusText.textContent = "Connecting...";
}

function updateConnectionStatus(connected) {
  isConnected = connected;
  if (connected) {
    statusDot.classList.remove("offline", "connecting");
    statusDot.classList.add("online");
    statusText.textContent = "Online";
  } else {
    statusDot.classList.remove("online", "connecting");
    statusDot.classList.add("offline");
    statusText.textContent = "Offline";
  }
}

// Check server connection
async function checkServerConnection() {
  try {
    setConnecting();
    const response = await fetch("/api/health");
    if (response.ok) {
      updateConnectionStatus(true);
    } else {
      updateConnectionStatus(false);
    }
  } catch (error) {
    updateConnectionStatus(false);
  }
}

// Check connection periodically
setInterval(checkServerConnection, 5000);
checkServerConnection();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userMessage = input.value.trim();
  if (!userMessage || !isConnected) return;

  addMessage(userMessage, "user");
  input.value = "";
  addMessage("Thinking...", "bot");

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage }),
    });
    const data = await res.json();

    removeLastMessage(); // Remove "Thinking..."
    addMessage(data.answer, "bot");
  } catch (err) {
    removeLastMessage();
    addMessage("❌ Error connecting to AI backend.", "bot");
    console.error(err);
  }
});

function addMessage(text, sender) {
  const div = document.createElement("div");
  div.className = `message ${sender}`;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function removeLastMessage() {
  const last = messages.lastChild;
  if (last) messages.removeChild(last);
}
