import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import App from "./pages/App";
import "./index.css";
import { ModalProvider } from "./components/ModalContext";
import Toaster from "./components/ui/Toaster";
import { store } from "./store";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element with id 'root' was not found.");
}

ReactDOM.createRoot(rootElement).render(
  <Provider store={store}>
    <ModalProvider>
      <App />
      <Toaster />
    </ModalProvider>
  </Provider>,
);
