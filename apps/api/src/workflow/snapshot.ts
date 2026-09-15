// §5.6 — der eingefrorene Stand einer Ausgabe. Selbsttragendes HTML mit Inline-Styles, keine
// Klassen, keine externe Datei: es muss in fünf Jahren identisch aussehen, auch wenn das Design
// der App bis dahin dreimal gewechselt hat. Alles Nutzereingegebene wird escaped.
import {
    escapeHtml,
    richTextToHtml,
    type AreaRef,
    type ProcessAdditionalFieldView,
    type ProcessLinkView,
    type ProcessVersionView,
    type TemplateType,
} from '@app/domain';

export interface SnapshotInput {
    readonly title: string;
    readonly identifier: string;
    readonly edition: number;
    readonly templateType: TemplateType;
    readonly area: Pick<AreaRef, 'title'>;
    readonly version: ProcessVersionView;
    readonly additionalFields: readonly ProcessAdditionalFieldView[];
    readonly links: readonly ProcessLinkView[];
}

const EMPTY = '—';

const FONT = 'font-family:Segoe UI,system-ui,sans-serif;color:#1C1917';

function textSection(heading: string, value: string | null): string {
    const body = (value ?? '').trim() === '' ? EMPTY : escapeHtml(value as string).replaceAll('\n', '<br />');
    return `<h2 style="font-size:15px;margin:24px 0 6px">${escapeHtml(heading)}</h2><div style="font-size:14px;line-height:1.55">${body}</div>`;
}

function richSection(heading: string, html: string): string {
    const body = html.trim() === '' ? EMPTY : html;
    return `<h2 style="font-size:15px;margin:24px 0 6px">${escapeHtml(heading)}</h2><div style="font-size:14px;line-height:1.55">${body}</div>`;
}

function imsSections(version: ProcessVersionView, description: string): string {
    return [
        textSection('3 · Begriffe', version.terms),
        textSection('4 · Zuständigkeiten / Verantwortung', version.responsibilities),
        richSection('5 · Prozessbeschreibung', description),
    ].join('');
}

function prodSections(version: ProcessVersionView, description: string): string {
    return [
        richSection('3 · Prozessbeschreibung', description),
        textSection('4 · Prozessablauf', version.workSequence),
        textSection('4.1 · Zuständigkeiten / Verantwortung', version.responsibilities),
        textSection('5.1 · Verfahren', version.method),
        textSection('5.2 · Prozessparameter', version.processParameters),
        textSection('5.3 · Dokumentationen', version.documentationRef),
        textSection('5.4 · Reaktionsplan bei Abweichungen', version.deviationHandling),
        textSection('5.5 · Wartung (Verweis)', version.maintenanceRef),
    ].join('');
}

function additionalFieldsSection(fields: readonly ProcessAdditionalFieldView[]): string {
    if (fields.length === 0) return '';
    const rows = fields
        .map((field) => textSection(field.title, field.value))
        .join('');
    return `<h2 style="font-size:15px;margin:28px 0 6px">Weitere Felder</h2>${rows}`;
}

function linksSection(links: readonly ProcessLinkView[]): string {
    if (links.length === 0) return '';
    const items = links
        .map((link) => {
            const label = escapeHtml(link.title ?? link.linkedProcess?.title ?? link.url ?? EMPTY);
            const identifier = link.linkedProcess?.identifier;
            return `<li>${label}${identifier ? ` <span style="color:#78716C">· ${escapeHtml(identifier)}</span>` : ''}</li>`;
        })
        .join('');
    return `<h2 style="font-size:15px;margin:28px 0 6px">Mitgeltende Unterlagen</h2><ul style="font-size:14px;line-height:1.55;padding-left:18px">${items}</ul>`;
}

export function renderSnapshot(input: SnapshotInput): string {
    const { version } = input;
    const description = richTextToHtml(version.descriptionDoc);
    const sections =
        input.templateType === 'IMS' ? imsSections(version, description) : prodSections(version, description);

    return [
        `<article style="${FONT};max-width:800px">`,
        `<h1 style="font-size:20px;margin:0 0 4px">${escapeHtml(input.title)}</h1>`,
        `<p style="font-size:13px;color:#78716C;margin:0 0 20px">${escapeHtml(input.identifier)} · Ausgabe ${input.edition} · ${escapeHtml(input.area.title)}</p>`,
        textSection('1 · Zweck', version.purpose),
        textSection('2 · Geltungsbereich', version.scopeDetail),
        sections,
        additionalFieldsSection(input.additionalFields),
        linksSection(input.links),
        '</article>',
    ].join('');
}
