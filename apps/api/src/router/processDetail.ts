import {
    canApproveContent,
    canApproveFormal,
    canAssignAuthor,
    canDeleteProcess,
    canEditContent,
    canReopen,
    canSeeApprovalTab,
    canSubmit,
    completeness,
    resolveVersionChoice,
    type ProcessDetailView,
    type ProcessPermissions,
    type SessionUser,
    type UserRef,
} from '@app/domain';
import { and, asc, desc, eq, inArray, isNotNull } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
    areas,
    processAdditionalFields,
    processEvents,
    processes,
    processLinks,
    processVersions,
    users,
    type ProcessRow,
    type ProcessVersionRow,
} from '../db/schema/index.js';
import { forbidden, notFound } from '../http/errors.js';
import { readScope } from './processScope.js';
import {
    toAdditionalFieldView,
    toEventView,
    toLinkView,
    toReleasedVersionRef,
    toVersionView,
    userRef,
    type UserLookup,
} from './processMappers.js';

async function loadUsers(ids: readonly (string | null)[]): Promise<UserLookup> {
    const wanted = [...new Set(ids.filter((id): id is string => id !== null))];
    if (wanted.length === 0) return new Map<string, UserRef>();

    const rows = await db
        .select({ id: users.id, displayName: users.displayName, mail: users.mail })
        .from(users)
        .where(inArray(users.id, wanted));

    return new Map(rows.map((row) => [row.id, row]));
}

async function loadVersions(processId: string): Promise<ProcessVersionRow[]> {
    return db
        .select()
        .from(processVersions)
        .where(and(eq(processVersions.processId, processId), eq(processVersions.isActive, true)))
        .orderBy(desc(processVersions.edition), desc(processVersions.createdAt));
}

function pickVersion(versions: readonly ProcessVersionRow[], process: ProcessRow, showsDraft: boolean) {
    const released = versions.filter((version) => version.edition !== null);
    const current = versions.find((version) => version.id === process.currentVersionId);

    if (showsDraft && current) return current;
    return released[0] ?? current ?? versions[0];
}

function permissionsFor(
    user: SessionUser,
    process: { status: ProcessDetailView['status']; area: { id: string }; author: { id: string } | null },
    version: { status: ProcessDetailView['status']; author: { id: string } | null },
): ProcessPermissions {
    return {
        canEditContent: canEditContent(user, process, version),
        canSubmit: canSubmit(user, version),
        canApproveContent: canApproveContent(user, process, version),
        canRejectContent: canApproveContent(user, process, version),
        canApproveFormal: canApproveFormal(user, version),
        canRejectFormal: canApproveFormal(user, version),
        canReopen: canReopen(user, process, version),
        canAssignAuthor: canAssignAuthor(user, process),
        canDelete: canDeleteProcess(user),
        canSeeApprovalTab: canSeeApprovalTab(user),
    };
}

type ShellFields = Pick<
    ProcessDetailView,
    | 'id'
    | 'title'
    | 'shortDescription'
    | 'identifier'
    | 'documentNumber'
    | 'edition'
    | 'specificationType'
    | 'templateType'
    | 'scope'
    | 'status'
    | 'confidentiality'
    | 'hasActiveDraft'
    | 'approvedAt'
    | 'createdAt'
>;

const shellFields = (process: ProcessRow): ShellFields => ({
    id: process.id,
    title: process.title,
    shortDescription: process.shortDescription,
    identifier: process.identifier,
    documentNumber: process.documentNumber,
    edition: process.edition,
    specificationType: process.specificationType as ShellFields['specificationType'],
    templateType: process.templateType as ShellFields['templateType'],
    scope: process.scope as ShellFields['scope'],
    status: process.status as ShellFields['status'],
    confidentiality: process.confidentiality as ShellFields['confidentiality'],
    hasActiveDraft: process.hasActiveDraft,
    approvedAt: process.approvedAt?.toISOString() ?? null,
    createdAt: process.createdAt.toISOString(),
});

async function loadProcessRef(id: string | null) {
    if (id === null) return null;
    const rows = await db
        .select({ id: processes.id, title: processes.title, identifier: processes.identifier })
        .from(processes)
        .where(eq(processes.id, id))
        .limit(1);
    return rows[0] ?? null;
}

