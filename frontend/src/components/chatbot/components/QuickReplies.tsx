import React from "react";
import { type SuggestionIconKey, SuggestionIcon } from "../lib/suggestionIcons";

export type Reply = { icon: SuggestionIconKey; label: string; query?: string };

type Props = {
  replies: Reply[];
  onSelect: (text: string) => void;
  layout?: "grid" | "list" | "cards" | "pills";
};

export default function QuickReplies({ replies, onSelect, layout = "grid" }: Props) {
  if (!replies || replies.length === 0) return null;
  return (
    <div
      className={`quick-replies ${
        layout === "list" ? "vertical" : ""
      } ${layout === "cards" ? "cards" : ""} ${layout === "pills" ? "pills" : ""}`}
    >
      {replies.map((r, i) => (
        <button
          key={i}
          className={`quick-reply-btn ${layout === "cards" ? "card" : ""} ${layout === "pills" ? "pill" : ""}`}
          onClick={() => onSelect(r.query ?? r.label)}
          aria-label={r.label}
          role="button"
          tabIndex={0}
        >
          <span className="qr-icon">
            <SuggestionIcon name={r.icon} className="size-3.5" />
          </span>
          <span className="qr-label">{r.label}</span>
        </button>
      ))}
    </div>
  );
}
