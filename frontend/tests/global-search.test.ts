import { describe, expect, test } from "vitest";

describe("global search hotkey contract", () => {
  test("ctrl/meta+k is the documented shortcut", () => {
    const isHotkey = (metaKey: boolean, ctrlKey: boolean, key: string) =>
      (metaKey || ctrlKey) && key.toLowerCase() === "k";
    expect(isHotkey(true, false, "k")).toBe(true);
    expect(isHotkey(false, true, "K")).toBe(true);
    expect(isHotkey(false, false, "k")).toBe(false);
  });
});
