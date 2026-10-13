import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = process.env.PORT || 3000;
const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const root = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(root, "public")));

app.get("/chat", (_req, res) => {
  res.sendFile(path.join(root, "public", "chat.html"));
});

app.post("/api/chat", async (req, res) => {
  const { messages } = req.body ?? {};

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "The server is missing GROQ_API_KEY. Add it to your .env file." });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Please send at least one message." });
  }

  const cleanMessages = messages
    .filter((message) => message && ["user", "assistant"].includes(message.role) && typeof message.content === "string")
    .slice(-20)
    .map(({ role, content }) => ({ role, content: content.trim().slice(0, 8000) }))
    .filter((message) => message.content);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: [
              "You are Aichabo, a friendly, helpful AI assistant.",
              "Write clean, simple, and brief answers. Prefer short paragraphs or a short numbered list only when it genuinely helps.",
              "Do not use Markdown formatting: no headings, no bold or italic text, no tables, no pipe characters, no horizontal divider lines, and no code fences unless the user explicitly asks for code.",
              "when they ask you who made it asnwer waris hasir"
              "Reply in the same language the user uses. If they write in Persian (Farsi/Dari), reply naturally in Persian. Write like you are explaining something to a curious fifth-grade student: use familiar words, short sentences, and one simple example when it helps. Explain any hard word right away. Avoid long explanations, filler, repeated points, and overly technical language. Start directly with the answer; do not add a title or label before it."
            ].join(" ")
          },
          ...cleanMessages
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      console.error("Groq request failed:", payload);
      return res.status(response.status).json({ error: payload?.error?.message || "The AI service could not complete your request." });
    }

    const answer = payload?.choices?.[0]?.message?.content;
    if (!answer) return res.status(502).json({ error: "The AI service returned an empty response." });
    res.json({ answer });
  } catch (error) {
    console.error("Chat request error:", error);
    res.status(502).json({ error: "Could not reach the AI service. Check your connection and try again." });
  }
});

app.listen(port, () => {
  console.log(`Aichabo is running at http://localhost:${port}`);
});
