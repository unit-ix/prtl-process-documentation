// §7.6 — die sechs Vorlagen des Freigabe-Workflows plus die Unterweisungs-Mail. Reine Funktionen:
// der Versandweg (Graph oder Power Automate) bekommt fertigen Text und hat nichts zu entscheiden.
import type { EventKind } from './enums.js';
import { escapeHtml } from './richText.js';

export interface MailMessage {
    readonly to: string;
    readonly subject: string;
    readonly html: string;
}

const BODY = 'font-family:Segoe UI,system-ui,sans-serif;font-size:15px;color:#1C1917;max-width:560px';
const CARD = 'background:#FAFAF9;border:1px solid #E7E5E0;border-radius:12px;padding:16px 20px';
const SUCCESS = 'background:#DCFCE7;color:#166534;border:1px solid #BBF7D0;border-radius:12px;padding:16px 20px';
const QUOTE = 'border-left:3px solid #B91C1C;padding:4px 12px;margin:12px 0;color:#7F1D1D';

export const EVENT_SUBJECTS: Readonly<Partial<Record<EventKind, string>>> = {
    assigned: 'Prozess zur Bearbeitung',
    submitted: 'Inhaltliche Prüfung erforderlich',
    content_approved: 'Formelle Prüfung (QM)',
    content_rejected: 'Rückfrage zu deinem Prozess',
    formally_approved: 'Prozess freigegeben',
    formally_rejected: 'Prozess abgelehnt',
};

const EVENT_LEAD: Readonly<Partial<Record<EventKind, string>>> = {
    assigned: 'Du wurdest als Verfasser für diesen Prozess eingetragen.',
    submitted: 'Ein Prozess aus deinem Bereich wartet auf die inhaltliche Prüfung.',
    content_approved: 'Ein Prozess ist inhaltlich freigegeben und wartet auf die formelle Prüfung.',
    content_rejected: 'Dein Prozess kam aus der inhaltlichen Prüfung zurück.',
    formally_approved: 'Dein Prozess wurde formell freigegeben.',
    formally_rejected: 'Dein Prozess wurde in der formellen Prüfung abgelehnt.',
};

export interface ProcessMailInput {
    readonly eventKind: EventKind;
    readonly processId: string;
    readonly title: string;
    readonly identifier: string | null;
    readonly documentNumber: number | null;
    readonly edition: number | null;
    readonly comment: string | null;
    readonly actorName: string | null;
    readonly appUrl: string;
}

// Der Parametername `pid` bleibt, damit Links aus alten Mails weiter auflösen (§7.6).
export const processDeepLink = (appUrl: string, processId: string): string =>
    `${appUrl.replace(/\/$/, '')}/?pid=${encodeURIComponent(processId)}`;

const line = (label: string, value: string | null): string =>
    value === null ? '' : `<p style="margin:4px 0"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`;

const releaseDetails = (input: ProcessMailInput): string =>
    [
        line('Identkennzeichen', input.identifier),
        line('Dokumentnummer', input.documentNumber === null ? null : String(input.documentNumber)),
        line('Ausgabe', input.edition === null ? null : String(input.edition)),
    ].join('');

function reasonBlock(input: ProcessMailInput): string {
    if (input.comment === null) return '';
    const author =
        input.actorName === null
            ? ''
            : `<p style="margin:8px 0 0;font-size:13px">— ${escapeHtml(input.actorName)}</p>`;
    return `<div style="${QUOTE}"><p style="margin:0">${escapeHtml(input.comment).replaceAll('\n', '<br />')}</p>${author}</div>`;
}

export function renderProcessMail(input: ProcessMailInput): { subject: string; html: string } | null {
    const subjectPrefix = EVENT_SUBJECTS[input.eventKind];
    if (subjectPrefix === undefined) return null;

    const isSuccess = input.eventKind === 'formally_approved';
    const html = [
        `<div style="${BODY}">`,
        `<p>${escapeHtml(EVENT_LEAD[input.eventKind] ?? '')}</p>`,
        `<div style="${isSuccess ? SUCCESS : CARD}">`,
        `<p style="margin:0 0 8px;font-size:17px;font-weight:600">${escapeHtml(input.title)}</p>`,
        isSuccess ? releaseDetails(input) : line('Identkennzeichen', input.identifier),
        '</div>',
        reasonBlock(input),
        `<p style="margin-top:20px"><a href="${escapeHtml(processDeepLink(input.appUrl, input.processId))}">Prozess in der Prozessdokumentation öffnen</a></p>`,
        '</div>',
    ].join('');

    return { subject: `${subjectPrefix}: ${input.title}`, html };
}

export interface InstructionMailInput {
    readonly processTitle: string;
    readonly identifier: string | null;
    readonly dueDate: string | null;
    readonly note: string | null;
    readonly confirmUrl: string;
}

export const confirmLink = (appUrl: string, token: string): string =>
    `${appUrl.replace(/\/$/, '')}/api/confirm/${encodeURIComponent(token)}`;

export function renderInstructionMail(input: InstructionMailInput): { subject: string; html: string } {
    const button = `<a href="${escapeHtml(input.confirmUrl)}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#166534;color:#FFFFFF;text-decoration:none;font-weight:600">Bestätigen</a>`;

    const html = [
        `<div style="${BODY}">`,
        '<p>Für dich liegt eine Unterweisung vor. Bitte bestätige die Kenntnisnahme.</p>',
        `<div style="${CARD}">`,
        `<p style="margin:0 0 8px;font-size:17px;font-weight:600">${escapeHtml(input.processTitle)}</p>`,
        line('Identkennzeichen', input.identifier),
        line('Frist', input.dueDate),
        input.note === null ? '' : `<p style="margin:8px 0 0">${escapeHtml(input.note)}</p>`,
        '</div>',
        `<p style="margin:20px 0 8px">${button}</p>`,
        `<p style="margin:0"><a href="${escapeHtml(input.confirmUrl)}">Ich kann das nicht bestätigen</a></p>`,
        '<p style="margin-top:20px;font-size:13px;color:#78716C">Der Link ist 30 Tage gültig und kann einmal verwendet werden.</p>',
        '</div>',
    ].join('');

    return { subject: `Unterweisung: ${input.processTitle}`, html };
}
