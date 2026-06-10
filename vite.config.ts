import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { powerApps } from '@microsoft/power-apps-vite';

// Vorverdrahtete Power Apps Code App Toolchain.
// powerApps() embeddet den Dataverse-/Connector-Dev-Proxy — kein separates `pac code run` nötig,
// `pnpm dev` (= plain `vite`) reicht. Lovable bringt eine eigene vite.config mit: beim Import die
// Plugins hier mergen, powerApps() NICHT verlieren (sonst keine Datenanbindung im Dev-Server).
export default defineConfig({
    plugins: [react(), powerApps()],
});
