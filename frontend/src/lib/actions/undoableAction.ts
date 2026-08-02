export type UndoableActionState = "scheduled" | "running" | "undone" | "succeeded" | "failed";

export interface UndoableActionController {
  undo: () => boolean;
  commit: () => Promise<boolean>;
  getState: () => UndoableActionState;
}

interface ScheduleUndoableActionOptions {
  delayMs: number;
  execute: () => void | Promise<void>;
  onCommit?: () => void;
  onUndo?: () => void;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
  onSettled?: (state: Extract<UndoableActionState, "undone" | "succeeded" | "failed">) => void;
}

export const UNDOABLE_ACTION_DELAY_MS = 6_000;

export function scheduleUndoableAction({
  delayMs,
  execute,
  onCommit,
  onUndo,
  onSuccess,
  onError,
  onSettled,
}: ScheduleUndoableActionOptions): UndoableActionController {
  let state: UndoableActionState = "scheduled";

  const commit = async () => {
    if (state !== "scheduled") return false;

    clearTimeout(timer);
    state = "running";
    onCommit?.();

    try {
      await execute();
      state = "succeeded";
      onSuccess?.();
      onSettled?.("succeeded");
      return true;
    } catch (error) {
      state = "failed";
      onError?.(error);
      onSettled?.("failed");
      return false;
    }
  };

  const timer = setTimeout(() => void commit(), Math.max(0, delayMs));

  return {
    undo: () => {
      if (state !== "scheduled") return false;
      clearTimeout(timer);
      state = "undone";
      onUndo?.();
      onSettled?.("undone");
      return true;
    },
    commit,
    getState: () => state,
  };
}
