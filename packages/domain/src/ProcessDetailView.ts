// Lesemodell der Prozess-Detailseite (§9.6). Vollständigkeit und Rechte rechnet der Server mit
// denselben Funktionen aus, die er auch durchsetzt — sonst zeigt die Oberfläche irgendwann etwas
// anderes an, als der Endpoint erlaubt.

import type { Completeness } from './completeness.js';
import type {
    Confidentiality,
    EventKind,
    LinkType,
    ProcessStatus,
    Scope,
    SpecificationType,
    TemplateType,
} from './enums.js';
import type { ProcessContent } from './ProcessContent.js';
import type { AreaRef, ProcessRef, UserRef } from './refs.js';

export interface ProcessVersionView extends ProcessContent {
    id: string;
    edition: number | null;
    status: ProcessStatus;
    changeReason: string | null;
    submittedAt: string | null;
    contentReviewedAt: string | null;
    approvedAt: string | null;
    createdAt: string;
    rowVersion: number;
    author: UserRef | null;
    processOwner: UserRef | null;
    approvedByQm: UserRef | null;
}

export interface ProcessEventView {
    id: string;
    eventKind: EventKind;
    newStatus: ProcessStatus;
    comment: string | null;
    createdAt: string;
    actor: UserRef | null;
}

export interface ReleasedVersionRef {
    id: string;
    edition: number;
    approvedAt: string | null;
    approvedByQm: UserRef | null;
}

export interface ProcessAdditionalFieldView {
    id: string;
    title: string;
    value: string | null;
    sortOrder: number;
}

export interface ProcessLinkView {
    id: string;
    linkType: LinkType;
    title: string | null;
    url: string | null;
    linkedProcess: ProcessRef | null;
}

export interface ProcessPermissions {
    canEditContent: boolean;
    canSubmit: boolean;
    canApproveContent: boolean;
    canRejectContent: boolean;
    canApproveFormal: boolean;
    canRejectFormal: boolean;
    canReopen: boolean;
    canAssignAuthor: boolean;
    canDelete: boolean;
    canSeeApprovalTab: boolean;
}

export interface ProcessDetailView {
    id: string;
    title: string;
    shortDescription: string | null;
    identifier: string | null;
    documentNumber: number | null;
    edition: number | null;
    specificationType: SpecificationType;
    templateType: TemplateType;
    scope: Scope | null;
    status: ProcessStatus;
    confidentiality: Confidentiality | null;
    hasActiveDraft: boolean;
    approvedAt: string | null;
    createdAt: string;
    area: AreaRef;
    parentProcess: ProcessRef | null;
    author: UserRef | null;
    approvedByQm: UserRef | null;
    version: ProcessVersionView;
    /** false = der Leser sieht die letzte freigegebene Ausgabe, obwohl ein Entwurf läuft (§9.5). */
    showsDraft: boolean;
    hasHiddenDraft: boolean;
    additionalFields: ProcessAdditionalFieldView[];
    links: ProcessLinkView[];
    events: ProcessEventView[];
    releasedVersions: ReleasedVersionRef[];
    completeness: Completeness;
    permissions: ProcessPermissions;
}
