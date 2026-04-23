import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import deviceReducer from "./slices/deviceSlice";
import locationReducer from "./slices/locationSlice";
import uiReducer from "./slices/uiSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    devices: deviceReducer,
    locations: locationReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
