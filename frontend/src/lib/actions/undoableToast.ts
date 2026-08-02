import { toast } from "sonner";

import {
  scheduleUndoableAction,
  UNDOABLE_ACTION_DELAY_MS,
  type UndoableActionController,
} from "./undoableAction";

interface ScheduleUndoableToastOptions {
  message: string;
  description: string;
  undoLabel: string;
  committingMessage: string;
  undoneMessage: string;
  successMessage: string;
  errorMessage: string;
  execute: () => void | Promise<void>;
  delayMs?: number;
  onSettled?: () => void;
}

export function scheduleUndoableToast({
  message,
  description,
  undoLabel,
  committingMessage,
  undoneMessage,
  successMessage,
  errorMessage,
  execute,
  delayMs = UNDOABLE_ACTION_DELAY_MS,
  onSettled,
}: ScheduleUndoableToastOptions): UndoableActionController {
  const toastRef: { id?: string | number } = {};
  const replaceToast = (show: () => string | number) => {
    if (toastRef.id !== undefined) toast.dismiss(toastRef.id);
    toastRef.id = show();
  };
  const controller = scheduleUndoableAction({
    delayMs,
    execute,
    onCommit: () => replaceToast(() => toast.loading(committingMessage, { duration: Infinity })),
    onUndo: () => replaceToast(() => toast.success(undoneMessage, { duration: 3_000 })),
    onSuccess: () => replaceToast(() => toast.success(successMessage, { duration: 4_000 })),
    onError: () => replaceToast(() => toast.error(errorMessage, { duration: 5_000 })),
    onSettled,
  });

  toastRef.id = toast.warning(message, {
    description,
    duration: delayMs + 60_000,
    action: {
      label: undoLabel,
      onClick: () => controller.undo(),
    },
  });

  return controller;
}
