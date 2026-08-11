import React from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "./App";
import "./chatbot.css";

const ROOT_ID = "sihia-chatbot-root";

function ensureMountNode(): HTMLElement {
  const existing = document.getElementById(ROOT_ID);
  if (existing) return existing;
  const el = document.createElement("div");
  el.id = ROOT_ID;
  el.setAttribute("data-sihia-chatbot", "true");
  document.body.appendChild(el);
  return el;
}

let root: Root | null = null;

export function mountChatbot(): void {
  if (root) return;
  root = createRoot(ensureMountNode());
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

if (typeof window !== "undefined") {
  (window as unknown as { SIHIAChatbot?: { mountChatbot: typeof mountChatbot } }).SIHIAChatbot = {
    mountChatbot,
  };
}

/** Auto-mount uniquement pour la démo standalone (`public/chatbot/demo.html`), pas dans SIH IA. */
if (typeof document !== "undefined" && document.documentElement.dataset.chatbotEmbed === "true") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountChatbot);
  } else {
    mountChatbot();
  }
}
