import { describe, expect, it } from 'vitest';
import {
    confirmLink,
    EVENT_SUBJECTS,
    processDeepLink,
    renderInstructionMail,
    renderProcessMail,
    type ProcessMailInput,
} from './mailTemplates.js';
import { EVENT_KINDS } from './enums.js';

const input = (overrides: Partial<ProcessMailInput> = {}): ProcessMailInput => ({
    eventKind: 'assigned',
    processId: 'p-1',
    title: 'Beschaffung',
    identifier: 'VA PE 2 PUR.001',
    documentNumber: 1,
    edition: null,
    comment: null,
    actorName: null,
    appUrl: 'https://app.example.net',
    ...overrides,
});

describe('processDeepLink', () => {
    // §7.6: der Parametername bleibt `pid`, sonst laufen Links aus alten Mails ins Leere.
    it('benutzt den Parameter pid', () => {
        expect(processDeepLink('https://app.example.net', 'abc')).toBe('https://app.example.net/?pid=abc');
    });

    it('verträgt einen Schrägstrich am Ende der Basis-URL', () => {
        expect(processDeepLink('https://app.example.net/', 'abc')).toBe('https://app.example.net/?pid=abc');
    });
});

describe('renderProcessMail — Betreff', () => {
    it('trägt Ereignis und Titel', () => {
        expect(renderProcessMail(input())?.subject).toBe('Prozess zur Bearbeitung: Beschaffung');
        expect(renderProcessMail(input({ eventKind: 'formally_approved' }))?.subject).toBe(
            'Prozess freigegeben: Beschaffung',
        );
    });

    it('deckt genau die sechs versendeten Ereignisarten ab', () => {
        const withMail = EVENT_KINDS.filter((kind) => EVENT_SUBJECTS[kind] !== undefined);
        expect(withMail).toHaveLength(6);
        expect(withMail).not.toContain('revision_started');
    });

    // "Überarbeitung gestartet" verschickt bewusst nichts (§7.6, recipientEmail null).
    it('erzeugt für revision_started keine Mail', () => {
        expect(renderProcessMail(input({ eventKind: 'revision_started' }))).toBeNull();
    });
});

describe('renderProcessMail — Inhalt', () => {
    it('nennt in der Freigabe-Mail die Dokumentnummer', () => {
        const html = renderProcessMail(input({ eventKind: 'formally_approved', edition: 2 }))?.html ?? '';
        expect(html).toContain('Dokumentnummer');
        expect(html).toContain('Ausgabe');
    });

    it('zitiert den Ablehnungsgrund samt Urheber', () => {
        const html =
            renderProcessMail(
                input({ eventKind: 'formally_rejected', comment: 'Kennzahlen fehlen.', actorName: 'L. Wagner' }),
            )?.html ?? '';
        expect(html).toContain('Kennzahlen fehlen.');
        expect(html).toContain('L. Wagner');
    });

    it('hängt an jede Mail den Absprunglink', () => {
        for (const kind of ['assigned', 'submitted', 'content_rejected'] as const) {
            expect(renderProcessMail(input({ eventKind: kind }))?.html).toContain('?pid=p-1');
        }
    });

    it('lässt fehlende Angaben weg statt "null" zu schreiben', () => {
        const html = renderProcessMail(input({ identifier: null, documentNumber: null }))?.html ?? '';
        expect(html).not.toContain('null');
        expect(html).not.toContain('Identkennzeichen');
    });
});

describe('renderProcessMail — muss entschärfen', () => {
    // Die bestehende Vorlage "Formell Abgelehnt" verschickt HTML-escapten Rohtext und kommt als
    // sichtbares Markup an (§12, Defekt 15). Hier gilt das Gegenteil: Nutzertext wird escaped,
    // das Gerüst bleibt HTML.
    it('HTML im Titel und im Grund', () => {
        const html =
            renderProcessMail(
                input({ title: '<script>alert(1)</script>', eventKind: 'content_rejected', comment: '<b>x</b>' }),
            )?.html ?? '';
        expect(html).toContain('&lt;script&gt;');
        expect(html).not.toContain('<script>');
        expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
    });

    it('aber liefert echtes HTML, keinen escapten Rumpf', () => {
        const html = renderProcessMail(input())?.html ?? '';
        expect(html.startsWith('<div style=')).toBe(true);
        expect(html).not.toContain('&lt;div');
    });
});

describe('renderInstructionMail', () => {
    const mail = renderInstructionMail({
        processTitle: 'Wareneingangsprüfung',
        identifier: 'VA PE 3 QAM.004',
        dueDate: '2026-09-30',
        note: 'Bitte bis Monatsende.',
        confirmUrl: confirmLink('https://app.example.net', 'token-123'),
    });

    it('nennt Prozess, Frist und Hinweis', () => {
        expect(mail.subject).toBe('Unterweisung: Wareneingangsprüfung');
        expect(mail.html).toContain('VA PE 3 QAM.004');
        expect(mail.html).toContain('2026-09-30');
        expect(mail.html).toContain('Bitte bis Monatsende.');
    });

    it('bietet beide Antwortwege an', () => {
        expect(mail.html).toContain('Bestätigen');
        expect(mail.html).toContain('Ich kann das nicht bestätigen');
    });

    it('zeigt auf den Bestätigungs-Endpoint der API', () => {
        expect(mail.html).toContain('https://app.example.net/api/confirm/token-123');
    });

    it('sagt, dass der Link abläuft und nur einmal gilt', () => {
        expect(mail.html).toContain('30 Tage');
    });
});
