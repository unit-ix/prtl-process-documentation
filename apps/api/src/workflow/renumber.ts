// Nummern vergeben und korrigieren (Testauswertung 09.10.2026). Beim Import aus Word kommen die
// Dokumente nicht in Reihenfolge, und an den alten Nummern hängen Verweise in anderen Unterlagen —
// also darf die Administration eine Nummer setzen, bevor die Freigabe sie zieht, und eine geprägte
// korrigieren. Das ist die eine, protokollierte Ausnahme von §5.1. Eingefrorene Snapshots früherer
// Ausgaben bleiben, wie sie sind: sie sind das Rechtsdokument ihrer Zeit.
import { buildIdentifier, canChangeNumbers, formatNumber, type CategoryNumber, type SessionUser } from '@app/domain';
import { and, eq, isNotNull, ne } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { areas, processes, type AreaRow, type ProcessRow } from '../db/schema/index.js';
import { ApiError, badRequest, notFound } from '../http/errors.js';
import { assertAllowed, lockTarget, type Tx } from './context.js';
import { writeEvent } from './events.js';

export const renumberSchema = z
    .object({
        documentNumber: z.number().int().min(1).max(9999).optional(),
        subNumber: z.number().int().min(1).max(999).optional(),
    })
    .strict()
    .refine((input) => (input.documentNumber === undefined) !== (input.subNumber === undefined), {
        message: 'Genau eine Nummer angeben: documentNumber oder subNumber.',
    });

export type RenumberInput = z.infer<typeof renumberSchema>;

interface Numbering {
    readonly documentNumber: number | null;
    readonly subNumber: number | null;
}

const UNSET = 'nicht vergeben';

const label = (area: AreaRow, documentNumber: number | null, subNumber: number | null): string =>
    documentNumber === null ? UNSET : formatNumber(area.shortCode, documentNumber, subNumber);

const rebuilt = (row: ProcessRow, area: AreaRow, documentNumber: number, subNumber: number | null): string =>
    buildIdentifier({
        specificationType: row.specificationType as never,
        scope: row.scope as never,
        categoryNumber: area.categoryNumber as CategoryNumber,
        areaShortCode: area.shortCode,
        documentNumber,
        subNumber,
    });

// Ein Unterdokument trägt die Nummer seiner VA — einstellbar ist nur, was ihm selbst gehört.
interface Requested {
    readonly field: 'documentNumber' | 'subNumber';
    readonly value: number;
}

function requestedNumbering(process: ProcessRow, input: RenumberInput): Requested {
    if (process.parentProcessId !== null) {
        if (input.subNumber === undefined) {
            throw badRequest('Ein Unterdokument trägt die Nummer seiner Verfahrensanweisung — änderbar ist nur die Unternummer.');
        }
        return { field: 'subNumber', value: input.subNumber };
    }
    if (input.documentNumber === undefined) throw badRequest('Nur ein Unterdokument hat eine Unternummer.');
    return { field: 'documentNumber', value: input.documentNumber };
}

// Der Unique-Index gilt auch für deaktivierte Prozesse, deshalb ohne isActive-Filter.
async function assertFree(tx: Tx, process: ProcessRow, area: AreaRow, { field, value }: Requested) {
    const scope =
        field === 'documentNumber'
            ? and(eq(processes.areaId, process.areaId), eq(processes.documentNumber, value))
            : and(eq(processes.parentProcessId, process.parentProcessId as string), eq(processes.subNumber, value));
    const [taken] = await tx
        .select({ title: processes.title })
        .from(processes)
        .where(and(scope, ne(processes.id, process.id)))
        .limit(1);
    if (!taken) return;

    const where = field === 'documentNumber' ? `im Bereich ${area.shortCode}` : 'unter dieser Verfahrensanweisung';
    throw new ApiError(409, 'conflict', `Die Nummer ${value} ist ${where} schon vergeben („${taken.title}").`);
}

async function parentNumber(tx: Tx, process: ProcessRow): Promise<number | null> {
    if (process.parentProcessId === null) return process.documentNumber;
    const [parent] = await tx
        .select({ documentNumber: processes.documentNumber })
        .from(processes)
        .where(eq(processes.id, process.parentProcessId))
        .limit(1);
    return parent?.documentNumber ?? null;
}

interface Change {
    readonly user: SessionUser;
    readonly process: ProcessRow;
    readonly versionId: string;
    readonly area: AreaRow;
    readonly before: Numbering;
    readonly after: Numbering;
}

// Für ein Unterdokument ist die Grundnummer die seiner VA — sie bleibt hier, wie sie ist.
async function writeChange(tx: Tx, change: Change): Promise<string | null> {
    const { process, area, before, after } = change;
    const oldBase = await parentNumber(tx, process);
    const newBase = process.parentProcessId === null ? after.documentNumber : oldBase;
    const identifier =
        process.identifier === null || newBase === null
            ? process.identifier
            : rebuilt(process, area, newBase, after.subNumber);

    await tx.update(processes).set({ ...after, identifier }).where(eq(processes.id, process.id));
    await writeEvent(tx, {
        processId: process.id,
        processVersionId: change.versionId,
        eventKind: 'number_changed',
        newStatus: process.status as never,
        actorId: change.user.id,
        comment: `${label(area, oldBase, before.subNumber)} → ${label(area, newBase, after.subNumber)}`,
    });
    return identifier;
}

// Eine VA zieht ihre Unterdokumente mit: deren Kennzeichen enthält ihre Nummer.
async function followChildren(tx: Tx, change: Change, documentNumber: number): Promise<void> {
    const children = await tx
        .select()
        .from(processes)
        .where(and(eq(processes.parentProcessId, change.process.id), isNotNull(processes.identifier)));

    for (const child of children) {
        const identifier = rebuilt(child, change.area, documentNumber, child.subNumber);
        await tx.update(processes).set({ identifier }).where(eq(processes.id, child.id));
        await writeEvent(tx, {
            processId: child.id,
            processVersionId: child.currentVersionId,
            eventKind: 'number_changed',
            newStatus: child.status as never,
            actorId: change.user.id,
            comment: `Nummer der Verfahrensanweisung geändert: ${child.identifier ?? UNSET} → ${identifier}`,
        });
    }
}

export async function renumberProcess(user: SessionUser, processId: string, input: RenumberInput) {
    assertAllowed(canChangeNumbers(user));

    return db.transaction(async (tx) => {
        const { process, version } = await lockTarget(tx, processId);
        const [area] = await tx.select().from(areas).where(eq(areas.id, process.areaId)).limit(1);
        if (!area) throw notFound('Bereich nicht gefunden.');

        const requested = requestedNumbering(process, input);
        const { field, value } = requested;
        const before: Numbering = { documentNumber: process.documentNumber, subNumber: process.subNumber };
        if (before[field] === value) return { identifier: process.identifier };

        await assertFree(tx, process, area, requested);
        const after: Numbering = { ...before, [field]: value };
        const change: Change = { user, process, versionId: version.id, area, before, after };
        const identifier = await writeChange(tx, change);
        if (field === 'documentNumber') await followChildren(tx, change, value);

        return { identifier };
    });
}
