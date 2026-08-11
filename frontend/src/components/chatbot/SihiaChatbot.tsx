import { useEffect } from "react";
import App from "./App";
import "./chatbot.css";

/** Widget de l'assistant médical SIHIA. */
export function SihiaChatbot() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as Record<string, unknown>;
    if (!w.__CHATBOT_CLIENT_ID__) w.__CHATBOT_CLIENT_ID__ = "sihia";
  }, []);

  return (
    <div id="sihia-chatbot-root" data-sihia-chatbot="true">
      <App />
    </div>
  );
}
