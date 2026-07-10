import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Prototype-First Golden-Template-Toolchain (target: mock).
// - react()        — React 19 Fast Refresh
// - tailwindcss()  — Tailwind v4 via Vite-Plugin (kein tailwind.config, Tokens leben in src/index.css)
// - @-Alias        — spiegelt tsconfig `paths` ("@/*" -> "./src/*")
// Das Microsoft-Power-Platform-Overlay (SDK + zugehöriges Vite-Plugin) wird erst am
// dataverse-Fork re-added (Roadmap R5) — im mock-Default bewusst NICHT vorverdrahtet.
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
});
