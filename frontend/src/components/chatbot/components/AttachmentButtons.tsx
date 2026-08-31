import React, { useRef } from "react";
import { Bot, Paperclip, Smile } from "lucide-react";

type Props = {
  onAttach: (file: File) => void;
};

export default function AttachmentButtons({ onAttach }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="attachment-buttons">
      <button className="attach-btn" title="Bots" aria-label="Bots" tabIndex={0} type="button">
        <Bot className="size-4" aria-hidden />
      </button>

      <button
        className="attach-btn"
        title="Fichier"
        aria-label="Fichier"
        onClick={() => fileRef.current?.click()}
        tabIndex={0}
        type="button"
      >
        <Paperclip className="size-4" aria-hidden />
      </button>
      <input
        ref={fileRef}
        type="file"
        style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files?.[0]) onAttach(e.target.files[0]);
        }}
      />

      <button className="attach-btn" title="Emoji" aria-label="Emoji" tabIndex={0} type="button">
        <Smile className="size-4" aria-hidden />
      </button>
    </div>
  );
}
