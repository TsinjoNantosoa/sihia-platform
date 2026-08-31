import React, { useState } from "react";

type Props = {
  onRate: (rating: "up" | "down") => void;
};

export default function Rating({ onRate }: Props) {
  return (
    <div className="rating">
      <span className="rating-notice">
        Assistant SIHIA — ne partagez pas d&apos;informations personnelles sensibles.
      </span>
    </div>
  );
}
