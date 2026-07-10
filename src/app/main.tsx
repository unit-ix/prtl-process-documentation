import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import { App } from '@/app/App';

// Einziger Einstiegspunkt (index.html referenziert diese Datei). Alles Weitere haengt an App.
const root = document.getElementById('root');
if (!root) throw new Error('#root nicht gefunden — index.html prüfen.');

createRoot(root).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
