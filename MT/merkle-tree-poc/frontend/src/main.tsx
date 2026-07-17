/**
 * frontend/src/main.tsx — React entry point + router + providers.
 */
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { App } from "./App";
import { DashboardPage } from "./pages/DashboardPage";
import { GenerateBatchPage } from "./pages/GenerateBatchPage";
import { ProofPage } from "./pages/ProofPage";
import { ProductQrPage } from "./pages/ProductQrPage";
import { VerifyPage } from "./pages/VerifyPage";
import { FieldVerifyPage } from "./pages/FieldVerifyPage";
import { LearnPage } from "./pages/LearnPage";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./styles/globals.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "generate", element: <GenerateBatchPage /> },
      { path: "proof", element: <ProofPage /> },
      { path: "product-qr", element: <ProductQrPage /> },
      { path: "verify", element: <VerifyPage /> },
      { path: "field-verify", element: <FieldVerifyPage /> },
      { path: "learn", element: <LearnPage /> }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <TooltipProvider delayDuration={200}>
        <RouterProvider router={router} />
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </ThemeProvider>
  </React.StrictMode>
);
