import React from "react";
import { motion } from "framer-motion";
import { resolveBotName } from "../lib/tenantBranding";

type Props = {
  language: "fr" | "en";
  clientId: string;
  /** From tenant_ui_config.bot_name (API /ui-config) */
  botName?: string;
};

export default function TypingIndicator({ language, clientId, botName }: Props) {
  const name = resolveBotName(clientId, botName);
  const typingText = language === "fr" ? `${name} est en train d'écrire` : `${name} is typing`;

  return (
    <div className="message-row bot typing-row">
      <div className="bot-avatar-mini">
        <img src="/brand/sihia-icon.png" alt="" width={24} height={24} />
      </div>
      <div className="typing-indicator">
        <span className="typing-text">{typingText}</span>
        <div className="typing-dots">
          <motion.span
            className="dot"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            className="dot"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}
          />
          <motion.span
            className="dot"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }}
          />
        </div>
      </div>
    </div>
  );
}
