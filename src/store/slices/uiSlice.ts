import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  variant: ToastVariant;
}

interface UiState {
  toasts: ToastItem[];
}

const initialState: UiState = {
  toasts: [],
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    pushToast: {
      reducer(state, action: PayloadAction<ToastItem>) {
        state.toasts = [action.payload, ...state.toasts].slice(0, 5);
      },
      prepare(payload: Omit<ToastItem, "id">) {
        return {
          payload: {
            id: nanoid(),
            ...payload,
          },
        };
      },
    },
    removeToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
    clearToasts(state) {
      state.toasts = [];
    },
  },
});

export const { pushToast, removeToast, clearToasts } = uiSlice.actions;
export default uiSlice.reducer;
