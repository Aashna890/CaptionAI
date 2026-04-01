import { useState, useEffect, useRef } from "react";

const TOAST_LIMIT = 20;
const TOAST_DURATION = 5000; // 5 seconds

const ActionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
};

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

// Per-toast timers stored outside React state
const dismissTimers = new Map();
const removeTimers = new Map();

function scheduleRemoval(toastId) {
  // Don't double-schedule
  if (removeTimers.has(toastId)) return;

  const timer = setTimeout(() => {
    removeTimers.delete(toastId);
    dispatch({ type: ActionTypes.REMOVE_TOAST, toastId });
  }, 300); // Wait for exit animation (~300ms)

  removeTimers.set(toastId, timer);
}

function scheduleDismiss(toastId) {
  if (dismissTimers.has(toastId)) return;

  const timer = setTimeout(() => {
    dismissTimers.delete(toastId);
    dismissToast(toastId);
  }, TOAST_DURATION);

  dismissTimers.set(toastId, timer);
}

function cancelTimers(toastId) {
  if (dismissTimers.has(toastId)) {
    clearTimeout(dismissTimers.get(toastId));
    dismissTimers.delete(toastId);
  }
  if (removeTimers.has(toastId)) {
    clearTimeout(removeTimers.get(toastId));
    removeTimers.delete(toastId);
  }
}

export function reducer(state, action) {
  switch (action.type) {
    case ActionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };
    case ActionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };
    case ActionTypes.DISMISS_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toastId || action.toastId === undefined
            ? { ...t, open: false }
            : t
        ),
      };
    case ActionTypes.REMOVE_TOAST:
      return action.toastId === undefined
        ? { ...state, toasts: [] }
        : { ...state, toasts: state.toasts.filter((t) => t.id !== action.toastId) };
    default:
      return state;
  }
}

const listeners = [];
let memoryState = { toasts: [] };

function dispatch(action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((l) => l(memoryState));
}

function dismissToast(toastId) {
  cancelTimers(toastId);
  // Set open: false immediately (triggers exit animation)
  dispatch({ type: ActionTypes.DISMISS_TOAST, toastId });
  // Remove from DOM after animation
  scheduleRemoval(toastId);
}

function toast({ ...props }) {
  const id = genId();

  const dismiss = () => dismissToast(id);

  const update = (updateProps) =>
    dispatch({ type: ActionTypes.UPDATE_TOAST, toast: { ...updateProps, id } });

  dispatch({
    type: ActionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss(); // X button clicked
      },
    },
  });

  // Auto-dismiss after 5 seconds
  scheduleDismiss(id);

  return { id, dismiss, update };
}

function useToast() {
  const [state, setState] = useState(memoryState);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: dismissToast,
  };
}

export { useToast, toast };