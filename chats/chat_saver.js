const db = require("../db/connection");
const { spawn } = require("child_process");

let lastChatId = 0;
let isTraining = false;

async function saveChat(userMessage, botReply) {
  const category = detectCategory(userMessage);
  const query =
    "INSERT INTO conversations (user_message, bot_response, category) VALUES (?, ?, ?)";
  const [result] = await db
    .promise()
    .execute(query, [userMessage, botReply, category]);

  console.log(`✅ Chat saved with category: ${category}`);

  const newChatId = result.insertId;

  if (newChatId > lastChatId) {
    lastChatId = newChatId;
    isTraining = true;
    console.log("🔄 New chat detected, rebuilding FAISS embeddings...");
    rebuildEmbeddings(() => {
      isTraining = false;
    });
  } else {
    console.log("⚡ No new chat detected, skipping embedding rebuild.");
  }
}

function detectCategory(message) {
  const lower = message.toLowerCase();

  if (lower.includes("gst")) return "GST";
  if (lower.includes("income tax") || lower.includes("itr"))
    return "Income Tax";
  if (lower.includes("audit")) return "Audit";
  if (lower.includes("tds")) return "TDS";
  if (lower.includes("balance sheet")) return "Accounting";

  return "General";
}

function rebuildEmbeddings(callback) {
  console.log("🔄 Rebuilding FAISS embeddings...");
  const py = spawn("python3", ["ai/embedder.py"]);

  py.stdout.on("data", (data) => {
    console.log(`📚 Embedder: ${data}`);
  });

  py.stderr.on("data", (data) => {
    console.error(`❌ Embedder error: ${data}`);
  });

  py.on("close", (code) => {
    if (code === 0) {
      console.log("✅ Embeddings updated!");
    } else {
      console.log(`❌ Embedder process exited with code ${code}`);
    }

    if (callback) callback();
  });
}

function getTrainingStatus() {
  return isTraining;
}

module.exports = { saveChat, getTrainingStatus };
