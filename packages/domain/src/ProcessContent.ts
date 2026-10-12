export type RichDocument = Record<string, unknown>;

export interface ProcessContent {
    purpose: string | null;
    scopeDetail: string | null;
    termsDoc: RichDocument | null;
    /** Klartext-Projektion von termsDoc — Vollständigkeit und Assistent lesen nur diese Spalte. */
    readonly terms: string | null;
    descriptionDoc: RichDocument | null;
    readonly descriptionText: string | null;
    responsibilitiesDoc: RichDocument | null;
    /** Klartext-Projektion von responsibilitiesDoc. */
    readonly responsibilities: string | null;
    workSequence: string | null;
    method: string | null;
    processParameters: string | null;
    documentationRef: string | null;
    deviationHandling: string | null;
    maintenanceRef: string | null;
}

export const CONTENT_FIELDS = [
    'purpose',
    'scopeDetail',
    'termsDoc',
    'terms',
    'descriptionDoc',
    'descriptionText',
    'responsibilitiesDoc',
    'responsibilities',
    'workSequence',
    'method',
    'processParameters',
    'documentationRef',
    'deviationHandling',
    'maintenanceRef',
] as const satisfies readonly (keyof ProcessContent)[];
