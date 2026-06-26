/**
 * frontend/src/main.tsx — React entry point + router.
 */
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { App } from "./App";
import { GenerateBatchPage } from "./pages/GenerateBatchPage";
import { ProofPage } from "./pages/ProofPage";
import { VerifyPage } from "./pages/VerifyPage";
import { LearnPage } from "./pages/LearnPage";
import "./styles/app.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <GenerateBatchPage /> },
      { path: "proof", element: <ProofPage /> },
      { path: "verify", element: <VerifyPage /> },
      { path: "learn", element: <LearnPage /> }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