async function loadShell(user: SessionUser, processId: string) {
    const scope = readScope(user);
    const rows = await db
        .select({ process: processes, area: areas })
        .from(processes)
        .innerJoin(areas, eq(areas.id, processes.areaId))
        .where(and(eq(processes.id, processId), eq(processes.isActive, true), ...(scope ? [scope] : [])))
        .limit(1);

    const row = rows[0];
    if (!row) throw notFound('Prozess nicht gefunden.');
    return row;
}

async function loadRelated(processId: string, versionId: string) {
    const [fields, links, events] = await Promise.all([
        db
            .select()
            .from(processAdditionalFields)
            .where(
                and(
                    eq(processAdditionalFields.processVersionId, versionId),
                    eq(processAdditionalFields.isActive, true),
                ),
            )
            .orderBy(asc(processAdditionalFields.sortOrder)),
        db
            .select()
            .from(processLinks)
            .where(and(eq(processLinks.processVersionId, versionId), eq(processLinks.isActive, true))),
        db
            .select()
            .from(processEvents)
            .where(eq(processEvents.processId, processId))
            .orderBy(asc(processEvents.createdAt)),
    ]);

    const linkedIds = links.map((link) => link.linkedProcessId).filter((id): id is string => id !== null);
    const linked =
        linkedIds.length === 0
            ? []
            : await db
                  .select({ id: processes.id, title: processes.title, identifier: processes.identifier })
                  .from(processes)
                  .where(inArray(processes.id, linkedIds));

    return { fields, links, events, linked: new Map(linked.map((row) => [row.id, row])) };
}

export async function getProcessDetail(user: SessionUser, processId: string): Promise<ProcessDetailView> {
    const { process, area } = await loadShell(user, processId);
    const versions = await loadVersions(processId);
    if (versions.length === 0) throw notFound('Zu diesem Prozess existiert keine Ausgabe.');

    const choice = resolveVersionChoice(user, {
        hasActiveDraft: process.hasActiveDraft,
        areaId: process.areaId,
        authorId: process.authorId,
    });
    const version = pickVersion(versions, process, choice.showsDraft);
    const { fields, links, events, linked } = await loadRelated(processId, version.id);
    const parentProcess = await loadProcessRef(process.parentProcessId);

    const userLookup = await loadUsers([
        process.authorId,
        process.approvedByQmId,
        version.authorId,
        version.processOwnerId,
        version.approvedByQmId,
        ...versions.map((row) => row.approvedByQmId),
        ...events.map((row) => row.actorId),
    ]);

    const versionView = toVersionView(version, userLookup);
    const shellRef = {
        status: process.status as ProcessDetailView['status'],
        area: { id: process.areaId },
        author: process.authorId === null ? null : { id: process.authorId },
    };

    return {
        ...shellFields(process),
        area,
        parentProcess,
        author: userRef(userLookup, process.authorId),
        approvedByQm: userRef(userLookup, process.approvedByQmId),
        version: versionView,
        showsDraft: choice.showsDraft,
        hasHiddenDraft: choice.hasHiddenDraft,
        additionalFields: fields.map(toAdditionalFieldView),
        links: links.map((link) => toLinkView(link, linked)),
        events: events.map((event) => toEventView(event, userLookup)),
        releasedVersions: versions.filter((row) => row.edition !== null).map((row) => toReleasedVersionRef(row, userLookup)),
        completeness: completeness(versionView, process.templateType as ProcessDetailView['templateType']),
        permissions: permissionsFor(user, shellRef, { status: versionView.status, author: versionView.author }),
    };
}

export async function getSnapshot(user: SessionUser, processId: string, versionId: string): Promise<string> {
    await loadShell(user, processId);
    const rows = await db
        .select({ snapshotHtml: processVersions.snapshotHtml })
        .from(processVersions)
        .where(
            and(
                eq(processVersions.id, versionId),
                eq(processVersions.processId, processId),
                isNotNull(processVersions.edition),
            ),
        )
        .limit(1);

    const html = rows[0]?.snapshotHtml;
    if (html === undefined) throw notFound('Ausgabe nicht gefunden.');
    if (html === null) throw forbidden('Diese Ausgabe hat keinen eingefrorenen Stand.');
    return html;
}
