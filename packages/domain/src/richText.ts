// Prozessbeschreibung: TipTap-/ProseMirror-JSON → HTML und → Klartext. Bewusst von Hand und ohne
// Abhängigkeit: dieselbe Funktion rendert die Lese-Ansicht, den eingefrorenen Snapshot (§5.6) und
// den Druck (§8.4). Ein Snapshot ist ein Rechtsdokument und muss in fünf Jahren gleich aussehen —
// eine Bibliothek, die ihre Ausgabe zwischen zwei Majors ändert, kann das nicht zusagen.
import type { RichDocument } from './ProcessContent.js';

interface Node {
    type?: string;
    text?: string;
    attrs?: Record<string, unknown>;
    content?: Node[];
    marks?: { type: string; attrs?: Record<string, unknown> }[];
}

export function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

// Nur http(s) und relative Pfade. javascript: und data: in einem href sind ein Skript-Kanal, und
// der Snapshot wird später ungeprüft in ein Dialogfenster gehängt.
function safeUrl(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (/^(https?:\/\/|\/|\.\/|#)/i.test(trimmed)) return trimmed;
    // `file:<uuid>` ist ein interner Verweis auf eine Blob-Zeile, keine Adresse — die kurzlebige
    // SAS entsteht erst beim Anzeigen (§8.2).
    if (/^file:[0-9a-f-]{36}$/i.test(trimmed)) return trimmed;
    return null;
}

const MARK_TAGS: Readonly<Record<string, string>> = {
    bold: 'strong',
    italic: 'em',
    underline: 'u',
    strike: 's',
    code: 'code',
};

function applyMarks(text: string, marks: Node['marks']): string {
    return (marks ?? []).reduce((inner, mark) => {
        if (mark.type === 'link') {
            const href = safeUrl(mark.attrs?.href);
            return href === null ? inner : `<a href="${escapeHtml(href)}" rel="noopener noreferrer">${inner}</a>`;
        }
        const tag = MARK_TAGS[mark.type];
        return tag === undefined ? inner : `<${tag}>${inner}</${tag}>`;
    }, text);
}

const IMAGE_WIDTHS: Readonly<Record<string, string>> = {
    sm: 'max-width:320px',
    md: 'max-width:640px',
    full: 'width:100%',
};

const PANEL_COLORS: Readonly<Record<string, string>> = {
    info: '#E7E5E0',
    success: '#166534',
    warning: '#92400E',
    danger: '#B91C1C',
};

function children(node: Node): string {
    return (node.content ?? []).map(toHtml).join('');
}

const wrap = (tag: string) => (node: Node) => `<${tag}>${children(node)}</${tag}>`;

function heading(node: Node): string {
    const level = Math.min(Math.max(Number(node.attrs?.level ?? 1), 1), 6);
    return `<h${level}>${children(node)}</h${level}>`;
}

function panel(node: Node): string {
    const color = PANEL_COLORS[String(node.attrs?.variant ?? 'info')] ?? PANEL_COLORS.info;
    return `<div style="border-left:3px solid ${color};padding:8px 12px;margin:12px 0">${children(node)}</div>`;
}

function image(node: Node): string {
    const src = safeUrl(node.attrs?.src);
    if (src === null) return '';
    const style = IMAGE_WIDTHS[String(node.attrs?.size ?? 'md')] ?? IMAGE_WIDTHS.md;
    const alt = escapeHtml(String(node.attrs?.alt ?? ''));
    return `<img src="${escapeHtml(src)}" alt="${alt}" style="${style};height:auto" />`;
}

const RENDERERS: Readonly<Record<string, (node: Node) => string>> = {
    text: (node) => applyMarks(escapeHtml(node.text ?? ''), node.marks),
    hardBreak: () => '<br />',
    horizontalRule: () => '<hr />',
    paragraph: wrap('p'),
    heading,
    bulletList: wrap('ul'),
    orderedList: wrap('ol'),
    listItem: wrap('li'),
    blockquote: wrap('blockquote'),
    codeBlock: (node) => `<pre><code>${children(node)}</code></pre>`,
    table: wrap('table'),
    tableRow: wrap('tr'),
    tableHeader: wrap('th'),
    tableCell: wrap('td'),
    panel,
    image,
};

function toHtml(node: Node): string {
    const renderer = RENDERERS[node.type ?? ''];
    return renderer === undefined ? children(node) : renderer(node);
}

export function richTextToHtml(doc: RichDocument | null | undefined): string {
    if (!doc) return '';
    return toHtml(doc as Node);
}

const BLOCK_SEPARATORS = new Set(['paragraph', 'heading', 'listItem', 'tableCell', 'tableHeader', 'blockquote']);

function toText(node: Node): string {
    if (node.type === 'text') return node.text ?? '';
    if (node.type === 'hardBreak') return '\n';
    const inner = (node.content ?? []).map(toText).join('');
    return BLOCK_SEPARATORS.has(node.type ?? '') ? `${inner}\n` : inner;
}

/** Klartext-Projektion (§8.1) — Grundlage für Vollständigkeit, Suche und den Assistenten-Index. */
export function richTextToPlainText(doc: RichDocument | null | undefined): string {
    if (!doc) return '';
    return toText(doc as Node)
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
