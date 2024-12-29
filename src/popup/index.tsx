import React from "react";
import { createRoot } from "react-dom/client";
import { Popup } from "./Popup";
import "../static/styles/styles.css";

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <Popup />
    </React.StrictMode>
  );
}
