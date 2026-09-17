export type RichDocument = Record<string, unknown>;

export interface ProcessContent {
    purpose: string | null;
    scopeDetail: string | null;
    terms: string | null;
    descriptionDoc: RichDocument | null;
    readonly descriptionText: string | null;
    responsibilities: string | null;
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
    'terms',
    'descriptionDoc',
    'descriptionText',
    'responsibilities',
    'workSequence',
    'method',
    'processParameters',
    'documentationRef',
    'deviationHandling',
    'maintenanceRef',
] as const satisfies readonly (keyof ProcessContent)[];
