import type { RichDocument } from './ProcessContent.js';

// Begriffe und Zuständigkeiten stehen bei PRETTL immer als Tabelle (Termin 30.10.). Ein leeres Feld
// startet deshalb mit Kopfzeile und einer leeren Zeile — ausgefüllt gilt es erst, wenn darin etwas
// steht (siehe richTextHasContent).
const cell = (type: 'tableHeader' | 'tableCell', text?: string) => ({
    type,
    content: [text === undefined ? { type: 'paragraph' } : { type: 'paragraph', content: [{ type: 'text', text }] }],
});

const tableTemplate = (headers: readonly string[]): RichDocument => ({
    type: 'doc',
    content: [
        {
            type: 'table',
            content: [
                { type: 'tableRow', content: headers.map((header) => cell('tableHeader', header)) },
                { type: 'tableRow', content: headers.map(() => cell('tableCell')) },
            ],
        },
        { type: 'paragraph' },
    ],
});

export const TERMS_TEMPLATE: RichDocument = tableTemplate(['Begriff', 'Erklärung']);
export const RESPONSIBILITIES_TEMPLATE: RichDocument = tableTemplate(['Verantwortlich', 'Aufgabe']);
