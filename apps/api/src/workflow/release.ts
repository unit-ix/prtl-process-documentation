// T5 — die Freigabe. §5.1: die wichtigste Transaktion der Anwendung. Sie ist der EINZIGE Ort, an
// dem die Inhaltsspalten der Hülle geschrieben werden, und sie prägt Dokumentnummer und
// Identkennzeichen genau einmal (§5.3).
import {
    canApproveFormal,
    keepOrBuildIdentifier,
    keepOrMintDocumentNumber,
    nextEdition,
    type CategoryNumber,
    type SessionUser,
} from '@app/domain';
import { and, desc, eq, isNotNull, max } from 'drizzle-orm';
import { db } from '../db/client.js';
import { areas, processAdditionalFields, processes, processLinks, processVersions } from '../db/schema/index.js';
import { notFound } from '../http/errors.js';
import { assertAllowed, assertTransition, lockTarget, mailOf, type Tx } from './context.js';
import { writeEvent } from './events.js';
import { toAdditionalFieldView, toLinkView, toVersionView } from '../router/processMappers.js';
import { renderSnapshot } from './snapshot.js';
import { TRANSITIONS } from './transitions.js';

const CONTENT_COLUMNS = [
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
] as const;

const contentOf = (version: Record<string, unknown>): Record<string, unknown> =>
    Object.fromEntries(CONTENT_COLUMNS.map((column) => [column, version[column]]));

async function nextDocumentNumber(tx: Tx, areaId: string, existing: number | null): Promise<number> {
    if (existing !== null) return existing;
    const [row] = await tx
        .select({ value: max(processes.documentNumber) })
        .from(processes)
        .where(eq(processes.areaId, areaId));
    return keepOrMintDocumentNumber(null, row?.value ?? null);
}

async function nextEditionFor(tx: Tx, processId: string): Promise<number> {
    const [row] = await tx
        .select({ value: max(processVersions.edition) })
        .from(processVersions)
        .where(eq(processVersions.processId, processId));
    return nextEdition(row?.value ?? null);
}

async function versionChildren(tx: Tx, versionId: string) {
    return Promise.all([
        tx
            .select()
            .from(processAdditionalFields)
            .where(
                and(
                    eq(processAdditionalFields.processVersionId, versionId),
                    eq(processAdditionalFields.isActive, true),
                ),
            ),
        tx
            .select()
            .from(processLinks)
            .where(and(eq(processLinks.processVersionId, versionId), eq(processLinks.isActive, true))),
    ]);
}

interface Minted {
    readonly edition: number;
    readonly documentNumber: number;
    readonly identifier: string;
}

async function mint(tx: Tx, process: { id: string; areaId: string; documentNumber: number | null; identifier: string | null; specificationType: string; scope: string | null }, area: { shortCode: string; categoryNumber: number }): Promise<Minted> {
    const edition = await nextEditionFor(tx, process.id);
    const documentNumber = await nextDocumentNumber(tx, process.areaId, process.documentNumber);
    const identifier = keepOrBuildIdentifier(process.identifier, {
        specificationType: process.specificationType as never,
        scope: process.scope as never,
        categoryNumber: area.categoryNumber as CategoryNumber,
        areaShortCode: area.shortCode,
        documentNumber,
    });
    return { edition, documentNumber, identifier };
}

interface ReleaseWrite {
    readonly processId: string;
    readonly versionId: string;
    readonly qmId: string;
    readonly now: Date;
    readonly snapshotHtml: string;
    readonly version: Record<string, unknown>;
    readonly minted: Minted;
}

// Schritt 5 und 6 aus §5.1 zusammen: die Ausgabe wird zur gültigen, und die Hülle bekommt ihren
// Spiegel. Das ist der einzige Ort im Code, der die Inhaltsspalten der Hülle schreibt.
async function writeRelease(tx: Tx, write: ReleaseWrite): Promise<void> {
    const { minted, now } = write;

    await tx
        .update(processVersions)
        .set({
            status: 'approved',
            edition: minted.edition,
            approvedAt: now,
            approvedByQmId: write.qmId,
            snapshotHtml: write.snapshotHtml,
            updatedAt: now,
        })
        .where(eq(processVersions.id, write.versionId));

    await tx
        .update(processes)
        .set({
            status: 'approved',
            edition: minted.edition,
            documentNumber: minted.documentNumber,
            identifier: minted.identifier,
            approvedAt: now,
            approvedByQmId: write.qmId,
            hasActiveDraft: false,
            ...contentOf(write.version),
        })
        .where(eq(processes.id, write.processId));
}

export async function approveFormal(user: SessionUser, processId: string) {
    const transition = TRANSITIONS['approve-formal'];

    return db.transaction(async (tx) => {
        const { process, version } = await lockTarget(tx, processId);
        assertTransition('approve-formal', version.status as never, null);
        assertAllowed(canApproveFormal(user, { status: version.status as never, author: null }));

        const [area] = await tx.select().from(areas).where(eq(areas.id, process.areaId)).limit(1);
        if (!area) throw notFound('Bereich nicht gefunden.');

        const { edition, documentNumber, identifier } = await mint(tx, process, area);
        const [fields, links] = await versionChildren(tx, version.id);

        const now = new Date();
        const snapshotHtml = renderSnapshot({
            title: process.title,
            identifier,
            edition,
            templateType: process.templateType as never,
            area,
            version: toVersionView({ ...version, edition, approvedAt: now }, new Map()),
            additionalFields: fields.map(toAdditionalFieldView),
            links: links.map((link) => toLinkView(link, new Map())),
        });

        await writeRelease(tx, { processId, versionId: version.id, qmId: user.id, now, snapshotHtml, version, minted: { edition, documentNumber, identifier } });

        await writeEvent(
            tx,
            {
                processId,
                processVersionId: version.id,
                eventKind: transition.eventKind,
                newStatus: 'approved',
                actorId: user.id,
            },
            [await mailOf(tx, version.authorId)],
        );

        return {
            status: 'approved',
            edition,
            identifier,
            toast: `Prozess freigegeben (Ausgabe ${edition}, ${identifier}).`,
        };
    });
}

export async function latestApprovedVersionId(tx: Tx, processId: string): Promise<string | null> {
    const [row] = await tx
        .select({ id: processVersions.id })
        .from(processVersions)
        .where(and(eq(processVersions.processId, processId), isNotNull(processVersions.edition)))
        .orderBy(desc(processVersions.edition))
        .limit(1);
    return row?.id ?? null;
}
