const express = require("express");
const bodyParser = require("body-parser");
const { saveChat } = require("./chats/chat_saver");
const { spawn } = require("child_process");
const axios = require("axios");
const path = require("path");

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/chat", async (req, res) => {
  const userInput = req.body.message;

  // 🔍 Get context from retriever.py
  const context = await getContext(userInput);

  const prompt = `You are a Chartered Accountant.\n\nContext:\n${context}\n\nQuestion: ${userInput}`;

  // 🤖 Send to Ollama
  const response = await axios.post("http://localhost:11434/api/generate", {
    model: "mistral",
    prompt: prompt,
    stream: false,
  });

  const botReply = response.data.response;
  await saveChat(userInput, botReply); // This includes smart embedding logic

  res.json({ answer: botReply });
});

function getContext(query) {
  return new Promise((resolve) => {
    const py = spawn("python3", ["ai/retriever.py", query]);
    let data = "";
    py.stdout.on("data", (chunk) => (data += chunk.toString()));
    py.on("close", () => resolve(data));
  });
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});
app.listen(3000, () =>
  console.log("✅ Chatbot server running on http://localhost:3000")
);

const { getTrainingStatus } = require("./chats/chat_saver");

app.get("/training-status", (req, res) => {
  res.json({ training: getTrainingStatus() });
});

app.post("/feedback", async (req, res) => {
  const { chatId, correctedResponse } = req.body;

  if (!chatId || !correctedResponse) {
    return res
      .status(400)
      .json({ error: "chatId and correctedResponse required" });
  }

  const query = "UPDATE conversations SET corrected_response = ? WHERE id = ?";
  await db.promise().execute(query, [correctedResponse, chatId]);

  console.log(`🛠️ Correction saved for chat #${chatId}`);

  // Trigger embedding rebuild for the corrected data
  const retrain = spawn("python3", ["ai/embedder.py"]);
  retrain.stdout.on("data", (data) => console.log(`📚 Embedder: ${data}`));
  retrain.stderr.on("data", (data) =>
    console.error(`❌ Embedder error: ${data}`)
  );
  retrain.on("close", (code) => {
    if (code === 0) console.log("✅ Correction-based re-training done.");
    else console.error(`❌ Re-training failed with code ${code}`);
  });

  res.json({
    status: "success",
    message: "Correction saved and training triggered.",
  });
});
