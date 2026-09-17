// §5.4 — und §10 C3: "Mitgeltende Unterlagen" zählt NICHT mit, der Kunde hat Dokumente, die sonst
// nie 100 % erreichen. IMS = 5 Prüfpunkte, PROD = 4; beide sind damit erreichbar, was in Canvas
// nicht galt (dort war das IMS-Feld "Begriffe" auch für PROD Pflicht).
import type { TemplateType } from './enums.js';
import type { ProcessContent } from './ProcessContent.js';

export interface CompletenessCheck {
    readonly key: string;
    readonly label: string;
    readonly ok: boolean;
}

export interface Completeness {
    readonly checks: readonly CompletenessCheck[];
    readonly done: number;
    readonly total: number;
    readonly percent: number;
}

const filled = (value: string | null | undefined): boolean => (value ?? '').trim() !== '';

export function completeness(version: Partial<ProcessContent>, template: TemplateType): Completeness {
    const checks: CompletenessCheck[] = [
        { key: 'purpose', label: 'Zweck', ok: filled(version.purpose) },
        { key: 'scopeDetail', label: 'Geltungsbereich', ok: filled(version.scopeDetail) },
        ...(template === 'IMS' ? [{ key: 'terms', label: 'Begriffe', ok: filled(version.terms) }] : []),
        {
            key: 'responsibilities',
            label: 'Zuständigkeiten / Verantwortung',
            ok: filled(version.responsibilities),
        },
        // Bewusst descriptionText und nicht das JSON: ein "leeres" Rich-Text-Dokument ist trotzdem
        // ein nicht-leeres Objekt.
        { key: 'description', label: 'Prozessbeschreibung', ok: filled(version.descriptionText) },
    ];

    const done = checks.filter((check) => check.ok).length;
    return { checks, done, total: checks.length, percent: Math.round((done / checks.length) * 100) };
}

export const isComplete = (version: Partial<ProcessContent>, template: TemplateType): boolean =>
    completeness(version, template).percent === 100;
