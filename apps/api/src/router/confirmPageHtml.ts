import { escapeHtml } from '@app/domain';
import type { ConfirmPageData } from './publicConfirm.js';

const PAGE = (body: string): string =>
    `<!doctype html><html lang="de"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>Unterweisung bestätigen</title></head><body style="font-family:Segoe UI,system-ui,sans-serif;color:#1C1917;background:#FAFAF9;margin:0;padding:40px 16px"><div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #E7E5E0;border-radius:12px;padding:24px 28px">${body}</div></body></html>`;

const NEUTRAL =
    '<h1 style="font-size:18px;margin:0 0 8px">Dieser Link ist nicht mehr gültig</h1><p style="font-size:15px;line-height:1.5;margin:0">Bitte wenden Sie sich an Ihre Führungskraft oder das Qualitätsmanagement.</p>';

export function renderConfirmPage(token: string, data: ConfirmPageData): string {
    if (!data.valid) return PAGE(NEUTRAL);

    if (data.alreadyAnswered === true) {
        return PAGE(
            '<h1 style="font-size:18px;margin:0 0 8px">Bereits beantwortet</h1><p style="font-size:15px;margin:0">Für diese Unterweisung liegt bereits eine Antwort vor.</p>',
        );
    }

    const action = `/api/confirm/${encodeURIComponent(token)}`;
    return PAGE(
        `<h1 style="font-size:18px;margin:0 0 8px">Unterweisung bestätigen</h1>` +
            `<p style="font-size:15px;line-height:1.5">Hallo ${escapeHtml(data.displayName ?? '')}, bitte bestätigen Sie die Kenntnisnahme des Prozesses <strong>${escapeHtml(data.processTitle ?? '')}</strong>.</p>` +
            `<form method="post" action="${action}" style="display:flex;gap:12px;margin-top:20px">` +
            `<button name="answer" value="yes" style="flex:1;padding:10px 16px;border:0;border-radius:8px;background:#166534;color:#fff;font-size:15px;cursor:pointer">Bestätigen</button>` +
            `<button name="answer" value="no" style="flex:1;padding:10px 16px;border:1px solid #E7E5E0;border-radius:8px;background:#fff;font-size:15px;cursor:pointer">Kann ich nicht bestätigen</button>` +
            `</form>`,
    );
}

export const renderConfirmResult = (answer: 'yes' | 'no' | null): string =>
    answer === null
        ? PAGE(NEUTRAL)
        : PAGE(
              answer === 'yes'
                  ? '<h1 style="font-size:18px;margin:0 0 8px;color:#166534">Danke — bestätigt</h1><p style="font-size:15px;margin:0">Ihre Kenntnisnahme wurde gespeichert.</p>'
                  : '<h1 style="font-size:18px;margin:0 0 8px">Rückmeldung gespeichert</h1><p style="font-size:15px;margin:0">Ihre Führungskraft wird sich bei Ihnen melden.</p>',
          );
