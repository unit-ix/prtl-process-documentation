import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import { App } from '@/app/App';
import { initDataAccess } from '@/data';

const root = document.getElementById('root');
if (!root) throw new Error('#root nicht gefunden — index.html prüfen.');

function render(): void {
    createRoot(root!).render(
        <StrictMode>
            <App />
        </StrictMode>,
    );
}

// Bootstrap VOR dem ersten Render: braucht das Backend einen Login, navigiert er weg und `then`
// wird nie erreicht — so gibt es keinen Zustand „App läuft, aber ohne Token". Bei `mock` ein No-op.
// `.then()` statt top-level await, das würde das Build-Target des Templates auf ES2022 heben.
initDataAccess().then(render, (error: unknown) => {
    // Vor React gibt es keinen Komponentenbaum für einen ErrorState — deshalb direkt ins DOM.
    console.error(error);
    root.textContent = 'Anmeldung fehlgeschlagen. Bitte Seite neu laden.';
});
