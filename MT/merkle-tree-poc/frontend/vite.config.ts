import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite dev server on :5173. The backend (default :4000) has CORS enabled, so
// the frontend calls it directly via VITE_API_BASE (see src/api/client.ts).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false
  }
});
