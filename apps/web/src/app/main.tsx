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

const inAuthFrame = window.self !== window.top && /[#&](code|error|state)=/.test(window.location.hash);

if (!inAuthFrame) {
    initDataAccess().then(render, (error: unknown) => {
        console.error(error);
        root.textContent = 'Anmeldung fehlgeschlagen. Bitte Seite neu laden.';
    });
}
