import { afterEach, describe, expect, it, vi } from "vitest";

import { scheduleUndoableAction } from "@/lib/actions/undoableAction";

describe("undoable actions", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("exécute l’action seulement après le délai", async () => {
    vi.useFakeTimers();
    const execute = vi.fn();
    const onSettled = vi.fn();
    const controller = scheduleUndoableAction({ delayMs: 6_000, execute, onSettled });

    await vi.advanceTimersByTimeAsync(5_999);
    expect(execute).not.toHaveBeenCalled();
    expect(controller.getState()).toBe("scheduled");

    await vi.advanceTimersByTimeAsync(1);
    expect(execute).toHaveBeenCalledOnce();
    expect(controller.getState()).toBe("succeeded");
    expect(onSettled).toHaveBeenCalledWith("succeeded");
  });

  it("annule le timer et empêche définitivement l’exécution", async () => {
    vi.useFakeTimers();
    const execute = vi.fn();
    const onUndo = vi.fn();
    const controller = scheduleUndoableAction({ delayMs: 6_000, execute, onUndo });

    expect(controller.undo()).toBe(true);
    expect(controller.undo()).toBe(false);
    await vi.runAllTimersAsync();

    expect(execute).not.toHaveBeenCalled();
    expect(onUndo).toHaveBeenCalledOnce();
    expect(controller.getState()).toBe("undone");
  });

  it("peut valider immédiatement et ne rejoue pas l’action", async () => {
    vi.useFakeTimers();
    const execute = vi.fn().mockResolvedValue(undefined);
    const controller = scheduleUndoableAction({ delayMs: 6_000, execute });

    await expect(controller.commit()).resolves.toBe(true);
    await vi.runAllTimersAsync();
    await expect(controller.commit()).resolves.toBe(false);

    expect(execute).toHaveBeenCalledOnce();
    expect(controller.getState()).toBe("succeeded");
  });

  it("signale une erreur sans laisser l’action bloquée", async () => {
    vi.useFakeTimers();
    const error = new Error("API unavailable");
    const onError = vi.fn();
    const onSettled = vi.fn();
    const controller = scheduleUndoableAction({
      delayMs: 6_000,
      execute: () => Promise.reject(error),
      onError,
      onSettled,
    });

    await vi.runAllTimersAsync();

    expect(onError).toHaveBeenCalledWith(error);
    expect(onSettled).toHaveBeenCalledWith("failed");
    expect(controller.getState()).toBe("failed");
  });
});
