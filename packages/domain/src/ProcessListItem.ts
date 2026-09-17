// Lesemodell der Prozessliste (§9.5) — keine Tabelle: eine Zeile pro Prozess-Hülle, angereichert
// um Bereich, Verfasser und den Status der aktuellen Ausgabe.

import type { ProcessStatus, SpecificationType, TemplateType } from './enums.js';

export interface ProcessListItem {
    id: string;
    title: string;
    identifier: string | null;
    specificationType: SpecificationType;
    templateType: TemplateType;
    status: ProcessStatus;
    edition: number | null;
    hasActiveDraft: boolean;
    parentProcessId: string | null;
    area: { id: string; title: string; shortCode: string; categoryNumber: number };
    author: { id: string; displayName: string } | null;
    authorId: string | null;
}

export const PROCESS_SORT_FIELDS = ['identifier', 'title', 'status', 'area'] as const;
export type ProcessSortField = (typeof PROCESS_SORT_FIELDS)[number];
