import React from "react";
import ReactDOM from "react-dom/client";

import { BrowserRouter } from "react-router-dom";

import { registerSW } from "virtual:pwa-register";

import "@fontsource-variable/inter";
import "@fontsource-variable/noto-sans-bengali";

import App from "./App.jsx";
import { Analytics } from "@vercel/analytics/react";

import "./styles.css";
import "./desktop.css";
import "./mobile-ui.css";

registerSW({
  immediate: true
});

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Analytics />
    </BrowserRouter>
  </React.StrictMode>
);