import { configureStore } from "@reduxjs/toolkit";
import adReducer from "./slices/adSlice";
import authReducer from "./slices/authSlice";
import deviceReducer from "./slices/deviceSlice";
import locationReducer from "./slices/locationSlice";
import noticeReducer from "./slices/noticeSlice";
import userReducer from "./slices/usersSlice";
import uiReducer from "./slices/uiSlice";

export const store = configureStore({
  reducer: {
    ads: adReducer,
    auth: authReducer,
    devices: deviceReducer,
    locations: locationReducer,
    notices: noticeReducer,
    users: userReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
