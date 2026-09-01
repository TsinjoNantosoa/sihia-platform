import React from "react";
import { motion } from "framer-motion";

type Props = {
  language: "fr" | "en";
};

export default function TypingIndicator({ language }: Props) {
  const ariaLabel = language === "fr" ? "Réponse en cours" : "Reply in progress";

  return (
    <div className="message-row bot typing-row">
      <div className="bot-avatar-mini" aria-hidden>
        <img src="/brand/sihia-icon.png" alt="" width={24} height={24} />
      </div>
      <div className="typing-indicator" role="status" aria-label={ariaLabel}>
        <div className="typing-dots">
          <motion.span
            className="dot"
            animate={{ opacity: [0.25, 0.7, 0.25] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            className="dot"
            animate={{ opacity: [0.25, 0.7, 0.25] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}
          />
          <motion.span
            className="dot"
            animate={{ opacity: [0.25, 0.7, 0.25] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }}
          />
        </div>
      </div>
    </div>
  );
}
