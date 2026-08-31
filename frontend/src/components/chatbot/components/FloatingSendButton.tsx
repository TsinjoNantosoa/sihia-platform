import React from "react";
import { Send } from "lucide-react";

type Props = {
  onClick: () => void;
};

export default function FloatingSendButton({ onClick }: Props) {
  return (
    <button
      className="floating-send-btn"
      onClick={onClick}
      title="Envoyer"
      aria-label="Envoyer"
      type="button"
    >
      <Send className="size-4" aria-hidden />
    </button>
  );
}
