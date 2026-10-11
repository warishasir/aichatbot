const form = document.querySelector("#chat-form");
const input = document.querySelector("#message");
const chat = document.querySelector("#chat");
const welcome = document.querySelector("#welcome");
const send = document.querySelector("#send");
const clear = document.querySelector("#clear-chat");
let messages = [];

function save() { localStorage.setItem("aichabo-messages", JSON.stringify(messages)); }
function scrollToEnd() { chat.scrollTop = chat.scrollHeight; }
function addMessage(role, content, extraClass = "") {
  const row = document.createElement("article");
  row.className = `message ${role} ${extraClass}`;
  const avatar = document.createElement("span");
  avatar.className = "avatar";
  avatar.textContent = role === "assistant" ? "هـ" : "شما";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = content;
  row.append(avatar, bubble);
  chat.append(row);
  scrollToEnd();
  return row;
}
function renderHistory() {
  chat.querySelectorAll(".message").forEach((item) => item.remove());
  welcome.hidden = messages.length > 0;
  messages.forEach((message) => addMessage(message.role, message.content));
}
function resize() { input.style.height = "auto"; input.style.height = `${Math.min(input.scrollHeight, 180)}px`; }

async function submit(text) {
  const content = text.trim();
  if (!content || send.disabled) return;
  welcome.hidden = true;
  messages.push({ role: "user", content });
  addMessage("user", content);
  save();
  input.value = ""; resize(); send.disabled = true;
  const typing = addMessage("assistant", "در حال فکر کردن…", "typing");
  try {
    const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages }) });
    const data = await response.json();
    typing.remove();
    if (!response.ok) throw new Error(data.error || "Something went wrong.");
    messages.push({ role: "assistant", content: data.answer });
    addMessage("assistant", data.answer);
    save();
  } catch (error) {
    typing.remove();
    addMessage("assistant", `متأسفم، ${error.message}`);
  } finally { send.disabled = false; input.focus(); }
}
form.addEventListener("submit", (event) => { event.preventDefault(); submit(input.value); });
input.addEventListener("input", resize);
input.addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); } });
document.querySelectorAll(".suggestion").forEach((button) => button.addEventListener("click", () => submit(button.textContent)));
clear.addEventListener("click", () => { messages = []; localStorage.removeItem("aichabo-messages"); renderHistory(); input.focus(); });
try { messages = JSON.parse(localStorage.getItem("aichabo-messages")) || []; } catch { messages = []; }
renderHistory();
