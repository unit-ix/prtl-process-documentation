// → tblProcess / processes

import type { Confidentiality, ProcessStatus, Scope, SpecificationType, TemplateType } from './enums.js';
import type { ProcessContent } from './ProcessContent.js';

export interface Process extends ProcessContent {
    id: string;
    title: string;
    shortDescription: string | null;
    readonly identifier: string | null;
    readonly documentNumber: number | null;
    readonly edition: number | null;
    specificationType: SpecificationType;
    templateType: TemplateType;
    scope: Scope | null;
    status: ProcessStatus;
    confidentiality: Confidentiality | null;
    hasActiveDraft: boolean;
    area: { id: string };
    author: { id: string } | null;
    approvedByQm: { id: string } | null;
    currentVersion: { id: string } | null;
    parentProcess: { id: string } | null;
    approvedAt: string | null;
    createdAt: string;
    isActive: boolean;
    readonly legacyId: number | null;
}
