import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Tailwind v4 läuft über das Vite-Plugin, es gibt kein tailwind.config — Tokens leben in
// src/index.css. Das Power-Platform-Overlay kommt erst am dataverse-Fork dazu.

/** Muss zum PORT-Default in apps/api/src/env.ts passen. */
const API_PORT = 3000;

export default defineConfig({
    plugins: [react(), tailwindcss()],
    // Spiegelt den /api/*-Proxy von Azure Static Web Apps auf localhost, damit die API lokal
    // same-origin ist — sonst bräuchte der Adapter eine absolute Backend-URL im Bundle und CORS.
    server: {
        proxy: {
            '/api': { target: `http://127.0.0.1:${API_PORT}`, changeOrigin: false },
        },
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            // Als Alias statt '../../../../../': der relative Pfad bricht sonst still, sobald
            // jemand eine Datei im src-Baum verschiebt.
            '@unitix': fileURLToPath(new URL('../../.unitix', import.meta.url)),
        },
    },
});
