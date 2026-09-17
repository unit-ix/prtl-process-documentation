import type { ProcessVersionView } from '@app/domain';
import { describe, expect, it } from 'vitest';
import { renderSnapshot, type SnapshotInput } from './snapshot.js';

const version = (overrides: Partial<ProcessVersionView> = {}): ProcessVersionView => ({
    id: 'v1',
    edition: 1,
    status: 'approved',
    changeReason: null,
    submittedAt: null,
    contentReviewedAt: null,
    approvedAt: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    rowVersion: 1,
    author: null,
    processOwner: null,
    approvedByQm: null,
    purpose: 'Der Zweck',
    scopeDetail: 'Der Geltungsbereich',
    terms: 'Die Begriffe',
    descriptionDoc: null,
    descriptionText: null,
    responsibilities: 'Die Zuständigkeiten',
    workSequence: 'Der Ablauf',
    method: 'Das Verfahren',
    processParameters: 'Die Parameter',
    documentationRef: 'Die Dokumentation',
    deviationHandling: 'Der Reaktionsplan',
    maintenanceRef: 'Die Wartung',
    ...overrides,
});

const input = (overrides: Partial<SnapshotInput> = {}): SnapshotInput => ({
    title: 'Beschaffung',
    identifier: 'VA PE 1 EK.001',
    edition: 2,
    templateType: 'IMS',
    area: { title: 'Einkauf' },
    version: version(),
    additionalFields: [],
    links: [],
    ...overrides,
});

describe('renderSnapshot — Kopf', () => {
    it('trägt Titel, Kennzeichen, Ausgabe und Bereich', () => {
        const html = renderSnapshot(input());
        expect(html).toContain('Beschaffung');
        expect(html).toContain('VA PE 1 EK.001 · Ausgabe 2 · Einkauf');
    });
});

describe('renderSnapshot — Abschnitte je Vorlage', () => {
    it('IMS: Begriffe und Prozessbeschreibung, kein Prozessablauf', () => {
        const html = renderSnapshot(input({ templateType: 'IMS' }));
        expect(html).toContain('3 · Begriffe');
        expect(html).toContain('5 · Prozessbeschreibung');
        expect(html).not.toContain('Prozessablauf');
        expect(html).not.toContain('Prozessparameter');
    });

    it('PROD: Ablauf, Verfahren, Parameter, Wartung — keine Begriffe', () => {
        const html = renderSnapshot(input({ templateType: 'PROD' }));
        expect(html).toContain('3 · Prozessbeschreibung');
        expect(html).toContain('4 · Prozessablauf');
        expect(html).toContain('5.5 · Wartung (Verweis)');
        expect(html).not.toContain('Begriffe');
    });

    it('hält die Abschnittsreihenfolge ein', () => {
        const html = renderSnapshot(input({ templateType: 'PROD' }));
        const order = ['1 · Zweck', '2 · Geltungsbereich', '3 · Prozessbeschreibung', '4 · Prozessablauf', '5.1 · Verfahren'];
        const positions = order.map((heading) => html.indexOf(heading));
        expect(positions).toEqual([...positions].sort((a, b) => a - b));
        expect(positions.every((position) => position > 0)).toBe(true);
    });
});

describe('renderSnapshot — leere Werte', () => {
    it('setzt einen Gedankenstrich statt einer Lücke', () => {
        const html = renderSnapshot(input({ version: version({ purpose: null, scopeDetail: '   ' }) }));
        expect(html.match(/—/g)?.length).toBeGreaterThanOrEqual(2);
    });

    it('behält Zeilenumbrüche', () => {
        const html = renderSnapshot(input({ version: version({ purpose: 'a\nb' }) }));
        expect(html).toContain('a<br />b');
    });
});

describe('renderSnapshot — muss entschärfen', () => {
    it('HTML im Titel und in den Feldern', () => {
        const html = renderSnapshot(input({ title: '<img src=x onerror=alert(1)>', version: version({ purpose: '<b>x</b>' }) }));
        expect(html).not.toContain('<img src=x');
        expect(html).toContain('&lt;img src=x');
        expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
    });

    it('HTML im Titel eines Zusatzfeldes', () => {
        const html = renderSnapshot(
            input({ additionalFields: [{ id: 'f1', title: '<script>', value: 'ok', sortOrder: 0 }] }),
        );
        expect(html).toContain('&lt;script&gt;');
        expect(html).not.toContain('<script>');
    });
});

describe('renderSnapshot — Anhänge', () => {
    it('lässt Weitere Felder und Mitgeltende Unterlagen weg, wenn es keine gibt', () => {
        const html = renderSnapshot(input());
        expect(html).not.toContain('Weitere Felder');
        expect(html).not.toContain('Mitgeltende Unterlagen');
    });

    it('listet Verknüpfungen mit Kennzeichen', () => {
        const html = renderSnapshot(
            input({
                links: [
                    {
                        id: 'l1',
                        linkType: 'InternerProzess',
                        title: null,
                        url: null,
                        linkedProcess: { id: 'p2', title: 'Wareneingang', identifier: 'VA PE 2 QS.003' },
                    },
                ],
            }),
        );
        expect(html).toContain('Mitgeltende Unterlagen');
        expect(html).toContain('Wareneingang');
        expect(html).toContain('VA PE 2 QS.003');
    });
});
