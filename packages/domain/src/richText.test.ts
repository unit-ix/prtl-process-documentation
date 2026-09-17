import { describe, expect, it } from 'vitest';
import { escapeHtml, richTextToHtml, richTextToPlainText } from './richText.js';

const doc = (...content: unknown[]) => ({ type: 'doc', content }) as never;
const paragraph = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });

describe('escapeHtml', () => {
    it('entschärft die fünf Zeichen', () => {
        expect(escapeHtml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
    });

    it('doppelt kein bereits ersetztes Ampersand', () => {
        expect(escapeHtml('a & b')).toBe('a &amp; b');
    });
});

describe('richTextToHtml — Inhalt', () => {
    it('rendert Absätze und Überschriften', () => {
        expect(richTextToHtml(doc(paragraph('Hallo')))).toBe('<p>Hallo</p>');
        expect(richTextToHtml(doc({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'T' }] }))).toBe(
            '<h2>T</h2>',
        );
    });

    it('begrenzt die Überschriftenebene', () => {
        expect(richTextToHtml(doc({ type: 'heading', attrs: { level: 99 }, content: [] }))).toBe('<h6></h6>');
    });

    it('rendert Listen und Tabellen', () => {
        const list = { type: 'bulletList', content: [{ type: 'listItem', content: [paragraph('a')] }] };
        expect(richTextToHtml(doc(list))).toBe('<ul><li><p>a</p></li></ul>');

        const table = {
            type: 'table',
            content: [
                {
                    type: 'tableRow',
                    content: [
                        { type: 'tableHeader', content: [paragraph('H')] },
                        { type: 'tableCell', content: [paragraph('C')] },
                    ],
                },
            ],
        };
        expect(richTextToHtml(doc(table))).toBe('<table><tr><th><p>H</p></th><td><p>C</p></td></tr></table>');
    });

    it('rendert Marken verschachtelt', () => {
        const node = { type: 'text', text: 'x', marks: [{ type: 'bold' }, { type: 'italic' }] };
        expect(richTextToHtml(doc({ type: 'paragraph', content: [node] }))).toBe('<p><em><strong>x</strong></em></p>');
    });

    it('gibt bei leerem Dokument einen leeren String zurück', () => {
        expect(richTextToHtml(null)).toBe('');
        expect(richTextToHtml(undefined)).toBe('');
        expect(richTextToHtml(doc())).toBe('');
    });
});

describe('richTextToHtml — muss entschärfen', () => {
    it('Text mit HTML', () => {
        expect(richTextToHtml(doc(paragraph('<script>alert(1)</script>')))).toBe(
            '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>',
        );
    });

    it('javascript: in einem Link', () => {
        const link = {
            type: 'paragraph',
            content: [{ type: 'text', text: 'klick', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }],
        };
        expect(richTextToHtml(doc(link))).toBe('<p>klick</p>');
    });

    it('data: in einem Bild', () => {
        expect(richTextToHtml(doc({ type: 'image', attrs: { src: 'data:text/html;base64,x' } }))).toBe('');
    });

    it('Anführungszeichen im Bild-Alt', () => {
        const html = richTextToHtml(doc({ type: 'image', attrs: { src: 'https://x/a.png', alt: '" onerror="x' } }));
        expect(html).toContain('alt="&quot; onerror=&quot;x"');
    });
});

describe('richTextToHtml — muss durchlassen', () => {
    it('den internen Bildverweis file:<uuid> — die Adresse entsteht erst beim Anzeigen', () => {
        const src = 'file:3f2504e0-4f89-41d3-9a0c-0305e82c3301';
        expect(richTextToHtml(doc({ type: 'image', attrs: { src } }))).toContain(`src="${src}"`);
    });

    it('aber kein file: mit fremdem Inhalt', () => {
        expect(richTextToHtml(doc({ type: 'image', attrs: { src: 'file:///etc/passwd' } }))).toBe('');
        expect(richTextToHtml(doc({ type: 'image', attrs: { src: 'file:../../secret' } }))).toBe('');
    });

    it('https- und relative Links', () => {
        for (const href of ['https://prettl.com', '/intern/a', '#abschnitt']) {
            const node = {
                type: 'paragraph',
                content: [{ type: 'text', text: 'l', marks: [{ type: 'link', attrs: { href } }] }],
            };
            expect(richTextToHtml(doc(node))).toContain(`href="${href}"`);
        }
    });
});

describe('richTextToPlainText', () => {
    it('trennt Blöcke mit Zeilenumbruch', () => {
        expect(richTextToPlainText(doc(paragraph('a'), paragraph('b')))).toBe('a\nb');
    });

    it('liefert für ein leeres Dokument einen leeren String — das ist die Grundlage der Vollständigkeit', () => {
        expect(richTextToPlainText(doc({ type: 'paragraph' }))).toBe('');
        expect(richTextToPlainText(doc())).toBe('');
        expect(richTextToPlainText(null)).toBe('');
    });

    it('nimmt Text aus Listen und Tabellen mit', () => {
        const table = {
            type: 'table',
            content: [{ type: 'tableRow', content: [{ type: 'tableCell', content: [paragraph('Zelle')] }] }],
        };
        expect(richTextToPlainText(doc(table))).toContain('Zelle');
    });

    it('entfernt HTML nicht, sondern gibt den Rohtext zurück', () => {
        expect(richTextToPlainText(doc(paragraph('<b>x</b>')))).toBe('<b>x</b>');
    });
});
