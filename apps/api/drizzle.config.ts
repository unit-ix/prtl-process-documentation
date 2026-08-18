// Nur für `drizzle-kit generate` — erzeugt die SQL-Files offline aus src/db/schema.ts und braucht
// deshalb keine Verbindungsdaten. Angewendet werden sie von src/db/migrate.ts.
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    dialect: 'postgresql',
    schema: './src/db/schema.ts',
    out: './drizzle',
});
