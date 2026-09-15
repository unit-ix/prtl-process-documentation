import type {
    ProcessAdditionalFieldView,
    ProcessEventView,
    ProcessLinkView,
    ProcessVersionView,
    ReleasedVersionRef,
    UserRef,
} from '@app/domain';
import type {
    ProcessAdditionalFieldRow,
    ProcessEventRow,
    ProcessLinkRow,
    ProcessVersionRow,
} from '../db/schema/index.js';

export type UserLookup = ReadonlyMap<string, UserRef>;

export const userRef = (users: UserLookup, id: string | null): UserRef | null =>
    id === null ? null : (users.get(id) ?? null);

const iso = (value: Date | null): string | null => value?.toISOString() ?? null;

export const toVersionView = (row: ProcessVersionRow, users: UserLookup): ProcessVersionView => ({
    id: row.id,
    edition: row.edition,
    status: row.status as ProcessVersionView['status'],
    changeReason: row.changeReason,
    submittedAt: iso(row.submittedAt),
    contentReviewedAt: iso(row.contentReviewedAt),
    approvedAt: iso(row.approvedAt),
    createdAt: row.createdAt.toISOString(),
    rowVersion: row.rowVersion,
    author: userRef(users, row.authorId),
    processOwner: userRef(users, row.processOwnerId),
    approvedByQm: userRef(users, row.approvedByQmId),
    purpose: row.purpose,
    scopeDetail: row.scopeDetail,
    terms: row.terms,
    descriptionDoc: row.descriptionDoc as ProcessVersionView['descriptionDoc'],
    descriptionText: row.descriptionText,
    responsibilities: row.responsibilities,
    workSequence: row.workSequence,
    method: row.method,
    processParameters: row.processParameters,
    documentationRef: row.documentationRef,
    deviationHandling: row.deviationHandling,
    maintenanceRef: row.maintenanceRef,
});

export const toEventView = (row: ProcessEventRow, users: UserLookup): ProcessEventView => ({
    id: row.id,
    eventKind: row.eventKind as ProcessEventView['eventKind'],
    newStatus: row.newStatus as ProcessEventView['newStatus'],
    comment: row.comment,
    createdAt: row.createdAt.toISOString(),
    actor: userRef(users, row.actorId),
});

export const toReleasedVersionRef = (row: ProcessVersionRow, users: UserLookup): ReleasedVersionRef => ({
    id: row.id,
    edition: row.edition as number,
    approvedAt: iso(row.approvedAt),
    approvedByQm: userRef(users, row.approvedByQmId),
});

export const toAdditionalFieldView = (row: ProcessAdditionalFieldRow): ProcessAdditionalFieldView => ({
    id: row.id,
    title: row.title,
    value: row.value,
    sortOrder: row.sortOrder,
});

export const toLinkView = (
    row: ProcessLinkRow,
    processes: ReadonlyMap<string, { id: string; title: string; identifier: string | null }>,
): ProcessLinkView => ({
    id: row.id,
    linkType: row.linkType as ProcessLinkView['linkType'],
    title: row.title,
    url: row.url,
    linkedProcess: row.linkedProcessId === null ? null : (processes.get(row.linkedProcessId) ?? null),
});
